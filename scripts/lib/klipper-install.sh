#!/bin/bash
#
# gschpoozi Klipper Installation Library
# KIAUH-style installation routines for Klipper ecosystem
#
# This file is sourced by configure.sh
#

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

# Repository URLs
KLIPPER_REPO="https://github.com/Klipper3d/klipper.git"
MOONRAKER_REPO="https://github.com/Arksine/moonraker.git"
MAINSAIL_REPO="https://github.com/mainsail-crew/mainsail"
FLUIDD_REPO="https://github.com/fluidd-core/fluidd"
CROWSNEST_REPO="https://github.com/mainsail-crew/crowsnest.git"
SONAR_REPO="https://github.com/mainsail-crew/sonar.git"

# Installation paths
KLIPPER_DIR="${HOME}/klipper"
MOONRAKER_DIR="${HOME}/moonraker"
MAINSAIL_DIR="${HOME}/mainsail"
FLUIDD_DIR="${HOME}/fluidd"
CROWSNEST_DIR="${HOME}/crowsnest"
SONAR_DIR="${HOME}/sonar"

KLIPPY_ENV="${HOME}/klippy-env"
MOONRAKER_ENV="${HOME}/moonraker-env"

PRINTER_DATA="${HOME}/printer_data"
SYSTEMD_DIR="/etc/systemd/system"

# Template paths (set by configure.sh)
INSTALL_LIB_DIR="${INSTALL_LIB_DIR:-$(dirname "${BASH_SOURCE[0]}")}"
SERVICE_TEMPLATES="${INSTALL_LIB_DIR}/service-templates"
NGINX_TEMPLATES="${INSTALL_LIB_DIR}/nginx-templates"

# ═══════════════════════════════════════════════════════════════════════════════
# DEPENDENCY DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Klipper dependencies
KLIPPER_DEPS=(
    git
    virtualenv
    python3-dev
    python3-venv
    libffi-dev
    build-essential
    libncurses-dev
    libusb-dev
    stm32flash
    libnewlib-arm-none-eabi
    gcc-arm-none-eabi
    binutils-arm-none-eabi
    libusb-1.0-0
    libusb-1.0-0-dev
    pkg-config
    dfu-util
)

# Moonraker dependencies
MOONRAKER_DEPS=(
    python3-virtualenv
    python3-dev
    libopenjp2-7
    python3-libgpiod
    curl
    libcurl4-openssl-dev
    libssl-dev
    liblmdb-dev
    libsodium-dev
    zlib1g-dev
    libjpeg-dev
    packagekit
    wireless-tools
    iw
)

# Web interface dependencies
WEBUI_DEPS=(
    nginx
)

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Print status message
status_msg() {
    echo -e "${CYAN}###### $1${NC}"
}

# Print success message
ok_msg() {
    echo -e "${GREEN}[OK] $1${NC}"
}

# Print error message
error_msg() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Print warning message
warn_msg() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Check if running as root (we don't want that)
check_not_root() {
    if [[ $(id -u) -eq 0 ]]; then
        error_msg "This script should NOT be run as root!"
        error_msg "Please run as your normal user (the script will use sudo when needed)."
        return 1
    fi
    return 0
}

# Check if user has sudo access
check_sudo_access() {
    if ! sudo -v 2>/dev/null; then
        error_msg "This script requires sudo access."
        error_msg "Please ensure your user has sudo privileges."
        return 1
    fi
    return 0
}

# Install apt packages
install_packages() {
    local packages=("$@")
    
    status_msg "Updating package lists..."
    sudo apt-get update
    
    status_msg "Installing packages: ${packages[*]}"
    sudo apt-get install -y "${packages[@]}"
    
    if [[ $? -eq 0 ]]; then
        ok_msg "Packages installed successfully"
        return 0
    else
        error_msg "Failed to install some packages"
        return 1
    fi
}

# Clone a git repository
clone_repo() {
    local repo_url="$1"
    local target_dir="$2"
    local branch="${3:-}"
    
    if [[ -d "$target_dir" ]]; then
        warn_msg "Directory $target_dir already exists"
        if [[ -d "$target_dir/.git" ]]; then
            status_msg "Updating existing repository..."
            cd "$target_dir" && git pull
            return $?
        else
            error_msg "Directory exists but is not a git repository"
            return 1
        fi
    fi
    
    status_msg "Cloning $repo_url to $target_dir..."
    if [[ -n "$branch" ]]; then
        git clone -b "$branch" "$repo_url" "$target_dir"
    else
        git clone "$repo_url" "$target_dir"
    fi
    
    return $?
}

# Create Python virtual environment
create_virtualenv() {
    local venv_path="$1"
    local python_version="${2:-python3}"
    
    if [[ -d "$venv_path" ]]; then
        warn_msg "Virtual environment already exists at $venv_path"
        return 0
    fi
    
    status_msg "Creating virtual environment at $venv_path..."
    "$python_version" -m venv "$venv_path"
    
    if [[ $? -eq 0 ]]; then
        ok_msg "Virtual environment created"
        return 0
    else
        error_msg "Failed to create virtual environment"
        return 1
    fi
}

# Install pip requirements
install_pip_requirements() {
    local venv_path="$1"
    local requirements_file="$2"
    
    if [[ ! -f "$requirements_file" ]]; then
        error_msg "Requirements file not found: $requirements_file"
        return 1
    fi
    
    status_msg "Installing Python requirements from $requirements_file..."
    "${venv_path}/bin/pip" install --upgrade pip
    "${venv_path}/bin/pip" install -r "$requirements_file"
    
    return $?
}

# Create systemd service from template
create_systemd_service() {
    local service_name="$1"
    local template_file="$2"
    
    if [[ ! -f "$template_file" ]]; then
        error_msg "Service template not found: $template_file"
        return 1
    fi
    
    local service_file="${SYSTEMD_DIR}/${service_name}.service"
    
    status_msg "Creating systemd service: $service_name"
    
    # Replace placeholders in template
    local temp_file=$(mktemp)
    sed -e "s|%USER%|${USER}|g" \
        -e "s|%HOME%|${HOME}|g" \
        "$template_file" > "$temp_file"
    
    sudo cp "$temp_file" "$service_file"
    rm "$temp_file"
    
    sudo systemctl daemon-reload
    
    ok_msg "Service file created: $service_file"
    return 0
}

# Enable and start a systemd service
enable_service() {
    local service_name="$1"
    
    status_msg "Enabling and starting $service_name..."
    sudo systemctl enable "$service_name"
    sudo systemctl start "$service_name"
    
    # Check if service started successfully
    sleep 2
    if systemctl is-active --quiet "$service_name"; then
        ok_msg "$service_name is running"
        return 0
    else
        error_msg "$service_name failed to start"
        return 1
    fi
}

# Create printer_data directory structure
create_printer_data_dirs() {
    status_msg "Creating printer_data directory structure..."
    
    mkdir -p "${PRINTER_DATA}/config"
    mkdir -p "${PRINTER_DATA}/gcodes"
    mkdir -p "${PRINTER_DATA}/logs"
    mkdir -p "${PRINTER_DATA}/systemd"
    mkdir -p "${PRINTER_DATA}/comms"
    
    ok_msg "Directory structure created at ${PRINTER_DATA}"
    return 0
}

# Create Klipper environment file
create_klipper_env() {
    local env_file="${PRINTER_DATA}/systemd/klipper.env"
    
    if [[ -f "$env_file" ]]; then
        warn_msg "Klipper env file already exists"
        return 0
    fi
    
    status_msg "Creating Klipper environment file..."
    cat > "$env_file" << EOF
KLIPPER_ARGS="${PRINTER_DATA}/config/printer.cfg -l ${PRINTER_DATA}/logs/klippy.log -I ${PRINTER_DATA}/comms/klippy.serial -a ${PRINTER_DATA}/comms/klippy.sock"
EOF
    
    ok_msg "Created $env_file"
    return 0
}

# Create Moonraker environment file
create_moonraker_env() {
    local env_file="${PRINTER_DATA}/systemd/moonraker.env"
    
    if [[ -f "$env_file" ]]; then
        warn_msg "Moonraker env file already exists"
        return 0
    fi
    
    status_msg "Creating Moonraker environment file..."
    cat > "$env_file" << EOF
MOONRAKER_ARGS="-d ${PRINTER_DATA}"
EOF
    
    ok_msg "Created $env_file"
    return 0
}

# Create basic moonraker.conf
create_moonraker_conf() {
    local conf_file="${PRINTER_DATA}/config/moonraker.conf"
    
    if [[ -f "$conf_file" ]]; then
        warn_msg "moonraker.conf already exists"
        return 0
    fi
    
    status_msg "Creating moonraker.conf..."
    cat > "$conf_file" << 'EOF'
# Moonraker Configuration
# Generated by gschpoozi

[server]
host: 0.0.0.0
port: 7125
klippy_uds_address: ~/printer_data/comms/klippy.sock

[authorization]
trusted_clients:
    10.0.0.0/8
    127.0.0.0/8
    169.254.0.0/16
    172.16.0.0/12
    192.168.0.0/16
    FE80::/10
    ::1/128
cors_domains:
    *.lan
    *.local
    *://localhost
    *://localhost:*
    *://my.mainsail.xyz
    *://app.fluidd.xyz

[octoprint_compat]

[history]

[file_manager]
enable_object_processing: True

[machine]
provider: systemd_dbus
EOF
    
    ok_msg "Created $conf_file"
    return 0
}

# Create basic printer.cfg if it doesn't exist
create_basic_printer_cfg() {
    local conf_file="${PRINTER_DATA}/config/printer.cfg"
    
    if [[ -f "$conf_file" ]]; then
        warn_msg "printer.cfg already exists"
        return 0
    fi
    
    status_msg "Creating basic printer.cfg..."
    cat > "$conf_file" << 'EOF'
# Klipper Configuration
# Generated by gschpoozi
# 
# This is a placeholder configuration.
# Use the gschpoozi wizard to generate your full configuration.

[virtual_sdcard]
path: ~/printer_data/gcodes

[display_status]

[pause_resume]

# Add your MCU configuration below
# [mcu]
# serial: /dev/serial/by-id/usb-xxx
EOF
    
    ok_msg "Created basic $conf_file"
    return 0
}

# Add user to required groups
add_user_to_groups() {
    status_msg "Adding user to required groups..."
    
    local groups=("tty" "dialout")
    local needs_relogin=false
    
    for group in "${groups[@]}"; do
        if ! groups "$USER" | grep -q "\b${group}\b"; then
            sudo usermod -a -G "$group" "$USER"
            ok_msg "Added $USER to group: $group"
            needs_relogin=true
        else
            ok_msg "User already in group: $group"
        fi
    done
    
    if [[ "$needs_relogin" == "true" ]]; then
        warn_msg "You may need to log out and back in for group changes to take effect"
    fi
    
    return 0
}

# Get latest GitHub release download URL
get_latest_release_url() {
    local repo="$1"  # e.g., "mainsail-crew/mainsail"
    local asset_name="${2:-}"  # e.g., "mainsail.zip"
    
    local api_url="https://api.github.com/repos/${repo}/releases/latest"
    
    if [[ -n "$asset_name" ]]; then
        curl -s "$api_url" | grep "browser_download_url.*${asset_name}" | head -1 | cut -d '"' -f 4
    else
        curl -s "$api_url" | grep "browser_download_url.*\.zip" | head -1 | cut -d '"' -f 4
    fi
}

# Download and extract a release
download_and_extract() {
    local url="$1"
    local target_dir="$2"
    
    if [[ -z "$url" ]]; then
        error_msg "No download URL provided"
        return 1
    fi
    
    status_msg "Downloading from $url..."
    
    local temp_file=$(mktemp)
    curl -L -o "$temp_file" "$url"
    
    if [[ $? -ne 0 ]]; then
        error_msg "Download failed"
        rm -f "$temp_file"
        return 1
    fi
    
    # Create target directory
    mkdir -p "$target_dir"
    
    status_msg "Extracting to $target_dir..."
    unzip -o "$temp_file" -d "$target_dir"
    
    local result=$?
    rm -f "$temp_file"
    
    return $result
}

# Setup nginx for web UI
setup_nginx() {
    local ui_name="$1"  # mainsail or fluidd
    local template_file="${NGINX_TEMPLATES}/${ui_name}.conf"
    local common_vars="${NGINX_TEMPLATES}/common_vars.conf"
    
    if [[ ! -f "$template_file" ]]; then
        error_msg "Nginx template not found: $template_file"
        return 1
    fi
    
    status_msg "Configuring nginx for $ui_name..."
    
    # Install common_vars if not present
    if [[ ! -f "/etc/nginx/conf.d/common_vars.conf" ]]; then
        sudo cp "$common_vars" /etc/nginx/conf.d/
    fi
    
    # Create site config with HOME path replaced
    local temp_file=$(mktemp)
    sed "s|%HOME%|${HOME}|g" "$template_file" > "$temp_file"
    
    # Remove default nginx site if exists
    if [[ -f "/etc/nginx/sites-enabled/default" ]]; then
        sudo rm /etc/nginx/sites-enabled/default
    fi
    
    # Install new site config
    sudo cp "$temp_file" "/etc/nginx/sites-available/${ui_name}"
    rm "$temp_file"
    
    # Enable site
    if [[ ! -L "/etc/nginx/sites-enabled/${ui_name}" ]]; then
        sudo ln -s "/etc/nginx/sites-available/${ui_name}" "/etc/nginx/sites-enabled/${ui_name}"
    fi
    
    # Test and restart nginx
    if sudo nginx -t; then
        sudo systemctl restart nginx
        ok_msg "Nginx configured for $ui_name"
        return 0
    else
        error_msg "Nginx configuration test failed"
        return 1
    fi
}

# Add update manager entry to moonraker.conf
add_update_manager_entry() {
    local name="$1"
    local type="$2"
    local path="$3"
    local extra="${4:-}"
    
    local conf_file="${PRINTER_DATA}/config/moonraker.conf"
    
    if ! grep -q "\[update_manager ${name}\]" "$conf_file" 2>/dev/null; then
        status_msg "Adding update_manager entry for $name..."
        
        cat >> "$conf_file" << EOF

[update_manager ${name}]
type: ${type}
path: ${path}
${extra}
EOF
        ok_msg "Added update_manager entry for $name"
    else
        warn_msg "Update manager entry for $name already exists"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN INSTALLATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Install Klipper
do_install_klipper() {
    clear_screen
    print_header "Installing Klipper"
    
    echo -e "${BCYAN}${BOX_V}${NC}"
    echo -e "${BCYAN}${BOX_V}${NC}  This will install:"
    echo -e "${BCYAN}${BOX_V}${NC}  - Klipper 3D printer firmware"
    echo -e "${BCYAN}${BOX_V}${NC}  - Python virtual environment (klippy-env)"
    echo -e "${BCYAN}${BOX_V}${NC}  - Systemd service"
    echo -e "${BCYAN}${BOX_V}${NC}"
    print_footer
    
    if ! confirm "Proceed with Klipper installation?"; then
        return 1
    fi
    
    echo ""
    
    # Preflight checks
    check_not_root || return 1
    check_sudo_access || return 1
    
    # Install dependencies
    install_packages "${KLIPPER_DEPS[@]}" || return 1
    
    # Clone repository
    clone_repo "$KLIPPER_REPO" "$KLIPPER_DIR" || return 1
    
    # Create virtual environment
    create_virtualenv "$KLIPPY_ENV" || return 1
    
    # Install Python requirements
    install_pip_requirements "$KLIPPY_ENV" "${KLIPPER_DIR}/scripts/klippy-requirements.txt" || return 1
    
    # Create printer_data directories
    create_printer_data_dirs
    
    # Create environment file
    create_klipper_env
    
    # Create basic printer.cfg
    create_basic_printer_cfg
    
    # Create and enable service
    create_systemd_service "klipper" "${SERVICE_TEMPLATES}/klipper.service" || return 1
    enable_service "klipper"
    
    # Add user to groups
    add_user_to_groups
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Klipper installation complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Config directory: ${CYAN}${PRINTER_DATA}/config${NC}"
    echo -e "  Log file: ${CYAN}${PRINTER_DATA}/logs/klippy.log${NC}"
    echo ""
    
    wait_for_key
    return 0
}

# Install Moonraker
do_install_moonraker() {
    clear_screen
    print_header "Installing Moonraker"
    
    echo -e "${BCYAN}${BOX_V}${NC}"
    echo -e "${BCYAN}${BOX_V}${NC}  This will install:"
    echo -e "${BCYAN}${BOX_V}${NC}  - Moonraker API server"
    echo -e "${BCYAN}${BOX_V}${NC}  - Python virtual environment (moonraker-env)"
    echo -e "${BCYAN}${BOX_V}${NC}  - Systemd service"
    echo -e "${BCYAN}${BOX_V}${NC}"
    
    if ! is_klipper_installed; then
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Warning: Klipper is not installed.${NC}"
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Moonraker requires Klipper to function.${NC}"
    fi
    echo -e "${BCYAN}${BOX_V}${NC}"
    print_footer
    
    if ! confirm "Proceed with Moonraker installation?"; then
        return 1
    fi
    
    echo ""
    
    # Preflight checks
    check_not_root || return 1
    check_sudo_access || return 1
    
    # Install dependencies
    install_packages "${MOONRAKER_DEPS[@]}" || return 1
    
    # Clone repository
    clone_repo "$MOONRAKER_REPO" "$MOONRAKER_DIR" || return 1
    
    # Create virtual environment
    create_virtualenv "$MOONRAKER_ENV" || return 1
    
    # Install Python requirements
    install_pip_requirements "$MOONRAKER_ENV" "${MOONRAKER_DIR}/scripts/moonraker-requirements.txt" || return 1
    
    # Ensure printer_data directories exist
    create_printer_data_dirs
    
    # Create environment file
    create_moonraker_env
    
    # Create moonraker.conf
    create_moonraker_conf
    
    # Create and enable service
    create_systemd_service "moonraker" "${SERVICE_TEMPLATES}/moonraker.service" || return 1
    enable_service "moonraker"
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Moonraker installation complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  API available at: ${CYAN}http://$(hostname -I | awk '{print $1}'):7125${NC}"
    echo -e "  Config file: ${CYAN}${PRINTER_DATA}/config/moonraker.conf${NC}"
    echo ""
    
    wait_for_key
    return 0
}

# Install Mainsail
do_install_mainsail() {
    clear_screen
    print_header "Installing Mainsail"
    
    echo -e "${BCYAN}${BOX_V}${NC}"
    echo -e "${BCYAN}${BOX_V}${NC}  This will install:"
    echo -e "${BCYAN}${BOX_V}${NC}  - Mainsail web interface"
    echo -e "${BCYAN}${BOX_V}${NC}  - Nginx web server"
    echo -e "${BCYAN}${BOX_V}${NC}"
    
    if ! is_moonraker_installed; then
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Warning: Moonraker is not installed.${NC}"
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Mainsail requires Moonraker to function.${NC}"
    fi
    
    if is_fluidd_installed; then
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Note: Fluidd is already installed.${NC}"
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Installing Mainsail will reconfigure nginx.${NC}"
    fi
    echo -e "${BCYAN}${BOX_V}${NC}"
    print_footer
    
    if ! confirm "Proceed with Mainsail installation?"; then
        return 1
    fi
    
    echo ""
    
    # Preflight checks
    check_not_root || return 1
    check_sudo_access || return 1
    
    # Install nginx
    install_packages "${WEBUI_DEPS[@]}" || return 1
    
    # Also need unzip for extraction
    install_packages "unzip" || return 1
    
    # Get latest release URL
    status_msg "Fetching latest Mainsail release..."
    local download_url=$(get_latest_release_url "mainsail-crew/mainsail" "mainsail.zip")
    
    if [[ -z "$download_url" ]]; then
        error_msg "Could not find Mainsail release"
        wait_for_key
        return 1
    fi
    
    # Download and extract
    download_and_extract "$download_url" "$MAINSAIL_DIR" || return 1
    
    # Setup nginx
    setup_nginx "mainsail" || return 1
    
    # Add update manager entry
    if is_moonraker_installed; then
        add_update_manager_entry "mainsail" "web" "${MAINSAIL_DIR}" "repo: mainsail-crew/mainsail"
    fi
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Mainsail installation complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Access at: ${CYAN}http://$(hostname -I | awk '{print $1}')${NC}"
    echo ""
    
    wait_for_key
    return 0
}

# Install Fluidd
do_install_fluidd() {
    clear_screen
    print_header "Installing Fluidd"
    
    echo -e "${BCYAN}${BOX_V}${NC}"
    echo -e "${BCYAN}${BOX_V}${NC}  This will install:"
    echo -e "${BCYAN}${BOX_V}${NC}  - Fluidd web interface"
    echo -e "${BCYAN}${BOX_V}${NC}  - Nginx web server"
    echo -e "${BCYAN}${BOX_V}${NC}"
    
    if ! is_moonraker_installed; then
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Warning: Moonraker is not installed.${NC}"
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Fluidd requires Moonraker to function.${NC}"
    fi
    
    if is_mainsail_installed; then
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Note: Mainsail is already installed.${NC}"
        echo -e "${BCYAN}${BOX_V}${NC}  ${YELLOW}Installing Fluidd will reconfigure nginx.${NC}"
    fi
    echo -e "${BCYAN}${BOX_V}${NC}"
    print_footer
    
    if ! confirm "Proceed with Fluidd installation?"; then
        return 1
    fi
    
    echo ""
    
    # Preflight checks
    check_not_root || return 1
    check_sudo_access || return 1
    
    # Install nginx
    install_packages "${WEBUI_DEPS[@]}" || return 1
    
    # Also need unzip for extraction
    install_packages "unzip" || return 1
    
    # Get latest release URL
    status_msg "Fetching latest Fluidd release..."
    local download_url=$(get_latest_release_url "fluidd-core/fluidd" "fluidd.zip")
    
    if [[ -z "$download_url" ]]; then
        error_msg "Could not find Fluidd release"
        wait_for_key
        return 1
    fi
    
    # Download and extract
    download_and_extract "$download_url" "$FLUIDD_DIR" || return 1
    
    # Setup nginx
    setup_nginx "fluidd" || return 1
    
    # Add update manager entry
    if is_moonraker_installed; then
        add_update_manager_entry "fluidd" "web" "${FLUIDD_DIR}" "repo: fluidd-core/fluidd"
    fi
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Fluidd installation complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Access at: ${CYAN}http://$(hostname -I | awk '{print $1}')${NC}"
    echo ""
    
    wait_for_key
    return 0
}

# Install Crowsnest
do_install_crowsnest() {
    clear_screen
    print_header "Installing Crowsnest"
    
    echo -e "${BCYAN}${BOX_V}${NC}"
    echo -e "${BCYAN}${BOX_V}${NC}  This will install:"
    echo -e "${BCYAN}${BOX_V}${NC}  - Crowsnest webcam streamer"
    echo -e "${BCYAN}${BOX_V}${NC}  - Camera streaming support for Mainsail/Fluidd"
    echo -e "${BCYAN}${BOX_V}${NC}"
    print_footer
    
    if ! confirm "Proceed with Crowsnest installation?"; then
        return 1
    fi
    
    echo ""
    
    # Preflight checks
    check_not_root || return 1
    check_sudo_access || return 1
    
    # Clone repository
    clone_repo "$CROWSNEST_REPO" "$CROWSNEST_DIR" || return 1
    
    # Run Crowsnest's own installer
    status_msg "Running Crowsnest installer..."
    cd "$CROWSNEST_DIR"
    
    if [[ -f "tools/install.sh" ]]; then
        # Run in non-interactive mode
        sudo make install
    else
        error_msg "Crowsnest installer not found"
        wait_for_key
        return 1
    fi
    
    # Add update manager entry
    if is_moonraker_installed; then
        add_update_manager_entry "crowsnest" "git_repo" "${CROWSNEST_DIR}" "origin: https://github.com/mainsail-crew/crowsnest.git
managed_services: crowsnest"
    fi
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Crowsnest installation complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Config file: ${CYAN}${PRINTER_DATA}/config/crowsnest.conf${NC}"
    echo -e "  Edit this file to configure your webcam(s)"
    echo ""
    
    wait_for_key
    return 0
}

# Install Sonar
do_install_sonar() {
    clear_screen
    print_header "Installing Sonar"
    
    echo -e "${BCYAN}${BOX_V}${NC}"
    echo -e "${BCYAN}${BOX_V}${NC}  This will install:"
    echo -e "${BCYAN}${BOX_V}${NC}  - Sonar network keepalive service"
    echo -e "${BCYAN}${BOX_V}${NC}  - Prevents WiFi from sleeping during prints"
    echo -e "${BCYAN}${BOX_V}${NC}"
    print_footer
    
    if ! confirm "Proceed with Sonar installation?"; then
        return 1
    fi
    
    echo ""
    
    # Preflight checks
    check_not_root || return 1
    check_sudo_access || return 1
    
    # Clone repository
    clone_repo "$SONAR_REPO" "$SONAR_DIR" || return 1
    
    # Run Sonar's own installer
    status_msg "Running Sonar installer..."
    cd "$SONAR_DIR"
    
    if [[ -f "tools/install.sh" ]]; then
        # Run installer
        bash tools/install.sh
    else
        error_msg "Sonar installer not found"
        wait_for_key
        return 1
    fi
    
    # Add update manager entry
    if is_moonraker_installed; then
        add_update_manager_entry "sonar" "git_repo" "${SONAR_DIR}" "origin: https://github.com/mainsail-crew/sonar.git
managed_services: sonar"
    fi
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Sonar installation complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Config file: ${CYAN}${PRINTER_DATA}/config/sonar.conf${NC}"
    echo ""
    
    wait_for_key
    return 0
}

