const db = require('../config/database');

// Get resources KPI data
async function getResourcesKPI(req, res) {
    const projectId = req.query.project_id;
    console.log(`🚀 RESOURCES KPI ENDPOINT CALLED - DEBUG TEST`);
    console.log(`📊 Fetching resources KPI data for project: ${projectId}`);
    
    const params = [];
    let projectFilter = '';
    
    console.log('🔍 Starting Resources KPI calculation...');
    
    if (projectId && projectId !== 'all') {
        projectFilter = 'WHERE projectid = $1';
        params.push(projectId);
    }

    // Get Resource Load Count and Remaining Activities using activityanalysisview
    console.log('🔍 Building query with projectFilter:', projectFilter);
    
    const query = `
        WITH metrics AS (
            SELECT 
                COUNT(*) FILTER (
                    WHERE activitystatus IN ('Active', 'NotStart')
                    AND resource IS NOT NULL 
                    AND resource != ''
                    AND resource != ' '
                ) as resource_load_count,
                COUNT(*) FILTER (
                    WHERE activitystatus != 'Complete'
                ) as remaining_activities
            FROM activityanalysisview
            ${projectFilter}
        )
        SELECT 
            resource_load_count as "ResourceLoad_Count",
            remaining_activities as "Remaining_Activities",
            CASE 
                WHEN remaining_activities = 0 THEN 0 
                ELSE TRUNC((resource_load_count::numeric / remaining_activities::numeric) * 100, 1)
            END as "Resource_Load_Percentage"
        FROM metrics;`;

    console.log('🔍 About to execute query...');
    console.log('Executing query:', query);
    console.log('Query parameters:', params);
    
    try {
        const result = await db.query(query, params);
        console.log('Query executed successfully');
        console.log('Query result:', result.rows[0]);
        
        // Debug: Check if we're getting the expected data
        if (!result.rows[0]) {
            console.log('No data returned from query');
            res.json({
                ResourceLoad_Count: 0,
                Remaining_Activities: 0,
                Resource_Load_Percentage: 0
            });
            return;
        }
        
        console.log('Sending response:', result.rows[0]);
        res.json(result.rows[0]);
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
    
    const params = [];
    let projectFilter = '';
    
    if (projectId && projectId !== 'all') {
        projectFilter = 'WHERE projectid = $1';
        params.push(projectId);
    }
    
    const query = `
        SELECT
            TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
            CASE 
                WHEN COUNT(CASE WHEN a.activitystatus != 'Complete' THEN 1 END) = 0 THEN 0
                ELSE TRUNC((COUNT(CASE WHEN a.activitystatus IN ('Active', 'NotStart') AND a.resource IS NOT NULL AND a.resource != '' AND a.resource != ' ' THEN 1 END)::numeric / 
                          COUNT(CASE WHEN a.activitystatus != 'Complete' THEN 1 END)::numeric) * 100, 1)
            END as value
        FROM activityanalysisview a
        LEFT JOIN project p ON p.proj_id = a.projectid
        ${projectFilter}
        GROUP BY p.last_recalc_date
        ORDER BY date ASC;
    `;

    try {
        const result = await db.query(query, params);
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