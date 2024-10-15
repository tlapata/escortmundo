import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import TokenGenerator from '../utils/tokenGenerator.js';
// Connect to the database
import pool from '../db/db.js';


// Function to hash password
const saltRounds = 10;
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Getting env variables
dotenv.config();
const MY_SECRET_KEY = process.env.MY_SECRET_KEY;

//Register User Controller
export const register = async (req, res) => {

    const { email, password } = req.body;

    // checking email 
    const isEmailExist = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

    if (isEmailExist.rows.length > 0) {
        return res.status(409).json({ error: 'Email already exists.' });
    }

    // hashing the password
    let passwordHashed = await hashPassword(password);
  
    try {
        //const confirmationToken = TokenGenerator(32);

        const newUser = await pool.query(
            "INSERT INTO users (email, password, created_at, activated) VALUES($1, $2, CURRENT_TIMESTAMP, true) RETURNING *",
            [email, passwordHashed]
        );
        
        const token = jwt.sign({ userId: newUser.rows[0].id }, MY_SECRET_KEY, { expiresIn: '24h' });

        res.setHeader('Authorization', `Bearer ${token}`);
        
        // Set HttpOnly and Secure cookie
        res.cookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict', 
          path: '/'
        });

        res.status(200).json({
            message: 'You have registered successfully.',
            token: token,
        })
    } catch (error) {
        res.status(422).json({ error: error.message })
    }
}

//Login user Controller
export const login = async (req, res) => {

  const { email, password } = req.body;
  
  // validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() })
  }

  const user = await pool.query("SELECT password, id FROM users WHERE email = $1 AND activated = true", [email]);

  if (!user.rows[0]) {
    return res.status(404).send({ error: 'Email Not Found' })
  }

  let userPassword = user.rows[0].password;

  bcrypt.compare(password, userPassword, (err, result) => {

      if (err) {
        res.status(500).send({ error: err });
        return;
      }
      
      if (result) {
        const token = jwt.sign({ userId: user.rows[0].id }, MY_SECRET_KEY, { expiresIn: '24h' });

        res.setHeader('Authorization', `Bearer ${token}`);
        
        // Set HttpOnly and Secure cookie
        res.cookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict', 
          path: '/'
        });

        res.status(200).json({
          message: 'Logged in successfully.',
          token: token,
          userId: user.id
        });

      } else {
        res.status(401).send({ error: 'Invalid password or email.' });
      }
  });

}





// Forgot Password Controller = 
export const ForgotPassword = async (req, res) => {
  
  const { email } = req.params;
  const token = TokenGenerator(8);
  const user = await collection.findOneAndUpdate(
    { email },
    { token: token },
    { new: true }
  )

  if (!user) {
    return res.status(404).send({ error: 'Email Not Found' })
  }

  sendEmail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Hello ✔',
    text: 'Hello there?',
    html: '<b>Hello world?</b>'
  })

  res.status(200).json({
    message: 'A mail has been sent to email'
  })
}

// Reset Password Controller =
export const ResetPassword = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() })
  }

  const { token, password } = req.body
  const user = await collection.findOne({ token })

  if (!user) {
    return res.status(404).send({ error: 'Token Not Found' })
  }

  user
    .comparePassword(password)
    .then(result => {
      if (result) {
        res.status(400).json({
          message: 'Use password other than recent'
        })
      }
    })
    .catch(err => {
      res.status(500).send({ error: err })
    })

  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      res.status(500).send({ error: err })
    }

    bcrypt.hash(password, salt, async (err, hash) => {
      if (err) {
        res.status(500).send({ error: err })
      }

      const updatedUser = await collection.findOneAndUpdate(
        { token },
        { password: hash },
        { new: true }
      )

      if (!updatedUser) {
        return res.status(404).send({ error: 'Token Not Found' })
      }

      res.status(200).json({
        message: 'Password has been reset.'
      })
    })
  })
}