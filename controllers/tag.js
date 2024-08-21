import { extractIDfromSlug } from '../utils/extractIDfromSlug.js';


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
