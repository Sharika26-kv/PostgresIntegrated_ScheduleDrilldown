const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'Nirman',
    user: 'postgres',
    password: '143026',
    ssl: false,
    // Add SCRAM-SHA-256 authentication
    client_encoding: 'utf8',
    application_name: 'nirman-app',
});

// Database connection functions
const database = {
    // Query function with connection pooling
    query: async (text, params) => {
        const client = await pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        } finally {
            client.release();
        }
    },

    // Get a client from the pool (for transactions)
    getClient: async () => {
        return await pool.connect();
    },

    // Close the pool (for graceful shutdown)
    close: async () => {
        await pool.end();
    },

    // Health check
    healthCheck: async () => {
        try {
            const result = await database.query('SELECT 1 as status, NOW() as timestamp');
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database health check failed: ${error.message}`);
        }
    },

    // Get database info (useful for debugging)
    getInfo: async () => {
        try {
            const result = await database.query('SELECT version() as version');
            return {
                version: result.rows[0].version,
                host: 'localhost',
                database: 'Nirman',
                user: 'postgres'
            };
        } catch (error) {
            throw new Error(`Failed to get database info: ${error.message}`);
        }
    }
};

// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error acquiring client', err.stack);
        return;
    }
    console.log('✅ PostgreSQL connected successfully');
    console.log(`🎯 Connected to database: Nirman on localhost:5432`);
    release();
});

module.exports = database; 