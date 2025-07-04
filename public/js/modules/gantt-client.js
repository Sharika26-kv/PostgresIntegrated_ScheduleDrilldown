// Gantt Chart Client Module
// Fetches data from /api/gantt endpoints and renders the Gantt chart in #ganttTabPanel

// API base path - matches what we registered in server.js
const API_BASE = '/api/gantt';

let currentProjectId = null;
let projectTasks = [];
let projectWBS = [];
let projectDependencies = [];
let projectResources = [];
let isLoading = false;
let filteredTasks = []; // Store filtered tasks for rendering

// Filter settings
let currentLookaheadDays = 90; // Default to 90 days lookahead
let showPastTasks = false; // By default, don't show past tasks

// Global variable to track current filter state
let currentFilteredTaskId = null;

// Pagination and expand/collapse state
let displayedTasks = []; // Currently displayed tasks (with expand/collapse applied)
let collapsedNodes = new Set(); // Set of collapsed seq_nums
let isLoadingMore = false;
const INITIAL_BATCH_SIZE = 100;
const BACKGROUND_BATCH_SIZE = 500;
const MAX_DISPLAYABLE_TASKS = 2000; // Limit total tasks for performance

// Project date boundaries (calculated from ALL tasks to prevent infinite loops)
let projectDateBounds = { minDate: null, maxDate: null };

// Utility to fetch JSON from an endpoint
async function fetchAPI(endpoint) {
    console.log(`Fetching from: ${endpoint}`);
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            console.error(`API error: ${response.status} from ${endpoint}`);
            throw new Error(`API error: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Failed to fetch from ${endpoint}:`, error);
        throw error;
    }
}

// Filter tasks based on date criteria
function filterTasksByDate(tasks) {
    const startTime = performance.now();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Calculate the future date boundary
    let futureDate;
    if (currentLookaheadDays >= 3650) {
        // "All Future Tasks" means from today to the actual project end date (not infinite)
        futureDate = projectDateBounds.maxDate || new Date(today.getTime() + (2 * 365 * 24 * 60 * 60 * 1000)); // 2 years max
        console.log(`Filtering "All Future Tasks" from today to project end: ${futureDate.toDateString()}`);
    } else {
        futureDate = new Date();
        futureDate.setDate(today.getDate() + currentLookaheadDays);
        console.log(`Filtering ${currentLookaheadDays} days ahead to: ${futureDate.toDateString()}`);
    }
    
    const todayTime = today.getTime();
    const futureDateTime = futureDate.getTime();
    
    console.log(`Filtering tasks: Today=${today.toDateString()}, FutureDate=${futureDate.toDateString()}, ShowPast=${showPastTasks}, LookaheadDays=${currentLookaheadDays}`);
    
    const filtered = tasks.filter(task => {
        // Use target dates first, fallback to actual dates
        const taskStartStr = task.target_start_date || task.act_start_date;
        const taskEndStr = task.target_end_date || task.act_end_date;
        
        if (!taskStartStr || !taskEndStr) {
            return false; // Skip tasks with missing dates
        }
        
        const taskStart = new Date(taskStartStr);
        const taskEnd = new Date(taskEndStr);
        
        if (isNaN(taskStart) || isNaN(taskEnd)) {
            return false; // Skip tasks with invalid dates
        }
        
        const taskStartTime = taskStart.getTime();
        const taskEndTime = taskEnd.getTime();
        
        // Optimized date filtering using timestamps
        if (showPastTasks) {
            // Show all tasks that start before or on the future date
            return taskStartTime <= futureDateTime;
        } else {
            // Only show current and future tasks (tasks that end today or later AND start before future date)
            return taskEndTime >= todayTime && taskStartTime <= futureDateTime;
        }
    });
    
    const filterTime = (performance.now() - startTime).toFixed(2);
    console.log(`Date filtering: ${tasks.length} -> ${filtered.length} tasks (${filterTime}ms)`);
    
    // Limit total tasks for performance
    if (filtered.length > MAX_DISPLAYABLE_TASKS) {
        console.warn(`Too many tasks (${filtered.length}), limiting to ${MAX_DISPLAYABLE_TASKS} for performance`);
        // Sort by sequence number to keep the most important/early tasks
        const limited = filtered
            .sort((a, b) => (a.seq_num || '').localeCompare(b.seq_num || ''))
            .slice(0, MAX_DISPLAYABLE_TASKS);
        console.log(`Limited to ${limited.length} tasks`);
        return limited;
    }
    
    return filtered;
}

// Load all projects and populate dropdown if present
export async function loadProjects() {
    console.log('Loading projects...');
    try {
        // Show loading state
        const tableBody = document.getElementById('task-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" style="padding: 8px; text-align: center;">Loading projects...</td></tr>';
        }

        // Find project dropdown
        const projectDropdown = document.getElementById('projectFilter');
        
        // Fetch projects
        const projects = await fetchAPI(`${API_BASE}/projects`);
        console.log('Projects loaded:', projects);
        
        // Populate dropdown if it exists
        if (projectDropdown && projects.length > 0) {
            projectDropdown.innerHTML = '';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.proj_id;
                option.textContent = project.proj_name || `Project ${project.proj_id}`;
                projectDropdown.appendChild(option);
            });
            
            // Select first project and load data
            if (projects.length > 0) {
                currentProjectId = projects[0].proj_id;
                projectDropdown.value = currentProjectId;
                await loadProjectData(currentProjectId);
            }
            
            // Add change listener to dropdown
            projectDropdown.addEventListener('change', async (e) => {
                const newProjectId = e.target.value;
                if (newProjectId) {
                    await loadProjectData(newProjectId);
                }
            });
        } else {
            console.error('Project dropdown not found or no projects available');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="8" style="padding: 8px; text-align: center;">No projects available.</td></tr>';
            }
        }
        
        // Setup lookahead filter
        setupLookaheadFilter();
        
    } catch (error) {
        console.error('Error loading projects:', error);
        const tableBody = document.getElementById('task-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" style="padding: 8px; text-align: center;">Error loading projects.</td></tr>';
        }
    }
}

// Setup lookahead filter
function setupLookaheadFilter() {
    // The lookahead filter is now part of the main filter bar in HTML
    // Just add event listener to the combined apply button
    const applyButton = document.getElementById('applyFilters');
    const lookaheadSelect = document.getElementById('lookaheadFilter');
    const showPastCheckbox = document.getElementById('showPastTasks');
    
    if (applyButton && lookaheadSelect && showPastCheckbox) {
        // Set default values to 90 days lookahead
        lookaheadSelect.value = '90';
        showPastCheckbox.checked = false;
        
        applyButton.addEventListener('click', () => {
            const lookaheadValue = lookaheadSelect.value;
            currentLookaheadDays = lookaheadValue === 'all' ? 3650 : parseInt(lookaheadValue); // 10 years for "all"
            showPastTasks = showPastCheckbox.checked;
            
            console.log(`Applying filters: Lookahead=${currentLookaheadDays} days, ShowPast=${showPastTasks}`);
            
            // Re-filter and render with batched loading
            if (projectTasks.length > 0) {
                filteredTasks = filterTasksByDate(projectTasks);
                console.log(`Applied date filter: ${projectTasks.length} -> ${filteredTasks.length} tasks`);
                
                // Reset expand/collapse state when applying new filters
                collapsedNodes.clear();
                
                // Apply batched loading for filtered results
                loadInitialBatch();
                
                // Load remaining in background if needed
                if (filteredTasks.length > INITIAL_BATCH_SIZE) {
                    setTimeout(() => loadRemainingTasks(), 100);
                }
            } else {
                console.warn('No project tasks available to filter');
            }
        });
        
        console.log('Lookahead filter setup completed with default "90 days" settings');
    } else {
        console.error('Failed to setup lookahead filter - missing elements:', {
            applyButton: !!applyButton,
            lookaheadSelect: !!lookaheadSelect,
            showPastCheckbox: !!showPastCheckbox
        });
    }
}

// Load all Gantt data for a project with batched loading
export async function loadProjectData(projectId) {
    console.log(`Loading project data for project: ${projectId}`);
    if (!projectId) {
        console.error('No project ID provided');
        return;
    }
    
    currentProjectId = projectId;
    isLoading = true;
    collapsedNodes.clear(); // Reset collapsed state for new project
    
    // Update project ID display
    const projectIdDisplay = document.getElementById('currentProjectId');
    if (projectIdDisplay) {
        projectIdDisplay.textContent = projectId;
    }
    
    // Show loading state
    const tableBody = document.getElementById('task-table-body');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" style="padding: 8px; text-align: center;">Loading initial tasks...</td></tr>';
    }
    
    try {
        // First, load non-task data quickly
        const [wbs, dependencies, resources] = await Promise.all([
            fetchAPI(`${API_BASE}/projects/${projectId}/wbs`),
            fetchAPI(`${API_BASE}/projects/${projectId}/dependencies`),
            fetchAPI(`${API_BASE}/projects/${projectId}/resources`)
        ]);
        
        projectWBS = wbs;
        projectDependencies = dependencies;
        projectResources = resources;
        
        // Load tasks with pagination
        await loadTasksInBatches(projectId);
        
    } catch (error) {
        console.error(`Error loading project data for ${projectId}:`, error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8" style="padding: 8px; text-align: center;">Error loading project data: ${error.message}</td></tr>`;
        }
    } finally {
        isLoading = false;
    }
}

// Calculate project date boundaries from all tasks to prevent infinite timeline
function calculateProjectDateBounds(tasks) {
    let minDate = null, maxDate = null;
    let maxEndDateFound = null;
    let validTaskCount = 0;
    
    console.log(`Calculating project bounds from ${tasks.length} tasks...`);
    
    tasks.forEach(task => {
        // Use target dates first, fallback to actual dates
        const startStr = task.target_start_date || task.act_start_date;
        const endStr = task.target_end_date || task.act_end_date;
        
        if (startStr) {
            const start = new Date(startStr);
            if (!isNaN(start)) {
                minDate = !minDate || start < minDate ? start : minDate;
            }
        }
        
        if (endStr) {
            const end = new Date(endStr);
            if (!isNaN(end)) {
                maxDate = !maxDate || end > maxDate ? end : maxDate;
                maxEndDateFound = maxDate;
                validTaskCount++;
            }
        }
    });
    
    console.log(`Valid tasks with dates: ${validTaskCount} out of ${tasks.length}`);
    console.log(`MAX END DATE for project: ${maxEndDateFound ? maxEndDateFound.toDateString() : 'None found'}`);
    
    // If no valid dates found, use reasonable defaults
    if (!minDate || !maxDate) {
        const today = new Date();
        minDate = minDate || new Date(today.getFullYear(), 0, 1); // Start of current year
        maxDate = maxDate || new Date(today.getFullYear() + 2, 11, 31); // End of next year
        console.log(`Using default date range as no valid dates found`);
    }
    
    // Hard cap: ensure maxDate is never more than 5 years from minDate
    const maxAllowedEndDate = new Date(minDate.getTime() + (5 * 365 * 24 * 60 * 60 * 1000)); // 5 years
    if (maxDate > maxAllowedEndDate) {
        console.warn(`Max date ${maxDate.toDateString()} exceeds 5-year limit, capping at ${maxAllowedEndDate.toDateString()}`);
        maxDate = maxAllowedEndDate;
    }
    
    console.log(`Final project date bounds: ${minDate.toDateString()} to ${maxDate.toDateString()}`);
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    console.log(`Total timeline days: ${totalDays}`);
    
    return { minDate, maxDate };
}

// Load tasks in batches for better performance
async function loadTasksInBatches(projectId) {
    try {
        // Load all tasks at once (we'll implement client-side batching for display)
        const tasks = await fetchAPI(`${API_BASE}/projects/${projectId}/tasks`);
        
        console.log(`Loaded ${tasks.length} tasks for project ${projectId}`);
        
        projectTasks = tasks;
        
        // Calculate project date boundaries from ALL tasks to prevent infinite timeline
        projectDateBounds = calculateProjectDateBounds(projectTasks);
        
        // Apply date filtering
        filteredTasks = filterTasksByDate(projectTasks);
        console.log(`Filtered from ${projectTasks.length} to ${filteredTasks.length} tasks based on date criteria`);
        
        // Load first batch immediately
        await loadInitialBatch();
        
        // Load remaining tasks in background
        if (filteredTasks.length > INITIAL_BATCH_SIZE) {
            setTimeout(() => loadRemainingTasks(), 100);
        }
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        throw error;
    }
}

// Load and display the first batch of tasks
async function loadInitialBatch() {
    console.log(`Loading initial batch of ${INITIAL_BATCH_SIZE} tasks...`);
    
    // Apply expand/collapse logic to all filtered tasks
    displayedTasks = applyExpandCollapse(filteredTasks.slice(0, INITIAL_BATCH_SIZE));
    
    // Update task counts
    updateTaskCounts(displayedTasks.length, projectTasks.length);
    
    // Render the first batch
    renderGantt();
}

// Load remaining tasks in background batches
async function loadRemainingTasks() {
    if (isLoadingMore || filteredTasks.length <= INITIAL_BATCH_SIZE) {
        console.log(`Skipping loadRemainingTasks: isLoadingMore=${isLoadingMore}, filteredTasks=${filteredTasks.length}, INITIAL_BATCH_SIZE=${INITIAL_BATCH_SIZE}`);
        return;
    }
    
    isLoadingMore = true;
    console.log(`Loading remaining ${filteredTasks.length - INITIAL_BATCH_SIZE} tasks in background...`);
    
    // Show loading indicator
    const tableBody = document.getElementById('task-table-body');
    if (tableBody) {
        const loadingRow = document.createElement('tr');
        loadingRow.id = 'loading-indicator';
        loadingRow.innerHTML = '<td colspan="7" style="padding: 8px; text-align: center; font-style: italic; color: #666;">Loading more tasks...</td>';
        tableBody.appendChild(loadingRow);
    }
    
    // Load in larger chunks to reduce iterations and renders
    let currentIndex = INITIAL_BATCH_SIZE;
    const maxIterations = Math.min(10, Math.ceil(filteredTasks.length / BACKGROUND_BATCH_SIZE)); // Realistic limit
    let iterations = 0;
    
    while (currentIndex < filteredTasks.length && iterations < maxIterations) {
        console.log(`Loading batch: ${currentIndex}/${filteredTasks.length} (iteration ${iterations + 1}/${maxIterations})`);
        
        // Load larger chunks (1000 tasks at a time) to reduce iterations
        const chunkSize = Math.min(BACKGROUND_BATCH_SIZE * 2, filteredTasks.length - currentIndex);
        const nextBatch = filteredTasks.slice(0, currentIndex + chunkSize);
        
        // Apply expand/collapse logic
        displayedTasks = applyExpandCollapse(nextBatch);
        
        // Only update task count, don't render full table each time
        updateTaskCounts(displayedTasks.length, projectTasks.length);
        
        currentIndex += chunkSize;
        iterations++;
        
        // Smaller delay since we're doing fewer iterations
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    
    if (iterations >= maxIterations) {
        console.warn(`Stopped background loading after ${maxIterations} iterations to prevent infinite loop`);
    }
    
    // Final render with all tasks
    displayedTasks = applyExpandCollapse(filteredTasks);
    isLoadingMore = false;
    
    // Only render the full Gantt once at the end
    renderGantt();
    
    console.log(`Finished loading all ${displayedTasks.length} displayed tasks from ${filteredTasks.length} filtered tasks`);
}

// Render the Gantt chart and table
function renderGantt() {
    console.log('Rendering Gantt chart...');
    renderTaskTable();
    renderGanttBars();
    renderTimelineHeader();
    renderTodayLine();
    setupEventListeners();
    
    // Check if dependencies should be shown
    const showDependenciesBtn = document.getElementById('showDependencies');
    if (showDependenciesBtn && showDependenciesBtn.classList.contains('active')) {
        renderDependencyLines();
    }
}

// Parse sequence number to determine hierarchy level
function getHierarchyLevel(seqNum) {
    if (!seqNum) return 0;
    const parts = seqNum.toString().split('.');
    return parts.length;
}

// Check if a task is a parent (has children in the list or is a WBS node without task_id)
function isParentTask(task, allTasks) {
    // If task_id is null, it's a WBS parent node
    if (!task.task_id) return true;
    
    if (!task.seq_num) return false;
    const taskSeq = task.seq_num.toString();
    return allTasks.some(otherTask => {
        if (!otherTask.seq_num || otherTask.task_id === task.task_id) return false;
        const otherSeq = otherTask.seq_num.toString();
        return otherSeq.startsWith(taskSeq + '.') && otherSeq.split('.').length === taskSeq.split('.').length + 1;
    });
}

// Get children of a parent task
function getChildTasks(parentTask, allTasks) {
    if (!parentTask.seq_num) return [];
    const parentSeq = parentTask.seq_num.toString();
    return allTasks.filter(task => {
        if (!task.seq_num || task.task_id === parentTask.task_id) return false;
        const taskSeq = task.seq_num.toString();
        return taskSeq.startsWith(parentSeq + '.') && taskSeq.split('.').length === parentSeq.split('.').length + 1;
    });
}

// Apply expand/collapse logic to filter visible tasks
function applyExpandCollapse(tasks) {
    const visibleTasks = [];
    
    for (const task of tasks) {
        // Always show root level tasks
        if (!task.seq_num || task.seq_num.split('.').length <= 1) {
            visibleTasks.push(task);
            continue;
        }
        
        // Check if any parent is collapsed
        const seqParts = task.seq_num.split('.');
        let isHidden = false;
        
        for (let i = 1; i < seqParts.length; i++) {
            const parentSeq = seqParts.slice(0, i).join('.');
            if (collapsedNodes.has(parentSeq)) {
                isHidden = true;
                break;
            }
        }
        
        if (!isHidden) {
            visibleTasks.push(task);
        }
    }
    
    return visibleTasks;
}

// Toggle expand/collapse for a node
window.toggleNode = function(seqNum) {
    if (collapsedNodes.has(seqNum)) {
        collapsedNodes.delete(seqNum);
    } else {
        collapsedNodes.add(seqNum);
    }
    
    // Reapply display logic
    displayedTasks = applyExpandCollapse(filteredTasks);
    renderGantt();
}

function renderTaskTable() {
    console.log(`Rendering task table with ${displayedTasks.length} displayed tasks...`);
    const tableBody = document.getElementById('task-table-body');
    if (!tableBody) {
        console.error('Task table body element not found');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (!displayedTasks || displayedTasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="padding: 8px; text-align: center;">No tasks available for selected date range.</td></tr>';
        return;
    }
    
    console.log(`Displaying ${displayedTasks.length} tasks (from ${filteredTasks.length} filtered)`);
    
    // Update task counts
    updateTaskCounts(displayedTasks.length, projectTasks.length);
    
    displayedTasks.forEach((task, index) => {
        const isParent = isParentTask(task, filteredTasks);
        const isCollapsed = collapsedNodes.has(task.seq_num);
        
        const row = document.createElement('tr');
        row.dataset.taskId = task.task_id || `wbs_${task.wbs_id}`;
        row.dataset.seqNum = task.seq_num;
        row.dataset.rowIndex = index;
        row.style.height = '30px';
        
        // Determine display name: task_name or wbs_name if it's a parent WBS node
        const displayName = task.task_name || task.wbs_name || '';
        const isWbsNode = !task.task_id && task.wbs_name;
        
        // Create task name cell without indentation, only hierarchy icons
        let taskNameContent = '';
        if (isParent) {
            const arrowIcon = isCollapsed ? '▶' : '▼';
            taskNameContent = `
                <div style="display: flex; align-items: center;">
                    <span class="hierarchy-icon" style="margin-right: 6px; font-weight: bold; color: #374151; cursor: pointer; user-select: none;" onclick="toggleNode('${task.seq_num}')">${arrowIcon}</span>
                    <span style="font-weight: 600; ${isWbsNode ? 'color: #1d4ed8;' : ''}">${displayName}</span>
                </div>
            `;
        } else {
            taskNameContent = `
                <div style="display: flex; align-items: center;">
                    <span>${displayName}</span>
                </div>
            `;
        }
        
        row.innerHTML = `
            <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 18px;">${task.wbs_id || ''}</td>
            <td style="width: 350px; padding: 6px 8px; border-right: 1px solid #e5e7eb; line-height: 18px;" title="${displayName}">${taskNameContent}</td>
            <td style="width: 120px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 18px;">${formatDate(task.target_start_date || task.act_start_date)}</td>
            <td style="width: 120px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 18px;">${formatDate(task.target_end_date || task.act_end_date)}</td>
            <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; line-height: 18px;">${formatDuration(task.target_drtn_hr_cnt)}</td>
            <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; line-height: 18px;">${task.phys_complete_pct != null ? task.phys_complete_pct + '%' : '0%'}</td>
            <td style="width: 60px; padding: 6px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; line-height: 18px; ${isParent ? 'font-weight: 600;' : ''}">${task.seq_num || task.task_code || ''}</td>
        `;
        
        if (task.driving_path_flag === 'Y') {
            row.classList.add('critical-task');
            row.style.color = '#dc3545';
        }
        
        // Add hover effect for parent rows
        if (isParent) {
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                // Only toggle if not clicking on the arrow specifically
                if (!e.target.classList.contains('hierarchy-icon')) {
                    toggleNode(task.seq_num);
                }
            });
        }
        
        tableBody.appendChild(row);
    });
    
    // Show loading indicator if more data is being loaded
    if (isLoadingMore) {
        const loadingRow = document.createElement('tr');
        loadingRow.innerHTML = '<td colspan="7" style="padding: 8px; text-align: center; font-style: italic; color: #666;">Loading more tasks...</td>';
        tableBody.appendChild(loadingRow);
    }
    
    console.log(`Rendered ${displayedTasks.length} task rows with hierarchy`);
}

// Function to update task counts display
function updateTaskCounts(visibleCount, totalCount) {
    const visibleTaskCountElement = document.getElementById('visibleTaskCount');
    const totalTaskCountElement = document.getElementById('totalTaskCount');
    
    if (visibleTaskCountElement) {
        visibleTaskCountElement.textContent = visibleCount;
    }
    
    if (totalTaskCountElement) {
        totalTaskCountElement.textContent = totalCount;
    }
}

function renderGanttBars() {
    console.log(`Rendering Gantt bars...`);
    const ganttBarsContainer = document.getElementById('ganttBars');
    const timelineArea = document.getElementById('timelineArea');
    
    if (!ganttBarsContainer || !timelineArea) {
        console.error('Gantt bars container or timeline area not found');
        return;
    }
    
    ganttBarsContainer.innerHTML = '';
    
    // Get tasks to display (with expand/collapse applied)
    const tasksToDisplay = displayedTasks;
    console.log(`Rendering Gantt bars for ${tasksToDisplay.length} displayed tasks`);
    
    if (!tasksToDisplay || tasksToDisplay.length === 0) return;

    // Use project date boundaries to prevent infinite timeline
    let minDate = projectDateBounds.minDate;
    let maxDate = projectDateBounds.maxDate;
    
    // If we have filtered tasks, optionally adjust boundaries to fit displayed tasks better
    if (currentLookaheadDays < 3650) { // Not "all" - adjust to displayed tasks for better view
        let displayMinDate = null, displayMaxDate = null;
        tasksToDisplay.forEach(task => {
            const start = new Date(task.target_start_date || task.act_start_date);
            const end = new Date(task.target_end_date || task.act_end_date);
            if (!isNaN(start)) displayMinDate = !displayMinDate || start < displayMinDate ? start : displayMinDate;
            if (!isNaN(end)) displayMaxDate = !displayMaxDate || end > displayMaxDate ? end : displayMaxDate;
        });
        
        // Use displayed tasks boundaries if they exist, otherwise fall back to project bounds
        if (displayMinDate && displayMaxDate) {
            minDate = displayMinDate;
            maxDate = displayMaxDate;
        }
    }
    
    if (!minDate || !maxDate) {
        console.error('Invalid date range for Gantt chart');
        return;
    }
    
    console.log(`Using date range: ${minDate.toDateString()} to ${maxDate.toDateString()}`);
    
    // Hard cap timeline to prevent infinite rendering (max 2 years for performance)
    const maxAllowedDays = 730; // 2 years maximum for performance
    let totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    
    if (totalDays > maxAllowedDays) {
        console.warn(`Timeline too long (${totalDays} days), capping at ${maxAllowedDays} days for performance`);
        maxDate = new Date(minDate.getTime() + (maxAllowedDays - 1) * 24 * 60 * 60 * 1000);
        totalDays = maxAllowedDays;
    }
    
    // Additional safety check
    if (totalDays > 5000) {
        console.error(`Timeline still too long (${totalDays} days), forcing to 365 days`);
        totalDays = 365;
        maxDate = new Date(minDate.getTime() + 364 * 24 * 60 * 60 * 1000);
    }
    const pxPerDay = 20;
    const rowHeight = 30;

    // Set container width and height
    const timelineWidth = totalDays * pxPerDay;
    timelineArea.style.width = timelineWidth + 'px';
    timelineArea.style.height = (tasksToDisplay.length * rowHeight) + 'px';

    console.log(`Setting Gantt chart dimensions: ${timelineWidth}px wide x ${tasksToDisplay.length * rowHeight}px high`);

    // Store bar positions for dependency lines
    const barPositions = new Map();

    tasksToDisplay.forEach((task, index) => {
        const start = new Date(task.target_start_date || task.act_start_date);
        const end = new Date(task.target_end_date || task.act_end_date);
        
        if (isNaN(start) || isNaN(end)) {
            console.warn(`Task ${task.task_id} has invalid dates:`, {start, end});
            return;
        }
        
        const dayOffset = Math.max(0, Math.floor((start - minDate) / (1000 * 60 * 60 * 24)));
        const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const barLeft = dayOffset * pxPerDay;
        const barWidth = durationDays * pxPerDay;
        const barTop = index * rowHeight + 6;

        // Store position for dependency rendering
        barPositions.set(task.task_id, {
            left: barLeft,
            right: barLeft + barWidth,
            top: barTop,
            bottom: barTop + 18,
            centerY: barTop + 9,
            rowIndex: index
        });

        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        bar.dataset.taskId = task.task_id;
        bar.dataset.rowIndex = index;
        bar.style.position = 'absolute';
        bar.style.left = barLeft + 'px';
        bar.style.top = barTop + 'px';
        bar.style.width = barWidth + 'px';
        bar.style.height = '18px';
        bar.style.background = (task.driving_path_flag === 'Y' || task.critical === 'Y') ? '#dc3545' : '#007bff';
        bar.style.borderRadius = '3px';
        bar.style.boxShadow = '1px 1px 3px rgba(0,0,0,0.2)';
        bar.title = `${task.task_name}\n${formatDate(start)} - ${formatDate(end)}`;

        // Add label if bar is wide enough
        if (barWidth > 60) {
            const label = document.createElement('div');
            label.className = 'bar-label';
            label.style.position = 'absolute';
            label.style.left = '8px';
            label.style.top = '0';
            label.style.color = 'white';
            label.style.fontSize = '11px';
            label.style.lineHeight = '18px';
            label.style.whiteSpace = 'nowrap';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.maxWidth = (barWidth - 16) + 'px';
            label.textContent = task.task_name;
            bar.appendChild(label);
        }

        ganttBarsContainer.appendChild(bar);
    });

    // Store bar positions globally for dependency rendering
    window.ganttBarPositions = barPositions;
    window.ganttDimensions = { minDate, maxDate, pxPerDay, rowHeight };

    console.log(`Rendered ${tasksToDisplay.length} Gantt bars with exact table alignment`);
}

function renderTimelineHeader() {
    console.log('Rendering timeline header...');
    const timelineHeader = document.getElementById('timelineHeader');
    if (!timelineHeader) {
        console.error('Timeline header element not found');
        return;
    }
    
    const monthHeadersContainer = timelineHeader.querySelector('.month-headers');
    const dayHeadersContainer = timelineHeader.querySelector('.day-headers');
    
    if (!monthHeadersContainer || !dayHeadersContainer) {
        console.error('Month or day headers container not found');
        return;
    }
    
    monthHeadersContainer.innerHTML = '';
    dayHeadersContainer.innerHTML = '';
    
    // Get tasks to display based on current filter
    const tasksToDisplay = displayedTasks;
    
    if (!tasksToDisplay || tasksToDisplay.length === 0) return;
    
    // Use project date boundaries to prevent infinite timeline (same as renderGanttBars)
    let minDate = projectDateBounds.minDate;
    let maxDate = projectDateBounds.maxDate;
    
    // If we have filtered tasks, optionally adjust boundaries to fit displayed tasks better
    if (currentLookaheadDays < 3650) { // Not "all" - adjust to displayed tasks for better view
        let displayMinDate = null, displayMaxDate = null;
        tasksToDisplay.forEach(task => {
            const start = new Date(task.target_start_date || task.act_start_date);
            const end = new Date(task.target_end_date || task.act_end_date);
            if (!isNaN(start)) displayMinDate = !displayMinDate || start < displayMinDate ? start : displayMinDate;
            if (!isNaN(end)) displayMaxDate = !displayMaxDate || end > displayMaxDate ? end : displayMaxDate;
        });
        
        // Use displayed tasks boundaries if they exist, otherwise fall back to project bounds
        if (displayMinDate && displayMaxDate) {
            minDate = displayMinDate;
            maxDate = displayMaxDate;
        }
    }
    
    if (!minDate || !maxDate) return;
    
    // Hard cap timeline to prevent infinite rendering (max 2 years for performance)
    const maxAllowedDays = 730; // 2 years maximum for performance
    let totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    
    if (totalDays > maxAllowedDays) {
        console.warn(`Timeline header too long (${totalDays} days), capping at ${maxAllowedDays} days for performance`);
        maxDate = new Date(minDate.getTime() + (maxAllowedDays - 1) * 24 * 60 * 60 * 1000);
        totalDays = maxAllowedDays;
    }
    
    // Additional safety check
    if (totalDays > 5000) {
        console.error(`Timeline header still too long (${totalDays} days), forcing to 365 days`);
        totalDays = 365;
        maxDate = new Date(minDate.getTime() + 364 * 24 * 60 * 60 * 1000);
    }
    const pxPerDay = 20;
    
    // Set width of the timeline header
    timelineHeader.style.width = (totalDays * pxPerDay) + 'px';
    
    // Create month headers
    const months = [];
    const currentDate = new Date(minDate);
    currentDate.setDate(1); // Start from first day of month
    
    while (currentDate <= maxDate) {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        months.push({ month, year, date: new Date(currentDate) });
        
        // Move to next month
        currentDate.setMonth(month + 1);
    }
    
    months.forEach(monthInfo => {
        const { month, year, date } = monthInfo;
        const monthName = date.toLocaleString('default', { month: 'long' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthWidth = daysInMonth * pxPerDay;
        
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        monthHeader.textContent = `${monthName} ${year}`;
        monthHeader.style.width = monthWidth + 'px';
        monthHeader.style.height = '25px';
        monthHeader.style.borderRight = '1px solid #ddd';
        monthHeader.style.display = 'flex';
        monthHeader.style.alignItems = 'center';
        monthHeader.style.justifyContent = 'center';
        monthHeader.style.backgroundColor = '#f8f8f8';
        monthHeader.style.fontWeight = '600';
        
        monthHeadersContainer.appendChild(monthHeader);
        
        // Create weekly headers instead of daily (4 weeks per month approximately)
        const weeksInMonth = Math.ceil(daysInMonth / 7);
        const weekWidth = monthWidth / weeksInMonth;
        
        for (let week = 0; week < weeksInMonth; week++) {
            const weekStart = week * 7 + 1;
            const weekEnd = Math.min((week + 1) * 7, daysInMonth);
            
            const weekHeader = document.createElement('div');
            weekHeader.className = 'week-header';
            weekHeader.textContent = `${weekStart}-${weekEnd}`;
            weekHeader.style.width = weekWidth + 'px';
            weekHeader.style.height = '25px';
            weekHeader.style.borderRight = '1px solid #eee';
            weekHeader.style.display = 'flex';
            weekHeader.style.alignItems = 'center';
            weekHeader.style.justifyContent = 'center';
            weekHeader.style.fontSize = '0.75rem';
            weekHeader.style.color = '#666';
            
            dayHeadersContainer.appendChild(weekHeader);
        }
    });

    console.log(`Rendered timeline header with ${months.length} months and weekly view for ${tasksToDisplay.length} tasks`);
}

function renderTodayLine() {
    const ganttBarsContainer = document.getElementById('ganttBars');
    if (!ganttBarsContainer || !window.ganttDimensions) return;
    
    const { minDate, pxPerDay } = window.ganttDimensions;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Remove existing today line
    const existingLine = ganttBarsContainer.querySelector('.today-line');
    if (existingLine) {
        existingLine.remove();
    }
    
    // Check if today is within the visible range
    if (today >= minDate) {
        const daysFromStart = Math.floor((today - minDate) / (1000 * 60 * 60 * 24));
        const todayX = daysFromStart * pxPerDay;
        
        const todayLine = document.createElement('div');
        todayLine.className = 'today-line';
        todayLine.style.position = 'absolute';
        todayLine.style.left = todayX + 'px';
        todayLine.style.top = '0';
        todayLine.style.bottom = '0';
        todayLine.style.width = '2px';
        todayLine.style.backgroundColor = '#e53e3e';
        todayLine.style.zIndex = '5';
        todayLine.style.pointerEvents = 'none';
        todayLine.title = 'Today';
        
        ganttBarsContainer.appendChild(todayLine);
        
        // Scroll to center today's line
        setTimeout(() => {
            const timelineContainer = document.getElementById('timeline-area-container');
            if (timelineContainer) {
                const containerWidth = timelineContainer.clientWidth;
                const scrollLeft = Math.max(0, todayX - containerWidth / 2);
                timelineContainer.scrollLeft = scrollLeft;
                
                // Also sync the timeline header scroll
                const timelineHeaderContainer = document.getElementById('timeline-header-container');
                if (timelineHeaderContainer) {
                    timelineHeaderContainer.scrollLeft = scrollLeft;
                }
            }
        }, 100);
    }
}

function setupEventListeners() {
    // Sync scrolling between table and chart
    const tableWrapper = document.querySelector('.table-wrapper');
    const timelineAreaContainer = document.getElementById('timeline-area-container');
    const timelineHeaderContainer = document.getElementById('timeline-header-container');
    
    if (tableWrapper && timelineAreaContainer) {
        // Sync vertical scrolling between table and timeline area
        tableWrapper.addEventListener('scroll', (e) => {
            timelineAreaContainer.scrollTop = e.target.scrollTop;
        });
        
        // Sync scrolling from timeline area to table
        timelineAreaContainer.addEventListener('scroll', (e) => {
            tableWrapper.scrollTop = e.target.scrollTop;
            
            // Also sync horizontal scrolling with timeline header
            if (timelineHeaderContainer) {
                timelineHeaderContainer.scrollLeft = e.target.scrollLeft;
            }
        });
        
        // Sync horizontal scrolling from timeline header to timeline area
        if (timelineHeaderContainer) {
            timelineHeaderContainer.addEventListener('scroll', (e) => {
                timelineAreaContainer.scrollLeft = e.target.scrollLeft;
            });
        }
    }
    
    // Setup Show Dependencies button
    const showDependenciesBtn = document.getElementById('showDependencies');
    if (showDependenciesBtn) {
        showDependenciesBtn.addEventListener('click', () => {
            showDependenciesBtn.classList.toggle('active');
            
            const isActive = showDependenciesBtn.classList.contains('active');
            console.log(`Dependencies button clicked. Active: ${isActive}`);
            
            if (isActive) {
                console.log('Showing dependency lines...');
                renderDependencyLines(); // Show dependency lines
                showDependenciesBtn.style.backgroundColor = '#dbeafe'; // Light blue background when active
                showDependenciesBtn.style.color = '#1e40af'; // Darker blue text
            } else {
                console.log('Hiding dependency lines...');
                // Remove dependency lines
                const ganttBarsContainer = document.getElementById('ganttBars');
                if (ganttBarsContainer) {
                    const existingLines = ganttBarsContainer.querySelectorAll('.dependency-line');
                    console.log(`Removing ${existingLines.length} dependency lines`);
                    existingLines.forEach(line => line.remove());
                }
                showDependenciesBtn.style.backgroundColor = ''; // Reset background
                showDependenciesBtn.style.color = ''; // Reset text color
            }
        });
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString();
}

function formatDuration(hours) {
    if (!hours) return '';
    const days = Math.round(hours / 8);
    return days + 'd';
}

function renderDependencyLines() {
    console.log('Rendering dependency lines...');
    
    if (!projectDependencies || projectDependencies.length === 0) {
        console.log('No dependencies to render');
        return;
    }

    const ganttBarsContainer = document.getElementById('ganttBars');
    if (!ganttBarsContainer || !window.ganttBarPositions) {
        console.error('Cannot render dependencies: missing container or bar positions');
        return;
    }

    // Remove existing dependency lines
    const existingLines = ganttBarsContainer.querySelectorAll('.dependency-line');
    existingLines.forEach(line => line.remove());
    console.log(`Removed ${existingLines.length} existing dependency lines`);

    const barPositions = window.ganttBarPositions;
    const filteredTaskIds = new Set(filteredTasks.map(task => task.task_id));

    // Filter dependencies to only show ones between visible tasks
    let visibleDependencies = projectDependencies.filter(dep => 
        filteredTaskIds.has(dep.pred_task_id) && filteredTaskIds.has(dep.task_id)
    );

    console.log(`Found ${visibleDependencies.length} dependencies between visible tasks (from ${projectDependencies.length} total)`);

    // Show more dependencies but still limit to prevent clutter (increase to 100)
    if (visibleDependencies.length > 100) {
        console.log(`Limiting dependencies from ${visibleDependencies.length} to 100 to prevent clutter`);
        visibleDependencies = visibleDependencies.slice(0, 100);
    }

    let renderedCount = 0;
    visibleDependencies.forEach((dependency, index) => {
        const predPos = barPositions.get(dependency.pred_task_id);
        const succPos = barPositions.get(dependency.task_id);

        if (!predPos || !succPos) {
            console.warn(`Missing position for dependency: ${dependency.pred_task_id} -> ${dependency.task_id}`);
            return;
        }

        // Allow backward dependencies but make them visually distinct
        const isBackward = succPos.left <= predPos.right;
        if (isBackward) {
            console.log(`Rendering backward dependency: ${dependency.pred_task_id} -> ${dependency.task_id}`);
        }

        console.log(`Creating dependency line ${index + 1}: Task ${dependency.pred_task_id} -> Task ${dependency.task_id} ${isBackward ? '(backward)' : ''}`);

        // Calculate line coordinates
        const startX = predPos.right + 5; // Small gap from predecessor bar
        const startY = predPos.centerY;
        const endX = succPos.left - 5; // Small gap to successor bar
        const endY = succPos.centerY;

        // Choose line color based on type
        const lineColor = isBackward ? '#ff6b6b' : '#666'; // Red for backward, gray for forward

        if (Math.abs(endY - startY) < 5) {
            // Simple horizontal line
            const line = document.createElement('div');
            line.className = 'dependency-line';
            line.style.position = 'absolute';
            line.style.zIndex = '2';
            line.style.pointerEvents = 'none';
            line.style.left = Math.min(startX, endX) + 'px';
            line.style.top = startY + 'px';
            line.style.width = Math.abs(endX - startX) + 'px';
            line.style.height = '2px';
            line.style.backgroundColor = lineColor;
            
            // Add arrow at the end
            const arrow = document.createElement('div');
            arrow.style.position = 'absolute';
            arrow.style.right = isBackward ? 'auto' : '-6px';
            arrow.style.left = isBackward ? '-6px' : 'auto';
            arrow.style.top = '-3px';
            arrow.style.width = '0';
            arrow.style.height = '0';
            arrow.style.borderTop = '4px solid transparent';
            arrow.style.borderBottom = '4px solid transparent';
            if (isBackward) {
                arrow.style.borderRight = `6px solid ${lineColor}`;
            } else {
                arrow.style.borderLeft = `6px solid ${lineColor}`;
            }
            line.appendChild(arrow);
            
            ganttBarsContainer.appendChild(line);
            renderedCount++;
        } else {
            // L-shaped line using CSS borders
            const midX = startX + Math.min(50, Math.abs(endX - startX) * 0.6);
            
            // Horizontal segment
            const horizontalLine = document.createElement('div');
            horizontalLine.className = 'dependency-line';
            horizontalLine.style.position = 'absolute';
            horizontalLine.style.left = startX + 'px';
            horizontalLine.style.top = startY + 'px';
            horizontalLine.style.width = Math.abs(midX - startX) + 'px';
            horizontalLine.style.height = '2px';
            horizontalLine.style.backgroundColor = lineColor;
            ganttBarsContainer.appendChild(horizontalLine);
            
            // Vertical segment
            const verticalLine = document.createElement('div');
            verticalLine.className = 'dependency-line';
            verticalLine.style.position = 'absolute';
            verticalLine.style.left = midX + 'px';
            verticalLine.style.top = Math.min(startY, endY) + 'px';
            verticalLine.style.width = '2px';
            verticalLine.style.height = Math.abs(endY - startY) + 'px';
            verticalLine.style.backgroundColor = lineColor;
            ganttBarsContainer.appendChild(verticalLine);
            
            // Final horizontal segment with arrow
            const finalLine = document.createElement('div');
            finalLine.className = 'dependency-line';
            finalLine.style.position = 'absolute';
            finalLine.style.left = midX + 'px';
            finalLine.style.top = endY + 'px';
            finalLine.style.width = Math.abs(endX - midX) + 'px';
            finalLine.style.height = '2px';
            finalLine.style.backgroundColor = lineColor;
            
            // Add arrow at the end
            const arrow = document.createElement('div');
            arrow.style.position = 'absolute';
            arrow.style.right = isBackward ? 'auto' : '-6px';
            arrow.style.left = isBackward ? '-6px' : 'auto';
            arrow.style.top = '-3px';
            arrow.style.width = '0';
            arrow.style.height = '0';
            arrow.style.borderTop = '4px solid transparent';
            arrow.style.borderBottom = '4px solid transparent';
            if (isBackward) {
                arrow.style.borderRight = `6px solid ${lineColor}`;
            } else {
                arrow.style.borderLeft = `6px solid ${lineColor}`;
            }
            finalLine.appendChild(arrow);
            
            ganttBarsContainer.appendChild(finalLine);
            renderedCount++;
        }
    });

    console.log(`Successfully rendered ${renderedCount} dependency lines out of ${visibleDependencies.length} visible dependencies`);
}

// On DOMContentLoaded, load projects
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - initializing Gantt chart');
    loadProjects();
    addResizeFunctionality();
});

// Add resize functionality between table and chart
function addResizeFunctionality() {
    const resizeHandle = document.getElementById('resizeHandle');
    const taskTableContainer = document.getElementById('taskTableContainer');
    const contentContainer = document.querySelector('.content-container');
    
    if (!resizeHandle || !taskTableContainer || !contentContainer) {
        console.log('Resize elements not found');
        return;
    }
    
    let isResizing = false;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const containerRect = contentContainer.getBoundingClientRect();
        const newTableWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        // Constrain between 30% and 80%
        const constrainedWidth = Math.max(30, Math.min(80, newTableWidth));
        
        taskTableContainer.style.width = constrainedWidth + '%';
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
} 