import dotenv from 'dotenv';
import express from "express";
import cors from "cors";
import pool from './db/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
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
  'http://localhost:3003'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.escortmundo.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
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



// Get the directory name from the URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'public' directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// get all ads
app.get("/ads", async(req, res) => {
  try {
    const allAds = await pool.query("SELECT * FROM ads");
    res.json(allAds.rows);
  } catch (error) {
    console.error(error.message);
  }
});

// get ad by id
app.get("/ad/:ad_id", async(req, res) => {
  try {
    console.log(req.params);
    const {ad_id} = req.params;
    const ad = await pool.query("SELECT * FROM ads WHERE ad_id = $1", [ad_id]);
    res.json(ad.rows[0]);
  } catch (error) {
    console.error(error.message);
  }
});

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

// delete ad
app.delete("/delete-ad/:ad_id", async(req, res) => {
  try {
    const {ad_id} = req.params;
    const deletedAd = await pool.query("DELETE FROM ads WHERE ad_id = $1", [ad_id]);
    res.json("The ad was deleted.");
  } catch (error) {
    console.log(error.message);
  }
});

// Health check
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

//app.use("/record", records);
//import routes from "./routes/api/user.js";
//app.use("/api/users", routes);

// Connect Database
//connectDB();

//app.get('/', (req, res) => res.send('Sex-ceska back-end is running'));
// This section will help you get a list of all the records.
/*
app.get("/", async (req, res) => {
  let collection = await db.collection("comments");
  let results = await collection.find({}).toArray();
  res.send(results).status(200);
});
*/

// Starting the Express server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});