// File content cleared. 

// Helper to format dates
function formatDate(dateStr) {
    if (!dateStr || dateStr === null || dateStr === undefined || dateStr === '') return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    // Adjusting date formatting as needed
    return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * Populates the Float Analysis visual (chart).
 * @param {Array<Object>} tasks - The array of task objects.
 */
function createFloatAnalysisChart(tasks) {
    // Logic for creating the stacked bar chart based on float categories
    // This will be adapted from generateCriticalPathReport.txt
    console.log('[Float Analysis] createFloatAnalysisChart received', tasks?.length || 0, 'tasks for chart');

    const HOURS_PER_DAY = 8;

    const taskCategories = {
        negativeFloat: [],
        critical: [],
        nearCritical: [],
        moderateFloat: [],
        excessiveFloat: []
    };

    tasks.forEach(task => {
        // Use total_float if available, otherwise total_float_hr_cnt
        const totalFloatHours = parseFloat(task.total_float || task.total_float_hr_cnt) || 0;
        const totalFloatDays = totalFloatHours / HOURS_PER_DAY;

        if (totalFloatDays < 0) {
            taskCategories.negativeFloat.push(task);
        } else if (totalFloatDays === 0) {
            taskCategories.critical.push(task);
        } else if (totalFloatDays <= 15) {
            taskCategories.nearCritical.push(task);
        } else if (totalFloatDays <= 39) {
            taskCategories.moderateFloat.push(task);
        } else {
            taskCategories.excessiveFloat.push(task);
        }
    });

    console.log('[Float Analysis] Chart categorization completed:');
    console.log('  - Negative Float:', taskCategories.negativeFloat.length);
    console.log('  - Critical (0 days):', taskCategories.critical.length);
    console.log('  - Near Critical (<=15 days):', taskCategories.nearCritical.length);
    console.log('  - Moderate Float (15-39 days):', taskCategories.moderateFloat.length);
    console.log('  - Excessive Float (>39 days):', taskCategories.excessiveFloat.length);

    const chartData = {
        labels: ['Task Distribution by Float'],
        datasets: [
            {
                label: 'Negative Float (Float < 0 Days)',
                data: [taskCategories.negativeFloat.length],
                backgroundColor: 'rgba(255, 99, 132, 0.7)', // Red
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            },
            {
                label: 'Critical Activity (Float = 0 Days)',
                data: [taskCategories.critical.length],
                backgroundColor: 'rgba(255, 159, 64, 0.7)', // Orange
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            },
            {
                label: 'Near Critical (Float <= 15 Days)',
                data: [taskCategories.nearCritical.length],
                backgroundColor: 'rgba(255, 205, 86, 0.7)', // Yellow
                borderColor: 'rgba(255, 205, 86, 1)',
                borderWidth: 1
            },
            {
                label: 'Moderate Float (15 < Float <= 39 Days)',
                data: [taskCategories.moderateFloat.length],
                backgroundColor: 'rgba(75, 192, 192, 0.7)', // Teal
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            },
            {
                label: 'Excessive Float (Float > 39 Days)',
                data: [taskCategories.excessiveFloat.length],
                backgroundColor: 'rgba(54, 162, 235, 0.7)', // Blue
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }
        ]
    };

    // Render chart in the visual div
    // Assuming the canvas element for the chart will be added to #floatAnalysisVisual
    const chartContainer = document.getElementById('floatAnalysisVisual');
    if (!chartContainer) {
        console.error('[Float Analysis] Chart container #floatAnalysisVisual not found.');
        return;
    }

    console.log('[Float Analysis] Chart container found. Dimensions:', {
        width: chartContainer.offsetWidth,
        height: chartContainer.offsetHeight,
        style: chartContainer.style.cssText
    });

    // Remove any existing canvas and create a new one
    chartContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'floatAnalysisChartCanvas'; // Give the canvas an ID
    chartContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    console.log('[Float Analysis] Canvas created and context obtained:', !!ctx);

    // Destroy existing chart instance if it exists (using a different global name)
    if (window.floatAnalysisChartInstance) {
        window.floatAnalysisChartInstance.destroy();
    }

    window.floatAnalysisChartInstance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 3,
            resizeDelay: 100,
            onClick: handleChartClick,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'start',
                    labels: {
                        boxWidth: 15,
                        padding: 10,
                        font: {
                            size: 11,
                            family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
                        }
                    },
                     maxWidth: 500,
                    fullSize: false
                },
                title: {
                    display: false
                },
                 tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.x;
                            return `${label}: ${value} tasks`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Number of Tasks',
                        font: {
                            size: 11
                        }
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    stacked: true,
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            layout: {
                padding: {
                    left: 5,
                    right: 10,
                    top: 0,
                    bottom: 5
                }
            },
            onResize: (chart, size) => {
                setTimeout(() => {
                    chart.resize();
                }, 50);
            }
        }
    });

    console.log('[Float Analysis] Chart instance created successfully:', !!window.floatAnalysisChartInstance);

     // Add event listener for window resize
    window.removeEventListener('resize', handleFloatAnalysisChartResize);
    window.addEventListener('resize', handleFloatAnalysisChartResize);
}

function handleFloatAnalysisChartResize() {
    if (window.floatAnalysisChartInstance) {
        window.floatAnalysisChartInstance.resize();
    }
}

// Chart click handler for interactive filtering
function handleChartClick(event, elements) {
    if (elements.length > 0) {
        const clickedIndex = elements[0].datasetIndex;
        const clickedCategory = getFloatCategoryByIndex(clickedIndex);
        console.log('[Float Analysis] Chart segment clicked:', clickedCategory);
        filterTableByFloatCategory(clickedCategory, clickedIndex);
    }
}

// Map dataset index to float category
function getFloatCategoryByIndex(datasetIndex) {
    const categories = [
        'Negative Float (Float < 0 Days)',      // Index 0
        'Critical Activity (Float = 0 Days)',  // Index 1  
        'Near Critical (Float <= 15 Days)',    // Index 2
        'Moderate Float (15 < Float <= 39 Days)',   // Index 3
        'Excessive Float (Float > 39 Days)'    // Index 4
    ];
    return categories[datasetIndex];
}

// Calculate float category for a task
function calculateFloatCategory(totalFloatHrCnt) {
    const HOURS_PER_DAY = 8;
    const totalFloatDays = (parseFloat(totalFloatHrCnt) || 0) / HOURS_PER_DAY;

    if (totalFloatDays < 0) {
        return 'Negative Float (Float < 0 Days)';
    } else if (totalFloatDays === 0) {
        return 'Critical Activity (Float = 0 Days)';
    } else if (totalFloatDays <= 15) {
        return 'Near Critical (Float <= 15 Days)';
    } else if (totalFloatDays <= 39) {
        return 'Moderate Float (15 < Float <= 39 Days)';
    } else {
        return 'Excessive Float (Float > 39 Days)';
    }
}

// Filter table by float category
function filterTableByFloatCategory(selectedCategory, selectedIndex) {
    if (!currentTableData || currentTableData.length === 0) {
        console.warn('[Float Analysis] No table data to filter');
        return;
    }

    // Filter tasks based on category
    const filteredTasks = currentTableData.filter(task => {
        const floatCategory = calculateFloatCategory(task.originalTask.total_float_hr_cnt);
        return floatCategory === selectedCategory;
    });

    console.log('[Float Analysis] Filtered', filteredTasks.length, 'tasks for category:', selectedCategory);

    // Update chart highlighting
    highlightSelectedSegment(selectedIndex);

    // Update table display
    currentPage = 1; // Reset to first page
    displayPage(currentPage, filteredTasks);

    // Update filter indicator
    updateFilterIndicator(selectedCategory, filteredTasks.length);

    // Store filtered data for pagination
    window.currentFilteredData = filteredTasks;
    window.currentFilter = selectedCategory;
}

// Highlight selected chart segment
function highlightSelectedSegment(selectedIndex) {
    if (!window.floatAnalysisChartInstance) return;

    // Update dataset styling
    window.floatAnalysisChartInstance.data.datasets.forEach((dataset, index) => {
        if (index === selectedIndex) {
            // Full opacity for selected
            dataset.backgroundColor = dataset.backgroundColor.replace(/0\.[0-9]+/, '1.0');
            dataset.borderWidth = 3;
        } else {
            // Faded for non-selected
            dataset.backgroundColor = dataset.backgroundColor.replace(/0\.[0-9]+/, '0.3');
            dataset.borderWidth = 1;
        }
    });

    window.floatAnalysisChartInstance.update('none'); // Update without animation for responsiveness
}

// Clear filter and restore original view
function clearFloatFilter() {
    if (!window.floatAnalysisChartInstance) return;

    console.log('[Float Analysis] Clearing filter');

    // Reset chart highlighting
    window.floatAnalysisChartInstance.data.datasets.forEach(dataset => {
        dataset.backgroundColor = dataset.backgroundColor.replace(/0\.[0-9]+/, '0.7');
        dataset.borderWidth = 1;
    });
    window.floatAnalysisChartInstance.update('none');

    // Show all tasks
    currentPage = 1;
    displayPage(currentPage, currentTableData);

    // Hide filter indicator
    updateFilterIndicator(null, currentTableData.length);

    // Clear filter state
    window.currentFilteredData = null;
    window.currentFilter = null;
}

// Update filter status display
function updateFilterIndicator(category, count) {
    const filterStatus = document.getElementById('filterStatus');
    const filterText = document.getElementById('filterText');

    if (category) {
        filterStatus.classList.remove('hidden');
        filterText.textContent = `Showing ${count} tasks in "${category}"`;
    } else {
        filterStatus.classList.add('hidden');
    }
}

/**
 * Populates the Float Analysis Task Details table.
 * @param {Array<Object>} tasks - The array of task objects.
 */
function populateFloatAnalysisTable(tasks) {
    console.log('[Float Analysis] populateFloatAnalysisTable received', tasks?.length || 0, 'tasks.');
     if (tasks && tasks.length > 0) {
        console.log('[Float Analysis] Sample task object:', tasks[0]);
        console.log('[Float Analysis] Available properties in first task:', Object.keys(tasks[0]));
        console.log('[Float Analysis] DEBUGGING - Property values:');
        console.log('  - task_name:', tasks[0].task_name);
        console.log('  - task_code:', tasks[0].task_code);
        console.log('  - act_start_date:', tasks[0].act_start_date);
        console.log('  - act_end_date:', tasks[0].act_end_date);
        console.log('  - target_start_date:', tasks[0].target_start_date);
        console.log('  - target_end_date:', tasks[0].target_end_date);
        console.log('  - total_float_hr_cnt:', tasks[0].total_float_hr_cnt);
        console.log('  - status_code:', tasks[0].status_code);
    }

    const tableBody = document.querySelector('#floatAnalysisTable tbody');
    const tableHead = document.querySelector('#floatAnalysisTable thead tr');

    if (!tableBody || !tableHead) {
        console.error('[Float Analysis] Table elements #floatAnalysisTable tbody or thead tr not found.');
        return;
    } else {
        console.log('[Float Analysis] Found table body and head elements.');
    }

    // Clear existing table rows
    tableBody.innerHTML = '';
    tableHead.innerHTML = ''; // Clear existing headers as well

    if (!tasks || tasks.length === 0) {
        console.warn('[Float Analysis] No tasks provided for table population.');
        // Use the colspan that matches the number of columns based on the headers we will add
        const numberOfHeaders = 7; // TASK Name, Total Float, Status, Actual Start, Actual End, Target Start, Target End
        tableBody.innerHTML = `<tr><td colspan="${numberOfHeaders}" class="py-4 text-center text-gray-500">No float analysis data available.</td></tr>`;
        return;
    }

    // Define the columns and their corresponding task properties from generateCriticalPathReport.txt
    const columns = [
        { header: 'TASK Name', prop: 'task_name' },
        { header: 'Total Float', prop: 'total_float_hr_cnt' }, // Using total_float_hr_cnt as per generateCriticalPathReport.txt
        { header: 'Status', prop: 'status_code' }, // Using status_code as per generateCriticalPathReport.txt
        { header: 'Actual Start', prop: 'act_start_date' }, // Using actual date as per generateCriticalPathReport.txt
        { header: 'Actual End', prop: 'act_end_date' }, // Using actual date as per generateCriticalPathReport.txt
        { header: 'Target Start', prop: 'target_start_date' }, // Using target date as per generateCriticalPathReport.txt
        { header: 'Target End', prop: 'target_end_date' }, // Using target date as per generateCriticalPathReport.txt
    ];

     // Add table headers
    tableHead.innerHTML = columns.map(col => `
        <th class="sortable px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 border-b" data-column="${col.prop}">
            ${col.header}
            <span class="sort-icon ml-1">↕</span>
        </th>
    `).join('');

    // Assuming total_float is in hours and should be displayed in days
    const HOURS_PER_DAY = 8;

    // Prepare rows data with formatting
    const rowsData = tasks.map(task => ({
        task_name: task.task_name || task.task_code || 'Unnamed Task',
        total_float: ((parseFloat(task.total_float_hr_cnt) || 0) / HOURS_PER_DAY).toFixed(1), // Convert and format float
        status: task.status_code || 'Unknown',
        'Actual Start': formatDate(task.act_start_date),
        'Actual End': formatDate(task.act_end_date),
        'Target Start': formatDate(task.target_start_date),
        'Target End': formatDate(task.target_end_date),
         // Include original props for sorting if needed
        originalTask: task
    }));

     console.log('[Float Analysis] Created', rowsData.length, 'formatted rows data.');
     if (rowsData.length > 0) {
         console.log('[Float Analysis] Sample formatted row:', rowsData[0]);
         console.log('[Float Analysis] First row task_name:', rowsData[0].task_name);
         console.log('[Float Analysis] First row Actual Start:', rowsData[0]['Actual Start']);
     }

    // Initial display (will be handled by pagination later)
    // displayPage(1, rowsData);

    return rowsData; // Return data for sorting and pagination
}

// Function to sort data (adapted from generateCriticalPathReport.txt)
function sortData(data, column, direction) {
    return [...data].sort((a, b) => {
        let valueA = a.originalTask[column]; // Use original task data for sorting
        let valueB = b.originalTask[column];

        // Handle numeric values
        if (column.includes('float_hr_cnt') || column.includes('drtn_hr_cnt') || column === 'duration') { // Add duration if it's a possible sort key
            valueA = parseFloat(valueA) || 0;
            valueB = parseFloat(valueB) || 0;
        }

        // Handle date values
        if (column.includes('date')) {
            valueA = new Date(valueA) || new Date(0);
            valueB = new Date(valueB) || new Date(0);
        }

        if (direction === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });
}

// Pagination setup and display function (adapted from generateCriticalPathReport.txt)
const itemsPerPage = 50; // Example: 50 items per page
let currentPage = 1;
let currentSort = { column: 'task_name', direction: 'asc' }; // Default sort
let currentTableData = []; // Store the current data being displayed

function displayPage(page, dataToDisplay) {
    console.log('[Float Analysis] displayPage called for page', page);

    // Force the panel to be visible if it's the active tab
    const panel = document.getElementById('floatAnalysisTabPanel');
    if (panel && panel.classList.contains('active')) {
        panel.style.display = 'flex';
    }
    
    const tableBody = document.querySelector('#floatAnalysisTable tbody');
    if (!tableBody) {
        console.error('[Float Analysis] Table body #floatAnalysisTable tbody not found in displayPage.');
        return;
    }
    
    // Log table structure to diagnose issues
    console.log('[Float Analysis] Table structure check:', {
        tableExists: !!document.getElementById('floatAnalysisTable'),
        tableBodyExists: !!tableBody,
        tableBodyVisibility: tableBody?.style?.display,
        tableBodyChildCount: tableBody?.childElementCount
    });
    
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = dataToDisplay.slice(start, end);

     console.log('[Float Analysis] Displaying', pageData.length, 'items on page', page, '. Start index:', start, ', End index:', end);

    tableBody.innerHTML = pageData.map(task => {
         // Map the formatted data properties to table cells
        return `
            <tr class="py-1">
                <td class="px-3 py-2 text-left text-gray-700">${task.task_name || ''}</td>
                <td class="px-3 py-2 text-left text-gray-700">${task.total_float || ''}</td>
                <td class="px-3 py-2 text-left text-gray-700">${task.status || ''}</td>
                <td class="px-3 py-2 text-left text-gray-700">${task['Actual Start'] || ''}</td>
                <td class="px-3 py-2 text-left text-gray-700">${task['Actual End'] || ''}</td>
                <td class="px-3 py-2 text-left text-gray-700">${task['Target Start'] || ''}</td>
                <td class="px-3 py-2 text-left text-gray-700">${task['Target End'] || ''}</td>
            </tr>
        `;
    }).join('');

    // Update pagination controls
    const currentPageDisplay = document.getElementById('currentPageDisplay'); // Assuming IDs from schedule.html
    const totalPagesDisplay = document.getElementById('totalPages');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');

    const totalPages = Math.ceil(dataToDisplay.length / itemsPerPage);

    if (currentPageDisplay) currentPageDisplay.textContent = page;
    if (totalPagesDisplay) totalPagesDisplay.textContent = totalPages;
    if (prevButton) prevButton.disabled = page === 1;
    if (nextButton) nextButton.disabled = page === totalPages;

     console.log('[Float Analysis] Pagination controls updated. Current Page:', page, ', Total Pages:', totalPages);
}

// Function to set up sorting event listeners
function setupTableSorting(tableData) {
    console.log('[Float Analysis] Setting up table sorting.');
    const tableHead = document.querySelector('#floatAnalysisTable thead tr');
    if (!tableHead) {
        console.error('[Float Analysis] Table head #floatAnalysisTable thead tr not found for sorting setup.');
        return;
    }

    tableHead.querySelectorAll('th.sortable').forEach(th => {
        // Remove existing listeners to prevent duplicates
        const oldListener = th._sortListener;
        if (oldListener) {
            th.removeEventListener('click', oldListener);
        }

        const newListener = () => {
            const column = th.dataset.column;
            const direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
            currentSort = { column, direction };

            // Update sort indicators
            tableHead.querySelectorAll('th.sortable').forEach(header => {
                header.querySelector('.sort-icon').textContent = '↕';
            });
            th.querySelector('.sort-icon').textContent = direction === 'asc' ? '↑' : '↓';

            // Sort and display data
            const sortedData = sortData(tableData, column, direction);
            currentPage = 1; // Reset to first page on sort
            displayPage(currentPage, sortedData);
             console.log('[Float Analysis] Sorted data and displayed page.');
        };

        th.addEventListener('click', newListener);
        th._sortListener = newListener; // Store the listener to remove later
    });
}

// Function to set up pagination event listeners
function setupPaginationControls(tableData) {
     console.log('[Float Analysis] Setting up pagination controls.');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const totalPages = Math.ceil(tableData.length / itemsPerPage);

    // Remove existing listeners to prevent duplicates
    if (prevButton) {
        const oldPrevListener = prevButton._pageListener;
        if (oldPrevListener) prevButton.removeEventListener('click', oldPrevListener);
    }
    if (nextButton) {
        const oldNextListener = nextButton._pageListener;
        if (oldNextListener) nextButton.removeEventListener('click', oldNextListener);
    }

    if (prevButton) {
        const newPrevListener = () => {
            if (currentPage > 1) {
                currentPage--;
                // Use filtered data if available, otherwise use all data
                const dataToUse = window.currentFilteredData || tableData;
                const sortedData = sortData(dataToUse, currentSort.column, currentSort.direction);
                displayPage(currentPage, sortedData);
                console.log('[Float Analysis] Navigated to previous page.');
            }
        };
        prevButton.addEventListener('click', newPrevListener);
        prevButton._pageListener = newPrevListener; // Store the listener
    }

    if (nextButton) {
        const newNextListener = () => {
            const dataToUse = window.currentFilteredData || tableData;
            const totalPages = Math.ceil(dataToUse.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                // Use filtered data if available, otherwise use all data
                const sortedData = sortData(dataToUse, currentSort.column, currentSort.direction);
                displayPage(currentPage, sortedData);
                console.log('[Float Analysis] Navigated to next page.');
            }
        };
         nextButton.addEventListener('click', newNextListener);
         nextButton._pageListener = newNextListener; // Store the listener
    }
     console.log('[Float Analysis] Pagination setup complete. Total pages calculated:', totalPages);
}


/**
 * Generates the Float Analysis report by fetching task data.
 * @param {Array|null} tasks - Task data array (if null, will fetch from API)
 * @param {string} projectId - The project ID to fetch tasks for.
 */
export async function generateFloatAnalysisReport(tasks, projectId) {
    console.log('[Float Analysis] generateFloatAnalysisReport called with projectId:', projectId);
    
    // If tasks are not provided, fetch them from the API
    let tasksData = tasks;
    
    if (!tasksData && projectId) {
        console.log('[Float Analysis] Fetching tasks from API for project:', projectId);
        try {
            const response = await fetch(`/api/gantt/projects/${projectId}/tasks`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            tasksData = await response.json();
            console.log('[Float Analysis] Successfully fetched', tasksData?.length || 0, 'tasks from API');
        } catch (error) {
            console.error('[Float Analysis] Error fetching tasks from API:', error);
            // Show error state
            const chartContainer = document.getElementById('floatAnalysisVisual');
            if(chartContainer) chartContainer.innerHTML = '<div class="p-4 text-center text-red-600">Error loading float analysis data</div>';
            
            const tableBody = document.querySelector('#floatAnalysisTable tbody');
            if (tableBody) {
                const numberOfHeaders = 7;
                tableBody.innerHTML = `<tr><td colspan="${numberOfHeaders}" class="py-4 text-center text-red-500">Error loading float analysis data: ${error.message}</td></tr>`;
            }
            return;
        }
    }

    console.log('[Float Analysis] Processing', tasksData?.length || 0, 'tasks.', tasksData && tasksData.length > 0 ? 'Sample task:' : '', tasksData && tasksData.length > 0 ? tasksData[0] : '');

    // Filter out WBS rows without actual tasks (task_id should exist for real tasks)
    const actualTasks = tasksData ? tasksData.filter(task => task.task_id && task.task_name) : [];
    console.log('[Float Analysis] Filtered to', actualTasks.length, 'actual tasks (excluding WBS-only rows)');
    
    if (actualTasks.length > 0) {
        console.log('[Float Analysis] Sample filtered task:', actualTasks[0]);
    }

    // Handle no data case
    if (!actualTasks || actualTasks.length === 0) {
        console.warn('[Float Analysis] No tasks provided for analysis');
        // Clear visual and table
        const chartContainer = document.getElementById('floatAnalysisVisual');
        if(chartContainer) chartContainer.innerHTML = '';

        const tableBody = document.querySelector('#floatAnalysisTable tbody');
        const tableHead = document.querySelector('#floatAnalysisTable thead tr');
         if (tableHead) tableHead.innerHTML = ''; // Clear headers
        if (tableBody) {
             const numberOfHeaders = 7; // TASK Name, Total Float, Status, Actual Start, Actual End, Target Start, Target End
            tableBody.innerHTML = `<tr><td colspan="${numberOfHeaders}" class="py-4 text-center text-gray-500">No float analysis data available.</td></tr>`;
        }
         // Destroy chart instance if it exists
         if (window.floatAnalysisChartInstance) {
             window.floatAnalysisChartInstance.destroy();
             window.floatAnalysisChartInstance = null;
         }

        return;
    }

    // 1. Create the chart visual
    createFloatAnalysisChart(actualTasks);

    // 2. Populate the table and get the processed data
    const processedTableData = populateFloatAnalysisTable(actualTasks);
     currentTableData = processedTableData; // Store for pagination and sorting

    // 3. Set up sorting
     setupTableSorting(currentTableData);

    // 4. Set up pagination and display the first page
     currentPage = 1; // Reset to first page
     setupPaginationControls(currentTableData);
     displayPage(currentPage, currentTableData);

    // 5. Setup clear filter button event listener
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    if (clearFilterBtn) {
        // Remove existing listener to prevent duplicates
        const oldListener = clearFilterBtn._clearFilterListener;
        if (oldListener) {
            clearFilterBtn.removeEventListener('click', oldListener);
        }
        
        const newListener = clearFloatFilter;
        clearFilterBtn.addEventListener('click', newListener);
        clearFilterBtn._clearFilterListener = newListener;
        console.log('[Float Analysis] Clear filter button listener attached');
    }

    console.log('[Float Analysis] Report generation completed.');
} 