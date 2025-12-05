#!/bin/bash
# .cursor/scripts/validate-config.sh
# Main validation script - runs all safety checks

set -e

CONFIG_FILE="$1"

if [ -z "$CONFIG_FILE" ]; then
    echo "Usage: $0 <config-file.cfg>"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: File $CONFIG_FILE not found"
    exit 1
fi

echo "======================================"
echo "Validating Klipper Configuration"
echo "File: $CONFIG_FILE"
echo "======================================"
echo ""

ERRORS=0

# 1. Check for equals instead of colons
echo "-> Checking parameter syntax (colon vs equals)..."
if grep -n '^[^#;]*= ' "$CONFIG_FILE"; then
    echo "ERROR: Found '=' instead of ':' in parameters above"
    ERRORS=$((ERRORS + 1))
else
    echo "OK: Parameter syntax correct"
fi
echo ""

# 2. Check for uppercase in section headers (warning only)
echo "-> Checking section header case..."
if grep -n '^\[[^]]*[A-Z]' "$CONFIG_FILE" | grep -v 'gcode_macro\|_[A-Z]'; then
    echo "WARNING: Found uppercase in section headers (may still work)"
else
    echo "OK: Section headers look good"
fi
echo ""

# 3. Check for common typos
echo "-> Checking for common typos..."
TYPOS=0

# Common section name typos
if grep -qi '^\[filament_sensor[^_]' "$CONFIG_FILE"; then
    echo "WARNING: Found [filament_sensor] - should be [filament_switch_sensor] or [filament_motion_sensor]"
    TYPOS=$((TYPOS + 1))
fi

if [ $TYPOS -eq 0 ]; then
    echo "OK: No common typos found"
fi
echo ""

# 4. Check for TODO/FIXME markers
echo "-> Checking for TODO/FIXME markers..."
if grep -n "TODO\|FIXME\|XXX" "$CONFIG_FILE" | grep -v "^#"; then
    echo "WARNING: Found TODO/FIXME markers - review before production deployment"
else
    echo "OK: No TODO/FIXME markers"
fi
echo ""

# 5. Thermal safety check (if script exists)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/validate-thermal.py" ]; then
    echo "-> Running thermal safety check..."
    if python3 "$SCRIPT_DIR/validate-thermal.py" "$CONFIG_FILE"; then
        echo "OK: Thermal safety check passed"
    else
        echo "ERROR: Thermal safety check FAILED"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
fi

# 6. Movement safety check (if script exists)
if [ -f "$SCRIPT_DIR/validate-movement.py" ]; then
    echo "-> Running movement safety check..."
    if python3 "$SCRIPT_DIR/validate-movement.py" "$CONFIG_FILE"; then
        echo "OK: Movement safety check passed"
    else
        echo "ERROR: Movement safety check FAILED"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
fi

# 7. Pin conflict check (if script exists)
if [ -f "$SCRIPT_DIR/validate-pins.sh" ]; then
    echo "-> Running pin conflict check..."
    if bash "$SCRIPT_DIR/validate-pins.sh" "$CONFIG_FILE"; then
        echo "OK: No pin conflicts"
    else
        echo "ERROR: Pin conflicts detected"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
fi

# Summary
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "ALL VALIDATION CHECKS PASSED"
    echo "======================================"
    exit 0
else
    echo "VALIDATION FAILED - $ERRORS error(s) found"
    echo "======================================"
    exit 1
fi
