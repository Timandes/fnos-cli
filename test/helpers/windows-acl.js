const path = require('node:path');
const { execFileSync } = require('node:child_process');

const executable = path.win32.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

function nativeModuleEnvironment(env) {
  return {
    ...Object.fromEntries(Object.entries(env).filter(([name]) => name.toLowerCase() !== 'psmodulepath')),
    PSModulePath: path.win32.join(path.win32.dirname(executable), 'Modules')
  };
}

function runWindowsPowerShell(script, env) {
  return execFileSync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
    env: nativeModuleEnvironment({ ...process.env, ...env }), encoding: 'utf8', windowsHide: true, timeout: 10000
  });
}

// Independent OS query: do not reuse the production script or its return value.
// Only this checker gets a native module path; protectPath keeps its real environment.
function readWindowsAcl(target) {
  const script = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$a = Get-Acl -LiteralPath $env:FNOS_ACL_TARGET
$id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
[pscustomobject]@{
  Protected = $a.AreAccessRulesProtected
  Expected = $id.User.Value
  Owner = $a.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
  Administrator = ([System.Security.Principal.WindowsPrincipal]::new($id)).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
  Rules = @($a.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | ForEach-Object {
    [pscustomobject]@{ SID = $_.IdentityReference.Value; Allow = $_.AccessControlType.ToString(); Inherited = $_.IsInherited; Rights = $_.FileSystemRights.ToString(); RightsBits = [int]$_.FileSystemRights; Inheritance = $_.InheritanceFlags.ToString(); Propagation = $_.PropagationFlags.ToString() }
  })
} | ConvertTo-Json -Depth 5 -Compress
`;
  return JSON.parse(runWindowsPowerShell(script, { FNOS_ACL_TARGET: target }).trim().replace(/^\uFEFF/, ''));
}

module.exports = { readWindowsAcl, runWindowsPowerShell, nativeModuleEnvironment };
