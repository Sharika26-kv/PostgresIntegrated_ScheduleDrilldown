const express = require('express');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ForgeAPI = require('forge-apis');
const FormData = require('form-data');
// PostgreSQL database connection
const db = require('./config/database');
const { spawn } = require('child_process');
require('dotenv').config();

// Import Gantt Chart API endpoints
const ganttApi = require('./api/gantt-endpoints');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001; // Use a different port than the frontend dev server

// Enable JSON parsing for POST requests
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up multer for temporary file storage
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB file size limit
});

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Import and use the Forge API router
// try {
//   const forgeRouter = require('./server/api/forge');
//   app.use('/api/forge', forgeRouter);
// } catch (error) {
//   console.error('[Server] Error setting up Forge API routes:', error.message);
// }

// Environment variables for APS credentials - fallback to hardcoded values if not set
const APS_CLIENT_ID = process.env.APS_CLIENT_ID ;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET ;

// Initialize Forge SDK clients
const oauth2Client = new ForgeAPI.AuthClientTwoLegged(
  APS_CLIENT_ID, 
  APS_CLIENT_SECRET,
  ['data:read', 'data:write', 'data:create', 'bucket:read', 'bucket:create', 'viewables:read'],
  true
);

const bucketsApi = new ForgeAPI.BucketsApi();
const objectsApi = new ForgeAPI.ObjectsApi();
const derivativesApi = new ForgeAPI.DerivativesApi();

// Cache of authentication tokens
let tokenCache = {
  token: null,
  expiration: 0
};

// Function to get a 2-legged token from Autodesk Forge
async function getAccessToken() {
  const logPrefix = "[Server]"; 
  
  // Check if we have a valid cached token
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiration > now) {
    console.log(`${logPrefix} Using cached token, expires in ${Math.round((tokenCache.expiration - now)/1000)}s`);
    return tokenCache.token;
  }
  
  try {
    console.log(`${logPrefix} Requesting fresh APS token`);
    const credentials = await oauth2Client.authenticate();
    
    // Cache the token with expiration
    tokenCache = {
      token: credentials,
      expiration: Date.now() + credentials.expires_in * 1000 - 60000 // 1 minute buffer
    };
    
    console.log(`${logPrefix} Token received, expires in ${credentials.expires_in}s`);
    return credentials;
  } catch (error) {
    console.error(`${logPrefix} Error getting APS token:`, error.message);
    if (error.response?.data) {
      console.error(`${logPrefix} Error details:`, JSON.stringify(error.response.data));
    }
    throw new Error('Failed to obtain APS token from server.');
  }
}

// Ensure bucket exists for uploads
async function ensureBucketExists(bucketKey) {
  const logPrefix = "[Server]";
  const credentials = await getAccessToken();
  
  try {
    // Check if bucket exists
    await bucketsApi.getBucketDetails(bucketKey, oauth2Client, credentials);
    console.log(`${logPrefix} Bucket ${bucketKey} already exists`);
    return bucketKey;
  } catch (error) {
    // If bucket doesn't exist (404), create it
    if (error.statusCode === 404) {
      console.log(`${logPrefix} Bucket ${bucketKey} not found, creating...`);
      const bucketData = {
        bucketKey,
        policyKey: 'transient' // Use transient for testing, persistent for production
      };
      
      try {
        const result = await bucketsApi.createBucket(
          bucketData,
          {},
          oauth2Client,
          credentials
        );
        console.log(`${logPrefix} Bucket ${bucketKey} created successfully`);
        return bucketKey;
      } catch (createError) {
        console.error(`${logPrefix} Error creating bucket:`, createError.message);
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }
    } else {
      console.error(`${logPrefix} Error checking bucket:`, error.message);
      throw new Error(`Failed to check bucket: ${error.message}`);
    }
  }
}

// Route for the frontend to get a token
app.get('/api/auth/token', async (req, res) => {
  const logPrefix = "[Server]";
  console.log(`${logPrefix} Received request for /api/auth/token`);
  try {
    const credentials = await getAccessToken();
    res.json({
      access_token: credentials.access_token,
      expires_in: credentials.expires_in
    }); 
  } catch (error) {
    console.error(`${logPrefix} Error in /api/auth/token route:`, error.message);
    res.status(500).json({ error: 'Failed to retrieve APS token.' });
  }
});

// Upload file to Autodesk bucket using signed URLs
app.post('/api/models/upload', upload.single('file'), async (req, res) => {
  const logPrefix = "[Server]";
  console.log(`${logPrefix} Received upload request`);
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  if (!req.body.bucketKey) {
    return res.status(400).json({ error: 'BucketKey is required' });
  }
  
  const bucketKey = req.body.bucketKey;
  const filePath = req.file.path;
  const fileName = req.file.originalname || 'model.ifc';
  
  try {
    // Ensure bucket exists
    await ensureBucketExists(bucketKey);
    
    // Get credentials
    const credentials = await getAccessToken();
    
    // Get signed URL for upload
    console.log(`${logPrefix} Getting signed URL for ${fileName}`);
    const signedUrlResponse = await axios.get(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}/signeds3upload`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      }
    );
    
    const uploadUrl = signedUrlResponse.data.urls[0];
    const uploadKey = signedUrlResponse.data.uploadKey;
    
    // Upload file to S3
    console.log(`${logPrefix} Uploading file to signed URL`);
    const fileContent = fs.readFileSync(filePath);
    await axios.put(uploadUrl, fileContent, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileContent.length
      }
    });
    
    // Complete the upload
    console.log(`${logPrefix} Completing the upload`);
    const completeBody = {
      uploadKey: uploadKey
    };
    
    const completeResponse = await axios.post(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}/signeds3upload`,
      completeBody,
      {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Clean up the temp file
    fs.unlinkSync(filePath);
    
    const objectId = completeResponse.data.objectId;
    const urn = Buffer.from(objectId).toString('base64').replace(/=/g, '');
    
    console.log(`${logPrefix} File uploaded successfully, objectId: ${objectId}`);
    
    res.json({
      bucketKey,
      objectId,
      urn,
      fileName
    });
    
  } catch (error) {
    console.error(`${logPrefix} Error uploading file:`, error.message);
    if (error.response) {
      console.error(`${logPrefix} Error status code:`, error.response.status);
      console.error(`${logPrefix} Error response:`, error.response.data);
    }
    
    // Clean up the temp file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(500).json({ error: `File upload failed: ${error.message}` });
  }
});

// Translate model to viewable format
app.post('/api/models/translate', async (req, res) => {
  const logPrefix = "[Server]";
  console.log(`${logPrefix} Received translation request`);
  
  const { urn, filename } = req.body;
  
  if (!urn) {
    return res.status(400).json({ error: 'URN is required' });
  }
  
  try {
    // Get credentials
    const credentials = await getAccessToken();
    
    // Set up translation job
    const job = {
      input: {
        urn
      },
      output: {
        formats: [
          {
            type: 'svf',
            views: ['2d', '3d']
          }
        ]
      }
    };
    
    console.log(`${logPrefix} Starting translation job for URN: ${urn}`);
    
    // Start translation
    const translateResponse = await derivativesApi.translate(
      job,
      { xAdsForce: true },
      oauth2Client,
      credentials
    );
    
    console.log(`${logPrefix} Translation job started:`, JSON.stringify(translateResponse.body));
    
    res.json({
      urn,
      jobId: translateResponse.body.result,
      status: 'pending'
    });
    
  } catch (error) {
    console.error(`${logPrefix} Error starting translation:`, error);
    if (error.response) {
      console.error(`${logPrefix} Detailed error:`, error.response.body);
    }
    res.status(500).json({ error: `Translation failed: ${error.message}` });
  }
});

// Check translation status
app.get('/api/models/:urn/status', async (req, res) => {
  const logPrefix = "[Server]";
  const { urn } = req.params;
  
  console.log(`${logPrefix} Checking translation status for URN: ${urn}`);
  
  if (!urn) {
    return res.status(400).json({ error: 'URN is required' });
  }
  
  try {
    // Get credentials
    const credentials = await getAccessToken();
    
    // Check manifest
    const manifestResponse = await derivativesApi.getManifest(
      urn,
      {},
      oauth2Client,
      credentials
    );
    
    const manifest = manifestResponse.body;
    console.log(`${logPrefix} Translation status: ${manifest.status}`);
    
    res.json({
      urn,
      status: manifest.status,
      progress: manifest.progress,
      derivatives: manifest.derivatives
    });
    
  } catch (error) {
    console.error(`${logPrefix} Error checking translation:`, error.message);
    res.status(500).json({ error: `Failed to check translation: ${error.message}` });
  }
});

// Initialize the Gantt API database connection
ganttApi.initDatabase().catch(err => {
  console.error('❌ Failed to initialize Gantt database:', err);
});

// Register Gantt Chart API routes
app.get('/api/gantt/projects', ganttApi.getProjects);
app.get('/api/gantt/projects/:projectId/tasks', ganttApi.getProjectTasks);
app.get('/api/gantt/projects/:projectId/wbs', ganttApi.getProjectWBS);
app.get('/api/gantt/projects/:projectId/dependencies', ganttApi.getProjectDependencies);
app.get('/api/gantt/projects/:projectId/resources', ganttApi.getProjectResources);

// AWP-specific endpoints
app.get('/api/awp/projects/:projectId/hierarchy', ganttApi.getAWPHierarchy);
app.get('/api/awp/projects/:projectId/tasks', ganttApi.getTasksWithAWP);
app.get('/api/awp/projects/:projectId/dependencies', ganttApi.getProjectDependencies);

// Legacy AWP endpoints (for backward compatibility)
app.get('/api/awp-hierarchy', ganttApi.getAWPHierarchy);
app.get('/api/awp-hierarchy-with-tasks', ganttApi.getAWPHierarchyWithTasks);
app.get('/api/tasks-with-awp', ganttApi.getTasksWithAWP);
app.get('/api/gantt/health', ganttApi.healthCheck);

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./uploads')){
  fs.mkdirSync('./uploads');
}

// Serve the chat interface
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Initialize PostgreSQL database connection and upload history table
async function initializeDatabase() {
  try {
    const result = await db.query('SELECT NOW() as current_time');
    console.log('[Server] Connected to PostgreSQL database');
    await initializeUploadHistoryTable();
  } catch (err) {
    console.error('[Server] Error connecting to PostgreSQL:', err);
  }
}

// Initialize database when server starts
initializeDatabase();

// API endpoint to get all tables from the database
app.get('/api/database/tables', async (req, res) => {
  const logPrefix = '[Server /api/database/tables]';
  try {
    const query = `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(`${logPrefix} Error fetching tables:`, err.message);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// API endpoint to get all projects (ID and Name)
app.get('/api/database/projects', async (req, res) => {
  const logPrefix = '[Server /api/database/projects]';
  try {
    const query = `SELECT proj_id, proj_short_name AS proj_name FROM project ORDER BY proj_short_name`;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(`${logPrefix} Error fetching projects:`, err.message);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// API endpoint to get data from a specific table
app.get('/api/database/table/:tableName', async (req, res) => {
  const logPrefix = '[Server /api/database/table]';
  const tableName = req.params.tableName;
  const projectId = req.query.projectId || req.query.proj_id; // Accept both parameters for compatibility

  // Basic validation to prevent SQL injection via table name
  // Allow only alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    console.error(`${logPrefix} Invalid table name format received: ${tableName}`);
    return res.status(400).json({ error: 'Invalid table name format.' });
  }

  let query = `SELECT * FROM ${tableName.toLowerCase()}`; // Convert to lowercase for PostgreSQL
  const params = [];

  // Add project filter if projectId is provided and the table is likely project-specific
  // Add more tables here if they have a 'proj_id' column
  const projectSpecificTables = ['TASK', 'PROJWBS', 'TASKPRED', 'PROJECT']; 
  if (projectId && projectSpecificTables.includes(tableName.toUpperCase())) {
      // Convert projectId to integer if possible
      let projectIdParam;
      try {
        // Parse as integer if possible
        projectIdParam = parseInt(projectId, 10);
        if (isNaN(projectIdParam)) {
          // If not a valid integer, use the original string
          projectIdParam = projectId;
        }
      } catch (e) {
        projectIdParam = projectId;
      }
      
      console.log(`${logPrefix} Using projectId parameter: ${projectIdParam}`);
      
      // Special handling for TASK table to use AWP tasks view
      if (tableName.toUpperCase() === 'TASK') {
        query = `SELECT * FROM awp_tasks WHERE proj_id = $1 ORDER BY task_id`;
      } else {
        // Assuming the column name is 'proj_id'
        query += ` WHERE proj_id = $1`;
      }
      params.push(projectIdParam);
  }

  console.log(`${logPrefix} Executing query: ${query} with params: ${params}`);

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(`${logPrefix} Error fetching data from ${tableName}:`, err.message);
    res.status(500).json({ error: `Failed to fetch data from ${tableName}` });
  }
});

// API endpoint to get activities for Gantt chart
app.get('/api/gantt/activities', async (req, res) => {
  const logPrefix = '[Server /api/gantt/activities]';
  const { projectId, statusFilter, lookAhead, sortBy, sortOrder = 'ASC' } = req.query;

  if (!projectId) {
    console.error(`${logPrefix} project ID is required.`);
    return res.status(400).json({ error: 'project ID is required' });
  }

  // Convert projectId to integer if possible
  let projectIdParam;
  try {
    // Parse as integer if possible
    projectIdParam = parseInt(projectId, 10);
    if (isNaN(projectIdParam)) {
      // If not a valid integer, use the original string
      projectIdParam = projectId;
    }
  } catch (e) {
    projectIdParam = projectId;
  }
  
  console.log(`${logPrefix} Using projectId parameter: ${projectIdParam}`);

  // Validate sortBy column to prevent SQL injection
  const validSortColumns = ['task_id', 'task_code', 'task_name', 'target_start_date', 'target_end_date', 'remain_drtn_hr_cnt', 'status_code', 'driving_path_flag'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'target_start_date'; // Default sort is target_start_date
  const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  let query = `
    SELECT
      task_id,
      task_code,
      task_name,
      target_start_date AS startDate,
      target_end_date AS endDate,
      remain_drtn_hr_cnt AS duration,
      status_code AS status,
      driving_path_flag AS critical,
      wbs_id
    FROM task
    WHERE proj_id = $1
  `;
  const params = [projectIdParam]; // Use the parsed/cleaned projectId

  // Apply Status Filter
  if (statusFilter && statusFilter !== 'All') {
    query += ` AND status_code = $${params.length + 1}`;
    params.push(statusFilter);
  }

  // Apply Look Ahead Filter
  const today = new Date();

  if (lookAhead && lookAhead !== 'all') {
      // Use a simplified but robust approach for date filtering
      let lookAheadDate = new Date(today);
      if (lookAhead === 'day') {
          // No change needed, effectively filters for today or later
      } else if (lookAhead === 'week') {
          lookAheadDate.setDate(today.getDate() + 7);
      } else if (lookAhead === 'month') {
          lookAheadDate.setMonth(today.getMonth() + 1);
      } else if (lookAhead === 'year') {
          lookAheadDate.setFullYear(today.getFullYear() + 1);
      }
      
      // Simple date filter: show tasks that start BEFORE the look-ahead date
      // This is more robust than complex date string comparison
      query += ` AND target_start_date IS NOT NULL`; // Ensure the date field has a value
      
      // Add the date filter
      const lookAheadDateStr = lookAheadDate.toISOString();
      console.log(`${logPrefix} Using lookAhead date: ${lookAheadDateStr}`);
      query += ` AND target_start_date <= $${params.length + 1}`;
      params.push(lookAheadDateStr);
  }

  query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

  // Enhanced logging before execution
  console.log(`${logPrefix} Final Query:
${query}
Params: ${JSON.stringify(params)}`);

  try {
    const result = await db.query(query, params);
    console.log(`[Server] Sending ${result.rows.length} filtered activities for Gantt.`);
    res.json(result.rows);
  } catch (err) {
    console.error(`${logPrefix} Error executing query:`, err.message);
    res.status(500).json({ error: `Failed to fetch activities: ${err.message}` });
  }
});

// --- API Endpoints for Gantt Filters ---

// API endpoint to get distinct task statuses for a project
app.get('/api/gantt/statuses', async (req, res) => {
    const logPrefix = '[Server /api/gantt/statuses]';
    const projectId = req.query.projectId;
    console.log(`${logPrefix} Request for distinct statuses for project: ${projectId}`);

    if (!projectId) {
        return res.status(400).json({ error: 'project ID is required' });
    }

    const query = `SELECT DISTINCT status_code FROM task WHERE proj_id = $1 ORDER BY status_code`;
    
    // Convert projectId to integer if possible
    let projectIdParam;
    try {
        // Parse as integer if possible
        projectIdParam = parseInt(projectId, 10);
        if (isNaN(projectIdParam)) {
            // If not a valid integer, use the original string
            projectIdParam = projectId;
        }
    } catch (e) {
        projectIdParam = projectId;
    }
    
    console.log(`${logPrefix} Using projectId parameter: ${projectIdParam}`);
    
    try {
        const result = await db.query(query, [projectIdParam]);
        res.json(result.rows.map(r => r.status_code)); // Return array of strings
    } catch (err) {
        console.error(`${logPrefix} Error fetching distinct statuses:`, err.message);
        res.status(500).json({ error: 'Failed to fetch statuses' });
    }
});

// New API endpoint for Float Analysis tasks
app.get('/api/float-analysis-tasks', async (req, res) => {
  const logPrefix = '[Server /api/float-analysis-tasks]';
  const projectId = req.query.projectId; // Get project ID from query parameter

  console.log(`${logPrefix} Request received for project: ${projectId}`);

  if (!projectId) {
      console.error(`${logPrefix} project ID is required.`);
      return res.status(400).json({ error: 'project ID is required' });
  }

   // Convert projectId to integer if possible, consistent with other endpoints
  let projectIdParam;
  try {
    projectIdParam = parseInt(projectId, 10);
    if (isNaN(projectIdParam)) {
      projectIdParam = projectId;
    }
  } catch (e) {
    projectIdParam = projectId;
  }

  // SQL query to select the required columns from the task table filtered by project ID
  const query = `
      SELECT
          task_code,
          task_name,
          total_float_hr_cnt,
          status_code,
          act_start_date,
          act_end_date,
          target_start_date,
          target_end_date
      FROM
          task
      WHERE
          proj_id = $1
  `;

  console.log(`${logPrefix} Executing query for project ${projectIdParam}: ${query.trim().replace(/\s+/g, ' ')}`);

  try {
      const result = await db.query(query, [projectIdParam]);
      
      console.log(`${logPrefix} Query returned ${result.rows.length} rows.`);

      if (result.rows.length === 0) {
          console.warn(`${logPrefix} No tasks found for project ${projectId}.`);
          // Return empty array but with a 200 status (not an error, just no data)
          return res.json([]);
      }

      // Return the results as JSON
      res.json(result.rows);
  } catch (err) {
      console.error(`${logPrefix} Error fetching data from task table:`, err.message);
      res.status(500).json({ error: `Failed to fetch float analysis tasks: ${err.message}` });
  }
});

// API endpoint for hierarchical task data with WBS and AWP (with pagination)
app.get('/api/tasks/hierarchical', async (req, res) => {
    const logPrefix = '[Server /api/tasks/hierarchical]';
    const projectId = req.query.projectId;
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (!projectId) {
        console.error(`${logPrefix} project ID is required.`);
        return res.status(400).json({ error: 'project ID is required' });
    }

    // Use PostgreSQL wbs_structure view for hierarchical data
    const countQuery = `SELECT COUNT(*) as total FROM wbs_structure`;
    const dataQuery = `SELECT * FROM wbs_structure ORDER BY wbs_path, start_date LIMIT $1 OFFSET $2`;

    try {
        // First, get the total count
        const countResult = await db.query(countQuery);
        const total = countResult.rows[0] ? countResult.rows[0].total : 0;
        
        // Now, get the paginated data
        const dataResult = await db.query(dataQuery, [limit, offset]);
        
        res.json({ total, data: dataResult.rows });
    } catch (err) {
        console.error(`${logPrefix} Error executing hierarchical query:`, err.message);
        res.status(500).json({ error: 'Failed to fetch hierarchical task data' });
    }
});

// API endpoint for AWP (Activity Work Package) tasks using PostgreSQL view
app.get('/api/awp_tasks', async (req, res) => {
    const logPrefix = '[Server /api/awp_tasks]';
    const projectId = req.query.project_id;
    
    console.log(`${logPrefix} AWP Tasks request received for project ${projectId}`);
    
    if (!projectId) {
        console.error(`${logPrefix} Missing project ID`);
        return res.status(400).json({ error: 'project ID is required' });
    }
    
    console.log(`${logPrefix} Processing request for project ${projectId}`);
    
    try {
        // Use PostgreSQL awp_tasks view for AWP hierarchy
        const awpQuery = `SELECT * FROM awp_tasks WHERE proj_id = $1 ORDER BY task_code`;
        
        console.log(`${logPrefix} Executing query for project ${projectId}`);
        
        const result = await db.query(awpQuery, [projectId]);
        
        console.log(`${logPrefix} Query returned ${result.rows.length} rows`);
        
        if (result.rows.length === 0) {
            console.warn(`${logPrefix} No AWP data found for project ${projectId}`);
            return res.json([]);
        }
        
        // Add diagnostic logging of first few rows
        if (result.rows.length > 0) {
            console.log(`${logPrefix} First row sample:`, result.rows[0]);
        }
        
        // Return the results as JSON
        res.json(result.rows);
    } catch (error) {
        console.error(`${logPrefix} Error in AWP tasks endpoint:`, error);
        res.status(500).json({ 
            error: 'Failed to fetch AWP tasks data',
            details: error.message,
            projectId: projectId
        });
    }
});

// Fallback route for SPA - MOVED TO AFTER ALL API ENDPOINTS

// Basic error handling middleware (add more specific ones as needed)
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled Error:', err.stack);
  res.status(500).send('Something broke!');
});

// Helper function to perform CPM calculations - REMOVED
// This large function has been removed as it's no longer needed for the new Gantt implementation

// Ensure uploads directory exists (used by multer)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir);
}

// Configure Multer for XER file uploads
const xerUpload = multer({ 
  dest: uploadsDir, // Temporary storage path
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    // Accept only .xer files
    if (!file.originalname.toLowerCase().endsWith('.xer')) {
      return cb(new Error('Only .xer files are allowed'), false);
    }
    cb(null, true);
  }
});

// Function to create UPLOAD_HISTORY table if it doesn't exist
async function initializeUploadHistoryTable() {
  const logPrefix = '[Server initializeUploadHistoryTable]';
  const createTableSql = `
      CREATE TABLE IF NOT EXISTS upload_history (
          id SERIAL PRIMARY KEY,
          filename TEXT NOT NULL,
          upload_user TEXT,
          upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status TEXT CHECK(status IN ('Success', 'Failure')) NOT NULL,
          message TEXT
      )
  `;
  
  try {
      await db.query(createTableSql);
      console.log(`${logPrefix} upload_history table checked/created successfully.`);
  } catch (err) {
      console.error(`${logPrefix} Error creating upload_history table:`, err.message);
  }
}

// Function to insert upload history record
async function recordUploadHistory(filename, user = 'System', status, message = '') {
     const logPrefix = '[Server recordUploadHistory]';
     const insertSql = `
        INSERT INTO upload_history (filename, upload_user, status, message)
        VALUES ($1, $2, $3, $4) RETURNING id
     `;
     // Ensure message is not excessively long (e.g., limit to 1000 chars)
     const truncatedMessage = message.length > 1000 ? message.substring(0, 997) + '...' : message;

     try {
         const result = await db.query(insertSql, [filename, user, status, truncatedMessage]);
         const insertedId = result.rows[0].id;
         console.log(`${logPrefix} Recorded upload attempt for ${filename} with status ${status}. ID: ${insertedId}`);
         return insertedId;
     } catch (err) {
         console.error(`${logPrefix} Error inserting record into upload_history:`, err.message);
         throw err;
     }
}

// API endpoint to handle XER file upload and parsing
app.post('/api/xer/upload', xerUpload.single('xerFile'), async (req, res) => {
  const logPrefix = '[Server /api/xer/upload]';
  console.log(`${logPrefix} Received XER upload request.`);

  if (!req.file) {
    console.error(`${logPrefix} No file uploaded.`);
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const tempFilePath = req.file.path;
  const originalFilename = req.file.originalname;
  const pythonScriptPath = path.join(__dirname, 'parse_xer_content.py'); // Assuming script is in root
  const currentDbPath = dbPath; // Use the global dbPath defined earlier

  console.log(`${logPrefix} File temporary path: ${tempFilePath}`);
  console.log(`${logPrefix} Original filename: ${originalFilename}`);
  console.log(`${logPrefix} Python script path: ${pythonScriptPath}`);
  console.log(`${logPrefix} Database path: ${currentDbPath}`);

  // Ensure the Python script exists
  if (!fs.existsSync(pythonScriptPath)) {
      const errorMsg = `Python parser script not found at ${pythonScriptPath}`;
      console.error(`${logPrefix} ${errorMsg}`);
      fs.unlinkSync(tempFilePath); // Clean up uploaded file
      await recordUploadHistory(originalFilename, 'System', 'Failure', errorMsg);
      return res.status(500).json({ success: false, message: errorMsg });
  }

  let pythonOutput = '';
  let pythonError = '';

  try {
      const pythonProcess = spawn('python', [pythonScriptPath, tempFilePath, currentDbPath, originalFilename]);

      pythonProcess.stdout.on('data', (data) => {
          const outputChunk = data.toString();
          pythonOutput += outputChunk;
          console.log(`${logPrefix} Python stdout: ${outputChunk.trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
          const errorChunk = data.toString();
          pythonError += errorChunk;
          console.error(`${logPrefix} Python stderr: ${errorChunk.trim()}`);
      });

      pythonProcess.on('close', async (code) => {
          console.log(`${logPrefix} Python script finished with code ${code}`);
          let historyStatus = 'Failure';
          let responseMessage = '';

          if (code === 0 && !pythonError) { // Success only if exit code is 0 AND no stderr output
               historyStatus = 'Success';
               responseMessage = `Successfully parsed and inserted data from ${originalFilename}. ${pythonOutput.trim()}`;
               console.log(`${logPrefix} ${responseMessage}`);
               await recordUploadHistory(originalFilename, 'Shrey', historyStatus, pythonOutput.trim() + (pythonError ? ` | Error: ${pythonError.trim()}` : '') );
               res.json({ success: true, message: responseMessage });
          } else {
              historyStatus = 'Failure';
              if (pythonError) {
                  responseMessage = `Python script error: ${pythonError.trim()}`;
              } else if (code !== 0) {
                  responseMessage = `Python script exited with non-zero code: ${code}. Output: ${pythonOutput.trim()}`;
              } else {
                   responseMessage = `Unknown processing error. Exit code: ${code}. Output: ${pythonOutput.trim()}. Error Stream: ${pythonError.trim()}`;
              }
               console.error(`${logPrefix} ${responseMessage}`);
               await recordUploadHistory(originalFilename, 'Shrey', historyStatus, responseMessage);
               res.status(500).json({ success: false, error: responseMessage });
          }
      });

      pythonProcess.on('error', (err) => {
           console.error(`${logPrefix} Failed to start Python script:`, err);
           const errorMsg = `Failed to start Python process. Is Python installed and in PATH? Error: ${err.message}`;
           console.error(`${logPrefix} ${errorMsg}`);
           recordUploadHistory(originalFilename, 'Shrey', 'Failure', errorMsg).catch(e => console.error('Hist err', e));
           res.status(500).json({ success: false, error: errorMsg });
           // Cleanup temp file on spawn error
           fs.unlink(tempFilePath, (unlinkErr) => {
             if (unlinkErr) console.error(`${logPrefix} Error deleting temp file on spawn error:`, unlinkErr);
           });
      });

  } catch (error) {
     console.error(`${logPrefix} Error trying to spawn Python script:`, error);
     const errorMsg = `Server error trying to run parser: ${error.message}`;
      recordUploadHistory(originalFilename, 'Shrey', 'Failure', errorMsg).catch(e => console.error('Hist err', e));
      res.status(500).json({ success: false, error: errorMsg });
       // Cleanup temp file on general error
      fs.unlink(tempFilePath, (unlinkErr) => {
        if (unlinkErr) console.error(`${logPrefix} Error deleting temp file on general error:`, unlinkErr);
      });
  }
});

// API endpoint to fetch project progress data for EVM analysis
app.get('/api/progress-data', async (req, res) => {
  const logPrefix = '[Server /api/progress-data]';
  const projectId = req.query.projectId || 'P1000';
  console.log(`${logPrefix} Request for progress data for project: ${projectId}`);
  
  try {
    // Get project data from PostgreSQL using progress data query from migration script
    const progressQuery = `
      SELECT 
        TO_CHAR(act_start_date::DATE, 'YYYY-MM') as period,
        AVG(CAST(phys_complete_pct AS REAL)) as actual,
        AVG(CAST(remain_drtn_hr_cnt AS REAL) / NULLIF(CAST(target_drtn_hr_cnt AS REAL), 0) * 100) as planned,
        COUNT(*) as task_count
      FROM task
      WHERE proj_id = $1
      GROUP BY TO_CHAR(act_start_date::DATE, 'YYYY-MM')
      ORDER BY period
    `;
    
    const result = await db.query(progressQuery, [projectId]);
    const progressData = result.rows;
    
    // If no data is found, return sample data
    if (progressData.length === 0) {
      // Sample data structure - for testing purposes
      const sampleProgressData = [
        { period: 'Week 1', planned: 5, actual: 4, earned: 3, plannedCost: 10000, actualCost: 12000 },
        { period: 'Week 2', planned: 10, actual: 8, earned: 7, plannedCost: 15000, actualCost: 16500 },
        { period: 'Week 3', planned: 15, actual: 12, earned: 11, plannedCost: 22000, actualCost: 23000 },
        { period: 'Week 4', planned: 25, actual: 20, earned: 19, plannedCost: 30000, actualCost: 32000 },
        { period: 'Week 5', planned: 35, actual: 30, earned: 28, plannedCost: 38000, actualCost: 40000 },
        { period: 'Week 6', planned: 45, actual: 40, earned: 37, plannedCost: 46000, actualCost: 49000 },
        { period: 'Week 7', planned: 55, actual: 48, earned: 46, plannedCost: 54000, actualCost: 57000 },
        { period: 'Week 8', planned: 65, actual: 56, earned: 53, plannedCost: 62000, actualCost: 66000 },
        { period: 'Week 9', planned: 75, actual: 64, earned: 60, plannedCost: 70000, actualCost: 75000 },
        { period: 'Week 10', planned: 85, actual: 72, earned: 68, plannedCost: 78000, actualCost: 84000 },
        { period: 'Week 11', planned: 95, actual: 85, earned: 80, plannedCost: 86000, actualCost: 93000 },
        { period: 'Week 12', planned: 100, actual: 95, earned: 94, plannedCost: 95000, actualCost: 101000 }
      ];
      
      return res.json(sampleProgressData);
    }
    
    res.json(progressData);
  } catch (error) {
    console.error(`${logPrefix} Error fetching progress data:`, error.message);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[Server] Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

// API endpoint to fetch projects list
app.get('/api/projects', async (req, res) => {
  const logPrefix = '[Server /api/projects]';
  console.log(`${logPrefix} Request for projects list`);
  
  try {
    // Get projects from PostgreSQL using projects query from migration script
    const projectsQuery = `
      SELECT 
        proj_id,
        proj_short_name as proj_name,
        plan_start_date,
        plan_end_date
      FROM project
      ORDER BY proj_short_name
    `;
    
    const result = await db.query(projectsQuery);
    const projects = result.rows;
    
    // If no projects found, return sample data
    if (projects.length === 0) {
      const sampleProjects = [
        { proj_id: 'P1000', proj_name: 'Sample project' },
        { proj_id: 'P1001', proj_name: 'Office Building' },
        { proj_id: 'P1002', proj_name: 'Data Center' }
      ];
      
      return res.json(sampleProjects);
    }
    
    res.json(projects);
  } catch (error) {
    console.error(`${logPrefix} Error fetching projects:`, error.message);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Diagnostic endpoint to check database status
app.get('/api/database/diagnostics', async (req, res) => {
  const logPrefix = '[Server /api/database/diagnostics]';
  console.log(`${logPrefix} Running database diagnostics`);
  
  try {
    // Use PostgreSQL database diagnostics query from migration script
    const tablesQuery = `
      SELECT 
        table_schema,
        table_name as name
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `;
    
    const result = await db.query(tablesQuery);
    const tables = result.rows;
    
    const results = {
      database: 'PostgreSQL',
      connection: 'OK',
      tables: tables.map(t => t.name),
      has_project_table: tables.some(t => t.name === 'project'),
      has_task_table: tables.some(t => t.name === 'task'),
      has_views: tables.some(t => t.name === 'activity_relationship_view'),
      recommendation: "PostgreSQL database is connected and ready"
    };
    
    res.json(results);
  } catch (error) {
    console.error(`${logPrefix} Error running diagnostics:`, error.message);
    res.status(500).json({ 
      database: 'PostgreSQL',
      connection: 'ERROR',
      error: error.message,
      recommendation: "Check PostgreSQL connection and credentials"
    });
  }
});

// API endpoint for hierarchical Gantt data
app.get('/api/hierarchical-gantt', async (req, res) => {
    const projectId = req.query.projectId;
    
    console.log(`[API] Hierarchical Gantt request received for project ${projectId}`);
    
    if (!projectId) {
        console.error('[API] Hierarchical Gantt: Missing project ID');
        return res.status(400).json({ error: 'project ID is required' });
    }
    
    console.log(`[API] Hierarchical Gantt: Processing request for project ${projectId}`);
    
    try {
        // The hierarchical SQL query with parameterized values
        const hierarchicalQuery = `
        WITH RECURSIVE WBStructure (wbs_id, parent_wbs_id, wbs_name, level, path) AS (
            -- Anchor member: Select top-level WBS elements for project
            SELECT
                p.wbs_id,
                p.parent_wbs_id,
                p.wbs_name,
                0 AS level,
                CAST(p.wbs_name AS TEXT) AS path
            FROM
                PROJWBS p
            WHERE p.proj_id = ? AND (
                p.parent_wbs_id IS NULL
                OR NOT EXISTS (SELECT 1 FROM PROJWBS parent WHERE parent.wbs_id = p.parent_wbs_id)
            )

            UNION ALL

            -- Recursive member: Select children WBS elements within project
            SELECT
                p_child.wbs_id,
                p_child.parent_wbs_id,
                p_child.wbs_name,
                cte.level + 1,
                cte.path || ' > ' || p_child.wbs_name
            FROM
                PROJWBS p_child
            INNER JOIN
                WBStructure cte ON p_child.parent_wbs_id = cte.wbs_id
            WHERE p_child.proj_id = ?
        )
        -- Final selection joining WBS hierarchy with TASK data
        SELECT
            -- Task details
            t.task_id,
            t.task_name,
            -- Use CASE statements for date logic based on status_code
            CASE
                WHEN t.status_code IN ('TK_Complete','TK_Active') THEN t.act_start_date
                ELSE t.target_start_date
            END AS start_date,
            CASE
                WHEN t.status_code IN ('TK_NotStart','TK_Active') THEN t.target_end_date
                ELSE t.act_end_date
            END AS end_date,
            t.status_code,
            t.driving_path_flag,
            t.target_drtn_hr_cnt,
            t.task_code,

            -- WBS Hierarchy details from CTE
            wbs.wbs_id AS task_wbs_id,
            wbs.level AS wbs_level,
            wbs.path AS wbs_path,
            substr('                                                  ', 1, wbs.level * 2) || wbs.wbs_name AS indented_wbs_name

        FROM
            TASK t
        INNER JOIN
            WBStructure wbs ON t.wbs_id = wbs.wbs_id
        WHERE
            t.proj_id = ?
        ORDER BY
            wbs.path,
            CASE
                WHEN t.status_code IN ('TK_Complete','TK_Active') THEN t.act_start_date
                ELSE t.target_start_date
            END
        `;
        
        console.log(`[API] Hierarchical Gantt: Executing query for project ${projectId}`);
        
        // Execute the query with parameters
        // Use PostgreSQL wbs_structure view instead of complex hierarchical query
        const result = await db.query('SELECT * FROM wbs_structure ORDER BY wbs_path, start_date');
        const rows = result.rows;
        
        console.log(`[API] Hierarchical Gantt: Query returned ${rows.length} rows for project ${projectId}`);
        
        if (rows.length === 0) {
            console.warn(`[API] Hierarchical Gantt: No data found for project ${projectId}`);
            // Return empty array but with a 200 status (not an error, just no data)
            return res.json([]);
        }
        
        // Return the results as JSON
        res.json(rows);
    } catch (error) {
        console.error('[API] Error in hierarchical Gantt endpoint:', error);
        res.status(500).json({ 
            error: 'Failed to fetch hierarchical Gantt data',
            details: error.message,
            projectId: projectId
        });
    }
});

// API endpoint for complete WBS structure (without limit)
app.get('/api/wbs-structure', async (req, res) => {
    const projectId = req.query.projectId;
    
    console.log(`[API] WBS Structure request received for project ${projectId}`);
    
    if (!projectId) {
        console.error('[API] WBS Structure: Missing project ID');
        return res.status(400).json({ error: 'project ID is required' });
    }
    
    console.log(`[API] WBS Structure: Processing request for project ${projectId} (no limit)`);
    
    try {
        // The WBS structure SQL query with parameterized values - same as hierarchical-gantt but without limit
        const wbsStructureQuery = `
        WITH RECURSIVE WBStructure (wbs_id, parent_wbs_id, wbs_name, level, path) AS (
            -- Anchor member: Select top-level WBS elements for project
            SELECT
                p.wbs_id,
                p.parent_wbs_id,
                p.wbs_name,
                0 AS level,
                CAST(p.wbs_name AS TEXT) AS path
            FROM
                PROJWBS p
            WHERE p.proj_id = ? AND (
                p.parent_wbs_id IS NULL
                OR NOT EXISTS (SELECT 1 FROM PROJWBS parent WHERE parent.wbs_id = p.parent_wbs_id)
            )

            UNION ALL

            -- Recursive member: Select children WBS elements within project
            SELECT
                p_child.wbs_id,
                p_child.parent_wbs_id,
                p_child.wbs_name,
                cte.level + 1,
                cte.path || ' > ' || p_child.wbs_name
            FROM
                PROJWBS p_child
            INNER JOIN
                WBStructure cte ON p_child.parent_wbs_id = cte.wbs_id
            WHERE p_child.proj_id = ?
        )
        -- Final selection joining WBS hierarchy with TASK data
        SELECT
            -- Task details
            t.task_id,
            t.task_name,
            -- Use CASE statements for date logic based on status_code
            CASE
                WHEN t.status_code IN ('TK_Complete','TK_Active') THEN t.act_start_date
                ELSE t.target_start_date
            END AS start_date,
            CASE
                WHEN t.status_code IN ('TK_NotStart','TK_Active') THEN t.target_end_date
                ELSE t.act_end_date
            END AS end_date,
            t.status_code,
            t.driving_path_flag,
            t.target_drtn_hr_cnt,
            t.task_code,

            -- WBS Hierarchy details from CTE
            wbs.wbs_id AS task_wbs_id,
            wbs.level AS wbs_level,
            wbs.path AS wbs_path,
            substr('                                                  ', 1, wbs.level * 2) || wbs.wbs_name AS indented_wbs_name

        FROM
            TASK t
        INNER JOIN
            WBStructure wbs ON t.wbs_id = wbs.wbs_id
        WHERE
            t.proj_id = ?
        ORDER BY
            wbs.path,
            CASE
                WHEN t.status_code IN ('TK_Complete','TK_Active') THEN t.act_start_date
                ELSE t.target_start_date
            END
        `;
        
        console.log(`[API] WBS Structure: Executing query for project ${projectId}`);
        
        // Execute the query with parameters
        // Use PostgreSQL wbs_structure view instead of complex WBS query
        const result = await db.query('SELECT * FROM wbs_structure ORDER BY wbs_path, start_date');
        const rows = result.rows;
        
        console.log(`[API] WBS Structure: Query returned ${rows.length} rows for project ${projectId}`);
        
        if (rows.length === 0) {
            console.warn(`[API] WBS Structure: No data found for project ${projectId}`);
            // Return empty array but with a 200 status (not an error, just no data)
            return res.json([]);
        }
        
        // Add diagnostic logging of first few rows and all field types
        if (rows.length > 0) {
            console.log(`[API] WBS Structure: First row sample:`, rows[0]);
            
            // Log data types of each field in the first row
            const typeSample = {};
            Object.entries(rows[0]).forEach(([key, value]) => {
                typeSample[key] = {
                    value: value,
                    type: typeof value,
                    isNull: value === null,
                    isUndefined: value === undefined,
                    sample: value?.toString?.().substring(0, 30) + (value?.toString?.().length > 30 ? '...' : '')
                };
            });
            console.log(`[API] WBS Structure: Field types:`, typeSample);
            
            // Check for specific task ID 85125 that was problematic
            const task85125 = rows.find(r => 
                (r.task_id && r.task_id.toString() === '85125') || 
                (r.task_code && r.task_code.includes('85125'))
            );
            
            if (task85125) {
                console.log(`[API] WBS Structure: Found task 85125:`, task85125);
            } else {
                console.log(`[API] WBS Structure: Task 85125 not found in result set`);
            }
        }
        
        // Return the results as JSON
        res.json(rows);
    } catch (error) {
        console.error('[API] Error in WBS structure endpoint:', error);
        res.status(500).json({ 
            error: 'Failed to fetch WBS structure data',
            details: error.message,
            projectId: projectId
        });
    }
});

// ============================================================================
// SCHEDULE DRILLDOWN API ENDPOINTS
// Extracted from server_will_delete_later.js - NO DEPENDENCIES ON THAT FILE
// ============================================================================

// project list endpoint
app.get('/api/schedule/projects', async (req, res) => {
    console.log('[Server] /api/schedule/projects endpoint called');
    try {
        // First try to get basic project info
        console.log('[Server] Attempting to query project table...');
        const result = await db.query('SELECT proj_id as id, proj_short_name as name FROM project ORDER BY proj_short_name LIMIT 10');
        console.log('[Server] Project query successful, rows:', result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error('[Server] Error fetching from project table:', error.message);
        // If that fails, try an alternative approach
        try {
            console.log('[Server] Attempting fallback query from task table...');
            const fallbackResult = await db.query('SELECT DISTINCT proj_id as id, proj_id as name FROM task ORDER BY proj_id LIMIT 10');
            console.log('[Server] Fallback query successful, rows:', fallbackResult.rows.length);
            res.json(fallbackResult.rows);
        } catch (fallbackError) {
            console.error('[Server] Fallback query also failed:', fallbackError.message);
            res.status(500).json({ error: 'Failed to fetch projects', details: fallbackError.message });
        }
    }
});

// Leads KPI endpoint
app.get('/api/schedule/leads-kpi', async (req, res) => {
    const logPrefix = '[Server /api/schedule/leads-kpi]';
    try {
        const projectId = req.query.project_id;
        
        // Use PostgreSQL queries from migration script
        const leadsQuery = `SELECT COUNT(*) as leads_count FROM activity_relationship_view WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) < 0` + (projectId && projectId !== 'all' ? ` AND project_id = $1` : '');
        const remainingQuery = `SELECT COUNT(*) as remaining_count FROM activity_relationship_view WHERE relationship_status = 'Incomplete'` + (projectId && projectId !== 'all' ? ` AND project_id = $1` : '');
        const totalQuery = `SELECT COUNT(*) as total_count FROM activity_relationship_view` + (projectId && projectId !== 'all' ? ` WHERE project_id = $1` : '');
        
        const params = projectId && projectId !== 'all' ? [projectId] : [];
        
        // Get leads count, remaining relationships count, and total relationships count
        const [leadsResult, remainingResult, totalResult] = await Promise.all([
            db.query(leadsQuery, params),
            db.query(remainingQuery, params),
            db.query(totalQuery, params)
        ]);
        
        const leadsCount = leadsResult.rows[0]?.leads_count || 0;
        const remainingCount = remainingResult.rows[0]?.remaining_count || 0;
        const totalCount = totalResult.rows[0]?.total_count || 0;
        const leadPercentage = remainingCount > 0 ? Math.round((leadsCount * 100.0) / remainingCount * 100) / 100 : 0;
        
        res.json({
            Total_Relationship_Count: totalCount,
            Remaining_Relationship_Count: remainingCount,
            Leads_Count: leadsCount,
            lead_Percentage: leadPercentage
        });
    } catch (error) {
        console.error(`${logPrefix} Error in leads-kpi endpoint:`, error);
        res.status(500).json({ error: 'Failed to fetch leads KPI data' });
    }
});

// Leads chart data endpoint
app.get('/api/schedule/leads-chart-data', async (req, res) => {
    const logPrefix = '[Server /api/schedule/leads-chart-data]';
    try {
        const projectId = req.query.project_id;
        
        // Use PostgreSQL leads chart query from migration script
        let query = `
            SELECT 
                lag,
                relationship_type,
                COUNT(*) as count
            FROM activity_relationship_view 
            WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) < 0
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` AND project_id = $1`;
            params.push(projectId);
        }
        
        query += ` GROUP BY lag, relationship_type ORDER BY lag, relationship_type`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(`${logPrefix} Error in leads-chart-data endpoint:`, error);
        res.status(500).json({ error: 'Failed to fetch leads chart data' });
    }
});

// Leads percentage history endpoint
app.get('/api/schedule/leads-percentage-history', async (req, res) => {
    const logPrefix = '[Server /api/schedule/leads-percentage-history]';
    try {
        const projectId = req.query.project_id;
        
        // Calculate leads percentage history directly from activity_relationship_view
        let query = `
            SELECT
                TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
                COUNT(CASE WHEN CAST(a.lag AS REAL) < 0 THEN 1 END) * 100.0 / 
                NULLIF(COUNT(*), 0) as percentage
            FROM activity_relationship_view a
            INNER JOIN project p ON a.project_id = p.proj_id
            WHERE a.relationship_status = 'Incomplete'
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` AND a.project_id = $1`;
            params.push(projectId);
        }
        
        query += ` GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') ORDER BY date`;

        const result = await db.query(query, params);

        // Transform data to match expected format
        const transformedData = result.rows.map(row => ({
            date: row.date,
            percentage: Math.round(row.percentage * 100) / 100 // Round to 2 decimal places
        }));

        res.json(transformedData);
    } catch (error) {
        console.error(`${logPrefix} Error in leads-percentage-history endpoint:`, error);
        res.status(500).json({ error: 'Failed to fetch leads history data' });
    }
});

// Leads table data endpoint
app.get('/api/schedule/leads', async (req, res) => {
    const logPrefix = '[Server /api/schedule/leads]';
    try {
        const projectId = req.query.project_id;
        const limit = req.query.limit || 20;
        
        // Use PostgreSQL leads detail query from migration script
        let query = `
            SELECT
                activity_id as "Pred. ID",
                activity_id2 as "Succ. ID", 
                activity_name as "Pred. Name",
                activity_name2 as "Succ. Name",
                relationship_type as "Relationship type",
                lag as "Lag",
                driving as "Driving",
                free_float as "FreeFloat",
                lead as "Lead",
                excessive_lag as "ExcessiveLag",
                relationship_status as "Relationship_Status"
            FROM activity_relationship_view 
            WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) < 0
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` AND project_id = $1`;
            params.push(projectId);
        }
        
        query += ` ORDER BY lag, relationship_type LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(`${logPrefix} Error in leads endpoint:`, error);
        res.status(500).json({ error: 'Failed to fetch leads data' });
    }
});

// Lags KPI endpoint
app.get('/api/schedule/lags-kpi', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        // Use PostgreSQL lags KPI query from migration script
        
        // Convert to PostgreSQL queries
        const lagsQuery = `SELECT COUNT(*) as lags_count FROM activity_relationship_view WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) > 0` + (projectId && projectId !== 'all' ? ` AND project_id = $1` : '');
        const remainingQuery = `SELECT COUNT(*) as remaining_count FROM activity_relationship_view WHERE relationship_status = 'Incomplete'` + (projectId && projectId !== 'all' ? ` AND project_id = $1` : '');
        
        const queryParams = projectId && projectId !== 'all' ? [projectId] : [];
        
        const [result, remainingResult] = await Promise.all([
            db.query(lagsQuery, queryParams),
            db.query(remainingQuery, queryParams)
        ]);
        
        const lagsCount = result.rows[0]?.lags_count || 0;
        const remainingCount = remainingResult.rows[0]?.remaining_count || 0;
        const lagPercentage = remainingCount > 0 ? Math.round((lagsCount * 100.0) / remainingCount * 100) / 100 : 0;
        
        res.json({
            Total_Relationship_Count: remainingCount,
            Remaining_Relationship_Count: remainingCount,
            Lags_Count: lagsCount,
            lag_Percentage: lagPercentage
        });
    } catch (error) {
        console.error('[Schedule API] Error in lags-kpi endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch lags KPI data' });
    }
});

// Lags chart data endpoint
app.get('/api/schedule/lags-chart-data', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        // Use PostgreSQL lags chart query from migration script
        let query = `
            SELECT 
                lag,
                relationship_type,
                COUNT(*) as count
            FROM activity_relationship_view 
            WHERE relationship_status = 'Incomplete' AND CAST(lag AS REAL) > 0
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` AND project_id = $1`;
            params.push(projectId);
        }
        
        query += ` GROUP BY lag, relationship_type ORDER BY lag, relationship_type`;
        
        const result = await db.query(query, params);
        const rows = result.rows;
        
        res.json(rows);
    } catch (error) {
        console.error('[Schedule API] Error in lags-chart-data endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch lags chart data' });
    }
});

// Lags percentage history endpoint
app.get('/api/schedule/lags-percentage-history', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        // Calculate lags percentage history directly from activity_relationship_view
        let query = `
            SELECT
                TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
                COUNT(CASE WHEN CAST(a.lag AS REAL) > 0 THEN 1 END) * 100.0 / 
                NULLIF(COUNT(*), 0) as percentage
            FROM activity_relationship_view a
            INNER JOIN project p ON a.project_id = p.proj_id
            WHERE a.relationship_status = 'Incomplete'
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` AND a.project_id = $1`;
            params.push(projectId);
        }
        
        query += ` GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') ORDER BY date`;

        const result = await db.query(query, params);

        // Transform data to match expected format
        const transformedData = result.rows.map(row => ({
            date: row.date,
            percentage: Math.round(row.percentage * 100) / 100
        }));

        res.json(transformedData);
    } catch (error) {
        console.error('[Schedule API] Error in lags-percentage-history endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch lags history data' });
    }
});

// Lags table data endpoint
app.get('/api/schedule/lags', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        const limit = req.query.limit || 20;
        
        let filters = ["relationship_status = 'Incomplete'", "lag != '0'", "lag IS NOT NULL"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `
            SELECT
                activity_id as "Pred. ID",
                activity_id2 as "Succ. ID", 
                activity_name as "Pred. Name",
                activity_name2 as "Succ. Name",
                relationship_type as "Relationship type",
                lag as "Lag",
                driving as "Driving",
                free_float as "FreeFloat",
                lead as "Lead",
                excessive_lag as "ExcessiveLag",
                relationship_status as "Relationship_Status"
            FROM activity_relationship_view
            ${whereClause}
            ORDER BY activity_id
            LIMIT $${params.length + 1}
        `;
        
        params.push(parseInt(limit));
        
        const result = await db.query(query, params);
        const rows = result.rows;
        
        res.json(rows);
    } catch (error) {
        console.error('[Schedule API] Error in lags endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch lags data' });
    }
});

// Excessive Lags KPI endpoint
app.get('/api/schedule/excessive-lags-kpi', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        // Calculate excessive lags KPI directly from activity_relationship_view
        let filters = ["relationship_status = 'Incomplete'", "excessive_lag IS NOT NULL", "excessive_lag != ''"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const excessiveLagsQuery = `SELECT COUNT(*) as excessive_lags_count FROM activity_relationship_view ${whereClause}`;
        const totalQuery = `SELECT COUNT(*) as total_count FROM activity_relationship_view WHERE relationship_status = 'Incomplete'` + (projectId && projectId !== 'all' ? ` AND project_id = $1` : '');
        
        const [excessiveResult, totalResult] = await Promise.all([
            db.query(excessiveLagsQuery, params),
            db.query(totalQuery, projectId && projectId !== 'all' ? [projectId] : [])
        ]);
        
        const excessiveLagsCount = excessiveResult.rows[0]?.excessive_lags_count || 0;
        const totalCount = totalResult.rows[0]?.total_count || 0;
        const excessiveLagPercentage = totalCount > 0 ? Math.round((excessiveLagsCount * 100.0) / totalCount * 100) / 100 : 0;
        
        res.json({
            Total_Relationship_Count: totalCount,
            Remaining_Relationship_Count: totalCount,
            ExcessiveLags_Count: excessiveLagsCount,
            ExcessiveLag_Percentage: excessiveLagPercentage
        });
    } catch (error) {
        console.error('[Schedule API] Error in excessive-lags-kpi endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch excessive lags KPI data' });
    }
});

// Excessive lags count endpoint  
app.get('/api/schedule/excessive-lags-count', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["relationship_status = 'Incomplete'", "excessive_lag > '0'"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `SELECT COUNT(*) as excessive_lags_count FROM activity_relationship_view ${whereClause}`;
        
        const queryResult = await db.query(query, params);
        const result = queryResult.rows[0] || {  excessive_lags_count: 0  };
        
        // Get remaining relationships for percentage calculation
        let remainingFilters = ["relationship_status = 'Incomplete'"];
        const remainingParams = [];
        if (projectId && projectId !== 'all') {
            remainingFilters.push('project_id = $1');
            remainingParams.push(projectId);
        }
        const remainingWhere = remainingFilters.length > 0 ? 'WHERE ' + remainingFilters.join(' AND ') : '';
        
        const remainingQuery = `SELECT COUNT(*) as remaining_count FROM activity_relationship_view ${remainingWhere}`;
        const remainingQueryResult = await db.query(remainingQuery, remainingParams);
        const remainingResult = remainingQueryResult.rows[0] || { remaining_count: 0 };
        
        const excessiveLagsCount = result.excessive_lags_count || 0;
        const remainingCount = remainingResult.remaining_count || 0;
        const excessiveLagPercentage = remainingCount > 0 ? Math.round((excessiveLagsCount * 100.0) / remainingCount * 100) / 100 : 0;
        
        res.json({
            Total_Relationship_Count: remainingCount,
            Remaining_Relationship_Count: remainingCount,
            excessive_lags_Count: excessiveLagsCount,
            Excessivelag_Percentage: excessiveLagPercentage
        });
    } catch (error) {
        console.error('[Schedule API] Error in excessive-lags-count endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch excessive lags count data' });
    }
});

// Excessive lags chart data endpoint
app.get('/api/schedule/excessive-lags-chart-data', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["relationship_status = 'Incomplete'", "excessive_lag > '0'"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `
            SELECT 
                excessive_lag as lag,
                relationship_type as relationship_type,
                COUNT(*) as count
            FROM activity_relationship_view 
            ${whereClause}
            GROUP BY excessive_lag, relationship_type
            ORDER BY excessive_lag, relationship_type
        `;
        
        const result = await db.query(query, params);
        const rows = result.rows;
        
        res.json(rows);
    } catch (error) {
        console.error('[Schedule API] Error in excessive-lags-chart-data endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch excessive lags chart data' });
    }
});

// Excessive lags table data endpoint
app.get('/api/schedule/excessive-lags', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        const limit = req.query.limit || 20;
        
        let filters = ["relationship_status = 'Incomplete'", "excessive_lag > '0'"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `
            SELECT
                activity_id as "Pred. ID",
                activity_id2 as "Succ. ID", 
                activity_name as "Pred. Name",
                activity_name2 as "Succ. Name",
                relationship_type as "Relationship type",
                lag as "Lag",
                driving as "Driving",
                free_float as "FreeFloat",
                lead as "Lead",
                excessive_lag as "ExcessiveLag",
                relationship_status as "Relationship_Status"
            FROM activity_relationship_view
            ${whereClause}
            ORDER BY activity_id
            LIMIT $${params.length + 1}
        `;
        
        params.push(parseInt(limit));
        
        const result = await db.query(query, params);
        const rows = result.rows;
        
        res.json(rows);
    } catch (error) {
        console.error('[Schedule API] Error in excessive-lags endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch excessive lags data' });
    }
});

// FS KPI endpoint
app.get('/api/schedule/fs-kpi', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["relationship_status = 'Incomplete'", "relationship_type = 'PR_FS'", "lag = '0'"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `SELECT COUNT(*) as fs_count FROM activity_relationship_view ${whereClause}`;
        
        const queryResult = await db.query(query, params);
        const result = queryResult.rows[0] || {  fs_count: 0  };
        
        // Get remaining relationships for percentage calculation
        let remainingFilters = ["relationship_status = 'Incomplete'"];
        const remainingParams = [];
        if (projectId && projectId !== 'all') {
            remainingFilters.push('project_id = $1');
            remainingParams.push(projectId);
        }
        const remainingWhere = remainingFilters.length > 0 ? 'WHERE ' + remainingFilters.join(' AND ') : '';
        
        const remainingQuery = `SELECT COUNT(*) as remaining_count FROM activity_relationship_view ${remainingWhere}`;
        const remainingQueryResult = await db.query(remainingQuery, remainingParams);
        const remainingResult = remainingQueryResult.rows[0] || { remaining_count: 0 };
        
        const fsCount = result.fs_count || 0;
        const remainingCount = remainingResult.remaining_count || 0;
        const fsPercentage = remainingCount > 0 ? Math.round((fsCount * 100.0) / remainingCount * 100) / 100 : 0;
        
        res.json({
            Total_Relationship_Count: remainingCount,
            Remaining_Relationship_Count: remainingCount,
            FS_Count: fsCount,
            FS_Percentage: fsPercentage
        });
    } catch (error) {
        console.error('[Schedule API] Error in fs-kpi endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch FS KPI data' });
    }
});

// Non-FS KPI endpoint
app.get('/api/schedule/non-fs-kpi', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["relationship_status = 'Incomplete'", "(relationship_type != 'PR_FS' OR lag != '0')"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `SELECT COUNT(*) as non_fs_count FROM activity_relationship_view ${whereClause}`;
        
        const queryResult = await db.query(query, params);
        const result = queryResult.rows[0] || {  non_fs_count: 0  };
        
        // Get remaining relationships for percentage calculation
        let remainingFilters = ["relationship_status = 'Incomplete'"];
        const remainingParams = [];
        if (projectId && projectId !== 'all') {
            remainingFilters.push('project_id = $1');
            remainingParams.push(projectId);
        }
        const remainingWhere = remainingFilters.length > 0 ? 'WHERE ' + remainingFilters.join(' AND ') : '';
        
        const remainingQuery = `SELECT COUNT(*) as remaining_count FROM activity_relationship_view ${remainingWhere}`;
        const remainingQueryResult = await db.query(remainingQuery, remainingParams);
        const remainingResult = remainingQueryResult.rows[0] || { remaining_count: 0 };
        
        const nonFsCount = result.non_fs_count || 0;
        const remainingCount = remainingResult.remaining_count || 0;
        const nonFsPercentage = remainingCount > 0 ? Math.round((nonFsCount * 100.0) / remainingCount * 100) / 100 : 0;
        
        res.json({
            Total_Relationship_Count: remainingCount,
            Remaining_Relationship_Count: remainingCount,
            NonFS_Count: nonFsCount,
            NonFS_Percentage: nonFsPercentage
        });
    } catch (error) {
        console.error('[Schedule API] Error in non-fs-kpi endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch Non-FS KPI data' });
    }
});

// FS chart data endpoint
app.get('/api/schedule/fs-chart-data', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["relationship_status = 'Incomplete'", "relationship_type = 'PR_FS'", "lag = '0'"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `
            SELECT 
                relationship_type as relationship_type,
                COUNT(*) as count
            FROM activity_relationship_view 
            ${whereClause}
            GROUP BY relationship_type
            ORDER BY relationship_type
        `;
        
        const result = await db.query(query, params);
        const rows = result.rows;
        
        res.json(rows);
    } catch (error) {
        console.error('[Schedule API] Error in fs-chart-data endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch FS chart data' });
    }
});

// Non-FS chart data endpoint
app.get('/api/schedule/non-fs-chart-data', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["relationship_status = 'Incomplete'", "(relationship_type != 'PR_FS' OR lag != '0')"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `
            SELECT 
                relationship_type as relationship_type,
                COUNT(*) as count
            FROM activity_relationship_view 
            ${whereClause}
            GROUP BY relationship_type
            ORDER BY relationship_type
        `;
        
        const result = await db.query(query, params);
        const rows = result.rows;
        
        res.json(rows);
    } catch (error) {
        console.error('[Schedule API] Error in non-fs-chart-data endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch Non-FS chart data' });
    }
});

// FS table data endpoint
app.get('/api/schedule/fs', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        const limit = req.query.limit || 20;
        
        let filters = ["relationship_status = 'Incomplete'", "relationship_type = 'PR_FS'", "lag = '0'"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `
            SELECT
                activity_id as "Pred. ID",
                activity_id2 as "Succ. ID", 
                activity_name as "Pred. Name",
                activity_name2 as "Succ. Name",
                relationship_type as "Relationship type",
                lag as "Lag",
                driving as "Driving",
                free_float as "FreeFloat",
                lead as "Lead",
                excessive_lag as "ExcessiveLag",
                relationship_status as "Relationship_Status"
            FROM activity_relationship_view
            ${whereClause}
            ORDER BY activity_id
            LIMIT $${params.length + 1}
        `;
        
        params.push(parseInt(limit));
        
        const result = await db.query(query, params);
        const rows = result.rows;
        
        res.json(rows);
    } catch (error) {
        console.error('[Schedule API] Error in fs endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch FS data' });
    }
});

// Non-FS table data endpoint
app.get('/api/schedule/non-fs', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        const limit = req.query.limit || 20;
        
        let filters = ["relationship_status = 'Incomplete'", "(relationship_type != 'PR_FS' OR lag != '0')"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        const query = `
            SELECT
                activity_id as "Pred. ID",
                activity_id2 as "Succ. ID", 
                activity_name as "Pred. Name",
                activity_name2 as "Succ. Name",
                relationship_type as "Relationship type",
                lag as "Lag",
                driving as "Driving",
                free_float as "FreeFloat",
                lead as "Lead",
                excessive_lag as "ExcessiveLag",
                relationship_status as "Relationship_Status"
            FROM activity_relationship_view
            ${whereClause}
            ORDER BY activity_id
            LIMIT $${params.length + 1}
        `;
        
        params.push(parseInt(limit));
        
        const result = await db.query(query, params);
        const rows = result.rows;
        
        res.json(rows);
    } catch (error) {
        console.error('[Schedule API] Error in non-fs endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch Non-FS data' });
    }
});

// Line chart endpoints for history data - these have a different issue with JOIN
app.get('/api/schedule/fs-line-chart', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        // Calculate FS line chart data directly from activity_relationship_view
        let query = `
            SELECT
                TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
                COUNT(CASE WHEN a.relationship_type = 'PR_FS' AND a.lag = '0' THEN 1 END) * 100.0 / 
                NULLIF(COUNT(*), 0) as percentage
            FROM activity_relationship_view a
            INNER JOIN project p ON a.project_id = p.proj_id
            WHERE a.relationship_status = 'Incomplete'
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` AND a.project_id = $1`;
            params.push(projectId);
        }
        
        query += ` GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') ORDER BY date`;

        const result = await db.query(query, params);

        const transformedData = result.rows.map(row => ({
            date: row.date,
            value: Math.round(row.percentage * 100) / 100
        }));

        res.json(transformedData);
    } catch (error) {
        console.error('[Schedule API] Error in fs-line-chart endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch FS line chart data' });
    }
});

app.get('/api/schedule/non-fs-line-chart', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["f.relationship_percentage IS NOT NULL", "(a.relationship_type != 'PR_FS' OR a.lag != '0')"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('f.project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        // Fix the JOIN by casting project_id to match data types
        const query = `
            SELECT
                TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
                AVG(f.relationship_percentage) as percentage
            FROM final_activity_kpi_view f
            INNER JOIN project p ON CAST(f.project_id AS VARCHAR) = p.proj_id
            INNER JOIN activity_relationship_view a ON CAST(f.project_id AS VARCHAR) = a.project_id
            ${whereClause}
            GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM')
            ORDER BY date
        `;

        const result = await db.query(query, params);
        const rows = result.rows;

        const transformedData = rows.map(row => ({
            date: row.date,
            value: Math.round(row.percentage * 100) / 100
        }));

        res.json(transformedData);
    } catch (error) {
        console.error('[Schedule API] Error in non-fs-line-chart endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch Non-FS line chart data' });
    }
});

app.get('/api/schedule/excessive-lags-line-chart', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["f.relationship_percentage IS NOT NULL", "a.excessive_lag > '0'"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('f.project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        // Fix the JOIN by casting project_id to match data types
        const query = `
            SELECT
                TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
                AVG(f.relationship_percentage) as percentage
            FROM final_activity_kpi_view f
            INNER JOIN project p ON CAST(f.project_id AS VARCHAR) = p.proj_id
            INNER JOIN activity_relationship_view a ON CAST(f.project_id AS VARCHAR) = a.project_id
            ${whereClause}
            GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM')
            ORDER BY date
        `;

        const result = await db.query(query, params);
        const rows = result.rows;

        const transformedData = rows.map(row => ({
            date: row.date,
            value: Math.round(row.percentage * 100) / 100
        }));

        res.json(transformedData);
    } catch (error) {
        console.error('[Schedule API] Error in excessive-lags-line-chart endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch excessive lags line chart data' });
    }
});

// Additional endpoints referenced in JavaScript
app.get('/api/schedule/finalactivitykpi', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        // Return basic activity data from activity_relationship_view
        let query = `
            SELECT 
                project_id,
                activity_id,
                activity_name,
                relationship_status,
                relationship_type,
                lag
            FROM activity_relationship_view
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` WHERE project_id = $1`;
            params.push(projectId);
        }
        
        query += ` LIMIT 100`;
        
        const result = await db.query(query, params);
        
        res.json(result.rows);
    } catch (error) {
        console.error('[Schedule API] Error in finalactivitykpi endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch final activity KPI data' });
    }
});

// Missing history endpoints
app.get('/api/schedule/excessive-lags-percentage-history', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        let filters = ["f.relationship_percentage IS NOT NULL", "a.excessive_lag > '0'"];
        const params = [];
        
        if (projectId && projectId !== 'all') {
            filters.push('f.project_id = $1');
            params.push(projectId);
        }
        
        const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
        
        // Fix the JOIN by casting project_id to match data types
        const query = `
            SELECT
                TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
                AVG(f.relationship_percentage) as percentage
            FROM final_activity_kpi_view f
            INNER JOIN project p ON CAST(f.project_id AS VARCHAR) = p.proj_id
            INNER JOIN activity_relationship_view a ON CAST(f.project_id AS VARCHAR) = a.project_id
            ${whereClause}
            GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM')
            ORDER BY date
        `;

        const result = await db.query(query, params);
        const rows = result.rows;

        const transformedData = rows.map(row => ({
            date: row.date,
            percentage: Math.round(row.percentage * 100) / 100
        }));

        res.json(transformedData);
    } catch (error) {
        console.error('[Schedule API] Error in excessive-lags-percentage-history endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch excessive lags percentage history data' });
    }
});

app.get('/api/schedule/fs-percentage-history', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        // Calculate FS percentage history directly from activity_relationship_view
        let query = `
            SELECT
                TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
                COUNT(CASE WHEN a.relationship_type = 'PR_FS' AND a.lag = '0' THEN 1 END) * 100.0 / 
                NULLIF(COUNT(*), 0) as percentage
            FROM activity_relationship_view a
            INNER JOIN project p ON a.project_id = p.proj_id
            WHERE a.relationship_status = 'Incomplete'
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` AND a.project_id = $1`;
            params.push(projectId);
        }
        
        query += ` GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') ORDER BY date`;

        const result = await db.query(query, params);

        const transformedData = result.rows.map(row => ({
            date: row.date,
            percentage: Math.round(row.percentage * 100) / 100
        }));

        res.json(transformedData);
    } catch (error) {
        console.error('[Schedule API] Error in fs-percentage-history endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch FS history data' });
    }
});

app.get('/api/schedule/non-fs-percentage-history', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        
        // Calculate Non-FS percentage history directly from activity_relationship_view
        let query = `
            SELECT
                TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') as date,
                COUNT(CASE WHEN a.relationship_type != 'PR_FS' OR a.lag != '0' THEN 1 END) * 100.0 / 
                NULLIF(COUNT(*), 0) as percentage
            FROM activity_relationship_view a
            INNER JOIN project p ON a.project_id = p.proj_id
            WHERE a.relationship_status = 'Incomplete'
        `;
        
        const params = [];
        if (projectId && projectId !== 'all') {
            query += ` AND a.project_id = $1`;
            params.push(projectId);
        }
        
        query += ` GROUP BY TO_CHAR(p.last_recalc_date::DATE, 'YYYY-MM') ORDER BY date`;

        const result = await db.query(query, params);

        const transformedData = result.rows.map(row => ({
            date: row.date,
            percentage: Math.round(row.percentage * 100) / 100
        }));

        res.json(transformedData);
    } catch (error) {
        console.error('[Schedule API] Error in non-fs-percentage-history endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch Non-FS history data' });
    }
});

// ============================================================================
// END SCHEDULE DRILLDOWN API ENDPOINTS
// ============================================================================

// Portfolio Management API endpoint for dynamic SQL queries
app.post('/api/database/query', async (req, res) => {
    const logPrefix = '[Server /api/database/query]';
    const { query, params } = req.body;

    // Validate and sanitize params
    const queryParams = Array.isArray(params) ? params : [];

    console.log(`${logPrefix} Request received:`, { 
        query: query?.substring(0, 100) + '...',
        params: queryParams 
    });

    if (!query) {
        console.error(`${logPrefix} Query is required.`);
        return res.status(400).json({ error: 'Query is required' });
    }

    // Basic security check - only allow SELECT statements
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
        console.error(`${logPrefix} Only SELECT queries are allowed.`);
        return res.status(403).json({ error: 'Only SELECT queries are allowed' });
    }

    // Convert SQLite-style ? placeholders to PostgreSQL-style $1, $2, $3 placeholders
    let convertedQuery = query;
    const placeholderCount = (query.match(/\?/g) || []).length;
    
    if (placeholderCount > 0) {
        let paramIndex = 1;
        convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    }
    
    if (placeholderCount !== queryParams.length) {
        console.error(`${logPrefix} Parameter count mismatch. Query has ${placeholderCount} placeholders but ${queryParams.length} parameters provided.`);
        return res.status(400).json({ 
            error: `Parameter count mismatch. Query expects ${placeholderCount} parameters but ${queryParams.length} provided.` 
        });
    }

    console.log(`${logPrefix} Original query: ${query}`);
    console.log(`${logPrefix} Converted query: ${convertedQuery}`);
    console.log(`${logPrefix} With parameters: ${JSON.stringify(queryParams)}`);

    try {
        // Execute the query using the global database connection with parameters
        const result = await db.query(convertedQuery, queryParams);
        const rows = result.rows;

        console.log(`${logPrefix} Query returned ${rows.length} rows.`);

        if (rows.length === 0) {
            console.warn(`${logPrefix} No data found for query.`);
            // Return empty array but with a 200 status (not an error, just no data)
            return res.json([]);
        }

        // Log first row sample for debugging (if needed)
        if (rows.length > 0) {
            console.log(`${logPrefix} First row sample:`, Object.keys(rows[0]));
        }

        // Return the results as JSON
        res.json(rows);
    } catch (err) {
        console.error(`${logPrefix} Error executing query:`, err.message);
        res.status(500).json({ error: `Failed to execute query: ${err.message}` });
    }
});

// Fallback route for SPA - Moved to after all API endpoints
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`[Server] Backend server running at http://localhost:${PORT}`);
  console.log(`[Server] Using PostgreSQL database`);
  console.log(`[Server] API routes available at: http://localhost:${PORT}/api/`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Server] SIGINT signal received: closing PostgreSQL database connection.');
  db.end().then(() => {
    console.log('[Server] Closed the database connection.');
    process.exit(0);
  }).catch((err) => {
    console.error('[Server] Error closing database connection:', err.message);
    process.exit(1);
  });
});