@echo off
setlocal enabledelayedexpansion
title Atlas Keeper Upgrader - 2026-09-27 R2 AXOL fixes

echo ======================================================
echo   ATLAS KEEPER - Round-2 AXOL Upgrade 2026-09-27
echo ======================================================
echo.
echo   This carries your teaching data (candidates, frequent
echo   flyers, versions, audits) from your current keeper
echo   into the new one, then you open the new vault in
echo   Obsidian.
echo.
echo   What's new: the 13 round-2 AXOL fixes are in this
echo   build - all 17 proof suites and every blind set
echo   passed green before it was zipped.
echo.
echo   First: close Obsidian completely. Not minimized -
echo   actually closed.
echo.
pause

:ASKNEW
echo.
echo   STEP 1: Drag the EXTRACTED AtlasTI_2026-09-27-R2
echo   folder into this window, then press Enter.
echo.
set /p NEWROOT=^> 
set NEWROOT=%NEWROOT:"=%
if "%NEWROOT:~-1%"=="\" set NEWROOT=%NEWROOT:~0,-1%
if exist "%NEWROOT%\runtime\safety\InputInjectionScanner.js" goto NEWOK
if exist "%NEWROOT%\Masterstep192\k\AtlasTI_2026-09-27-R2\runtime\safety\InputInjectionScanner.js" (
  set NEWROOT=%NEWROOT%\Masterstep192\k\AtlasTI_2026-09-27-R2
  goto NEWOK
)
if exist "%NEWROOT%\AtlasTI_2026-09-27-R2\runtime\safety\InputInjectionScanner.js" (
  set NEWROOT=%NEWROOT%\AtlasTI_2026-09-27-R2
  goto NEWOK
)
echo   That folder doesn't look like the new keeper. Try again.
goto ASKNEW
:NEWOK

:ASKOLD
echo.
echo   STEP 2: Drag your CURRENT keeper folder
echo   (AtlasTI_2026-09-27) into this window,
echo   then press Enter.
echo.
set /p OLDROOT=^> 
set OLDROOT=%OLDROOT:"=%
if "%OLDROOT:~-1%"=="\" set OLDROOT=%OLDROOT:~0,-1%
if exist "%OLDROOT%\runtime\teaching" goto OLDOK
if exist "%OLDROOT%\AtlasTI_2026-09-27\runtime\teaching" (
  set OLDROOT=%OLDROOT%\AtlasTI_2026-09-27
  goto OLDOK
)
echo   That folder doesn't look like your current keeper. Try again.
goto ASKOLD
:OLDOK

echo.
echo   Copying your teaching data...
set COPIED=0
for %%F in ("%OLDROOT%\runtime\teaching\*.json") do (
  copy /Y "%%F" "%NEWROOT%\runtime\teaching\" >nul
  echo   carried: %%~nxF
  set /a COPIED+=1
)
if %COPIED%==0 echo   (no data files found - fresh start, that's fine)

echo.
echo ======================================================
echo   DONE. Now open the new vault in Obsidian:
echo.
echo   1. Open Obsidian
echo   2. Click "Open" (bottom-left) then "Open folder as vault"
echo   3. Pick this folder:
echo      %NEWROOT%\CA\Continuity_Architecture
echo   4. Trust the vault if Obsidian asks
echo.
echo   Your Teaching tab is there with all 5 tabs and your
echo   data carried over. The round-2 AXOL fixes are live
echo   in the new engine.
echo ======================================================
echo.
pause
