import express from 'express';
import * as contryController from '../controllers/country.js';


const router = express.Router();

/**
 * @route GET /api/country/getAll
 * @description Get all countries with active ads
 */
router.get('/getAll', contryController.GetAll);


export default router;