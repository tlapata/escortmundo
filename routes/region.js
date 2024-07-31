import express from 'express';
import * as regionController from '../controllers/region.js';


const router = express.Router();

/**
 * @route GET /api/region/getAllByCountry/countryID
 * @description Get all regions by country
 */
router.get('/getAllByCountry/:countryID', regionController.GetAllByCountry);


export default router;