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
  const reviewer = req.decoded?.userId || 0;

  try {
      const product = await pool.query(
        `SELECT a.*, c.name AS cityname, i.filename as coverimage, u.pro, u.pro_valid AS turbo  
          FROM ads a 
          JOIN cities c ON a.city = c.id 
          JOIN images i ON a.image_id = i.id 
          JOIN users u ON a.user_id = u.id           
          WHERE a.ad_id = $1 AND (a.status = 1 OR (a.status = 0 AND $2 > 0)) AND 
            a.created_at + INTERVAL '6 MONTH' >= now()`,
        [ad_id, reviewer]
      );

      if( product.rows.length === 0 ) {
        return res.status(404).send({ error: 'Ad not found.' });
      }

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

// Admin approving the new ad
export const UpdateStatus = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() })
  }

  const {id} = req.params;

  try {    
    const updatedAd = await pool.query(
      "UPDATE ads SET status = 1 WHERE ad_id = $1", 
      [id]
    );
    res.json({
      message: 'The ad was approved successfully.',
      product: updatedAd
    })
  } catch (error) {
    console.log(error.message);
  }
};

// Deleting the ad
export const deleteProduct = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() })
  }

  const {id} = req.params;

  try {
    const product = await pool.query(
      `SELECT user_id FROM ads WHERE ad_id = $1`,
      [id]
    );

    if( product.rows.length === 0 ) {
      return res.status(404).send({ error: 'Ad not found.' });
    }

    const deletedCover = await pool.query("DELETE FROM ads_images WHERE ad_id = $1", [id]);
    const deletedTags = await pool.query("DELETE FROM ads_tags WHERE ad_id = $1", [id]);
    const deletedAd = await pool.query("DELETE FROM ads WHERE ad_id = $1", [id]);

    res.status(200).json({
      message: 'The ad was deleted successfully.',
      product: product
    });  
  } catch (error) {
    console.log(error.message);
  }
};