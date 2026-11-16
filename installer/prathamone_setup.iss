; /**
;  * @file        prathamone_setup.iss
;  * @project     PrathamOne EduOS Coaching Institute Management System
;  * @module      installer
;  *
;  * @author      Jawahar R. Mallah
;  * @organization Smritisys & AITDL Networks
;  * @client      Prashant Academy Coaching Institute
;  * @copyright   Copyright (c) 2026 PrathamOne EduOS
;  * @license     Proprietary
;  *
;  * @version     1.0.0
;  * @created     2026-11-15
;  * @updated     2026-11-15
;  *
;  * @description Inno Setup Script: Packages PrathamOne EduOS, embedded PostgreSQL 16,
;  *              Python backend runtime, and compiled React SPA into a single zero-knowledge installer.
;  */

#define MyAppName "PrathamOne EduOS"
#define MyAppDirName "PrathamOneEduOS"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Smritisys & AITDL Networks"
#define MyAppURL "https://aitdl.com"
#define MyAppExeName "PrathamOne.exe"
#define MyAppDescription "Coaching Institute Management System"

[Setup]
AppId={{C47F8932-B8E2-4C10-9118-E86940A39BF1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={code:GetSmartInstallDir|{#MyAppDirName}}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE
OutputDir=..\dist
OutputBaseFilename=PrathamOne-EduOS-Setup-v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
SetupIconFile=assets\app_icon.ico
WizardImageFile=assets\wizard_large.bmp
WizardSmallImageFile=assets\wizard_small.bmp
UninstallDisplayIcon={app}\assets\app_icon.ico
DisableWelcomePage=no
VersionInfoCompany=Smritisys & AITDL Networks
VersionInfoDescription=PrathamOne EduOS Setup
VersionInfoVersion=1.0.0.0
VersionInfoCopyright=Copyright (C) 2026 Smritisys & AITDL Networks
VersionInfoProductName=PrathamOne EduOS
VersionInfoProductVersion=1.0.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "firewallrule"; Description: "Allow other computers on coaching institute Wi-Fi/LAN to connect"; GroupDescription: "Network Features:"; Flags: checkedonce

[Dirs]
Name: "{app}"; Permissions: users-full
Name: "{app}\data"; Permissions: users-full

[Files]
; Branding and Icon Assets
Source: "assets\app_icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\wizard_large.bmp"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\wizard_small.bmp"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "..\frontend\public\artwork\16112026\001\fl.svg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "..\frontend\public\artwork\16112026\001\fl3.svg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "..\frontend\public\artwork\16112026\001\2.svg"; DestDir: "{app}\assets"; Flags: ignoreversion

; Root configuration and scripts
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\scripts\windows_bootstrap.py"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\windows_launcher.py"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\auto_version.py"; DestDir: "{app}\scripts"; Flags: ignoreversion

; Embedded Python environment (staged during build)
Source: "..\build_staging\python\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs

; Embedded PostgreSQL portable binaries (staged during build)
Source: "..\build_staging\pgsql\*"; DestDir: "{app}\pgsql"; Flags: ignoreversion recursesubdirs createallsubdirs

; Backend application source
Source: "..\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "__pycache__,*.pyc,.pytest_cache,tests,venv,.venv"

; Compiled React Frontend SPA
Source: "..\frontend\dist\*"; DestDir: "{app}\frontend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Native Executables and Diagnostic Scripts
Source: "files\PrathamOne.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\StopPrathamOne.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\PrathamOneLauncher.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\StopPrathamOne.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\Stop PrathamOne EduOS"; Filename: "{app}\StopPrathamOne.exe"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Browser)"; Filename: "http://localhost:2026"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Console Mode)"; Filename: "{app}\PrathamOneLauncher.bat"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

[Run]
; 1. Initialize PostgreSQL cluster if data folder doesn't exist
Filename: "{app}\pgsql\bin\initdb.exe"; Parameters: "-D ""{app}\data"" -U postgres -A trust --encoding=UTF8 --locale=C --no-instructions"; WorkingDir: "{app}\pgsql\bin"; Flags: runhidden skipifdoesntexist; StatusMsg: "Initializing local database cluster..."; Check: NeedsDbInit

; 2. Add Windows Firewall rule if task selected
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""PrathamOne EduOS Local Network"" dir=in action=allow protocol=TCP localport=2026"; Flags: runhidden; Tasks: firewallrule

; 3. Option to launch immediately
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop running services cleanly via native Stop executable
Filename: "{app}\StopPrathamOne.exe"; Flags: runhidden skipifdoesntexist; RunOnceId: "StopPrathamOne"
Filename: "taskkill"; Parameters: "/F /IM PrathamOne.exe /IM pythonw.exe /IM postgres.exe"; Flags: runhidden; RunOnceId: "StopPython"
; Remove firewall rule
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""PrathamOne EduOS Local Network"""; Flags: runhidden; RunOnceId: "RemoveFirewall"

[Code]
function GetDriveType(lpRootPathName: String): Cardinal;
external 'GetDriveTypeW@kernel32.dll stdcall';

var
  ConfigPage: TInputQueryWizardPage;
  LogoPage: TInputFileWizardPage;
  AcademicPage: TInputOptionWizardPage;
  MediumPage: TInputOptionWizardPage;
  AdminPasswordValue: String;
  DbPortValue: String;

function GetSmartInstallDir(AppName: String): String;
var
  SysDrive: String;
  DriveCode: Integer;
  DriveLetter: String;
  DrivePath: String;
  BestDrive: String;
begin
  SysDrive := Copy(ExpandConstant('{sd}'), 1, 1);
  BestDrive := '';

  for DriveCode := 68 to 90 do
  begin
    DriveLetter := Chr(DriveCode);
    if DriveLetter <> SysDrive then
    begin
      DrivePath := DriveLetter + ':\';
      if DirExists(DrivePath) and (GetDriveType(DrivePath) = 3) then
      begin
        BestDrive := DriveLetter;
        Break;
      end;
    end;
  end;

  if (BestDrive = '') and (SysDrive <> 'C') then
  begin
    DrivePath := 'C:\';
    if DirExists(DrivePath) and (GetDriveType(DrivePath) = 3) then
    begin
      BestDrive := 'C';
    end;
  end;

  if BestDrive <> '' then
    Result := BestDrive + ':\' + AppName
  else
    Result := ExpandConstant('{autopf}\') + AppName;
end;

function InitializeSetup: Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  // 1. Terminate any previous running or stuck instances so files are not locked
  Exec('taskkill.exe', '/F /IM PrathamOne.exe /IM pythonw.exe /IM postgres.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  // 2. Remove stale database lock if updating/reinstalling across possible paths
  if FileExists(ExpandConstant('{autopf}\{#MyAppName}\data\postmaster.pid')) then
    DeleteFile(ExpandConstant('{autopf}\{#MyAppName}\data\postmaster.pid'));
  if FileExists(ExpandConstant('{autopf}\{#MyAppDirName}\data\postmaster.pid')) then
    DeleteFile(ExpandConstant('{autopf}\{#MyAppDirName}\data\postmaster.pid'));
  if FileExists('D:\' + '{#MyAppDirName}\data\postmaster.pid') then
    DeleteFile('D:\' + '{#MyAppDirName}\data\postmaster.pid');
end;

function HasPythonExe: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\python\python.exe'));
end;

function NeedsDbInit: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\pgsql\bin\initdb.exe')) and (not FileExists(ExpandConstant('{app}\data\PG_VERSION')));
end;

function GetAdminPassword(Param: String): String;
begin
  Result := AdminPasswordValue;
end;

function GetDbPort(Param: String): String;
begin
  Result := DbPortValue;
end;

procedure InitializeWizard;
begin
  // Create Custom Configuration Page for institute details and administrator credentials
  ConfigPage := CreateInputQueryPage(wpSelectDir,
    'Institute & Academy Profile Setup',
    'Personalize PrathamOne EduOS for your coaching institute, academy, or school',
    'Please enter your institution details and create a secure administrator password. These details will appear on student admission forms, receipts, and marksheets:');

  ConfigPage.Add('Coaching Institute / Academy / School Name:', False);
  ConfigPage.Add('Primary Branch / Campus Name:', False);
  ConfigPage.Add('Campus Address & City:', False);
  ConfigPage.Add('Helpline / Contact Phone:', False);
  ConfigPage.Add('Administrator Password (min 14 characters):', True);
  ConfigPage.Add('Confirm Administrator Password:', True);

  // Set default pre-filled values
  ConfigPage.Values[0] := 'Your Academy Name';
  ConfigPage.Values[1] := 'Main Campus';
  ConfigPage.Values[2] := '123 Education Hub, MG Road';
  ConfigPage.Values[3] := '9876543210';
  ConfigPage.Values[4] := 'PrathamOne2026!Admin';
  ConfigPage.Values[5] := 'PrathamOne2026!Admin';

  // Academy Official Logo Selection Page (Optional)
  LogoPage := CreateInputFilePage(ConfigPage.ID,
    'Official Academy Crest or Logo (Optional)',
    'Select your coaching institute or school logo image',
    'Choose an image file (.png, .jpg, .jpeg) for your receipts, identity cards, and portal. If you do not have one ready right now, leave it blank for an automated prestigious academic crest:');
  LogoPage.Add('Official Logo Image File (.png, .jpg):', 'Image files (*.png;*.jpg;*.jpeg)|*.png;*.jpg;*.jpeg|All files (*.*)|*.*', '.png');

  // Academic Boards Selection Page
  AcademicPage := CreateInputOptionPage(LogoPage.ID,
    'Educational Boards & Academic Curriculum',
    'Select the examination boards taught at your coaching institute',
    'The installer will pre-populate official subjects, curriculum mappings, and batches for your selected boards:',
    False, True);

  AcademicPage.Add('Maharashtra State Board (MSBSHSE - SSC & HSC)');
  AcademicPage.Add('Central Board of Secondary Education (CBSE)');
  AcademicPage.Add('Council for Indian School Certificate Exams (ICSE / ISC)');
  AcademicPage.Add('Gujarat Secondary & Higher Secondary Board (GSEB)');
  AcademicPage.Add('Competitive Entrance Coaching (IIT-JEE / NEET-UG / State CETs)');
  AcademicPage.Add('Pan-India State Boards (UP, Karnataka, Tamil Nadu, WB, etc.)');

  AcademicPage.Values[0] := True;
  AcademicPage.Values[1] := True;
  AcademicPage.Values[2] := True;
  AcademicPage.Values[3] := True;
  AcademicPage.Values[4] := True;
  AcademicPage.Values[5] := True;

  // Medium of Instruction Selection Page
  MediumPage := CreateInputOptionPage(AcademicPage.ID,
    'Instruction Mediums & Teaching Languages',
    'Select active mediums of instruction at your coaching institute',
    'Choose the teaching languages used for class batches and academic divisions:',
    False, True);

  MediumPage.Add('English Medium (Universal)');
  MediumPage.Add('Semi-English Medium (Vernacular with English Science & Maths)');
  MediumPage.Add('Hindi Medium');
  MediumPage.Add('Marathi Medium');
  MediumPage.Add('Gujarati Medium');

  MediumPage.Values[0] := True;
  MediumPage.Values[1] := True;
  MediumPage.Values[2] := True;
  MediumPage.Values[3] := True;
  MediumPage.Values[4] := True;

  DbPortValue := '5432';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = ConfigPage.ID then
  begin
    if Length(Trim(ConfigPage.Values[0])) = 0 then
    begin
      MsgBox('Please enter your coaching institute or school name.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if Length(ConfigPage.Values[4]) < 14 then
    begin
      MsgBox('The administrator password must contain at least 14 characters for security.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if ConfigPage.Values[4] <> ConfigPage.Values[5] then
    begin
      MsgBox('The administrator passwords do not match. Please re-enter them.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    AdminPasswordValue := ConfigPage.Values[4];
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  JsonContent: String;
  SelectedBoards: String;
  SelectedMediums: String;
  EscapedLogoPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    SelectedBoards := '';
    if AcademicPage.Values[0] then SelectedBoards := SelectedBoards + 'MSBSHSE,';
    if AcademicPage.Values[1] then SelectedBoards := SelectedBoards + 'CBSE,';
    if AcademicPage.Values[2] then SelectedBoards := SelectedBoards + 'ICSE,';
    if AcademicPage.Values[3] then SelectedBoards := SelectedBoards + 'GSEB,';
    if AcademicPage.Values[4] then SelectedBoards := SelectedBoards + 'COMPETITIVE,';
    if AcademicPage.Values[5] then SelectedBoards := SelectedBoards + 'ALL_STATE,';
    if Length(SelectedBoards) > 0 then
      SetLength(SelectedBoards, Length(SelectedBoards) - 1)
    else
      SelectedBoards := 'MSBSHSE,CBSE,ICSE,GSEB,COMPETITIVE';

    SelectedMediums := '';
    if MediumPage.Values[0] then SelectedMediums := SelectedMediums + 'English,';
    if MediumPage.Values[1] then SelectedMediums := SelectedMediums + 'Semi-English,';
    if MediumPage.Values[2] then SelectedMediums := SelectedMediums + 'Hindi,';
    if MediumPage.Values[3] then SelectedMediums := SelectedMediums + 'Marathi,';
    if MediumPage.Values[4] then SelectedMediums := SelectedMediums + 'Gujarati,';
    if Length(SelectedMediums) > 0 then
      SetLength(SelectedMediums, Length(SelectedMediums) - 1)
    else
      SelectedMediums := 'English,Semi-English,Hindi,Marathi,Gujarati';

    EscapedLogoPath := LogoPage.Values[0];
    StringChangeEx(EscapedLogoPath, '\', '\\', True);

    JsonContent := '{' + #13#10 +
      '  "institute_name": "' + ConfigPage.Values[0] + '",' + #13#10 +
      '  "branch_name": "' + ConfigPage.Values[1] + '",' + #13#10 +
      '  "address": "' + ConfigPage.Values[2] + '",' + #13#10 +
      '  "phone": "' + ConfigPage.Values[3] + '",' + #13#10 +
      '  "logo_path": "' + EscapedLogoPath + '",' + #13#10 +
      '  "admin_username": "admin",' + #13#10 +
      '  "admin_password": "' + AdminPasswordValue + '",' + #13#10 +
      '  "boards": "' + SelectedBoards + '",' + #13#10 +
      '  "mediums": "' + SelectedMediums + '",' + #13#10 +
      '  "port": 2026' + #13#10 +
      '}';

    SaveStringToFile(ExpandConstant('{app}\setup_config.json'), JsonContent, False);
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  BackupDir: String;
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    if FileExists(ExpandConstant('{app}\pgsql\bin\pg_dump.exe')) then
    begin
      if MsgBox('Would you like to save a safety backup of your student and fee database in your Documents folder before uninstalling?', mbConfirmation, MB_YESNO) = IDYES then
      begin
        BackupDir := ExpandConstant('{userdocs}\PrathamOne_Backups');
        ForceDirectories(BackupDir);
        Exec(ExpandConstant('{app}\pgsql\bin\pg_dump.exe'),
             '-U postgres -p 5432 -Fc prashant_academy -f "' + BackupDir + '\prathamone_uninstall_backup.dump"',
             '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
        MsgBox('Database backup saved to: ' + BackupDir, mbInformation, MB_OK);
      end;
    end;
  end;
end;
