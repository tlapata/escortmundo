// Connect to the database
import pool from '../db/db.js';


// Getting all regions by country (with existing in db cities)
export const GetAll = async (req, res) => {
    try {
        const countries = await pool.query(
            `SELECT DISTINCT c.name, c.id, c.tld, c.emoji
             FROM countries c
             JOIN ads a ON c.id = a.country_id
             WHERE a.status = 1
             ORDER BY c.name ASC`
        );
        res.status(200).json({
            message: 'Fetched Countries successfully.',
            countries: countries.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};
