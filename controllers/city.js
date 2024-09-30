import { extractIDfromSlug } from '../utils/extractIDfromSlug.js';
// Connect to the database
import pool from '../db/db.js';


// Getting all cities by region
export const GetAllByRegion = async (req, res) => {
    try {
        const {regionID} = req.params;
        const cities = await pool.query(
            `SELECT name, id
             FROM cities
             WHERE state_id = $1 
             ORDER BY name ASC`,
            [regionID]
        );
        res.status(200).json({
            message: 'Fetched Cities successfully.',
            cities: cities.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};

// Getting all cities by countries with active ads
export const GetByCountry = async (req, res) => {
    const { countryID } = req.params;
    try {
        const cities = await pool.query(
            `SELECT DISTINCT c.name, c.id
             FROM cities c
             JOIN ads a ON c.id = a.city
             WHERE c.country_id = $1 AND a.status = 1 AND 
                                        a.created_at + INTERVAL '6 MONTH' >= now() 
             ORDER BY c.name ASC`,
            [countryID]
        );
        res.status(200).json({
            message: 'Fetched cities successfully.',
            cities: cities.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};

// Getting city by its id
export const GetByID = async (req, res) => {
    const {slug} = req.params;
    const city_id = extractIDfromSlug(slug);
    try {
        const city = await pool.query(`SELECT * FROM cities WHERE id = $1`,
            [city_id]
        );
        if( city.rows[0] ) {
            res.status(200).json({
                message: 'Fetched City successfully.',
                city: city.rows
            });    
        } else {
            res.status(404);//.send({ error: error })
        }
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};