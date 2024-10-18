import express from 'express';
import * as tagController from '../controllers/tag.js';
import authenticateAdmin from '../middlewares/requireAuthAdmin.js';


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


/**
 * @route GET /api/tag/getAllforAdmin
 * @description Get all tags for admin
 * @access Private admin (requireAuthAdmin middleware)
 */
router.get('/getAllforAdmin', authenticateAdmin, tagController.GetAllforAdmin);


/**
 * @route POST /api/tag/add
 * @description Add a new tag
 * @access Private admin (requireAuthAdmin middleware)
 */
router.post('/add', authenticateAdmin, tagController.Add);

  
export default router;