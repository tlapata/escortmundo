import express from 'express';
import * as cityController from '../controllers/city.js';


const router = express.Router();

/**
 * @route GET /api/city/getByCountry
 * @description Get cities by country with active ads
 */
router.get('/getByCountry/:countryID', cityController.GetByCountry);

/**
 * @route GET /api/city/getAllByRegion
 * @description Get cities by country with active ads
 */
router.get('/getAllByRegion/:regionID', cityController.GetAllByRegion);


/**
 * @route GET /api/city/getByID/slug
 * @description Get city by its id
 */
router.get('/getByID/:slug', cityController.GetByID);


export default router;