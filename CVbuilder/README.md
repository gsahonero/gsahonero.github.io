# CV JSON to LaTeX Builder

A modular, high-fidelity offline web application designed to build, customize, and compile curriculum vitae (CV) documents from structured JSON databases into premium LaTeX and HTML formats.

## 🚀 Key Features

*   **Modular Architecture**: Fully decoupled CSS and JS modules for easy maintainability, extensibility, and clean developer workflows.
*   **Bilingual Translation Layer**: Dynamic language toggle FAB and filter to customize content outputs in English (EN) or Spanish (ES).
*   **Decoupled CV Instances**: Tailored application-specific overrides (`.cvinstance`) overlaying the master profile (`.cv`) without modifications to your central database.
*   **Visual Customizer Panel**: In-app color pickers and typography select bindings that compile directly into LaTeX packages and HTML stylesheets.
*   **Binary Photo Loader**: Profile pictures are encoded as self-contained Base64 streams inside database payloads, and converted to binary multipart fields on export.
*   **Live Previews**: real-time rendering of HTML drafts, LaTeX source files, and JSON schemas.
*   **One-Click PDF Compiler**: Directly compiles LaTeX source files via an external server payload compiler to download high-fidelity PDF documents.

---

## 📂 Repository Structure

The project has been split from a monolithic codebase into clean, dedicated modules:

```text
├── index.html                           # App entry point & main layout nodes
├── test_logic.html                      # Extensive functionality & integration test runner
├── css/
│   └── main.css                         # CSS design tokens, animations, and modal grids
├── js/
│   ├── constants.js                     # Global templates, changelogs, and preset definitions
│   ├── translations.js                  # Localization dictionary keys and DOM translations
│   ├── compiler.js                      # Template engines, LaTeX/HTML escapers, and builders
│   ├── database.js                      # LocalStorage CV, Style, and Instance CRUD methods
│   ├── editor.js                        # Form outline, outline highlight, and input editors
│   ├── tour.js                          # Welcome guided tour step sequences
│   └── app.js                           # Core bootstrap controller & diagnostics runner
├── presets/
│   ├── professional_default.cv          # Basic Professional profile preset (Alex Morgan)
│   └── default_overrides.cvinstance     # Sample instance overrides file
└── README.md                            # Repository technical documentation
```

---

## 🛠️ Getting Started (Direct Local Execution)

The application has been engineered to run **entirely offline** by opening `index.html` directly in a browser:

1.  Clone the repository to your local machine.
2.  Double-click `index.html` to boot the application.
3.  *Note: No local server, bundler, or build tools are required.* Synchronous sequential script imports bypass browser ES Module CORS blockages on local `file://` protocols.

---

## 🧪 Testing Suites

To ensure robust functionality across all logic layers, the application includes two test runners:

### 1. Embedded System Diagnostics
Accessible directly inside the app under **Help &rarr; Run Diagnostics**.
*   Runs a 15-assertion suite including compilation, string escaping, localStorage CRUD, reordering bounds, and module integration inside your active workspace.
*   Enables JSON diagnostic report downloads.

### 2. Standalone Logic Test Suite
Open `test_logic.html` directly in your browser.
*   Provides a clean headless workspace to run the extensive functionality suite.
*   Automates assertions for:
    *   **Suite 1: Compiler & Escaping** (LaTeX characters, HTML entities, template safety).
    *   **Suite 2: Data Manipulation** (Item list reordering, bounds validation, nested paths).
    *   **Suite 3: Storage Managers** (Database saving, loading, deletion).
    *   **Suite 4: Module Integration** (Cross-module database-to-compiler updates, translator-to-UI bindings, and active tailored instances compilation).
