; /**
;  * @file        prathamone_setup.iss
;  * @project     PrathamOne EduOS Coaching Institute Management System
;  * @module      installer
;  *
;  * @author      Jawahar R. Mallah
;  * @organization AITDL (AI Technology & Development Lab)
;  * @client      Prashant Academy Coaching Institute
;  * @copyright   Copyright (c) 2026 AITDL
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
#define MyAppVersion "1.0.0"
#define MyAppPublisher "AITDL (AI Technology & Development Lab)"
#define MyAppURL "https://aitdl.com"
#define MyAppExeName "PrathamOneLauncher.bat"
#define MyAppDescription "Coaching Institute Management System"

[Setup]
AppId={{C47F8932-B8E2-4C10-9118-E86940A39BF1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
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
VersionInfoCompany=AITDL (AI Technology & Development Lab)
VersionInfoDescription=PrathamOne EduOS Setup
VersionInfoVersion=1.0.0.0
VersionInfoCopyright=Copyright (C) 2026 AITDL
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

; Launcher & Stop Scripts
Source: "files\PrathamOneLauncher.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\StopPrathamOne.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\scripts\windows_launcher.py"""; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\scripts\windows_launcher.py"""; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Console Mode)"; Filename: "{app}\PrathamOneLauncher.bat"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Browser)"; Filename: "http://localhost:8000"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\Stop PrathamOne EduOS"; Filename: "{app}\StopPrathamOne.bat"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

[Run]
; 1. Initialize PostgreSQL cluster if data folder doesn't exist
Filename: "{app}\pgsql\bin\initdb.exe"; Parameters: "-D ""{app}\data"" -U postgres -A trust --encoding=UTF8 --locale=C --no-instructions"; WorkingDir: "{app}\pgsql\bin"; Flags: runhidden skipifdoesntexist; StatusMsg: "Initializing local database cluster..."; Check: NeedsDbInit

; 2. Temporarily start PostgreSQL on port 5433 to run bootstrap & migrations
Filename: "{app}\pgsql\bin\pg_ctl.exe"; Parameters: "start -D ""{app}\data"" -o ""-p 5433"" -l ""{app}\data\init_pg.log"" -w"; WorkingDir: "{app}\pgsql\bin"; Flags: runhidden skipifdoesntexist; StatusMsg: "Preparing database service..."; Check: NeedsDbInit

; 3. Run bootstrap migration and administrator seed
Filename: "{app}\python\python.exe"; Parameters: """{app}\scripts\windows_bootstrap.py"" --admin-password=""{code:GetAdminPassword}"" --db-port=5433"; WorkingDir: "{app}"; Flags: runhidden skipifdoesntexist; StatusMsg: "Configuring initial academic masters and security credentials..."; Check: HasPythonExe

; 4. Stop temporary PostgreSQL
Filename: "{app}\pgsql\bin\pg_ctl.exe"; Parameters: "stop -D ""{app}\data"" -m fast"; WorkingDir: "{app}\pgsql\bin"; Flags: runhidden skipifdoesntexist; Check: NeedsDbInit

; 5. Add Windows Firewall rule if task selected
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""PrathamOne EduOS Local Network"" dir=in action=allow protocol=TCP localport=8000"; Flags: runhidden; Tasks: firewallrule

; 6. Option to launch immediately
Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\scripts\windows_launcher.py"""; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop running services
Filename: "taskkill"; Parameters: "/F /IM python.exe /FI ""WINDOWTITLE eq PrathamOne*"""; Flags: runhidden; RunOnceId: "StopPython"
Filename: "{app}\pgsql\bin\pg_ctl.exe"; Parameters: "stop -D ""{app}\data"" -m fast"; WorkingDir: "{app}\pgsql\bin"; Flags: runhidden skipifdoesntexist; RunOnceId: "StopPostgres"
; Remove firewall rule
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""PrathamOne EduOS Local Network"""; Flags: runhidden; RunOnceId: "RemoveFirewall"

[Code]
var
  ConfigPage: TInputQueryWizardPage;
  AdminPasswordValue: String;
  DbPortValue: String;

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
  // Create Custom Configuration Page for non-technical operator
  ConfigPage := CreateInputQueryPage(wpSelectDir,
    'Coaching Institute & Administrator Setup',
    'Set up initial institute credentials',
    'Please enter your coaching institute name and create a secure administrator password.');

  ConfigPage.Add('Coaching Institute Name:', False);
  ConfigPage.Add('Administrator Username:', False);
  ConfigPage.Add('Administrator Password (min 14 characters):', True);
  ConfigPage.Add('Confirm Administrator Password:', True);

  // Set default pre-filled values
  ConfigPage.Values[0] := 'Prashant Academy Coaching Institute';
  ConfigPage.Values[1] := 'admin';
  ConfigPage.Values[2] := 'PrathamOne2026!Admin';
  ConfigPage.Values[3] := 'PrathamOne2026!Admin';

  DbPortValue := '5432';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = ConfigPage.ID then
  begin
    if Length(Trim(ConfigPage.Values[0])) = 0 then
    begin
      MsgBox('Please enter your coaching institute name.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if Length(ConfigPage.Values[2]) < 14 then
    begin
      MsgBox('The administrator password must contain at least 14 characters for security.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if ConfigPage.Values[2] <> ConfigPage.Values[3] then
    begin
      MsgBox('The administrator passwords do not match. Please re-enter them.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    AdminPasswordValue := ConfigPage.Values[2];
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
