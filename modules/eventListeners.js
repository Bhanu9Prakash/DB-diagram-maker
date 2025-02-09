export function initializeEventListeners() {
    // Add all event listeners here
    document.getElementById('generate-btn').addEventListener('click', generateDiagram);
    document.getElementById('save-version-btn').addEventListener('click', saveState);
    // ... add all other event listeners
}