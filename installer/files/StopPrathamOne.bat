@echo off
rem /**
rem  * @file        StopPrathamOne.bat
rem  * @project     PrathamOne EduOS Coaching Institute Management System
rem  * @module      installer.files
rem  *
rem  * @author      Jawahar R. Mallah
rem  * @organization Smritisys & AITDL Networks
rem  * @client      Prashant Academy Coaching Institute
rem  * @copyright   Copyright (c) 2026 AITDL
rem  * @license     Proprietary
rem  *
rem  * @version     1.0.0
rem  * @created     2026-11-15
rem  * @updated     2026-11-15
rem  *
rem  * @description Stop running PrathamOne EduOS background processes.
rem  */

cd /d "%~dp0"
echo Stopping PrathamOne EduOS backend and database...
taskkill /F /IM pythonw.exe >nul 2>&1
taskkill /F /IM python.exe /FI "WINDOWTITLE eq PrathamOne*" >nul 2>&1
if exist "%~dp0pgsql\bin\pg_ctl.exe" (
    "%~dp0pgsql\bin\pg_ctl.exe" stop -D "%~dp0data" -m fast >nul 2>&1
)
echo PrathamOne EduOS has been stopped.
timeout /t 2 >nul
