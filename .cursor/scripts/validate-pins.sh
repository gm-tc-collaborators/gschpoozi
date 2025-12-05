#!/bin/bash
# .cursor/scripts/validate-pins.sh
# Check for pin assignment conflicts

CONFIG_FILE="$1"

if [ -z "$CONFIG_FILE" ]; then
    echo "Usage: $0 <config-file>"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: File $CONFIG_FILE not found"
    exit 1
fi

# Extract all pin assignments, removing modifiers (^, !, ~)
# and normalizing format
PINS=$(grep -h "_pin:" "$CONFIG_FILE" 2>/dev/null | \
       sed 's/.*: //' | \
       sed 's/[!^~]//g' | \
       sed 's/ *#.*//' | \
       grep -v '^$' | \
       sort)

# Find duplicates
DUPLICATES=$(echo "$PINS" | uniq -d)

if [ -n "$DUPLICATES" ]; then
    echo "PIN CONFLICTS DETECTED:"
    echo ""

    # Show which pins are duplicated and where
    for PIN in $DUPLICATES; do
        echo "Pin $PIN is assigned multiple times:"
        grep -n "_pin:.*$PIN" "$CONFIG_FILE" | sed 's/^/  /'
        echo ""
    done

    echo "ERROR: Pin conflict check FAILED"
    echo "Each pin can only be assigned to one function"
    exit 1
else
    # No duplicates found
    PIN_COUNT=$(echo "$PINS" | grep -c . 2>/dev/null || echo "0")
    echo "No pin conflicts detected"
    echo "Total pins assigned: $PIN_COUNT"
    exit 0
fi
