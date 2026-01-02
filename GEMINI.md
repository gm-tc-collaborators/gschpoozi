# gschpoozi Development Context

## Project Status: Late Phase / Polish
**gschpoozi** is a near-complete, functional interactive configuration generator for [Klipper](https://www.klipper3d.org/). The core architecture is stable, the wizard flow is established, and the config generator produces working files for a wide range of hardware.

**Current Focus:**
-   **Bug Fixing & Validation:** Ensuring generated configs are syntactically correct and electrically safe.
-   **Edge Cases:** Handling complex setups (e.g., IDEX, multi-MCU, odd sensor combinations).
-   **Refinement:** Polishing the wizard UI/UX and improving error messaging.
-   **Hardware Support:** Expanding the library of board and toolboard templates.

## Architecture

The system relies on a unidirectional data flow:
1.  **Templates (`templates/`)**: Static JSON definitions of hardware capabilities (pins, ports, limits).
2.  **Wizard (`scripts/configure.sh`)**: A Python/whiptail TUI that interviews the user. It validates inputs against the hardware templates and saves a "State" (JSON).
3.  **Generator (`scripts/generate-config.py`)**: A logic engine that reads the State and Templates to deterministically output Klipper `.cfg` files.

## Key Directories & Files

*   **`scripts/configure.sh`**: **Entry point.** Bootstraps the environment and launches the wizard.
*   **`scripts/wizard/`**: Python source code for the TUI.
    *   `main.py`: Main loop and state management.
    *   `screens.py` / `questions.py`: UI logic (inferred names, check actual files).
*   **`schema/skeleton.json`**: **The Configuration Schema.** Defines the entire menu structure, available options, data types, and validation rules. **Modifying this changes the wizard's behavior.**
*   **`scripts/generate-config.py`**: **The Logic Core.** Converts the JSON state into Jinja2-style Klipper configuration text.
*   **`templates/boards/*.json`**: Hardware definitions. Maps physical ports (e.g., "Motor 1") to MCU pins (e.g., "PC13").
*   **`printer_data/config/.gschpoozi_state.json`**: The persistent state file storing user choices.

## Development Workflows

### 1. Testing Changes
Since the project is functional, regression testing is critical.
*   **Full Run:** `./scripts/configure.sh` to test the UI flow and file generation end-to-end.
*   **Generator Logic:** `python3 scripts/generate-config.py --output-dir ./tmp_test` (requires an existing state file) allows rapid iteration on the output text without re-running the wizard.

### 2. Modifying the Wizard
*   **Menu/Option Changes:** Most changes to *what* the user is asked happen in `schema/skeleton.json`.
*   **Logic/Validation Changes:** Complex constraints or dynamic behavior are handled in the Python code in `scripts/wizard/`.

### 3. Adding Hardware
*   **New Boards:** Create a new JSON file in `templates/boards/` following the schema of existing files (e.g., `btt-octopus-v1.1.json`). No code changes are usually required for standard boards.

## Constraints & Conventions
*   **No Manual Config Edits:** The generator overwrites its output files (`gschpoozi/*.cfg`). User customizations belong in `printer.cfg` (overrides) or separate macros, not in the generated files.
*   **Safe Defaults:** Generated configs should prioritize safety (conservative limits, safety checks enabled).
*   **Idempotency:** The generator must always produce the same output for the same input state.
