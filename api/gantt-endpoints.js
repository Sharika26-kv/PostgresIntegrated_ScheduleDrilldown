const db = require('../config/database');
const path = require('path');

// Initialize database connection
async function initDatabase() {
    try {
        const result = await db.query('SELECT NOW() as current_time');
        console.log('✅ Connected to P6 PostgreSQL database for Gantt chart');
        console.log('📁 Database: PostgreSQL');
        return true;
    } catch (err) {
        console.error('❌ Error connecting to PostgreSQL database:', err.message);
        throw err;
    }
}

// Get all projects
async function getProjects(req, res) {
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
        console.log(`✅ Found ${rows.length} projects`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error fetching projects:', err);
        res.status(500).json({ error: err.message });
    }
}

// Get project tasks with WBS information
async function getProjectTasks(req, res) {
    const { projectId } = req.params;
    console.log(`📊 Fetching tasks for project: ${projectId}`);
    
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
    WHERE proj_id = $1
      AND proj_node_flag = 'Y'

    UNION ALL

    -- Recursive case: children of WBS
    SELECT
	    w.proj_id,
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
    WHERE w.proj_id = $2
)
SELECT 
   
	    -- WBS information
    w.seq_num,
    w.wbs_name,
    w.wbs_short_name,
    w.parent_wbs_id,
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
    t.status_code
    

    
FROM wbs_hierarchy w
LEFT JOIN task t 
    ON t.wbs_id = w.wbs_id AND t.proj_id = w.proj_id 
--WHERE t.proj_id = 389
ORDER BY w.seq_num, t.task_code
    `;
    
    try {
        const result = await db.query(query, [projectId, projectId]);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} records`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error executing query:', err);
        res.status(500).json({ error: err.message });
    }
}

// Get project WBS hierarchy
async function getProjectWBS(req, res) {
    const { projectId } = req.params;
    console.log(`🌳 Fetching WBS for project: ${projectId}`);
    
    const query = `
        WITH RECURSIVE wbs_hierarchy (
            wbs_id,
            wbs_name,
            parent_wbs_id,
            path,
            seq_num,
            wbs_short_name
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

        SELECT w.*, p.proj_id, p.obs_id FROM wbs_hierarchy w
        JOIN projwbs p on p.wbs_id = w.wbs_id
        order by seq_num
    `;
    
    try {
        const result = await db.query(query, [projectId, projectId]);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} records`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error executing query:', err);
        res.status(500).json({ error: err.message });
    }
}

// Get project dependencies
async function getProjectDependencies(req, res) {
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
}

// Get project resource assignments
async function getProjectResources(req, res) {
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
}

// Get AWP hierarchy for a project
async function getAWPHierarchy(req, res) {
    const projectId = req.params.projectId || req.query.projectId || req.query.project_id;
    console.log(`🏗️ Fetching AWP hierarchy for project: ${projectId}`);
    
    // Use the existing awp_hierarchy view with field name mapping for frontend compatibility
    const query = `
        SELECT 
            actv_code_id,
            proj_id,
            activity_code AS Activity_code,        -- Map to expected field name
            activity_name AS Activity_name,        -- Map to expected field name  
            parent_actv_code_id,
            actv_code_type,
            seq_num,
            CASE 
                WHEN color IS NOT NULL AND color != '' THEN '#' || color 
                ELSE NULL 
            END AS color,                          -- Add # prefix to color
            sequence,
            level,
            indented_name
        FROM awp_hierarchy 
        WHERE actv_code_type LIKE '%AWP%'
         AND proj_id = $1
          OR proj_id IS NULL
        ORDER BY sequence
    `;
    
    const params = projectId ? [projectId] : [];
    
    try {
        const result = await db.query(query, params);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} AWP hierarchy items for project ${projectId || 'all'}`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error fetching AWP hierarchy:', err);
        res.status(500).json({ error: err.message });
    }
}

// Get AWP hierarchy with associated future tasks
async function getAWPHierarchyWithTasks(req, res) {
    const projectId = req.query.projectId;
    console.log(`🏗️ Fetching AWP hierarchy with future tasks for project: ${projectId}`);
    
    if (!projectId) {
        res.status(400).json({ error: 'projectId is required' });
        return;
    }
    
    // Use the existing awp_hierarchy view with field name mapping
    const query = `
        SELECT 
            actv_code_id,
            proj_id,
            activity_code AS Activity_code,        -- Map to expected field name
            activity_name AS Activity_name,        -- Map to expected field name  
            parent_actv_code_id,
            actv_code_type,
            seq_num,
            CASE 
                WHEN color IS NOT NULL AND color != '' THEN '#' || color 
                ELSE NULL 
            END AS color,                          -- Add # prefix to color
            sequence,
            level,
            indented_name
        FROM awp_hierarchy 
        WHERE actv_code_type LIKE '%AWP%'
          AND proj_id = $1
          AND proj_id IS NOT NULL
        ORDER BY sequence
    `;
    
    try {
        const result = await db.query(query, [projectId]);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} AWP hierarchy items with future tasks for project ${projectId}`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error fetching AWP hierarchy with tasks:', err);
        console.error('❌ SQL Query:', query);
        res.status(500).json({ error: err.message });
    }
}

// Get tasks with AWP associations for a project
async function getTasksWithAWP(req, res) {
    const projectId = req.params.projectId || req.query.projectId;
    console.log(`🔗 Fetching tasks with AWP associations for project: ${projectId}`);
    
    if (!projectId) {
        res.status(400).json({ error: 'projectId is required' });
        return;
    }
    
    // Simple query to get tasks linked to AWP codes
    const query = `
        SELECT
            -- Task details
            t.task_id,
            t.task_name,
            t.target_start_date,
            t.target_end_date,
            t.act_start_date,
            t.act_end_date,
            t.status_code,
            t.target_drtn_hr_cnt,
            t.phys_complete_pct,
            t.task_code,
            t.driving_path_flag,
            t.task_type,
            
            -- AWP information
            ac.short_name AS awp_code,
            ac.actv_code_name AS awp_name,
            ac.actv_code_id,
            ac.parent_actv_code_id,
            ac.color,
            at.actv_code_type

        FROM task t
        INNER JOIN taskactv ta ON t.task_id = ta.task_id AND t.proj_id = ta.proj_id
        INNER JOIN actvcode ac ON ta.actv_code_id = ac.actv_code_id
        LEFT JOIN actvtype at ON ac.actv_code_type_id = at.actv_code_type_id
        WHERE t.proj_id = $1
            AND at.actv_code_type LIKE '%AWP%'
        ORDER BY ac.short_name, t.task_code
    `;
    
    try {
        const result = await db.query(query, [projectId]);
        const rows = result.rows;
        console.log(`✅ Found ${rows.length} tasks with AWP associations for project ${projectId}`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error fetching tasks with AWP:', err.message);
        console.error('❌ SQL Query:', query);
        res.status(500).json({ error: `Database error: ${err.message}` });
    }
}

// Health check endpoint
async function healthCheck(req, res) {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected'
    });
}

module.exports = {
    initDatabase,
    getProjects,
    getProjectTasks,
    getProjectWBS,
    getProjectDependencies,
    getProjectResources,
    getAWPHierarchy,
    getAWPHierarchyWithTasks,
    getTasksWithAWP,
    healthCheck
}; 