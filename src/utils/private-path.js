const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Use a new DACL: disabling inheritance alone would retain explicit grants.
const WINDOWS_ACL_SCRIPT = `
$ErrorActionPreference = 'Stop'
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
if ($env:FNOS_PRIVATE_DIRECTORY -eq '1') {
  $acl = New-Object System.Security.AccessControl.DirectorySecurity
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
} else {
  $acl = New-Object System.Security.AccessControl.FileSecurity
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'Allow')
}
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner($sid)
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $env:FNOS_PRIVATE_PATH -AclObject $acl
`;

/** Restrict an existing regular file/directory before any secret is written. */
function protectPath(target, directory = false, dependencies = {}) {
  try {
    const stat = fs.lstatSync(target);
    if (directory ? !stat.isDirectory() : !stat.isFile()) throw new Error('Not a regular private path');
    if ((dependencies.platform || process.platform) === 'win32') {
      const run = dependencies.execFileSync || execFileSync;
      const executable = path.win32.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      run(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_ACL_SCRIPT], {
        env: { ...process.env, FNOS_PRIVATE_PATH: target, FNOS_PRIVATE_DIRECTORY: directory ? '1' : '0' },
        stdio: 'ignore', windowsHide: true, timeout: 10000
      });
    } else {
      fs.chmodSync(target, directory ? 0o700 : 0o600);
    }
  } catch {
    throw new Error(require('../i18n').t('Failed to restrict private settings permissions.'));
  }
}

module.exports = { protectPath };
