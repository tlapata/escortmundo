import express from 'express';
import { check } from 'express-validator';
import requireAuth from '../middlewares/requireAuth.js';
import * as userController from '../controllers/user.js';
import Upload from '../middlewares/multer/productMulter.js';

const router = express.Router();

// Validating rules
const updateAuthenticationValidationRules = [
  check("activated")
    .exists()
    .withMessage("Activated is required")
    .isIn([true, false])
    .withMessage("activated must not be true/false"),
];

const changeStatusValidationRules = [
  check("status")
    .exists()
    .withMessage("Activated is required")
    .isIn([true, false])
    .withMessage("activated must not be true/false"),
];

const changePasswordValidationRules = [
  check("currentPassword")
    .exists()
    .withMessage("Current Password is required")
    .isLength({ min: 6 })
    .withMessage("Current Password must be at least six characters"),
  check("newPassword")
    .exists()
    .withMessage("New Password is required")
    .isLength({ min: 6 })
    .withMessage("New Password must be at least six characters"),
];

const addAddressValidationRules = [
  check("address").exists().withMessage("Address is required"),
  check("street").exists().withMessage("Street is required"),
  check("postalCode").exists().withMessage("Postcode is required"),
  check("city").exists().withMessage("City is required"),
  check("state").exists().withMessage("State is required"),
  check("country").exists().withMessage("Country is required"),
];

const editAddressValidationRules = [
  check("addressId").exists().withMessage("Address Id is required"),
  check("address").exists().withMessage("Address Details is required"),
  check("street").exists().withMessage("Street is required"),
  check("postalCode").exists().withMessage("Postcode is required"),
  check("city").exists().withMessage("City is required"),
  check("state").exists().withMessage("State is required"),
  check("country").exists().withMessage("Country is required"),
];

const addressIdValidationRules = [
  check("addressId").exists().withMessage("Address Id is required"),
];

/**
 * @Route Get /api/user/getUser
 * Getting all data from the logged user
 */
router.get("/getUser", requireAuth, userController.GetUser);




/**
 * @Route Put /api/user/updateAccount
 * Validating the request body and passing the request to the controller
 */
router.put( "/updateAccount", requireAuth, Upload.single("photo"), userController.UpdateAccount );

/**
 * @Route Patch /api/user/updateAuthentication
 * Validating the request body and passing the request to the controller
 */
router.patch(
  "/updateAuthentication",
  requireAuth,
  updateAuthenticationValidationRules,
  userController.UpdateAuthentication
);

/**
 * @Route Patch /api/user/changeStatus
 * Validating the request body and passing the request to the controller
 */
router.patch(
  "/changeStatus",
  requireAuth,
  changeStatusValidationRules,
  userController.ChangeStatus
);

/**
 * @Route Patch /api/user/changePassword
 * Validating the request body and passing the request to the controller
 */
router.patch(
  "/changePassword",
  requireAuth,
  changePasswordValidationRules,
  userController.ChangePassword
);

/**
 * @Route Get /api/user/getAddresses
 * Validating the request body and passing the request to the controller
 */
router.get("/getAddresses", requireAuth, userController.GetAddresses);

/**
 * @Route Put /api/user/addAddress
 * Validating the request body and passing the request to the controller
 */
router.put(
  "/addAddress",
  requireAuth,
  addAddressValidationRules,
  userController.AddAddress
);

/**
 * @Route Delete /api/user/removeAddress
 * Validating the request body and passing the request to the controller
 */
router.delete(
  "/removeAddress",
  requireAuth,
  addressIdValidationRules,
  userController.RemoveAddress
);

/**
 * @Route Put /api/user/editAddress
 * Validating the request body and passing the request to the controller
 */
router.put(
  "/editAddress",
  requireAuth,
  editAddressValidationRules,
  userController.EditAddress
);

export default router;