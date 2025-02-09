import { initializeDiagram, generateDiagram } from './modules/diagram.js';
import { initializeVersionControl } from './modules/versionControl.js';
import { initializeUI } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', function() {
    initializeDiagram();
    initializeVersionControl();
    initializeUI();

    // Add event listeners for main buttons
    document.getElementById('generate-btn').addEventListener('click', generateDiagram);
    // ... other main event listeners ...
});
