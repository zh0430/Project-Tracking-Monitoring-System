// Import the Pool class from the 'pg' (PostgreSQL) package
const { Pool } = require("pg");

// Create a new connection pool to manage multiple database connections
const pool = new Pool({
  host: process.env.DB_HOST,       // Database host (e.g., localhost or remote server)
  port: process.env.DB_PORT,       // Database port (default PostgreSQL port is 5432)
  user: process.env.DB_USER,       // Database username
  password: process.env.DB_PASSWORD, // Database password
  database: process.env.DB_NAME,   // Name of the database to connect to
});

// Event listener: runs whenever a new client connects to the database
pool.on("connect", () => {
  console.log("Connected to PostgreSQL"); // Log successful connection
});

// Export the pool so it can be used in other files (e.g., for queries)
module.exports = pool;