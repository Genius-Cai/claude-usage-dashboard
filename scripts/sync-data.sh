#!/usr/bin/env bash
# =============================================================================
# Claude Usage Dashboard - Data Sync Script
# Syncs Claude data from Mac to NUC server via rsync
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration (can be overridden via environment variables)
# -----------------------------------------------------------------------------
REMOTE_USER="${REMOTE_USER:-user}"
REMOTE_HOST="${REMOTE_HOST:-nuc.local}"
REMOTE_PATH="${REMOTE_PATH:-~/claude-data}"
LOCAL_PATH="${LOCAL_PATH:-$HOME/.claude/projects}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
SSH_PORT="${SSH_PORT:-22}"
SYNC_LOG="${SYNC_LOG:-$HOME/.claude-sync.log}"
LOCKFILE="/tmp/claude-sync.lock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}[$timestamp]${NC} $1"
    echo "[$timestamp] $1" >> "$SYNC_LOG"
}

log_error() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] ERROR:${NC} $1" >&2
    echo "[$timestamp] ERROR: $1" >> "$SYNC_LOG"
}

log_success() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp] SUCCESS:${NC} $1"
    echo "[$timestamp] SUCCESS: $1" >> "$SYNC_LOG"
}

log_warning() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] WARNING:${NC} $1"
    echo "[$timestamp] WARNING: $1" >> "$SYNC_LOG"
}

cleanup() {
    rm -f "$LOCKFILE"
}

check_dependencies() {
    local missing=()

    if ! command -v rsync &> /dev/null; then
        missing+=("rsync")
    fi

    if ! command -v ssh &> /dev/null; then
        missing+=("ssh")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing[*]}"
        exit 1
    fi
}

check_connectivity() {
    log "Checking connectivity to ${REMOTE_HOST}..."

    if ! ssh -q -o ConnectTimeout=5 -o BatchMode=yes -p "$SSH_PORT" \
         -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" exit 2>/dev/null; then
        log_error "Cannot connect to ${REMOTE_USER}@${REMOTE_HOST}"
        log_warning "Make sure SSH key is configured and host is reachable"
        return 1
    fi

    log_success "Connection to ${REMOTE_HOST} verified"
    return 0
}

# -----------------------------------------------------------------------------
# Main Sync Function
# -----------------------------------------------------------------------------

sync_data() {
    log "Starting sync: ${LOCAL_PATH} -> ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"

    # Check if local path exists
    if [ ! -d "$LOCAL_PATH" ]; then
        log_error "Local path does not exist: ${LOCAL_PATH}"
        exit 1
    fi

    # Create remote directory if it doesn't exist
    ssh -p "$SSH_PORT" -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" \
        "mkdir -p ${REMOTE_PATH}" 2>/dev/null || true

    # Perform rsync
    local rsync_opts=(
        -avz                          # Archive, verbose, compress
        --delete                      # Delete files on remote not in local
        --exclude='.DS_Store'         # Exclude Mac metadata
        --exclude='*.tmp'             # Exclude temp files
        --exclude='.git'              # Exclude git directories
        --exclude='node_modules'      # Exclude node_modules
        --exclude='__pycache__'       # Exclude Python cache
        --progress                    # Show progress
        --stats                       # Show stats at end
        -e "ssh -o ConnectTimeout=30 -o BatchMode=yes -p ${SSH_PORT} -i ${SSH_KEY}"
    )

    if rsync "${rsync_opts[@]}" "${LOCAL_PATH}/" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"; then
        log_success "Sync completed successfully"
        return 0
    else
        log_error "Sync failed with exit code $?"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Entry Point
# -----------------------------------------------------------------------------

main() {
    # Parse command line arguments
    case "${1:-sync}" in
        sync)
            # Default action: perform sync
            ;;
        status)
            log "Checking sync status..."
            check_connectivity
            exit $?
            ;;
        watch)
            log "Starting watch mode (sync every 5 minutes)..."
            while true; do
                main sync
                log "Sleeping for 5 minutes..."
                sleep 300
            done
            ;;
        help|--help|-h)
            echo "Usage: $0 [sync|status|watch|help]"
            echo ""
            echo "Commands:"
            echo "  sync    - Perform one-time sync (default)"
            echo "  status  - Check connection to remote host"
            echo "  watch   - Continuously sync every 5 minutes"
            echo "  help    - Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  REMOTE_USER  - Remote username (default: user)"
            echo "  REMOTE_HOST  - Remote hostname (default: nuc.local)"
            echo "  REMOTE_PATH  - Remote path (default: ~/claude-data)"
            echo "  LOCAL_PATH   - Local path (default: ~/.claude/projects)"
            echo "  SSH_KEY      - SSH key path (default: ~/.ssh/id_rsa)"
            echo "  SSH_PORT     - SSH port (default: 22)"
            exit 0
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac

    # Set up trap for cleanup
    trap cleanup EXIT INT TERM

    # Prevent multiple instances
    if [ -f "$LOCKFILE" ]; then
        log_warning "Another sync is already running (lockfile exists)"
        exit 0
    fi
    touch "$LOCKFILE"

    # Run checks
    check_dependencies

    if ! check_connectivity; then
        exit 1
    fi

    # Perform sync
    sync_data
}

main "$@"
