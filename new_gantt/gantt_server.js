const db = require('../config/database');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize database connection
async function initDatabase() {
    try {
        const result = await db.query('SELECT NOW() as current_time');
        console.log('✅ Connected to P6 PostgreSQL database');
        console.log('📁 Database: PostgreSQL');
        return true;
    } catch (err) {
        console.error('❌ Error connecting to PostgreSQL database:', err.message);
        throw err;
    }
}

// API Routes

// Get all projects
app.get('/api/projects', async (req, res) => {
    console.log('📋 Fetching projects...');
    
    const query = `
        SELECT 
            proj_id,
            proj_short_name,
            proj_short_name as proj_name,
            plan_start_date,
            plan_end_date,
            last_recalc_date as data_date
        FROM project 
        ORDER BY proj_short_name
    `;
    
    try {
        const result = await db.query(query, []);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} records`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error executing query:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get project tasks with WBS information
app.get('/api/projects/:projectId/tasks', async (req, res) => {
    const { projectId } = req.params;
    console.log(`📊 Fetching tasks for project: ${projectId}`);
    
    const query = `
       WITH RECURSIVE wbs_hierarchy (

	wbs_id,
    wbs_name,
    parent_wbs_id,
    path,
    seq_num,
    wbs_short_name   --replaced level as name with wbs_short_name no logic change
) AS (

    -- Base case: root WBS items
    SELECT 
		
        wbs_id,
        wbs_name,
        parent_wbs_id,
        CAST(wbs_id AS TEXT) AS path,
        '1' AS seq_num,
        1 AS wbs_short_name
    FROM projwbs p
    WHERE proj_id = $1
      AND proj_node_flag = 'Y'

    UNION ALL

    -- Recursive case: children of WBS
    SELECT
	
        w.wbs_id,
        w.wbs_name,
        w.parent_wbs_id,
        h.path || ' > ' || w.wbs_id AS path,
        h.seq_num || '.' || LPAD(CAST((
            SELECT COUNT(*) + 1
            FROM projwbs w2
            WHERE w2.parent_wbs_id = w.parent_wbs_id
              
              AND w2.wbs_short_name < w.wbs_short_name
        ) AS VARCHAR), 2, '0') AS seq_num,
        h.wbs_short_name + 1
    FROM projwbs w
    JOIN wbs_hierarchy h ON w.parent_wbs_id = h.wbs_id
    WHERE proj_id = $2
)
,PROJWBS1 as (
SELECT w.*, p.proj_id FROM wbs_hierarchy w
JOIN projwbs p on w.wbs_id = p.wbs_id)
 SELECT     w.seq_num,
            t.task_id,
            t.proj_id,
            t.task_code,
            t.task_name,
            t.wbs_id,
            
            -- Scheduling dates
            t.act_start_date,
            t.act_end_date,
            t.act_work_qty,
            t.remain_work_qty,
            t.phys_complete_pct,
            
            -- CPM dates and floats
            t.early_start_date,
            t.early_end_date,
            t.late_start_date,
            t.late_end_date,
            t.total_float_hr_cnt,
            t.free_float_hr_cnt,
            
            -- Baseline dates
            t.target_start_date,
            t.target_end_date,
            t.target_work_qty,
            t.target_drtn_hr_cnt,
            
            -- Task properties
            t.task_type,
            t.driving_path_flag,
            t.cstr_type,
            t.cstr_date,
            t.status_code,
            
            -- WBS information
            w.wbs_name,
            w.wbs_short_name,
            w.parent_wbs_id
            
            
        FROM task t 
        LEFT JOIN projwbs1 w 
		ON t.wbs_id = w.wbs_id AND t.proj_id = w.proj_id
        WHERE t.proj_id = $3 
        ORDER BY w.seq_num, t.task_code
    `;
    
    try {
        const result = await db.query(query, [projectId]);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} records`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error executing query:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get project WBS hierarchy
app.get('/api/projects/:projectId/wbs', async (req, res) => {
    const { projectId } = req.params;
    console.log(`🌳 Fetching WBS for project: ${projectId}`);
    
    const query = `
        WITH RECURSIVE wbs_hierarchy (
    wbs_id,
    wbs_name,
    parent_wbs_id,
    path,
    seq_num,
    wbs_short_name   --replaced level as name with wbs_short_name no logic change
) AS (

    -- Base case: root WBS items
    SELECT 
        wbs_id,
        wbs_name,
        parent_wbs_id,
        CAST(wbs_id AS TEXT) AS path,
        '1' AS seq_num,
        1 AS wbs_short_name
    FROM projwbs p
    WHERE proj_id =$1
      AND proj_node_flag = 'Y'

    UNION ALL

    -- Recursive case: children of WBS
    SELECT 
        w.wbs_id,
        w.wbs_name,
        w.parent_wbs_id,
        h.path || ' > ' || w.wbs_id AS path,
        h.seq_num || '.' || LPAD(CAST((
            SELECT COUNT(*) + 1
            FROM projwbs w2
            WHERE w2.parent_wbs_id = w.parent_wbs_id
              
              AND w2.wbs_short_name < w.wbs_short_name
        ) AS VARCHAR), 2, '0') AS seq_num,
        h.wbs_short_name + 1
    FROM projwbs w
    JOIN wbs_hierarchy h ON w.parent_wbs_id = h.wbs_id
    WHERE proj_id = $2
)

SELECT w.*, p.proj_id , p.obs_id FROM wbs_hierarchy w
JOIN projwbs p on p.wbs_id = w.wbs_id
order by seq_num;






    `;
    
    try {
        const result = await db.query(query, [projectId]);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} records`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error executing query:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get project dependencies
app.get('/api/projects/:projectId/dependencies', async (req, res) => {
    const { projectId } = req.params;
    console.log(`🔗 Fetching dependencies for project: ${projectId}`);
    
    const query = `
        SELECT 
            tp.task_pred_id,
            tp.task_id,
            tp.pred_task_id,
            tp.pred_type,
            tp.lag_hr_cnt,
            t1.task_code as successor_act_id,
            t2.task_code as predecessor_act_id
        FROM taskpred tp
        JOIN task t1 ON tp.task_id = t1.task_id
        JOIN task t2 ON tp.pred_task_id = t2.task_id
        WHERE tp.proj_id = $1
    `;
    
    try {
        const result = await db.query(query, [projectId]);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} records`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error executing query:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get project resource assignments
app.get('/api/projects/:projectId/resources', async (req, res) => {
    const { projectId } = req.params;
    console.log(`👥 Fetching resources for project: ${projectId}`);
    
    const query = `
        SELECT 
            tr.taskrsrc_id,
            tr.task_id,
            tr.rsrc_id,
            tr.target_qty,
            tr.remain_qty,
            tr.cost_qty_link_flag,
            t.task_code as act_id,
            t.task_name as act_name,
            r.rsrc_name,
            r.rsrc_type
        FROM taskrsrc tr
        JOIN rsrc r ON tr.rsrc_id = r.rsrc_id
        JOIN task t ON tr.task_id = t.task_id
        WHERE tr.proj_id = $1
        ORDER BY t.task_code
    `;
    
    try {
        const result = await db.query(query, [projectId]);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} records`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error executing query:', err);
        res.status(500).json({ error: err.message });
    }
});

// Database verification endpoint
app.get('/api/database/verify', async (req, res) => {
    console.log('🔍 Verifying database structure...');
    
    const queries = [
        { 
            name: 'tables', 
            query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name" 
        },
        { 
            name: 'task_sample', 
            query: "SELECT * FROM task LIMIT 1" 
        },
        { 
            name: 'project_sample', 
            query: "SELECT * FROM project LIMIT 1" 
        }
    ];
    
    const results = {};
    
    try {
        for (const { name, query } of queries) {
            const result = await db.query(query, []);
            results[name] = result.rows;
        }
        console.log('✅ Database verification completed');
        res.json(results);
    } catch (err) {
        console.error('❌ Error during database verification:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get record counts for all tables
app.get('/api/database/counts', async (req, res) => {
    console.log('📊 Getting table record counts...');
    
    const tables = ['project', 'task', 'projwbs', 'taskpred', 'taskrsrc', 'rsrc'];
    const results = {};
    
    try {
        for (const table of tables) {
            const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`, []);
            results[table] = result.rows[0].count;
        }
        console.log('✅ Table counts completed');
        res.json(results);
    } catch (err) {
        console.error('❌ Error getting table counts:', err);
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected'
    });
});

// Serve the main HTML file
app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'procore_gantt_clone.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Initialize and start server
async function startServer() {
    try {
        console.log('🚀 Starting Procore Gantt Clone Server...');
        console.log('=' .repeat(60));
        
        await initDatabase();
        
        app.listen(PORT, () => {
            console.log('');
            console.log('🎉 PROCORE GANTT CHART SERVER READY!');
            console.log('=' .repeat(60));
            console.log(`🌐 Web Interface: http://localhost:${PORT}`);
            console.log(`📡 API Base URL:  http://localhost:${PORT}/api`);
            console.log('');
            console.log('📋 Available API Endpoints:');
            console.log(`   GET /api/projects                    - List all projects`);
            console.log(`   GET /api/projects/:id/tasks          - Get project tasks`);
            console.log(`   GET /api/projects/:id/wbs            - Get project WBS`);
            console.log(`   GET /api/projects/:id/dependencies   - Get task dependencies`);
            console.log(`   GET /api/projects/:id/resources      - Get resource assignments`);
            console.log(`   GET /api/database/verify             - Verify database structure`);
            console.log(`   GET /api/database/counts             - Get table record counts`);
            console.log(`   GET /api/health                      - Health check`);
            console.log('');
            console.log('💡 Usage Instructions:');
            console.log('   1. Open http://localhost:3000 in your browser');
            console.log('   2. Select a project from the dropdown');
            console.log('   3. View your P6 data in Procore-style Gantt chart');
            console.log('   4. Use zoom controls and filters as needed');
            console.log('');
            console.log('🔧 Troubleshooting:');
            console.log('   - Check browser console for detailed logs');
            console.log('   - Ensure database file exists and is readable');
            console.log('   - Use Ctrl+C to stop the server');
            console.log('=' .repeat(60));
        });
    } catch (error) {
        console.error('💥 Failed to start server:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('   1. Check if the database file exists:');
        console.log(`      ${DB_PATH}`);
        console.log('   2. Ensure you have read permissions for the database');
        console.log('   3. Verify the database is not corrupted');
        console.log('   4. Check if port 3000 is available');
        console.log('   5. Try running: npm install');
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('✅ Database connection closed');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

startServer();
