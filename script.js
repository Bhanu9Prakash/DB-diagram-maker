//////////////////////
// GLOBAL VARIABLES //
//////////////////////
let jsPlumbInstance;
let versionHistory = [];
let currentVersionIndex = -1;
let currentPreviewVersion = null;
let lastSavedInput = '';
let movementTimeout;
let editor; // CodeMirror editor instance

//////////////////////////
// INITIALIZATION (DOM) //
//////////////////////////
document.addEventListener('DOMContentLoaded', function() {
  // Initialize CodeMirror from the textarea with id "er-input"
  const textarea = document.getElementById('er-input');
  editor = CodeMirror.fromTextArea(textarea, {
    mode: "text/x-sql", // adjust this mode if needed for your ER syntax
    lineNumbers: true,
    theme: "default",
    viewportMargin: 10  // ensures CodeMirror limits rendering to the viewport plus a few extra lines

  });

  editor.setSize(null, '670px');


  // Get references to main containers and UI elements
  const app = document.getElementById('app');
  const inputArea = document.getElementById('input-area');
  const splitter = document.getElementById('splitter');
  const outputArea = document.getElementById('output-area');
  const colorPicker = document.getElementById('custom-color-picker');
  const diagramContainer = document.getElementById('diagram-container');
  let currentTableHeader = null;
  let isFullscreen = false;

  ////////////////////////////////
  // VERSION HISTORY / MODAL UI //
  ////////////////////////////////
  document.getElementById('return-to-present-btn').addEventListener('click', returnToPresent);
  document.getElementById('save-version-btn').addEventListener('click', openSaveVersionModal);
  document.getElementById('toggle-history-btn').addEventListener('click', toggleVersionHistory);

  ////////////////////////////
  // FILE UPLOAD / DOWNLOAD //
  ////////////////////////////
  document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('upload-er').click();
  });
  document.getElementById('upload-er').addEventListener('change', uploadERFile);
  document.getElementById('download-btn').addEventListener('click', downloadERFile);

  ///////////////////////
  // OTHER UI CONTROLS //
  ///////////////////////
  document.getElementById('generate-btn').addEventListener('click', generateDiagram);
  document.getElementById('fs-zoom-in').addEventListener('click', zoomIn);
  document.getElementById('fs-zoom-out').addEventListener('click', zoomOut);
  document.getElementById('fs-exit-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('zoom-in').addEventListener('click', zoomIn);
  document.getElementById('zoom-out').addEventListener('click', zoomOut);
  document.getElementById('export-png').addEventListener('click', exportAsPNG);
  document.getElementById('fullscreen-toggle').addEventListener('click', toggleFullscreen);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  ////////////////////////////
  // CodeMirror does its own //
  // scrolling/line numbers //
  ////////////////////////////
  // (No need for updateEditor or updateLineNumbers since CodeMirror handles it.)

  /////////////////////////////
  // Color Picker on Double-Click
  /////////////////////////////
  diagramContainer.addEventListener('dblclick', function(event) {
    if (event.target.classList.contains('table-header')) {
      event.stopPropagation();
      event.preventDefault();
      if (jsPlumbInstance && typeof jsPlumbInstance.setDraggable === 'function') {
        const tableEl = event.target.closest('.table');
        jsPlumbInstance.setDraggable(tableEl, false);
        setTimeout(() => {
          jsPlumbInstance.setDraggable(tableEl, true);
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

  //////////////////////////
  // Fullscreen State Update
  //////////////////////////
  function updateFullscreenState() {
    isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }
  document.addEventListener('fullscreenchange', updateFullscreenState);
  document.addEventListener('webkitfullscreenchange', updateFullscreenState);
  document.addEventListener('mozfullscreenchange', updateFullscreenState);
  document.addEventListener('MSFullscreenChange', updateFullscreenState);

  //////////////////////////
  // Hide Color Picker on Click Outside
  //////////////////////////
  document.addEventListener('click', function(event) {
    if (!colorPicker.contains(event.target) && !event.target.classList.contains('table-header')) {
      colorPicker.style.display = 'none';
    }
  });

  //////////////////////////
  // Color Selection Handler
  //////////////////////////
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
    header.style.transition = 'all 0.3s';
    header.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    setTimeout(() => {
      header.style.boxShadow = 'none';
    }, 300);
    updateERCode(header.parentElement.id, hexColor);
  }

  function rgbToHex(rgb) {
    const [r, g, b] = rgb.match(/\d+/g);
    return `#${((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1)}`;
  }

  function updateERCode(tableId, color) {
    // Update the underlying text with the header color tag.
    let content = editor.getValue();
    const lines = content.split('\n');
    const updatedLines = lines.map(line => {
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
    editor.setValue(updatedLines.join('\n'));
    updateTableHeaderColor(tableId, color);
  }

  function updateTableHeaderColor(tableId, color) {
    const tableHeader = document.querySelector(`#${tableId} .table-header`);
    if (tableHeader) {
      tableHeader.style.backgroundColor = color;
    }
    if (typeof jsPlumb !== 'undefined') {
      jsPlumb.repaintEverything();
    }
  }

  /////////////////////////
  // Resize Splitter
  /////////////////////////
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

  //////////////////////////
  // Initialize jsPlumb Instance
  //////////////////////////
  window.jsPlumbInstance = jsPlumb.getInstance({
    Connector: ["Flowchart", { cornerRadius: 5 }],
    PaintStyle: { stroke: "#3490dc", strokeWidth: 2 },
    EndpointStyle: { radius: 3, fill: "#3490dc" },
    HoverPaintStyle: { stroke: "#2779bd" },
    EndpointHoverStyle: { fill: "#2779bd" },
    Container: "diagram"
  });

  // (Optionally, you can call generateDiagram() here if you want to auto-generate at start.)
});

/////////////////////////
// FILE UPLOAD & DOWNLOAD
/////////////////////////
function uploadERFile(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      editor.setValue(e.target.result);
      generateDiagram();
    };
    reader.readAsText(file);
  }
}

function downloadERFile() {
  const content = editor.getValue();
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'er-diagram.er';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/////////////////////////
// VERSION HISTORY & MODAL
/////////////////////////
function openSaveVersionModal() {
  const modal = document.createElement('div');
  modal.className = 'save-version-modal'; // Style this in your CSS
  modal.innerHTML = `
    <h4>Save Current Version</h4>
    <p>Add a comment for this version (optional):</p>
    <textarea id="save-version-comment" placeholder="Enter comment here..." style="width: 100%; height: 80px; padding: 5px;"></textarea>
    <div style="margin-top: 10px; text-align: right;">
      <button id="save-version-confirm">Save</button>
      <button id="save-version-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('save-version-confirm').addEventListener('click', function() {
    const comment = document.getElementById('save-version-comment').value;
    saveState(comment);
    document.body.removeChild(modal);
  });
  document.getElementById('save-version-cancel').addEventListener('click', function() {
    document.body.removeChild(modal);
  });
}

function saveState(comment = "") {
  const tables = {};
  document.querySelectorAll('.table').forEach(table => {
    // Store the computed positions (using offsetLeft/offsetTop)
    tables[table.id] = {
      left: table.offsetLeft,
      top: table.offsetTop
    };
  });
  const newState = {
    id: Date.now(),
    timestamp: new Date(),
    input: editor.getValue(),
    tables: tables,
    comment: comment
  };
  versionHistory.push(newState);
  currentVersionIndex = versionHistory.length - 1;
  lastSavedInput = newState.input;
  updateVersionHistoryUI();
}

function updateVersionHistoryUI() {
  const versionList = document.getElementById('version-list');
  versionList.innerHTML = '';
  versionHistory.forEach((version, index) => {
    const listItem = document.createElement('li');
    // Show timestamp and comment
    listItem.innerHTML = `<div class="version-timestamp">${version.timestamp.toLocaleString()}</div>`;
    if (version.comment && version.comment.trim() !== "") {
      listItem.innerHTML += `<div class="version-comment">${version.comment}</div>`;
    }
    listItem.onclick = () => {
      currentVersionIndex = index;
      showPreview(index);
      updateVersionHistoryUI();
    };
    if (index === currentVersionIndex) {
      listItem.classList.add('current-version');
    }
    versionList.appendChild(listItem);
  });
}

function showPreview(versionIndex) {
  const version = versionHistory[versionIndex];
  currentPreviewVersion = version;
  editor.setValue(version.input);
  generateDiagram();
  showPreviewControls();
}

function showPreviewControls() {
  let controlsContainer = document.getElementById('preview-controls');
  if (!controlsContainer) {
    controlsContainer = document.createElement('div');
    controlsContainer.id = 'preview-controls';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'space-between';
    controlsContainer.style.marginBottom = '10px';
    controlsContainer.innerHTML = `
      <button id="restore-version-btn">Restore Version</button>
      <button id="save-copy-btn">Save Copy</button>
      <button id="preview-return-to-present-btn">Return to Latest</button>
    `;
    const outputArea = document.getElementById('output-area');
    outputArea.insertBefore(controlsContainer, outputArea.firstChild);
    document.getElementById('restore-version-btn').addEventListener('click', restoreVersion);
    document.getElementById('save-copy-btn').addEventListener('click', saveCopy);
    document.getElementById('preview-return-to-present-btn').addEventListener('click', returnToPresent);
  } else {
    controlsContainer.style.display = 'flex';
  }
  document.getElementById('diagram-container').classList.add('preview-mode');
}

function hidePreviewControls() {
  const controlsContainer = document.getElementById('preview-controls');
  if (controlsContainer) {
    controlsContainer.style.display = 'none';
  }
  document.getElementById('diagram-container').classList.remove('preview-mode');
}

function restoreVersion() {
  if (currentPreviewVersion) {
    editor.setValue(currentPreviewVersion.input);
    generateDiagram();
    currentVersionIndex = versionHistory.indexOf(currentPreviewVersion);
    updateVersionHistoryUI();
    hidePreviewControls();
    currentPreviewVersion = null;
  }
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

function returnToPresent() {
  currentVersionIndex = versionHistory.length - 1;
  const latestVersion = versionHistory[currentVersionIndex];
  editor.setValue(latestVersion.input);
  generateDiagram();
  updateVersionHistoryUI();
  hidePreviewControls();
  currentPreviewVersion = null;
}

/////////////////////////////
// DIAGRAM GENERATION & INTERACTIVITY
/////////////////////////////
function generateDiagram(containerId = 'diagram', jsPlumbInstance = window.jsPlumbInstance) {
  const input = editor.getValue();
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

  // Parse input for tables and relationships
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Table')) {
      const tableName = line.split(' ')[1];
      let tableContent = parseTable(lines.slice(i));
      tables[tableName] = tableContent;
      i += tableContent.fields.length + 1;
    } else if (line.startsWith('Ref:')) {
      const relationship = parseRelationship(line);
      if (relationship) {
        relationships.push(relationship);
      }
    }
  }

  // Create HTML for each table
  for (const [tableName, tableContent] of Object.entries(tables)) {
    diagramHtml += createTableHtml(tableName, tableContent);
  }
  container.innerHTML = diagramHtml;

  positionTables(containerId);

  jsPlumbInstance.draggable(jsPlumbInstance.getSelector(".table"), {
    grid: [20, 20],
    containment: true,
    stop: function(params) {
      adjustDiagramSize(containerId);
      // Auto-save removed – versions are now saved explicitly.
    }
  });

  // Create relationships after a short delay
  setTimeout(() => {
    relationships.forEach(rel => createRelationship(rel, jsPlumbInstance));
    jsPlumbInstance.repaintEverything();
  }, 100);

  addInteractivity(containerId, jsPlumbInstance);
  adjustDiagramSize(containerId);
}

function adjustDiagramSize(containerId) {
  const diagramArea = document.getElementById(containerId);
  const tables = diagramArea.querySelectorAll('.table');
  let maxRight = 0;
  let maxBottom = 0;
  tables.forEach(table => {
    const right = table.offsetLeft + table.offsetWidth;
    const bottom = table.offsetTop + table.offsetHeight;
    if (right > maxRight) { maxRight = right; }
    if (bottom > maxBottom) { maxBottom = bottom; }
  });
  diagramArea.style.width = (maxRight + 100) + 'px';
  diagramArea.style.height = (maxBottom + 100) + 'px';
}

function toggleVersionHistory() {
  const panel = document.getElementById('version-history-panel');
  const mainContent = document.getElementById('app');
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
    mainContent.style.marginRight = '250px';
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
    [from, to] = rel.split('>').map(s => s.trim());
    relationType = 'one-to-many';
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
  const headerStyle = tableContent.headerColor ? `style="background-color: ${tableContent.headerColor};"` : '';
  let html = `<div class="table" id="${tableName}">
      <div class="table-header" ${headerStyle}>${tableName}</div>
      <div class="table-content">`;
  tableContent.fields.forEach(field => {
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
  switch (rel.relationType) {
    case 'one-to-many':
      overlays.push(["Custom", {
        create: function() {
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
        create: function() {
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
    const targetEl = document.getElementById(connection.targetId);
    if (targetEl) {
      if (highlight) {
        targetEl.classList.add('table-highlight');
      } else {
        targetEl.classList.remove('table-highlight');
      }
    }
  });
  jsPlumbInstance.select({ target: tableId }).each(function(connection) {
    connection.setHover(highlight);
    const sourceEl = document.getElementById(connection.sourceId);
    if (sourceEl) {
      if (highlight) {
        sourceEl.classList.add('table-highlight');
      } else {
        sourceEl.classList.remove('table-highlight');
      }
    }
  });
}

/////////////////////////
// ZOOM & EXPORT FUNCTIONS
/////////////////////////
let zoom = 1;
const zoomSpeed = 0.1;
const diagramContainerEl = document.getElementById('diagram-container');
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
  const diagramEl = document.getElementById('diagram');
  const originalStyle = diagramEl.getAttribute('style');
  diagramEl.style.transform = 'none';
  diagramEl.style.width = diagramEl.scrollWidth + 'px';
  diagramEl.style.height = diagramEl.scrollHeight + 'px';
  domtoimage.toPng(diagramEl)
    .then(function(dataUrl) {
      const link = document.createElement('a');
      link.download = 'er-diagram.png';
      link.href = dataUrl;
      link.click();
      diagramEl.setAttribute('style', originalStyle);
    })
    .catch(function(error) {
      console.error('Error exporting diagram as PNG:', error);
    });
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark-theme');
}

function toggleFullscreen() {
  const diagramContainerEl = document.getElementById('diagram-container');
  if (!document.fullscreenElement) {
    diagramContainerEl.requestFullscreen().then(() => {
      diagramContainerEl.appendChild(document.getElementById('fullscreen-controls'));
    });
  } else {
    document.exitFullscreen().then(() => {
      document.body.appendChild(document.getElementById('fullscreen-controls'));
    });
  }
}
