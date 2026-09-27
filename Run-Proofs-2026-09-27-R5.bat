@echo off
setlocal
title Atlas Keeper Proof Suite - 2026-09-27 R5

echo ======================================================
echo   ATLAS KEEPER - Full proof suite (106 checks)
echo ======================================================
echo.
echo   This runs every proof against the new keeper and
echo   reports pass/fail at the end. Takes a few minutes -
echo   leave the black window open until it finishes.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js wasn't found. The proofs need Node to run.
  echo   Install it from https://nodejs.org (the LTS version),
  echo   then double-click this file again.
  echo.
  pause
  exit /b 1
)

:ASKROOT
echo   Drag the EXTRACTED AtlasTI_2026-09-27-R5 folder into this
echo   window, then press Enter.
echo.
set /p KEEPER=^> 
set KEEPER=%KEEPER:"=%
if "%KEEPER:~-1%"=="\" set KEEPER=%KEEPER:~0,-1%
if exist "%KEEPER%\proof\runCurrentProof.js" goto RUNOK
if exist "%KEEPER%\Masterstep192\k\AtlasTI_2026-09-27-R5\proof\runCurrentProof.js" (
  set KEEPER=%KEEPER%\Masterstep192\k\AtlasTI_2026-09-27-R5
  goto RUNOK
)
if exist "%KEEPER%\AtlasTI_2026-09-27-R5\proof\runCurrentProof.js" (
  set KEEPER=%KEEPER%\AtlasTI_2026-09-27-R5
  goto RUNOK
)
echo   That folder doesn't look like the keeper. Try again.
goto ASKROOT
:RUNOK

echo.
echo   Running all proofs... this takes a few minutes.
echo.
cd /d "%KEEPER%"
node proof\runCurrentProof.js > "%TEMP%\keeper-proof-run.txt" 2>&1
set EXITCODE=%errorlevel%

echo.
echo ------------------------------------------------------
type "%TEMP%\keeper-proof-run.txt" | findstr /C:"\"pass\""
echo ------------------------------------------------------
echo.
if %EXITCODE%==0 (
  echo   RESULT: ALL PROOFS PASSED - the new keeper is fully
  echo   integrated on this machine.
) else (
  echo   RESULT: SOMETHING FAILED - send a screenshot of this
  echo   window to Steve's helper and say which check failed.
)
echo.
pause
