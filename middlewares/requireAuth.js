import jwt from "jsonwebtoken";
import dotenv from 'dotenv';


// Getting variables
dotenv.config();
const MY_SECRET_KEY = process.env.MY_SECRET_KEY;


// Checking authorization
const authMiddleware = (req, res, next) => {

  const { authorization } = req.headers;

  if ( !authorization ) {
    return res.status(401).json({ message: "You must be logged in." });
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, MY_SECRET_KEY, async (err, payload) => {
    if (err) {
      return res.status(401).json({ message: "You must be logged in." });
    }

    req.decoded = payload;

    next();
  });
};

export default authMiddleware;