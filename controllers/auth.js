import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import TokenGenerator from '../utils/tokenGenerator.js';
import { sesEmail } from '../config/sesEmail.js';
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

    const { email, password, subdomain } = req.body;

    // checking email 
    const isEmailExist = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

    if (isEmailExist.rows.length > 0) {
        return res.status(409).json({ error: 'Email already exists.' });
    }

    // hashing the password
    let passwordHashed = await hashPassword(password);
  
    try {
        const confirmationToken = TokenGenerator(32);

        const newUser = await pool.query(
            "INSERT INTO users (email, password, created_at, token) VALUES($1, $2, CURRENT_TIMESTAMP, $3) RETURNING *",
            [email, passwordHashed, confirmationToken]
        );

        // Sending confirmation email
        sesEmail("tanusharamonka@gmail.com", email, confirmationToken, subdomain);
        
        const token = jwt.sign({ userId: newUser.id }, MY_SECRET_KEY);

        return res.status(201).json({
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

// Confirm email
export const confirmEmail = async (req, res) => {

  if ( req.method === 'POST') {
    const { token } = req.body;

    // validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: errors.array() })
    }

    try {

      const user = await pool.query("SELECT id FROM users WHERE token = $1", [token]);

      if (!user) {
        return res.status(404).send({ error: 'Token Not Found' })
      }

      // Update the user's email confirmation status
      const userID = user.rows[0].id;
      const result = await pool.query(
        "UPDATE users SET activated = true, token = NULL WHERE id = $1", 
        [userID]
      );
      
      // Check if rows were affected
      if (result.rowCount > 0) {

        const token = jwt.sign({ userId: userID }, MY_SECRET_KEY, { expiresIn: '1h' });
        console.log(token);

        res.setHeader('Authorization', `Bearer ${token}`);
        
        // Set HttpOnly and Secure cookie
        res.cookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict', 
          path: '/'
        });


        res.status(200).json({
          message: 'Email confirmed successfully.',
          token: token,
          userId: user.id
        });

      } else {
        console.log('No rows were updated.');
      }

    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }   

  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
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