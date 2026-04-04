#include "..\..\dist\windows-installer\metadata.iss"

[Setup]
AppId={{9FE95A8B-93AB-43B7-8B61-5C9AEB3910AB}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppUrl}
AppSupportURL={#MyAppUrl}
AppUpdatesURL={#MyAppUrl}
AppCopyright={#MyAppCopyright}
DefaultDirName={localappdata}\Veil
DefaultGroupName=Veil
DisableProgramGroupPage=yes
DisableDirPage=no
DisableWelcomePage=no
ChangesAssociations=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
MinVersion=10.0
LicenseFile=..\..\LICENSE
SetupIconFile=assets\veil-installer.ico
WizardImageFile=assets\veil-wizard.bmp
WizardSmallImageFile=assets\veil-wizard-small.bmp
OutputDir=..\..\dist
OutputBaseFilename=VeilSetup-{#MyAppVersion}
UninstallDisplayName=Veil

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#MyStageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{app}\.runtime"
Name: "{app}\.runtime\cache"
Name: "{app}\.runtime\cache\model"
Name: "{app}\.runtime\cache\hf"
Name: "{app}\.runtime\cache\hf\hub"
Name: "{app}\.runtime\cache\hf\transformers"
Name: "{app}\.runtime\cache\xdg"

[Icons]
Name: "{autoprograms}\Veil"; Filename: "{uninstallexe}"

[Code]
var
  ExtensionIdPage: TInputQueryWizardPage;
  ExtensionId: String;

function GetCliExtensionId(): String;
begin
  Result := Trim(ExpandConstant('{param:EXTENSION_ID|}'));
  if Result = '' then
    Result := Trim(ExpandConstant('{param:ExtensionId|}'));
end;

function NormalizeExtensionId(const Value: String): String;
var
  I: Integer;
begin
  Result := Lowercase(Trim(Value));
  if Length(Result) <> 32 then
  begin
    Result := '';
    exit;
  end;

  for I := 1 to Length(Result) do
  begin
    if (Result[I] < 'a') or (Result[I] > 'p') then
    begin
      Result := '';
      exit;
    end;
  end;
end;

function ResolveExtensionId(): String;
begin
  Result := NormalizeExtensionId(GetCliExtensionId());
  if Result <> '' then
    exit;
  if Assigned(ExtensionIdPage) then
    Result := NormalizeExtensionId(ExtensionIdPage.Values[0]);
end;

procedure InitializeWizard();
begin
  if GetCliExtensionId() <> '' then
    exit;

  ExtensionIdPage := CreateInputQueryPage(
    wpSelectDir,
    'Connect Veil To Your Browser Extension',
    'Paste the Veil extension ID',
    'Veil must know the browser extension ID so it can register the native messaging host on Windows. ' +
    'For unpacked installs, open chrome://extensions, find Veil, and copy the 32-character ID. ' +
    'Silent installs can pass /EXTENSION_ID=<id>.'
  );
  ExtensionIdPage.Add('Extension ID:', False);
  ExtensionIdPage.Values[0] := GetCliExtensionId();
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if Assigned(ExtensionIdPage) and (CurPageID = ExtensionIdPage.ID) then
  begin
    ExtensionId := ResolveExtensionId();
    if ExtensionId = '' then
    begin
      MsgBox(
        'Enter a valid 32-character Chrome/Edge extension ID using letters a through p.',
        mbError,
        MB_OK
      );
      Result := False;
    end;
  end;
end;

procedure RegisterNativeHost();
var
  ResultCode: Integer;
  NativeHostScript: String;
  Params: String;
  CmdParams: String;
begin
  ExtensionId := ResolveExtensionId();
  if ExtensionId = '' then
    RaiseException('A valid Veil extension ID is required to finish Windows setup.');

  NativeHostScript := ExpandConstant('{app}\server\native-host\install_windows.bat');
  Params := '"' + ExtensionId + '"';
  CmdParams := '/C ""' + NativeHostScript + '" ' + Params + '"';
  if not Exec(ExpandConstant('{cmd}'), CmdParams, ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    RaiseException('Failed to launch Veil native-host registration.');
  if ResultCode <> 0 then
    RaiseException('Veil native-host registration failed with exit code ' + IntToStr(ResultCode) + '.');
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    RegisterNativeHost();
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
  NativeHostUninstall: String;
  AutostartUninstall: String;
  CmdParams: String;
begin
  if CurUninstallStep <> usUninstall then
    exit;

  NativeHostUninstall := ExpandConstant('{app}\server\native-host\uninstall_windows.bat');
  if FileExists(NativeHostUninstall) then
  begin
    CmdParams := '/C ""' + NativeHostUninstall + '""';
    Exec(ExpandConstant('{cmd}'), CmdParams, ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;

  AutostartUninstall := ExpandConstant('{app}\server\autostart\uninstall_windows.bat');
  if FileExists(AutostartUninstall) then
  begin
    CmdParams := '/C ""' + AutostartUninstall + '""';
    Exec(ExpandConstant('{cmd}'), CmdParams, ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
