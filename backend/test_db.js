const { Client } = require('pg');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    await client.connect();
    console.log("Connected to DB successfully!");
    
    // Check tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("Tables in database:");
    res.rows.forEach(row => {
      console.log("- " + row.table_name);
    });
    
  } catch (err) {
    console.error("Database connection/query error:", err);
  } finally {
    await client.end();
  }
}

check();
