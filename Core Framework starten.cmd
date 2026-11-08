@echo off
setlocal
title Core Framework

cd /d "%~dp0"

where bun >nul 2>&1
if errorlevel 1 (
	echo Bun wurde nicht gefunden. Bitte pruefe, ob Bun weiterhin installiert und im PATH verfuegbar ist.
	pause
	exit /b 1
)

powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5173' -TimeoutSec 1; if ($response.StatusCode -ge 200) { Start-Process 'http://localhost:5173'; exit 0 } } catch {}; exit 1"
if not errorlevel 1 exit /b 0

echo Core Framework wird gestartet.
echo Dieses Fenster schliessen, um die Anwendung zu beenden.
echo.
bun run start:www

if errorlevel 1 (
	echo.
	echo Core Framework konnte nicht gestartet werden.
	pause
)
