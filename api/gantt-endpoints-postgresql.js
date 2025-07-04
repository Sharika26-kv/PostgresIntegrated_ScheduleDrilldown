const db = require('../config/database');

// Get all projects
async function getProjects(req, res) {
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

// Get project tasks with WBS information (using PostgreSQL view)
async function getProjectTasks(req, res) {
    const { projectId } = req.params;
    console.log(`📊 Fetching tasks for project: ${projectId}`);
    
    try {
        // Use the pre-created wbs_structure view instead of complex recursive query
        const query = `
            SELECT 
                -- WBS information
                wbs_level as seq_num,
                wbs_path,
                task_wbs_id as wbs_id,
                
                -- Task information  
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

// Get project WBS hierarchy (simplified with PostgreSQL)
async function getProjectWBS(req, res) {
    const { projectId } = req.params;
    console.log(`🌳 Fetching WBS for project: ${projectId}`);
    
    try {
        const query = `
            SELECT 
                wbs_id,
                wbs_name,
                parent_wbs_id,
                wbs_path as path,
                wbs_level,
                REPEAT('  ', wbs_level) || wbs_name as indented_name
            FROM wbs_structure
            GROUP BY wbs_id, wbs_name, parent_wbs_id, wbs_path, wbs_level
            ORDER BY wbs_path
        `;
        
        const result = await db.query(query);
        console.log(`✅ Found ${result.rows.length} WBS items for project ${projectId}`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching WBS:', error);
        res.status(500).json({ error: 'Database error while fetching WBS' });
    }
}

// Get project dependencies (task predecessors)
async function getProjectDependencies(req, res) {
    const { projectId } = req.params;
    console.log(`🔗 Fetching dependencies for project: ${projectId}`);
    
    try {
        const query = `
            SELECT 
                tp.task_pred_id,
                tp.task_id AS successor_id,
                tp.pred_task_id AS predecessor_id,
                tp.pred_type,
                tp.lag_hr_cnt,
                t1.task_code AS successor_code,
                t1.task_name AS successor_name,
                t2.task_code AS predecessor_code,
                t2.task_name AS predecessor_name
            FROM taskpred tp
            LEFT JOIN task t1 ON tp.task_id = t1.task_id AND tp.proj_id = t1.proj_id
            LEFT JOIN task t2 ON tp.pred_task_id = t2.task_id AND tp.proj_id = t2.proj_id
            WHERE tp.proj_id = $1
            ORDER BY tp.task_id, tp.pred_task_id
        `;
        
        const result = await db.query(query, [projectId]);
        console.log(`✅ Found ${result.rows.length} dependencies for project ${projectId}`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching dependencies:', error);
        res.status(500).json({ error: 'Database error while fetching dependencies' });
    }
}

// Get project resources
async function getProjectResources(req, res) {
    const { projectId } = req.params;
    console.log(`👥 Fetching resources for project: ${projectId}`);
    
    try {
        const query = `
            SELECT 
                r.rsrc_id,
                r.rsrc_name,
                r.rsrc_short_name,
                tr.task_id,
                tr.target_qty,
                tr.act_reg_qty,
                tr.remain_qty
            FROM rsrc r
            LEFT JOIN taskrsrc tr ON r.rsrc_id = tr.rsrc_id
            LEFT JOIN task t ON tr.task_id = t.task_id
            WHERE t.proj_id = $1
            ORDER BY r.rsrc_name, tr.task_id
        `;
        
        const result = await db.query(query, [projectId]);
        console.log(`✅ Found ${result.rows.length} resource assignments for project ${projectId}`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching resources:', error);
        res.status(500).json({ error: 'Database error while fetching resources' });
    }
}

// Get AWP hierarchy (using pre-created view)
async function getAWPHierarchy(req, res) {
    const { projectId } = req.params;
    console.log(`🏗️ Fetching AWP hierarchy for project: ${projectId}`);
    
    try {
        // Use the pre-created AWP hierarchy view
        const query = `
            SELECT 
                actv_code_id,
                actv_code_type_id,
                actv_code_name,
                short_name,
                parent_actv_code_id,
                level,
                hierarchy_path
            FROM activity_hierarchy h
            LEFT JOIN actvtype at ON h.actv_code_type_id = at.actv_code_type_id
            WHERE at.actv_code_type LIKE '%AWP%'
            ORDER BY hierarchy_path
        `;
        
        const result = await db.query(query);
        console.log(`✅ Found ${result.rows.length} AWP hierarchy items`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching AWP hierarchy:', error);
        res.status(500).json({ error: 'Database error while fetching AWP hierarchy' });
    }
}

// Get AWP hierarchy with tasks (using view)
async function getAWPHierarchyWithTasks(req, res) {
    const { projectId } = req.params;
    console.log(`🏗️📊 Fetching AWP hierarchy with tasks for project: ${projectId}`);
    
    try {
        const query = `
            SELECT * FROM awp_tasks WHERE proj_id = $1
            ORDER BY task_code
        `;
        
        const result = await db.query(query, [projectId]);
        console.log(`✅ Found ${result.rows.length} AWP tasks for project ${projectId}`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching AWP hierarchy with tasks:', error);
        res.status(500).json({ error: 'Database error while fetching AWP tasks' });
    }
}

// Get tasks with AWP information
async function getTasksWithAWP(req, res) {
    const { projectId } = req.params;
    console.log(`📋🏗️ Fetching tasks with AWP for project: ${projectId}`);
    
    try {
        const query = `
            SELECT 
                t.*,
                ta.actv_code_id,
                ac.short_name as awp_code,
                ac.actv_code_name as awp_name,
                at.actv_code_type
            FROM task t
            LEFT JOIN taskactv ta ON t.task_id = ta.task_id AND t.proj_id = ta.proj_id
            LEFT JOIN actvcode ac ON ta.actv_code_id = ac.actv_code_id
            LEFT JOIN actvtype at ON ac.actv_code_type_id = at.actv_code_type_id
            WHERE t.proj_id = $1
            AND at.actv_code_type LIKE '%AWP%'
            ORDER BY t.task_code
        `;
        
        const result = await db.query(query, [projectId]);
        console.log(`✅ Found ${result.rows.length} tasks with AWP for project ${projectId}`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching tasks with AWP:', error);
        res.status(500).json({ error: 'Database error while fetching tasks with AWP' });
    }
}

// Health check
async function healthCheck(req, res) {
    console.log('🏥 Performing health check...');
    
    try {
        const result = await db.healthCheck();
        console.log('✅ Health check passed');
        res.json({ 
            status: 'ok', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({ 
            status: 'error', 
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Export all functions
module.exports = {
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