// ========================================================================
// EXAMPLE: SQLite to PostgreSQL Migration
// ========================================================================

// BEFORE (SQLite Implementation)
// ========================================================================
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = 'C:/Users/shrey/Documents/BIM_XER_Masher/database/primavera_p6.db';

// SQLite connection
let db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// SQLite query example
function getProjects_BEFORE(req, res) {
    const query = `
        SELECT 
            proj_id,
            proj_short_name,
            proj_short_name as proj_name,
            plan_start_date,
            plan_end_date,
            last_recalc_date as data_date
        FROM PROJECT 
        ORDER BY proj_short_name
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching projects:', err);
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✅ Found ${rows.length} projects`);
            res.json(rows);
        }
    });
}

// Complex recursive query in SQLite
function getProjectTasks_BEFORE(req, res) {
    const { projectId } = req.params;
    
    const query = `
        WITH RECURSIVE wbs_hierarchy (
            proj_id,
            wbs_id,
            wbs_name,
            parent_wbs_id,
            path,
            seq_num,
            wbs_short_name
        ) AS (
            -- Base case: root WBS items
            SELECT 
                proj_id,
                wbs_id,
                wbs_name,
                parent_wbs_id,
                CAST(wbs_id AS TEXT) AS path,
                '1' AS seq_num,
                1 AS wbs_short_name
            FROM projwbs p
            WHERE proj_id = ?
              AND proj_node_flag = 'Y'

            UNION ALL

            -- Recursive case: children of WBS
            SELECT
                w.proj_id,
                w.wbs_id,
                w.wbs_name,
                w.parent_wbs_id,
                h.path || ' > ' || w.wbs_id AS path,
                h.seq_num || '.' || printf('%02d', (
                    SELECT COUNT(*) + 1
                    FROM projwbs w2
                    WHERE w2.parent_wbs_id = w.parent_wbs_id
                      AND w2.wbs_short_name < w.wbs_short_name
                )) AS seq_num,
                h.wbs_short_name + 1
            FROM projwbs w
            JOIN wbs_hierarchy h ON w.parent_wbs_id = h.wbs_id
            WHERE w.proj_id = ?
        )
        SELECT 
            -- WBS information
            w.seq_num,
            w.wbs_name,
            w.wbs_short_name,
            w.parent_wbs_id,
            t.task_id,
            -- ... many more columns
        FROM wbs_hierarchy w
        LEFT JOIN TASK t ON t.wbs_id = w.wbs_id AND t.proj_id = w.proj_id 
        ORDER BY w.seq_num, t.task_code
    `;
    
    db.all(query, [projectId, projectId], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching tasks:', err);
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
}

// ========================================================================
// AFTER (PostgreSQL Implementation)
// ========================================================================

const db = require('./config/database'); // PostgreSQL connection pool

// PostgreSQL query example - much simpler!
async function getProjects_AFTER(req, res) {
    console.log('📋 Fetching projects...');
    
    try {
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
        
        const result = await db.query(query);
        console.log(`✅ Found ${result.rows.length} projects`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching projects:', error);
        res.status(500).json({ error: 'Database error while fetching projects' });
    }
}

// Simple view-based query instead of complex recursive CTE
async function getProjectTasks_AFTER(req, res) {
    const { projectId } = req.params;
    console.log(`📊 Fetching tasks for project: ${projectId}`);
    
    try {
        // Use the pre-created wbs_structure view - much simpler!
        const query = `
            SELECT 
                wbs_level as seq_num,
                wbs_path,
                task_wbs_id as wbs_id,
                task_id,
                task_name,
                task_code,
                start_date,
                end_date,
                status_code,
                driving_path_flag,
                target_drtn_hr_cnt
            FROM wbs_structure 
            WHERE task_id IS NOT NULL
            ORDER BY wbs_path, start_date
        `;
        
        const result = await db.query(query);
        console.log(`✅ Found ${result.rows.length} tasks for project ${projectId}`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching tasks:', error);
        res.status(500).json({ error: 'Database error while fetching tasks' });
    }
}

// ========================================================================
// KEY MIGRATION CHANGES SUMMARY:
// ========================================================================

/*
1. IMPORTS:
   BEFORE: const sqlite3 = require('sqlite3').verbose();
   AFTER:  const db = require('./config/database');

2. CONNECTION:
   BEFORE: Manual SQLite connection with file path
   AFTER:  Automatic PostgreSQL connection pool

3. QUERY EXECUTION:
   BEFORE: db.all(query, params, (err, rows) => { ... })
   AFTER:  const result = await db.query(query, params);

4. PARAMETER BINDING:
   BEFORE: ? placeholders
   AFTER:  $1, $2, $3 placeholders

5. TABLE NAMES:
   BEFORE: PROJECT, TASK, PROJWBS (uppercase)
   AFTER:  project, task, projwbs (lowercase)

6. RECURSIVE QUERIES:
   BEFORE: Complex WITH RECURSIVE CTEs
   AFTER:  Simple SELECT from pre-created views

7. ERROR HANDLING:
   BEFORE: Callback-based error handling
   AFTER:  try-catch with async/await

8. RESPONSE:
   BEFORE: res.json(rows)
   AFTER:  res.json(result.rows)
*/

// ========================================================================
// SEARCH AND REPLACE PATTERNS FOR YOUR CODEBASE:
// ========================================================================

/*
1. Replace imports:
   Find:    const sqlite3 = require('sqlite3').*
   Replace: const db = require('./config/database');

2. Replace table names:
   Find:    FROM PROJECT
   Replace: FROM project
   
   Find:    FROM TASK
   Replace: FROM task
   
   Find:    FROM PROJWBS
   Replace: FROM projwbs

3. Replace parameter binding:
   Find:    \?
   Replace: $1 (then manually number each parameter: $1, $2, $3, etc.)

4. Replace query execution:
   Find:    db\.all\(([^,]+),\s*([^,]+),\s*\(err,\s*rows\)\s*=>\s*\{
   Replace: try { const result = await db.query($1, $2);
   
   Find:    res\.json\(rows\)
   Replace: res.json(result.rows)

5. Replace error handling:
   Find:    if \(err\) \{[\s\S]*?\} else \{
   Replace: } catch (error) { console.error('Database error:', error); res.status(500).json({ error: 'Database error' }); }
*/

console.log('Migration example file created'); 