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
;  * @updated     2026-11-25
;  *
;  * @description Inno Setup Script: Packages PrathamOne EduOS, embedded PostgreSQL 16,
;  *              Python backend runtime, and compiled React SPA into a single zero-knowledge installer.
;  */

#define MyAppName "PrathamOne EduOS"
#define MyAppDirName "PrathamOneEduOS"
#ifndef MyAppVersion
  #define MyAppVersion "1.185.0"
#endif
#ifndef MyAppFileVersion
  #define MyAppFileVersion "1.185.0.0"
#endif
#ifndef MyOutputBaseFilename
  #ifdef UseReleasePayload
    #define MyOutputBaseFilename "PrathamOne_EduOS_Setup"
  #else
    #define MyOutputBaseFilename "PrathamOne-EduOS-Setup-v" + MyAppVersion
  #endif
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
OutputBaseFilename={#MyOutputBaseFilename}
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
Name: "{app}"
Name: "{localappdata}\{#MyAppDirName}"
Name: "{localappdata}\{#MyAppDirName}\data"
Name: "{localappdata}\{#MyAppDirName}\backups"
Name: "{localappdata}\{#MyAppDirName}\logs"

[Files]
#ifdef UseReleasePayload
; Self-contained Windows Release Payload (Nuitka standalone backend + Cython .pyd + WebView2 C# shell + PostgreSQL + React SPA)
Source: "..\build_staging\release_payload\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
#else
; Branding and Icon Assets
Source: "assets\app_icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\wizard_large.bmp"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\wizard_small.bmp"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\widelogo.png"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\widelogo.svg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\prathamone_emblem.png"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\prathamone_emblem.svg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\Splash.gif"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "assets\Image.jpg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "..\frontend\public\artwork\25112026\batch_g44.svg"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "..\frontend\public\artwork\25112026\batch_g46.svg"; DestDir: "{app}\assets"; Flags: ignoreversion

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

; Microsoft Edge WebView2 Managed & Native Runtime Libraries
Source: "files\Microsoft.Web.WebView2.Core.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\Microsoft.Web.WebView2.WinForms.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\WebView2Loader.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "files\runtimes\*"; DestDir: "{app}\runtimes"; Flags: ignoreversion recursesubdirs createallsubdirs
#endif

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\Stop PrathamOne EduOS"; Filename: "{app}\StopPrathamOne.exe"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Desktop App Mode)"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Web Browser Mode)"; Filename: "http://localhost:2026"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Web Portal HTTPS)"; Filename: "https://prathamone:2026"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\PrathamOne EduOS (Console Mode)"; Filename: "{app}\PrathamOneLauncher.bat"; WorkingDir: "{app}"; IconFilename: "{app}\assets\app_icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

[Run]
; 0. Verify and install Microsoft Edge WebView2 Runtime silently if missing on target machine
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""& {{ [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://go.microsoft.com/fwlink/p/?LinkId=2124703', '$env:TEMP\MicrosoftEdgeWebview2Setup.exe'); Start-Process -FilePath '$env:TEMP\MicrosoftEdgeWebview2Setup.exe' -ArgumentList '/silent /install' -Wait }}"""; Flags: runhidden; StatusMsg: "Verifying and configuring Microsoft Edge WebView2 Runtime..."; Check: not IsWebView2Installed

; 1. Initialize PostgreSQL cluster in user-writable data root if data folder doesn't exist
Filename: "{app}\pgsql\bin\initdb.exe"; Parameters: "-D ""{code:GetWritableDataRoot}\data"" -U postgres -A trust --encoding=UTF8 --locale=C --no-instructions"; WorkingDir: "{app}\pgsql\bin"; Flags: runhidden skipifdoesntexist; StatusMsg: "Initializing local database cluster..."; Check: NeedsDbInit

; 2. Add Windows Firewall rule for ports 2026, HTTP 80, and HTTPS 443
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""PrathamOne EduOS Local Network"" dir=in action=allow protocol=TCP localport=2026,80,443"; Flags: runhidden; Tasks: firewallrule

; 3. Setup port 80 and port 443 proxy so users can access without port (http://... and https://...)
Filename: "netsh"; Parameters: "interface portproxy add v4tov4 listenport=80 listenaddress=127.0.0.1 connectport=2026 connectaddress=127.0.0.1"; Flags: runhidden
Filename: "netsh"; Parameters: "interface portproxy add v4tov4 listenport=443 listenaddress=127.0.0.1 connectport=2026 connectaddress=127.0.0.1"; Flags: runhidden

; 4. Generate local TLS security certificates uniquely on this computer (never packaged in installer)
#ifdef UseReleasePayload
Filename: "{app}\backend\prathamone_backend.exe"; Parameters: "--generate-ssl"; WorkingDir: "{app}\backend"; Flags: runhidden; StatusMsg: "Generating local trusted TLS security certificates..."
#else
Filename: "{app}\python\python.exe"; Parameters: """{app}\scripts\generate_ssl_certificates.py"""; WorkingDir: "{app}"; Flags: runhidden; StatusMsg: "Generating local trusted TLS security certificates..."
#endif

; 5. Register newly generated machine-local Root CA into Windows Trusted Root Store (eliminates "Not secure" / untrusted certificate warnings)
Filename: "certutil.exe"; Parameters: "-addstore -f ""ROOT"" ""{app}\assets\Smritisys_AITDL_Local_CA.cer"""; Flags: runhidden; Tasks: installrootca; StatusMsg: "Configuring local trusted SSL security certificate..."

; 6. Run automated domain and network configuration (guarantees hosts entries, port 80/443 proxy, and DNS cache flush)
#ifdef UseReleasePayload
Filename: "{app}\backend\prathamone_backend.exe"; Parameters: "--configure-domains"; WorkingDir: "{app}\backend"; Flags: runhidden; StatusMsg: "Finalizing domain routing and local network configuration..."
#else
Filename: "{app}\python\python.exe"; Parameters: """{app}\scripts\configure_local_domains.py"" --no-pause --skip-ca"; WorkingDir: "{app}"; Flags: runhidden; StatusMsg: "Finalizing domain routing and local network configuration..."
#endif

; 7. Option to launch immediately
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop running services cleanly via native Stop executable
Filename: "{app}\StopPrathamOne.exe"; Flags: runhidden skipifdoesntexist; RunOnceId: "StopPrathamOne"
Filename: "taskkill"; Parameters: "/F /IM PrathamOne.exe /IM prathamone_backend.exe /IM pythonw.exe /IM postgres.exe"; Flags: runhidden; RunOnceId: "StopPython"
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
  PasswordPage: TInputQueryWizardPage;
  LogoPage: TInputFileWizardPage;
  AcademicPage: TInputOptionWizardPage;
  MediumPage: TInputOptionWizardPage;
  AdminPasswordValue: String;
  DbPortValue: String;

function IsWebView2Installed: Boolean;
var
  Version: String;
begin
  Result := False;
  // 1. Check 64-bit / 32-bit Uninstall registry keys
  if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Microsoft EdgeWebView', 'DisplayVersion', Version) then
  begin
    if (Version <> '') and (Version <> '0.0.0.0') then
      Result := True;
  end;
  if not Result and RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Microsoft EdgeWebView', 'DisplayVersion', Version) then
  begin
    if (Version <> '') and (Version <> '0.0.0.0') then
      Result := True;
  end;
  if not Result and RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\Microsoft EdgeWebView', 'DisplayVersion', Version) then
  begin
    if (Version <> '') and (Version <> '0.0.0.0') then
      Result := True;
  end;
  // 2. Check EdgeUpdate Clients registry keys
  if not Result and RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-23EC-4867-A98B-9140B4800D60}', 'pv', Version) then
  begin
    if (Version <> '') and (Version <> '0.0.0.0') then
      Result := True;
  end;
  if not Result and RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-23EC-4867-A98B-9140B4800D60}', 'pv', Version) then
  begin
    if (Version <> '') and (Version <> '0.0.0.0') then
      Result := True;
  end;
  if not Result and RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-23EC-4867-A98B-9140B4800D60}', 'pv', Version) then
  begin
    if (Version <> '') and (Version <> '0.0.0.0') then
      Result := True;
  end;
end;

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
        // 3. Custom institute/classes name without any space if different
        if (ClassesSlug <> '') and (ClassesSlug <> 'prathamone') and (ClassesSlug <> 'classesname') and (ClassesSlug <> 'youracademyname') and (Pos(Lowercase(ClassesSlug), Lowercase(String(HostsContent))) = 0) then
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

function GetExistingInstallDir: String;
var
  RegPath: String;
begin
  Result := '';
  if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{C47F8932-B8E2-4C10-9118-E86940A39BF1}_is1', 'InstallLocation', RegPath) then
  begin
    if (RegPath <> '') and DirExists(RegPath) then
      Result := RegPath;
  end;
  if (Result = '') and RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{C47F8932-B8E2-4C10-9118-E86940A39BF1}_is1', 'InstallLocation', RegPath) then
  begin
    if (RegPath <> '') and DirExists(RegPath) then
      Result := RegPath;
  end;
end;

function GetWritableDataRoot(Param: String): String;
var
  InstallBase: String;
  ProgFiles: String;
  InProgramFiles: Boolean;
begin
  InstallBase := '';
  if WizardForm <> nil then
  begin
    try
      InstallBase := WizardDirValue;
    except
      InstallBase := '';
    end;
  end;
  if InstallBase = '' then
    InstallBase := ExpandConstant('{app}');

  ProgFiles := Lowercase(ExpandConstant('{autopf}'));
  InProgramFiles := (ProgFiles <> '') and (Pos(ProgFiles, Lowercase(InstallBase)) = 1);

  if (not InProgramFiles) and FileExists(AddBackslash(InstallBase) + 'data\PG_VERSION') then
  begin
    Result := RemoveBackslash(InstallBase);
    Exit;
  end;

  Result := ExpandConstant('{localappdata}\{#MyAppDirName}');
end;

function DetectPostgresPort(DataDir: String): String;
var
  OptsContent: AnsiString;
begin
  Result := '5432';
  if FileExists(AddBackslash(DataDir) + 'postmaster.opts') then
  begin
    if LoadStringFromFile(AddBackslash(DataDir) + 'postmaster.opts', OptsContent) then
    begin
      if Pos('5433', String(OptsContent)) > 0 then
        Result := '5433';
    end;
  end;
end;

function GenerateRandomBootstrapSecret: String;
var
  Charset: String;
  I: Integer;
begin
  Charset := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  Result := '';
  for I := 1 to 18 do
    Result := Result + Charset[Random(Length(Charset)) + 1];
end;

function IsUpgradeMode: Boolean;
var
  ExistingDir: String;
  TargetDir: String;
  LocalDataDir: String;
begin
  LocalDataDir := ExpandConstant('{localappdata}\{#MyAppDirName}\data\PG_VERSION');
  if FileExists(LocalDataDir) then
  begin
    Result := True;
    Exit;
  end;

  if WizardForm <> nil then
  begin
    try
      TargetDir := WizardDirValue;
      if TargetDir <> '' then
      begin
        Result := FileExists(AddBackslash(TargetDir) + 'data\PG_VERSION') or
                  FileExists(AddBackslash(TargetDir) + 'setup_config.json');
        Exit;
      end;
    except
    end;
  end;

  ExistingDir := GetExistingInstallDir;
  if (ExistingDir <> '') and DirExists(ExistingDir) then
  begin
    Result := FileExists(AddBackslash(ExistingDir) + 'data\PG_VERSION') or
              FileExists(AddBackslash(ExistingDir) + 'setup_config.json');
    Exit;
  end;

  Result := False;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  if IsUpgradeMode then
  begin
    // Skip all initial onboarding wizard pages during in-place upgrade (Rule 013)
    if (PageID = LicensePage.ID) or
       (PageID = ConfigPage.ID) or
       (PageID = PasswordPage.ID) or
       (PageID = LogoPage.ID) or
       (PageID = AcademicPage.ID) or
       (PageID = MediumPage.ID) then
    begin
      Result := True;
    end;
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if IsUpgradeMode and (CurPageID = wpReady) then
  begin
    WizardForm.PageNameLabel.Caption := 'Ready to Upgrade';
    WizardForm.PageDescriptionLabel.Caption := 'Setup is ready to upgrade PrathamOne EduOS to version ' + '{#MyAppVersion}' + '. All student data, attendance, and fee ledgers will be safely preserved.';
  end;
end;

function GetSmartInstallDir(AppName: String): String;
var
  SysDrive: String;
  DriveCode: Integer;
  DriveLetter: String;
  DrivePath: String;
  BestDrive: String;
  ExistingDir: String;
begin
  ExistingDir := GetExistingInstallDir;
  if ExistingDir <> '' then
  begin
    Result := ExistingDir;
    Exit;
  end;

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
  Exec('taskkill.exe', '/F /IM PrathamOne.exe /IM prathamone_backend.exe /IM pythonw.exe /IM postgres.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  // 2. Remove stale database lock if updating/reinstalling across possible paths
  if FileExists(ExpandConstant('{localappdata}\{#MyAppDirName}\data\postmaster.pid')) then
    DeleteFile(ExpandConstant('{localappdata}\{#MyAppDirName}\data\postmaster.pid'));
  if FileExists(ExpandConstant('{autopf}\{#MyAppName}\data\postmaster.pid')) then
    DeleteFile(ExpandConstant('{autopf}\{#MyAppName}\data\postmaster.pid'));
  if FileExists(ExpandConstant('{autopf}\{#MyAppDirName}\data\postmaster.pid')) then
    DeleteFile(ExpandConstant('{autopf}\{#MyAppDirName}\data\postmaster.pid'));
  if FileExists('D:\' + '{#MyAppDirName}\data\postmaster.pid') then
    DeleteFile('D:\' + '{#MyAppDirName}\data\postmaster.pid');
  if (GetExistingInstallDir <> '') and FileExists(GetExistingInstallDir + '\data\postmaster.pid') then
    DeleteFile(GetExistingInstallDir + '\data\postmaster.pid');
end;

function HasPythonExe: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\python\python.exe'));
end;

function NeedsDbInit: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\pgsql\bin\initdb.exe')) and (not FileExists(GetWritableDataRoot('') + '\data\PG_VERSION'));
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

  // Create Custom Configuration Page for institute profile details (4 fields fit cleanly without scrolling/clipping)
  ConfigPage := CreateInputQueryPage(LicensePage.ID,
    'Institute & Academy Profile Setup',
    'Personalize PrathamOne EduOS for your coaching institute, academy, or school',
    'Please enter your institution details. These details will appear on student admission forms, receipts, and marksheets:');

  ConfigPage.Add('Coaching Institute / Academy / School Name:', False);
  ConfigPage.Add('Primary Branch / Campus Name:', False);
  ConfigPage.Add('Campus Address && City:', False);
  ConfigPage.Add('Helpline / Contact Phone:', False);

  ConfigPage.Values[0] := 'Your Academy Name';
  ConfigPage.Values[1] := 'Main Campus';
  ConfigPage.Values[2] := '123 Education Hub, MG Road';
  ConfigPage.Values[3] := '';

  // Dedicated Administrator Password Page (keeps both password + confirmation clearly visible)
  PasswordPage := CreateInputQueryPage(ConfigPage.ID,
    'Administrator Account Security',
    'Create a strong administrator password for your institute',
    'Enter and confirm a secure password (minimum 14 characters) for the initial administrator account:');

  PasswordPage.Add('Administrator Password (min 14 characters):', True);
  PasswordPage.Add('Confirm Administrator Password:', True);
  PasswordPage.Values[0] := '';
  PasswordPage.Values[1] := '';

  // Academy Official Logo Selection Page (Optional)
  LogoPage := CreateInputFilePage(PasswordPage.ID,
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
  end;

  if CurPageID = PasswordPage.ID then
  begin
    if Length(PasswordPage.Values[0]) < 14 then
    begin
      MsgBox('The administrator password must contain at least 14 characters for security.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if PasswordPage.Values[0] <> PasswordPage.Values[1] then
    begin
      MsgBox('The administrator passwords do not match. Please re-enter them.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    AdminPasswordValue := PasswordPage.Values[0];
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  JsonContent: String;
  SelectedBoards: String;
  SelectedMediums: String;
  EscapedLogoPath: String;
  BackupDir: String;
  BackupTarget: String;
  DumpFile: String;
  DataRootDir: String;
  DataDir: String;
  PgCtl: String;
  PgDump: String;
  PgPort: String;
  ResultCode: Integer;
begin
  // 1. Rule 013 & DPDP: Automated logical pg_dump + data snapshot before copying binaries on upgrade
  if (CurStep = ssInstall) and IsUpgradeMode then
  begin
    DataRootDir := GetWritableDataRoot('');
    DataDir := DataRootDir + '\data';
    if not DirExists(DataDir) then
      DataDir := ExpandConstant('{app}\data');
    if (not DirExists(DataDir)) and (GetExistingInstallDir <> '') then
      DataDir := GetExistingInstallDir + '\data';

    if DirExists(DataDir) then
    begin
      BackupDir := DataRootDir + '\backups';
      ForceDirectories(BackupDir);
      PgPort := DetectPostgresPort(DataDir);
      PgCtl := ExpandConstant('{app}\pgsql\bin\pg_ctl.exe');
      PgDump := ExpandConstant('{app}\pgsql\bin\pg_dump.exe');

      if FileExists(PgDump) and FileExists(PgCtl) and FileExists(DataDir + '\PG_VERSION') then
      begin
        Exec(PgCtl, 'start -w -t 30 -D "' + DataDir + '" -o "-p ' + PgPort + '" -l "' + DataDir + '\pg_upgrade_backup.log"', ExpandConstant('{app}\pgsql\bin'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
        DumpFile := BackupDir + '\pre_upgrade_v' + '{#MyAppVersion}' + '_' + GetDateTimeString('yyyymmdd_hhnnss', #0, #0) + '.dump';
        Exec(PgDump, '-h 127.0.0.1 -p ' + PgPort + ' -U postgres -Fc -f "' + DumpFile + '" prashant_academy', ExpandConstant('{app}\pgsql\bin'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
        Exec(PgCtl, 'stop -w -t 15 -D "' + DataDir + '" -m fast', ExpandConstant('{app}\pgsql\bin'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
      end;

      BackupTarget := BackupDir + '\pre_upgrade_snapshot_v' + '{#MyAppVersion}' + '_' + GetDateTimeString('yyyymmdd_hhnnss', #0, #0);
      Exec('robocopy.exe', '"' + DataDir + '" "' + BackupTarget + '" /E /R:1 /W:1 /NP /NFL /NDL /NJH /NJS', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;

  // 2. Post-installation configuration
  if CurStep = ssPostInstall then
  begin
    // Rule 013: ONLY generate transient bootstrap config on FRESH install
    if not IsUpgradeMode then
    begin
      DataRootDir := GetWritableDataRoot('');
      ForceDirectories(DataRootDir);
      if AdminPasswordValue = '' then
        AdminPasswordValue := GenerateRandomBootstrapSecret;

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
        '  "bootstrap_admin_secret": "' + AdminPasswordValue + '",' + #13#10 +
        '  "boards": "' + SelectedBoards + '",' + #13#10 +
        '  "mediums": "' + SelectedMediums + '",' + #13#10 +
        '  "port": 2026' + #13#10 +
        '}';

      SaveStringToFile(DataRootDir + '\setup_config.json', JsonContent, False);
      UpdateHostsFile(SanitizeSlug(ConfigPage.Values[0]));
    end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  BackupDir: String;
  DataDir: String;
  PgCtl: String;
  PgDump: String;
  PgPort: String;
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    RemoveHostsEntries;
    DataDir := ExpandConstant('{localappdata}\{#MyAppDirName}\data');
    if not DirExists(DataDir) then
      DataDir := ExpandConstant('{app}\data');

    PgCtl := ExpandConstant('{app}\pgsql\bin\pg_ctl.exe');
    PgDump := ExpandConstant('{app}\pgsql\bin\pg_dump.exe');

    if (not UninstallSilent) and DirExists(DataDir) and FileExists(PgDump) and FileExists(DataDir + '\PG_VERSION') then
    begin
      if MsgBox('Would you like to save a safety backup of your student and fee database in your Documents folder before uninstalling?', mbConfirmation, MB_YESNO) = IDYES then
      begin
        BackupDir := ExpandConstant('{userdocs}\PrathamOne_Backups');
        ForceDirectories(BackupDir);
        PgPort := DetectPostgresPort(DataDir);
        if FileExists(PgCtl) then
          Exec(PgCtl, 'start -w -t 30 -D "' + DataDir + '" -o "-p ' + PgPort + '" -l "' + DataDir + '\pg_uninstall_backup.log"', ExpandConstant('{app}\pgsql\bin'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
        Exec(PgDump, '-h 127.0.0.1 -p ' + PgPort + ' -U postgres -Fc -f "' + BackupDir + '\prathamone_uninstall_backup.dump" prashant_academy', ExpandConstant('{app}\pgsql\bin'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
        if FileExists(PgCtl) then
          Exec(PgCtl, 'stop -w -t 15 -D "' + DataDir + '" -m fast', ExpandConstant('{app}\pgsql\bin'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
        MsgBox('Database backup saved to: ' + BackupDir, mbInformation, MB_OK);
      end;

      if MsgBox('Keep your local database and records for future reinstalls?' + #13#10 + #13#10 + 'Select YES to preserve your data folder (' + DataDir + '), or NO to permanently delete all local database files.', mbConfirmation, MB_YESNO or MB_DEFBUTTON1) = IDNO then
      begin
        DelTree(DataDir, True, True, True);
      end;
    end;
  end;
end;
