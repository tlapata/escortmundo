import express from "express";
import { check } from "express-validator";
import * as authController from "../controllers/auth.js";

const router = express.Router();

const loginValidationRules = [
  check("email").exists().withMessage("Must be a email or username"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be atleast six characters"),
];

const registerValidationRules = [
  check("firstName").exists().withMessage("First Name is required"),
  check("recaptcha_response").exists().withMessage("Validate captcha first"),
  check("username").exists().withMessage("User Name is required"),
  check("email").isEmail().withMessage("Must be a email"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be atleast six characters"),
];

const forgotPasswordValidationRules = [
  check("id").exists().withMessage("User Id is required"),
];

const confirmEmailValidationRules = [
  check("token").exists().withMessage("Token is required"),
];

const resetPasswordValidationRules = [
  check("token").exists().withMessage("Token is required"),
  check("password")
    .exists()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be atleast eight characters"),
];

/**
 * @Route Post /api/auth/login
 * Validating the request body and passing the request to the controller
 */
router.post("/login", loginValidationRules, authController.login);

/**
 * @Route Post /api/auth/register
 * Validating the request body and passing the request to the controller
 */
router.post("/register", registerValidationRules, authController.register);




/**
 * @Route Post /api/auth/forgotPassword
 * Validating the request body and passing the request to the controller
 */
router.post(
  "/forgotPassword/:email",
  forgotPasswordValidationRules,
  authController.ForgotPassword
);

/**
 * @Route Post /api/auth/resetPassword
 * Validating the request body and passing the request to the controller
 */
router.patch(
  "/resetPassword",
  resetPasswordValidationRules,
  authController.ResetPassword
);

export default router;