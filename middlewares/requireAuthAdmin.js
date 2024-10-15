import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Connect to the database
import pool from '../db/db.js';

// Getting variables
dotenv.config();
const MY_SECRET_KEY = process.env.MY_SECRET_KEY;


const authenticateAdmin = async (req, res, next) => {
  
  const { authorization } = req.headers;
  
  if (!authorization) {
    return res.status(401).json({ message: "You must be logged in." });
  }

  const token = authorization.replace("Bearer ", "");

  jwt.verify(token, MY_SECRET_KEY, async (err, payload) => {
    if (err) {
      return res.status(401).json({ message: "You must be logged in." });
    }

    req.decoded = payload;

    try {

      const userData = await pool.query(
        `SELECT admin 
          FROM users 
          WHERE id = $1 AND activated = TRUE`,
        [req.decoded?.userId]
      );

      if (userData && userData.rows[0].admin === true) {
        next();
      } else {
        return res.status(401).json({ message: "User is not an Admin." });
      }
    } catch (error) {
      return res.status(500).json({ message: "User not found." });
    }
  });
};

export default authenticateAdmin;