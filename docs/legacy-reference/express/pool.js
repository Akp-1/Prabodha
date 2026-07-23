const { Pool } = require('pg');

// Supabase's pooled connection needs SSL. rejectUnauthorized:false is the
// standard setting for their pooler on the free tier.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

module.exports = pool;
