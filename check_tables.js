const db = require('./config/database');
const path = require('path');

// Connect to the PostgreSQL database and check tables
async function main() {
    try {
        const result = await db.query('SELECT NOW() as current_time');
        console.log('Connected to PostgreSQL database');
        await checkTablesForProjId();
    } catch (err) {
        console.error('Error connecting to database:', err.message);
    }
}

main();

async function checkTablesForProjId() {
    try {
        // Step 1: Get all table names from PostgreSQL
        const tablesResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        const tables = tablesResult.rows.map(row => row.table_name);

        console.log('\n--- Checking tables for "proj_id" column ---');
        const tablesWithProjId = [];

        // Step 2: Iterate through each table and check for 'proj_id' column
        for (const tableName of tables) {
            const columnsResult = await db.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
            `, [tableName]);
            
            const columns = columnsResult.rows;

            // Check if any column in the table is named 'proj_id'
            const hasProjId = columns.some(col => col.column_name === 'proj_id');

            if (hasProjId) {
                tablesWithProjId.push(tableName);
                console.log(`✅ Table '${tableName}' HAS 'proj_id'`);
            } else {
                console.log(`❌ Table '${tableName}' does NOT have 'proj_id'`);
            }
        }

        console.log('\n--- Summary ---');
        if (tablesWithProjId.length > 0) {
            console.log('Tables with "proj_id" column:');
            tablesWithProjId.forEach(table => console.log(`- ${table}`));
        } else {
            console.log('No tables found with a "proj_id" column.');
        }

    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        console.log('Database check completed.');
    }
}