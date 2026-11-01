# Command Reference

fnos-cli exposes 111 commands across 21 domains.

## Help and Command Syntax

Use `fnos --help` to list command groups, `fnos user --help` to list user commands, and `fnos user getPreference --help` to inspect command-specific options.
Each level includes its available global options. Business groups and commands also show authentication options.
Running bare `fnos` or only a language option such as `fnos --lang en` writes help to stderr and exits with code 1. Explicit `--help` writes to stdout and exits with code 0.

Business commands use `fnos <domain> <command> [options]`. Existing dotted calls such as `fnos user.info` remain supported but are hidden from top-level help and completion.

## Language and Preferences

The default display language is Simplified Chinese (`zh-CN`); English is `en`.
Priority: `--lang <locale>` > `FNOS_LANG` > saved `language` preference > `zh-CN`.
Use `fnos --lang en user --help` or `FNOS_LANG=en fnos user info` for a temporary override.

- `fnos config set language en`: save a preference without changing credentials.
- `fnos config get language [--raw]`: show the saved language, effective language, and source.
- `fnos config unset language`: clear the preference. Overrides still apply.

Preferences live at the top level of `~/.fnos/settings.json`. JSON output, command names, option names, and server messages are not translated.
After changing languages, run `fnos completion install zsh` again to update static completion descriptions.

## Authentication Commands

- `fnos login -e <endpoint> -u <username>`: password login (default), with a hidden interactive prompt.
- `fnos login -e <endpoint> -u <username> --password-stdin`: read a password from piped or redirected stdin through EOF.
- `-p, --password <password>` remains supported and is mutually exclusive with `--password-stdin`.
- `fnos login --auth oauth --server <name> -e https://<host>:<port>`: interactive browser authorization and code entry.
- `--verify-ssl` enables strict HTTPS certificate verification; login saves the policy with that server. Verification is disabled by default, including for older OAuth records.
- HTTP origins work without an extra flag; `--verify-ssl` requires an HTTPS origin for OAuth.
- `fnos auth.status --server <name> [--raw]`: local metadata only; does not verify server access.
- `fnos logout --server <name>`: clear the selected local credential record.

Saved servers choose their authentication transport automatically. Existing records without `authType` use password authentication. OAuth login requires a TTY; business commands reuse and refresh saved sessions without prompting.

Passwords are stored as versioned AES-256-GCM ciphertext, using a random local key at `~/.fnos/password.key`. Unix files use mode 0600; Windows uses a protected current-user ACL. Legacy plaintext records migrate on credential access or settings writes. Completion lookups are read-only. Missing keys or moved installations may require login again; damaged keys are not overwritten. Older CLI versions cannot read the new ciphertext.

## Shared Authentication Options

Every business command accepts these authentication options.
They can appear before or after the subcommand, for example `fnos user --server office info` or `fnos user info --server office`.

| Option | Description |
|---|---|
| `-s, --server <name>` | Saved server name. |
| `-e, --endpoint <endpoint>` | Temporary server endpoint. |
| `-u, --username <username>` | Temporary username. |
| `-p, --password <password>` | Temporary password. |
| `--password-stdin` | Read one password from standard input, preserving spaces and removing one trailing LF/CRLF. |
| `--twofa-code <code>` | Six-digit two-factor code. |
| `--trust-device` | Trust this device after two-factor login. |
| `--verify-ssl` | Verify HTTPS/WSS certificates; login saves the policy. Default: disabled. |

`--server` cannot be combined with `-e`, `-u`, `-p`, or `--password-stdin`. Temporary endpoint and username must be supplied together. Without a password option, a TTY prompts without echo; noninteractive calls fail with guidance. Empty or multiline passwords are rejected.

## resmon

Resource monitoring for the server: inspect processor, memory, disk, and network usage

### `resmon cpu`

Get CPU resource monitoring information to inspect processor usage on the selected server

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon cpu --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`
- `fnos resmon processes --help`

### `resmon gpu`

Get GPU resource monitoring information to inspect graphics processor usage on the server

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon gpu --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`
- `fnos resmon processes --help`

### `resmon mem`

Get memory resource monitoring information to inspect memory usage on the selected server

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon mem --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`
- `fnos resmon processes --help`

### `resmon disk`

Get disk resource monitoring information to observe resource activity related to storage reads and writes

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon disk --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`
- `fnos resmon processes --help`

### `resmon net`

Get network resource monitoring information to observe network transfer activity on the server

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon net --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`
- `fnos resmon processes --help`

### `resmon gen`

Get general resource monitoring information, selecting monitoring items to inspect multiple resource metrics

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- `--items <items>` — Comma-separated monitoring items; optional; comma-separated list; default: null

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- CSV values split on commas, trim surrounding whitespace, and discard empty entries; supplied values require at least one item, with no escaping for literal commas.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- When items is omitted, the SDK requests storeSpeed, netSpeed, cpuBusy, and memPercent; use these item spellings exactly.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon gen --server office --raw
```

#### Related Commands

- `fnos resmon processes --help`

### `resmon npu`

Get NPU resource monitoring information to inspect neural processing unit usage on the server

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon npu --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`
- `fnos resmon processes --help`

### `resmon processes`

List monitored processes to investigate resource usage at the process level

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon processes --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`

### `resmon serviceProcesses`

List monitored service processes to inspect processes associated with server services

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon serviceProcesses --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`
- `fnos resmon processes --help`

### `resmon systemFan`

Get system fan monitoring information to inspect fan-related metrics returned by the server

#### Purpose

- Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.

#### Objects and Relationships

- Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos resmon systemFan --server office --raw
```

#### Related Commands

- `fnos resmon gen --help`
- `fnos resmon processes --help`

## event

Event logs for the server: inspect event entries to understand activity and investigate problems

### `event commonList`

List common event log entries to inspect server events and investigate problems

#### Purpose

- Use event entries to understand server activity and investigate problems.

#### Objects and Relationships

- Event entries come from the selected server, not the computer running the CLI.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns event log entries supplied by the server.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos event commonList --server office --raw
```

#### Related Commands

- `fnos sysinfo getTrimVersion --help`

## notify

Notifications: query unread counts to determine whether the current account has notifications to review

### `notify unreadTotal`

Get unread notification total to determine whether the current account has notifications to review

#### Purpose

- Check whether the current account has notifications to review.

#### Objects and Relationships

- Notification queries use the selected server and the authenticated account context.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns an unread notification count; this endpoint does not return notification bodies.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos notify unreadTotal --server office --raw
```

#### Related Commands

- `fnos user info --help`

## store

Storage and disks: query disks, SMART, and storage state, distinguishing devices, arrays, and user storage

### `store general`

Get storage general information for an overview of storage on the selected server

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store general --server office --raw
```

#### Related Commands

- `fnos store listDisk --help`
- `fnos store state --help`

### `store calcSpace`

Calculate storage space information for the selected server

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store calcSpace --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`
- `fnos store state --help`

### `store listDisk`

List disk information, excluding hot spares by default and providing device names for SMART queries

#### Purpose

- Discover server disks and their device names to select targets for SMART and other detail queries.

#### Objects and Relationships

- The returned disk[].name is a disk device name accepted by store diskSmart --disk on the same server.

#### Parameter Contract

- `--no-hot-spare <boolean>` — Exclude hot spare disks; optional; boolean; default: true; allowed: true, false

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Boolean options require an explicit true or false value; the option name alone is insufficient.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- true excludes hot spares; false does not exclude them. The default result is not an exhaustive disk inventory.
- Reads disk information without changing disk configuration or starting a SMART self-test.

#### Results

- Returns the disk list with device names at disk[].name. Listing disks does not constitute a disk health check.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store listDisk --server office --raw
fnos store listDisk --server office --no-hot-spare false --raw
```

#### Related Commands

- `fnos store diskSmart --help`
- `fnos store state --help`

### `store diskSmart`

Get disk SMART information by device name without starting a SMART self-test

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- `--disk` is a disk device name from disk[].name returned by store listDisk on the same server, not an array UUID or file path.

#### Parameter Contract

- `--disk <disk>` — Disk device name; required; non-empty string

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads SMART information without starting a SMART self-test.

#### Results

- Returns disk SMART information; available fields vary by device. Missing metrics do not imply normal values, and request success alone does not establish disk health.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos store diskSmart --server office --disk '<disk>' --raw
```

#### Related Commands

- `fnos store listDisk --help`

### `store state`

Get storage state information, selecting arrays by name or UUID

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- `--name <names>` — Comma-separated array names; optional; comma-separated list; default: []
- `--uuid <uuids>` — Comma-separated array UUIDs; optional; comma-separated list; default: []

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- CSV values split on commas, trim surrounding whitespace, and discard empty entries; supplied values require at least one item, with no escaping for literal commas.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Omitting name or uuid passes an empty array; an explicitly empty string is not equivalent to omission. Server semantics for combining both filters have not been confirmed.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store state --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`

### `store getUserStorage`

Get user storage information, optionally including space, storage details, or quota information

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- `--space-info <boolean>` — Include space information; optional; boolean; default: false; allowed: true, false
- `--stor-info <boolean>` — Include storage information; optional; boolean; default: false; allowed: true, false
- `--quota-info <boolean>` — Include quota information; optional; boolean; default: false; allowed: true, false

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Boolean options require an explicit true or false value; the option name alone is insufficient.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store getUserStorage --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`
- `fnos store state --help`

### `store getCacheDeviceState`

Get cache device state to inspect the current condition of server storage cache devices

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store getCacheDeviceState --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`
- `fnos store state --help`

### `store getDiskIdleTime`

Get disk idle time information to inspect disk inactivity on the server

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store getDiskIdleTime --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`
- `fnos store state --help`

### `store getDiskWakeup`

Get disk wake-up state to investigate disk sleep and wake-up behavior

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store getDiskWakeup --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`
- `fnos store state --help`

### `store getRemovableConfig`

Get removable device configuration to inspect server settings for removable storage

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store getRemovableConfig --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`
- `fnos store state --help`

### `store listCacheDevices`

List cache devices to identify storage cache devices on the selected server

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store listCacheDevices --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`
- `fnos store state --help`

### `store listRemovableDevices`

List removable devices to identify removable storage devices on the selected server

#### Purpose

- Inspect server storage to select disks, arrays, or user storage for subsequent queries.

#### Objects and Relationships

- Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos store listRemovableDevices --server office --raw
```

#### Related Commands

- `fnos store general --help`
- `fnos store listDisk --help`
- `fnos store state --help`

## file

Files and directories on the remote server: browse, modify, and query access permissions, shares, and trash

### `file ls`

List files and directories on the remote server, optionally specifying a directory to check operation targets

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- `--path <path>` — Directory path; optional; non-empty string; default: null

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file ls --server office --raw
```

#### Related Commands

- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file mkdir`

Create a directory at the specified remote path, modifying the selected server's directory structure

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- `--path <path>` — Directory path; required; non-empty string

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Creates a remote directory and changes the filesystem; the CLI provides no dry run or confirmation.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos file mkdir --server office --path '<path>' --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file rm`

Remove files or directories on the remote server, requesting trash by default unless explicitly disabled

#### Purpose

- Remove remote files or directories that are no longer needed, checking the server and target paths before invocation.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- `--files <files>` — Comma-separated file paths; required; comma-separated list
- `--move-to-trashbin <boolean>` — Move removed files to trash; optional; boolean; default: true; allowed: true, false
- `--details <json>` — File detail object as JSON; optional; JSON object; default: null

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Boolean options require an explicit true or false value; the option name alone is insufficient.
- CSV values split on commas, trim surrounding whitespace, and discard empty entries; supplied values require at least one item, with no escaping for literal commas.
- JSON must be an object, not an array or null; internal field schemas not explicitly documented have not been confirmed.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Trash availability is determined by the server; the internal details schema has not been confirmed and must not be guessed.
- Changes the remote filesystem with no dry run or confirmation. The default requests trash; false requests direct deletion.

#### Results

- Returns the server response to the removal operation. Requesting trash does not establish that the files can be recovered.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos file rm --server office --files '<files>' --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file getAcl`

Get file ACL information using vol-prefixed paths to query remote access controls

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- `--files` uses remote paths in vol{stor_id}/{path} form, not host absolute paths. Verify paths from other file endpoints before reusing them.

#### Parameter Contract

- `--files <files>` — Comma-separated vol-prefixed paths; required; comma-separated list

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- CSV values split on commas, trim surrounding whitespace, and discard empty entries; supplied values require at least one item, with no escaping for literal commas.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos file getAcl --server office --files '<files>' --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file listTrash --help`

### `file listAppDirectories`

List application directories to discover remote directories associated with server applications

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file listAppDirectories --server office --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file listFavorites`

List favorite files on the remote server to find entries favorited by the current account

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file listFavorites --server office --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file listDirectoryEntries`

List directory entries returned by the server to discover remote directories for browsing

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file listDirectoryEntries --server office --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file listRecent`

List recent files on the remote server to find recent file entries

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file listRecent --server office --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file listShared`

List shared files on the remote server to inspect file-sharing entries

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file listShared --server office --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file listSharedByOthers`

List files shared by others on the remote server to find entries shared by other users

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file listSharedByOthers --server office --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file listTeamTrashBins`

List team trash bins to discover trash bin objects associated with team files

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file listTeamTrashBins --server office --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`
- `fnos file listTrash --help`

### `file listTrash`

List trash entries to inspect file records in the remote trash

#### Purpose

- Browse or locate remote filesystem objects to check targets for file management operations.

#### Objects and Relationships

- Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the server file endpoint response; filenames and user data remain unchanged.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos file listTrash --server office --raw
```

#### Related Commands

- `fnos file ls --help`
- `fnos file getAcl --help`

## backup

Backup tasks on the server: query a specified backup direction to inspect its task list

### `backup listTasks`

List backup tasks for a specified direction; the direction option is required

#### Purpose

- Inspect backup task lists for a selected backup direction.

#### Objects and Relationships

- Tasks belong to the selected server. direction accepts only 0 or 1; their business meanings have not been confirmed.

#### Parameter Contract

- `--direction <integer>` — Backup direction: 0 or 1; required; integer; allowed: 0, 1

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns backup tasks for the specified direction without creating or starting a backup.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos backup listTasks --server office --direction 0 --raw
```

#### Related Commands

- `fnos sysinfo getTrimVersion --help`

## download

Download tasks and settings: inspect tasks, statistics, and the server's default download directory

### `download getDefaultSaveDirectory`

Get the default download directory to check the default save location used by server download tasks

#### Purpose

- Inspect download center tasks, statistics, or the default save location.

#### Objects and Relationships

- Download tasks and save directories belong to the selected server; a state bit mask filters tasks and is not a task ID.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the response from the selected download center endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos download getDefaultSaveDirectory --server office --raw
```

#### Related Commands

- `fnos download queryTasks --help`
- `fnos download getStatistics --help`

### `download getStatistics`

Get download statistics to inspect statistical information from the server's download center

#### Purpose

- Inspect download center tasks, statistics, or the default save location.

#### Objects and Relationships

- Download tasks and save directories belong to the selected server; a state bit mask filters tasks and is not a task ID.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the response from the selected download center endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos download getStatistics --server office --raw
```

#### Related Commands

- `fnos download queryTasks --help`
- `fnos download getDefaultSaveDirectory --help`

### `download queryTasks`

Query download tasks using a state bit mask, optionally including initialization data

#### Purpose

- Inspect download center tasks, statistics, or the default save location.

#### Objects and Relationships

- Download tasks and save directories belong to the selected server; a state bit mask filters tasks and is not a task ID.

#### Parameter Contract

- `--state-filter <integer>` — Task state bit mask; optional; integer; default: 65535; minimum: 0
- `--init-flag <boolean>` — Include initialization data; optional; boolean; default: true; allowed: true, false

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Boolean options require an explicit true or false value; the option name alone is insufficient.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- stateFilter is a non-negative integer bit mask; individual state bit meanings have not been confirmed. It is not a task ID.
- Reads remote business information without changing business configuration.

#### Results

- Returns the response from the selected download center endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos download queryTasks --server office --raw
```

#### Related Commands

- `fnos download getStatistics --help`
- `fnos download getDefaultSaveDirectory --help`

## mount

Mounted resources and mount settings: inspect resources mounted on the server and related configuration

### `mount listMounts`

List mounted resources to inspect mount objects returned by the selected server

#### Purpose

- Check server mount resources and their settings.

#### Objects and Relationships

- Mount objects belong to the selected server, not the local operating system mount list.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns mounted resources or mount configuration without mounting or unmounting resources.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos mount listMounts --server office --raw
```

#### Related Commands

- `fnos mount getSettings --help`

### `mount getSettings`

Get mount settings to inspect mount-related configuration on the selected server

#### Purpose

- Check server mount resources and their settings.

#### Objects and Relationships

- Mount objects belong to the selected server, not the local operating system mount list.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns mounted resources or mount configuration without mounting or unmounting resources.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos mount getSettings --server office --raw
```

#### Related Commands

- `fnos mount listMounts --help`

## sysinfo

System information: identify the selected server through its version, hardware, host name, and uptime

### `sysinfo getHostName`

Get host name information to check the name of the server targeted by the current connection

#### Purpose

- Identify the target server, system version, or runtime environment.

#### Objects and Relationships

- Information comes from the server actually contacted and can help verify the target of a saved connection.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested system information; exact fields depend on the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sysinfo getHostName --server office --raw
```

#### Related Commands

- `fnos sysinfo getTrimVersion --help`
- `fnos sysinfo getHardwareInfo --help`

### `sysinfo getTrimVersion`

Get Trim version information to identify the fnOS version on the selected server

#### Purpose

- Identify the target server, system version, or runtime environment.

#### Objects and Relationships

- Information comes from the server actually contacted and can help verify the target of a saved connection.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested system information; exact fields depend on the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sysinfo getTrimVersion --server office --raw
```

#### Related Commands

- `fnos sysinfo getHostName --help`
- `fnos sysinfo getHardwareInfo --help`

### `sysinfo getMachineId`

Get machine ID information to inspect the device identifier returned by the selected server

#### Purpose

- Identify the target server, system version, or runtime environment.

#### Objects and Relationships

- Information comes from the server actually contacted and can help verify the target of a saved connection.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested system information; exact fields depend on the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sysinfo getMachineId --server office --raw
```

#### Related Commands

- `fnos sysinfo getHostName --help`
- `fnos sysinfo getTrimVersion --help`
- `fnos sysinfo getHardwareInfo --help`

### `sysinfo getHardwareInfo`

Get hardware information to inspect hardware details on the selected server

#### Purpose

- Identify the target server, system version, or runtime environment.

#### Objects and Relationships

- Information comes from the server actually contacted and can help verify the target of a saved connection.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested system information; exact fields depend on the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sysinfo getHardwareInfo --server office --raw
```

#### Related Commands

- `fnos sysinfo getHostName --help`
- `fnos sysinfo getTrimVersion --help`

### `sysinfo getUptime`

Get system uptime information to inspect how long the server has been running since startup

#### Purpose

- Identify the target server, system version, or runtime environment.

#### Objects and Relationships

- Information comes from the server actually contacted and can help verify the target of a saved connection.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested system information; exact fields depend on the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sysinfo getUptime --server office --raw
```

#### Related Commands

- `fnos sysinfo getHostName --help`
- `fnos sysinfo getTrimVersion --help`
- `fnos sysinfo getHardwareInfo --help`

### `sysinfo getReservedPartition`

Get reserved partition information to inspect the server's reserved partition details

#### Purpose

- Identify the target server, system version, or runtime environment.

#### Objects and Relationships

- Information comes from the server actually contacted and can help verify the target of a saved connection.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested system information; exact fields depend on the server response.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sysinfo getReservedPartition --server office --raw
```

#### Related Commands

- `fnos sysinfo getHostName --help`
- `fnos sysinfo getTrimVersion --help`
- `fnos sysinfo getHardwareInfo --help`

## sac

UPS and email notifications: inspect power backup status and email notification configuration

### `sac upsStatus`

Get UPS status information to inspect the server's uninterruptible power supply status

#### Purpose

- Check UPS or email notification configuration and status.

#### Objects and Relationships

- UPS state, email settings, and provider records belong to the selected server and are queried through separate endpoints.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested state or configuration without sending test mail or adjusting the UPS.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sac upsStatus --server office --raw
```

#### Related Commands

- `fnos sac getEmailConfig --help`
- `fnos sac listEmailProviders --help`

### `sac getEmailConfig`

Get email notification configuration to check the server's email notification settings

#### Purpose

- Check UPS or email notification configuration and status.

#### Objects and Relationships

- UPS state, email settings, and provider records belong to the selected server and are queried through separate endpoints.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested state or configuration without sending test mail or adjusting the UPS.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sac getEmailConfig --server office --raw
```

#### Related Commands

- `fnos sac upsStatus --help`
- `fnos sac listEmailProviders --help`

### `sac listEmailProviders`

List email notification providers to inspect provider entries offered by the server

#### Purpose

- Check UPS or email notification configuration and status.

#### Objects and Relationships

- UPS state, email settings, and provider records belong to the selected server and are queried through separate endpoints.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested state or configuration without sending test mail or adjusting the UPS.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sac listEmailProviders --server office --raw
```

#### Related Commands

- `fnos sac upsStatus --help`
- `fnos sac getEmailConfig --help`

## license

Software licenses installed on the server: query license records by page

### `license list`

List installed software licenses using page number and page size for pagination

#### Purpose

- Inspect installed software license records by page.

#### Objects and Relationships

- Licenses belong to the selected server; page number and page size select the record range for this response.

#### Parameter Contract

- `--page <integer>` — Page number; optional; integer; default: 1; minimum: 1
- `--page-size <integer>` — Items per page; optional; integer; default: 200; minimum: 1

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Paginated endpoints request one specified page per invocation and do not traverse all pages automatically.
- Reads remote business information without changing business configuration.

#### Results

- Each invocation requests the specified page and does not traverse all pages automatically.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos license list --server office --raw
```

#### Related Commands

- `fnos sysinfo getTrimVersion --help`

## liveupdate

System updates: query online update status without initiating a server upgrade

### `liveupdate getStatus`

Get live update status to inspect server update information without starting an upgrade

#### Purpose

- Inspect system update status.

#### Objects and Relationships

- Queries the selected server online update endpoint, not the CLI npm package version.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns update status without downloading, installing, or initiating a system upgrade.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos liveupdate getStatus --server office --raw
```

#### Related Commands

- `fnos sysinfo getTrimVersion --help`

## sysrestore

System restore: query restore information without performing a server restore operation

### `sysrestore getInfo`

Get system restore information to inspect server restore details without triggering a restore

#### Purpose

- Inspect system restore information.

#### Objects and Relationships

- Restore information belongs to the selected server, not a local CLI configuration backup.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns restore information without creating restore points or triggering a restore.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos sysrestore getInfo --server office --raw
```

#### Related Commands

- `fnos sysinfo getTrimVersion --help`

## user

User information, groups, and authentication: distinguish the current account, selected users, and global settings

### `user info`

Get user information to inspect server-side details for the currently authenticated account

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Queries the authenticated account and does not accept a uid option for selecting another user.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user info --server office --raw
```

#### Related Commands

- `fnos user listUG --help`
- `fnos user listGroups --help`

### `user listUG`

List users and groups to discover objects for subsequent user or group queries

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user listUG --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listGroups --help`

### `user groupUsers`

Get user grouping information to inspect membership relationships between users and groups

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user groupUsers --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`
- `fnos user listGroups --help`

### `user isAdmin`

Check whether the current user is an administrator to establish the authenticated account's administrator status

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user isAdmin --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`
- `fnos user listGroups --help`

### `user listTokens`

List authentication tokens to inspect token-related records returned by the server

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user listTokens --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`
- `fnos user listGroups --help`

### `user getMyTwofaConfig`

Get current user two-factor configuration for the account used by this authentication session

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Queries two-factor configuration for the authenticated account; getUserTwofaConfig queries another selected user by uid.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user getMyTwofaConfig --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`
- `fnos user listGroups --help`

### `user getGlobalTwofaConfig`

Get global two-factor configuration to inspect server-wide two-factor authentication settings

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Queries server-wide two-factor settings rather than an individual user configuration.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user getGlobalTwofaConfig --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`
- `fnos user listGroups --help`

### `user getUserTwofaConfig`

Get a user two-factor configuration by selecting the user with a non-negative integer uid

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- `--uid` is a non-negative integer user ID on the target server, not a username. Use user listUG to discover users; the exact ID field has not been confirmed.

#### Parameter Contract

- `--uid <integer>` — User ID; required; integer; minimum: 0

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos user getUserTwofaConfig --server office --uid '<uid>' --raw
```

#### Related Commands

- `fnos user listUG --help`
- `fnos user getMyTwofaConfig --help`
- `fnos user getGlobalTwofaConfig --help`

### `user getActiveState`

Get current user active state for the account used by this authentication session

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user getActiveState --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`
- `fnos user listGroups --help`

### `user getGroupInfo`

Get group information for a specified group, selecting the query target by group name

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- `--group` accepts a group name discoverable through user listGroups on the same server; do not pass a user uid.

#### Parameter Contract

- `--group <group>` — Group name; required; non-empty string

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos user getGroupInfo --server office --group '<group>' --raw
```

#### Related Commands

- `fnos user listGroups --help`
- `fnos user groupUsers --help`

### `user listGroups`

List groups on the server to discover group objects for subsequent queries

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user listGroups --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`

### `user listLoginDevices`

List login devices recorded by the selected server

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos user listLoginDevices --server office --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`
- `fnos user listGroups --help`

### `user getPreference`

Get a user preference by name to query the corresponding server-side setting

#### Purpose

- Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.

#### Objects and Relationships

- Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.

#### Parameter Contract

- `--name <name>` — Preference name; required; non-empty string

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Here name identifies a server-side user preference, distinct from the local CLI language preference managed by config. Available names are not fully documented.
- Reads remote business information without changing business configuration.

#### Results

- Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos user getPreference --server office --name '<name>' --raw
```

#### Related Commands

- `fnos user info --help`
- `fnos user listUG --help`
- `fnos user listGroups --help`

## ipblock

IP access rules: inspect allowlists, denylists, and automatic blocking rules to check server access restrictions

### `ipblock listAllowedAddresses`

List allowed IP addresses to check the server's IP allowlist

#### Purpose

- Check server IP access restrictions and automatic blocking settings.

#### Objects and Relationships

- Allowlists, denylists, and automatic blocking rules are distinct objects; an address absent from one list is not proof that access is allowed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested list or rule without modifying access restrictions.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos ipblock listAllowedAddresses --server office --raw
```

#### Related Commands

- `fnos ipblock listDeniedAddresses --help`
- `fnos ipblock getAutoBlockRule --help`

### `ipblock getAutoBlockRule`

Get automatic IP blocking rule to inspect settings for automatically restricting server access

#### Purpose

- Check server IP access restrictions and automatic blocking settings.

#### Objects and Relationships

- Allowlists, denylists, and automatic blocking rules are distinct objects; an address absent from one list is not proof that access is allowed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested list or rule without modifying access restrictions.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos ipblock getAutoBlockRule --server office --raw
```

#### Related Commands

- `fnos ipblock listAllowedAddresses --help`
- `fnos ipblock listDeniedAddresses --help`

### `ipblock listDeniedAddresses`

List denied IP addresses to check the server's IP denylist

#### Purpose

- Check server IP access restrictions and automatic blocking settings.

#### Objects and Relationships

- Allowlists, denylists, and automatic blocking rules are distinct objects; an address absent from one list is not proof that access is allowed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns the requested list or rule without modifying access restrictions.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos ipblock listDeniedAddresses --server office --raw
```

#### Related Commands

- `fnos ipblock listAllowedAddresses --help`
- `fnos ipblock getAutoBlockRule --help`

## security

Firewall and process traffic: inspect configuration and selected processes to investigate network access and activity

### `security getFirewall`

Get firewall configuration to check the server's current firewall-related settings

#### Purpose

- Inspect firewall configuration or investigate network traffic for selected processes.

#### Objects and Relationships

- Firewall configuration and process traffic belong to the selected server; local processes cannot substitute for server process objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected security endpoint without changing firewall rules.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos security getFirewall --server office --raw
```

#### Related Commands

- `fnos resmon processes --help`

### `security getProcessTraffic`

Get process traffic data for selected processes supplied as a non-empty JSON array of process objects

#### Purpose

- Inspect firewall configuration or investigate network traffic for selected processes.

#### Objects and Relationships

- Firewall configuration and process traffic belong to the selected server; local processes cannot substitute for server process objects.

#### Parameter Contract

- `--processes <json>` — Process objects as a JSON array; required; non-empty JSON array of objects

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- JSON must be a non-empty array of objects; protect the entire JSON value with single quotes in a POSIX shell.
- processes must be a non-empty JSON array of objects. The example uses pid and process from the existing CLI example; the full object schema has not been confirmed.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected security endpoint without changing firewall rules.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos security getProcessTraffic --server office --processes '[{"pid":1001,"process":"demo"}]' --raw
```

#### Related Commands

- `fnos security getFirewall --help`
- `fnos resmon processes --help`

## network

Network interfaces and settings: inspect interfaces, gateways, and SSH status, or detect and query interfaces by name

### `network list`

List network information, using type to select a query type supported by the server

#### Purpose

- Inspect server network configuration and interfaces, or perform detection on a selected interface.

#### Objects and Relationships

- Interface names belong to the selected server. Query network list before using a returned interface name with --if-name; the exact response field has not been confirmed.

#### Parameter Contract

- `--type <integer>` — Network list type: 0 or 1; optional; integer; default: 0; allowed: 0, 1

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- type accepts only 0 or 1; their business meanings have not been confirmed.
- Reads remote business information without changing business configuration.

#### Results

- Returns information or detection results from the selected network endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos network list --server office --raw
```

#### Related Commands

- `fnos network getInfo --help`
- `fnos network getGateway --help`

### `network detect`

Detect a network interface, selecting the interface to test by its name

#### Purpose

- Inspect server network configuration and interfaces, or perform detection on a selected interface.

#### Objects and Relationships

- Interface names belong to the selected server. Query network list before using a returned interface name with --if-name; the exact response field has not been confirmed.

#### Parameter Contract

- `--if-name <name>` — Network interface name; required; non-empty string

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Requests detection for the selected server interface without changing CLI network configuration; the server determines the detection network activity.

#### Results

- Returns information or detection results from the selected network endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos network detect --server office --if-name '<ifName>' --raw
```

#### Related Commands

- `fnos network list --help`
- `fnos network getInfo --help`
- `fnos network getGateway --help`

### `network getGateway`

Get gateway information to check network gateway configuration on the selected server

#### Purpose

- Inspect server network configuration and interfaces, or perform detection on a selected interface.

#### Objects and Relationships

- Interface names belong to the selected server. Query network list before using a returned interface name with --if-name; the exact response field has not been confirmed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information or detection results from the selected network endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos network getGateway --server office --raw
```

#### Related Commands

- `fnos network list --help`
- `fnos network getInfo --help`

### `network getMultiGatewayStatus`

Get multi-gateway status to inspect the server's current multi-gateway state

#### Purpose

- Inspect server network configuration and interfaces, or perform detection on a selected interface.

#### Objects and Relationships

- Interface names belong to the selected server. Query network list before using a returned interface name with --if-name; the exact response field has not been confirmed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information or detection results from the selected network endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos network getMultiGatewayStatus --server office --raw
```

#### Related Commands

- `fnos network list --help`
- `fnos network getInfo --help`
- `fnos network getGateway --help`

### `network getNicPerformanceMode`

Get NIC performance mode to check the server's network interface performance settings

#### Purpose

- Inspect server network configuration and interfaces, or perform detection on a selected interface.

#### Objects and Relationships

- Interface names belong to the selected server. Query network list before using a returned interface name with --if-name; the exact response field has not been confirmed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information or detection results from the selected network endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos network getNicPerformanceMode --server office --raw
```

#### Related Commands

- `fnos network list --help`
- `fnos network getInfo --help`
- `fnos network getGateway --help`

### `network getInfo`

Get network interface information for a specified interface, selecting the target NIC by name

#### Purpose

- Inspect server network configuration and interfaces, or perform detection on a selected interface.

#### Objects and Relationships

- Interface names belong to the selected server. Query network list before using a returned interface name with --if-name; the exact response field has not been confirmed.

#### Parameter Contract

- `--if-name <name>` — Network interface name; required; non-empty string

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information or detection results from the selected network endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos network getInfo --server office --if-name '<ifName>' --raw
```

#### Related Commands

- `fnos network list --help`
- `fnos network getGateway --help`

### `network getSshStatus`

Get SSH service status to inspect SSH-related state on the selected server

#### Purpose

- Inspect server network configuration and interfaces, or perform detection on a selected interface.

#### Objects and Relationships

- Interface names belong to the selected server. Query network list before using a returned interface name with --if-name; the exact response field has not been confirmed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns information or detection results from the selected network endpoint.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos network getSshStatus --server office --raw
```

#### Related Commands

- `fnos network list --help`
- `fnos network getInfo --help`
- `fnos network getGateway --help`

## share

Sharing services and links: inspect file-sharing protocols and configuration, distinguishing service settings from link permissions

### `share smbOpt`

Get SMB options to inspect protocol-level SMB service settings on the server

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share smbOpt --server office --raw
```

#### Related Commands

- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share dlnaOptions`

Get DLNA options to inspect the server's media-sharing service configuration

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share dlnaOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share dlnaShareOptions`

Get DLNA share options to inspect configuration for content shared through that protocol

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share dlnaShareOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share ftpOptions`

Get FTP options to inspect protocol-level FTP service settings on the server

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share ftpOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share ftpShareOptions`

Get FTP share options to inspect configuration for resources shared through that protocol

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share ftpShareOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share nfsOptions`

Get NFS options to inspect protocol-level NFS service settings on the server

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share nfsOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share nfsShareOptions`

Get NFS share options to inspect configuration for resources shared through that protocol

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share nfsShareOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share smbShareOptions`

Get SMB share options to inspect configuration for resources shared through that protocol

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share smbShareOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share listLinks --help`

### `share webdavOptions`

Get WebDAV options to inspect the server's configuration for that protocol

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share webdavOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share webdavShareOptions`

Get WebDAV share options to inspect configuration for resources shared through that protocol

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share webdavShareOptions --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share getLinkDefaults`

Get share link defaults to check the default configuration used for links

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share getLinkDefaults --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share getDefaultLink`

Get the default share link to inspect default link information returned by the server

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share getDefaultLink --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

### `share listLinks`

List share links with keyword filtering, pagination, sorting, and an administrator-view option

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- `--is-admin <boolean>` — Use administrator view; optional; boolean; default: false; allowed: true, false
- `--keyword <keyword>` — Search keyword; optional; non-empty string; default: ""
- `--page <integer>` — Page number; optional; integer; default: 1; minimum: 1
- `--page-size <integer>` — Items per page; optional; integer; default: 100; minimum: 1
- `--sort-column <column>` — Sort column; optional; non-empty string; default: "createdTime"
- `--sort-type <type>` — Sort direction; optional; non-empty string; default: "DESC"

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Boolean options require an explicit true or false value; the option name alone is insufficient.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Paginated endpoints request one specified page per invocation and do not traverse all pages automatically.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share listLinks --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`

### `share getLinkPermission`

Get share link permission information to check link permission settings returned by the server

#### Purpose

- Inspect file-sharing protocols, share configuration, or share links.

#### Objects and Relationships

- Protocol service settings, shared resource configuration, and share link permissions are distinct objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration or link records without changing sharing services or creating links.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos share getLinkPermission --server office --raw
```

#### Related Commands

- `fnos share smbOpt --help`
- `fnos share smbShareOptions --help`
- `fnos share listLinks --help`

## iscsi

iSCSI configuration: inspect targets, LUNs, initiators, and user groups associated with LUNs

### `iscsi getConfig`

Get iSCSI configuration to inspect the server's block storage sharing settings

#### Purpose

- Identify iSCSI storage access objects and inspect their configuration.

#### Objects and Relationships

- Targets, LUNs, initiators, and LUN user groups are distinct objects. listLunUsergroups accepts LUN name and WWN filters; other relationship keys have not been confirmed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns iSCSI configuration or object lists without creating storage targets or mappings.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos iscsi getConfig --server office --raw
```

#### Related Commands

- `fnos iscsi listTargets --help`
- `fnos iscsi listLuns --help`
- `fnos iscsi listInitiators --help`
- `fnos iscsi listLunUsergroups --help`

### `iscsi listInitiators`

List iSCSI initiators to inspect storage access initiator objects returned by the server

#### Purpose

- Identify iSCSI storage access objects and inspect their configuration.

#### Objects and Relationships

- Targets, LUNs, initiators, and LUN user groups are distinct objects. listLunUsergroups accepts LUN name and WWN filters; other relationship keys have not been confirmed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns iSCSI configuration or object lists without creating storage targets or mappings.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos iscsi listInitiators --server office --raw
```

#### Related Commands

- `fnos iscsi listTargets --help`
- `fnos iscsi listLuns --help`
- `fnos iscsi listLunUsergroups --help`

### `iscsi listLuns`

List iSCSI LUNs to identify logical unit objects offered by the server

#### Purpose

- Identify iSCSI storage access objects and inspect their configuration.

#### Objects and Relationships

- Targets, LUNs, initiators, and LUN user groups are distinct objects. listLunUsergroups accepts LUN name and WWN filters; other relationship keys have not been confirmed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns iSCSI configuration or object lists without creating storage targets or mappings.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos iscsi listLuns --server office --raw
```

#### Related Commands

- `fnos iscsi listTargets --help`
- `fnos iscsi listInitiators --help`
- `fnos iscsi listLunUsergroups --help`

### `iscsi listLunUsergroups`

List iSCSI LUN user groups, filtering associated records by LUN name and WWN

#### Purpose

- Identify iSCSI storage access objects and inspect their configuration.

#### Objects and Relationships

- Targets, LUNs, initiators, and LUN user groups are distinct objects. listLunUsergroups accepts LUN name and WWN filters; other relationship keys have not been confirmed.

#### Parameter Contract

- `--lun-name <name>` — LUN name filter; optional; non-empty string; default: ""
- `--wwn <wwn>` — WWN filter; optional; non-empty string; default: ""

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Reads remote business information without changing business configuration.

#### Results

- Returns iSCSI configuration or object lists without creating storage targets or mappings.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos iscsi listLunUsergroups --server office --raw
```

#### Related Commands

- `fnos iscsi listTargets --help`
- `fnos iscsi listLuns --help`
- `fnos iscsi listInitiators --help`

### `iscsi listTargets`

List iSCSI targets to identify storage access target objects offered by the server

#### Purpose

- Identify iSCSI storage access objects and inspect their configuration.

#### Objects and Relationships

- Targets, LUNs, initiators, and LUN user groups are distinct objects. listLunUsergroups accepts LUN name and WWN filters; other relationship keys have not been confirmed.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns iSCSI configuration or object lists without creating storage targets or mappings.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos iscsi listTargets --server office --raw
```

#### Related Commands

- `fnos iscsi listLuns --help`
- `fnos iscsi listInitiators --help`
- `fnos iscsi listLunUsergroups --help`

## netsvr

Server connections, certificates, and DDNS: inspect connection configuration and status to check remote access

### `netsvr listCertificates`

List server certificates to inspect certificate-related records returned by the server

#### Purpose

- Inspect connections, certificates, or dynamic DNS information for remote access.

#### Objects and Relationships

- Connection configuration describes settings, while connection status describes runtime state; certificates and DDNS records are separate objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration, state, or records without updating certificates or modifying DDNS.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos netsvr listCertificates --server office --raw
```

#### Related Commands

- `fnos netsvr getConnectionConfig --help`
- `fnos netsvr getConnectionStatus --help`
- `fnos netsvr listDdnsRecords --help`

### `netsvr getConnectionConfig`

Get connection configuration to check server connection settings rather than runtime status

#### Purpose

- Inspect connections, certificates, or dynamic DNS information for remote access.

#### Objects and Relationships

- Connection configuration describes settings, while connection status describes runtime state; certificates and DDNS records are separate objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration, state, or records without updating certificates or modifying DDNS.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos netsvr getConnectionConfig --server office --raw
```

#### Related Commands

- `fnos netsvr getConnectionStatus --help`
- `fnos netsvr listCertificates --help`
- `fnos netsvr listDdnsRecords --help`

### `netsvr getConnectionStatus`

Get connection status to inspect the current runtime state of server connections

#### Purpose

- Inspect connections, certificates, or dynamic DNS information for remote access.

#### Objects and Relationships

- Connection configuration describes settings, while connection status describes runtime state; certificates and DDNS records are separate objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration, state, or records without updating certificates or modifying DDNS.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos netsvr getConnectionStatus --server office --raw
```

#### Related Commands

- `fnos netsvr getConnectionConfig --help`
- `fnos netsvr listCertificates --help`
- `fnos netsvr listDdnsRecords --help`

### `netsvr listDdnsProviders`

List DDNS providers to inspect dynamic DNS provider entries offered by the server

#### Purpose

- Inspect connections, certificates, or dynamic DNS information for remote access.

#### Objects and Relationships

- Connection configuration describes settings, while connection status describes runtime state; certificates and DDNS records are separate objects.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration, state, or records without updating certificates or modifying DDNS.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos netsvr listDdnsProviders --server office --raw
```

#### Related Commands

- `fnos netsvr getConnectionConfig --help`
- `fnos netsvr getConnectionStatus --help`
- `fnos netsvr listCertificates --help`
- `fnos netsvr listDdnsRecords --help`

### `netsvr listDdnsRecords`

List DDNS records using page number and page size to inspect dynamic DNS configuration

#### Purpose

- Inspect connections, certificates, or dynamic DNS information for remote access.

#### Objects and Relationships

- Connection configuration describes settings, while connection status describes runtime state; certificates and DDNS records are separate objects.

#### Parameter Contract

- `--page <integer>` — Page number; optional; integer; default: 1; minimum: 1
- `--page-size <integer>` — Items per page; optional; integer; default: 200; minimum: 1

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Paginated endpoints request one specified page per invocation and do not traverse all pages automatically.
- Reads remote business information without changing business configuration.

#### Results

- Returns configuration, state, or records without updating certificates or modifying DDNS.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos netsvr listDdnsRecords --server office --raw
```

#### Related Commands

- `fnos netsvr getConnectionConfig --help`
- `fnos netsvr getConnectionStatus --help`
- `fnos netsvr listCertificates --help`

## docker

Docker containers, images, and networks: inspect these resources and Compose projects to understand the container service

### `docker listComposes`

List Docker Compose projects to inspect orchestration project records on the server

#### Purpose

- Inspect container service objects and resource usage.

#### Objects and Relationships

- Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected Docker endpoint without creating, starting, or deleting containers.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos docker listComposes --server office --raw
```

#### Related Commands

- `fnos docker listContainers --help`
- `fnos docker stats --help`
- `fnos docker listImages --help`
- `fnos docker listNetworks --help`

### `docker listContainers`

List Docker containers, including stopped containers by default; adjust this with the all option

#### Purpose

- Inspect container service objects and resource usage.

#### Objects and Relationships

- Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.

#### Parameter Contract

- `--all <boolean>` — Include stopped containers; optional; boolean; default: true; allowed: true, false

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Boolean options require an explicit true or false value; the option name alone is insufficient.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- all defaults to true and includes stopped containers; false requests a list without stopped containers.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected Docker endpoint without creating, starting, or deleting containers.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos docker listContainers --server office --raw
```

#### Related Commands

- `fnos docker stats --help`
- `fnos docker listImages --help`
- `fnos docker listNetworks --help`

### `docker stats`

Get Docker container statistics to observe container-related resource usage

#### Purpose

- Inspect container service objects and resource usage.

#### Objects and Relationships

- Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected Docker endpoint without creating, starting, or deleting containers.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos docker stats --server office --raw
```

#### Related Commands

- `fnos docker listContainers --help`
- `fnos docker listImages --help`
- `fnos docker listNetworks --help`

### `docker getSystemSettings`

Get Docker system settings to check the server's container service configuration

#### Purpose

- Inspect container service objects and resource usage.

#### Objects and Relationships

- Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected Docker endpoint without creating, starting, or deleting containers.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos docker getSystemSettings --server office --raw
```

#### Related Commands

- `fnos docker listContainers --help`
- `fnos docker stats --help`
- `fnos docker listImages --help`
- `fnos docker listNetworks --help`

### `docker listImageDownloads`

List Docker image downloads to inspect task records related to image pulls

#### Purpose

- Inspect container service objects and resource usage.

#### Objects and Relationships

- Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected Docker endpoint without creating, starting, or deleting containers.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos docker listImageDownloads --server office --raw
```

#### Related Commands

- `fnos docker listContainers --help`
- `fnos docker stats --help`
- `fnos docker listImages --help`
- `fnos docker listNetworks --help`

### `docker listImages`

List Docker images to inspect container image records already on the server

#### Purpose

- Inspect container service objects and resource usage.

#### Objects and Relationships

- Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected Docker endpoint without creating, starting, or deleting containers.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos docker listImages --server office --raw
```

#### Related Commands

- `fnos docker listContainers --help`
- `fnos docker stats --help`
- `fnos docker listNetworks --help`

### `docker listNetworks`

List Docker networks to inspect container network objects on the server

#### Purpose

- Inspect container service objects and resource usage.

#### Objects and Relationships

- Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.

#### Parameter Contract

- No business-specific options; use the authentication and global options above.

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected Docker endpoint without creating, starting, or deleting containers.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos docker listNetworks --server office --raw
```

#### Related Commands

- `fnos docker listContainers --help`
- `fnos docker stats --help`
- `fnos docker listImages --help`

### `docker listRegistryRepositories`

List Docker registry repositories with keyword filtering and paginated repository queries

#### Purpose

- Inspect container service objects and resource usage.

#### Objects and Relationships

- Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.

#### Parameter Contract

- `--keyword <keyword>` — Search keyword; optional; non-empty string; default: ""
- `--page <integer>` — Page number; optional; integer; default: 1; minimum: 1
- `--page-size <integer>` — Items per page; optional; integer; default: 20; minimum: 1

#### Conditions and Effects

- Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.
- `--server` cannot be combined with temporary endpoint, username, password, or password-stdin.
- Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.
- Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.
- Paginated endpoints request one specified page per invocation and do not traverse all pages automatically.
- Reads remote business information without changing business configuration.

#### Results

- Returns data from the selected Docker endpoint without creating, starting, or deleting containers.
- `--raw` preserves original JSON field names and structure; the default format is intended for human reading.
- Inspect both the business response and exit status; receiving a response alone does not guarantee business success.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos docker listRegistryRepositories --server office --raw
```

#### Related Commands

- `fnos docker listContainers --help`
- `fnos docker stats --help`
- `fnos docker listImages --help`
- `fnos docker listNetworks --help`

## Utility Operation Details

### `fnos login`

#### Purpose

- Establish saved server authentication for subsequent business commands.

#### Objects and Relationships

- server is a local connection name associated with an endpoint and authentication record; omission saves as default.

#### Parameter Contract

- auth accepts password or oauth and defaults to password; both require endpoint, while password also requires username.
- password and password-stdin are mutually exclusive; omission prompts without echo in a TTY, while noninteractive calls require a password input method.

#### Conditions and Effects

- OAuth requires a TTY, browser authorization, and an authorization code; it cannot combine username, password, two-factor code, or trust-device. Server OAuth support must be confirmed separately.
- verify-ssl is disabled by default; enabling it verifies certificates and requires an HTTPS origin for OAuth. Login saves this policy.
- Contacts the remote server to authenticate and writes local authentication records; an existing record with the same name may be updated.

#### Results

- The success summary indicates saved authentication without including passwords or tokens.

#### Examples

- office is an example connection name; replace it with your saved connection name.
- &lt;...&gt; marks placeholders to replace with actual values.

```sh
fnos login --server office -e '<endpoint>' -u '<username>'
fnos login --auth oauth --server office -e 'https://<host>:<port>'
```

#### Related Commands

- `fnos auth.status --help`
- `fnos sysinfo getTrimVersion --help`
- `fnos logout --help`

### `fnos logout`

#### Purpose

- Remove saved authentication for a local connection that is no longer needed.

#### Objects and Relationships

- server selects a locally saved connection; omission uses the existing connection selection rules.

#### Parameter Contract

- Use --server to select a connection; no remote password is required.

#### Conditions and Effects

- Clears the selected local authentication record; it does not contact the server, revoke server tokens, or log out other devices.

#### Results

- Reports the local removal result; succeeds when no connection is specified and no records exist.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos logout --server office
```

#### Related Commands

- `fnos auth.status --help`
- `fnos login --help`

### `fnos auth.status`

#### Purpose

- Check the target, authentication type, and local expiry metadata of a saved connection.

#### Objects and Relationships

- server selects a local authentication record, not proof that the server is online or authorization remains valid.

#### Parameter Contract

- Use --server to explicitly select a connection; omission uses existing selection rules.

#### Conditions and Effects

- Reads local metadata only; it does not contact the server or verify or refresh tokens.

#### Results

- Returns server, endpoint, authType, and verifySsl; OAuth also includes expiresAt and expired. expired is based only on the locally saved expiry time.

#### Examples

- office is an example connection name; replace it with your saved connection name.

```sh
fnos auth.status --server office --raw
```

#### Related Commands

- `fnos sysinfo getTrimVersion --help`
- `fnos login --help`
- `fnos logout --help`

### `fnos completion`

#### Purpose

- Generate a completion script for the current shell to load.

#### Objects and Relationships

- Applies to the local shell running the CLI and does not contact a NAS.

#### Parameter Contract

- Only zsh is supported for shell; omitting shell displays help.

#### Conditions and Effects

- Writes the script to stdout without executing it or modifying shell configuration.

#### Results

- Static completion descriptions use the language active at generation time; regenerate after changing language.

#### Examples


```sh
fnos completion zsh
```

#### Related Commands

- `fnos completion install --help`

### `fnos completion install`

#### Purpose

- Install a completion script in the current local user directory.

#### Objects and Relationships

- Installs a local zsh completion file independently of server connections or credentials.

#### Parameter Contract

- shell is required and currently supports only zsh.

#### Conditions and Effects

- Writes ~/.fnos/completions/_fnos and explains fpath and compinit setup; it does not modify ~/.zshrc automatically.

#### Results

- Reports the install path and enablement steps; reinstall after changing language to update static descriptions.

#### Examples


```sh
fnos completion install zsh
```

#### Related Commands

- `fnos completion --help`

### `fnos config get`

#### Purpose

- Manage the local CLI display language without changing server settings or authentication targets.

#### Objects and Relationships

- language is a local preference in ~/.fnos/settings.json, distinct from server-side preferences queried by user getPreference.

#### Parameter Contract

- key supports only language; set also requires zh-CN or en.

#### Conditions and Effects

- Priority: command-line --lang &gt; FNOS_LANG &gt; saved preference &gt; zh-CN.
- Reads the local preference without writing configuration or contacting the server.

#### Results

- Returns language, effectiveLanguage, and source: the saved value, effective value, and selection source.

#### Examples


```sh
fnos config get language
```

#### Related Commands

- `fnos config set --help`
- `fnos config unset --help`

### `fnos config set`

#### Purpose

- Manage the local CLI display language without changing server settings or authentication targets.

#### Objects and Relationships

- language is a local preference in ~/.fnos/settings.json, distinct from server-side preferences queried by user getPreference.

#### Parameter Contract

- key supports only language; set also requires zh-CN or en.

#### Conditions and Effects

- Priority: command-line --lang &gt; FNOS_LANG &gt; saved preference &gt; zh-CN.
- Updates the local language preference for subsequent invocations; this invocation retains its startup language.

#### Results

- Returns the resulting language value; unset returns null, while temporary overrides still apply.

#### Examples


```sh
fnos config set language en
```

#### Related Commands

- `fnos config get --help`
- `fnos config unset --help`

### `fnos config unset`

#### Purpose

- Manage the local CLI display language without changing server settings or authentication targets.

#### Objects and Relationships

- language is a local preference in ~/.fnos/settings.json, distinct from server-side preferences queried by user getPreference.

#### Parameter Contract

- key supports only language; set also requires zh-CN or en.

#### Conditions and Effects

- Priority: command-line --lang &gt; FNOS_LANG &gt; saved preference &gt; zh-CN.
- Updates the local language preference for subsequent invocations; this invocation retains its startup language.

#### Results

- Returns the resulting language value; unset returns null, while temporary overrides still apply.

#### Examples


```sh
fnos config unset language
```

#### Related Commands

- `fnos config get --help`
- `fnos config set --help`
