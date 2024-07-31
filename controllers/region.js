// Connect to the database
import pool from '../db/db.js';


// Getting all regions by country (with existing in db cities)
export const GetAllByCountry = async (req, res) => {
    try {
        const {countryID} = req.params;
        /*const regions = await pool.query(
            `SELECT name, id
             FROM states
             WHERE country_id = $1 
             ORDER BY name ASC`,
            [country]
        );*/
        const regionsActive = await pool.query(
            `SELECT DISTINCT r.name, r.id
             FROM states r
             JOIN cities c ON r.id = c.state_id
             WHERE r.country_id = $1
             ORDER BY r.name ASC`,
            [countryID]
        );
        res.status(200).json({
            message: 'Fetched Regions successfully.',
            regions: regionsActive.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(400).send({ error: error })
    }
};
