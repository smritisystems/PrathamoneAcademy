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
;  * @updated     2026-11-16
;  *
;  * @description Inno Setup Script: Packages PrathamOne EduOS, embedded PostgreSQL 16,
;  *              Python backend runtime, and compiled React SPA into a single zero-knowledge installer.
;  */

#define MyAppName "PrathamOne EduOS"
#define MyAppDirName "PrathamOneEduOS"
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#ifndef MyAppFileVersion
  #define MyAppFileVersion "1.0.0.0"
#endif
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
VersionInfoVersion={#MyAppFileVersion}
VersionInfoCopyright=Copyright (C) 2026 PrathamOne EduOS
VersionInfoProductName=PrathamOne EduOS
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "firewallrule"; Description: "Allow other computers on coaching institute Wi-Fi/LAN to connect"; GroupDescription: "Network Features:"; Flags: checkedonce
Name: "installrootca"; Description: "Install local SSL certificate for trusted HTTPS access (Eliminates 'Not secure' browser warnings)"; GroupDescription: "Security & Local Certificate Authority:"; Flags: checkedonce

[Dirs]
Name: "{app}"; Permissions: users-full
Name: "{app}\data"; Permissions: users-full

[Files]
; Branding and Icon Assets
Source: "assets\app_icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\wizard_large.bmp"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\wizard_small.bmp"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\widelogo.png"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\widelogo.svg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "..\frontend\public\artwork\CSM\widelogo.svg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "..\frontend\public\artwork\CSM\path1.svg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "..\frontend\public\artwork\16112026\001\2.svg"; DestDir: "{app}\assets"; Flags: ignoreversion

; Root configuration and scripts
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\launcher_config.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\scripts\windows_bootstrap.py"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\windows_launcher.py"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\generate_ssl_certificates.py"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\auto_version.py"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\configure_local_domains.py"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\configure_local_domains.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion

; Embedded Python environment (staged during build)
Source: "..\build_staging\python\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs

; Embedded PostgreSQL portable binaries (staged during build)
Source: "..\build_staging\pgsql\*"; DestDir: "{app}\pgsql"; Flags: ignoreversion recursesubdirs createallsubdirs

; Hardened backend application runtime (with precompiled security bytecode and zero dev artifacts)
Source: "..\build_staging\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs

; Compiled React Frontend SPA (strictly excluding extra media, videos, raw design files, and recordings)
Source: "..\frontend\dist\*"; DestDir: "{app}\frontend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "media\commercial\*,media\studio\*,media\motion\*,Final_Selected\*,New folder*,*.mp4,*.mov,*.avi,*.wmv,*.zip,*.tar.gz,*.psd,*.ai,*.pptx,*.pdf,*.doc,*.docx,artwork\18112026\*,artwork\15112026\*,artwork\14112026\*,artwork\VIDEOS\*,artwork\Gemini_*,artwork\prathamOneInscape.svg,Prathamone Master Logo*"

; Native Executables and Diagnostic Scripts
Source: "files\PrathamOne.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\StopPrathamOne.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\PrathamOneLauncher.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\StopPrathamOne.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\Stop PrathamOne EduOS"; Filename: "{app}\StopPrathamOne.exe"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Web Browser Mode)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--browser"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Desktop App Mode)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--app"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Web Portal HTTPS)"; Filename: "https://prathamone:2026"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Console Mode)"; Filename: "{app}\PrathamOneLauncher.bat"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

[Run]
; 1. Initialize PostgreSQL cluster if data folder doesn't exist
Filename: "{app}\pgsql\bin\initdb.exe"; Parameters: "-D ""{app}\data"" -U postgres -A trust --encoding=UTF8 --locale=C --no-instructions"; WorkingDir: "{app}\pgsql\bin"; Flags: runhidden skipifdoesntexist; StatusMsg: "Initializing local database cluster..."; Check: NeedsDbInit

; 2. Add Windows Firewall rule for ports 2026, HTTP 80, and HTTPS 443
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""PrathamOne EduOS Local Network"" dir=in action=allow protocol=TCP localport=2026,80,443"; Flags: runhidden; Tasks: firewallrule

; 3. Setup port 80 and port 443 proxy so users can access without port (http://... and https://...)
Filename: "netsh"; Parameters: "interface portproxy add v4tov4 listenport=80 listenaddress=127.0.0.1 connectport=2026 connectaddress=127.0.0.1"; Flags: runhidden
Filename: "netsh"; Parameters: "interface portproxy add v4tov4 listenport=443 listenaddress=127.0.0.1 connectport=2026 connectaddress=127.0.0.1"; Flags: runhidden

; 4. Generate local TLS security certificates uniquely on this computer (never packaged in installer)
Filename: "{app}\python\python.exe"; Parameters: """{app}\scripts\generate_ssl_certificates.py"""; WorkingDir: "{app}"; Flags: runhidden; StatusMsg: "Generating local trusted TLS security certificates..."

; 5. Register newly generated machine-local Root CA into Windows Trusted Root Store (eliminates "Not secure" / untrusted certificate warnings)
Filename: "certutil.exe"; Parameters: "-addstore -f ""ROOT"" ""{app}\assets\Smritisys_AITDL_Local_CA.cer"""; Flags: runhidden; Tasks: installrootca; StatusMsg: "Configuring local trusted SSL security certificate..."

; 6. Run automated domain and network configuration (guarantees hosts entries, port 80/443 proxy, and DNS cache flush)
Filename: "{app}\python\python.exe"; Parameters: """{app}\scripts\configure_local_domains.py"" --no-pause --skip-ca"; WorkingDir: "{app}"; Flags: runhidden; StatusMsg: "Finalizing domain routing and local network configuration..."

; 7. Option to launch immediately
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop running services cleanly via native Stop executable
Filename: "{app}\StopPrathamOne.exe"; Flags: runhidden skipifdoesntexist; RunOnceId: "StopPrathamOne"
Filename: "taskkill"; Parameters: "/F /IM PrathamOne.exe /IM pythonw.exe /IM postgres.exe"; Flags: runhidden; RunOnceId: "StopPython"
; Clean up port 80 and port 443 portproxies
Filename: "netsh"; Parameters: "interface portproxy delete v4tov4 listenport=80 listenaddress=127.0.0.1"; Flags: runhidden; RunOnceId: "RemovePortproxy80"
Filename: "netsh"; Parameters: "interface portproxy delete v4tov4 listenport=443 listenaddress=127.0.0.1"; Flags: runhidden; RunOnceId: "RemovePortproxy443"
; Remove Smritisys & AITDL Local Root CA from Windows Trusted Root Store
Filename: "certutil.exe"; Parameters: "-delstore ""ROOT"" ""Smritisys & AITDL Networks Local Root CA"""; Flags: runhidden; RunOnceId: "RemoveRootCA"
; Remove firewall rule
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""PrathamOne EduOS Local Network"""; Flags: runhidden; RunOnceId: "RemoveFirewall"

[Code]
function GetDriveType(lpRootPathName: String): Cardinal;
external 'GetDriveTypeW@kernel32.dll stdcall';

function SetFileAttributes(lpFileName: String; dwFileAttributes: Cardinal): Boolean;
external 'SetFileAttributesW@kernel32.dll stdcall';

var
  LicensePage: TInputQueryWizardPage;
  ConfigPage: TInputQueryWizardPage;
  LogoPage: TInputFileWizardPage;
  AcademicPage: TInputOptionWizardPage;
  MediumPage: TInputOptionWizardPage;
  AdminPasswordValue: String;
  DbPortValue: String;

function SanitizeSlug(Input: String): String;
var
  I: Integer;
  C: Char;
  Res: String;
begin
  Res := '';
  for I := 1 to Length(Input) do
  begin
    C := Input[I];
    if ((C >= 'a') and (C <= 'z')) or ((C >= 'A') and (C <= 'Z')) or ((C >= '0') and (C <= '9')) then
      Res := Res + Lowercase(C);
  end;
  Result := Res;
end;

procedure UpdateHostsFile(ClassesSlug: String);
var
  HostsPath: String;
  HostsContent: AnsiString;
  NewEntries: String;
  ResultCode: Integer;
begin
  EnableFsRedirection(False);
  try
    HostsPath := ExpandConstant('{sysnative}\drivers\etc\hosts');
    if not FileExists(HostsPath) then
      HostsPath := ExpandConstant('{sys}\drivers\etc\hosts');

    if FileExists(HostsPath) then
    begin
      if LoadStringFromFile(HostsPath, HostsContent) then
      begin
        NewEntries := '';
        // 1. Combination 1: PrathamOne brand domain
        if Pos('prathamone', Lowercase(String(HostsContent))) = 0 then
        begin
          NewEntries := NewEntries + #13#10 + '127.0.0.1    prathamone' + #13#10 + '127.0.0.1    prathamone.local';
        end;
        // 2. Combination 2: Generic classesname alias
        if Pos('classesname', Lowercase(String(HostsContent))) = 0 then
        begin
          NewEntries := NewEntries + #13#10 + '127.0.0.1    classesname' + #13#10 + '127.0.0.1    classesname.local';
        end;
        // 3. Combination 3: Always include prashantacademy default alias
        if Pos('prashantacademy', Lowercase(String(HostsContent))) = 0 then
        begin
          NewEntries := NewEntries + #13#10 + '127.0.0.1    prashantacademy' + #13#10 + '127.0.0.1    prashantacademy.local';
        end;
        // 4. Custom institute/classes name without any space if different
        if (ClassesSlug <> '') and (ClassesSlug <> 'prashantacademy') and (ClassesSlug <> 'prathamone') and (ClassesSlug <> 'classesname') and (ClassesSlug <> 'youracademyname') and (Pos(Lowercase(ClassesSlug), Lowercase(String(HostsContent))) = 0) then
        begin
          NewEntries := NewEntries + #13#10 + '127.0.0.1    ' + ClassesSlug + #13#10 + '127.0.0.1    ' + ClassesSlug + '.local';
        end;
        if NewEntries <> '' then
        begin
          SetFileAttributes(HostsPath, 128);
          HostsContent := AnsiString(String(HostsContent) + #13#10 + '# PrathamOne EduOS Local Domain Mapping' + NewEntries + #13#10);
          SaveStringToFile(HostsPath, HostsContent, False);
          Exec('ipconfig.exe', '/flushdns', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
        end;
      end;
    end;
  finally
    EnableFsRedirection(True);
  end;
end;

procedure RemoveHostsEntries;
var
  HostsPath: String;
  HostsContent: AnsiString;
  P: Integer;
  S: String;
begin
  EnableFsRedirection(False);
  try
    HostsPath := ExpandConstant('{sysnative}\drivers\etc\hosts');
    if not FileExists(HostsPath) then
      HostsPath := ExpandConstant('{sys}\drivers\etc\hosts');

    if FileExists(HostsPath) then
    begin
      if LoadStringFromFile(HostsPath, HostsContent) then
      begin
        S := String(HostsContent);
        P := Pos('# PrathamOne EduOS Local Domain Mapping', S);
        if P > 0 then
        begin
          Delete(S, P, Length(S) - P + 1);
          SaveStringToFile(HostsPath, AnsiString(S), False);
        end;
      end;
    end;
  finally
    EnableFsRedirection(True);
  end;
end;

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
  // Dynamically configure upper-right header for wide logo branding
  WizardForm.WizardSmallBitmapImage.Width := 160;
  WizardForm.WizardSmallBitmapImage.Left := WizardForm.MainPanel.ClientWidth - 165;
  WizardForm.PageNameLabel.Width := WizardForm.WizardSmallBitmapImage.Left - WizardForm.PageNameLabel.Left - 10;
  WizardForm.PageDescriptionLabel.Width := WizardForm.WizardSmallBitmapImage.Left - WizardForm.PageDescriptionLabel.Left - 10;

  // Product License & Activation Page (Optional - with skip/activate later capability)
  LicensePage := CreateInputQueryPage(wpSelectDir,
    'Product License & Activation (Optional)',
    'Enter your official Serial Number and Activation Key to activate PrathamOne EduOS',
    'If you have received an official Serial Number and Activation Key from Smritisys & AITDL Networks, enter them below.' + #13#10 +
    'If you are evaluating PrathamOne EduOS or do not have your keys ready right now, leave these fields blank to continue in 30-Day Evaluation Mode:');

  LicensePage.Add('Product Serial Number (e.g. SMR-LIC-20261120 or PRATHAM-XXXX):', False);
  LicensePage.Add('Activation Key (e.g. ACT-XXXX-XXXX-XXXX):', False);
  LicensePage.Values[0] := '';
  LicensePage.Values[1] := '';

  // Create Custom Configuration Page for institute details and administrator credentials
  ConfigPage := CreateInputQueryPage(LicensePage.ID,
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
  ConfigPage.Values[3] := '8779123007';
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
      '  "serial_number": "' + LicensePage.Values[0] + '",' + #13#10 +
      '  "activation_key": "' + LicensePage.Values[1] + '",' + #13#10 +
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
    UpdateHostsFile(SanitizeSlug(ConfigPage.Values[0]));
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  BackupDir: String;
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    RemoveHostsEntries;
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
