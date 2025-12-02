#!/usr/bin/env bash
# =============================================================================
# Claude Usage Dashboard - Tunnel Setup Script
# Setup Tailscale or Cloudflare Tunnel for remote access
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${CYAN}${BOLD}========================================${NC}"
    echo -e "${CYAN}${BOLD}  Claude Dashboard - Tunnel Setup${NC}"
    echo -e "${CYAN}${BOLD}========================================${NC}"
    echo ""
}

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

detect_os() {
    case "$OSTYPE" in
        darwin*)
            echo "macos"
            ;;
        linux*)
            if [ -f /etc/debian_version ]; then
                echo "debian"
            elif [ -f /etc/redhat-release ]; then
                echo "redhat"
            else
                echo "linux"
            fi
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

check_brew() {
    if ! command -v brew &> /dev/null; then
        log_error "Homebrew is not installed"
        echo "Install it from: https://brew.sh"
        return 1
    fi
    return 0
}

# -----------------------------------------------------------------------------
# Tailscale Setup
# -----------------------------------------------------------------------------

install_tailscale() {
    local os
    os=$(detect_os)

    log_info "Installing Tailscale..."

    case "$os" in
        macos)
            if check_brew; then
                brew install tailscale
            else
                log_error "Please install Homebrew first or download Tailscale from https://tailscale.com/download"
                return 1
            fi
            ;;
        debian)
            curl -fsSL https://tailscale.com/install.sh | sh
            ;;
        redhat)
            curl -fsSL https://tailscale.com/install.sh | sh
            ;;
        *)
            log_error "Unsupported OS: $os"
            echo "Please install Tailscale manually: https://tailscale.com/download"
            return 1
            ;;
    esac

    log_success "Tailscale installed successfully"
}

setup_tailscale() {
    echo ""
    echo -e "${BOLD}Tailscale Setup${NC}"
    echo "==============="
    echo ""

    # Check if already installed
    if command -v tailscale &> /dev/null; then
        log_info "Tailscale is already installed"
        local status
        status=$(tailscale status 2>/dev/null || echo "not running")

        if echo "$status" | grep -q "not running\|stopped"; then
            log_warning "Tailscale is not running"
        else
            log_success "Tailscale is running"
            echo ""
            echo "Current status:"
            tailscale status
            echo ""
        fi
    else
        install_tailscale || return 1
    fi

    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo "1. Start Tailscale: ${CYAN}sudo tailscale up${NC}"
    echo "2. Authenticate in browser when prompted"
    echo "3. Note your Tailscale IP: ${CYAN}tailscale ip -4${NC}"
    echo ""
    echo -e "${BOLD}Access Dashboard:${NC}"
    echo "From any device on your Tailscale network:"
    echo "  ${CYAN}http://<tailscale-ip>${NC}"
    echo ""
    echo -e "${BOLD}Optional - Enable MagicDNS:${NC}"
    echo "In Tailscale Admin Console, enable MagicDNS to use:"
    echo "  ${CYAN}http://nuc.tailnet-name.ts.net${NC}"
    echo ""
}

# -----------------------------------------------------------------------------
# Cloudflare Tunnel Setup
# -----------------------------------------------------------------------------

install_cloudflared() {
    local os
    os=$(detect_os)

    log_info "Installing cloudflared..."

    case "$os" in
        macos)
            if check_brew; then
                brew install cloudflared
            else
                return 1
            fi
            ;;
        debian)
            curl -L --output cloudflared.deb \
                https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
            sudo dpkg -i cloudflared.deb
            rm cloudflared.deb
            ;;
        redhat)
            curl -L --output cloudflared.rpm \
                https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
            sudo rpm -i cloudflared.rpm
            rm cloudflared.rpm
            ;;
        *)
            log_error "Unsupported OS: $os"
            return 1
            ;;
    esac

    log_success "cloudflared installed successfully"
}

setup_cloudflare() {
    echo ""
    echo -e "${BOLD}Cloudflare Tunnel Setup${NC}"
    echo "========================"
    echo ""

    # Check if already installed
    if ! command -v cloudflared &> /dev/null; then
        install_cloudflared || return 1
    else
        log_info "cloudflared is already installed"
    fi

    echo ""
    echo -e "${BOLD}Setup Steps:${NC}"
    echo ""
    echo "1. Authenticate with Cloudflare:"
    echo "   ${CYAN}cloudflared tunnel login${NC}"
    echo ""
    echo "2. Create a tunnel:"
    echo "   ${CYAN}cloudflared tunnel create claude-dashboard${NC}"
    echo ""
    echo "3. Configure the tunnel (create ~/.cloudflared/config.yml):"
    echo ""
    cat << 'EOF'
   tunnel: claude-dashboard
   credentials-file: /path/to/.cloudflared/<TUNNEL_ID>.json

   ingress:
     - hostname: claude.yourdomain.com
       service: http://localhost:80
     - service: http_status:404
EOF
    echo ""
    echo "4. Route DNS:"
    echo "   ${CYAN}cloudflared tunnel route dns claude-dashboard claude.yourdomain.com${NC}"
    echo ""
    echo "5. Run the tunnel:"
    echo "   ${CYAN}cloudflared tunnel run claude-dashboard${NC}"
    echo ""
    echo "6. (Optional) Install as service:"
    echo "   ${CYAN}sudo cloudflared service install${NC}"
    echo ""
}

# -----------------------------------------------------------------------------
# Main Menu
# -----------------------------------------------------------------------------

show_comparison() {
    echo ""
    echo -e "${BOLD}Comparison: Tailscale vs Cloudflare Tunnel${NC}"
    echo ""
    echo "┌─────────────────┬──────────────────────────────────────────────────────┐"
    echo "│ Feature         │ Tailscale              │ Cloudflare Tunnel          │"
    echo "├─────────────────┼────────────────────────┼────────────────────────────┤"
    echo "│ Access Type     │ Private VPN mesh       │ Public domain exposure     │"
    echo "│ Auth Required   │ Tailscale account      │ Cloudflare account + DNS   │"
    echo "│ Speed           │ Direct P2P (fastest)   │ Via Cloudflare edge        │"
    echo "│ Best For        │ Personal/team use      │ Public access              │"
    echo "│ Free Tier       │ 100 devices            │ Unlimited                  │"
    echo "│ Setup           │ Very easy              │ Moderate                   │"
    echo "└─────────────────┴────────────────────────┴────────────────────────────┘"
    echo ""
}

main() {
    print_header

    # Check for command line argument
    case "${1:-}" in
        tailscale|ts)
            setup_tailscale
            exit 0
            ;;
        cloudflare|cf)
            setup_cloudflare
            exit 0
            ;;
        compare)
            show_comparison
            exit 0
            ;;
        help|--help|-h)
            echo "Usage: $0 [tailscale|cloudflare|compare|help]"
            echo ""
            echo "Commands:"
            echo "  tailscale   - Setup Tailscale (recommended for personal use)"
            echo "  cloudflare  - Setup Cloudflare Tunnel (for public access)"
            echo "  compare     - Show comparison between options"
            echo "  help        - Show this help message"
            echo ""
            echo "Without arguments, shows interactive menu."
            exit 0
            ;;
    esac

    # Interactive menu
    echo "Choose your tunnel method:"
    echo ""
    echo "  [1] Tailscale (Recommended)"
    echo "      - Easy setup, private mesh VPN"
    echo "      - Access from any device on your Tailscale network"
    echo "      - Best for personal/team use"
    echo ""
    echo "  [2] Cloudflare Tunnel"
    echo "      - Expose via public domain (e.g., claude.yourdomain.com)"
    echo "      - Requires Cloudflare account and domain"
    echo "      - Best for public access with authentication"
    echo ""
    echo "  [3] Compare options"
    echo ""
    echo "  [q] Quit"
    echo ""

    read -rp "Enter choice [1-3, q]: " choice

    case $choice in
        1)
            setup_tailscale
            ;;
        2)
            setup_cloudflare
            ;;
        3)
            show_comparison
            main
            ;;
        q|Q)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            log_error "Invalid choice: $choice"
            exit 1
            ;;
    esac
}

main "$@"
