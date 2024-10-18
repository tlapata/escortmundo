import express from 'express';
import * as cityController from '../controllers/city.js';
import authenticateAdmin from '../middlewares/requireAuthAdmin.js';


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
 * @description Get city by its slug
 */
router.get('/getByID/:slug', cityController.GetByID);

/**
 * @route GET /api/city/getByIDbyAdmin/id
 * @description Get city by its id
 */
router.get('/getByIDbyAdmin/:id', authenticateAdmin, cityController.GetByIDbyAdmin);

/**
 * @route PATCH /api/city/update/id
 * @description Update city description by admin
 * @access Private admin (requireAuthAdmin middleware)
*/
router.patch("/updateCity/:id", authenticateAdmin, cityController.UpdateByAdmin);


export default router;