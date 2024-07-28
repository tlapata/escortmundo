import express from 'express';
import * as regionController from '../controllers/region.js';


const router = express.Router();

/**
 * @route GET /api/region/getAllByCountry
 * @description Get all regions by country
 */
router.get('/getAllByCountry', regionController.GetAllByCountry);


export default router;