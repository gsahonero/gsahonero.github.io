# CV JSON to LaTeX Builder

A modular, high-fidelity offline web application designed to build, customize, and compile curriculum vitae (CV) documents from structured JSON databases into premium LaTeX, HTML, Markdown, and JSON Resume formats.

## 🚀 Key Features

*   **Modular Architecture**: Fully decoupled CSS and JS modules for easy maintainability, extensibility, and clean developer workflows.
*   **Bilingual Translation Layer**: Dynamic language toggle FAB and filter to customize content outputs in English (EN) or Spanish (ES).
*   **Unified Tailored CV Instances**: Maintain a single Master CV career profile while saving application-specific overrides directly inside your `.cv` database.
*   **Free & Local AI Integration (Ollama + Gemini)**: 100% offline local LLM support via Ollama (`http://localhost:11434`) and free Google Gemini Flash API (BYOK) for bullet point polishing, grammar correction, translation, and an interactive **"Ask me to improve"** critique wizard.
*   **Data Importer & Exporter Engine**: Seamless import and export support for standard **JSON Resume (`resume.json`)**, **Reactive Resume JSON**, **LinkedIn Data**, **Markdown**, and **Plain Text**.
*   **ATS Optimization & Keyword Inspector**: Real-time ATS compliance score calculator (with optional phone rules) and target job description keyword matcher.
*   **Smooth Drag-and-Drop Reordering**: Intuitive HTML5 drag-and-drop handles (`⋮⋮`) to reorder experience entries and section list items.
*   **Live Previews & Page-Break Guides**: Real-time rendering of HTML drafts, LaTeX source files, JSON schemas, and visual A4/Letter page-break guide lines.
*   **Markdown Syntax Support**: Write `**bold**`, `*italic*`, and `[link](url)` in description fields—automatically compiled into LaTeX (`\textbf{}`, `\textit{}`, `\href{}`) and HTML.
*   **One-Click PDF Compiler**: Directly compiles LaTeX source files via an external server payload compiler to download high-fidelity PDF documents.

---

## 📂 Repository Structure

The project is structured into clean, dedicated modules:

```text
├── index.html                           # App entry point & main layout nodes
├── test_logic.html                      # Extensive functionality & integration test runner
├── css/
│   └── main.css                         # CSS design tokens, animations, drag-and-drop & modal grids
├── js/
│   ├── constants.js                     # Global templates, changelogs, and preset definitions
│   ├── translations.js                  # Localization dictionary keys and DOM translations
│   ├── compiler.js                      # Template engines, Markdown/LaTeX/HTML escapers, and builders
│   ├── database.js                      # LocalStorage CV, Style, and embedded Instance CRUD methods
│   ├── importer.js                      # Importer engine (JSON Resume, Reactive Resume, LinkedIn)
│   ├── exporter.js                      # Exporter engine (JSON Resume, Reactive Resume, Markdown, Text)
│   ├── ats.js                           # ATS compliance evaluator & job keyword matcher
│   ├── ai.js                            # Free Gemini Flash & Ollama Local LLM client + Critique wizard
│   ├── editor.js                        # Form outline, drag-and-drop handlers, and input editors
│   ├── tour.js                          # Welcome guided tour step sequences
│   └── app.js                           # Core bootstrap controller & diagnostics runner
├── presets/
│   └── professional_default.cv          # Basic Professional profile preset (Alex Morgan)
└── README.md                            # Repository technical documentation
```

---

## 🛠️ Getting Started (Direct Local Execution)

The application has been engineered to run **entirely offline** by opening `index.html` directly in a browser:

1. Clone the repository to your local machine.
2. Double-click `index.html` to boot the application.
3. *Note: No local server, bundler, or build tools are required.* Synchronous sequential script imports bypass browser ES Module CORS blockages on local `file://` protocols.

---

## 🧪 Testing Suites

To ensure robust functionality across all logic layers, the application includes two test runners:

### 1. Embedded System Diagnostics
Accessible directly inside the app under **Help &rarr; Run Diagnostics**.
* Runs an automated test suite including compilation, string escaping, localStorage CRUD, reordering bounds, ATS scoring, and module integration inside your active workspace.
* Enables JSON diagnostic report downloads.

### 2. Standalone Logic Test Suite
Open `test_logic.html` directly in your browser.
* Provides a clean headless workspace to run the extensive functionality suite.
* Automates assertions for:
    * **Suite 1: Compiler & Escaping** (LaTeX characters, HTML entities, Markdown syntax parsing).
    * **Suite 2: Data Manipulation** (Item list reordering, drag-and-drop bounds, nested paths).
    * **Suite 3: Storage Managers** (Database saving, embedded instances housekeeping).
    * **Suite 4: Importers & Exporters** (JSON Resume, Reactive Resume, Markdown round-trips).
    * **Suite 5: ATS & AI Module Integration** (ATS scoring, optional phone rules, Ollama/Gemini AI client state).
