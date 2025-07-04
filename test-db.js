const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'nirman',
    user: 'postgres',
    password: '143026'
});

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL!');
        
        // Try to query the activity_relationship_view
        const result = await client.query('SELECT COUNT(*) FROM public.activity_relationship_view');
        console.log('Number of rows in activity_relationship_view:', result.rows[0].count);
        
        // Get some sample data
        const sampleData = await client.query(`
            SELECT project_id, activity_id, activity_name, relationship_type, lag
            FROM public.activity_relationship_view
            LIMIT 5
        `);
        console.log('\nSample data from activity_relationship_view:');
        console.table(sampleData.rows);
        
        client.release();
    } catch (err) {
        console.error('Error connecting to PostgreSQL:', err.message);
        console.error('Error details:', err);
    } finally {
        await pool.end();
    }
}

testConnection(); 