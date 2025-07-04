// AWP Gantt Chart Client Module
// This module handles the AWP-specific Gantt chart functionality

export class AWPGanttClient {
    constructor() {
        this.apiEndpoint = '/api/awp_tasks';
        this.currentProjectId = null;
        this.tasks = [];
        this.filteredTasks = [];
        
        console.log('AWP Gantt Client initialized');
    }
    
    // Initialize the AWP Gantt chart
    async initialize(projectId) {
        this.currentProjectId = projectId;
        await this.loadAWPTasks();
        this.renderGanttChart();
    }
    
    // Load AWP tasks from API
    async loadAWPTasks() {
        try {
            console.log(`Loading AWP tasks for project: ${this.currentProjectId}`);
            
            const response = await fetch(`${this.apiEndpoint}?project_id=${this.currentProjectId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.tasks = await response.json();
            this.filteredTasks = [...this.tasks];
            
            console.log(`Loaded ${this.tasks.length} AWP tasks`);
            
        } catch (error) {
            console.error('Error loading AWP tasks:', error);
            this.tasks = [];
            this.filteredTasks = [];
            
            // Show error message in the UI
            this.showErrorMessage('Error loading AWP tasks. The awp_tasks API endpoint may not be implemented yet.');
        }
    }
    
    // Render the Gantt chart
    renderGanttChart() {
        console.log('Rendering AWP Gantt chart...');
        
        if (!this.filteredTasks || this.filteredTasks.length === 0) {
            this.showNoDataMessage();
            return;
        }
        
        // TODO: Implement AWP-specific Gantt chart rendering
        // This will be similar to the WBS Gantt but with AWP-specific data structure
        
        this.renderTaskTable();
        this.renderTimeline();
    }
    
    // Render task table
    renderTaskTable() {
        const tableBody = document.getElementById('task-table-body');
        if (!tableBody) return;
        
        const html = this.filteredTasks.map(task => {
            // Create indentation based on level
            const indentLevel = task.level || 1;
            const indentation = '&nbsp;'.repeat((indentLevel - 1) * 4);
            
            // Use Activity_code and Activity_name from the AWP query results
            const awpCode = task.Activity_code || task.actv_code_id || '';
            const awpName = task.Activity_name || '';
            const displayName = awpName || awpCode;
            
            // Color coding based on AWP level or type
            const rowStyle = indentLevel === 1 ? 'background-color: #f3f4f6; font-weight: 600;' : '';
            
            return `
                <tr style="${rowStyle}">
                    <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${task.sequence || ''}">${task.sequence || awpCode}</td>
                    <td style="width: 350px; padding: 6px 8px; border-right: 1px solid #e5e7eb;" title="${displayName}">${indentation}${displayName}</td>
                    <td style="width: 120px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</td>
                    <td style="width: 120px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</td>
                    <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">-</td>
                    <td style="width: 80px; padding: 6px 8px; border-right: 1px solid #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">-</td>
                    <td style="width: 60px; padding: 6px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;">${task.seq_num || ''}</td>
                </tr>
            `;
        }).join('');
        
        tableBody.innerHTML = html;
    }
    
    // Render timeline (placeholder)
    renderTimeline() {
        const timelineArea = document.getElementById('timelineArea');
        if (!timelineArea) return;
        
        // TODO: Implement AWP-specific timeline rendering
        console.log('Timeline rendering for AWP tasks...');
    }
    
    // Apply AWP-specific filters
    applyFilters(filters) {
        console.log('Applying AWP filters:', filters);
        
        this.filteredTasks = this.tasks.filter(task => {
            // Filter by AWP level or type
            if (filters.awpLevel && filters.awpLevel !== 'all') {
                if (filters.awpLevel.startsWith('level-')) {
                    const targetLevel = parseInt(filters.awpLevel.replace('level-', ''));
                    if (task.level !== targetLevel) {
                        return false;
                    }
                } else if (filters.awpLevel.startsWith('type-')) {
                    const targetType = filters.awpLevel.replace('type-', '');
                    if (task.actv_code_type !== targetType) {
                        return false;
                    }
                }
            }
            
            // Additional filters can be added here for dates, etc.
            
            return true;
        });
        
        this.renderGanttChart();
    }
    
    // Show error message
    showErrorMessage(message) {
        const tableBody = document.getElementById('task-table-body');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" style="padding: 16px; text-align: center; color: #dc2626;">${message}</td></tr>`;
        }
    }
    
    // Show no data message
    showNoDataMessage() {
        const tableBody = document.getElementById('task-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #6b7280;">No AWP tasks found.</td></tr>';
        }
    }
    
    // Utility function to format dates
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        if (isNaN(date)) return '-';
        return date.toLocaleDateString();
    }
    
    // Utility function to format duration
    formatDuration(hours) {
        if (!hours || hours === 0) return '-';
        const days = Math.round(hours / 8);
        return days === 1 ? '1 day' : `${days} days`;
    }
}

// Initialize AWP Gantt when module loads
document.addEventListener('DOMContentLoaded', function() {
    window.awpGanttClient = new AWPGanttClient();
}); 