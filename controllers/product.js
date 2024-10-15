import fs from 'fs';
import { validationResult } from 'express-validator';
import { extractIDfromSlug } from '../utils/extractIDfromSlug.js';
import { getPresignUrl } from "../utils/aws-s3.js";
import { uploadToS3 } from '../utils/upload-s3.js';
import createImageUrl from '../utils/createImageUrl.js';
import getImagePath from '../utils/getImagePath.js';
// Connect to the database
import pool from '../db/db.js';


// Add new product
export const Add = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  //console.log(req.files);

  if (req.files === undefined) {
    return res.status(422).json({ error: 'MainImage is required' });
  } else {
    if (req.files.profileImages === undefined) {
      return res.status(422).json({ error: 'MainImage is required' });
    }
  }

  const { userId } = req.decoded;
  console.log(userId);
  const {country, region, city, name, price, age, gender, nationality, description, phone, whatsapp, exturl} = req.body;
  const { profileImages }  = req.files;

  // Uploading images S3 and saving to DB
  let index = 0;
  let coverImage = '';
  let additionalImages = [];

  for (let profImage of profileImages) {
    const { destination, filename } = profImage;
    //console.log( 'image #', destination, filename, profImage.size, profImage.mimetype );

    // Uploading to S3
    const presignedUrl = await getPresignUrl(`${filename}`, `${profImage.mimetyp}`, "putObject");

    // Call the function to upload the file and delete it from local temp path
    uploadToS3(presignedUrl.message, `${destination}/${filename}`, profImage.mimetype);    

    // Saving to db
    try {
      const newImage = await pool.query(
        `INSERT INTO images (
          id,
          filename, 
          extension, 
          size, 
          created_at) 
        VALUES(
          gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`, 
        [filename, profImage.mimetype, profImage.size]
      );

      if (index === 0) {
        coverImage = newImage.rows[0].id;
      } else {
        additionalImages.push(newImage.rows[0].id);
      }

    } catch (error) {
      res.status(422).json({ error: error });
      console.error(error.message);
    }

    index++;
  }
  
  //console.log("coverImage:", coverImage);
  //console.log("additionalImages:", additionalImages);

  // adding into DB
  try {
    const newProduct = await pool.query(
      `INSERT INTO ads (
        country_id, 
        state_id, 
        city, 
        name, 
        price, 
        age, 
        gender, 
        nationality, 
        description, 
        user_id, 
        image_id,
        phone, whatsapp, exturl, 
        created_at) 
      VALUES(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP) RETURNING *`, 
      [country, region, city, name, price, age, gender, nationality, description, userId, coverImage, phone, whatsapp, exturl]
    );
    //console.log("ad added:", newProduct.rows[0].ad_id)   

    // Adding additional images into db
    for ( let adimage of additionalImages) {
      try {
        const addImages = await pool.query(`
          INSERT INTO ads_images (ad_id, images, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *`,
          [newProduct.rows[0].ad_id, adimage]
        );
      } catch (error) {
        console.error(error.message);
      }
    }

    // Adding into ads_tag with gender ads Male = 2, Female = 3, Transsexual = 4
    let tag_ids = [];
    if( newProduct.rows[0].gender === "Male" ) {
      tag_ids = [2, 5, 6];
    } else if( newProduct.rows[0].gender === "Transsexual" ) {
      tag_ids = [4];
    } else {
      tag_ids = [3];
    }
    for (const tag_id of tag_ids) {
      const newAdTag = await pool.query(
        `INSERT INTO ads_tags (
          ad_id, 
          tag_id, 
          created_at
        ) 
        VALUES ($1, $2, CURRENT_TIMESTAMP) 
        RETURNING *`,
        [newProduct.rows[0].ad_id, tag_id]
      );
      console.log("Inserted genger tag:", newAdTag.rows[0]);
    }

    // Adding into ads_tag with tag mentioned in description
    let alltags;
    const tags = await pool.query( `SELECT * FROM tags WHERE id > 6`);
    if( tags.rows ) {
      alltags = tags.rows;
      alltags.forEach(product => {
        if( newProduct.rows[0].description.toLowerCase().includes(product.slug) ) {
          console.log(`The description contains the slug: ${product.slug}`);
          const newAdTag = pool.query(
            `INSERT INTO ads_tags (
              ad_id, 
              tag_id, 
              created_at
            ) 
            VALUES ($1, $2, CURRENT_TIMESTAMP) 
            RETURNING *`,
            [ newProduct.rows[0].ad_id, product.id]
          );
          console.log("Inserted tag:", product.text);
        }
      }); 
    }

    res.json({
        message: 'Product added successfully.',
        product: newProduct
    });

  } catch (error) {
    res.status(422).json({ error: error });
    console.error(error.message);
  }
};

// Getting all active ads
export const GetAll = async (req, res) => {
  const { status } = req.params;
    try {
      const allAds = await pool.query(
        `SELECT a.*, c.name AS cityname, i.filename as coverimage
         FROM ads a
         JOIN cities c ON a.city = c.id
         JOIN images i ON a.image_id = i.id 
         WHERE a.status = $1 
         ORDER BY a.created_at DESC`,
         [status]
      );

      // Getting cover image link
      let index = 0;
      for (let oneAd of allAds.rows) {
        const coverImageUrl = await getPresignUrl(`${oneAd.coverimage}`, ``, "getObject");
        allAds.rows[index].coverImageLink = coverImageUrl.message;
        index++;
      }

      res.status(200).json({
          message: 'Fetched products successfully.',
          products: allAds.rows
      });
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }    
};

// Getting all active ads by country
export const GetAllbyCountry = async (req, res) => {
  try {
    const { countryID } = req.params;
    const { limit = 6, page = 1, search = '', gender = '', ageFrom = 18, ageTo = 200 } = req.query;
    const offset = (page - 1) * limit;
    const genderArray = gender ? gender.split(',') : ['female','male','transsexual'];

    const allAds = await pool.query(
      `SELECT a.*, c.name AS cityname, i.filename as coverimage, u.pro, u.pro_valid AS turbo 
       FROM ads a
       JOIN cities c ON a.city = c.id 
       JOIN images i ON a.image_id = i.id 
       JOIN users u ON a.user_id = u.id 
       WHERE a.status = 1 
              AND c.country_id = $1 
              AND a.created_at + INTERVAL '6 MONTH' >= now() 
              AND a.description ILIKE '%' || $4 || '%' 
              AND LOWER(a.gender) = ANY($5::text[])
              AND a.age >= $6 AND a.age <= $7
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [countryID, limit, offset, search, genderArray, ageFrom, ageTo]
    );

    // Getting cover image link
    let index = 0;
    for (let oneAd of allAds.rows) {
      const coverImageUrl = await getPresignUrl(`${oneAd.coverimage}`, ``, "getObject");
      allAds.rows[index].coverImageLink = coverImageUrl.message;
      index++;
    }

    // Fetch total count for pagination info
    const totalAds = await pool.query(
      `SELECT COUNT(*) FROM ads a
       JOIN cities c ON a.city = c.id
       WHERE a.status = 1 AND c.country_id = $1 AND a.created_at + INTERVAL '6 MONTH' >= now()
              AND a.description ILIKE '%' || $2 || '%'
              AND LOWER(a.gender) = ANY($3::text[])
              AND a.age >= $4 AND a.age <= $5`,
      [countryID, search, genderArray, ageFrom, ageTo]
    );

    const totalPages = Math.ceil(totalAds.rows[0].count / limit);

    res.status(200).json({
      message: 'Fetched products successfully.',
      products: allAds.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalProducts: totalAds.rows[0].count,
      },
    });

  } catch (error) {
    console.error(error.message);
    res.status(400).send({ error: error });
  }
};

// Getting all active ads by city
export const GetByCity = async (req, res) => {
  try {
    const {slug} = req.params;
    const city_id = extractIDfromSlug(slug);
    const { limit = 6, page = 1, search = '', gender = '', ageFrom = 18, ageTo = 200} = req.query;
    const offset = (page - 1) * limit;

    const genderArray = gender ? gender.split(',') : ['female','male','transsexual'];

    const allAds = await pool.query(
      `SELECT a.*, c.name AS cityname, i.filename as coverimage 
       FROM ads a
       JOIN cities c ON a.city = c.id 
       JOIN images i ON a.image_id = i.id 
       WHERE a.status = 1 
              AND c.id = $1 
              AND a.created_at + INTERVAL '6 MONTH' >= now()
              AND a.description ILIKE '%' || $4 || '%'
              AND LOWER(a.gender) = ANY($5::text[])
              AND a.age >= $6 AND a.age <= $7
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [city_id, limit, offset, search, genderArray, ageFrom, ageTo]
    );

    //console.log(allAds.rows);

    // Getting cover image link
    let index = 0;
    for (let oneAd of allAds.rows) {
      const coverImageUrl = await getPresignUrl(`${oneAd.coverimage}`, ``, "getObject");
      allAds.rows[index].coverImageLink = coverImageUrl.message;
      index++;
    }
    
    // Fetch total count for pagination info
    const totalAds = await pool.query(
      `SELECT COUNT(*) FROM ads a
       JOIN cities c ON a.city = c.id 
       WHERE a.status = 1 AND c.id = $1 AND a.created_at + INTERVAL '6 MONTH' >= now()
              AND a.description ILIKE '%' || $2 || '%'
              AND LOWER(a.gender) = ANY($3::text[])
              AND a.age >= $4 AND a.age <= $5`,
      [city_id, search, genderArray, ageFrom, ageTo]
    );

    const totalPages = Math.ceil(totalAds.rows[0].count / limit);
      
    res.status(200).json({
        message: 'Fetched products successfully.',
        products: allAds.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalProducts: totalAds.rows[0].count,
        },
    });
  } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error })
  }    
}

// Getting all products by author
export const GetByAuthor = async (req, res) => {

  const { status } = req.params;

  try {

    let authorProducts;

    if( status && status === 'expired' ) {

      authorProducts = await pool.query(
        `SELECT a.*, c.name AS cityname, i.filename as coverimage 
        FROM ads a 
        JOIN cities c ON a.city = c.id 
        JOIN images i ON a.image_id = i.id 
        WHERE a.user_id = $1 AND 
            a.created_at + INTERVAL '6 MONTH' < now() 
        ORDER BY a.created_at DESC`,
        [req.decoded.userId]
      );

    } else {
      authorProducts = await pool.query(
        `SELECT a.*, c.name AS cityname, i.filename as coverimage 
        FROM ads a 
        JOIN cities c ON a.city = c.id 
        JOIN images i ON a.image_id = i.id 
        WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
        [req.decoded.userId]
      );
    }

      // Getting cover image link
      let index = 0;
      for (let oneAd of authorProducts.rows) {
        const coverImageUrl = await getPresignUrl(`${oneAd.coverimage}`, ``, "getObject");
        authorProducts.rows[index].coverImageLink = coverImageUrl.message;
        index++;
      }

      //console.log(authorProducts.rows);

      res.status(200).json({
          message: 'Fetched Products successfully.',
          products: authorProducts.rows
      });
  } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error })
  }
};

// Getting all products by author with in review status
export const GetByAuthorActive = async (req, res) => {
  try {
      const authorProducts = await pool.query(
        `SELECT a.*, c.name AS cityname, i.filename as coverimage 
        FROM ads a 
        JOIN cities c ON a.city = c.id 
        JOIN images i ON a.image_id = i.id 
        WHERE a.user_id = $1 AND a.status = 1 AND 
            a.created_at + INTERVAL '6 MONTH' >= now()
        ORDER BY a.created_at DESC`,
        [req.decoded.userId]
      );

      // Getting cover image link
      let index = 0;
      for (let oneAd of authorProducts.rows) {
        const coverImageUrl = await getPresignUrl(`${oneAd.coverimage}`, ``, "getObject");
        authorProducts.rows[index].coverImageLink = coverImageUrl.message;
        index++;
      }

      res.status(200).json({
          message: 'Fetched Products successfully.',
          products: authorProducts.rows
      });
  } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error })
  }
};

// Getting all products by author with in review status
export const GetByAuthorNew = async (req, res) => {
  console.log(req.params);
  try {
      const authorProducts = await pool.query(
        `SELECT a.*, c.name AS cityname, i.filename as coverimage  
        FROM ads a 
        JOIN cities c ON a.city = c.id 
        JOIN images i ON a.image_id = i.id 
        WHERE a.user_id = $1 AND a.status = 0 ORDER BY a.created_at DESC`,
        [req.decoded.userId]
      );

      // Getting cover image link
      let index = 0;
      for (let oneAd of authorProducts.rows) {
        const coverImageUrl = await getPresignUrl(`${oneAd.coverimage}`, ``, "getObject");
        authorProducts.rows[index].coverImageLink = coverImageUrl.message;
        index++;
      }

      res.status(200).json({
          message: 'Fetched Products successfully.',
          products: authorProducts.rows
      });
  } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error })
  }
};

// Getting the product by id
export const GetById = async (req, res) => {
  
  const { id } = req.params;
  const ad_id = extractIDfromSlug(id);

  try {
      const product = await pool.query(
        `SELECT a.*, c.name AS cityname, i.filename as coverimage, u.pro, u.pro_valid AS turbo  
          FROM ads a 
          JOIN cities c ON a.city = c.id 
          JOIN images i ON a.image_id = i.id 
          JOIN users u ON a.user_id = u.id           
          WHERE a.ad_id = $1 AND a.status = 1 AND 
            a.created_at + INTERVAL '6 MONTH' >= now()`,
        [ad_id]
      );

      // Getting cover image link
      const coverImageUrl = await getPresignUrl(`${product.rows[0].coverimage}`, ``, "getObject");
      product.rows[0].coverImageLink = coverImageUrl.message;

      // Getting additional images
      const additionalImages = await pool.query(
        `SELECT a.*, i.filename as addimage 
          FROM ads_images a 
          JOIN images i ON a.images = i.id 
          WHERE a.ad_id = $1 ORDER BY a.created_at ASC`,
        [ad_id]
      );

      let additionalImagesArray = [];
      let index = 1;
      for (let additionalImage of additionalImages.rows) {
        const presignedUrl = await getPresignUrl(`${additionalImage.addimage}`, ``, "getObject");
        additionalImagesArray.push(presignedUrl.message);
      }
      product.rows[0].additionalImages = additionalImagesArray;

      //console.log("ad adds:", product.rows[0]);

      res.status(200).json({
          message: 'Fetched a product successfully.',
          product: product.rows
      });
  } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error })
  }
};

// Getting all active ads by tag
export const GetBySlug = async (req, res) => {
  try {
    const {tag_id, country_id} = req.params;

    const allAds = await pool.query(
      `SELECT a.*, at.id, c.name AS cityname, i.filename as coverimage  
       FROM ads a
       JOIN ads_tags at ON a.ad_id = at.ad_id 
       JOIN cities c ON a.city = c.id 
       JOIN images i ON a.image_id = i.id 
       WHERE a.status = 1 AND a.country_id = $2 AND at.tag_id = $1 
       ORDER BY a.created_at DESC`,
      [tag_id, country_id]
    );

    // Getting cover image link
    let index = 0;
    for (let oneAd of allAds.rows) {
      const coverImageUrl = await getPresignUrl(`${oneAd.coverimage}`, ``, "getObject");
      allAds.rows[index].coverImageLink = coverImageUrl.message;
      index++;
    }
          
      res.status(200).json({
          message: 'Fetched Products successfully.',
          products: allAds.rows
      });
  } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error })
  }    
}

// Getting all active ads by tag and city
export const GetBySlugAndCity = async (req, res) => {
  try {
    const {tag_id, city, country_id} = req.params;
    const city_id = extractIDfromSlug(city);

    const allAds = await pool.query(
      `SELECT a.*, at.id, c.name AS cityname, i.filename as coverimage  
       FROM ads a
       JOIN ads_tags at ON a.ad_id = at.ad_id 
       JOIN cities c ON a.city = c.id 
       JOIN images i ON a.image_id = i.id 
       WHERE a.status = 1 AND a.city = $2 AND a.country_id = $3 AND at.tag_id = $1
       ORDER BY a.created_at DESC`,
      [tag_id, city_id, country_id]
    );

    // Getting cover image link
    let index = 0;
    for (let oneAd of allAds.rows) {
      const coverImageUrl = await getPresignUrl(`${oneAd.coverimage}`, ``, "getObject");
      allAds.rows[index].coverImageLink = coverImageUrl.message;
      index++;
    }
          
      res.status(200).json({
          message: 'Fetched Products successfully.',
          products: allAds.rows
      });
  } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error })
  }    
}

// Checking how many ads user added today (to go pro)
export const CheckAdDayQty = async (req, res) => {
  try {
    const authorProducts = await pool.query(
      `SELECT COUNT(a.*) AS ad_count, u.pro, u.pro_valid 
      FROM ads a 
      JOIN users u ON $1 = u.id 
      WHERE a.user_id = $1 AND a.created_at >= now() - INTERVAL '24 HOURS'
      GROUP BY u.pro, u.pro_valid`,
      [req.decoded.userId]
    );

    console.log(authorProducts.rows[0]);

    /*res.status(200).json({
        message: 'Fetched ads quantity successfully.',
        qty: authorProducts.rows[0].ad_count,
        pro: authorProducts.rows[0]
    });*/    

    if (authorProducts.rows.length > 0) {
      res.status(200).json({
        message: 'Fetched ads quantity successfully.',
        qty: authorProducts.rows[0].ad_count || 0,
        pro: authorProducts.rows[0].pro || null,
        pro_valid: authorProducts.rows[0].pro_valid || null
      });
    } else {
      res.status(200).json({
        message: 'No ads found for this user in the last 24 hours.',
        qty: 0,
        pro: null,
        pro_valid: null
      });
    }

  } catch (error) {
    console.error(error.message);
    res.status(400).send({ error: error.message })
  }
}



// Get all products paginated = mv8
export const GetAllPaginated = (req, res) => {

  const { page, limit, filter, category, title_contains } = req.query;

  let aggregatePipeline = [
    {
      $match: {
        isDeleted: { $ne: true } // Filter out products that are not deleted
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'seller',
        foreignField: '_id',
        as: 'seller'
      }
    },
    {
      $unwind: '$seller'
    },
    {
      $match: {
        'seller.walletAddress': { $ne: null },
        'activated': true
      }
    }
  ];

  if (filter) {
    let filterQuery;
    switch (filter) {
      case 'latest':
        filterQuery = { createdAt: -1 };
        aggregatePipeline.push({ $sort: filterQuery });
        break;
      case 'ascending':
        filterQuery = { sellingPrice: 1 };
        aggregatePipeline.push({ $sort: filterQuery });
        break;
      case 'descending':
        filterQuery = { sellingPrice: -1 };
        aggregatePipeline.push({ $sort: filterQuery });
        break;
      case 'topSeller':
        aggregatePipeline.push(
          {
            $lookup: {
              from: 'orders',
              localField: '_id',
              foreignField: 'orderItems.product',
              as: 'orders'
            }
          },
          {
            $addFields: {
              orders: { $size: '$orders' }
            }
          },
          {
            $sort: {
              orders: -1
            }
          }
        );
        break;
      default:
        filterQuery = { createdAt: 1 };
        aggregatePipeline.push({ $sort: filterQuery });
        break;
    }
  }

  if (category && category != 'all') {
    aggregatePipeline.push({
      $match: { category: mongoose.Types.ObjectId(category) }
    });
  }

  if (title_contains) {
    aggregatePipeline.push({
      $match: { name: { $regex: title_contains, $options: 'i' } }
    });
  }

  if (page) {
    aggregatePipeline.push({ $skip: (page - 1) * limit });
  }

  if (limit) {
    aggregatePipeline.push({ $limit: limit * 1 });
  }

  collection.aggregate(aggregatePipeline).toArray()
    .then(results => {
      res.status(200).json({
        message: 'Fetched Products successfully.',
        products: results
      });
    })
    .catch(error => res.status(400).send({ error: error }));
};








// Getting total quantity of products = mv8
export const total = (req, res) => {
  collection.aggregate([
    {
      $match: {
        isDeleted: { $ne: true } // Filter out products that are not deleted
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'seller',
        foreignField: '_id',
        as: 'seller'
      }
    },
    {
      $unwind: '$seller'
    },
    {
      $match: {
        'seller.walletAddress': { $ne: null },
        "activated": true
      }
    }
  ]).toArray()
    .then(results => {
      res.status(200).json({
        message: 'Fetched Products successfully.',
        total: results.length > 0 ? results.length : 0
      });
    })
    .catch(error => res.status(400).send({ error: error }));
};

export const GetByIds = async (req, res) => {

  const { payload } = req.body;

  if (!Array.isArray(payload)) {
    return res.status(400).json({ error: 'Payload must be an array' });
  } 
  
  try {
    const products = await Promise.all(
      payload.map(async item => {
        const product = await collection.aggregate([
          {
            $match: {
              _id: mongoose.Types.ObjectId(item.id),
              isDeleted: { $ne: true }
            }
          },
          {
            $unset: 'attributes'
          },
          {
            $addFields: {
              attributes: { $const: item.attributes }
            }
          }
        ]);
        return product[0];
      })
    );
    res.status(200).json({
      message: 'Fetched Products By Ids successfully.',
      products
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Getting all products by category id = mv8
export const GetByCategory = (req, res) => {

  const { id } = req.params;
  
  collection.find({ category: ObjectId.createFromHexString(id), isDeleted: { $ne: true } }).toArray()
    .then(results =>
      res.status(200).json({
        message: 'Fetched Products successfully.',
        products: results
      })
    )
    .catch(error => res.status(400).send({ error: error }));
};

export const GetWishBySeller = (req, res) => {
    const userId = req.decoded.userId;
    collection.find({ isDeleted: { $ne: true }, liked: { $in: [userId] } })
      .populate('category', 'name')
      .then(results =>
        res.status(200).json({
          message: 'Fetched Product By Seller successfully.',
          products: results
        })
      )
      .catch(error => res.status(400).send({ error: error }))
};

export const Update = async (req, res) => {
    if (Object.keys(req.body).length <= 0) {
      return res
        .status(422)
        .json({ error: 'Kindly, Provide an attribute to update.' })
    }
  
    const { id } = req.params
  
    const {
      name,
      category,
      description,
      token,
      sellingPrice,
      quantity,
      freeShipping,
      shippingCharges,
      shippingDays,
      countryOfSale,
      freeInternationally,
      color,
      size,
      sku,
      manufacturePartNo,
      productSerialNo,
      terms,
      tags
    } = req.body
    const data = {}
  
    if (name) {
      data['name'] = name
    }
    if (category) {
      data['category'] = category
    }
    if (description) {
      data['description'] = description
    }
    if (token) {
      data['token'] = token
    }
    if (sellingPrice) {
      data['sellingPrice'] = sellingPrice
    }
    if (quantity) {
      data['quantity'] = quantity
    }
    if (freeShipping) {
      data['freeShipping'] = freeShipping
    }
    if (shippingCharges) {
      data['shippingCharges'] = shippingCharges
    }
    if (shippingDays) {
      data['shippingDays'] = shippingDays
    }
    if (countryOfSale) {
      data['countryOfSale'] = countryOfSale
    }
    if (freeInternationally) {
      data['freeInternationally'] = freeInternationally
    }
    if (color) {
      data['color'] = color
    }
    if (size) {
      data['size'] = size
    }
    if (sku) {
      data['sku'] = sku
    }
    if (manufacturePartNo) {
      data['manufacturePartNo'] = manufacturePartNo
    }
    if (productSerialNo) {
      data['productSerialNo'] = productSerialNo
    }
    if (terms) {
      data['terms'] = terms
    }
    if (tags) {
      data['tags'] = tags
    }
  
    if (Object.keys(data).length > 0) {
      const product = await collection.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, data, {
        new: true
      })
  
      if (!product) {
        return res.status(404).send({ error: 'Product Not Found' })
      }
  
      res.status(200).json({
        message: 'Product Updated successfully.',
        product: product
      })
    } else {
      return res.status(422).json({
        error: 'Kindly, Provide an valid attribute to update.'
      })
    }
};

export const UpdateImage = async (req, res) => {
    const { id } = req.params
    const { imageType, imageCount } = req.body
  
    const product = await collection.findOne({ _id: id, isDeleted: { $ne: true } })
  
    if (!product) {
      return res.status(404).send({ error: 'Product Not Found' })
    }
  
    if (imageType === 'main') {
      if (req.file !== undefined) {
        const { destination, filename } = req.file
        let image = createImageUrl(destination, filename)
        if (product.mainImage) {
          const path = getImagePath(product.mainImage)
          if (fs.existsSync(path)) {
            fs.unlinkSync(path)
          }
        }
        product.mainImage = image
      }
    } else if (imageType === 'secondary') {
      if (req.file !== undefined) {
        const { destination, filename } = req.file
        let image = createImageUrl(destination, filename)
  
        if (imageCount == 1) {
          if (product.additionalImage1) {
            const path = getImagePath(product.additionalImage1)
            if (fs.existsSync(path)) {
              fs.unlinkSync(path)
            }
          }
          product.additionalImage1 = image
        } else if (imageCount == 2) {
          if (product.additionalImage2) {
            const path = getImagePath(product.additionalImage2)
            if (fs.existsSync(path)) {
              fs.unlinkSync(path)
            }
          }
          product.additionalImage2 = image
        } else if (imageCount == 2) {
          if (product.additionalImage3) {
            const path = getImagePath(product.additionalImage3)
            if (fs.existsSync(path)) {
              fs.unlinkSync(path)
            }
          }
          product.additionalImage3 = image
        }
      }
    } else {
      return res.status(400).send({ error: 'Image type is invalid' })
    }
  
    try {
      const newProduct = await collection.insertOne(product);

      res.json({
        message: 'Images Updated Successfully'
      });

    } catch (error) {
      res.status(422).json({ error: error })
    }
};

export const UpdateImages = async (req, res) => {
    const { id } = req.params
    const {
      mainImage,
      additionalImage1,
      additionalImage2,
      additionalImage3,
      additionalImage4,
      additionalImage5
    } = req.files
    const product = await collection.findById(id)
  
    if (!product) {
      return res.status(404).send({ error: 'Product Not Found' })
    }
  
    if (req.files !== undefined) {
      if (mainImage) {
        const { destination, filename } = mainImage[0]
        let image = createImageUrl(destination, filename)
        if (product.mainImage) {
          const path = getImagePath(product.mainImage)
          if (fs.existsSync(path)) {
            fs.unlinkSync(path)
          }
        }
        product.mainImage = image
      }
      if (additionalImage1) {
        const { destination, filename } = additionalImage1[0]
        let image = createImageUrl(destination, filename)
        if (product.additionalImage1) {
          const path = getImagePath(product.additionalImage1)
          if (fs.existsSync(path)) {
            fs.unlinkSync(path)
          }
        }
        product.additionalImage1 = image
      }
      if (additionalImage2) {
        const { destination, filename } = additionalImage2[0]
        let image = createImageUrl(destination, filename)
        if (product.additionalImage2) {
          const path = getImagePath(product.additionalImage2)
          if (fs.existsSync(path)) {
            fs.unlinkSync(path)
          }
        }
        product.additionalImage2 = image
      }
      if (additionalImage3) {
        const { destination, filename } = additionalImage3[0]
        let image = createImageUrl(destination, filename)
        if (product.additionalImage3) {
          const path = getImagePath(product.additionalImage3)
          if (fs.existsSync(path)) {
            fs.unlinkSync(path)
          }
        }
        product.additionalImage3 = image
      }
      if (additionalImage4) {
        const { destination, filename } = additionalImage4[0]
        let image = createImageUrl(destination, filename)
        if (product.additionalImage4) {
          const path = getImagePath(product.additionalImage4)
          if (fs.existsSync(path)) {
            fs.unlinkSync(path)
          }
        }
        product.additionalImage4 = image
      }
      if (additionalImage5) {
        const { destination, filename } = additionalImage5[0]
        let image = createImageUrl(destination, filename)
        if (product.additionalImage5) {
          const path = getImagePath(product.additionalImage5)
          if (fs.existsSync(path)) {
            fs.unlinkSync(path)
          }
        }
        product.additionalImage5 = image
      }
    } else {
      return res.status(422).send({ error: 'No file found' })
    }
  
    try {
      await collection.insertOne(product)
      
      res.json({
        message: 'Image Updated Successfully',
        product: product
      })
    } catch (error) {
      res.status(422).json({ error: error })
    }
};

export const UpdateStock = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: errors.array() })
    }
  
    const { id, action, qty } = req.body
  
    const product = await collection.findById(id)
  
    if (action === 'add') {
      product.quantity = product.quantity + qty
    } else if (product.quantity - qty >= 0) {
      product.quantity = product.quantity - qty
    } else {
      return res
        .status(400)
        .send({ error: "Quantity can't be in negative" })
    }
  
    try {
      await collection.insertOne(product);
      res.json({
        message: 'Product Qauntity updated successfully.',
        product: product
      })
    } catch (error) {
      res.status(422).json({ error: error })
    }
};

export const StatusChanged = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: errors.array() })
    }
  
    const { id, status } = req.body
  
    const product = await collection.findByIdAndUpdate(
      id,
      { activated: status },
      { new: true }
    )
  
    if (!product) {
      return res.status(404).send({ error: 'Product Not Found' })
    }
  
    res.status(200).json({
      message: 'Status Chaged successfully.',
      changedStatus: product.activated
    })
};

export const GetReviews = (req, res) => {
    const { id } = req.params
    Feedback.aggregate([
      {
        $match: {
          productId: mongoose.Types.ObjectId(id)
        }
      },
      {
        $facet: {
          allFeedbackTexts: [
            {
              $lookup: {
                from: 'users',
                localField: 'buyerId',
                foreignField: '_id',
                as: 'buyer'
              }
            },
            { $unwind: '$buyer' },
            {
              $project: {
                feedbackText: 1,
                stars: { $divide: [{ $sum: ["$description", "$time", "$communication"] }, 3] },
                buyer: { firstName: 1, lastName: 1 }
              }
            }
          ],
          allRatings: [
            {
              $group: {
                _id: '$stars',
                count: { $sum: 1 },
                averageRating: { $avg: '$stars' }
              }
            },
            {
              $sort: {
                _id: -1
              }
            },
            {
              $group: {
                _id: null,
                allReviews: {
                  $push: { stars: '$_id', count: '$count' }
                },
                averageRating: { $avg: '$averageRating' }
              }
            }
          ]
        }
      }
    ])
      .then(results => {
        res.status(200).json({
          message: 'Fetched Reviews successfully.',
          reviews: results[0]
        })
      })
      .catch(error => res.status(400).send({ error: error }))
};

// Getting product rating = mv8
export const GetRating = (req, res) => {

    const { id } = req.params;

    feebackCollection.aggregate([
      {
        $match: {
          productId: mongoose.Types.ObjectId.isValid(id)
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          averageDescriptionRating: { $avg: '$description' },
          averageTimeRating: { $avg: '$time' },
          averageCommunicationRating: { $avg: '$communication' }
        }
      },
      {
        $project: {
          averageDescriptionRating: 1,
          averageTimeRating: 1,
          averageCommunicationRating: 1,
          total: { $divide: [{ $sum: ["$averageDescriptionRating", "$averageTimeRating", "$averageCommunicationRating"] }, 3] }
        }
      }
    ]).toArray()
      .then(results => {
        res.status(200).json({
          message: 'Fetched Rating successfully.',
          rating: results[0]
        })
      })
      .catch(error => res.status(400).send({ error: error }))
};

export const GetLatestProduct = async (req, res) => {
    const product = await collection.findOne({ "seller": req.decoded.userId })
      .populate('category')
      .sort({ 'createdAt': -1 })
  
    let categories = []
    if (product) {
      if (product.category.parent) {
        const Parentcategory = await Category.findOne({ "_id": product.category.parent })
        categories.push(Parentcategory._id, product.category._id)
      } else {
        categories.push(product.category._id)
      }
    }
  
    res.status(200).json({
      message: 'Fetched Product successfully.',
      product: product,
      category: categories
    })
};

export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    console.log({ id, x: req.decoded })
  
    // const product = await collection.findById(id);
    const product = await collection.findOneAndUpdate({ _id: id, seller: mongoose.Types.ObjectId(req?.decoded?.userId) }, { isDeleted: true }, { new: true });
    if (!product) {
      return res.status(404).send({ error: 'No Product Found' })
    }
  
    console.log({ product })
    res.status(200).json({
      message: 'Product Removed Successfully.',
      data: {
        product: product
      }
    });
};

export const likeProduct = async (req, res) => {
    const { id } = req.params;
    console.log({ id, x: req.decoded })
  
  
    let product = await collection.findById(id);
  
    if (!product) {
      return res.status(404).send({ error: 'No Product Found' });
    }
  
    // Check if the user has already liked the product
    if (product?.liked?.includes(req.decoded.userId)) {
      return res.status(200).json({
        message: 'Like Product Successfully.',
        data: {
          product: product
        }
      });
    }
  
    // Add the user ID to the product's like array
    product.liked.push(req.decoded.userId);
  
    // Save the updated product
    product = await collection.insertOne(product);
  
    res.status(200).json({
      message: 'Like Product Successfully.',
      data: {
        product: product
      }
    });
};

export const dislikeProduct = async (req, res) => {
    const { id } = req.params;
    console.log({ id, x: req.decoded });
  
    try {
      // Update the product document to remove the user ID from the like array
      await collection.updateOne({ _id: id }, { $pull: { liked: req.decoded.userId } });
  
      // Fetch the updated product to include in the response
      const product = await collection.findById(id);
  
      console.log({ product });
      res.status(200).json({
        message: 'Dislike Product Successfully.',
        data: {
          product: product
        }
      });
    } catch (error) {
      console.error('Error while updating product dislikes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
};