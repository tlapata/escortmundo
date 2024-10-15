import express from 'express';
import { check } from 'express-validator';
import requireAuth from '../middlewares/requireAuth.js';
import authenticateAdmin from '../middlewares/requireAuthAdmin.js';
import Upload from '../middlewares/multer/productMulter.js';
import * as productController from '../controllers/product.js';

const router = express.Router();

const addValidationRules = [
  check('name')
    .exists()
    .withMessage('Name is required')
    .notEmpty()
    .withMessage('Name must not be empty'),
  check('region').exists().withMessage('Region is required'),
  check('city').exists().withMessage('City is required'),
  check('age')
    .exists().withMessage('Quantity is required')
    .isInt({ min: 18 }).withMessage('Age must be at least 18 years'),
  check('gender').exists().withMessage('Gender is required'),
  check('description').exists().withMessage('Description is required')
];

const updateStockValidationRules = [
  check('id')
    .exists()
    .withMessage('Id is required')
    .notEmpty()
    .withMessage('Id must not be empty'),
  check('action')
    .exists()
    .withMessage('Action is required')
    .isIn(['add', 'remove'])
    .withMessage('Action must be "add" or "remove"'),
  check('qty').exists().withMessage('Quantity is required')
];

const statusChangedValidationRules = [
  check('id')
    .exists()
    .withMessage('Id is required')
    .notEmpty()
    .withMessage('Id must not be empty'),
  check('status')
    .exists()
    .withMessage('Status is required')
    .isBoolean()
    .withMessage('Status must be a boolean value')
];

/**
 * @route POST /api/product/add
 * @description Add a new product
 * @access Private (requireAuth middleware)
 */
const multiUpload = Upload.fields([
  { name: 'profileImages', maxCount: 10 } 
]);
router.post('/add', requireAuth, multiUpload, addValidationRules, productController.Add);


/**
 * @route GET /api/product/getAll/status
 * @description Get all products
 * @access Public
 */
router.get('/getAll/:status', productController.GetAll);

/**
 * @route GET /api/product/getAllbyCountry/countryID
 * @description Get all products from one country
 * @access Public
 */
router.get('/getAllbyCountry/:countryID', productController.GetAllbyCountry);


/**
 * @route GET /api/product/getByAuthor
 * @description Get products by user (authenticated user)
 * @access Private (requireAuth middleware)
 */
router.get('/getByAuthor', requireAuth, productController.GetByAuthor);

/**
 * @route GET /api/product/getByAuthor/expired
 * @description Get products by user (authenticated user)
 * @access Private (requireAuth middleware)
 */
router.get('/getByAuthor/:status', requireAuth, productController.GetByAuthor);

/**
 * @route GET /api/product/getByAuthorNew
 * @description Get new (in review) products by user (authenticated user)
 * @access Private (requireAuth middleware)
 */
router.get('/getByAuthorNew', requireAuth, productController.GetByAuthorNew);

/**
 * @route GET /api/product/getByAuthorActive
 * @description Get active products by user (authenticated user)
 * @access Private (requireAuth middleware)
 */
router.get('/getByAuthorActive', requireAuth, productController.GetByAuthorActive);

/**
 * @route GET /api/product/getByCity
 * @description Get products by city slug
 * @access Public
 */
router.get('/getByCity/:slug', productController.GetByCity);

/**
 * @route GET /api/product/getById/:id
 * @description Get a product by its ID
 * @access Public
 */
router.get('/getById/:id', productController.GetById);

/**
 * @route GET /api/product/getByIdbyAdmin/:id
 * @description Get a product by its ID by admin
 * @access Private admin (requireAuthAdmin middleware)
 */
router.get('/getByIdbyAdmin/:id', authenticateAdmin, productController.GetById);

/**
 * @route GET /api/product/getBySlug/slug/country
 * @description Get products by tag id in separate country
 * @access Public
 */
router.get('/getBySlug/:tag_id/:country_id', productController.GetBySlug);

/**
 * @route GET /api/product/getBySlugAndCity/slug/city/country
 * @description Get products by tag id and city 
 */
router.get('/getBySlugAndCity/:tag_id/:city/:country_id', productController.GetBySlugAndCity);

/**
 * @route GET /api/product/checkAdDayQty
 * @description Checking how many ads user added today (to go pro)
 */
router.get('/checkAdDayQty', requireAuth, productController.CheckAdDayQty);

/**
 * @route PATCH /api/product/updateStatus/:id
 * @description Update ad status
 * @access Private admin (requireAuthAdmin middleware)
 */
router.patch('/updateStatus/:id', authenticateAdmin, productController.UpdateStatus);

/**
 * @route DELETE /api/product/delete/:id
 * @description Delete a product by its ID
 * @access Private (requireAuth middleware)
 */
router.delete('/delete/:id', authenticateAdmin, productController.deleteProduct);





/**
 * @route GET /api/product/getAllPaginated
 * @description Get all products paginated
 * @access Public
 */
router.get('/getAllPaginated', productController.GetAllPaginated);

/**
 * @route GET /api/product/total
 * @description Get total number of products
 * @access Public
 */
router.get('/total', productController.total);


/**
 * @route POST /api/product/getByIds
 * @description Get products by multiple IDs
 * @access Public
 */
router.post('/getByIds', productController.GetByIds);

/**
 * @route GET /api/product/getByCategory/:id
 * @description Get products by category ID
 * @access Public
 */
router.get('/getByCategory/:id', productController.GetByCategory);


/**
 * @route GET /api/product/getWishBySeller
 * @description Get wishlist products by seller (authenticated user)
 * @access Private (requireAuth middleware)
 */
router.get('/getWishBySeller', requireAuth, productController.GetWishBySeller);

/**
 * @route PUT /api/product/update/:id
 * @description Update a product by its ID
 * @access Private (requireAuth middleware)
 */
router.put('/update/:id', requireAuth, productController.Update);

/**
 * @route PATCH /api/product/updateImage/:id
 * @description Update product image by its ID
 * @access Private (requireAuth middleware)
 */
router.patch('/updateImage/:id', requireAuth, Upload.single('image'), productController.UpdateImage);

/**
 * @route PATCH /api/product/updateImages/:id
 * @description Update product images by its ID
 * @access Private (requireAuth middleware)
 */
router.patch('/updateImages/:id', requireAuth, multiUpload, productController.UpdateImages);


/**
 * @route PATCH /api/product/statusChanged
 * @description Change product status
 * @access Private (requireAuth middleware)
 */
router.patch('/statusChanged', requireAuth, statusChangedValidationRules, productController.StatusChanged);

/**
 * @route GET /api/product/getReviews/:id
 * @description Get reviews of a product by its ID
 * @access Public
 */
router.get('/getReviews/:id', productController.GetReviews);

/**
 * @route GET /api/product/getRating/:id
 * @description Get rating of a product by its ID
 * @access Public
 */
router.get('/getRating/:id', productController.GetRating);

/**
 * @route GET /api/product/get-latest-product
 * @description Get the latest added product
 * @access Private (requireAuth middleware)
 */
router.get('/get-latest-product', requireAuth, productController.GetLatestProduct);

/**
 * @route POST /api/product/like/:id
 * @description Like a product by its ID
 * @access Private (requireAuth middleware)
 */
router.post('/like/:id', requireAuth, productController.likeProduct);

/**
 * @route POST /api/product/dislike/:id
 * @description Dislike a product by its ID
 * @access Private (requireAuth middleware)
 */
router.post('/dislike/:id', requireAuth, productController.dislikeProduct);

export default router;