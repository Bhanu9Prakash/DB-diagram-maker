
```markdown
# DB Diagram Generator

A web-based DB Diagram Generator with an integrated editor that allows you to define, visualize, and interact with DB diagrams. The project features robust syntax highlighting (using CodeMirror), drag‐and‐drop table positioning (powered by jsPlumb), manual version saving with an optional comment modal, file upload/download functionality, zoom controls, and PNG export.

## Features

- **Editor with Syntax Highlighting:**  
  Powered by CodeMirror for robust editing, dynamic resizing, and full reflow of text.

- **Diagram Generation:**  
  Automatically generate DB diagrams from your DB definition text.

- **Drag-and-Drop Layout:**  
  Rearrange tables on the canvas using jsPlumb’s drag-and-drop functionality.

- **Version History:**  
  Manually save versions (with optional comments) via a modal dialog. View and restore previous versions with visual highlights.

- **File Operations:**  
  Upload an `.er` file to load an existing DB definition or download your current definition.

- **Zoom & Export:**  
  Zoom in/out on your diagram and export the complete diagram as a PNG image.

- **Theme Toggle & Fullscreen:**  
  Switch between dark/light themes and toggle fullscreen mode for an immersive experience.

## Demo

*(If you have a live demo or screenshots, add them here.)*

## Installation

### Prerequisites

You only need a modern browser to run this project. However, if you’d like to serve the project locally, you can use a static file server such as [http-server](https://www.npmjs.com/package/http-server).

### Running Locally

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/er-diagram-generator.git
   cd er-diagram-generator
   ```

2. **Serve the files:**

   If you have `http-server` installed globally, run:

   ```bash
   http-server
   ```

   Then open your browser at [http://localhost:8080](http://localhost:8080).

   Alternatively, you can open the `index.html` file directly in your browser.

## Dependencies

This project leverages several libraries via CDN:

- **[CodeMirror](https://codemirror.net/):**  
  For the in-browser text editor with syntax highlighting.

- **[jsPlumb](https://jsplumbtoolkit.com/):**  
  For connecting diagram elements and enabling drag-and-drop functionality.

- **[dom-to-image](https://github.com/tsayen/dom-to-image):**  
  For exporting the diagram as a PNG image.

- **[html2canvas](https://html2canvas.hertzen.com/):**  
  (If used) For capturing screenshots of the diagram.

These libraries are loaded via script tags in `index.html`. No local installation is required.

## File Structure

```
├── .gitignore
├── .replit
├── er-diagram-1.er
├── er-diagram.er
├── generated-icon.png
├── index.html
├── script.js
└── style.css
```

- **index.html:** Main HTML file that loads the application.
- **script.js:** Contains all JavaScript functionality (editor initialization, diagram generation, version history, file operations, etc.).
- **style.css:** Contains styles for the application UI, including CodeMirror, the diagram canvas, modals, and version history.
- **.gitignore, .replit:** Configuration files for Git and Replit.

## Usage

1. **Editing DB Definitions:**  
   Use the integrated CodeMirror editor (located on the left) to write or edit your DB diagram definition. The editor provides robust syntax highlighting and automatic resizing.

2. **Generating the Diagram:**  
   Click the **Generate Diagram** button to render the diagram based on your DB definition.

3. **Drag-and-Drop Positioning:**  
   Once generated, you can reposition tables on the canvas by dragging them.

4. **Saving and Restoring Versions:**  
   - Click the **Save Version** button to open a modal where you can add an optional comment before saving the current version.
   - Use the **Version History** panel to view saved versions and click on a version to preview it. The currently active version is highlighted.
   - Use **Restore Version**, **Save Copy**, or **Return to Latest** from the preview controls to manage versions.

5. **File Operations:**  
   - Use **Upload .er File** to load an existing DB definition into the editor.
   - Use **Download .er File** to save the current DB definition.

6. **Zoom, Export, and Theme:**  
   - Use the **Zoom In/Out** buttons to adjust the diagram’s scale.
   - Click **Export as PNG** to download an image of the diagram.
   - Toggle the theme using the **Toggle Theme** button.
   - Use the **Fullscreen** toggle for an immersive editing experience.

## Configuration

- **Editor Mode:**  
  Currently, the CodeMirror editor is set to `text/x-sql`. Adjust the mode in `script.js` if your DB syntax differs.

- **Container Sizes:**  
  The editor and diagram containers are sized using CSS (e.g., `#er-editor-container` is set to fill 80% of the viewport height). Modify these in **style.css** as needed.

- **Viewport Margin:**  
  CodeMirror’s `viewportMargin` is set to the default value. Adjust in `script.js` during initialization if necessary.

## Acknowledgments

- [CodeMirror](https://codemirror.net/) for providing an excellent code editing experience.
- [jsPlumb](https://jsplumbtoolkit.com/) for the robust diagram connection functionality.
- Other libraries and contributors who helped make this project possible.
```
