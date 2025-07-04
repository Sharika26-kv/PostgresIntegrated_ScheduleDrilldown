// Schedule AWP Analytics JavaScript
// This file handles AWP (Activity Work Package) based schedule analytics with hierarchy

// Configuration
const API_BASE = '/api';

// Global state
let awpHierarchy = [];
let taskData = [];
let filteredData = [];
let currentProjectId = null;

// Initialize the AWP schedule analytics page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Schedule AWP Analytics page loaded');
    
    // Initialize components
    initializeProjectFilter();
    initializeTabSystem();
    initializeFilterControls();
    initializeAWPFilters();
    
    // Load initial data
    loadProjects();
});

// Initialize project filter dropdown
function initializeProjectFilter() {
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
        projectFilter.addEventListener('change', function() {
            const projectId = this.value;
            currentProjectId = projectId;
            if (projectId) {
                loadProjectAWPHierarchy(projectId);
            }
        });
    }
}

// Initialize tab system
function initializeTabSystem() {
    const ganttTabBtn = document.getElementById('ganttTabBtn');
    
    if (ganttTabBtn) {
        ganttTabBtn.addEventListener('click', () => switchTab('gantt'));
    }
}

// Initialize filter controls
function initializeFilterControls() {
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
}

// Initialize AWP filter controls
function initializeAWPFilters() {
    const awpSelect = document.getElementById('awpSelect');
    const toggleViewBtn = document.getElementById('toggleView');
    const refreshBtn = document.getElementById('refreshData');
    
    // AWP selection change handler
    if (awpSelect) {
        awpSelect.addEventListener('change', function() {
            applyAWPFilters();
        });
    }
    
    // Toggle between table and Gantt view
    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', function() {
            toggleViewMode();
        });
    }
    
    // Refresh data
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            if (currentProjectId) {
                loadProjectAWPHierarchy(currentProjectId);
            }
        });
    }
}

// Toggle between table and Gantt view
function toggleViewMode() {
    const taskTable = document.getElementById('taskTableContainer');
    const timelineContainer = document.querySelector('.timeline-container');
    const toggleBtn = document.getElementById('toggleView');
    
    if (!taskTable || !timelineContainer || !toggleBtn) return;
    
    const isGanttVisible = timelineContainer.style.display !== 'none';
    
    if (isGanttVisible) {
        // Switch to table-only view
        timelineContainer.style.display = 'none';
        taskTable.style.width = '100%';
        taskTable.style.maxWidth = '100%';
        toggleBtn.textContent = '📊 Show Gantt';
    } else {
        // Switch to split view
        timelineContainer.style.display = 'flex';
        taskTable.style.width = '50%';
        taskTable.style.maxWidth = '70%';
        toggleBtn.textContent = '📋 Table Only';
        
        // Render Gantt chart if not already rendered
        renderGanttChart();
    }
}

// Initialize view state
function initializeViewState() {
    const timelineContainer = document.querySelector('.timeline-container');
    const taskTable = document.getElementById('taskTableContainer');
    
    if (timelineContainer && taskTable) {
        // Start with Gantt hidden (table-only view)
        timelineContainer.style.display = 'none';
        taskTable.style.width = '100%';
        taskTable.style.maxWidth = '100%';
    }
}

// Load projects from API
async function loadProjects() {
    try {
        console.log('Loading projects from API...');
        const response = await fetch(`${API_BASE}/database/projects`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const projects = await response.json();
        console.log(`Loaded ${projects.length} projects:`, projects);
        
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter) {
            projectFilter.innerHTML = '<option value="">Select a project...</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.proj_id;
                option.textContent = project.proj_name || `Project ${project.proj_id}`;
                projectFilter.appendChild(option);
            });
            console.log('Project dropdown populated successfully');
        } else {
            console.error('Project filter dropdown not found - check if element with id="projectFilter" exists');
        }
        } catch (error) {
        console.error('Error loading projects:', error);
        
        // Show error in dropdown with more helpful message
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter) {
            projectFilter.innerHTML = '<option value="">Error loading projects - check server</option>';
        }
        
        // Also show error in the main table area if visible
        const tableBody = document.getElementById('task-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 16px; text-align: center; color: #dc2626;">
                        <strong>Error loading projects</strong><br>
                        <small>Please ensure the server is running on port 3001</small><br>
                        <small>Error: ${error.message}</small>
                    </td>
                </tr>
            `;
        }
    }
}

// Load AWP hierarchy and tasks for selected project
async function loadProjectAWPHierarchy(projectId) {
    try {
        console.log(`Loading AWP hierarchy for project: ${projectId}`);
        
        // Update current project ID display
        const currentProjectIdElement = document.getElementById('currentProjectId');
        if (currentProjectIdElement) {
            currentProjectIdElement.textContent = projectId;
        }
        
        // Show loading state
        const tableBody = document.getElementById('task-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #6b7280;">Loading AWP hierarchy...</td></tr>';
        }
        
        // Load AWP hierarchy and tasks in parallel with fallback
        let hierarchyResponse, tasksResponse;
        
        try {
            [hierarchyResponse, tasksResponse] = await Promise.all([
                fetch(`${API_BASE}/awp-hierarchy?project_id=${projectId}`),
                fetch(`${API_BASE}/tasks-with-awp?projectId=${projectId}`)
            ]);
            
            // Check if responses are ok, if not, use fallback
            if (!hierarchyResponse.ok || !tasksResponse.ok) {
                console.warn('API endpoints returned error status, using fallback approach');
                throw new Error('API endpoints not available');
            }
        } catch (fetchError) {
            console.warn('Failed to fetch from new endpoints, using fallback approach...', fetchError);
            
            // Use mock AWP hierarchy
            awpHierarchy = [
                { actv_code_id: 'FS_001', Activity_code: 'FS', Activity_name: 'Foundations to Weather Tight', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'L1_001', Activity_code: 'L1', Activity_name: 'Fitout to L1 Red Tag', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'L2_001', Activity_code: 'L2', Activity_name: 'L2 Yellow Tags', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'L3_001', Activity_code: 'L3', Activity_name: 'L3 Green Tags', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'CA_001', Activity_code: 'CA', Activity_name: 'Common Area', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'L5_001', Activity_code: 'L5', Activity_name: 'L4 Blue Tags & L5 White Tags', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' }
            ];
            
            // Use existing hierarchical-gantt endpoint for tasks
            tasksResponse = await fetch(`${API_BASE}/hierarchical-gantt?projectId=${projectId}`);
            if (!tasksResponse.ok) {
                throw new Error(`Failed to load tasks from fallback endpoint: ${tasksResponse.status}`);
            }
            taskData = await tasksResponse.json();
            
            console.log(`Using mock AWP hierarchy (${awpHierarchy.length} items) and fallback tasks (${taskData.length} tasks)`);
            
            // Build the combined hierarchy and apply filters
            buildCombinedHierarchy();
            applyAWPFilters();
            return;
        }
        
        if (!hierarchyResponse.ok) {
            console.warn(`AWP hierarchy endpoint returned ${hierarchyResponse.status}, using mock data`);
            // Use mock AWP hierarchy data
            awpHierarchy = [
                { actv_code_id: 'FS_001', Activity_code: 'FS', Activity_name: 'Foundations to Weather Tight', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'L1_001', Activity_code: 'L1', Activity_name: 'Fitout to L1 Red Tag', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'L2_001', Activity_code: 'L2', Activity_name: 'L2 Yellow Tags', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'L3_001', Activity_code: 'L3', Activity_name: 'L3 Green Tags', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'CA_001', Activity_code: 'CA', Activity_name: 'Common Area', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' },
                { actv_code_id: 'L5_001', Activity_code: 'L5', Activity_name: 'L4 Blue Tags & L5 White Tags', level: 1, parent_actv_code_id: null, actv_code_type: 'AWP - Construction Work Blocks (CWBs)' }
            ];
        } else {
            awpHierarchy = await hierarchyResponse.json();
        }
        
        if (!tasksResponse.ok) {
            throw new Error(`Failed to load tasks: ${tasksResponse.status}`);
        }
        
        taskData = await tasksResponse.json();
        
        console.log(`Loaded ${awpHierarchy.length} AWP hierarchy items and ${taskData.length} tasks`);
        
        // Build the combined hierarchy
        buildCombinedHierarchy();
        
        // Apply default filters (show all AWP codes initially)
        applyAWPFilters();
        
    } catch (error) {
        console.error('Error loading AWP hierarchy:', error);
        const tableBody = document.getElementById('task-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 16px; text-align: center; color: #dc2626;">
                        <strong>Error loading AWP hierarchy</strong><br>
                        <small><strong>Solution:</strong> Please restart the server to register new API endpoints</small><br>
                        <small>Run: <code>node server.js</code> or restart your server</small><br>
                        <small>Error details: ${error.message}</small><br>
                        <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">🔄 Reload Page</button>
                    </td>
                </tr>
            `;
        }
    }
}

// Build combined hierarchy of AWP codes and their associated tasks
function buildCombinedHierarchy() {
    const combinedData = [];
    
    // Group AWP hierarchy by root codes
    const awpGroups = {};
    awpHierarchy.forEach(awp => {
        if (awp.level === 1) {
            // Root level AWP
            awpGroups[awp.Activity_code] = {
                ...awp,
                children: [],
                tasks: []
            };
        }
    });
    
    // Add level 2 AWP codes to their parents
    awpHierarchy.forEach(awp => {
        if (awp.level === 2) {
            const parentCode = awpHierarchy.find(parent => parent.actv_code_id === awp.parent_actv_code_id);
            if (parentCode && awpGroups[parentCode.Activity_code]) {
                awpGroups[parentCode.Activity_code].children.push({
                    ...awp,
                    tasks: []
                });
            }
        }
    });
    
    // Associate tasks with AWP codes
    taskData.forEach(task => {
        // Find matching AWP code for this task
        const matchingAWP = findMatchingAWPForTask(task);
        if (matchingAWP) {
            const rootCode = findRootAWPCode(matchingAWP);
            if (rootCode && awpGroups[rootCode]) {
                if (matchingAWP.level === 1) {
                    awpGroups[rootCode].tasks.push(task);
                } else if (matchingAWP.level === 2) {
                    const childAWP = awpGroups[rootCode].children.find(child => 
                        child.actv_code_id === matchingAWP.actv_code_id
                    );
                    if (childAWP) {
                        childAWP.tasks.push(task);
                    }
                }
            }
        }
        // Note: Tasks without AWP associations are not displayed in this view
        // This is intentional as this is an AWP-focused view
    });
    
    // Store the combined hierarchy
    window.combinedHierarchy = awpGroups;
    console.log('Combined hierarchy built:', awpGroups);
}

// Find matching AWP code for a task
function findMatchingAWPForTask(task) {
    // First try: Direct AWP data from TASKACTV join (when new endpoints work)
    if (task.awp_code && task.awp_id) {
        // Find the AWP in our hierarchy that matches this task's AWP
        return awpHierarchy.find(awp => awp.actv_code_id === task.awp_id);
    }
    
    // Fallback: Try to match based on task code or name patterns
    // This is used when we have mock AWP data and regular task data
    const taskCode = task.task_code || '';
    const taskName = task.task_name || '';
    
    // Look for AWP codes in task code or name
    for (const awp of awpHierarchy) {
        const awpCode = awp.Activity_code;
        if (taskCode.includes(awpCode) || taskName.includes(awpCode)) {
            return awp;
        }
    }
    
    // For demo purposes, randomly assign tasks to AWP codes (remove this in production)
    if (awpHierarchy.length > 0) {
        const randomIndex = Math.abs(taskCode.length + taskName.length) % awpHierarchy.length;
        return awpHierarchy[randomIndex];
    }
    
    // If no AWP association found, return null
    return null;
}

// Find root AWP code for a given AWP
function findRootAWPCode(awp) {
    if (awp.level === 1) {
        return awp.Activity_code;
    } else if (awp.level === 2) {
        const parent = awpHierarchy.find(parent => parent.actv_code_id === awp.parent_actv_code_id);
        return parent ? parent.Activity_code : null;
    }
    return null;
}

// Apply AWP filters
function applyAWPFilters() {
    const awpSelect = document.getElementById('awpSelect');
    const selectedAWPCode = awpSelect ? awpSelect.value : '';
    
    console.log('Selected AWP code:', selectedAWPCode);
    
    // Filter the combined hierarchy based on selection
    let filteredData = [];
    
    if (!selectedAWPCode) {
        // Show all AWP codes and their tasks
        Object.keys(window.combinedHierarchy || {}).forEach(code => {
            const awpGroup = window.combinedHierarchy[code];
            
            // Add root AWP as parent
            filteredData.push({
                ...awpGroup,
                type: 'awp_parent',
                task_id: `awp_${code}`,
                task_name: `${awpGroup.Activity_code} - ${awpGroup.Activity_name}`,
                is_expanded: true,
                level: 0
            });
            
            // Add level 2 AWP codes as children
            awpGroup.children.forEach(child => {
                filteredData.push({
                    ...child,
                    type: 'awp_child',
                    task_id: `awp_${child.Activity_code}`,
                    task_name: `${child.Activity_code} - ${child.Activity_name}`,
                    parent_id: `awp_${code}`,
                    level: 1
                });
                
                // Add tasks under this AWP child
                child.tasks.forEach(task => {
                    filteredData.push({
                        ...task,
                        type: 'task',
                        parent_id: `awp_${child.Activity_code}`,
                        level: 2
                    });
                });
            });
            
            // Add direct tasks under root AWP
            awpGroup.tasks.forEach(task => {
                filteredData.push({
                    ...task,
                    type: 'task',
                    parent_id: `awp_${code}`,
                    level: 1
                });
            });
        });
    } else {
        // Show only the selected AWP code and its tasks
        if (window.combinedHierarchy && window.combinedHierarchy[selectedAWPCode]) {
            const awpGroup = window.combinedHierarchy[selectedAWPCode];
            
            // Add root AWP as parent
            filteredData.push({
                ...awpGroup,
                type: 'awp_parent',
                task_id: `awp_${selectedAWPCode}`,
                task_name: `${awpGroup.Activity_code} - ${awpGroup.Activity_name}`,
                is_expanded: true,
                level: 0
            });
            
            // Add level 2 AWP codes as children
            awpGroup.children.forEach(child => {
                filteredData.push({
                    ...child,
                    type: 'awp_child',
                    task_id: `awp_${child.Activity_code}`,
                    task_name: `${child.Activity_code} - ${child.Activity_name}`,
                    parent_id: `awp_${selectedAWPCode}`,
                    level: 1
                });
                
                // Add tasks under this AWP child
                child.tasks.forEach(task => {
                    filteredData.push({
                        ...task,
                        type: 'task',
                        parent_id: `awp_${child.Activity_code}`,
                        level: 2
                    });
                });
            });
            
            // Add direct tasks under root AWP
            awpGroup.tasks.forEach(task => {
                filteredData.push({
                    ...task,
                    type: 'task',
                    parent_id: `awp_${selectedAWPCode}`,
                    level: 1
                });
            });
        }
    }
    
    console.log('Filtered data:', filteredData);
    
    // Render the filtered data
    renderAWPHierarchy(filteredData);
}

// Render AWP hierarchy in the table
function renderAWPHierarchy(data) {
    const tableBody = document.getElementById('task-table-body');
    if (!tableBody) return;
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #6b7280;">No data to display for selected AWP codes.</td></tr>';
        updateTaskCounts(0);
        return;
    }
    
    const html = data.map(item => {
        const indentLevel = item.level || 0;
        const indentation = '&nbsp;'.repeat(indentLevel * 4);
        
        let displayName = '';
        let awpCode = '';
        let startDate = '-';
        let endDate = '-';
        let duration = '-';
        let progress = '-';
        let typeDisplay = '';
        let rowStyle = '';
        
        if (item.type === 'awp_parent') {
            displayName = `${item.Activity_code} - ${item.Activity_name}`;
            awpCode = item.Activity_code;
            typeDisplay = 'AWP Root';
            rowStyle = 'background-color: #e0f2fe; font-weight: 700; color: #0277bd;';
        } else if (item.type === 'awp_child') {
            displayName = `${item.Activity_code} - ${item.Activity_name}`;
            awpCode = item.Activity_code;
            typeDisplay = 'AWP Child';
            rowStyle = 'background-color: #f3f4f6; font-weight: 600; color: #374151;';
        } else if (item.type === 'task') {
            displayName = item.task_name || item.Activity_name || '';
            awpCode = item.Activity_code || '';
            startDate = formatDate(item.start_date);
            endDate = formatDate(item.end_date);
            duration = formatDuration(item.duration);
            progress = item.percent_complete ? `${item.percent_complete}%` : '-';
            typeDisplay = 'Task';
            rowStyle = '';
        }
        
        return `
            <tr style="${rowStyle}">
                <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${awpCode}">${awpCode}</td>
                <td style="width: 350px; padding: 6px 8px; border-right: 1px solid #e5e7eb;" title="${displayName}">${indentation}${displayName}</td>
                <td style="width: 120px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${startDate}</td>
                <td style="width: 120px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${endDate}</td>
                <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${duration}</td>
                <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${progress}</td>
                <td style="width: 60px; padding: 6px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;">${typeDisplay}</td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = html;
    
    // Update task counts
    const taskCount = data.filter(item => item.type === 'task').length;
    updateTaskCounts(taskCount);
    
    // If Gantt view is visible, update it
    const timelineContainer = document.querySelector('.timeline-container');
    if (timelineContainer && timelineContainer.style.display !== 'none') {
        setTimeout(() => {
            renderGanttChart();
        }, 100);
    }
}

// Update task counts display
function updateTaskCounts(visibleCount, totalCount = null) {
    const visibleElement = document.getElementById('visibleTaskCount');
    const totalElement = document.getElementById('totalTaskCount');
    
    if (visibleElement) {
        visibleElement.textContent = visibleCount;
    }
    
    if (totalElement) {
        totalElement.textContent = totalCount || taskData.length;
    }
}

// Apply other filters (lookahead, etc.)
function applyFilters() {
    // Get filter values
    const lookaheadDays = document.getElementById('lookaheadFilter').value;
    const showPastTasks = document.getElementById('showPastTasks').checked;
    
    // Apply filters to the current filtered data
    let filteredByDate = [...filteredData];
    
    if (lookaheadDays !== 'all') {
        const today = new Date();
        const futureDate = new Date(today.getTime() + (parseInt(lookaheadDays) * 24 * 60 * 60 * 1000));
        
        filteredByDate = filteredByDate.filter(item => {
            if (item.type !== 'task') return true; // Keep AWP items
            
            const taskStart = item.start_date ? new Date(item.start_date) : null;
            const taskEnd = item.end_date ? new Date(item.end_date) : null;
            
            if (!taskStart && !taskEnd) return true;
            
            // Check if task is within the lookahead period
            if (taskStart && taskStart <= futureDate) return true;
            if (taskEnd && taskEnd <= futureDate) return true;
            
            return false;
        });
    }
    
    if (!showPastTasks) {
        const today = new Date();
        filteredByDate = filteredByDate.filter(item => {
            if (item.type !== 'task') return true; // Keep AWP items
            
            const taskEnd = item.end_date ? new Date(item.end_date) : null;
            return !taskEnd || taskEnd >= today;
        });
    }
    
    renderAWPHierarchy(filteredByDate);
}

// Switch tabs
function switchTab(tabName) {
    console.log(`Switching to tab: ${tabName}`);
    // For now, we only have one tab, but this can be extended
}

// Utility functions
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date)) return '-';
    return date.toLocaleDateString();
}

function formatDuration(duration) {
    if (!duration || duration === 0) return '-';
    const days = Math.round(duration / 8); // Assuming 8 hours per day
    return days === 1 ? '1 day' : `${days} days`;
} 

// Render Gantt Chart
function renderGanttChart() {
    console.log('Rendering Gantt chart...');
    
    const timelineHeader = document.getElementById('timelineHeader');
    const ganttBars = document.getElementById('ganttBars');
    
    if (!timelineHeader || !ganttBars) {
        console.warn('Gantt chart containers not found');
        return;
    }
    
    // Get filtered data for Gantt chart
    const ganttData = getFilteredTasksForGantt();
    
    if (ganttData.length === 0) {
        ganttBars.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No tasks to display in Gantt chart</div>';
        return;
    }
    
    // Calculate date range
    const dateRange = calculateDateRange(ganttData);
    if (!dateRange) {
        ganttBars.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Unable to calculate date range</div>';
        return;
    }
    
    // Render timeline header
    renderTimelineHeader(timelineHeader, dateRange);
    
    // Render Gantt bars
    renderGanttBars(ganttBars, ganttData, dateRange);
}

// Get filtered tasks for Gantt chart
function getFilteredTasksForGantt() {
    const tableBody = document.getElementById('task-table-body');
    if (!tableBody) return [];
    
    const tasks = [];
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const taskName = cells[1].textContent.trim();
            const startDate = cells[2].textContent.trim();
            const endDate = cells[3].textContent.trim();
            const progress = cells[5].textContent.trim();
            const type = cells[6].textContent.trim();
            
            if (startDate !== '-' && endDate !== '-' && type === 'Task') {
                try {
                    tasks.push({
                        id: index,
                        name: taskName,
                        start: new Date(startDate),
                        end: new Date(endDate),
                        progress: parseInt(progress) || 0,
                        type: type
                    });
                } catch (e) {
                    console.warn('Invalid date format:', startDate, endDate);
                }
            }
        }
    });
    
    return tasks;
}

// Calculate date range for Gantt chart
function calculateDateRange(tasks) {
    if (tasks.length === 0) return null;
    
    let minDate = new Date(tasks[0].start);
    let maxDate = new Date(tasks[0].end);
    
    tasks.forEach(task => {
        if (task.start < minDate) minDate = task.start;
        if (task.end > maxDate) maxDate = task.end;
    });
    
    // Add some padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
    
    return { start: minDate, end: maxDate };
}

// Render timeline header
function renderTimelineHeader(container, dateRange) {
    const dayWidth = 30; // pixels per day
    const totalDays = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
    
    // Month headers
    const monthHeaders = container.querySelector('.month-headers');
    const dayHeaders = container.querySelector('.day-headers');
    
    monthHeaders.innerHTML = '';
    dayHeaders.innerHTML = '';
    
    let currentDate = new Date(dateRange.start);
    currentDate.setDate(1); // Start from beginning of month
    
    let currentMonth = currentDate.getMonth();
    let monthStart = 0;
    
    for (let day = 0; day < totalDays; day++) {
        const date = new Date(dateRange.start);
        date.setDate(date.getDate() + day);
        
        // Day header
        const dayDiv = document.createElement('div');
        dayDiv.style.width = `${dayWidth}px`;
        dayDiv.style.minWidth = `${dayWidth}px`;
        dayDiv.style.textAlign = 'center';
        dayDiv.style.borderRight = '1px solid #e5e7eb';
        dayDiv.style.padding = '2px';
        dayDiv.style.fontSize = '10px';
        dayDiv.textContent = date.getDate();
        dayHeaders.appendChild(dayDiv);
        
        // Month header
        if (date.getMonth() !== currentMonth || day === totalDays - 1) {
            const monthDiv = document.createElement('div');
            const monthWidth = (day - monthStart + (day === totalDays - 1 ? 1 : 0)) * dayWidth;
            monthDiv.style.width = `${monthWidth}px`;
            monthDiv.style.minWidth = `${monthWidth}px`;
            monthDiv.style.textAlign = 'center';
            monthDiv.style.borderRight = '1px solid #d1d5db';
            monthDiv.style.padding = '2px';
            monthDiv.style.fontSize = '11px';
            monthDiv.style.fontWeight = 'bold';
            monthDiv.style.backgroundColor = '#f9fafb';
            
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            monthDiv.textContent = `${monthNames[currentMonth]} ${currentDate.getFullYear()}`;
            monthHeaders.appendChild(monthDiv);
            
            currentMonth = date.getMonth();
            currentDate = new Date(date);
            monthStart = day;
        }
    }
    
    // Set container width
    container.style.width = `${totalDays * dayWidth}px`;
}

// Render Gantt bars
function renderGanttBars(container, tasks, dateRange) {
    const dayWidth = 30;
    const rowHeight = 30;
    const totalDays = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
    const totalWidth = totalDays * dayWidth;
    
    container.innerHTML = '';
    container.style.width = `${totalWidth}px`;
    container.style.height = `${tasks.length * rowHeight}px`;
    container.style.position = 'relative';
    
    tasks.forEach((task, index) => {
        const startOffset = Math.ceil((task.start - dateRange.start) / (1000 * 60 * 60 * 24));
        const duration = Math.ceil((task.end - task.start) / (1000 * 60 * 60 * 24));
        
        const barDiv = document.createElement('div');
        barDiv.style.position = 'absolute';
        barDiv.style.left = `${startOffset * dayWidth}px`;
        barDiv.style.top = `${index * rowHeight + 5}px`;
        barDiv.style.width = `${Math.max(duration * dayWidth, 5)}px`;
        barDiv.style.height = `${rowHeight - 10}px`;
        barDiv.style.backgroundColor = '#3b82f6';
        barDiv.style.borderRadius = '3px';
        barDiv.style.cursor = 'pointer';
        barDiv.title = `${task.name}\nStart: ${task.start.toLocaleDateString()}\nEnd: ${task.end.toLocaleDateString()}\nProgress: ${task.progress}%`;
        
        // Progress bar
        if (task.progress > 0) {
            const progressDiv = document.createElement('div');
            progressDiv.style.position = 'absolute';
            progressDiv.style.left = '0';
            progressDiv.style.top = '0';
            progressDiv.style.width = `${task.progress}%`;
            progressDiv.style.height = '100%';
            progressDiv.style.backgroundColor = '#10b981';
            progressDiv.style.borderRadius = '3px';
            barDiv.appendChild(progressDiv);
        }
        
        container.appendChild(barDiv);
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('AWP page loaded');
    initializeProjectFilter();
    initializeTabSystem();
    initializeFilterControls();
    initializeAWPFilters();
    
    // Initialize view state (Gantt hidden by default)
    const timelineContainer = document.querySelector('.timeline-container');
    const taskTable = document.getElementById('taskTableContainer');
    
    if (timelineContainer && taskTable) {
        timelineContainer.style.display = 'none';
        taskTable.style.width = '100%';
        taskTable.style.maxWidth = '100%';
    }
    
    // Load projects
    loadProjects();
});