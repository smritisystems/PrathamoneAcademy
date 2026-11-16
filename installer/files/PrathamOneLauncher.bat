@echo off
rem /**
rem  * @file        PrathamOneLauncher.bat
rem  * @project     PrathamOne EduOS Coaching Institute Management System
rem  * @module      installer.files
rem  *
rem  * @author      Jawahar R. Mallah
rem  * @organization Smritisys & AITDL Networks
rem  * @client      Prashant Academy Coaching Institute
rem  * @copyright   Copyright (c) 2026 PrathamOne EduOS
rem  * @license     Proprietary
rem  *
rem  * @version     1.0.0
rem  * @created     2026-11-15
rem  * @updated     2026-11-15
rem  *
rem  * @description Desktop entry point for starting embedded PostgreSQL, backend services,
rem  *              and launching the PrathamOne EduOS web interface.
rem  */

cd /d "%~dp0"
title PrathamOne EduOS Console Launcher

echo ======================================================================
echo          PRATHAMONE EduOS — COACHING INSTITUTE MANAGEMENT SYSTEM      
echo ======================================================================
echo Starting local services and opening web interface...
echo.

if exist "%~dp0python\python.exe" (
    "%~dp0python\python.exe" "%~dp0scripts\windows_launcher.py"
) else (
    python "%~dp0scripts\windows_launcher.py"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ======================================================================
    echo [ERROR] PrathamOne EduOS encountered an issue during startup.
    echo ======================================================================
    echo Please review the diagnostic log above or contact AITDL support.
    echo.
    pause
)
