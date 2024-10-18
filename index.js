import dotenv from 'dotenv';
import express from "express";
import cors from "cors";
import pool from './db/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/product.js";
import countryRoutes from "./routes/country.js";
import regionRoutes from "./routes/region.js";
import cityRoutes from "./routes/city.js";
import tagRoutes from  "./routes/tag.js";
import userRoutes from  "./routes/user.js";


// Getting variables
dotenv.config();
const PORT = process.env.PORT || 5056;

const app = express();

// Using the middleware
const allowedOrigins = [
  'https://escortmundo.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.escortmundo.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Connecting to routes
app.use('/api/auth', authRoutes);
app.use('/api/product', productRoutes);
app.use('/api/country', countryRoutes);
app.use('/api/region', regionRoutes);
app.use('/api/city', cityRoutes);
app.use('/api/tag', tagRoutes);
app.use('/api/user', userRoutes);


const VEROTEL_SECRET_KEY = 'uE7g3rYwgd6YBEZh3TXZ5zdDPcCwE6';

// Function to generate the signature
const generateSignature = (params) => {

    // Construct the string to be hashed (parameter concatenation)
    const dataString = [
      VEROTEL_SECRET_KEY,
      `description=${params.description}`,
      `priceAmount=${params.priceAmount}`,
      `priceCurrency=${params.priceCurrency}`,
      `shopID=${params.shopID}`,
      `version=${params.version}`,
      `type=${params.type}`
    ].join(':');

    console.log("datastring", dataString);

    // Generate SHA-1 hash from the concatenated string
    return crypto.createHash('sha1').update(dataString, 'utf8').digest('hex');
};

// Endpoint to handle the Verotel webhook (callback)
app.get('/verotel/callback', (req, res) => {
  const transactionData = req.query;

  // Log the transaction data
  console.log('Received callback from Verotel:', transactionData);

// Generate the signature for verification
    const generatedSignature = generateSignature(transactionData);

    console.log('Generated Signature:', generatedSignature);
    console.log('Received Signature:', transactionData.signature);
    if (generatedSignature === transactionData.signature) {console.log('yes');}else{console.log('fck')}

  // Compare the expected signature with the received one
  //if (expectedSignature === transactionData.signature) {
    if (transactionData.type === 'purchase' && transactionData.payment === 'success') {
      // Handle successful payment
      console.log('Payment successful:', transactionData);
      // Perform actions such as updating your database here
      res.status(200).send('OK');
    } else {
      // Handle other types or failed transactions
      console.log('Payment failed or other event:', transactionData);
    }
    // Respond to Verotel to acknowledge the callback
  /*} else {
    console.error('Invalid signature received from Verotel');
    res.status(403).send('Invalid signature'); // Forbidden response for invalid signature
  }*/
});



// Get the directory name from the URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'public' directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// update ad
app.put("/update-ad/:ad_id", async(req, res) => {
  try {
    const {ad_id} = req.params;
    const {description} = req.body;
    const updatedAd = await pool.query(
      "UPDATE ads SET description = $1 WHERE ad_id = $2", 
      [description, ad_id]
    );
    res.json("The ad was updated successfully!");
  } catch (error) {
    console.log(error.message);
  }
});

// Health check
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Starting the Express server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});