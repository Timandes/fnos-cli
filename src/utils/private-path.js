const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Use a new DACL: disabling inheritance alone would retain explicit grants.
const WINDOWS_ACL_SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
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
if ($env:FNOS_PRIVATE_DIRECTORY -eq '1') {
  [System.IO.Directory]::SetAccessControl($env:FNOS_PRIVATE_PATH, $acl)
} else {
  [System.IO.File]::SetAccessControl($env:FNOS_PRIVATE_PATH, $acl)
}
} catch {
  $exception = $_.Exception
  while ($null -ne $exception) {
    [Console]::Error.WriteLine('FNOS_ACL_EXCEPTION:' + $exception.GetType().FullName)
    [Console]::Error.WriteLine('FNOS_ACL_HRESULT:' + $exception.HResult)
    $exception = $exception.InnerException
  }
  exit 1
}
`;

// Never retain raw subprocess errors: their message/output can contain secrets.
const SAFE_EXCEPTIONS = new Set([
  'System.UnauthorizedAccessException', 'System.IO.IOException',
  'System.IO.FileNotFoundException', 'System.IO.DirectoryNotFoundException', 'System.IO.PathTooLongException',
  'System.ArgumentException', 'System.ArgumentNullException', 'System.NotSupportedException',
  'System.Security.SecurityException', 'System.Security.AccessControl.PrivilegeNotHeldException',
  'System.Security.Principal.IdentityNotMappedException',
  'System.Management.Automation.MethodInvocationException', 'System.Management.Automation.CmdletInvocationException',
  'System.Management.Automation.RuntimeException', 'System.Management.Automation.CommandNotFoundException'
]);

function safeDiagnostics(error) {
  const diagnostics = { status: Number.isInteger(error?.status) ? error.status : null, exceptionTypes: [] };
  if (['ENOENT', 'EACCES', 'EPERM', 'ETIMEDOUT', 'ENOBUFS', 'E2BIG', 'EINVAL', 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'].includes(error?.code)) diagnostics.code = error.code;
  if (['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGABRT'].includes(error?.signal)) diagnostics.signal = error.signal;
  const stderr = Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : typeof error?.stderr === 'string' ? error.stderr : '';
  for (const line of stderr.split(/\r?\n/)) {
    const type = line.startsWith('FNOS_ACL_EXCEPTION:') ? line.slice('FNOS_ACL_EXCEPTION:'.length) : '';
    if (SAFE_EXCEPTIONS.has(type) && !diagnostics.exceptionTypes.includes(type)) diagnostics.exceptionTypes.push(type);
    if (/^FNOS_ACL_HRESULT:-?\d{1,10}$/.test(line)) {
      const hresult = Number(line.slice('FNOS_ACL_HRESULT:'.length));
      if (hresult >= -2147483648 && hresult <= 2147483647) diagnostics.hresult = hresult;
    }
  }
  return diagnostics;
}

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
        stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true, timeout: 10000
      });
    } else {
      fs.chmodSync(target, directory ? 0o700 : 0o600);
    }
  } catch (error) {
    const failure = new Error(require('../i18n').t('Failed to restrict private settings permissions.'), { cause: safeDiagnostics(error) });
    failure.code = 'ERR_FNOS_PRIVATE_PATH';
    throw failure;
  }
}

module.exports = { protectPath };
