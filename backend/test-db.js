const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: "127.0.0.1",
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5435,
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Connection error:", err.message);
  } else {
    console.log("Connection successful:", res.rows[0]);
  }
  pool.end();
});
