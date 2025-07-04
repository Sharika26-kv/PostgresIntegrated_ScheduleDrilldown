// AWP Split-View Gantt Chart with Dependencies
console.log('Loading AWP Split-View Gantt Chart...');

// Configuration Parameters
const CONFIG = {
    TABLE_WIDTH: '50%',
    GANTT_WIDTH: '50%', 
    ROW_HEIGHT: 28,
    HEADER_HEIGHT: 80,
    COLUMNS: [
        { key: 'activity_name', label: 'ACTIVITY NAME', width: '80px' },
        { key: 'task_name', label: 'TASK_NAME', width: '350px' },
        { key: 'start_date', label: 'START_DATE', width: '90px' },
        { key: 'finish_date', label: 'FINISH_DATE', width: '90px' },
        { key: 'duration', label: 'DURATION', width: '60px' },
        { key: 'percent_complete', label: 'PERCENT_COMPLETE', width: '60px' },
        { key: 'sequence', label: 'SEQUENCE', width: '50px' }
    ],
    HIERARCHY_TYPE: 'AWP',
    SHOW_LEVELS: [1, 2, 3],
    DATA_ENDPOINT: '/api/awp-hierarchy-with-tasks',
    DEPENDENCIES_ENDPOINT: '/api/gantt/projects',
    TIME_SCALE: 'weeks',
    PRIMARY_COLOR: '#4A90E2',
    SECONDARY_COLOR: '#E74C3C',
    COLOR_ASSIGNMENT: 'alternating',
    FILTER_CRITERIA: 'future_tasks_only',
    PARENT_HIERARCHY: 'Activity_code',
    SORT_BY: 'start_date',
    LABEL_FORMAT: 'task_name',
    SHOW_DEPENDENCIES: false,
    HIGHLIGHT_WEEKENDS: false
};

// Global state
let currentProjectId = null;
let awpData = [];
let filteredData = [];
let expandedNodes = new Set();
let currentDate = new Date();
let timelineRange = { start: new Date(), end: new Date() };
let projectDependencies = [];
let barPositions = new Map();

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('AWP Split-View Gantt ready');
    initializeInterface();
    setupEventListeners();
    loadProjects();
});

// Initialize the split-view interface
function initializeInterface() {
    console.log('🔧 Initializing split-view interface...');
    
    // Use the existing HTML containers without changing their IDs
    const existingSplitView = document.getElementById('splitView');
    const existingTableContainer = document.getElementById('taskTableContainer');
    const existingTimelineContainer = document.getElementById('gantt-timeline');
    const existingResizeHandle = document.getElementById('resizeHandle');
    
    if (!existingSplitView || !existingTableContainer || !existingTimelineContainer) {
        console.error('❌ Required HTML containers not found');
        return;
    }
    
    console.log('✅ Using existing HTML containers for split view');
    
    // Ensure the split view has the correct flex layout (it should already have it)
    if (!existingSplitView.style.display) {
        existingSplitView.style.display = 'flex';
    }
    
    // DON'T change the container IDs - keep them as they are
    // The HTML structure is already correct for horizontal layout
    
    // Ensure timeline header exists or create it
    let timelineHeader = document.getElementById('timeline-header');
    if (!timelineHeader) {
        timelineHeader = document.createElement('div');
        timelineHeader.id = 'timeline-header';
        timelineHeader.style.cssText = `
            height: 80px;
            background: #f8f9fa;
            border-bottom: 1px solid #e5e7eb;
            position: relative;
        `;
        existingTimelineContainer.prepend(timelineHeader);
    }
    
    // Ensure gantt bars container exists in the timeline
    let ganttBars = document.getElementById('ganttBars');
    if (!ganttBars) {
        // Find the existing container in the timeline
        const existingGanttArea = existingTimelineContainer.querySelector('div:last-child');
        if (existingGanttArea) {
            const existingGanttBars = existingGanttArea.querySelector('#ganttBars');
            if (existingGanttBars) {
                ganttBars = existingGanttBars;
            } else {
                // Create gantt bars in the existing structure
                ganttBars = document.createElement('div');
                ganttBars.id = 'ganttBars';
                ganttBars.style.cssText = `
                    position: relative;
                    width: 100%;
                    min-height: 100%;
                `;
                existingGanttArea.appendChild(ganttBars);
            }
        }
        
        // Create dependencies container if it doesn't exist
        let dependenciesContainer = document.getElementById('dependencies-container');
        if (!dependenciesContainer) {
            dependenciesContainer = document.createElement('div');
            dependenciesContainer.id = 'dependencies-container';
            dependenciesContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 5;
                display: ${CONFIG.SHOW_DEPENDENCIES ? 'block' : 'none'};
            `;
            if (existingGanttArea) {
                existingGanttArea.appendChild(dependenciesContainer);
            }
        }
    }
    
    // Setup resize functionality if resize handle exists
    if (existingResizeHandle) {
        setupResizeHandle(existingResizeHandle, existingTableContainer, existingTimelineContainer);
    }
    
    // Add dependencies control
    addDependenciesControl();
    
    // Setup scroll sync with the original container IDs
    setupScrollSyncOriginal();
    
    console.log('✅ Split-view interface initialized using existing HTML structure');
}

// Add dependencies control
function addDependenciesControl() {
    const limitControls = document.getElementById('limitControls');
    if (limitControls) {
        // Add dependencies toggle button
        const dependenciesBtn = document.createElement('button');
        dependenciesBtn.id = 'showDependencies';
        dependenciesBtn.className = `px-3 py-1 rounded text-sm border transition-colors ${CONFIG.SHOW_DEPENDENCIES ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;
        dependenciesBtn.textContent = 'Show Dependencies';
        
        limitControls.appendChild(dependenciesBtn);
        limitControls.style.display = 'flex';
    }
}

// Setup resize handle for split view
function setupResizeHandle(handle, tableContainer, timelineContainer) {
    let isResizing = false;
    
    handle.addEventListener('mousedown', function(e) {
        isResizing = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
    });
    
    function handleMouseMove(e) {
        if (!isResizing) return;
        
        const splitContainer = handle.parentElement;
        if (!splitContainer) return;
        
        const rect = splitContainer.getBoundingClientRect();
        const percentage = ((e.clientX - rect.left) / rect.width) * 100;
        
        // Limit resize between 30% and 70%
        const clampedPercentage = Math.max(30, Math.min(70, percentage));
        
        tableContainer.style.width = `${clampedPercentage}%`;
        // Timeline container is flex: 1, so it will automatically take remaining space
    }
    
    function handleMouseUp() {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Project filter
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
        projectFilter.addEventListener('change', async function() {
            const projectId = this.value;
            if (projectId) {
                currentProjectId = projectId;
                await loadAWPDataWithTasks(projectId);
                await loadProjectDependencies(projectId);
            } else {
                clearData();
            }
        });
    }
    
    // Dependencies toggle
    const dependenciesToggle = document.getElementById('showDependencies');
    if (dependenciesToggle) {
        dependenciesToggle.addEventListener('click', function() {
            CONFIG.SHOW_DEPENDENCIES = !CONFIG.SHOW_DEPENDENCIES;
            this.classList.toggle('active', CONFIG.SHOW_DEPENDENCIES);
            toggleDependencies();
        });
    }
    
    // Sync scrolling between table and timeline
    setupScrollSync();
}

// Setup scroll synchronization
function setupScrollSync() {
    const tableContainer = document.getElementById('taskTableContainer');
    const timelineContainer = document.getElementById('gantt-timeline');
    
    if (tableContainer && timelineContainer) {
        // Find the scrollable content areas within each container
        const tableScrollArea = tableContainer.querySelector('.table-wrapper') || tableContainer;
        const timelineScrollArea = timelineContainer.querySelector('div:last-child') || timelineContainer;
        
        let syncingScroll = false;
        
        tableScrollArea.addEventListener('scroll', function() {
            if (!syncingScroll) {
                syncingScroll = true;
                timelineScrollArea.scrollTop = this.scrollTop;
                setTimeout(() => syncingScroll = false, 10);
            }
        });
        
        timelineScrollArea.addEventListener('scroll', function() {
            if (!syncingScroll) {
                syncingScroll = true;
                tableScrollArea.scrollTop = this.scrollTop;
                setTimeout(() => syncingScroll = false, 10);
            }
        });
        
        console.log('✅ Scroll synchronization setup between existing containers');
    } else {
        console.warn('⚠️ Could not setup scroll sync - containers not found');
    }
}

// Setup scroll synchronization with original container IDs
function setupScrollSyncOriginal() {
    const tableContainer = document.getElementById('taskTableContainer');
    const timelineContainer = document.getElementById('gantt-timeline');
    
    if (tableContainer && timelineContainer) {
        // Find the scrollable content areas within each container
        const tableScrollArea = tableContainer.querySelector('.table-wrapper') || tableContainer;
        const timelineScrollArea = timelineContainer.querySelector('div:last-child') || timelineContainer;
        
        let syncingScroll = false;
        
        tableScrollArea.addEventListener('scroll', function() {
            if (!syncingScroll) {
                syncingScroll = true;
                timelineScrollArea.scrollTop = this.scrollTop;
                setTimeout(() => syncingScroll = false, 10);
            }
        });
        
        timelineScrollArea.addEventListener('scroll', function() {
            if (!syncingScroll) {
                syncingScroll = true;
                tableScrollArea.scrollTop = this.scrollTop;
                setTimeout(() => syncingScroll = false, 10);
            }
        });
        
        console.log('✅ Scroll synchronization setup between original containers');
    } else {
        console.warn('⚠️ Could not setup scroll sync - original containers not found');
    }
}

// Load projects
async function loadProjects() {
    try {
        const response = await fetch('/api/gantt/projects');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const projects = data.projects || data;
        
        const select = document.getElementById('projectFilter');
        if (select) {
        select.innerHTML = '<option value="">Select a project...</option>';
        
        if (Array.isArray(projects)) {
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.proj_id;
                option.textContent = `${project.proj_short_name} - ${project.proj_name}`;
                select.appendChild(option);
            });
            
            // Auto-select project 389
            select.value = '389';
                currentProjectId = '389';
                await loadAWPDataWithTasks('389');
                await loadProjectDependencies('389');
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        // Auto-load project 389 anyway
        currentProjectId = '389';
        await loadAWPDataWithTasks('389');
        await loadProjectDependencies('389');
    }
}

// Load AWP hierarchy with tasks
async function loadAWPDataWithTasks(projectId) {
    try {
        console.log(`Loading AWP hierarchy with tasks for project ${projectId}`);
        showLoading();
        
        const response = await fetch(`${CONFIG.DATA_ENDPOINT}?projectId=${projectId}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        awpData = await response.json();
        console.log(`✅ Loaded ${awpData.length} AWP items and tasks`);
        
        processAWPData();
        setupTimelineRange();
        buildHierarchy();
        renderInterface();
        
    } catch (error) {
        console.error('Error loading AWP data:', error);
        showError(`Failed to load: ${error.message}`);
    }
}

// Load project dependencies
async function loadProjectDependencies(projectId) {
    try {
        console.log(`🔗 Loading dependencies for project ${projectId}`);
        
        const response = await fetch(`${CONFIG.DEPENDENCIES_ENDPOINT}/${projectId}/dependencies`);
        if (!response.ok) throw new Error(`Dependencies API error: ${response.status}`);
        
        projectDependencies = await response.json();
        console.log(`✅ Loaded ${projectDependencies.length} dependencies`);
        
        // Re-render dependencies if they should be visible
        if (CONFIG.SHOW_DEPENDENCIES) {
            renderDependencies();
        }
        
    } catch (error) {
        console.error('Error loading dependencies:', error);
        projectDependencies = [];
    }
}

// Process AWP data
function processAWPData() {
    const awpGroups = new Map();
    
    awpData.forEach(item => {
        const awpId = item.actv_code_id;
        
        if (!awpGroups.has(awpId)) {
            awpGroups.set(awpId, {
                awp: {
                    actv_code_id: item.actv_code_id,
                    Activity_code: item.Activity_code,
                    Activity_name: item.Activity_name,
                    level: item.level,
                    sequence: item.sequence,
                    color: item.color,
                    actv_code_type: item.actv_code_type,
                    parent_actv_code_id: item.parent_actv_code_id
                },
                tasks: []
            });
        }
        
        if (item.task_id && item.item_type === 'task') {
            const task = {
                task_id: item.task_id,
                task_name: item.task_name,
                task_code: item.task_code,
                start_date: item.start_date || item.target_start_date,
                end_date: item.end_date || item.target_end_date,
                duration_hr_cnt: item.duration_hr_cnt,
                phys_complete_pct: item.phys_complete_pct || 0
            };
            
            if (task.start_date && task.end_date) {
                const taskDate = new Date(task.end_date);
                if (CONFIG.FILTER_CRITERIA === 'future_tasks_only' && taskDate >= currentDate) {
                    awpGroups.get(awpId).tasks.push(task);
                } else if (CONFIG.FILTER_CRITERIA !== 'future_tasks_only') {
                    awpGroups.get(awpId).tasks.push(task);
                }
            }
        }
    });
    
    awpData = Array.from(awpGroups.values());
    
    // Auto-expand nodes with tasks
    expandedNodes.clear();
    awpData.forEach(group => {
        if (CONFIG.SHOW_LEVELS.includes(group.awp.level) || group.tasks.length > 0) {
            expandedNodes.add(group.awp.actv_code_id);
        }
    });
}

// Setup timeline range
function setupTimelineRange() {
    let minDate = null;
    let maxDate = null;
    
    awpData.forEach(group => {
        group.tasks.forEach(task => {
            if (task.start_date) {
                const startDate = new Date(task.start_date);
                if (!minDate || startDate < minDate) minDate = startDate;
            }
            if (task.end_date) {
                const endDate = new Date(task.end_date);
                if (!maxDate || endDate > maxDate) maxDate = endDate;
            }
        });
    });
    
    if (minDate && maxDate) {
        // Add buffer to show context
        timelineRange.start = new Date(minDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days before
        timelineRange.end = new Date(maxDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after
    } else {
        // Default range
        timelineRange.start = new Date(2025, 4, 1); // May 2025
        timelineRange.end = new Date(2026, 4, 31); // May 2026
    }
    
    console.log('Timeline range:', timelineRange);
}

// Build hierarchy
function buildHierarchy() {
    filteredData = [];
    
    awpData.forEach(group => {
        if (group.awp.level === 1) {
            addAWPGroup(group);
            if (expandedNodes.has(group.awp.actv_code_id)) {
                addChildrenGroups(group.awp.actv_code_id);
            }
        }
    });
    
    // Sort by configured sort method
    if (CONFIG.SORT_BY === 'start_date') {
        filteredData.sort((a, b) => {
            const aDate = new Date(a.start_date || a.target_start_date || '2099-12-31');
            const bDate = new Date(b.start_date || b.target_start_date || '2099-12-31');
            return aDate - bDate;
        });
    }
}

function addAWPGroup(group) {
    filteredData.push({
        ...group.awp,
        type: 'awp',
        hasChildren: awpData.some(child => child.awp.parent_actv_code_id === group.awp.actv_code_id) || group.tasks.length > 0,
        isExpanded: expandedNodes.has(group.awp.actv_code_id),
        tasks: group.tasks
    });
    
    if (expandedNodes.has(group.awp.actv_code_id)) {
        group.tasks.forEach(task => {
            filteredData.push({
                ...task,
                type: 'task',
                level: group.awp.level + 1,
                parent_awp: group.awp.Activity_code,
                color: group.awp.color
            });
        });
    }
}

function addChildrenGroups(parentId) {
    const children = awpData.filter(group => group.awp.parent_actv_code_id === parentId);
    children.forEach(childGroup => {
        addAWPGroup(childGroup);
        if (expandedNodes.has(childGroup.awp.actv_code_id)) {
            addChildrenGroups(childGroup.awp.actv_code_id);
        }
    });
}

// Render the complete interface
function renderInterface() {
    renderTable();
    renderTimelineHeader();
    renderGanttBars();
    if (CONFIG.SHOW_DEPENDENCIES) {
        renderDependencies();
    }
}

// Render table
function renderTable() {
    // Target the existing table body in the HTML structure
    const tableBody = document.getElementById('awp-table-body-split');
    if (!tableBody) {
        console.warn('⚠️ Table body not found, table not rendered');
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="6" style="padding: 20px; text-align: center; color: #6b7280; font-style: italic;">No data to display</td>`;
        tableBody.appendChild(emptyRow);
    } else {
    filteredData.forEach((item, index) => {
        const row = document.createElement('tr');
            row.style.cssText = `
                height: ${CONFIG.ROW_HEIGHT}px;
                background: ${getRowBackground(item, index)};
            `;
            
            // Create cells for each column in the existing table structure
            // AWP Code
            const awpCodeCell = document.createElement('td');
            awpCodeCell.style.cssText = `
                padding: 4px 8px;
                border-right: 1px solid #e5e7eb;
                border-bottom: 1px solid #f0f0f0;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                font-size: 12px;
                vertical-align: middle;
            `;
            awpCodeCell.textContent = item.actv_code_id || '-';
            row.appendChild(awpCodeCell);
            
            // Activity Name (with expand/collapse)
            const activityNameCell = document.createElement('td');
            const indent = (item.level - 1) * 20;
            activityNameCell.style.cssText = `
                padding: 4px 8px;
                padding-left: ${8 + indent}px;
                border-right: 1px solid #e5e7eb;
                border-bottom: 1px solid #f0f0f0;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                font-size: 12px;
                vertical-align: middle;
            `;
            
        if (item.type === 'awp' && item.hasChildren) {
                const expandIcon = document.createElement('i');
                expandIcon.className = `fas ${item.isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`;
                expandIcon.style.cssText = `
                    cursor: pointer;
                    margin-right: 5px;
                    color: #6b7280;
                `;
                expandIcon.onclick = () => toggleExpand(item.actv_code_id);
                activityNameCell.appendChild(expandIcon);
            }
            
            const activityName = item.type === 'awp' ? (item.Activity_name || '-') : (item.task_name || '-');
            activityNameCell.appendChild(document.createTextNode(activityName));
            row.appendChild(activityNameCell);
            
            // Level
            const levelCell = document.createElement('td');
            levelCell.style.cssText = `
                padding: 4px 8px;
                border-right: 1px solid #e5e7eb;
                border-bottom: 1px solid #f0f0f0;
                font-size: 12px;
                vertical-align: middle;
            `;
            levelCell.textContent = item.level || '-';
            row.appendChild(levelCell);
            
            // Sequence
            const sequenceCell = document.createElement('td');
            sequenceCell.style.cssText = `
                padding: 4px 8px;
                border-right: 1px solid #e5e7eb;
                border-bottom: 1px solid #f0f0f0;
                font-size: 12px;
                vertical-align: middle;
            `;
            sequenceCell.textContent = item.sequence || '-';
            row.appendChild(sequenceCell);
            
            // Color
            const colorCell = document.createElement('td');
            colorCell.style.cssText = `
                padding: 4px 8px;
                border-right: 1px solid #e5e7eb;
                border-bottom: 1px solid #f0f0f0;
                font-size: 12px;
                vertical-align: middle;
            `;
            const colorDiv = document.createElement('div');
            colorDiv.style.cssText = `
                width: 20px;
                height: 15px;
                background: ${item.color || '#ccc'};
                border-radius: 3px;
                border: 1px solid #ddd;
            `;
            colorCell.appendChild(colorDiv);
            row.appendChild(colorCell);
            
            // AWP Type
            const typeCell = document.createElement('td');
            typeCell.style.cssText = `
                padding: 4px 8px;
                border-bottom: 1px solid #f0f0f0;
                font-size: 12px;
                vertical-align: middle;
            `;
            typeCell.textContent = item.type || '-';
            row.appendChild(typeCell);
            
            tableBody.appendChild(row);
        });
    }
}
        
function getRowBackground(item, index) {
        if (item.type === 'awp') {
        if (item.level === 1) return '#EBF4FF';
        if (item.level === 2) return '#F7FAFC';
        return '#FEFEFE';
    }
    return index % 2 === 0 ? '#FEFEFE' : '#FAFAFA';
}

function getCellValue(item, key) {
    switch (key) {
        case 'activity_name':
            return item.type === 'awp' ? (item.Activity_name || '-') : (item.task_name || '-');
        case 'task_name':
            return item.type === 'task' ? (item.task_name || '-') : '-';
        case 'start_date':
            return item.start_date ? formatDate(new Date(item.start_date)) : '-';
        case 'finish_date':
            return item.end_date ? formatDate(new Date(item.end_date)) : '-';
        case 'duration':
            return item.duration_hr_cnt ? `${Math.round(item.duration_hr_cnt / 8)}d` : '-';
        case 'percent_complete':
            return item.phys_complete_pct ? `${item.phys_complete_pct}%` : '0%';
        case 'sequence':
            return item.sequence || '-';
        default:
            return '-';
    }
}

// Render timeline header
function renderTimelineHeader() {
    const timelineHeader = document.getElementById('timeline-header');
    if (!timelineHeader) return;
    
    timelineHeader.innerHTML = '';
    
    const totalDays = Math.ceil((timelineRange.end - timelineRange.start) / (1000 * 60 * 60 * 24));
    const timelineWidth = Math.max(totalDays * 4, 800); // Minimum width
    
    // Month header
    const monthsRow = document.createElement('div');
    monthsRow.style.cssText = `
        display: flex;
        height: 40px;
        background: #F9FAFB;
        border-bottom: 1px solid #E5E7EB;
        font-weight: 600;
        font-size: 14px;
        width: ${timelineWidth}px;
        min-width: 100%;
    `;
    
    // Week header
    const weeksRow = document.createElement('div');
    weeksRow.style.cssText = `
        display: flex;
        height: 40px;
        background: #F3F4F6;
        border-bottom: 1px solid #E5E7EB;
        font-size: 12px;
        width: ${timelineWidth}px;
        min-width: 100%;
    `;
    
    generateTimelineHeaders(monthsRow, weeksRow, totalDays, timelineWidth);
    
    timelineHeader.appendChild(monthsRow);
    timelineHeader.appendChild(weeksRow);
    
    // Set timeline content width
    const timelineContent = document.getElementById('timeline-content');
    if (timelineContent) {
        timelineContent.style.minWidth = `${timelineWidth}px`;
    }
}

function generateTimelineHeaders(monthsRow, weeksRow, totalDays, timelineWidth) {
    const months = [];
    const weeks = [];
    
    let currentDate = new Date(timelineRange.start);
    
    // Generate months
    while (currentDate <= timelineRange.end) {
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const monthEndInRange = monthEnd > timelineRange.end ? timelineRange.end : monthEnd;
        const daysInMonth = Math.ceil((monthEndInRange - currentDate) / (1000 * 60 * 60 * 24));
        
        months.push({
            name: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            width: (daysInMonth / totalDays) * 100
        });
        
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    
    // Generate weeks (showing only 4 days as requested)
    currentDate = new Date(timelineRange.start);
    while (currentDate <= timelineRange.end) {
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(currentDate.getDate() + 6);
        
        const weekEndInRange = weekEnd > timelineRange.end ? timelineRange.end : weekEnd;
        const daysInWeek = Math.ceil((weekEndInRange - currentDate) / (1000 * 60 * 60 * 24)) + 1;
        
        weeks.push({
            name: `${currentDate.getDate()}-${weekEndInRange.getDate()}`,
            width: (daysInWeek / totalDays) * 100
        });
        
        currentDate = new Date(weekEnd);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Render months
    months.forEach(month => {
        const monthDiv = document.createElement('div');
        monthDiv.style.cssText = `
            width: ${month.width}%;
            border-right: 1px solid #D1D5DB;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #374151;
        `;
        monthDiv.textContent = month.name;
        monthsRow.appendChild(monthDiv);
    });
    
    // Render weeks
    weeks.forEach(week => {
        const weekDiv = document.createElement('div');
        weekDiv.style.cssText = `
            width: ${week.width}%;
            border-right: 1px solid #D1D5DB;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6B7280;
        `;
        weekDiv.textContent = week.name;
        weeksRow.appendChild(weekDiv);
    });
}

// Render Gantt bars
function renderGanttBars() {
    const ganttBars = document.getElementById('ganttBars');
    if (!ganttBars) return;
    
    ganttBars.innerHTML = '';
    barPositions.clear();
    
    if (filteredData.length === 0) return;
    
    const totalDays = Math.ceil((timelineRange.end - timelineRange.start) / (1000 * 60 * 60 * 24));
    const timelineWidth = Math.max(totalDays * 4, 800);
    
    ganttBars.style.width = `${timelineWidth}px`;
    ganttBars.style.minWidth = '100%';
    
    filteredData.forEach((item, index) => {
        const barRow = document.createElement('div');
        barRow.style.cssText = `
            height: ${CONFIG.ROW_HEIGHT}px;
            position: relative;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
        `;
        
        if (item.type === 'task' && item.start_date && item.end_date) {
            const taskBar = createTaskBar(item, index, totalDays, timelineWidth);
            if (taskBar) {
                barRow.appendChild(taskBar);
                
                // Store position for dependencies
                const rect = {
                    left: parseFloat(taskBar.style.left),
                    width: parseFloat(taskBar.style.width),
                    top: index * CONFIG.ROW_HEIGHT,
                    height: CONFIG.ROW_HEIGHT
                };
                barPositions.set(item.task_id, rect);
            }
        }
        
        ganttBars.appendChild(barRow);
    });
    
    // Add today line
    addTodayLine(ganttBars, totalDays, timelineWidth);
}

function createTaskBar(item, index, totalDays, timelineWidth) {
            const startDate = new Date(item.start_date);
            const endDate = new Date(item.end_date);
            
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
    
            const startOffset = Math.max(0, (startDate - timelineRange.start) / (1000 * 60 * 60 * 24));
            const duration = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
            
            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = Math.min((duration / totalDays) * 100, 100 - leftPercent);
            
    if (leftPercent >= 100 || widthPercent <= 0.1) return null;
    
                const taskBar = document.createElement('div');
    
    // Color assignment
    let color;
    if (CONFIG.COLOR_ASSIGNMENT === 'alternating') {
        color = index % 2 === 0 ? CONFIG.PRIMARY_COLOR : CONFIG.SECONDARY_COLOR;
                } else {
        color = item.color || CONFIG.PRIMARY_COLOR;
                }
                
                taskBar.style.cssText = `
                    position: absolute;
                    left: ${leftPercent}%;
                    width: ${widthPercent}%;
                    height: 22px;
        background: ${color};
                    border: 1px solid #333;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    font-size: 11px;
                    color: white;
                    padding: 0 4px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        cursor: pointer;
                    z-index: 2;
                `;
                
    // Progress indicator
                if (item.phys_complete_pct > 0) {
                    const progressBar = document.createElement('div');
                    progressBar.style.cssText = `
                        position: absolute;
                        left: 0;
                        top: 0;
                        height: 100%;
                        width: ${item.phys_complete_pct}%;
                        background: rgba(255,255,255,0.3);
                        border-radius: 4px 0 0 4px;
                    `;
                    taskBar.appendChild(progressBar);
                }
                
                // Task label
                const label = document.createElement('div');
                label.style.cssText = `
                    position: relative;
                    z-index: 3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-weight: 500;
                    color: white;
                    font-size: 11px;
                    text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
                `;
    
    const taskName = item[CONFIG.LABEL_FORMAT] || item.task_name || 'Task';
                label.textContent = taskName.length > 30 ? taskName.substring(0, 30) + '...' : taskName;
                taskBar.appendChild(label);
                
                // Tooltip
                taskBar.title = `${item.task_name}\nStart: ${formatDate(startDate)}\nEnd: ${formatDate(endDate)}\nProgress: ${item.phys_complete_pct || 0}%`;
                
    return taskBar;
}

// Add today line
function addTodayLine(container, totalDays, timelineWidth) {
    const todayOffset = (currentDate - timelineRange.start) / (1000 * 60 * 60 * 24);
    const leftPercent = (todayOffset / totalDays) * 100;
    
    if (leftPercent >= 0 && leftPercent <= 100) {
        const todayLine = document.createElement('div');
        todayLine.style.cssText = `
                    position: absolute;
            left: ${leftPercent}%;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #DC2626;
            z-index: 100;
            pointer-events: none;
        `;
        container.appendChild(todayLine);
    }
}

// Render dependencies
function renderDependencies() {
    const dependenciesContainer = document.getElementById('dependencies-container');
    if (!dependenciesContainer || !projectDependencies.length) return;
    
    dependenciesContainer.innerHTML = '';
    
    projectDependencies.forEach(dep => {
        const predPos = barPositions.get(dep.pred_task_id);
        const succPos = barPositions.get(dep.task_id);
        
        if (predPos && succPos) {
            const dependencyLine = createDependencyLine(predPos, succPos, dep);
            if (dependencyLine) {
                dependenciesContainer.appendChild(dependencyLine);
            }
        }
    });
}

function createDependencyLine(predPos, succPos, dependency) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 3;
    `;
    
    // Calculate connection points
    const startX = predPos.left + predPos.width;
    const startY = predPos.top + (predPos.height / 2);
    const endX = succPos.left;
    const endY = succPos.top + (succPos.height / 2);
    
    // Create path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midX = startX + (endX - startX) / 2;
    
    let pathData;
    if (endX > startX) {
        // Forward dependency
        pathData = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX - 5} ${endY}`;
    } else {
        // Backward dependency
        pathData = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX - 5} ${endY}`;
    }
    
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#666');
    path.setAttribute('stroke-width', '1');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    
    // Create arrowhead marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#666');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);
    svg.appendChild(path);
    
    return svg;
}

// Toggle expand/collapse
function toggleExpand(awpId) {
    if (expandedNodes.has(awpId)) {
        expandedNodes.delete(awpId);
    } else {
        expandedNodes.add(awpId);
    }
    buildHierarchy();
    renderInterface();
}
window.toggleExpand = toggleExpand;

// Toggle dependencies
function toggleDependencies() {
    const dependenciesContainer = document.getElementById('dependencies-container');
    if (dependenciesContainer) {
        dependenciesContainer.style.display = CONFIG.SHOW_DEPENDENCIES ? 'block' : 'none';
        if (CONFIG.SHOW_DEPENDENCIES) {
            renderDependencies();
        }
    }
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function showLoading() {
    const tableBody = document.getElementById('awp-table-body-split');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    }
}

function showError(message) {
    const tableBody = document.getElementById('awp-table-body-split');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> ${message}</td></tr>`;
    }
}

function clearData() {
    awpData = [];
    filteredData = [];
    expandedNodes.clear();
    projectDependencies = [];
    barPositions.clear();
    currentProjectId = null;
    
    const tableBody = document.getElementById('awp-table-body-split');
    if (tableBody) tableBody.innerHTML = '';
    
    const ganttBars = document.getElementById('ganttBars');
    if (ganttBars) ganttBars.innerHTML = '';
    
    const dependenciesContainer = document.getElementById('dependencies-container');
    if (dependenciesContainer) dependenciesContainer.innerHTML = '';
}