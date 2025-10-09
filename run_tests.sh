#!/bin/bash
# Ribbit Test Server
# This script starts a local web server for testing

echo "Starting Ribbit Test Server..."
echo ""
echo "Once the server starts, open your browser to:"
echo "  http://localhost:8000/web/wasm_tests.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python 3 first
if command -v python3 &> /dev/null; then
    echo "Using Python 3..."
    python3 -m http.server 8000
    exit 0
fi

# Try Python
if command -v python &> /dev/null; then
    # Check if it's Python 2 or 3
    PYTHON_VERSION=$(python -c 'import sys; print(sys.version_info[0])')
    if [ "$PYTHON_VERSION" == "3" ]; then
        echo "Using Python 3..."
        python -m http.server 8000
        exit 0
    else
        echo "Using Python 2..."
        python -m SimpleHTTPServer 8000
        exit 0
    fi
fi

# Try Node.js http-server
if command -v http-server &> /dev/null; then
    echo "Using Node.js http-server..."
    http-server -p 8000
    exit 0
fi

# Try npx (Node.js)
if command -v npx &> /dev/null; then
    echo "Using npx http-server..."
    npx http-server -p 8000
    exit 0
fi

echo "ERROR: No suitable web server found!"
echo ""
echo "Please install one of the following:"
echo "  - Python 3: https://www.python.org/downloads/"
echo "  - Node.js: https://nodejs.org/"
echo ""
exit 1

