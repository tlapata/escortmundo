import dotenv from 'dotenv';
import pkg from 'pg';


dotenv.config();
const db_user = process.env.DB_USER;
const db_password = process.env.DB_PASSWORD;
const db_host = process.env.DB_HOST;
const db_database = process.env.DB_NAME;

const { Pool } = pkg;

const pool = new Pool({
    user: db_user,
    password: db_password,
    host: db_host,
    port: 5432,
    database: db_database
});

export default pool;