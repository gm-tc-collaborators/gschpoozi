#!/usr/bin/env bash
set -euo pipefail

# gschpoozi Multi-Instance Manager
#
# Manages multiple parallel Klipper+Moonraker instances with distinct:
# - printer_data directories
# - systemd service names (klipper-<id>, moonraker-<id>)
# - Moonraker ports
# - nginx web UI sites + ports
#
# Usage:
#   ./klipper_instance_manager.sh create <instance_id> <moonraker_port> <webui> <webui_port>
#   ./klipper_instance_manager.sh list
#   ./klipper_instance_manager.sh start <instance_id>
#   ./klipper_instance_manager.sh stop <instance_id>
#   ./klipper_instance_manager.sh restart <instance_id>
#   ./klipper_instance_manager.sh remove <instance_id>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INSTALL_LIB_DIR="${REPO_ROOT}/scripts/lib"

# Source the klipper-install library for helper functions
# shellcheck disable=SC1091
source "${INSTALL_LIB_DIR}/klipper-install.sh"

ACTION="${1:-}"
INSTANCE_ID="${2:-}"

# ═══════════════════════════════════════════════════════════════════════════════
# INSTANCE HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

validate_instance_id() {
    local id="$1"
    # Must be alphanumeric + dash/underscore only (safe for filenames + systemd units)
    if [[ ! "$id" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        error_msg "Invalid instance ID: must be alphanumeric with dashes/underscores only"
        return 1
    fi
    return 0
}

get_instance_printer_data() {
    local id="$1"
    if [[ "$id" == "default" ]]; then
        echo "${HOME}/printer_data"
    else
        echo "${HOME}/printer_data-${id}"
    fi
}

get_instance_klipper_service() {
    local id="$1"
    if [[ "$id" == "default" ]]; then
        echo "klipper"
    else
        echo "klipper-${id}"
    fi
}

get_instance_moonraker_service() {
    local id="$1"
    if [[ "$id" == "default" ]]; then
        echo "moonraker"
    else
        echo "moonraker-${id}"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# ACTIONS
# ═══════════════════════════════════════════════════════════════════════════════

do_create_instance() {
    local instance_id="$1"
    local moonraker_port="$2"
    local webui_kind="$3"      # "mainsail" or "fluidd"
    local webui_port="$4"

    if [[ -z "$instance_id" ]] || [[ -z "$moonraker_port" ]] || [[ -z "$webui_kind" ]] || [[ -z "$webui_port" ]]; then
        error_msg "Usage: $0 create <instance_id> <moonraker_port> <webui> <webui_port>"
        error_msg "Example: $0 create vzbot1 7125 mainsail 80"
        return 1
    fi

    validate_instance_id "$instance_id" || return 1

    local printer_data_path
    printer_data_path="$(get_instance_printer_data "$instance_id")"
    local klipper_service
    klipper_service="$(get_instance_klipper_service "$instance_id")"
    local moonraker_service
    moonraker_service="$(get_instance_moonraker_service "$instance_id")"

    clear_screen
    print_header "Creating Klipper Instance: ${instance_id}"
    echo ""
    echo "  printer_data:     ${printer_data_path}"
    echo "  klipper service:  ${klipper_service}"
    echo "  moonraker service: ${moonraker_service}"
    echo "  moonraker port:   ${moonraker_port}"
    echo "  web UI:           ${webui_kind} on port ${webui_port}"
    echo ""
    print_footer
    echo ""

    if ! confirm "Create this instance?"; then
        return 1
    fi

    echo ""

    # Preflight checks
    check_not_root || return 1
    check_sudo_access || return 1

    # Ensure Klipper and Moonraker are installed (shared)
    if ! is_klipper_installed; then
        error_msg "Klipper not installed. Install Klipper first."
        return 1
    fi
    if ! is_moonraker_installed; then
        error_msg "Moonraker not installed. Install Moonraker first."
        return 1
    fi

    # Check if web UI is installed
    if [[ "$webui_kind" == "mainsail" ]] && ! is_mainsail_installed; then
        error_msg "Mainsail not installed. Install Mainsail first."
        return 1
    fi
    if [[ "$webui_kind" == "fluidd" ]] && ! is_fluidd_installed; then
        error_msg "Fluidd not installed. Install Fluidd first."
        return 1
    fi

    # 1. Create printer_data directory structure
    create_printer_data_dirs_for_instance "$printer_data_path" || return 1

    # 2. Create instance-specific moonraker.conf
    create_moonraker_conf_for_instance "$printer_data_path" "$moonraker_port" || return 1

    # 3. Create Klipper service
    local klipper_template="${SERVICE_TEMPLATES}/klipper.service"
    export PRINTER_DATA="$printer_data_path"
    create_systemd_service_for_instance "$klipper_service" "$klipper_template" "$printer_data_path" || return 1

    # 4. Create Moonraker service
    local moonraker_template="${SERVICE_TEMPLATES}/moonraker.service"
    create_systemd_service_for_instance "$moonraker_service" "$moonraker_template" "$printer_data_path" || return 1

    # 5. Enable services
    enable_service "${klipper_service}" || true
    enable_service "${moonraker_service}" || return 1

    # 6. Setup nginx for web UI
    local site_name="${webui_kind}-${instance_id}"
    if [[ "$instance_id" == "default" ]]; then
        site_name="$webui_kind"
    fi
    export MOONRAKER_PORT="$moonraker_port"
    setup_nginx_for_instance "$webui_kind" "$site_name" "$webui_port" "$moonraker_port" || return 1

    echo ""
    ok_msg "Instance '${instance_id}' created successfully!"
    echo ""
    echo "  Services:  ${klipper_service}.service, ${moonraker_service}.service"
    echo "  Web UI:    http://localhost:${webui_port}"
    echo "  Config:    ${printer_data_path}/config/"
    echo ""
    echo "Run the wizard with:  ./scripts/configure.sh --instance ${instance_id}"
    echo ""
    wait_for_key
    return 0
}

do_list_instances() {
    clear_screen
    print_header "Klipper Instances"
    echo ""

    # Find all printer_data-* directories
    local instances=()

    # Default instance
    if [[ -d "${HOME}/printer_data" ]]; then
        instances+=("default")
    fi

    # Additional instances
    for dir in "${HOME}"/printer_data-*; do
        if [[ -d "$dir" ]]; then
            local id
            id="$(basename "$dir" | sed 's/^printer_data-//')"
            instances+=("$id")
        fi
    done

    if [[ ${#instances[@]} -eq 0 ]]; then
        warn_msg "No instances found"
        echo ""
        echo "  Create an instance with:"
        echo "    $0 create <instance_id> <moonraker_port> <webui> <webui_port>"
        echo ""
        wait_for_key
        return 0
    fi

    printf "%-15s %-20s %-20s %-10s %-10s\n" "INSTANCE" "KLIPPER SERVICE" "MOONRAKER SERVICE" "WEBUI" "PORT"
    printf "%s\n" "────────────────────────────────────────────────────────────────────────────"

    for id in "${instances[@]}"; do
        local printer_data
        printer_data="$(get_instance_printer_data "$id")"
        local k_svc
        k_svc="$(get_instance_klipper_service "$id")"
        local m_svc
        m_svc="$(get_instance_moonraker_service "$id")"

        # Detect web UI and port from nginx
        local webui="none"
        local webui_port="-"

        if [[ "$id" == "default" ]]; then
            for ui in mainsail fluidd; do
                if [[ -f "/etc/nginx/sites-enabled/${ui}" ]]; then
                    webui="$ui"
                    webui_port=$(grep -oP 'listen \K[0-9]+' "/etc/nginx/sites-available/${ui}" 2>/dev/null | head -1 || echo "-")
                    break
                fi
            done
        else
            for ui in mainsail fluidd; do
                local site="${ui}-${id}"
                if [[ -f "/etc/nginx/sites-enabled/${site}" ]]; then
                    webui="$ui"
                    webui_port=$(grep -oP 'listen \K[0-9]+' "/etc/nginx/sites-available/${site}" 2>/dev/null | head -1 || echo "-")
                    break
                fi
            done
        fi

        # Service status
        local k_status="-"
        local m_status="-"
        if systemctl is-active --quiet "${k_svc}" 2>/dev/null; then
            k_status="running"
        elif systemctl is-enabled --quiet "${k_svc}" 2>/dev/null; then
            k_status="stopped"
        fi
        if systemctl is-active --quiet "${m_svc}" 2>/dev/null; then
            m_status="running"
        elif systemctl is-enabled --quiet "${m_svc}" 2>/dev/null; then
            m_status="stopped"
        fi

        printf "%-15s %-20s %-20s %-10s %-10s\n" \
            "$id" \
            "${k_svc} (${k_status})" \
            "${m_svc} (${m_status})" \
            "$webui" \
            "$webui_port"
    done

    echo ""
    wait_for_key
    return 0
}

do_start_instance() {
    local instance_id="$1"

    if [[ -z "$instance_id" ]]; then
        error_msg "Usage: $0 start <instance_id>"
        return 1
    fi

    validate_instance_id "$instance_id" || return 1

    local k_svc
    k_svc="$(get_instance_klipper_service "$instance_id")"
    local m_svc
    m_svc="$(get_instance_moonraker_service "$instance_id")"

    status_msg "Starting instance '${instance_id}'..."
    sudo systemctl start "${k_svc}" || warn_msg "${k_svc} start failed"
    sudo systemctl start "${m_svc}" || warn_msg "${m_svc} start failed"

    sleep 2

    if systemctl is-active --quiet "${k_svc}" && systemctl is-active --quiet "${m_svc}"; then
        ok_msg "Instance '${instance_id}' started successfully"
        return 0
    else
        error_msg "Instance '${instance_id}' failed to start - check service status"
        return 1
    fi
}

do_stop_instance() {
    local instance_id="$1"

    if [[ -z "$instance_id" ]]; then
        error_msg "Usage: $0 stop <instance_id>"
        return 1
    fi

    validate_instance_id "$instance_id" || return 1

    local k_svc
    k_svc="$(get_instance_klipper_service "$instance_id")"
    local m_svc
    m_svc="$(get_instance_moonraker_service "$instance_id")"

    status_msg "Stopping instance '${instance_id}'..."
    sudo systemctl stop "${k_svc}" || true
    sudo systemctl stop "${m_svc}" || true

    ok_msg "Instance '${instance_id}' stopped"
    return 0
}

do_restart_instance() {
    local instance_id="$1"

    if [[ -z "$instance_id" ]]; then
        error_msg "Usage: $0 restart <instance_id>"
        return 1
    fi

    validate_instance_id "$instance_id" || return 1

    local k_svc
    k_svc="$(get_instance_klipper_service "$instance_id")"
    local m_svc
    m_svc="$(get_instance_moonraker_service "$instance_id")"

    status_msg "Restarting instance '${instance_id}'..."
    sudo systemctl restart "${k_svc}" || warn_msg "${k_svc} restart failed"
    sudo systemctl restart "${m_svc}" || warn_msg "${m_svc} restart failed"

    sleep 2

    if systemctl is-active --quiet "${k_svc}" && systemctl is-active --quiet "${m_svc}"; then
        ok_msg "Instance '${instance_id}' restarted successfully"
        return 0
    else
        error_msg "Instance '${instance_id}' failed to restart - check service status"
        return 1
    fi
}

do_remove_instance() {
    local instance_id="$1"

    if [[ -z "$instance_id" ]]; then
        error_msg "Usage: $0 remove <instance_id>"
        return 1
    fi

    # Don't allow removing the default instance with this tool
    if [[ "$instance_id" == "default" ]]; then
        error_msg "Cannot remove 'default' instance with this tool"
        error_msg "Use the component manager to remove default Klipper/Moonraker install"
        return 1
    fi

    validate_instance_id "$instance_id" || return 1

    local printer_data
    printer_data="$(get_instance_printer_data "$instance_id")"
    local k_svc
    k_svc="$(get_instance_klipper_service "$instance_id")"
    local m_svc
    m_svc="$(get_instance_moonraker_service "$instance_id")"

    clear_screen
    print_header "Remove Instance: ${instance_id}"
    echo ""
    echo "  This will:"
    echo "  - Stop and disable services: ${k_svc}, ${m_svc}"
    echo "  - Remove systemd unit files"
    echo "  - Remove nginx sites"
    echo "  - OPTIONALLY delete: ${printer_data}"
    echo ""
    print_footer
    echo ""

    if ! confirm "Remove instance '${instance_id}'? (Type 'yes' to confirm)"; then
        return 1
    fi

    echo ""

    # 1. Stop and disable services
    status_msg "Stopping services..."
    sudo systemctl stop "${k_svc}" 2>/dev/null || true
    sudo systemctl stop "${m_svc}" 2>/dev/null || true
    sudo systemctl disable "${k_svc}" 2>/dev/null || true
    sudo systemctl disable "${m_svc}" 2>/dev/null || true

    # 2. Remove systemd unit files
    status_msg "Removing systemd units..."
    sudo rm -f "${SYSTEMD_DIR}/${k_svc}.service"
    sudo rm -f "${SYSTEMD_DIR}/${m_svc}.service"
    sudo systemctl daemon-reload

    # 3. Remove nginx sites
    status_msg "Removing nginx sites..."
    for ui in mainsail fluidd; do
        local site="${ui}-${instance_id}"
        sudo rm -f "/etc/nginx/sites-enabled/${site}" 2>/dev/null || true
        sudo rm -f "/etc/nginx/sites-available/${site}" 2>/dev/null || true
    done

    # Test and reload nginx
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx 2>/dev/null || true
    fi

    # 4. Optionally delete printer_data directory
    if [[ -d "$printer_data" ]]; then
        echo ""
        if confirm "Delete printer_data directory at ${printer_data}? (configs + logs + gcodes)"; then
            status_msg "Deleting ${printer_data}..."
            rm -rf "$printer_data"
            ok_msg "Deleted ${printer_data}"
        else
            warn_msg "Kept ${printer_data} (manual cleanup required)"
        fi
    fi

    echo ""
    ok_msg "Instance '${instance_id}' removed"
    echo ""
    wait_for_key
    return 0
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

case "$ACTION" in
    create)
        MOONRAKER_PORT="${3:-}"
        WEBUI_KIND="${4:-}"
        WEBUI_PORT="${5:-}"
        do_create_instance "$INSTANCE_ID" "$MOONRAKER_PORT" "$WEBUI_KIND" "$WEBUI_PORT"
        ;;
    list)
        do_list_instances
        ;;
    start)
        do_start_instance "$INSTANCE_ID"
        ;;
    stop)
        do_stop_instance "$INSTANCE_ID"
        ;;
    restart)
        do_restart_instance "$INSTANCE_ID"
        ;;
    remove)
        do_remove_instance "$INSTANCE_ID"
        ;;
    *)
        echo "gschpoozi Multi-Instance Manager" >&2
        echo "" >&2
        echo "Usage:" >&2
        echo "  $0 create <instance_id> <moonraker_port> <webui> <webui_port>" >&2
        echo "  $0 list" >&2
        echo "  $0 start <instance_id>" >&2
        echo "  $0 stop <instance_id>" >&2
        echo "  $0 restart <instance_id>" >&2
        echo "  $0 remove <instance_id>" >&2
        echo "" >&2
        echo "Examples:" >&2
        echo "  $0 create vzbot1 7125 mainsail 80" >&2
        echo "  $0 create vzbot2 7126 mainsail 81" >&2
        echo "  $0 list" >&2
        echo "  $0 start vzbot1" >&2
        echo "  $0 stop vzbot2" >&2
        echo "  $0 restart vzbot1" >&2
        echo "  $0 remove vzbot2" >&2
        echo "" >&2
        exit 1
        ;;
esac
