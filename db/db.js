import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
    user: "postgres",
    password: "8ispossible",
    host: "localhost",
    port: 5432,
    database: "sexceska"
});

export default pool;