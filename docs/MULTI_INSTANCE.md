# Multi-Instance Klipper Setup

gschpoozi supports running **multiple independent Klipper instances** on a single host. This is useful for:

- **Multi-printer farms**: Control 2+ printers from one Raspberry Pi / SBC
- **Shared hardware**: VzBot twins, identical Voron builds, etc.
- **Testing/development**: Production + experimental setups side-by-side

Each instance gets its own:
- `printer_data-<id>` directory (config, logs, gcodes, comms)
- Systemd services (`klipper-<id>.service`, `moonraker-<id>.service`)
- Moonraker port (7125, 7126, 7127, ...)
- Web UI port (80, 81, 82, ...)

Instances **share** the Klipper and Moonraker installations (no duplicate source trees or venvs).

---

## Quick Start

### 1. Create Instances

From the wizard:

```bash
~/gschpoozi/scripts/configure.sh
# Main menu → "Manage Instances" → "Create new instance"
```

Or directly via the instance manager:

```bash
# Syntax: create <instance_id> <moonraker_port> <webui> <webui_port>
~/gschpoozi/scripts/tools/klipper_instance_manager.sh create vzbot1 7125 mainsail 80
~/gschpoozi/scripts/tools/klipper_instance_manager.sh create vzbot2 7126 mainsail 81
```

This will:
1. Create `~/printer_data-<id>/` with subdirectories
2. Generate instance-specific `moonraker.conf` with custom port
3. Create systemd units: `klipper-<id>.service`, `moonraker-<id>.service`
4. Configure nginx site: `mainsail-<id>` or `fluidd-<id>` on specified port
5. Enable and start services

### 2. Configure Each Instance

Run the wizard targeting a specific instance:

```bash
# Configure vzbot1
~/gschpoozi/scripts/configure.sh --instance vzbot1

# Configure vzbot2
~/gschpoozi/scripts/configure.sh --instance vzbot2
```

The `--instance` flag ensures:
- Wizard state is stored in `~/printer_data-<id>/config/.gschpoozi_state.json`
- Generated configs go to `~/printer_data-<id>/config/`
- Logs are written to `~/printer_data-<id>/config/.gschpoozi_wizard.log`

### 3. Access Web UIs

Each instance has its own web interface:

- **vzbot1**: http://your-pi-ip:80
- **vzbot2**: http://your-pi-ip:81

---

## Instance Management

### List Instances

```bash
~/gschpoozi/scripts/tools/klipper_instance_manager.sh list
```

Shows all instances with service status, web UI, and ports.

### Start/Stop/Restart

```bash
# Control specific instance
~/gschpoozi/scripts/tools/klipper_instance_manager.sh start vzbot1
~/gschpoozi/scripts/tools/klipper_instance_manager.sh stop vzbot2
~/gschpoozi/scripts/tools/klipper_instance_manager.sh restart vzbot1

# Or use systemctl directly
sudo systemctl start klipper-vzbot1 moonraker-vzbot1
sudo systemctl stop klipper-vzbot2 moonraker-vzbot2
```

### Remove Instance

```bash
~/gschpoozi/scripts/tools/klipper_instance_manager.sh remove vzbot2
```

This will:
1. Stop and disable services
2. Remove systemd unit files
3. Remove nginx sites
4. Optionally delete `printer_data-<id>` (prompts before deletion)

---

## Architecture

### Directory Structure

```
~/ (home directory)
├── klipper/                    # Shared Klipper source
├── klippy-env/                 # Shared Klipper venv
├── moonraker/                  # Shared Moonraker source
├── moonraker-env/              # Shared Moonraker venv
├── mainsail/                   # Shared Mainsail UI files
│
├── printer_data/               # Default instance
│   ├── config/
│   │   ├── printer.cfg
│   │   ├── moonraker.conf      # port: 7125
│   │   └── gschpoozi/
│   ├── logs/
│   ├── gcodes/
│   └── comms/
│
├── printer_data-vzbot1/        # Instance "vzbot1"
│   ├── config/
│   │   ├── printer.cfg
│   │   ├── moonraker.conf      # port: 7126
│   │   └── gschpoozi/
│   ├── logs/
│   ├── gcodes/
│   └── comms/
│
└── printer_data-vzbot2/        # Instance "vzbot2"
    ├── config/
    │   ├── printer.cfg
    │   ├── moonraker.conf      # port: 7127
    │   └── gschpoozi/
    ├── logs/
    ├── gcodes/
    └── comms/
```

### Systemd Services

```bash
# Default instance
klipper.service         → ~/printer_data/config/printer.cfg
moonraker.service       → -d ~/printer_data

# Instance "vzbot1"
klipper-vzbot1.service  → ~/printer_data-vzbot1/config/printer.cfg
moonraker-vzbot1.service → -d ~/printer_data-vzbot1

# Instance "vzbot2"
klipper-vzbot2.service  → ~/printer_data-vzbot2/config/printer.cfg
moonraker-vzbot2.service → -d ~/printer_data-vzbot2
```

### Nginx Sites

```bash
# Default instance
/etc/nginx/sites-enabled/mainsail → listen 80 → proxy 127.0.0.1:7125

# Instance "vzbot1"
/etc/nginx/sites-enabled/mainsail-vzbot1 → listen 81 → proxy 127.0.0.1:7126

# Instance "vzbot2"
/etc/nginx/sites-enabled/mainsail-vzbot2 → listen 82 → proxy 127.0.0.1:7127
```

---

## Port Allocation

### Moonraker Ports
- **7125**: Default instance
- **7126**: Second instance
- **7127**: Third instance
- etc.

### Web UI Ports
- **80**: Default instance (primary)
- **81**: Second instance
- **82**: Third instance
- etc.

> **Tip**: For advanced setups, you can use any available port. Just make sure each instance has unique Moonraker + web UI ports.

---

## Troubleshooting

### Service Won't Start

Check service status:
```bash
sudo systemctl status klipper-vzbot1
sudo systemctl status moonraker-vzbot1
journalctl -u klipper-vzbot1 -n 50
journalctl -u moonraker-vzbot1 -n 50
```

Common issues:
- **MCU serial path wrong**: Edit `~/printer_data-<id>/config/printer.cfg`
- **Port conflict**: Another instance or service using the same Moonraker port
- **Missing printer.cfg**: Run the wizard for that instance first

### Web UI Shows Wrong Printer

Verify nginx is proxying to the correct Moonraker port:

```bash
grep -A 5 "location.*websocket" /etc/nginx/sites-enabled/mainsail-vzbot1
```

Should show `proxy_pass http://127.0.0.1:<correct-moonraker-port>/websocket;`

### Can't Connect to Instance

Check Moonraker is listening on the right port:

```bash
ss -tlnp | grep 7126  # Replace 7126 with your instance's port
curl http://127.0.0.1:7126/server/info
```

---

## Limitations

- All instances share the same Klipper/Moonraker **code** (versions are synchronized)
- Updating Klipper restarts **all** instances simultaneously
- Each instance needs its own MCU(s) (you can't share USB/CAN devices between instances)

---

## Advanced: Manual Instance Setup

If you prefer manual control, here's what each instance needs:

### 1. Directory Structure
```bash
mkdir -p ~/printer_data-myid/{config,logs,gcodes,comms,systemd}
```

### 2. moonraker.conf
```ini
[server]
host: 0.0.0.0
port: 7126  # Unique port
klippy_uds_address: ../comms/klippy.sock
```

### 3. Systemd Units

Copy and modify the service templates:
```bash
sudo cp scripts/lib/service-templates/klipper.service /etc/systemd/system/klipper-myid.service
sudo cp scripts/lib/service-templates/moonraker.service /etc/systemd/system/moonraker-myid.service
```

Edit each to replace `%PRINTER_DATA%` with the actual path.

### 4. Nginx Site

Copy and modify nginx templates, replacing ports.

### 5. Run the Wizard

```bash
~/gschpoozi/scripts/configure.sh --instance myid
```

---

## See Also

- [Usage Manual](USAGE.md) - Full wizard feature documentation
- [Klipper Multi-Instance Guide](https://www.klipper3d.org/Config_Reference.html) - Official Klipper docs
