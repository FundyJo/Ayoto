#!/bin/bash
#
# ZPE Plugin Build Script for Linux/macOS
#
# Usage:
#   ./build-plugin.sh <plugin-folder> [options]
#
# Options:
#   -o, --output     Output directory (default: current directory)
#   -m, --minify     Minify the plugin code
#   -e, --encrypt    Encrypt the plugin (experimental)
#   -s, --strict     Enable strict security validation (default)
#   --no-strict      Disable strict security validation
#   -v, --verbose    Verbose output
#   -h, --help       Show help
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default options
PLUGIN_FOLDER=""
OUTPUT_DIR="$(pwd)"
MINIFY=""
ENCRYPT=""
STRICT="--strict"
VERBOSE=""

# Print colored message
print_msg() {
    local color=$1
    local symbol=$2
    local message=$3
    echo -e "${color}${symbol}${NC} ${message}"
}

info() {
    print_msg "$CYAN" "ℹ" "$1"
}

success() {
    print_msg "$GREEN" "✓" "$1"
}

warn() {
    print_msg "$YELLOW" "⚠" "$1"
}

error() {
    print_msg "$RED" "✗" "$1"
}

# Show help
show_help() {
    cat << EOF
ZPE Plugin Build Script for Linux/macOS
========================================

Build ZPE plugin packages from source folders.

Usage:
  $(basename "$0") <plugin-folder> [options]

Arguments:
  plugin-folder    Path to the plugin folder containing manifest.json

Options:
  -o, --output     Output directory for the .zpe file (default: current directory)
  -m, --minify     Minify the plugin code
  -e, --encrypt    Encrypt the plugin package (experimental)
  -s, --strict     Enable strict security validation (default)
  --no-strict      Disable strict security validation
  -v, --verbose    Verbose output
  -h, --help       Show this help message

Examples:
  $(basename "$0") ./my-plugin
  $(basename "$0") ./my-plugin -o ./dist
  $(basename "$0") ./my-plugin --minify --verbose

Plugin Structure:
  plugin-folder/
  ├── manifest.json    Required: Plugin metadata
  ├── icon.png         Optional: Plugin icon
  └── src/
      ├── index.js     Required: Main entry point
      └── *.js         Optional: Additional modules

Requirements:
  - Node.js v18 or higher
EOF
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -m|--minify)
                MINIFY="--minify"
                shift
                ;;
            -e|--encrypt)
                ENCRYPT="--encrypt"
                shift
                ;;
            -s|--strict)
                STRICT="--strict"
                shift
                ;;
            --no-strict)
                STRICT="--no-strict"
                shift
                ;;
            -v|--verbose)
                VERBOSE="--verbose"
                shift
                ;;
            -*)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                if [[ -z "$PLUGIN_FOLDER" ]]; then
                    PLUGIN_FOLDER="$1"
                else
                    error "Too many arguments"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is required but not installed."
        echo "  Please install Node.js v18 or higher from https://nodejs.org/"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$NODE_VERSION" -lt 18 ]]; then
        error "Node.js v18 or higher is required (found v$(node -v))"
        exit 1
    fi
    
    # Check if build script exists
    if [[ ! -f "$SCRIPT_DIR/build-plugin.mjs" ]]; then
        error "build-plugin.mjs not found in $SCRIPT_DIR"
        exit 1
    fi
}

# Main function
main() {
    parse_args "$@"
    
    if [[ -z "$PLUGIN_FOLDER" ]]; then
        error "Plugin folder is required"
        show_help
        exit 1
    fi
    
    # Resolve paths
    PLUGIN_FOLDER="$(cd "$PLUGIN_FOLDER" 2>/dev/null && pwd)"
    if [[ ! -d "$PLUGIN_FOLDER" ]]; then
        error "Plugin folder not found: $PLUGIN_FOLDER"
        exit 1
    fi
    
    check_prerequisites
    
    info "Building plugin from: $PLUGIN_FOLDER"
    
    # Build arguments
    BUILD_ARGS=("$PLUGIN_FOLDER" "-o" "$OUTPUT_DIR")
    [[ -n "$MINIFY" ]] && BUILD_ARGS+=("$MINIFY")
    [[ -n "$ENCRYPT" ]] && BUILD_ARGS+=("$ENCRYPT")
    [[ -n "$STRICT" ]] && BUILD_ARGS+=("$STRICT")
    [[ -n "$VERBOSE" ]] && BUILD_ARGS+=("$VERBOSE")
    
    # Run the Node.js build script
    node "$SCRIPT_DIR/build-plugin.mjs" "${BUILD_ARGS[@]}"
    
    exit_code=$?
    if [[ $exit_code -eq 0 ]]; then
        success "Build completed successfully!"
    else
        error "Build failed with exit code $exit_code"
    fi
    
    exit $exit_code
}

main "$@"
