@echo off
setlocal
title Register a Charter

echo ============================================================
echo  Charter registration - answer three questions, that's it.
echo ============================================================
echo.
echo  Before you start:
echo   1. Copy this file into your keeper folder
echo      (the one that contains the "runtime" folder).
echo   2. Copy YOUR two charter files into the keeper's
echo      charters folder:
echo      CA\Continuity_Architecture\01 Atlas Governance\charters\
echo.
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  You need Node.js for this to work.
  echo  Get it at https://nodejs.org - install the LTS version,
  echo  then double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist "runtime\governance\CharterLoader.js" (
  echo  This file is in the wrong place.
  echo  Copy it into your keeper folder - the one that contains
  echo  the "runtime" folder - and double-click it there.
  echo.
  pause
  exit /b 1
)

set "CHARTER_DIR=CA\Continuity_Architecture\01 Atlas Governance\charters"

set /p CHARTER_FILE="Your charter file name (example: mi-charter.charter.json): "
if not exist "%CHARTER_DIR%\%CHARTER_FILE%" (
  echo.
  echo  Can't find "%CHARTER_FILE%" in the charters folder.
  echo  Copy your .charter.json file (and your charter text file)
  echo  into this folder first:
  echo  %CHARTER_DIR%\
  echo.
  pause
  exit /b 1
)

set /p ACTOR="Your name or community name: "

set /p DO_ACTIVATE="Make this the active charter now? (y/n): "
set "WANT_ACTIVE=no"
if /i "%DO_ACTIVATE%"=="y" set "WANT_ACTIVE=yes"
if /i "%DO_ACTIVATE%"=="yes" set "WANT_ACTIVE=yes"

echo.
echo  Working...
echo.

node -e "var L=require('./runtime/governance/CharterLoader.js');var file=process.argv[1];var actor=process.argv[2];var wantActive=process.argv[3]==='yes';var reg=L.registerCharter({packageRoot:'.',sidecarFile:file,actor:actor});if(reg.ok){console.log('REGISTERED: charter '+reg.charterId+' (version '+reg.version+').');}else{console.log('NOT REGISTERED: '+reg.reason);}if(reg.ok&&wantActive){console.log('');console.log('Activation re-proves the keeper. This takes a few minutes.');console.log('');var act=L.activateCharter({packageRoot:'.',charterId:reg.charterId,actor:actor});if(act.ok){console.log('ACTIVE: '+reg.charterId+' is now the governing charter.');}else{console.log('NOT ACTIVATED: '+act.reason);}}" "%CHARTER_FILE%" "%ACTOR%" "%WANT_ACTIVE%"

echo.
echo ============================================================
echo  Done. Press any key to close this window.
pause >nul
