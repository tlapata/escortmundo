import express from 'express';
import * as tagController from '../controllers/tag.js';


const router = express.Router();

/**
 * @route GET /api/tag/getBySlug/slug
 * @description Get tag by its slug
 */
router.get('/getBySlug/:slug', tagController.GetBySlug);


/**
 * @route GET /api/tag/getAll/country
 * @description Get all tags with active ads in the current country
 */
router.get('/getAll/:country', tagController.GetAll);


/**
 * @route GET /api/tag/getAllinCity/city
 * @description Get all tags with active ads in the current city 
 */
router.get('/getAllinCity/:city', tagController.GetAllinCity);


export default router;