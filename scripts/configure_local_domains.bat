@echo off
:: /**
::  * @file        configure_local_domains.bat
::  * @project     PrathamOne EduOS Coaching Institute Management System
::  * @module      scripts
::  *
::  * @author      Jawahar R. Mallah
::  * @organization Smritisys & AITDL Networks
::  * @client      Prashant Academy Coaching Institute
::  * @copyright   Copyright (c) 2026 PrathamOne EduOS
::  * @license     Proprietary
::  *
::  * @version     1.0.0
::  * @created     2026-11-20
::  * @updated     2026-11-20
::  *
::  * @description Batch wrapper to elevate and execute configure_local_domains.py.
::  */

title PrathamOne EduOS — Configure Local Domains and SSL Trust
cd /d "%~dp0\.."

python scripts\configure_local_domains.py %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Configuration finished with return code %ERRORLEVEL%.
    pause
)
