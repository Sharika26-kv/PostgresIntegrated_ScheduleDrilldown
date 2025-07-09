const db = require('../config/database');

// Get resources KPI data
async function getResourcesKPI(req, res) {
    const projectId = req.query.project_id;
    console.log(`📊 Fetching resources KPI data for project: ${projectId}`);
    
    let query = `
        WITH resource_stats AS (
            SELECT 
                -- Count distinct resources assigned to tasks
                COUNT(DISTINCT tr.rsrc_id)::integer as ResourceLoad_Count,
                -- Count remaining activities (not complete)
                COUNT(DISTINCT CASE 
                    WHEN t.status_code != 'TK_Complete' 
                    THEN t.task_id 
                    END)::integer as Remaining_Activities
            FROM task t
            LEFT JOIN taskrsrc tr ON tr.task_id = t.task_id
            WHERE 1=1
            ${projectId ? 'AND t.proj_id = $1' : ''}
        )
        SELECT 
            ResourceLoad_Count,
            Remaining_Activities,
            CASE 
                WHEN Remaining_Activities > 0 
                THEN TRUNC((ResourceLoad_Count::numeric / Remaining_Activities::numeric) * 100, 2)
                ELSE 0 
            END as Resource_Load_Percentage
        FROM resource_stats
    `;
    
    try {
        const result = await db.query(query, projectId ? [projectId] : []);
        res.json(result.rows[0] || {
            ResourceLoad_Count: 0,
            Remaining_Activities: 0,
            Resource_Load_Percentage: 0
        });
    } catch (err) {
        console.error('❌ Error fetching resources KPI:', err);
        res.status(500).json({ error: err.message });
    }
}

// Get resources chart data
async function getResourcesChartData(req, res) {
    const projectId = req.query.project_id;
    console.log(`📈 Fetching resources chart data for project: ${projectId}`);
    
    const query = `
        SELECT 
            r.rsrc_name as resource,
            t.status_code as status,
            COUNT(DISTINCT tr.task_id)::integer as activity_count,
            TRUNC(AVG(COALESCE(t.total_float_hr_cnt::numeric, 0) / 8.0), 2) as float_days
        FROM task t
        JOIN taskrsrc tr ON tr.task_id = t.task_id
        JOIN rsrc r ON tr.rsrc_id = r.rsrc_id
        WHERE t.status_code IN ('TK_NotStart', 'TK_Active')
        ${projectId ? 'AND t.proj_id = $1' : ''}
        GROUP BY r.rsrc_name, t.status_code
        ORDER BY r.rsrc_name, t.status_code
    `;
    
    try {
        const result = await db.query(query, projectId ? [projectId] : []);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error fetching resources chart data:', err);
        res.status(500).json({ error: err.message });
    }
}

// Get resources percentage history
async function getResourcesPercentageHistory(req, res) {
    const projectId = req.query.project_id;
    console.log(`📊 Fetching resources percentage history for project: ${projectId}`);
    
    const query = `
        WITH project_dates AS (
            SELECT 
                p.proj_id,
                p.last_recalc_date::timestamp as date
            FROM project p
            WHERE ${projectId ? 'p.proj_id = $1' : '1=1'}
        ),
        daily_stats AS (
            SELECT 
                pd.date,
                pd.proj_id,
                -- Count distinct resources assigned to tasks
                COUNT(DISTINCT tr.rsrc_id)::integer as resource_count,
                -- Count remaining activities (not complete)
                COUNT(DISTINCT CASE WHEN t.status_code != 'Completed' THEN t.task_id END)::integer as remaining_activities
            FROM project_dates pd
            LEFT JOIN task t ON t.proj_id = pd.proj_id
            LEFT JOIN taskrsrc tr ON tr.task_id = t.task_id
            GROUP BY pd.date, pd.proj_id
        )
        SELECT 
            TO_CHAR(date::timestamp, 'YYYY-MM') as date,
            CASE 
                WHEN remaining_activities = 0 THEN 0
                ELSE TRUNC((resource_count::numeric / remaining_activities::numeric) * 100, 2)
            END as value
        FROM daily_stats
        ORDER BY date ASC;
    `;

    try {
        const result = await db.query(query, projectId ? [projectId] : []);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching resources percentage history:', error);
        res.status(500).json({ error: error.message });
    }
}

// Get resources table data
async function getResourcesTableData(req, res) {
    const projectId = req.query.project_id;
    const limit = parseInt(req.query.limit) || 20;
    console.log(`📋 Fetching resources table data for project: ${projectId}, limit: ${limit}`);
    
    const query = `
        SELECT 
            t.task_id as "Activity ID",
            t.task_name as "Activity Name",
            t.act_start_date as "Start Date",
            t.act_end_date as "Finish Date",
            TRUNC(t.target_drtn_hr_cnt::numeric / 8.0, 2) as "Original Duration",
            TRUNC(COALESCE(t.total_float_hr_cnt::numeric, 0) / 8.0, 2) as "Total Float Days",
            t.cstr_type as "Primary Constraint",
            t.task_type as "Activity Type",
            t.status_code as "Activity Status",
            STRING_AGG(COALESCE(r.rsrc_name, ''), ', ') as "Resource"
        FROM task t
        LEFT JOIN taskrsrc tr ON tr.task_id = t.task_id
        LEFT JOIN rsrc r ON tr.rsrc_id = r.rsrc_id
        WHERE t.status_code IN ('TK_NotStart', 'TK_Active')
        ${projectId ? 'AND t.proj_id = $1' : ''}
        GROUP BY 
            t.task_id,
            t.task_name,
            t.act_start_date,
            t.act_end_date,
            t.target_drtn_hr_cnt,
            t.total_float_hr_cnt,
            t.cstr_type,
            t.task_type,
            t.status_code
        ORDER BY t.task_id
        LIMIT $${projectId ? '2' : '1'}
    `;
    
    try {
        const result = await db.query(query, projectId ? [projectId, limit] : [limit]);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error fetching resources table data:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getResourcesKPI,
    getResourcesChartData,
    getResourcesPercentageHistory,
    getResourcesTableData
}; 