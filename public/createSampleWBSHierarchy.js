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

// Export the function
export { createSampleWBSHierarchy }; 