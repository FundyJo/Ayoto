@echo off
REM ZPE Plugin Build Script for Windows
REM
REM Usage:
REM   build-plugin.bat <plugin-folder> [options]
REM
REM Options:
REM   -o, --output     Output directory (default: current directory)
REM   -m, --minify     Minify the plugin code
REM   -e, --encrypt    Encrypt the plugin (experimental)
REM   -s, --strict     Enable strict security validation (default)
REM   --no-strict      Disable strict security validation
REM   -v, --verbose    Verbose output
REM   -h, --help       Show help

setlocal enabledelayedexpansion

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Default options
set "PLUGIN_FOLDER="
set "OUTPUT_DIR=%CD%"
set "MINIFY="
set "ENCRYPT="
set "STRICT=--strict"
set "VERBOSE="

REM Parse arguments
:parse_args
if "%~1"=="" goto :check_args

if /i "%~1"=="-h" goto :show_help
if /i "%~1"=="--help" goto :show_help

if /i "%~1"=="-o" (
    set "OUTPUT_DIR=%~2"
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--output" (
    set "OUTPUT_DIR=%~2"
    shift
    shift
    goto :parse_args
)

if /i "%~1"=="-m" (
    set "MINIFY=--minify"
    shift
    goto :parse_args
)
if /i "%~1"=="--minify" (
    set "MINIFY=--minify"
    shift
    goto :parse_args
)

if /i "%~1"=="-e" (
    set "ENCRYPT=--encrypt"
    shift
    goto :parse_args
)
if /i "%~1"=="--encrypt" (
    set "ENCRYPT=--encrypt"
    shift
    goto :parse_args
)

if /i "%~1"=="-s" (
    set "STRICT=--strict"
    shift
    goto :parse_args
)
if /i "%~1"=="--strict" (
    set "STRICT=--strict"
    shift
    goto :parse_args
)

if /i "%~1"=="--no-strict" (
    set "STRICT=--no-strict"
    shift
    goto :parse_args
)

if /i "%~1"=="-v" (
    set "VERBOSE=--verbose"
    shift
    goto :parse_args
)
if /i "%~1"=="--verbose" (
    set "VERBOSE=--verbose"
    shift
    goto :parse_args
)

REM If it doesn't start with -, it's the plugin folder
echo %~1 | findstr /r "^-" >nul
if errorlevel 1 (
    if "%PLUGIN_FOLDER%"=="" (
        set "PLUGIN_FOLDER=%~1"
    ) else (
        echo Error: Too many arguments
        goto :show_help
    )
)

shift
goto :parse_args

:check_args
if "%PLUGIN_FOLDER%"=="" (
    echo Error: Plugin folder is required
    goto :show_help
)

REM Check if plugin folder exists
if not exist "%PLUGIN_FOLDER%" (
    echo Error: Plugin folder not found: %PLUGIN_FOLDER%
    exit /b 1
)

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is required but not installed.
    echo   Please install Node.js v18 or higher from https://nodejs.org/
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=v" %%v in ('node -v') do set "NODE_VERSION=%%v"
for /f "tokens=1 delims=." %%v in ("%NODE_VERSION%") do set "NODE_MAJOR=%%v"

REM Remove the 'v' prefix if present
set "NODE_MAJOR=%NODE_MAJOR:v=%"

if %NODE_MAJOR% LSS 18 (
    echo Error: Node.js v18 or higher is required
    exit /b 1
)

REM Check if build script exists
if not exist "%SCRIPT_DIR%\build-plugin.mjs" (
    echo Error: build-plugin.mjs not found in %SCRIPT_DIR%
    exit /b 1
)

echo Building plugin from: %PLUGIN_FOLDER%

REM Build arguments
set "BUILD_ARGS=%PLUGIN_FOLDER% -o %OUTPUT_DIR%"
if not "%MINIFY%"=="" set "BUILD_ARGS=%BUILD_ARGS% %MINIFY%"
if not "%ENCRYPT%"=="" set "BUILD_ARGS=%BUILD_ARGS% %ENCRYPT%"
if not "%STRICT%"=="" set "BUILD_ARGS=%BUILD_ARGS% %STRICT%"
if not "%VERBOSE%"=="" set "BUILD_ARGS=%BUILD_ARGS% %VERBOSE%"

REM Run the Node.js build script
node "%SCRIPT_DIR%\build-plugin.mjs" %BUILD_ARGS%

if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo Build completed successfully!
exit /b 0

:show_help
echo.
echo ZPE Plugin Build Script for Windows
echo ====================================
echo.
echo Build ZPE plugin packages from source folders.
echo.
echo Usage:
echo   build-plugin.bat ^<plugin-folder^> [options]
echo.
echo Arguments:
echo   plugin-folder    Path to the plugin folder containing manifest.json
echo.
echo Options:
echo   -o, --output     Output directory for the .zpe file (default: current directory)
echo   -m, --minify     Minify the plugin code
echo   -e, --encrypt    Encrypt the plugin package (experimental)
echo   -s, --strict     Enable strict security validation (default)
echo   --no-strict      Disable strict security validation
echo   -v, --verbose    Verbose output
echo   -h, --help       Show this help message
echo.
echo Examples:
echo   build-plugin.bat .\my-plugin
echo   build-plugin.bat .\my-plugin -o .\dist
echo   build-plugin.bat .\my-plugin --minify --verbose
echo.
echo Plugin Structure:
echo   plugin-folder\
echo   ^|-- manifest.json    Required: Plugin metadata
echo   ^|-- icon.png         Optional: Plugin icon
echo   ^+-- src\
echo       ^|-- index.js     Required: Main entry point
echo       ^+-- *.js         Optional: Additional modules
echo.
echo Requirements:
echo   - Node.js v18 or higher
echo.
exit /b 0
