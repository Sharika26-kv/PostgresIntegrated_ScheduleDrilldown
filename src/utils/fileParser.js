/**
 * BIM_XER_Masher - File Parser Utilities
 * These utilities handle the parsing of IFC and XER files and establish the relationship between them.
 */

/**
 * Parse IFC file and extract building components and their WBS codes
 * @param {File} ifcFile - The IFC file to parse
 * @returns {Promise<Object>} - Object containing the parsed IFC data
 */
export async function parseIFCFile(ifcFile) {
    return new Promise((resolve, reject) => {
        try {
            // Create a FileReader instance
            const reader = new FileReader();
            
            // Set up the FileReader onload event handler
            reader.onload = (event) => {
                const fileContent = event.target.result;
                
                // In a real implementation, we would use a proper IFC parser library
                // such as IFC.js or web-ifc. For this demo, we'll extract data using 
                // string matching techniques.
                
                // Extract all entity instances of type IfcPropertySet for ProjectManagement
                const propertySetRegex = /#\d+=IFCPROPERTYSET\('([^']+)',#\d+,'Pset_ProjectManagement'/g;
                const propertySetMatches = [...fileContent.matchAll(propertySetRegex)];
                
                // Extract WBS code property values
                const wbsCodeRegex = /#\d+=IFCPROPERTYSINGLEVALUE\('WBS_Code',\$,IFCTEXT\('([^']+)'\)/g;
                const wbsCodeMatches = [...fileContent.matchAll(wbsCodeRegex)];
                
                // Extract TaskID property values
                const taskIdRegex = /#\d+=IFCPROPERTYSINGLEVALUE\('Task_ID',\$,IFCTEXT\('([^']+)'\)/g;
                const taskIdMatches = [...fileContent.matchAll(taskIdRegex)];
                
                // Extract building component information
                const buildingElements = [];
                const elementTypes = [
                    'IFCWALL', 'IFCCOLUMN', 'IFCSLAB', 'IFCDOOR', 
                    'IFCFURNISHINGELEMENT', 'IFCFLOWSEGMENT'
                ];
                
                elementTypes.forEach(type => {
                    const elementRegex = new RegExp(`#\\d+=${type}\\('([^']+)',#\\d+,'([^']+)'`, 'g');
                    const elementMatches = [...fileContent.matchAll(elementRegex)];
                    
                    elementMatches.forEach(match => {
                        buildingElements.push({
                            guid: match[1],
                            name: match[2],
                            type: type.replace('IFC', '')
                        });
                    });
                });
                
                // In a real implementation, we would properly associate the WBS codes with
                // the specific building elements by traversing the IFC relationships.
                // For this demo, we'll create a simplified mapping.
                
                // Create mappings
                const wbsCodes = wbsCodeMatches.map(match => match[1]);
                const taskIds = taskIdMatches.map(match => match[1]);
                
                // Combine the data
                const ifcData = {
                    fileName: ifcFile.name,
                    fileSize: ifcFile.size,
                    buildingElements: buildingElements,
                    wbsCodes: wbsCodes,
                    taskIds: taskIds
                };
                
                resolve(ifcData);
            };
            
            // Set up the FileReader onerror event handler
            reader.onerror = (error) => {
                reject(new Error(`Error reading IFC file: ${error.message}`));
            };
            
            // Read the file as text
            reader.readAsText(ifcFile);
        } catch (error) {
            reject(new Error(`Error parsing IFC file: ${error.message}`));
        }
    });
}

/**
 * Parse XER file and extract schedule activities and their WBS codes
 * @param {File} xerFile - The XER file to parse
 * @returns {Promise<Object>} - Object containing the parsed XER data
 */
export async function parseXERFile(xerFile) {
    return new Promise((resolve, reject) => {
        try {
            // Create a FileReader instance
            const reader = new FileReader();
            
            // Set up the FileReader onload event handler
            reader.onload = (event) => {
                const fileContent = event.target.result;
                
                // Split the file content into lines
                const lines = fileContent.split('\n');
                
                // Initialize data structures to store parsed data
                const project = {};
                const wbsElements = [];
                const activities = [];
                const relationships = [];
                
                // Keep track of the current table being processed
                let currentTable = '';
                let headers = [];
                
                // Process each line of the XER file
                lines.forEach(line => {
                    // Skip empty lines
                    if (!line.trim()) return;
                    
                    // Check if this line defines a new table
                    if (line.startsWith('PROJECT') || 
                        line.startsWith('PROJWBS') || 
                        line.startsWith('TASK') || 
                        line.startsWith('TASKPRED')) {
                        
                        const parts = line.split('\t');
                        
                        // If this is a header line, store the headers
                        if (parts[0] === parts[1]) {
                            currentTable = parts[0];
                            headers = parts;
                            return;
                        }
                        
                        // Otherwise, it's a data line
                        currentTable = parts[0];
                        
                        // Create an object from the line data using the headers
                        const dataObject = {};
                        for (let i = 0; i < headers.length && i < parts.length; i++) {
                            if (headers[i]) {
                                dataObject[headers[i]] = parts[i];
                            }
                        }
                        
                        // Store the data in the appropriate array
                        switch (currentTable) {
                            case 'PROJECT':
                                Object.assign(project, dataObject);
                                break;
                            case 'PROJWBS':
                                wbsElements.push(dataObject);
                                break;
                            case 'TASK':
                                activities.push(dataObject);
                                break;
                            case 'TASKPRED':
                                relationships.push(dataObject);
                                break;
                        }
                    }
                });
                
                // Combine the data
                const xerData = {
                    fileName: xerFile.name,
                    fileSize: xerFile.size,
                    project: project,
                    wbsElements: wbsElements,
                    activities: activities,
                    relationships: relationships
                };
                
                resolve(xerData);
            };
            
            // Set up the FileReader onerror event handler
            reader.onerror = (error) => {
                reject(new Error(`Error reading XER file: ${error.message}`));
            };
            
            // Read the file as text
            reader.readAsText(xerFile);
        } catch (error) {
            reject(new Error(`Error parsing XER file: ${error.message}`));
        }
    });
}

/**
 * Integrate IFC and XER data to create a unified model
 * @param {Object} ifcData - Parsed IFC data
 * @param {Object} xerData - Parsed XER data
 * @returns {Object} - Integrated data model
 */
export function integrateData(ifcData, xerData) {
    try {
        // Create a map of WBS elements for quick lookup
        const wbsMap = {};
        xerData.wbsElements.forEach(wbs => {
            wbsMap[wbs.WBS_CODE] = wbs;
        });
        
        // Create a map of activities for quick lookup
        const activityMap = {};
        xerData.activities.forEach(activity => {
            activityMap[activity.TASK_ID] = activity;
        });
        
        // Create a mapping between IFC components and XER activities
        const componentScheduleData = [];
        
        // Loop through IFC WBS codes and find matching activities
        ifcData.wbsCodes.forEach((wbsCode, index) => {
            const taskId = ifcData.taskIds[index];
            
            // Get the WBS element
            const wbsElement = wbsMap[wbsCode];
            
            // Get the activity
            const activity = activityMap[taskId];
            
            if (wbsElement && activity) {
                // Find building elements associated with this WBS code
                // In a real implementation, this would use proper IFC relationships
                // Here we're making a simplified association based on naming patterns
                
                // Extract component type from WBS code (e.g., WALL from DC-L1-STRUCT-WALL)
                const wbsParts = wbsCode.split('-');
                const componentType = wbsParts.length > 3 ? wbsParts[3] : '';
                
                // Find building elements that match this type
                const matchingElements = ifcData.buildingElements.filter(element => {
                    return element.type.toUpperCase().includes(componentType);
                });
                
                // Determine the area from the WBS code
                let area = "Unknown";
                if (wbsCode.includes("L1")) {
                    area = "Level 1";
                    
                    if (wbsCode.includes("STRUCT-WALL")) area = "Perimeter";
                    else if (wbsCode.includes("STRUCT-COL")) area = "Interior";
                    else if (wbsCode.includes("STRUCT-SLAB")) area = "Base Level";
                    else if (wbsCode.includes("ARCH-DOOR")) area = "Interior";
                    else if (wbsCode.includes("IT-RACK")) area = "Server Room 1";
                    else if (wbsCode.includes("MEP")) area = "All Areas";
                } else if (wbsCode.includes("L2")) {
                    area = "Level 2";
                    
                    if (wbsCode.includes("STRUCT-SLAB")) area = "All Areas";
                    else if (wbsCode.includes("STRUCT-WALL")) area = "Interior/Perimeter";
                    else if (wbsCode.includes("IT-RACK")) area = "Server Room 2";
                    else if (wbsCode.includes("MEP")) area = "All Areas";
                }
                
                // Create an integrated record
                const componentRecord = {
                    area: area,
                    wbsCode: wbsCode,
                    description: wbsElement.WBS_NAME || "Unknown",
                    taskId: taskId,
                    activityName: activity.TASK_NAME || "Unknown",
                    startDate: activity.START_DATE || "Unknown",
                    endDate: activity.END_DATE || "Unknown",
                    duration: activity.DURATION || "Unknown",
                    predecessors: "None" // We'll fill this in next
                };
                
                componentScheduleData.push(componentRecord);
            }
        });
        
        // Add predecessor information
        xerData.relationships.forEach(relationship => {
            // Find the component record for this task
            const componentRecord = componentScheduleData.find(
                record => record.taskId === relationship.TASK_ID
            );
            
            if (componentRecord) {
                // Get the predecessor task
                const predTaskId = relationship.PRED_TASK_ID;
                const predType = relationship.PRED_TYPE || "FS"; // Default to Finish-Start
                
                // Check if there's a lag
                const lagHours = parseInt(relationship.LAG_HR_CNT || "0");
                const lagDays = Math.floor(lagHours / 8); // Assuming 8-hour workdays
                
                // Set the predecessor information
                if (lagDays > 0) {
                    componentRecord.predecessors = `${predTaskId}+${lagDays}d`;
                } else {
                    componentRecord.predecessors = predTaskId;
                }
            }
        });
        
        // Sort components by start date
        componentScheduleData.sort((a, b) => {
            return new Date(a.startDate) - new Date(b.startDate);
        });
        
        // Generate risk data based on component types
        const riskData = generateRiskData(componentScheduleData);
        
        // Generate resource allocation data
        const resourceData = generateResourceData(componentScheduleData);
        
        // Process component schedule data
        const processedScheduleData = processComponentScheduleData(componentScheduleData, xerData.relationships);
        
        // Return the integrated data model
        return {
            projectName: xerData?.tables?.PROJECT?.[0]?.proj_short_name || 'Integrated Project',
            projectId: xerData?.tables?.PROJECT?.[0]?.proj_id || 'P001',
            lastUpdated: new Date().toISOString().split('T')[0],
            totalBudget: 1000000, // Default budget
            totalTasks: xerData?.tables?.TASK?.length || 0,
            totalResources: xerData?.tables?.RSRC?.length || 0,
            projectEnd: processedScheduleData?.projectEnd || "2025-08-30",
            componentScheduleData: componentScheduleData,
            riskData: riskData,
            resourceData: resourceData,
            processedScheduleData: processedScheduleData
        };
    } catch (error) {
        console.error("Error integrating data:", error);
        throw new Error(`Error integrating IFC and XER data: ${error.message}`);
    }
}

/**
 * Process component schedule data
 * @param {Array} componentScheduleData - Component schedule data
 * @param {Array} relationships - Task relationships
 * @returns {Object} - Processed schedule data with duration calculations
 */
function processComponentScheduleData(componentScheduleData, relationships) {
    if (!componentScheduleData) return null;
    
    // Sort by start date
    const sortedData = componentScheduleData.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateA - dateB;
    });
    
    // Calculate project duration
    const projectStart = new Date(sortedData[0].startDate);
    const projectEnd = new Date(sortedData[sortedData.length - 1].endDate);
    const projectDuration = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24));
    
    return {
        tasks: sortedData,
        projectDuration,
        projectStart: projectStart.toISOString().split('T')[0],
        projectEnd: projectEnd.toISOString().split('T')[0],
        totalTasks: sortedData.length
    };
}

/**
 * Generate risk data based on component types
 * @param {Array} componentScheduleData - Component schedule data
 * @returns {Array} - Risk data
 */
function generateRiskData(componentScheduleData) {
    const riskData = [
        {
            wbsCode: "DC-L1-STRUCT-SLAB",
            riskLevel: "High",
            primaryRisks: "Material delays, Weather",
            mitigationStrategy: "Early procurement, Indoor curing"
        },
        {
            wbsCode: "DC-L1-IT-RACK",
            riskLevel: "High",
            primaryRisks: "Equipment availability, Testing issues",
            mitigationStrategy: "Pre-order, Extended testing schedule"
        },
        {
            wbsCode: "DC-L1-MEP-HVAC",
            riskLevel: "Medium",
            primaryRisks: "System integration, Space constraints",
            mitigationStrategy: "BIM coordination, Mock-ups"
        },
        {
            wbsCode: "DC-L2-MEP-ELEC",
            riskLevel: "Medium",
            primaryRisks: "Code changes, Load calculations",
            mitigationStrategy: "Regular code reviews, Conservative design"
        },
        {
            wbsCode: "DC-L1-ARCH-DOOR",
            riskLevel: "Low",
            primaryRisks: "Installation quality",
            mitigationStrategy: "Certified installers, Quality checks"
        }
    ];
    
    return riskData;
}

/**
 * Generate resource allocation data
 * @param {Array} componentScheduleData - Component schedule data
 * @returns {Array} - Resource allocation data
 */
function generateResourceData(componentScheduleData) {
    const resourceData = [
        {
            wbsCode: "DC-L1-STRUCT-WALL",
            resources: "Concrete Crew, Formwork Team",
            units: 8,
            cost: 185000
        },
        {
            wbsCode: "DC-L1-STRUCT-COL",
            resources: "Concrete Crew, Rebar Team",
            units: 6,
            cost: 120000
        },
        {
            wbsCode: "DC-L1-STRUCT-SLAB",
            resources: "Concrete Crew, Finishing Team",
            units: 10,
            cost: 250000
        },
        {
            wbsCode: "DC-L2-STRUCT-SLAB",
            resources: "Concrete Crew, Finishing Team",
            units: 10,
            cost: 275000
        },
        {
            wbsCode: "DC-L1-ARCH-DOOR",
            resources: "Door Installation Team",
            units: 4,
            cost: 85000
        },
        {
            wbsCode: "DC-L1-IT-RACK",
            resources: "IT Installation Specialists",
            units: 8,
            cost: 420000
        },
        {
            wbsCode: "DC-L1-MEP-HVAC",
            resources: "HVAC Specialists, Pipe Fitters",
            units: 12,
            cost: 380000
        },
        {
            wbsCode: "DC-L1-MEP-ELEC",
            resources: "Electrical Contractors",
            units: 10,
            cost: 350000
        },
        {
            wbsCode: "DC-L2-STRUCT-WALL",
            resources: "Concrete Crew, Formwork Team",
            units: 8,
            cost: 160000
        },
        {
            wbsCode: "DC-L2-MEP-HVAC",
            resources: "HVAC Specialists, Pipe Fitters",
            units: 12,
            cost: 390000
        },
        {
            wbsCode: "DC-L2-IT-RACK",
            resources: "IT Installation Specialists",
            units: 10,
            cost: 520000
        },
        {
            wbsCode: "DC-L2-MEP-ELEC",
            resources: "Electrical Contractors",
            units: 10,
            cost: 370000
        }
    ];
    
    return resourceData;
}
