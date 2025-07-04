// Add sample data fallback at the top of the file
// Sample project data for testing or fallback
const sampleProjectData = {
    tables: {
        PROJECT: [{
            proj_id: 'SAMPLE_PROJ',
            proj_short_name: 'Sample Project',
            proj_name: 'Sample Project for Testing',
            plan_start_date: '2025-01-01',
            plan_end_date: '2025-12-31',
            scd_end_date: '2026-01-15',
            last_recalc_date: '2025-06-15',
            status_code: 'A'
        }],
        PROJWBS: [
            {
                wbs_id: 'WBS1',
                proj_id: 'SAMPLE_PROJ',
                wbs_code: 'DC',
                wbs_name: 'DataCenter Project',
                parent_wbs_id: null,
                status_code: 'A',
                wbs_short_name: 'DC'
            },
            {
                wbs_id: 'WBS2',
                proj_id: 'SAMPLE_PROJ',
                wbs_code: 'DC-L1',
                wbs_name: 'Level 1',
                parent_wbs_id: 'WBS1',
                status_code: 'A',
                wbs_short_name: 'L1'
            },
            {
                wbs_id: 'WBS3',
                proj_id: 'SAMPLE_PROJ',
                wbs_code: 'DC-L1-STRUCT',
                wbs_name: 'Structural Elements L1',
                parent_wbs_id: 'WBS2',
                status_code: 'A',
                wbs_short_name: 'L1-STR'
            },
            {
                wbs_id: 'WBS4',
                proj_id: 'SAMPLE_PROJ',
                wbs_code: 'DC-L1-STRUCT-WALL',
                wbs_name: 'Walls L1',
                parent_wbs_id: 'WBS3',
                status_code: 'A',
                wbs_short_name: 'L1-WALL'
            },
            {
                wbs_id: 'WBS5',
                proj_id: 'SAMPLE_PROJ',
                wbs_code: 'DC-L1-STRUCT-COL',
                wbs_name: 'Columns L1',
                parent_wbs_id: 'WBS3',
                status_code: 'A',
                wbs_short_name: 'L1-COL'
            },
            {
                wbs_id: 'WBS6',
                proj_id: 'SAMPLE_PROJ',
                wbs_code: 'DC-L2',
                wbs_name: 'Level 2',
                parent_wbs_id: 'WBS1',
                status_code: 'A',
                wbs_short_name: 'L2'
            },
            {
                wbs_id: 'WBS7',
                proj_id: 'SAMPLE_PROJ',
                wbs_code: 'DC-L2-STRUCT',
                wbs_name: 'Structural Elements L2',
                parent_wbs_id: 'WBS6',
                status_code: 'A',
                wbs_short_name: 'L2-STR'
            },
            {
                wbs_id: 'WBS8',
                proj_id: 'SAMPLE_PROJ',
                wbs_code: 'DC-L2-STRUCT-WALL',
                wbs_name: 'Walls L2',
                parent_wbs_id: 'WBS7',
                status_code: 'A',
                wbs_short_name: 'L2-WALL'
            }
        ],
        TASK: [
            {
                task_id: 'T1000',
                task_code: 'A1000',
                task_name: 'Project Planning',
                task_type: 'TT_Task',
                status_code: 'TK_Complete',
                driving_path_flag: 'Y',
                start_date: '2025-01-01',
                finish_date: '2025-02-15',
                duration: 30
            },
            {
                task_id: 'T1001',
                task_code: 'A1001',
                task_name: 'Requirements Gathering',
                task_type: 'TT_Task',
                status_code: 'TK_Complete',
                driving_path_flag: 'Y',
                start_date: '2025-02-16',
                finish_date: '2025-03-15',
                duration: 20
            },
            {
                task_id: 'T1002',
                task_code: 'A1002',
                task_name: 'Design Phase',
                task_type: 'TT_Task',
                status_code: 'TK_Complete',
                driving_path_flag: 'Y',
                start_date: '2025-03-16',
                finish_date: '2025-04-30',
                duration: 30
            },
            {
                task_id: 'T1003',
                task_code: 'M1',
                task_name: 'Design Approval',
                task_type: 'TT_Mile',
                status_code: 'TK_Complete',
                driving_path_flag: 'Y',
                start_date: '2025-04-30',
                finish_date: '2025-04-30',
                duration: 0
            },
            {
                task_id: 'T1004',
                task_code: 'A1003',
                task_name: 'Implementation',
                task_type: 'TT_Task',
                status_code: 'TK_Active',
                driving_path_flag: 'Y',
                start_date: '2025-05-01',
                finish_date: '2025-08-31',
                duration: 90
            },
            {
                task_id: 'T1005',
                task_code: 'A1004',
                task_name: 'Testing Phase',
                task_type: 'TT_Task',
                status_code: 'TK_NotStart',
                driving_path_flag: 'Y',
                start_date: '2025-09-01',
                finish_date: '2025-10-31',
                duration: 45
            },
            {
                task_id: 'T1006',
                task_code: 'M2',
                task_name: 'Testing Complete',
                task_type: 'TT_Mile',
                status_code: 'TK_NotStart',
                driving_path_flag: 'Y',
                start_date: '2025-10-31',
                finish_date: '2025-10-31',
                duration: 0
            },
            {
                task_id: 'T1007',
                task_code: 'A1005',
                task_name: 'Deployment',
                task_type: 'TT_Task',
                status_code: 'TK_NotStart',
                driving_path_flag: 'Y',
                start_date: '2025-11-01',
                finish_date: '2025-12-15',
                duration: 30
            },
            {
                task_id: 'T1008',
                task_code: 'M3',
                task_name: 'Project Completion',
                task_type: 'TT_Mile',
                status_code: 'TK_NotStart',
                driving_path_flag: 'Y',
                start_date: '2025-12-31',
                finish_date: '2025-12-31',
                duration: 0
            },
            {
                task_id: 'T2001',
                task_code: 'B1001',
                task_name: 'Documentation',
                task_type: 'TT_Task',
                status_code: 'TK_Active',
                driving_path_flag: 'N',
                start_date: '2025-03-01',
                finish_date: '2025-11-30',
                duration: 180
            }
        ]
    }
};

// Settings page JavaScript  
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Settings page loaded');
    
    try {
        // First, load projects into dropdown
        await loadProjects();
        
        // Set up project selection event listener
        setupProjectEventListener();
        
        // Check if there's a previously selected project
        const currentProjectId = localStorage.getItem('selectedProjectId');
        if (currentProjectId) {
            const projectFilter = document.getElementById('projectFilter');
            if (projectFilter) {
                projectFilter.value = currentProjectId;
                
                // Update current project ID display
                const currentProjectIdElement = document.getElementById('currentProjectId');
                if (currentProjectIdElement) {
                    currentProjectIdElement.textContent = currentProjectId;
                }
                
                await loadProjectData(currentProjectId);
            }
        } else {
            // Initialize with sample data if no project is selected
            console.log('No project selected initially, using sample data');
            await generateProjectInformationReport(sampleProjectData);
            generateActivitiesStatusChart(sampleProjectData);
            generateMilestonesStatusChart(sampleProjectData);
            generateCriticalStatusChart(sampleProjectData);
        }
        
    } catch (error) {
        console.error('Error loading projects:', error);
        console.log('Falling back to sample data');
        await generateProjectInformationReport(sampleProjectData);
        generateActivitiesStatusChart(sampleProjectData);
        generateMilestonesStatusChart(sampleProjectData);
        generateCriticalStatusChart(sampleProjectData);
    }
});

// Function to load projects into dropdown
async function loadProjects() {
    try {
        const response = await fetch('/api/gantt/projects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const projects = await response.json();
        
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter) {
            // Clear existing options
            projectFilter.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a project...';
            projectFilter.appendChild(defaultOption);
            
            // Add project options
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.proj_id;
                option.textContent = `${project.proj_short_name || project.proj_name || project.proj_id}`;
                projectFilter.appendChild(option);
            });
            
            console.log('Loaded', projects.length, 'projects into dropdown');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        // Keep the default "Select a project..." option
    }
}

// Function to set up project selection event listener
function setupProjectEventListener() {
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
        projectFilter.addEventListener('change', async (e) => {
            const projectId = e.target.value;
            if (projectId) {
                console.log('Project selected:', projectId);
                
                // Store selection in localStorage
                localStorage.setItem('selectedProjectId', projectId);
                
                // Update current project ID display
                const currentProjectIdElement = document.getElementById('currentProjectId');
                if (currentProjectIdElement) {
                    currentProjectIdElement.textContent = projectId;
                }
                
                // Update project status display
                const projectStatusElement = document.getElementById('projectStatusDisplay');
                if (projectStatusElement) {
                    projectStatusElement.textContent = 'Loading...';
                }
                
                // Load business project details using the project ID
                const businessProject = await fetchBusinessProjectDetails(projectId);
                updateBusinessProjectDetails(businessProject);
                
                // Load project data and update charts
                await loadProjectData(projectId);
            } else {
                // Clear localStorage
                localStorage.removeItem('selectedProjectId');
                
                // Clear project ID display
                const currentProjectIdElement = document.getElementById('currentProjectId');
                if (currentProjectIdElement) {
                    currentProjectIdElement.textContent = 'N/A';
                }
                
                // Reset status
                const projectStatusElement = document.getElementById('projectStatusDisplay');
                if (projectStatusElement) {
                    projectStatusElement.textContent = 'Ready';
                }
                
                // Clear business project details
                updateBusinessProjectDetails(null);
                
                // Load sample data when no project is selected
                await generateProjectInformationReport(sampleProjectData);
                generateActivitiesStatusChart(sampleProjectData);
                generateMilestonesStatusChart(sampleProjectData);
                generateCriticalStatusChart(sampleProjectData);
            }
        });
    }
}

// Function to load project data and update all visualizations
async function loadProjectData(projectId) {
    try {
        console.log('Loading data for project:', projectId);
        
        // Load business project details using the project ID
        const businessProject = await fetchBusinessProjectDetails(projectId);
        updateBusinessProjectDetails(businessProject);
        
        // Fetch project data using the existing fetchProjectData function
        await fetchProjectData(projectId);
        
        // Update project status
        const projectStatusElement = document.getElementById('projectStatusDisplay');
        if (projectStatusElement) {
            projectStatusElement.textContent = 'Active';
        }
        
        showToast('Project data loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading project data:', error);
        
        // Update status to show error
        const projectStatusElement = document.getElementById('projectStatusDisplay');
        if (projectStatusElement) {
            projectStatusElement.textContent = 'Error';
        }
        
        showToast('Error loading project data, using sample data', 'warning');
        
        // Fall back to sample data
        await generateProjectInformationReport(sampleProjectData);
        generateActivitiesStatusChart(sampleProjectData);
        generateMilestonesStatusChart(sampleProjectData);
        generateCriticalStatusChart(sampleProjectData);
    }
}

// Function to fetch project data from the database API
async function fetchProjectData(projectId) {
    try {
        // Show loading indicator
        showToast('Loading project data...', 'info');
        
        let useSampleData = false;
        let projectData = null;
        let tasks = null;
        let wbsData = null;
        
        try {
            // Fetch project information
            const projectResponse = await fetch(`/api/database/table/PROJECT?projectId=${projectId}`);
            if (!projectResponse.ok) {
                throw new Error(`Failed to fetch project data: ${projectResponse.status}`);
            }
            projectData = await projectResponse.json();
            console.log('DEBUG: Raw PROJECT data from API:', projectData);
            
            // Fetch tasks using the gantt/activities endpoint which has better formatting
            const tasksResponse = await fetch(`/api/gantt/activities?projectId=${projectId}`);
            if (!tasksResponse.ok) {
                throw new Error(`Failed to fetch tasks data: ${tasksResponse.status}`);
            }
            const tasksFromGantt = await tasksResponse.json();
            console.log('DEBUG: Raw tasks data from Gantt API:', tasksFromGantt);
            
            // Fallback to the basic TASK table if needed
            if (!tasksFromGantt || tasksFromGantt.length === 0) {
                const basicTasksResponse = await fetch(`/api/database/table/TASK?projectId=${projectId}`);
                if (basicTasksResponse.ok) {
                    tasks = await basicTasksResponse.json();
                    console.log('DEBUG: Raw TASK data from basic API:', tasks);
                }
            } else {
                tasks = tasksFromGantt.map(task => ({
                    // Map the gantt endpoint fields to what our charts expect
                    task_id: task.task_id,
                    task_code: task.task_code,
                    task_name: task.task_name,
                    task_type: determineTaskType(task), // Helper function to determine type
                    status_code: task.status,
                    driving_path_flag: task.critical === 'Y' || task.critical === true ? 'Y' : 'N',
                    // Add other fields as needed
                    start_date: task.startDate,
                    finish_date: task.endDate,
                    duration: task.duration,
                    wbs_id: task.wbs_id
                }));
            }
            
            // Fetch WBS data
            try {
                const wbsResponse = await fetch(`/api/database/table/PROJWBS?projectId=${projectId}`);
                if (wbsResponse.ok) {
                    wbsData = await wbsResponse.json();
                    console.log('DEBUG: Raw PROJWBS data from API:', wbsData);
                } else {
                    console.warn(`Failed to fetch WBS data: ${wbsResponse.status}`);
                }
            } catch (wbsError) {
                console.warn('Error fetching WBS data:', wbsError);
            }
            
        } catch (error) {
            console.error('Error fetching from API, will use sample data:', error);
            useSampleData = true;
        }
        
        // Check if we have data, otherwise use sample data
        if (useSampleData || !projectData || (Array.isArray(projectData) && projectData.length === 0) || !tasks || tasks.length === 0) {
            console.log('Using sample data for visualization');
            showToast('Using sample project data for demonstration', 'info');
            
            // Use the sample data we defined
            projectData = sampleProjectData.tables.PROJECT;
            tasks = sampleProjectData.tables.TASK;
            wbsData = sampleProjectData.tables.PROJWBS;
        }
        
        // Create a structure similar to xerData
        const xerData = {
            tables: {
                PROJECT: Array.isArray(projectData) ? projectData : [projectData],
                TASK: tasks,
                PROJWBS: wbsData || []
            }
        };
        
        console.log('DEBUG: Constructed xerData structure:', xerData);
        
        // Generate project information report
        generateProjectInformationReport(xerData);
        
    } catch (error) {
        console.error('Error fetching project data:', error);
        showToast('Error loading project data: ' + error.message, 'error');
        
        // Use sample data as last resort
        console.log('Using sample data as fallback due to error');
        showToast('Using sample project data as fallback', 'info');
        generateProjectInformationReport(sampleProjectData);
    }
}

// Helper function to determine task type based on available data
function determineTaskType(task) {
    // Try different field names that might indicate task type
    const type = task.task_type || task.type || task.Type;
    if (type) {
        return type;
    }
    
    // Check duration to guess if it's a milestone
    const duration = task.duration || task.Duration || 0;
    if (duration == 0) {
        return 'TT_Mile';
    }
    
    return 'TT_Task';
}

// Function to fetch business project details using proper table relationships
async function fetchBusinessProjectDetails(projectId) {
    try {
        console.log('🔍 Fetching business project details for project ID:', projectId);
        
        // Use the proj_id directly to fetch business project data
        const businessProjectResponse = await fetch('/api/database/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: `
                    SELECT bp.*, p.proj_id
                    FROM businessproject bp
                    INNER JOIN file_metadata fm ON bp.id = fm.business_project_id
                    INNER JOIN project p ON p.file_id = fm.file_id
                    WHERE p.proj_id = ?
                `,
                params: [projectId]
            })
        });
        
        if (!businessProjectResponse.ok) {
            throw new Error(`HTTP ${businessProjectResponse.status}: ${businessProjectResponse.statusText}`);
        }
        
        const businessProjects = await businessProjectResponse.json();
        console.log('✅ Business project data:', businessProjects);
        
        if (businessProjects && businessProjects.length > 0) {
            console.log('📊 Business project fields available:', Object.keys(businessProjects[0]));
        }
        
        if (!businessProjects || businessProjects.length === 0) {
            console.warn('⚠️ No business project found for proj_id:', projectId);
            return null;
        }
        
        return businessProjects[0]; // Return the first match
        
    } catch (error) {
        console.error('❌ Error fetching business project details:', error);
        return null;
    }
}

// Function to update business project details in the UI
function updateBusinessProjectDetails(businessProject) {
    const projectRegion = document.getElementById('projectRegion');
    const projectCountry = document.getElementById('projectCountry');
    const projectMW = document.getElementById('projectMW');
    
    if (businessProject) {
        if (projectRegion) {
            projectRegion.textContent = businessProject.region || '-';
        }
        if (projectCountry) {
            projectCountry.textContent = businessProject.country || '-';
        }
        if (projectMW) {
            projectMW.textContent = businessProject.mw ? `${businessProject.mw} MW` : '-';
        }
        
        console.log('✅ Updated business project details:', {
            region: businessProject.region,
            country: businessProject.country,
            mw: businessProject.mw,
            proj_id: businessProject.proj_id
        });
        
        // Show success toast
        showToast(`Business project details loaded for ${businessProject.name || 'project'}`, 'success');
    } else {
        // Clear fields if no business project found
        if (projectRegion) projectRegion.textContent = '-';
        if (projectCountry) projectCountry.textContent = '-';
        if (projectMW) projectMW.textContent = '-';
        
        console.log('⚠️ No business project found, cleared fields');
        showToast('No business project details found for this project', 'warning');
    }
}

// Function to fetch available projects
async function fetchProjects() {
    try {
        const response = await fetch('/api/database/projects');
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.status}`);
        }
        
        const projects = await response.json();
        
        if (projects.length === 0) {
            showToast('No projects found in database', 'warning');
            return;
        }
        
        // Show project selection
        const projectSelectContainer = document.createElement('div');
        projectSelectContainer.className = 'bg-white shadow rounded-lg p-6 mt-6';
        projectSelectContainer.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Select a Project</h3>
            <select id="projectSelector" class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">-- Select a Project --</option>
                ${projects.map(p => `<option value="${p.proj_id}">${p.proj_name || p.proj_id}</option>`).join('')}
            </select>
            <button id="loadProjectBtn" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                Load Project
            </button>
        `;
        
        // Insert after the first paragraph
        const mainContent = document.querySelector('main');
        const firstParagraph = mainContent.querySelector('p');
        firstParagraph.parentNode.insertBefore(projectSelectContainer, firstParagraph.nextSibling);
        
        // Add event listener to the button
        document.getElementById('loadProjectBtn').addEventListener('click', function() {
            const selectedProjectId = document.getElementById('projectSelector').value;
            if (selectedProjectId) {
                localStorage.setItem('selectedProjectId', selectedProjectId);
                fetchProjectData(selectedProjectId);
                projectSelectContainer.remove(); // Remove the selector after selection
            } else {
                showToast('Please select a project', 'warning');
            }
        });
        
    } catch (error) {
        console.error('Error fetching projects:', error);
        showToast('Error loading projects list: ' + error.message, 'error');
    }
}

function generateProjectInformationReport(xerData) {
    console.log('DEBUG: Project Data:', xerData.tables?.PROJECT);

    // Get the first project from the array and validate it
    const projectData = Array.isArray(xerData.tables?.PROJECT) ? xerData.tables.PROJECT[0] : null;
    const tasks = xerData.tables?.TASK || [];
    console.log(projectData);

    if (!projectData) {
        console.error('No valid project data found');
        showToast('No valid project data available', 'error');
        return;
    }

    try {
        // Validate project data structure
        if (typeof projectData !== 'object') {
            throw new Error('Invalid project data structure');
        }

        // Log all available fields in projectData to help identify what's available
        console.log('DEBUG: All available fields in projectData:', Object.keys(projectData));
        console.log('DEBUG: Full projectData:', projectData);

        console.log('DEBUG: Project Data Structure:', {
            proj_short_name: projectData.proj_short_name,
            proj_name: projectData.proj_name,
            plan_start_date: projectData.plan_start_date,
            plan_end_date: projectData.plan_end_date
        });

        // Try to find date fields with various possible names
        const startDateField = findFirstDefinedField(projectData, [
            'plan_start_date', 'start_date', 'early_start_date', 'act_start_date', 
            'target_start_date', 'planned_start_date', 'startDate'
        ]);
        
        const endDateField = findFirstDefinedField(projectData, [
            'plan_end_date', 'finish_date', 'early_finish_date', 'act_end_date', 
            'target_end_date', 'planned_end_date', 'endDate'
        ]);
        
        const schedEndDateField = findFirstDefinedField(projectData, [
            'scd_end_date', 'scheduled_end_date', 'late_end_date', 'late_finish_date', 
            'plan_end_date', 'finish_date'
        ]);
        
        const dataDateField = findFirstDefinedField(projectData, [
            'last_recalc_date', 'datadate', 'data_date', 'current_date', 'currentDate'
        ]);
        
        console.log('DEBUG: Found date fields:', {
            startDateField,
            endDateField,
            schedEndDateField,
            dataDateField
        });

        // If we don't have start/end dates in the project, try to derive them from tasks
        let startDateFromTasks = null;
        let endDateFromTasks = null;
        
        if (!startDateField || !endDateField) {
            console.log('DEBUG: Attempting to derive project dates from tasks');
            
            if (tasks && tasks.length > 0) {
                // Extract date fields from tasks, looking at different possible field names
                const taskDates = tasks.map(task => {
                    return {
                        start: findFirstDefinedField(task, ['start_date', 'startDate', 'early_start_date', 'act_start_date']),
                        end: findFirstDefinedField(task, ['finish_date', 'endDate', 'early_finish_date', 'act_end_date'])
                    };
                }).filter(dates => dates.start && dates.end);
                
                if (taskDates.length > 0) {
                    // Find earliest start date and latest end date
                    try {
                        const startDates = taskDates.map(d => new Date(d.start)).filter(d => !isNaN(d.getTime()));
                        const endDates = taskDates.map(d => new Date(d.end)).filter(d => !isNaN(d.getTime()));
                        
                        if (startDates.length > 0) {
                            startDateFromTasks = new Date(Math.min(...startDates.map(d => d.getTime()))).toISOString().split('T')[0];
                        }
                        
                        if (endDates.length > 0) {
                            endDateFromTasks = new Date(Math.max(...endDates.map(d => d.getTime()))).toISOString().split('T')[0];
                        }
                        
                        console.log('DEBUG: Derived dates from tasks:', { startDateFromTasks, endDateFromTasks });
                    } catch (e) {
                        console.error('Error deriving dates from tasks:', e);
                    }
                }
            }
        }

        // Safely get project data with fallbacks
        const projectInfo = {
            proj_short_name: projectData.proj_short_name || projectData.proj_name || 'N/A',
            proj_name: projectData.proj_name || projectData.proj_short_name || 'N/A',
            plan_start_date: startDateField ? projectData[startDateField] : startDateFromTasks,
            plan_end_date: endDateField ? projectData[endDateField] : endDateFromTasks,
            scd_end_date: schedEndDateField ? projectData[schedEndDateField] : null,
            DataDate: dataDateField ? projectData[dataDateField] : null,
            proj_id: projectData.proj_id || 'N/A',
            status_code: projectData.status_code || 'A', // 'A' typically means active
            priority_type: projectData.priority_type || 'N/A',
            last_recalc_date: dataDateField ? projectData[dataDateField] : null
        };

        console.log('DEBUG: Processed project info:', projectInfo);

        // If we still don't have dates, set some defaults for demonstration
        if (!projectInfo.plan_start_date || !projectInfo.plan_end_date) {
            console.log('DEBUG: Using default dates for demonstration');
            const today = new Date();
            const startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 3); // 3 months ago
            
            const endDate = new Date(today);
            endDate.setMonth(today.getMonth() + 9); // 9 months from now
            
            projectInfo.plan_start_date = startDate.toISOString().split('T')[0];
            projectInfo.plan_end_date = endDate.toISOString().split('T')[0];
            
            // Set scheduled end date to be 1 month later than planned end date
            const schedEndDate = new Date(endDate);
            schedEndDate.setMonth(endDate.getMonth() + 1);
            projectInfo.scd_end_date = schedEndDate.toISOString().split('T')[0];
            
            // Set data date to today
            projectInfo.DataDate = today.toISOString().split('T')[0];
            projectInfo.last_recalc_date = today.toISOString().split('T')[0];
        }

        // Update project details with enhanced information
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                console.warn(`Element with id ${id} not found`);
            }
        };

        updateElement('projectName', projectInfo.proj_short_name);
        updateElement('plannedStartDate', formatDate(projectInfo.plan_start_date));
        updateElement('plannedEndDate', formatDate(projectInfo.plan_end_date));
        updateElement('scheduledEndDate', formatDate(projectInfo.scd_end_date));
        updateElement('lastRecalcDate', formatDate(projectInfo.DataDate));

        // Calculate project status with more detailed logic
        let status = 'N/A';
        let statusClass = 'text-muted';
        if (projectInfo.plan_end_date && projectInfo.scd_end_date) {
            const today = new Date();
            const plannedEnd = new Date(projectInfo.plan_end_date);
            const scheduledEnd = new Date(projectInfo.scd_end_date);
            
            if (scheduledEnd > plannedEnd) {
                status = 'Delayed';
                statusClass = 'text-danger';
            } else if (today > scheduledEnd) {
                status = 'Overdue';
                statusClass = 'text-danger';
            } else if (today > plannedEnd) {
                status = 'At Risk';
                statusClass = 'text-warning';
            } else {
                status = 'On Track';
                statusClass = 'text-success';
            }
        }
        
        const statusElement = document.getElementById('projectStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = statusClass;
        }

        // Clean up existing charts
        cleanupCharts(['projectTimelineChart', 'activitiesStatusChart', 'milestonesStatusChart', 'criticalStatusChart']);

        try {
            // Generate Project Timeline Chart with enhanced data
            const timelineCanvas = document.getElementById('projectTimelineChart');
            if (!timelineCanvas) {
                console.error('Canvas element not found for project timeline chart');
                return;
            }
            
            const timelineCtx = timelineCanvas.getContext('2d');
            
            // Validate date fields
            if (!projectInfo.plan_start_date || !projectInfo.plan_end_date) {
                console.warn('Missing required date fields for timeline chart');
                showToast('Cannot create timeline chart: missing date fields', 'warning');
                return;
            }
            
            let startDate, endDate, currentDate;
            
            try {
                startDate = new Date(projectInfo.plan_start_date);
                endDate = new Date(projectInfo.plan_end_date);
                currentDate = projectInfo.last_recalc_date ? new Date(projectInfo.last_recalc_date) : new Date();
                
                // Validate dates are valid
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(currentDate.getTime())) {
                    throw new Error('Invalid date format');
                }
                
                console.log('DEBUG: Project dates:', {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    currentDate: currentDate.toISOString()
                });
                
            } catch (error) {
                console.error('Error parsing dates:', error);
                showToast('Error creating timeline chart: invalid date format', 'error');
                return;
            }
            
            const totalDuration = endDate - startDate;
            if (totalDuration <= 0) {
                console.warn('Invalid project duration (end date is before or equal to start date)');
                showToast('Cannot create timeline chart: invalid project duration', 'warning');
                return;
            }
            
            const elapsedDuration = Math.max(0, currentDate - startDate);
            const progress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
            
            // Calculate schedule variance
            const scheduleVariance = endDate - (projectInfo.scd_end_date ? new Date(projectInfo.scd_end_date) : endDate);
            const scheduleVarianceDays = Math.round(scheduleVariance / (1000 * 60 * 60 * 24));
            
            console.log('DEBUG: Timeline calculations:', {
                totalDuration,
                elapsedDuration,
                progress,
                scheduleVariance,
                scheduleVarianceDays
            });
            
            new Chart(timelineCtx, {
                type: 'bar',
                data: {
                    labels: ['Project Timeline'],
                    datasets: [
                        {
                            label: 'Project Duration',
                            data: [100],
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Current Progress',
                            data: [progress],
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                plugins: [ChartDataLabels],
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        datalabels: {
                            display: true,
                            color: '#000',
                            font: {
                                weight: 'bold',
                                size: 12
                            },
                            anchor: 'center',
                            align: 'center',
                            formatter: function(value, context) {
                                return value > 0 ? `${value.toFixed(1)}%` : '';
                            }
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: `Project Timeline Progress (Schedule Variance: ${scheduleVarianceDays} days)`,
                            font: {
                                size: 14
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Progress (%)'
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error generating timeline chart:', error);
            showToast('Error generating timeline chart', 'error');
        }

        // Generate all other charts with enhanced error handling
        try {
            generateActivitiesStatusChart(xerData);
        } catch (error) {
            console.error('Error generating activities status chart:', error);
            showToast('Error generating activities status chart', 'error');
        }

        try {
            generateMilestonesStatusChart(xerData);
        } catch (error) {
            console.error('Error generating milestones status chart:', error);
            showToast('Error generating milestones status chart', 'error');
        }

        try {
            generateCriticalStatusChart(xerData);
        } catch (error) {
            console.error('Error generating critical status chart:', error);
            showToast('Error generating critical status chart', 'error');
        }

        // Generate Activity Hierarchy and WBS Hierarchy tables
        try {
            console.log('Generating Activity Hierarchy...');
            generateActivityHierarchyGantt(xerData);
        } catch (error) {
            console.error('Error generating activity hierarchy:', error);
            showToast('Error generating activity hierarchy: ' + error.message, 'error');
        }

        try {
            console.log('Generating WBS Hierarchy...');
            generateWBSHierarchyGantt(xerData);
        } catch (error) {
            console.error('Error generating WBS hierarchy:', error);
            showToast('Error generating WBS hierarchy: ' + error.message, 'error');
        }

    } catch (error) {
        console.error('Error in generateProjectInformationReport:', error);
        showToast('Error generating project information report: ' + error.message, 'error');
    }
}

function cleanupCharts(chartIds) {
    chartIds.forEach(id => {
        const chart = Chart.getChart(document.getElementById(id));
        if (chart) {
            chart.destroy();
        }
    });
}

function generateActivitiesStatusChart(xerData) {
    try {
        const tasks = xerData.tables?.TASK || [];
        console.log('DEBUG: Tasks data for activities chart:', tasks);
        
        if (!tasks || !tasks.length) {
            console.warn('No tasks data available for activities chart');
            showToast('No task data available for Activities chart', 'warning');
            return;
        }

        // Define status code mappings to handle different formats
        const statusMappings = {
            // Standard P6 codes
            'TK_NotStart': 'Not Started',
            'TK_Active': 'In Progress',
            'TK_Complete': 'Completed',
            'TK_Suspend': 'Suspended',
            // Alternative codes that might be in the data
            'NotStart': 'Not Started',
            'Active': 'In Progress',
            'Complete': 'Completed',
            'Suspend': 'Suspended',
            // Simple codes
            'Not Started': 'Not Started',
            'In Progress': 'In Progress',
            'Completed': 'Completed',
            'Suspended': 'Suspended'
        };

        // Get a list of all available fields in the tasks to help determine what to use
        if (tasks.length > 0) {
            console.log('DEBUG: Available task fields:', Object.keys(tasks[0]));
        }

        // Filter only activities (non-milestones)
        const activities = tasks.filter(task => {
            // Try different ways to identify regular tasks vs milestones
            if (task.task_type) {
                return task.task_type === 'TT_Task' || 
                       task.task_type === 'Task' || 
                      (task.task_type !== 'TT_Mile' && task.task_type !== 'Milestone');
            }
            
            // If task_type isn't available, try other methods
            if (task.milestone !== undefined) {
                return task.milestone !== 'Y' && task.milestone !== true;
            }
            
            // Check duration - milestones typically have 0 duration
            if (task.duration !== undefined) {
                return parseFloat(task.duration) > 0;
            }
            
            // Default to including the task
            return true;
        });
        
        console.log('DEBUG: Filtered activities:', activities);
        
        // Get status codes present in the data
        const statusField = findTaskStatusField(tasks);
        console.log('DEBUG: Using status field:', statusField);
        
        if (!statusField) {
            console.warn('No status field found in tasks');
            showToast('Cannot create activity chart: no status field found', 'warning');
            return;
        }
        
        const statusCodesPresent = [...new Set(tasks.map(task => task[statusField]))];
        console.log('DEBUG: Status codes present:', statusCodesPresent);
        
        // Map status codes to our chart categories
        const statusCounts = {
            'Not Started': 0,
            'In Progress': 0,
            'Completed': 0,
            'Suspended': 0
        };
        
        // Count activities by mapped status
        activities.forEach(task => {
            const status = task[statusField];
            const mappedStatus = statusMappings[status] || 'Not Started'; // Default to Not Started if unknown
            statusCounts[mappedStatus]++;
        });
        
        console.log('DEBUG: Status counts:', statusCounts);

        // Only proceed with the chart if we have data
        if (Object.values(statusCounts).every(count => count === 0)) {
            console.warn('No status data available for activities chart');
            showToast('No status data available for Activities chart', 'warning');
            return;
        }

        const ctx = document.getElementById('activitiesStatusChart');
        if (!ctx) {
            console.error('Canvas element not found for activities status chart');
            return;
        }
        
        const ctxContext = ctx.getContext('2d');
        
        new Chart(ctxContext, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#3498db', // Not Started
                        '#f1c40f', // In Progress
                        '#2ecc71', // Completed
                        '#e74c3c'  // Suspended
                    ],
                    borderWidth: 1
                }]
            },
            plugins: [ChartDataLabels],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        display: true,
                        color: '#000',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        anchor: 'end',
                        align: 'start',
                        offset: 15,
                        borderColor: '#333',
                        borderWidth: 1,
                        borderRadius: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: {
                            top: 2,
                            bottom: 2,
                            left: 6,
                            right: 6
                        },
                        clip: false,
                        formatter: function(value, context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return value > 0 ? `${value} (${percentage}%)` : '';
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Activities Status Distribution',
                        font: {
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error generating activities status chart:', error);
        showToast('Error generating activities status chart', 'error');
    }
}

// Helper function to find the status field in the tasks data
function findTaskStatusField(tasks) {
    if (!tasks || tasks.length === 0) return null;
    
    // Common field names for status
    const possibleStatusFields = [
        'status_code', 'status', 'statusCode', 'task_status', 'taskStatus', 'state'
    ];
    
    // Get the first task to check fields
    const sampleTask = tasks[0];
    
    // Try to find a field that looks like a status field
    for (const field of possibleStatusFields) {
        if (sampleTask[field] !== undefined) {
            return field;
        }
    }
    
    // If we haven't found a status field, look at all fields
    const allFields = Object.keys(sampleTask);
    for (const field of allFields) {
        // Look for fields with 'status' in the name
        if (field.toLowerCase().includes('status')) {
            return field;
        }
    }
    
    // Default to status_code if we can't find anything else
    return 'status_code';
}

function generateMilestonesStatusChart(xerData) {
    try {
        const tasks = xerData.tables?.TASK || [];
        console.log('DEBUG: Tasks data for milestones chart:', tasks);
        
        if (!tasks || !tasks.length) {
            console.warn('No tasks data available for milestones chart');
            showToast('No task data available for Milestones chart', 'warning');
            // Generate some dummy data to show the chart
            createDummyMilestonesChart();
            return;
        }

        // Define status code mappings to handle different formats
        const statusMappings = {
            // Standard P6 codes
            'TK_NotStart': 'Not Started',
            'TK_Active': 'In Progress',
            'TK_Complete': 'Completed',
            'TK_Suspend': 'Suspended',
            // Alternative codes that might be in the data
            'NotStart': 'Not Started',
            'Active': 'In Progress',
            'Complete': 'Completed',
            'Suspend': 'Suspended',
            // Simple codes
            'Not Started': 'Not Started',
            'In Progress': 'In Progress',
            'Completed': 'Completed',
            'Suspended': 'Suspended'
        };

        // Filter only milestones
        const milestones = tasks.filter(task => {
            // Try different ways to identify milestones
            if (task.task_type) {
                return task.task_type === 'TT_Mile' || 
                       task.task_type === 'Milestone';
            }
            
            // If task_type isn't available, try other methods
            if (task.milestone !== undefined) {
                return task.milestone === 'Y' || task.milestone === true;
            }
            
            // Check duration - milestones typically have 0 duration
            if (task.duration !== undefined) {
                return parseFloat(task.duration) === 0;
            }
            
            // Default to excluding (safer for milestones)
            return false;
        });
        
        console.log('DEBUG: Filtered milestones:', milestones);
        
        // Get status field
        const statusField = findTaskStatusField(tasks);
        console.log('DEBUG: Using status field for milestones:', statusField);
        
        if (!statusField) {
            console.warn('No status field found in tasks');
            showToast('Cannot create milestones chart: no status field found', 'warning');
            // Generate some dummy data to show the chart
            createDummyMilestonesChart();
            return;
        }
        
        // Map status codes to our chart categories
        const statusCounts = {
            'Not Started': 0,
            'In Progress': 0,
            'Completed': 0,
            'Suspended': 0
        };
        
        // Count milestones by mapped status
        milestones.forEach(task => {
            const status = task[statusField];
            const mappedStatus = statusMappings[status] || 'Not Started'; // Default to Not Started if unknown
            statusCounts[mappedStatus]++;
        });
        
        console.log('DEBUG: Milestone status counts:', statusCounts);

        // Only proceed with the chart if we have data
        if (Object.values(statusCounts).every(count => count === 0)) {
            console.warn('No status data available for milestones chart');
            showToast('No status data available for Milestones chart', 'warning');
            // Generate some dummy data to show the chart
            createDummyMilestonesChart();
            return;
        }

        const ctx = document.getElementById('milestonesStatusChart');
        if (!ctx) {
            console.error('Canvas element not found for milestones status chart');
            return;
        }
        
        const ctxContext = ctx.getContext('2d');
        
        new Chart(ctxContext, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#3498db', // Not Started
                        '#f1c40f', // In Progress
                        '#2ecc71', // Completed
                        '#e74c3c'  // Suspended
                    ],
                    borderWidth: 1
                }]
            },
            plugins: [ChartDataLabels],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        display: true,
                        color: '#000',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        anchor: 'end',
                        align: 'start',
                        offset: 15,
                        borderColor: '#333',
                        borderWidth: 1,
                        borderRadius: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: {
                            top: 2,
                            bottom: 2,
                            left: 6,
                            right: 6
                        },
                        clip: false,
                        formatter: function(value, context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return value > 0 ? `${value} (${percentage}%)` : '';
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Milestones Status Distribution',
                        font: {
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error generating milestones status chart:', error);
        showToast('Error generating milestones status chart', 'error');
        // Generate some dummy data to show the chart
        createDummyMilestonesChart();
    }
}

// Function to create a dummy milestone chart when no data is available
function createDummyMilestonesChart() {
    const ctx = document.getElementById('milestonesStatusChart');
    if (!ctx) {
        console.error('Canvas element not found for dummy milestones status chart');
        return;
    }
    
    const ctxContext = ctx.getContext('2d');
    
    // Sample data for demonstration
    const statusCounts = {
        'Not Started': 5,
        'In Progress': 2,
        'Completed': 3,
        'Suspended': 1
    };
    
    new Chart(ctxContext, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#3498db', // Not Started
                    '#f1c40f', // In Progress
                    '#2ecc71', // Completed
                    '#e74c3c'  // Suspended
                ],
                borderWidth: 1
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    display: true,
                    color: '#000',
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    anchor: 'end',
                    align: 'start',
                    offset: 15,
                    borderColor: '#333',
                    borderWidth: 1,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: {
                        top: 2,
                        bottom: 2,
                        left: 6,
                        right: 6
                    },
                    clip: false,
                    formatter: function(value, context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return value > 0 ? `${value} (${percentage}%)` : '';
                    }
                },
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Milestones Status Distribution (Sample Data)',
                    font: {
                        size: 14
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function generateCriticalStatusChart(xerData) {
    try {
        const tasks = xerData.tables?.TASK || [];
        console.log('DEBUG: Tasks data for critical path chart:', tasks);
        
        if (!tasks || !tasks.length) {
            console.warn('No tasks data available for critical status chart');
            showToast('No task data available for Critical Path chart', 'warning');
            return;
        }

        // Define status code mappings to handle different formats
        const statusMappings = {
            // Standard P6 codes
            'TK_NotStart': 'Not Started',
            'TK_Active': 'In Progress',
            'TK_Complete': 'Completed',
            'TK_Suspend': 'Suspended',
            // Alternative codes that might be in the data
            'NotStart': 'Not Started',
            'Active': 'In Progress',
            'Complete': 'Completed',
            'Suspend': 'Suspended',
            // Simple codes
            'Not Started': 'Not Started',
            'In Progress': 'In Progress',
            'Completed': 'Completed',
            'Suspended': 'Suspended'
        };

        // Find critical field
        const criticalField = findCriticalField(tasks);
        console.log('DEBUG: Using critical field:', criticalField);
        
        // Filter critical activities and milestones (various formats)
        const criticalItems = criticalField ? 
            tasks.filter(task => {
                const criticalValue = task[criticalField];
                return criticalValue === 'Y' || 
                       criticalValue === true || 
                       criticalValue === 'true' ||
                       criticalValue === 1;
            }) : [];
        
        console.log('DEBUG: Filtered critical items:', criticalItems);
        
        // If we don't have enough data, try an alternative approach
        if (criticalItems.length === 0) {
            // Just use tasks with float <= 0 as a fallback
            const floatField = findFloatField(tasks);
            console.log('DEBUG: Using float field for fallback:', floatField);
            
            if (floatField) {
                const tasksWithFloat = tasks.filter(task => {
                    const floatValue = task[floatField];
                    return floatValue !== undefined && 
                           Number(floatValue) <= 0;
                });
                
                if (tasksWithFloat.length > 0) {
                    console.log('DEBUG: Using tasks with zero float as critical:', tasksWithFloat);
                    criticalItems.push(...tasksWithFloat);
                }
            }
        }
        
        // Get status field
        const statusField = findTaskStatusField(tasks);
        console.log('DEBUG: Using status field for critical chart:', statusField);
        
        if (!statusField) {
            console.warn('No status field found in tasks');
            showToast('Cannot create critical path chart: no status field found', 'warning');
            return;
        }
        
        // Separate critical activities and milestones
        const criticalActivities = criticalItems.filter(task => {
            // Try different ways to identify regular tasks vs milestones
            if (task.task_type) {
                return task.task_type === 'TT_Task' || 
                       task.task_type === 'Task' || 
                      (task.task_type !== 'TT_Mile' && task.task_type !== 'Milestone');
            }
            
            // If task_type isn't available, try other methods
            if (task.milestone !== undefined) {
                return task.milestone !== 'Y' && task.milestone !== true;
            }
            
            // Check duration - milestones typically have 0 duration
            if (task.duration !== undefined) {
                return parseFloat(task.duration) > 0;
            }
            
            // Default to including the task
            return true;
        });
        
        const criticalMilestones = criticalItems.filter(task => {
            // Try different ways to identify milestones
            if (task.task_type) {
                return task.task_type === 'TT_Mile' || 
                       task.task_type === 'Milestone';
            }
            
            // If task_type isn't available, try other methods
            if (task.milestone !== undefined) {
                return task.milestone === 'Y' || task.milestone === true;
            }
            
            // Check duration - milestones typically have 0 duration
            if (task.duration !== undefined) {
                return parseFloat(task.duration) === 0;
            }
            
            // Default to excluding (safer for milestones)
            return false;
        });
        
        // Initialize status counts
        const activityStatusCounts = {
            'Not Started': 0,
            'In Progress': 0,
            'Completed': 0,
            'Suspended': 0
        };

        const milestoneStatusCounts = {
            'Not Started': 0,
            'In Progress': 0,
            'Completed': 0,
            'Suspended': 0
        };
        
        // Count by mapped status
        criticalActivities.forEach(task => {
            const status = task[statusField];
            const mappedStatus = statusMappings[status] || 'Not Started';
            activityStatusCounts[mappedStatus]++;
        });
        
        criticalMilestones.forEach(task => {
            const status = task[statusField];
            const mappedStatus = statusMappings[status] || 'Not Started';
            milestoneStatusCounts[mappedStatus]++;
        });
        
        console.log('DEBUG: Critical activities status counts:', activityStatusCounts);
        console.log('DEBUG: Critical milestones status counts:', milestoneStatusCounts);
        
        // Only proceed if we have data
        if (Object.values(activityStatusCounts).every(count => count === 0) && 
            Object.values(milestoneStatusCounts).every(count => count === 0)) {
            console.warn('No critical path data available for chart');
            showToast('No critical path data available for chart', 'warning');
            return;
        }

        const ctx = document.getElementById('criticalStatusChart');
        if (!ctx) {
            console.error('Canvas element not found for critical status chart');
            return;
        }
        
        const ctxContext = ctx.getContext('2d');
        
        new Chart(ctxContext, {
            type: 'bar',
            data: {
                labels: ['Not Started', 'In Progress', 'Completed', 'Suspended'],
                datasets: [
                    {
                        label: 'Critical Activities',
                        data: Object.values(activityStatusCounts),
                        backgroundColor: '#3498db',
                        borderWidth: 1
                    },
                    {
                        label: 'Critical Milestones',
                        data: Object.values(milestoneStatusCounts),
                        backgroundColor: '#e74c3c',
                        borderWidth: 1
                    }
                ]
            },
            plugins: [ChartDataLabels],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        display: true,
                        color: '#000',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        anchor: 'end',
                        align: 'top',
                        offset: 4,
                        formatter: function(value) {
                            return value > 0 ? value : '';
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Critical Activities and Milestones Status',
                        font: {
                            size: 14
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error generating critical status chart:', error);
        showToast('Error generating critical status chart', 'error');
    }
}

// Helper function to find the critical path flag field in the tasks data
function findCriticalField(tasks) {
    if (!tasks || tasks.length === 0) return null;
    
    // Common field names for critical path flag
    const possibleCriticalFields = [
        'driving_path_flag', 'critical', 'is_critical', 'criticalFlag'
    ];
    
    // Get the first task to check fields
    const sampleTask = tasks[0];
    
    // Try to find a field that looks like a critical flag field
    for (const field of possibleCriticalFields) {
        if (sampleTask[field] !== undefined) {
            return field;
        }
    }
    
    // If we haven't found a critical field, look at all fields
    const allFields = Object.keys(sampleTask);
    for (const field of allFields) {
        // Look for fields with 'critical' in the name
        if (field.toLowerCase().includes('critical')) {
            return field;
        }
    }
    
    return null;
}

// Helper function to find the float field in the tasks data
function findFloatField(tasks) {
    if (!tasks || tasks.length === 0) return null;
    
    // Common field names for float
    const possibleFloatFields = [
        'total_float_hr_cnt', 'total_float', 'float', 'free_float_hr_cnt', 'free_float'
    ];
    
    // Get the first task to check fields
    const sampleTask = tasks[0];
    
    // Try to find a field that looks like a float field
    for (const field of possibleFloatFields) {
        if (sampleTask[field] !== undefined) {
            return field;
        }
    }
    
    // If we haven't found a float field, look at all fields
    const allFields = Object.keys(sampleTask);
    for (const field of allFields) {
        // Look for fields with 'float' in the name
        if (field.toLowerCase().includes('float')) {
            return field;
        }
    }
    
    return null;
}

// Placeholder for gantt chart functions
function generateActivityHierarchyGantt(xerData) {
    console.log('Generating Activity Hierarchy Gantt chart...');
    
    const container = document.getElementById('activityHierarchyGantt');
    if (!container) {
        console.error('Container not found for activity hierarchy gantt');
        return;
    }
    
    // Create a simple HTML table to show the activity hierarchy
    container.innerHTML = '';
    
    try {
        const tasks = xerData.tables?.TASK || [];
        
        if (!tasks || tasks.length === 0) {
            createSampleActivityHierarchy(container);
            return;
        }
        
        // Sort tasks by some logical order (code or name)
        const sortedTasks = [...tasks].sort((a, b) => {
            const aCode = a.task_code || a.code || '';
            const bCode = b.task_code || b.code || '';
            return aCode.localeCompare(bCode);
        });
        
        // Keep only the first 10 tasks to avoid overwhelming the display
        const displayTasks = sortedTasks.slice(0, 10);
        
        // Create a table for the tasks
        const table = document.createElement('table');
        table.className = 'w-full text-sm text-left';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr class="bg-gray-200">
                <th class="py-2 px-4">Task Code</th>
                <th class="py-2 px-4">Task Name</th>
                <th class="py-2 px-4">Start Date</th>
                <th class="py-2 px-4">End Date</th>
                <th class="py-2 px-4">Status</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Helper function to get field value with fallbacks
        const getField = (task, fieldNames) => {
            for (const field of fieldNames) {
                if (task[field] !== undefined) {
                    return task[field];
                }
            }
            return 'N/A';
        };
        
        // Add rows for each task
        displayTasks.forEach(task => {
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-100';
            
            // Get task values with fallbacks
            const code = getField(task, ['task_code', 'code', 'id']);
            const name = getField(task, ['task_name', 'name', 'description']);
            const startDate = formatDate(getField(task, ['start_date', 'startDate', 'early_start_date']));
            const endDate = formatDate(getField(task, ['finish_date', 'endDate', 'early_finish_date']));
            const status = getField(task, ['status_code', 'status', 'state']);
            
            row.innerHTML = `
                <td class="py-2 px-4">${code}</td>
                <td class="py-2 px-4">${name}</td>
                <td class="py-2 px-4">${startDate}</td>
                <td class="py-2 px-4">${endDate}</td>
                <td class="py-2 px-4">${status}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
        
        // Add a note that this is a simplified view
        const note = document.createElement('p');
        note.className = 'text-sm text-gray-500 mt-4';
        note.textContent = 'Note: This is a simplified view showing the first 10 activities. A full Gantt chart would be implemented for a production environment.';
        container.appendChild(note);
        
    } catch (error) {
        console.error('Error generating activity hierarchy:', error);
        createSampleActivityHierarchy(container);
    }
}

// Function to create a sample activity hierarchy when no data is available
function createSampleActivityHierarchy(container) {
    // Create a table with sample data
    const table = document.createElement('table');
    table.className = 'w-full text-sm text-left';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr class="bg-gray-200">
            <th class="py-2 px-4">Task Code</th>
            <th class="py-2 px-4">Task Name</th>
            <th class="py-2 px-4">Start Date</th>
            <th class="py-2 px-4">End Date</th>
            <th class="py-2 px-4">Status</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create table body with sample data
    const tbody = document.createElement('tbody');
    
    const sampleTasks = [
        { code: 'A1000', name: 'Project Planning', start: '2025-01-01', end: '2025-02-15', status: 'Complete' },
        { code: 'A1001', name: 'Requirements Gathering', start: '2025-02-16', end: '2025-03-15', status: 'Complete' },
        { code: 'A1002', name: 'Design Phase', start: '2025-03-16', end: '2025-04-30', status: 'Complete' },
        { code: 'A1003', name: 'Implementation', start: '2025-05-01', end: '2025-08-31', status: 'In Progress' },
        { code: 'A1004', name: 'Testing Phase', start: '2025-09-01', end: '2025-10-31', status: 'Not Started' },
        { code: 'A1005', name: 'Deployment', start: '2025-11-01', end: '2025-12-15', status: 'Not Started' }
    ];
    
    sampleTasks.forEach(task => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-100';
        
        row.innerHTML = `
            <td class="py-2 px-4">${task.code}</td>
            <td class="py-2 px-4">${task.name}</td>
            <td class="py-2 px-4">${task.start}</td>
            <td class="py-2 px-4">${task.end}</td>
            <td class="py-2 px-4">${task.status}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Add a note that this is sample data
    const note = document.createElement('p');
    note.className = 'text-sm text-gray-500 mt-4';
    note.textContent = 'Note: This is sample data for demonstration. A full Gantt chart would be implemented for a production environment.';
    container.appendChild(note);
}

function generateWBSHierarchyGantt(xerData) {
    console.log('Generating WBS Hierarchy Gantt chart...');
    
    const container = document.getElementById('wbsHierarchyGantt');
    if (!container) {
        console.error('Container not found for WBS hierarchy gantt');
        return;
    }
    
    // Create a simple HTML to show the WBS hierarchy
    container.innerHTML = '';
    
    try {
        // Try to find WBS data
        const wbsData = xerData.tables?.PROJWBS || [];
        
        if (!wbsData || wbsData.length === 0) {
            createSampleWBSHierarchy(container);
            return;
        }
        
        // Create a hierarchical tree view for WBS
        const tree = document.createElement('div');
        tree.className = 'wbs-tree';
        
        // Helper style for the tree view
        const style = document.createElement('style');
        style.textContent = `
            .wbs-tree {
                padding: 1rem;
                max-height: 350px;
                overflow-y: auto;
            }
            .wbs-tree ul {
                list-style: none;
                padding-left: 1.5rem;
            }
            .wbs-tree li {
                position: relative;
                padding: 0.5rem 0;
            }
            .wbs-tree li::before {
                content: "";
                position: absolute;
                left: -1rem;
                top: 0;
                width: 1px;
                height: 100%;
                border-left: 1px solid #ddd;
            }
            .wbs-tree li::after {
                content: "";
                position: absolute;
                left: -1rem;
                top: 1rem;
                width: 0.5rem;
                height: 1px;
                border-top: 1px solid #ddd;
            }
            .wbs-tree ul > li:last-child::before {
                height: 1rem;
            }
            .wbs-item {
                display: flex;
                align-items: center;
                background-color: #f8f9fa;
                padding: 0.5rem;
                border-radius: 4px;
                border: 1px solid #eee;
                margin-bottom: 0.25rem;
            }
            .wbs-code {
                font-weight: bold;
                margin-right: 0.5rem;
                color: #3498db;
                flex-shrink: 0;
            }
            .wbs-name {
                flex-grow: 1;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
        container.appendChild(style);
        
        // Helper function to get field value with fallbacks
        const getField = (wbs, fieldNames) => {
            for (const field of fieldNames) {
                if (wbs[field] !== undefined) {
                    return wbs[field];
                }
            }
            return 'N/A';
        };
        
        // Build a map of WBS items by ID for easy lookup
        const wbsMap = {};
        wbsData.forEach(wbs => {
            const id = getField(wbs, ['wbs_id', 'id']);
            wbsMap[id] = {
                ...wbs,
                children: []
            };
        });
        
        // Build the hierarchy
        const rootItems = [];
        wbsData.forEach(wbs => {
            const id = getField(wbs, ['wbs_id', 'id']);
            const parentId = getField(wbs, ['parent_wbs_id', 'parent_id']);
            
            if (!parentId || parentId === 'null' || parentId === 'NULL' || !wbsMap[parentId]) {
                rootItems.push(wbsMap[id]);
            } else if (wbsMap[parentId]) {
                wbsMap[parentId].children.push(wbsMap[id]);
            }
        });
        
        // Recursive function to render the WBS hierarchy
        function renderWBSHierarchy(items, parentElement) {
            if (!items || items.length === 0) return;
            
            const ul = document.createElement('ul');
            parentElement.appendChild(ul);
            
            items.forEach(wbs => {
                const li = document.createElement('li');
                
                // Get WBS values with fallbacks
                const code = getField(wbs, ['wbs_code', 'code']);
                const name = getField(wbs, ['wbs_name', 'name', 'description']);
                
                const wbsItem = document.createElement('div');
                wbsItem.className = 'wbs-item';
                wbsItem.innerHTML = `
                    <span class="wbs-code">${code}</span>
                    <span class="wbs-name">${name}</span>
                `;
                
                li.appendChild(wbsItem);
                ul.appendChild(li);
                
                // Recursively render children
                if (wbs.children && wbs.children.length > 0) {
                    renderWBSHierarchy(wbs.children, li);
                }
            });
        }
        
        // Start rendering from root items
        renderWBSHierarchy(rootItems, tree);
        container.appendChild(tree);
        
        // Add a note that this is a simplified view
        const note = document.createElement('p');
        note.className = 'text-sm text-gray-500 mt-4';
        note.textContent = 'Note: This is a simplified view of the WBS hierarchy. A full Gantt chart would be implemented for a production environment.';
        container.appendChild(note);
        
    } catch (error) {
        console.error('Error generating WBS hierarchy:', error);
        createSampleWBSHierarchy(container);
    }
}

// Function to create a sample WBS hierarchy when no data is available
function createSampleWBSHierarchy(container) {
    // Create a hierarchical tree view with sample data
    const tree = document.createElement('div');
    tree.className = 'wbs-tree';
    
    // Helper style for the tree view
    const style = document.createElement('style');
    style.textContent = `
        .wbs-tree {
            padding: 1rem;
            max-height: 350px;
            overflow-y: auto;
        }
        .wbs-tree ul {
            list-style: none;
            padding-left: 1.5rem;
        }
        .wbs-tree li {
            position: relative;
            padding: 0.5rem 0;
        }
        .wbs-tree li::before {
            content: "";
            position: absolute;
            left: -1rem;
            top: 0;
            width: 1px;
            height: 100%;
            border-left: 1px solid #ddd;
        }
        .wbs-tree li::after {
            content: "";
            position: absolute;
            left: -1rem;
            top: 1rem;
            width: 0.5rem;
            height: 1px;
            border-top: 1px solid #ddd;
        }
        .wbs-tree ul > li:last-child::before {
            height: 1rem;
        }
        .wbs-item {
            display: flex;
            align-items: center;
            background-color: #f8f9fa;
            padding: 0.5rem;
            border-radius: 4px;
            border: 1px solid #eee;
            margin-bottom: 0.25rem;
        }
        .wbs-code {
            font-weight: bold;
            margin-right: 0.5rem;
            color: #3498db;
            flex-shrink: 0;
        }
        .wbs-name {
            flex-grow: 1;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    `;
    container.appendChild(style);
    
    // Sample WBS data with children
    const sampleData = [
        {
            code: 'A',
            name: 'Project Planning',
            children: [
                { code: 'A.1', name: 'Project Initiation', children: [] },
                { code: 'A.2', name: 'Requirements Gathering', children: [
                    { code: 'A.2.1', name: 'User Interviews', children: [] },
                    { code: 'A.2.2', name: 'Market Research', children: [] }
                ] },
                { code: 'A.3', name: 'Project Charter', children: [] }
            ]
        },
        {
            code: 'B',
            name: 'Design Phase',
            children: [
                { code: 'B.1', name: 'Architectural Design', children: [] },
                { code: 'B.2', name: 'Structural Design', children: [] },
                { code: 'B.3', name: 'MEP Design', children: [
                    { code: 'B.3.1', name: 'Mechanical', children: [] },
                    { code: 'B.3.2', name: 'Electrical', children: [] },
                    { code: 'B.3.3', name: 'Plumbing', children: [] }
                ] }
            ]
        },
        {
            code: 'C',
            name: 'Construction Phase',
            children: [
                { code: 'C.1', name: 'Site Preparation', children: [] },
                { code: 'C.2', name: 'Foundation Work', children: [] },
                { code: 'C.3', name: 'Structural Framework', children: [] },
                { code: 'C.4', name: 'Interior Work', children: [
                    { code: 'C.4.1', name: 'Walls & Partitions', children: [] },
                    { code: 'C.4.2', name: 'Electrical Works', children: [] },
                    { code: 'C.4.3', name: 'Plumbing Works', children: [] },
                    { code: 'C.4.4', name: 'HVAC Installation', children: [] }
                ] }
            ]
        }
    ];
    
    // Recursive function to create the tree structure
    function buildWBSTree(items, parentElement) {
        const ul = document.createElement('ul');
        parentElement.appendChild(ul);
        
        items.forEach(item => {
            const li = document.createElement('li');
            
            const wbsItem = document.createElement('div');
            wbsItem.className = 'wbs-item';
            wbsItem.innerHTML = `
                <span class="wbs-code">${item.code}</span>
                <span class="wbs-name">${item.name}</span>
            `;
            
            li.appendChild(wbsItem);
            ul.appendChild(li);
            
            if (item.children && item.children.length > 0) {
                buildWBSTree(item.children, li);
            }
        });
    }
    
    // Build the tree
    buildWBSTree(sampleData, tree);
    container.appendChild(tree);
    
    // Add a note that this is sample data
    const note = document.createElement('p');
    note.className = 'text-sm text-gray-500 mt-4';
    note.textContent = 'Note: This is sample data for demonstration. A full WBS hierarchy would be implemented for a production environment.';
    container.appendChild(note);
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return 'Invalid Date';
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Check if there's a toast container, if not create one
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `p-4 mb-4 rounded shadow-lg flex items-center ${
        type === 'error' ? 'bg-red-100 text-red-700' :
        type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
        type === 'success' ? 'bg-green-100 text-green-700' :
        'bg-blue-100 text-blue-700'
    }`;
    
    const icon = document.createElement('i');
    icon.className = `fas ${
        type === 'error' ? 'fa-exclamation-circle' :
        type === 'warning' ? 'fa-exclamation-triangle' :
        type === 'success' ? 'fa-check-circle' :
        'fa-info-circle'
    } mr-2`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(text);
    toastContainer.appendChild(toast);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 500);
    }, 5000);
}

function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper function to find the first defined field from an array of possible field names
function findFirstDefinedField(obj, fieldNames) {
    if (!obj || typeof obj !== 'object') return null;
    
    for (const field of fieldNames) {
        if (obj[field] !== undefined && obj[field] !== null && obj[field] !== '') {
            return field;
        }
    }
    
    return null;
}

// Function to load projects into dropdown (UPDATED FOR PROJECT DROPDOWN)
async function loadProjects() {
    try {
        const response = await fetch('/api/gantt/projects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const projects = await response.json();
        
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter) {
            // Clear existing options
            projectFilter.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a project...';
            projectFilter.appendChild(defaultOption);
            
            // Add project options
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.proj_id;
                option.textContent = `${project.proj_short_name || project.proj_name || project.proj_id}`;
                projectFilter.appendChild(option);
            });
            
            console.log('Loaded', projects.length, 'projects into dropdown');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        // Keep the default "Select a project..." option
    }
}

// Function to set up project selection event listener (UPDATED FOR PROJECT DROPDOWN)
function setupProjectEventListener() {
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
        projectFilter.addEventListener('change', async (e) => {
            const projectId = e.target.value;
            if (projectId) {
                console.log('Project selected:', projectId);
                
                // Store selection in localStorage
                localStorage.setItem('selectedProjectId', projectId);
                
                // Update current project ID display
                const currentProjectIdElement = document.getElementById('currentProjectId');
                if (currentProjectIdElement) {
                    currentProjectIdElement.textContent = projectId;
                }
                
                // Update project status display
                const projectStatusElement = document.getElementById('projectStatusDisplay');
                if (projectStatusElement) {
                    projectStatusElement.textContent = 'Loading...';
                }
                
                // Load business project details using the project ID
                const businessProject = await fetchBusinessProjectDetails(projectId);
                updateBusinessProjectDetails(businessProject);
                
                // Load project data and update charts
                await loadProjectDataFromDropdown(projectId);
            } else {
                // Clear localStorage
                localStorage.removeItem('selectedProjectId');
                
                // Clear project ID display
                const currentProjectIdElement = document.getElementById('currentProjectId');
                if (currentProjectIdElement) {
                    currentProjectIdElement.textContent = 'N/A';
                }
                
                // Reset status
                const projectStatusElement = document.getElementById('projectStatusDisplay');
                if (projectStatusElement) {
                    projectStatusElement.textContent = 'Ready';
                }
                
                // Clear business project details
                updateBusinessProjectDetails(null);
                
                // Load sample data when no project is selected
                await generateProjectInformationReport(sampleProjectData);
                generateActivitiesStatusChart(sampleProjectData);
                generateMilestonesStatusChart(sampleProjectData);
                generateCriticalStatusChart(sampleProjectData);
            }
        });
    }
}

// Function to load project data and update all visualizations (UPDATED FOR PROJECT DROPDOWN)
async function loadProjectDataFromDropdown(projectId) {
    try {
        console.log('Loading data for project:', projectId);
        
        // Fetch project data using the existing fetchProjectData function
        await fetchProjectData(projectId);
        
        // Update project status
        const projectStatusElement = document.getElementById('projectStatusDisplay');
        if (projectStatusElement) {
            projectStatusElement.textContent = 'Active';
        }
        
        showToast('Project data loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading project data:', error);
        
        // Update status to show error
        const projectStatusElement = document.getElementById('projectStatusDisplay');
        if (projectStatusElement) {
            projectStatusElement.textContent = 'Error';
        }
        
        showToast('Error loading project data, using sample data', 'warning');
        
        // Fall back to sample data
        await generateProjectInformationReport(sampleProjectData);
        generateActivitiesStatusChart(sampleProjectData);
        generateMilestonesStatusChart(sampleProjectData);
        generateCriticalStatusChart(sampleProjectData);
    }
} 