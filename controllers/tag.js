import { extractIDfromSlug } from '../utils/extractIDfromSlug.js';
import { validationResult } from 'express-validator';


// Connect to the database
import pool from '../db/db.js';


// Getting tag by its slug
export const GetBySlug = async (req, res) => {

    const {slug} = req.params;

    try {
        const tag = await pool.query(`SELECT * FROM tags WHERE slug = $1`,
            [slug]
        );
        if( tag.rows[0] ) {
            res.status(200).json({
                message: 'Fetched Tag successfully.',
                tag: tag.rows
            });    
        } else {
            res.status(404);
        }
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};

// Getting all tags by country (with existing ads)
export const GetAll = async (req, res) => {
    const {country} = req.params;
    try {
        const tags = await pool.query(
            `SELECT DISTINCT t.*
             FROM tags t
             JOIN ads_tags at ON at.tag_id = t.id
             JOIN ads a ON a.ad_id = at.ad_id
             WHERE a.country_id = $1 
               AND a.status = 1
             ORDER BY t.slug ASC`,
             [country]
        );
        res.status(200).json({
            message: 'Fetched tags successfully.',
            tags: tags.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};

// Getting all tags by city (with existing ads)
export const GetAllinCity = async (req, res) => {
    const {city} = req.params;
    const city_id = extractIDfromSlug(city);
    try {
        const tags = await pool.query(
            `SELECT DISTINCT t.*
             FROM tags t
             JOIN ads_tags at ON at.tag_id = t.id
             JOIN ads a ON a.ad_id = at.ad_id
             WHERE a.city = $1 
               AND a.status = 1
             ORDER BY t.slug ASC`,
             [city_id]
        );        
        res.status(200).json({
            message: 'Fetched tags successfully.',
            tags: tags.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};

// Getting all tags for admin
export const GetAllforAdmin = async (req, res) => {
    try {
        const tags = await pool.query(
            `SELECT * FROM tags ORDER BY text ASC`
        );        
        res.status(200).json({
            message: 'Fetched tags successfully.',
            tags: tags.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};

// Add new tag
export const Add = async (req, res) => {
  
    const { userId } = req.decoded;
    const { tagtext, tagslug, description } = req.body;

    let tag_slug;
    if( tagslug !== '' ) {
        tag_slug = tagslug.toLowerCase().replace(/[^a-z0-9]/g, '-');
    } else {
        tag_slug = tagtext.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    console.log(tag_slug, description);

    const tag = await pool.query(`SELECT * FROM tags WHERE text = $1`,
        [tagtext]
    );
    if( tag.rows[0] ) {
        res.status(400).json({
            message: 'Tag already exists.',
            tag: tag.rows[0]
        });    
    } else {
        // adding into DB
        try {
            const newTag = await pool.query(
                `INSERT INTO tags (
                    text, 
                    slug,
                    description, 
                    created_at) 
                VALUES(
                    $1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`, 
                [tagtext, tag_slug, description]
            );
            
            console.log("ad added:", newTag.rows[0].id);

            res.json({
                message: 'Product added successfully.',
                tag: newTag
            });
        } catch (error) {
            res.status(422).json({ error: error });
            console.error(error.message);
        }
    }
};