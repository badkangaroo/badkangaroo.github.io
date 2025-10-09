@echo off
REM Ribbit Test Server
REM This script starts a local web server for testing

echo Starting Ribbit Test Server...
echo.
echo Once the server starts, open your browser to:
echo   http://localhost:8000/web/wasm_tests.html
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python 3 first
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using Python 3...
    python -m http.server 8000
    goto :end
)

REM Try Python 2
python2 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using Python 2...
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM Try Node.js http-server
where http-server >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using Node.js http-server...
    http-server -p 8000
    goto :end
)

REM Try npx http-server (Node.js)
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using npx http-server...
    npx http-server -p 8000
    goto :end
)

echo ERROR: No suitable web server found!
echo.
echo Please install one of the following:
echo   - Python 3: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
pause

:end

