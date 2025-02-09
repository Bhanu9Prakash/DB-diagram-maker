let jsPlumbInstance;

let versionHistory = [];
let currentVersionIndex = -1;



let currentPreviewVersion = null;


let lastSavedInput = '';


let movementTimeout;




document.addEventListener('DOMContentLoaded', function() {

    const app = document.getElementById('app');
    const inputArea = document.getElementById('input-area');
    const splitter = document.getElementById('splitter');
    const outputArea = document.getElementById('output-area');
    const colorPicker = document.getElementById('custom-color-picker');
    const diagramContainer = document.getElementById('diagram-container');
    let currentTableHeader = null;
    let isFullscreen = false;

        // Add these event listeners in your initialization code
    // document.getElementById('restore-version-btn').addEventListener('click', restoreVersion);
    // document.getElementById('save-copy-btn').addEventListener('click', saveCopy);
    // document.getElementById('close-preview-btn').addEventListener('click', closePreview);
    document.getElementById('return-to-present-btn').addEventListener('click', returnToPresent);
    // Add event listener for the save version button
    document.getElementById('save-version-btn').addEventListener('click', function() {
        saveState();
    });
  


    document.getElementById('toggle-history-btn').addEventListener('click', toggleVersionHistory);

    // Use event delegation for showing color picker
     // Use event delegation for showing color picker
     diagramContainer.addEventListener('dblclick', function(event) {
        if (event.target.classList.contains('table-header')) {
            event.stopPropagation(); // Prevent the event from bubbling up
            event.preventDefault(); // Prevent any default double-click behavior
            
            // Prevent jsPlumb from interpreting this as a drag start
            if (jsPlumbInstance && typeof jsPlumbInstance.setDraggable === 'function') {
                jsPlumbInstance.setDraggable(event.target.closest('.table'), false);
                setTimeout(() => {
                    jsPlumbInstance.setDraggable(event.target.closest('.table'), true);
                }, 0);
            }
            
            showColorPicker(event);
        }
    });

    function showColorPicker(event) {
        currentTableHeader = event.target;
        const rect = currentTableHeader.getBoundingClientRect();
        const containerRect = diagramContainer.getBoundingClientRect();
        
        if (isFullscreen) {
            colorPicker.style.position = 'fixed';
            colorPicker.style.left = `${rect.left}px`;
            colorPicker.style.top = `${rect.bottom + 5}px`;
        } else {
            colorPicker.style.position = 'absolute';
            colorPicker.style.left = `${rect.left - containerRect.left + diagramContainer.scrollLeft}px`;
            colorPicker.style.top = `${rect.bottom - containerRect.top + diagramContainer.scrollTop + 5}px`;
        }
        
        colorPicker.style.display = 'block';
    }

    
    // Update fullscreen state
    function updateFullscreenState() {
        isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }

    

    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);
    document.addEventListener('mozfullscreenchange', updateFullscreenState);
    document.addEventListener('MSFullscreenChange', updateFullscreenState);


    // Hide color picker when clicking outside
    document.addEventListener('click', function(event) {
        if (!colorPicker.contains(event.target) && !event.target.classList.contains('table-header')) {
            colorPicker.style.display = 'none';
        }
    });

    // Handle color selection
    colorPicker.addEventListener('click', function(event) {
        if (event.target.classList.contains('color-option') && currentTableHeader) {
            const color = event.target.style.backgroundColor;
            applyColorToTableHeader(currentTableHeader, color);
            colorPicker.style.display = 'none';
        }
    });

    function applyColorToTableHeader(header, color) {
        const hexColor = rgbToHex(color);
        header.style.backgroundColor = hexColor;
        
        // Add a brief highlight effect
        header.style.transition = 'all 0.3s';
        header.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        setTimeout(() => {
            header.style.boxShadow = 'none';
        }, 300);
    
        updateERCode(header.parentElement.id, hexColor);
    }
    
     // Modify your draggable initialization to ignore double-clicks
     function initDraggable() {
        // Assuming you're using a library like jsPlumb for draggable functionality
        jsPlumb.draggable(jsPlumb.getSelector(".table"), {
            grid: [20, 20],
            containment: true,
            cancel: ".table-header", // Prevent dragging from the header
            start: function(event) {
                // Check if it's a double-click and ignore if it is
                if (event.originalEvent && event.originalEvent.detail === 2) {
                    return false;
                }
            }
        });
    }

    function rgbToHex(rgb) {
        const [r, g, b] = rgb.match(/\d+/g);
        return `#${((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1)}`;
    }

    function updateERCode(tableId, color) {
        const input = document.getElementById('er-input');
        if (input) {
            const lines = input.value.split('\n');
            const updatedLines = lines.map(line => {
                // Use a regular expression to match the exact table name
                const tableMatch = line.match(/^Table\s+(\S+)/);
                if (tableMatch && tableMatch[1] === tableId) {
                    if (line.includes('[headercolor:')) {
                        return line.replace(/\[headercolor:.*?\]/, `[headercolor: ${color}]`);
                    } else {
                        return `Table ${tableId} [headercolor: ${color}] {`;
                    }
                }
                return line;
            });
            input.value = updatedLines.join('\n');
            
            // Instead of regenerating the entire diagram, just update the color in the existing table
            updateTableHeaderColor(tableId, color);
        }
    }
    
    function updateTableHeaderColor(tableId, color) {
        const tableHeader = document.querySelector(`#${tableId} .table-header`);
        if (tableHeader) {
            tableHeader.style.backgroundColor = color;
        }
        
        // If you're using jsPlumb, you might need to repaint the connections
        if (typeof jsPlumb !== 'undefined') {
            jsPlumb.repaintEverything();
        }
    }
  
    let isResizing = false;
  
    splitter.addEventListener('mousedown', (e) => {
      isResizing = true;
      splitter.classList.add('dragging');
    });
  
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
  
      const appRect = app.getBoundingClientRect();
      let newPosition;
  
      if (window.innerWidth > 768) {
        newPosition = (e.clientX - appRect.left) / appRect.width;
      } else {
        newPosition = (e.clientY - appRect.top) / appRect.height;
      }
  
      newPosition = Math.max(0.1, Math.min(newPosition, 0.9));
  
      inputArea.style.flex = `${newPosition}`;
      outputArea.style.flex = `${1 - newPosition}`;
    });
  
    document.addEventListener('mouseup', () => {
      isResizing = false;
      splitter.classList.remove('dragging');
    });
  
    window.addEventListener('resize', () => {
      inputArea.style.flex = outputArea.style.flex = '1';
    });

    window.jsPlumbInstance = jsPlumb.getInstance({
        Connector: ["Flowchart", { cornerRadius: 5 }],
        PaintStyle: { stroke: "#3490dc", strokeWidth: 2 },
        EndpointStyle: { radius: 3, fill: "#3490dc" },
        HoverPaintStyle: { stroke: "#2779bd" },
        EndpointHoverStyle: { fill: "#2779bd" },
        Container: "diagram"
    });
    
    document.getElementById('generate-btn').addEventListener('click', generateDiagram);
    // Event listeners for the fullscreen control panel
    document.getElementById('fs-zoom-in').addEventListener('click', zoomIn);
    document.getElementById('fs-zoom-out').addEventListener('click', zoomOut);
    document.getElementById('fs-exit-fullscreen').addEventListener('click', toggleFullscreen);

    document.getElementById('zoom-in').addEventListener('click', zoomIn);
    document.getElementById('zoom-out').addEventListener('click', zoomOut);
    document.getElementById('export-png').addEventListener('click', exportAsPNG);
    document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('upload-er').click());
    document.getElementById('upload-er').addEventListener('change', uploadERFile);
    document.getElementById('download-btn').addEventListener('click', downloadERFile);
    document.getElementById('fullscreen-toggle').addEventListener('click', toggleFullscreen);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('er-input').addEventListener('input', updateLineNumbers);
    document.getElementById('er-input').addEventListener('scroll', function() {
        document.getElementById('line-numbers').scrollTop = this.scrollTop;
    });

    document.getElementById('er-input').addEventListener('input', updateEditor);
    document.getElementById('er-input').addEventListener('scroll', function() {
        document.getElementById('highlight-layer').scrollTop = this.scrollTop;
        document.getElementById('line-numbers').scrollTop = this.scrollTop;
    });


    // Initial call to set up editor
    updateEditor();

    // Initial call to set up line numbers
    updateLineNumbers();


});

function hasInputChanged() {
    const currentInput = document.getElementById('er-input').value;
    return currentInput !== lastSavedInput;
  }
  

function uploadERFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('er-input').value = e.target.result;
            updateEditor();
            generateDiagram();
        };
        reader.readAsText(file);
    }
}

function downloadERFile() {
    const content = document.getElementById('er-input').value;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'er-diagram.er';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function saveState() {
    const tables = {};
    document.querySelectorAll('.table').forEach(table => {
      tables[table.id] = {
        left: table.style.left,
        top: table.style.top
      };
    });
  
    const newState = {
      id: Date.now(),
      timestamp: new Date(),
      input: document.getElementById('er-input').value,
      tables: tables
    };
  
    versionHistory.push(newState);
    currentVersionIndex = versionHistory.length - 1;
  
    lastSavedInput = newState.input; // Record the last saved input
  
    updateVersionHistoryUI();
  }
  


function updateVersionHistoryUI() {
    const versionList = document.getElementById('version-list');
    versionList.innerHTML = '';

    versionHistory.forEach((version, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = version.timestamp.toLocaleString();
        listItem.onclick = () => showPreview(index);
        if (index === currentVersionIndex) {
            listItem.classList.add('current-version');
        }
        versionList.appendChild(listItem);
    });
}



function showRestoreDialog(versionIndex) {
    const dialog = document.createElement('div');
    dialog.className = 'restore-dialog';
    dialog.innerHTML = `
        <h4>Restore this version?</h4>
        <p>Your current diagram will be restored to this version.</p>
        <button onclick="restoreVersion(${versionIndex})">Restore</button>
        <button onclick="closeDialog()">Cancel</button>
    `;
    document.body.appendChild(dialog);
}


function restoreVersion() {
    if (currentPreviewVersion) {
        document.getElementById('er-input').value = currentPreviewVersion.input;
        generateDiagram();
        currentVersionIndex = versionHistory.indexOf(currentPreviewVersion);
        updateVersionHistoryUI();
        hidePreviewControls();
        currentPreviewVersion = null;
    }
}


function closeDialog() {
    const dialog = document.querySelector('.restore-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// Modify the generateDiagram function to accept a container ID and jsPlumb instance
function generateDiagram(containerId = 'diagram', jsPlumbInstance = window.jsPlumbInstance) {
    const input = document.getElementById('er-input').value;
    const lines = input.split('\n');
    let diagramHtml = '';
    let tables = {};
    let relationships = [];

    // Clear existing connections and endpoints
    jsPlumbInstance.reset();

    jsPlumbInstance.deleteEveryEndpoint();
    jsPlumbInstance.deleteEveryConnection();

    // Clear the container
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // Parse input and generate HTML for tables
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Table')) {
            const tableName = line.split(' ')[1];
            let tableContent = parseTable(lines.slice(i));
            tables[tableName] = tableContent;
            i += tableContent.fields.length + 1; // Skip processed lines
        } else if (line.startsWith('Ref:')) {
            const relationship = parseRelationship(line);
            if (relationship) {
                relationships.push(relationship);
            }
        }
    }

    // Create table HTML
    for (const [tableName, tableContent] of Object.entries(tables)) {
        diagramHtml += createTableHtml(tableName, tableContent);
    }

    container.innerHTML = diagramHtml;

    positionTables(containerId);

    jsPlumbInstance.draggable(jsPlumbInstance.getSelector(".table"), {
        grid: [20, 20],
        containment: true,
        stop: function (params) {
          adjustDiagramSize(containerId);
          if (containerId === 'diagram' && !currentPreviewVersion) {
            clearTimeout(movementTimeout);
            movementTimeout = setTimeout(saveState, 5000); // Save after 5 seconds of inactivity
          }
        }
      });

    // Create relationships
    setTimeout(() => {
        relationships.forEach(rel => createRelationship(rel, jsPlumbInstance));
        jsPlumbInstance.repaintEverything();
    }, 100);

    addInteractivity(containerId, jsPlumbInstance);
    adjustDiagramSize(containerId);

    if (containerId === 'diagram' && !currentPreviewVersion && hasInputChanged()) {
        saveState();
      }
}


function adjustDiagramSize(containerId) {
    const diagramArea = document.getElementById(containerId);
    const tables = diagramArea.querySelectorAll('.table');
    let maxRight = 0;
    let maxBottom = 0;

    tables.forEach(table => {
        const right = table.offsetLeft + table.offsetWidth;
        const bottom = table.offsetTop + table.offsetHeight;

        if (right > maxRight) {
            maxRight = right;
        }
        if (bottom > maxBottom) {
            maxBottom = bottom;
        }
    });

    diagramArea.style.width = (maxRight + 100) + 'px';
    diagramArea.style.height = (maxBottom + 100) + 'px';
}



function toggleVersionHistory() {
    const panel = document.getElementById('version-history-panel');
    const mainContent = document.getElementById('app'); // Adjust this ID if needed
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        mainContent.style.marginRight = '250px'; // Adjust based on panel width
        updateVersionHistoryUI();
    } else {
        panel.style.display = 'none';
        mainContent.style.marginRight = '0';
    }
}



function parseTable(lines) {
    let fields = [];
    let headerColor = null;
    for (const line of lines) {
        if (line.trim() === '}') break;
        if (line.includes('[headercolor:')) {
            headerColor = line.match(/headercolor:\s*(#[0-9A-Fa-f]{6})/)[1];
            continue;
        }
        const [name, type, ...options] = line.trim().split(' ');
        fields.push({ name, type, options });
    }
    return { fields, headerColor };
}

function parseRelationship(line) {
    if (!line || typeof line !== 'string') {
        console.error('Invalid input to parseRelationship:', line);
        return null;
    }

    const parts = line.split(':');
    if (parts.length < 2) {
        console.error('Invalid relationship format:', line);
        return null;
    }

    const rel = parts[1].trim();
    let [from, to, relationType] = ['', '', 'unknown'];

    // Check for the new format first
    if (rel.includes('>-')) {
        [from, to] = rel.split('>-').map(s => s.trim());
        relationType = 'one-to-many';
    } else if (rel.includes('-<')) {
        [from, to] = rel.split('-<').map(s => s.trim());
        relationType = 'many-to-one';
    } else if (rel.includes('--')) {
        [from, to] = rel.split('--').map(s => s.trim());
        relationType = 'one-to-one';
    } else {
        // Fall back to the old format
        [from, to] = rel.split('>').map(s => s.trim());
        relationType = 'one-to-many'; // Assume one-to-many for old format
    }

    if (!from || !to) {
        console.error('Invalid relationship format:', line);
        return null;
    }

    const [fromTable, fromField] = from.split('.');
    const [toTable, toField] = to.split('.');

    return { fromTable, fromField, toTable, toField, relationType };
}

function createTableHtml(tableName, tableContent) {
    console.log(tableContent.headerColor);
    const headerStyle = tableContent.headerColor ? `style="background-color: ${tableContent.headerColor};"` : '';
    let html = `<div class="table" id="${tableName}">
        <div class="table-header" ${headerStyle}>${tableName}</div>
        <div class="table-content">`;
    
    tableContent.fields.forEach((field, index) => {
        const options = field.options ? field.options.join(' ') : '';
        const classes = ['field'];
        let icon = '';
        if (options.includes('pk')) {
            classes.push('primary-key');
            icon = `<svg class="field-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
            </svg>`;
        } else if (options.includes('fk')) {
            classes.push('foreign-key');
            icon = `<svg class="field-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
            </svg>`;
        }
        html += `<div class="${classes.join(' ')}" title="${field.name}: ${field.type}">
            ${icon}
            <span class="field-name">${field.name}</span>
            <span class="field-type">${field.type}</span>
        </div>`;
    });

    html += '</div></div>';
    return html;
}


function createRelationship(rel, jsPlumbInstance) {
    let overlays = [
        ["Label", { 
            label: `${rel.fromField} -> ${rel.toField}`,
            cssClass: "relationship-label"
        }]
    ];

    let paintStyle = { stroke: "#3490dc", strokeWidth: 2 };

    switch(rel.relationType) {
        case 'one-to-many':
            overlays.push(["Custom", {
                create: function(component) {
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("width", "20");
                    svg.setAttribute("height", "20");
                    svg.setAttribute("viewBox", "0 0 24 24");
                    svg.innerHTML = '<path d="M5 9l7 7 7-7" fill="none" stroke="#3490dc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
                    return svg;
                },
                location: 1,
            }]);
            break;
        case 'many-to-one':
            overlays.push(["Custom", {
                create: function(component) {
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("width", "20");
                    svg.setAttribute("height", "20");
                    svg.setAttribute("viewBox", "0 0 24 24");
                    svg.innerHTML = '<path d="M19 9l-7 7-7-7" fill="none" stroke="#3490dc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
                    return svg;
                },
                location: 0,
            }]);
            break;
        case 'one-to-one':
            paintStyle.strokeWidth = 4;
            break;
    }

    jsPlumbInstance.connect({
        source: rel.fromTable,
        target: rel.toTable,
        anchors: ["AutoDefault", "AutoDefault"],
        connector: ["Flowchart", { cornerRadius: 5 }],
        paintStyle: paintStyle,
        endpointStyle: { fill: "#3490dc", radius: 3 },
        hoverPaintStyle: { stroke: "#2779bd" },
        overlays: overlays
    });
}


function positionTables(containerId) {
    const tables = document.querySelectorAll(`#${containerId} .table`);
    const diagramArea = document.getElementById(containerId);
    const padding = 40;
    const maxColumns = Math.ceil(Math.sqrt(tables.length));
    const columnWidth = Math.max(300, diagramArea.clientWidth / maxColumns);
    const rowHeight = 200;

    tables.forEach((table, index) => {
        const column = index % maxColumns;
        const row = Math.floor(index / maxColumns);

        const left = column * columnWidth + padding;
        const top = row * rowHeight + padding;

        table.style.left = `${left}px`;
        table.style.top = `${top}px`;
    });

    const width = (maxColumns * columnWidth) + (padding * 2);
    const height = (Math.ceil(tables.length / maxColumns) * rowHeight) + (padding * 2);
    
    diagramArea.style.width = `${width}px`;
    diagramArea.style.height = `${height}px`;
}


function addInteractivity(containerId, jsPlumbInstance) {
    const tables = document.querySelectorAll(`#${containerId} .table`);
    tables.forEach(table => {
        table.addEventListener('mouseenter', () => highlightRelatedTables(table.id, true, jsPlumbInstance));
        table.addEventListener('mouseleave', () => highlightRelatedTables(table.id, false, jsPlumbInstance));
    });
}


function highlightRelatedTables(tableId, highlight, jsPlumbInstance) {
    jsPlumbInstance.select({ source: tableId }).each(function(connection) {
        connection.setHover(highlight);
        if (highlight) {
            document.getElementById(connection.targetId).classList.add('table-highlight');
        } else {
            document.getElementById(connection.targetId).classList.remove('table-highlight');
        }
    });

    jsPlumbInstance.select({ target: tableId }).each(function(connection) {
        connection.setHover(highlight);
        if (highlight) {
            document.getElementById(connection.sourceId).classList.add('table-highlight');
        } else {
            document.getElementById(connection.sourceId).classList.remove('table-highlight');
        }
    });
}


let zoom = 1;
const zoomSpeed = 0.1;
const diagramContainer = document.getElementById('diagram-container');
const diagram = document.getElementById('diagram');

function zoomIn() {
    zoom += zoomSpeed;
    applyZoom();
}

function zoomOut() {
    zoom = Math.max(0.1, zoom - zoomSpeed);
    applyZoom();
}

function applyZoom() {
    diagram.style.transform = `scale(${zoom})`;
    diagram.style.transformOrigin = '0 0';
}

function exportAsPNG() {
    const diagram = document.getElementById('diagram');

    // Temporarily adjust styles to ensure the full diagram is captured
    const originalStyle = diagram.getAttribute('style');
    diagram.style.transform = 'none';
    diagram.style.width = diagram.scrollWidth + 'px';
    diagram.style.height = diagram.scrollHeight + 'px';

    domtoimage.toPng(diagram)
        .then(function (dataUrl) {
            const link = document.createElement('a');
            link.download = 'er-diagram.png';
            link.href = dataUrl;
            link.click();

            // Restore original styles
            diagram.setAttribute('style', originalStyle);
        })
        .catch(function (error) {
            console.error('Error exporting diagram as PNG:', error);
        });
}


function toggleTheme() {
    document.documentElement.classList.toggle('dark-theme');
}


function toggleFullscreen() {
    const diagramContainer = document.getElementById('diagram-container');
  
    if (!document.fullscreenElement) {
      diagramContainer.requestFullscreen().then(() => {
        // Move fullscreen controls into the fullscreen container
        diagramContainer.appendChild(document.getElementById('fullscreen-controls'));
      });
    } else {
      document.exitFullscreen().then(() => {
        // Move fullscreen controls back to their original position
        document.body.appendChild(document.getElementById('fullscreen-controls'));
      });
    }
  }
  

function updateVersionHistoryUI() {
    const versionList = document.getElementById('version-list');
    versionList.innerHTML = '';
    
    versionHistory.forEach((version, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = version.timestamp.toLocaleString();
        listItem.onclick = () => showPreview(index);
        if (index === currentVersionIndex) {
            listItem.classList.add('current-version');
        }
        versionList.appendChild(listItem);
    });
}


function hasUnsavedChanges() {
    if (versionHistory.length === 0) {
        return true;
    }
    const latestVersion = versionHistory[versionHistory.length - 1];
    const currentInput = document.getElementById('er-input').value;
    return currentInput !== latestVersion.input;
}



function showPreview(versionIndex) {
    // Save the current state before showing the preview if there are unsaved changes
    if (hasUnsavedChanges()) {
        saveState();
    }

    const version = versionHistory[versionIndex];
    currentPreviewVersion = version;

    // Update the er-input with the preview version's input
    document.getElementById('er-input').value = version.input;

    // Generate the diagram in the existing container
    generateDiagram();

    // Indicate that we are in preview mode
    showPreviewControls();
}


function showPreviewControls() {
    let controlsContainer = document.getElementById('preview-controls');
    if (!controlsContainer) {
        // Create the controls container
        controlsContainer = document.createElement('div');
        controlsContainer.id = 'preview-controls';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'space-between';
        controlsContainer.style.marginBottom = '10px';

        // Add buttons
        controlsContainer.innerHTML = `
            <button id="restore-version-btn">Restore Version</button>
            <button id="save-copy-btn">Save Copy</button>
            <button id="return-to-present-btn">Return to Latest</button>
        `;

        // Insert controls at the top of the output area
        const outputArea = document.getElementById('output-area');
        outputArea.insertBefore(controlsContainer, outputArea.firstChild);

        // Add event listeners
        document.getElementById('restore-version-btn').addEventListener('click', restoreVersion);
        document.getElementById('save-copy-btn').addEventListener('click', saveCopy);
        document.getElementById('return-to-present-btn').addEventListener('click', returnToPresent);
    } else {
        controlsContainer.style.display = 'flex';
    }

    // Add visual indication for preview mode
    document.getElementById('diagram-container').classList.add('preview-mode');
}


function hidePreviewControls() {
    const controlsContainer = document.getElementById('preview-controls');
    if (controlsContainer) {
        controlsContainer.style.display = 'none';
    }

    // Remove visual indication for preview mode
    document.getElementById('diagram-container').classList.remove('preview-mode');
}



function restoreVersion() {
    if (currentPreviewVersion) {
        document.getElementById('er-input').value = currentPreviewVersion.input;
        generateDiagram();
        currentVersionIndex = versionHistory.indexOf(currentPreviewVersion);
        updateVersionHistoryUI();
        hidePreviewControls();
        currentPreviewVersion = null;
    }
}


function closePreview() {
    document.getElementById('preview-container').style.display = 'none';
    currentPreviewVersion = null;
}

function saveCopy() {
    if (currentPreviewVersion) {
        const newVersion = { ...currentPreviewVersion, id: Date.now(), timestamp: new Date() };
        versionHistory.push(newVersion);
        currentVersionIndex = versionHistory.length - 1;
        updateVersionHistoryUI();
        hidePreviewControls();
        currentPreviewVersion = null;
    }
}

function updateLineNumbers() {
    const input = document.getElementById('er-input');
    const lineNumbers = document.getElementById('line-numbers');
    const lines = input.value.split('\n');
    
    lineNumbers.innerHTML = lines.map((_, index) => index + 1).join('<br>');
}


function returnToPresent() {
    currentVersionIndex = versionHistory.length - 1;
    const latestVersion = versionHistory[currentVersionIndex];
    document.getElementById('er-input').value = latestVersion.input;
    generateDiagram();
    updateVersionHistoryUI();
    hidePreviewControls();
    currentPreviewVersion = null;
}



function highlightSyntax(text) {
    const rules = [
        { regex: /(Table|Ref:)\b/g, class: 'keyword' },
        { regex: /\b(int|string|float|date|boolean)\b/g, class: 'type' },
        { regex: /(\w+)(?=\s*:)/g, class: 'field' },
        { regex: /(\/\/.*)/g, class: 'comment' },
        { regex: /"([^"]*)"/g, class: 'string' },
        { regex: /\b(\d+(\.\d+)?)\b/g, class: 'number' },
        { regex: /([><=\-+*\/])/g, class: 'operator' }
    ];

    let tokens = [];
    let lastIndex = 0;

    text.split('\n').forEach((line, lineIndex) => {
        let lineLastIndex = 0;

        rules.forEach(rule => {
            let match;
            while ((match = rule.regex.exec(line)) !== null) {
                if (match.index > lineLastIndex) {
                    tokens.push({
                        text: line.slice(lineLastIndex, match.index),
                        class: 'plain'
                    });
                }
                tokens.push({
                    text: match[0],
                    class: rule.class
                });
                lineLastIndex = rule.regex.lastIndex;
            }
        });

        if (lineLastIndex < line.length) {
            tokens.push({
                text: line.slice(lineLastIndex),
                class: 'plain'
            });
        }

        if (lineIndex < text.split('\n').length - 1) {
            tokens.push({ text: '\n', class: 'plain' });
        }
    });

    return tokens.map(token => 
        token.class === 'plain' ? token.text : `<span class="${token.class}">${escapeHtml(token.text)}</span>`
    ).join('');
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function updateEditor() {
    const input = document.getElementById('er-input');
    const highlightLayer = document.getElementById('highlight-layer');
    const lineNumbers = document.getElementById('line-numbers');

    // Update line numbers
    const lines = input.value.split('\n');
    lineNumbers.innerHTML = lines.map((_, index) => index + 1).join('<br>');

    // Update syntax highlighting
    highlightLayer.innerHTML = highlightSyntax(input.value);

    // Sync scroll position
    highlightLayer.scrollTop = input.scrollTop;
}


