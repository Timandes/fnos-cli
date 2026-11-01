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

No business options.

### `resmon gpu`

Get GPU resource monitoring information to inspect graphics processor usage on the server

No business options.

### `resmon mem`

Get memory resource monitoring information to inspect memory usage on the selected server

No business options.

### `resmon disk`

Get disk resource monitoring information to observe resource activity related to storage reads and writes

No business options.

### `resmon net`

Get network resource monitoring information to observe network transfer activity on the server

No business options.

### `resmon gen`

Get general resource monitoring information, selecting monitoring items to inspect multiple resource metrics

| Option | Required | Type | Description |
|---|---:|---|---|
| `--items <items>` | no | csv | Comma-separated monitoring items. Default: `null`. |

### `resmon npu`

Get NPU resource monitoring information to inspect neural processing unit usage on the server

No business options.

### `resmon processes`

List monitored processes to investigate resource usage at the process level

No business options.

### `resmon serviceProcesses`

List monitored service processes to inspect processes associated with server services

No business options.

### `resmon systemFan`

Get system fan monitoring information to inspect fan-related metrics returned by the server

No business options.

## event

Event logs for the server: inspect event entries to understand activity and investigate problems

### `event commonList`

List common event log entries to inspect server events and investigate problems

No business options.

## notify

Notifications: query unread counts to determine whether the current account has notifications to review

### `notify unreadTotal`

Get unread notification total to determine whether the current account has notifications to review

No business options.

## store

Storage and disks: query disks, SMART, and storage state, distinguishing devices, arrays, and user storage

### `store general`

Get storage general information for an overview of storage on the selected server

No business options.

### `store calcSpace`

Calculate storage space information for the selected server

No business options.

### `store listDisk`

List disk information, excluding hot spares by default and providing device names for SMART queries

| Option | Required | Type | Description |
|---|---:|---|---|
| `--no-hot-spare <boolean>` | no | boolean | Exclude hot spare disks. Default: `true`. |

### `store diskSmart`

Get disk SMART information by device name without starting a SMART self-test

| Option | Required | Type | Description |
|---|---:|---|---|
| `--disk <disk>` | yes | string | Disk device name. |

### `store state`

Get storage state information, selecting arrays by name or UUID

| Option | Required | Type | Description |
|---|---:|---|---|
| `--name <names>` | no | csv | Comma-separated array names. Default: `[]`. |
| `--uuid <uuids>` | no | csv | Comma-separated array UUIDs. Default: `[]`. |

### `store getUserStorage`

Get user storage information, optionally including space, storage details, or quota information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--space-info <boolean>` | no | boolean | Include space information. Default: `false`. |
| `--stor-info <boolean>` | no | boolean | Include storage information. Default: `false`. |
| `--quota-info <boolean>` | no | boolean | Include quota information. Default: `false`. |

### `store getCacheDeviceState`

Get cache device state to inspect the current condition of server storage cache devices

No business options.

### `store getDiskIdleTime`

Get disk idle time information to inspect disk inactivity on the server

No business options.

### `store getDiskWakeup`

Get disk wake-up state to investigate disk sleep and wake-up behavior

No business options.

### `store getRemovableConfig`

Get removable device configuration to inspect server settings for removable storage

No business options.

### `store listCacheDevices`

List cache devices to identify storage cache devices on the selected server

No business options.

### `store listRemovableDevices`

List removable devices to identify removable storage devices on the selected server

No business options.

## file

Files and directories on the remote server: browse, modify, and query access permissions, shares, and trash

### `file ls`

List files and directories on the remote server, optionally specifying a directory to check operation targets

| Option | Required | Type | Description |
|---|---:|---|---|
| `--path <path>` | no | string | Directory path. Default: `null`. |

### `file mkdir`

Create a directory at the specified remote path, modifying the selected server's directory structure

| Option | Required | Type | Description |
|---|---:|---|---|
| `--path <path>` | yes | string | Directory path. |

### `file rm`

Remove files or directories on the remote server, requesting trash by default unless explicitly disabled

| Option | Required | Type | Description |
|---|---:|---|---|
| `--files <files>` | yes | csv | Comma-separated file paths. |
| `--move-to-trashbin <boolean>` | no | boolean | Move removed files to trash. Default: `true`. |
| `--details <json>` | no | json | File detail object as JSON. Default: `null`. |

### `file getAcl`

Get file ACL information using vol-prefixed paths to query remote access controls

| Option | Required | Type | Description |
|---|---:|---|---|
| `--files <files>` | yes | csv | Comma-separated vol-prefixed paths. |

### `file listAppDirectories`

List application directories to discover remote directories associated with server applications

No business options.

### `file listFavorites`

List favorite files on the remote server to find entries favorited by the current account

No business options.

### `file listDirectoryEntries`

List directory entries returned by the server to discover remote directories for browsing

No business options.

### `file listRecent`

List recent files on the remote server to find recent file entries

No business options.

### `file listShared`

List shared files on the remote server to inspect file-sharing entries

No business options.

### `file listSharedByOthers`

List files shared by others on the remote server to find entries shared by other users

No business options.

### `file listTeamTrashBins`

List team trash bins to discover trash bin objects associated with team files

No business options.

### `file listTrash`

List trash entries to inspect file records in the remote trash

No business options.

## backup

Backup tasks on the server: query a specified backup direction to inspect its task list

### `backup listTasks`

List backup tasks for a specified direction; the direction option is required

| Option | Required | Type | Description |
|---|---:|---|---|
| `--direction <integer>` | yes | integer | Backup direction: 0 or 1. |

## download

Download tasks and settings: inspect tasks, statistics, and the server's default download directory

### `download getDefaultSaveDirectory`

Get the default download directory to check the default save location used by server download tasks

No business options.

### `download getStatistics`

Get download statistics to inspect statistical information from the server's download center

No business options.

### `download queryTasks`

Query download tasks using a state bit mask, optionally including initialization data

| Option | Required | Type | Description |
|---|---:|---|---|
| `--state-filter <integer>` | no | integer | Task state bit mask. Default: `65535`. |
| `--init-flag <boolean>` | no | boolean | Include initialization data. Default: `true`. |

## mount

Mounted resources and mount settings: inspect resources mounted on the server and related configuration

### `mount listMounts`

List mounted resources to inspect mount objects returned by the selected server

No business options.

### `mount getSettings`

Get mount settings to inspect mount-related configuration on the selected server

No business options.

## sysinfo

System information: identify the selected server through its version, hardware, host name, and uptime

### `sysinfo getHostName`

Get host name information to check the name of the server targeted by the current connection

No business options.

### `sysinfo getTrimVersion`

Get Trim version information to identify the fnOS version on the selected server

No business options.

### `sysinfo getMachineId`

Get machine ID information to inspect the device identifier returned by the selected server

No business options.

### `sysinfo getHardwareInfo`

Get hardware information to inspect hardware details on the selected server

No business options.

### `sysinfo getUptime`

Get system uptime information to inspect how long the server has been running since startup

No business options.

### `sysinfo getReservedPartition`

Get reserved partition information to inspect the server's reserved partition details

No business options.

## sac

UPS and email notifications: inspect power backup status and email notification configuration

### `sac upsStatus`

Get UPS status information to inspect the server's uninterruptible power supply status

No business options.

### `sac getEmailConfig`

Get email notification configuration to check the server's email notification settings

No business options.

### `sac listEmailProviders`

List email notification providers to inspect provider entries offered by the server

No business options.

## license

Software licenses installed on the server: query license records by page

### `license list`

List installed software licenses using page number and page size for pagination

| Option | Required | Type | Description |
|---|---:|---|---|
| `--page <integer>` | no | integer | Page number. Default: `1`. |
| `--page-size <integer>` | no | integer | Items per page. Default: `200`. |

## liveupdate

System updates: query online update status without initiating a server upgrade

### `liveupdate getStatus`

Get live update status to inspect server update information without starting an upgrade

No business options.

## sysrestore

System restore: query restore information without performing a server restore operation

### `sysrestore getInfo`

Get system restore information to inspect server restore details without triggering a restore

No business options.

## user

User information, groups, and authentication: distinguish the current account, selected users, and global settings

### `user info`

Get user information to inspect server-side details for the currently authenticated account

No business options.

### `user listUG`

List users and groups to discover objects for subsequent user or group queries

No business options.

### `user groupUsers`

Get user grouping information to inspect membership relationships between users and groups

No business options.

### `user isAdmin`

Check whether the current user is an administrator to establish the authenticated account's administrator status

No business options.

### `user listTokens`

List authentication tokens to inspect token-related records returned by the server

No business options.

### `user getMyTwofaConfig`

Get current user two-factor configuration for the account used by this authentication session

No business options.

### `user getGlobalTwofaConfig`

Get global two-factor configuration to inspect server-wide two-factor authentication settings

No business options.

### `user getUserTwofaConfig`

Get a user two-factor configuration by selecting the user with a non-negative integer uid

| Option | Required | Type | Description |
|---|---:|---|---|
| `--uid <integer>` | yes | integer | User ID. |

### `user getActiveState`

Get current user active state for the account used by this authentication session

No business options.

### `user getGroupInfo`

Get group information for a specified group, selecting the query target by group name

| Option | Required | Type | Description |
|---|---:|---|---|
| `--group <group>` | yes | string | Group name. |

### `user listGroups`

List groups on the server to discover group objects for subsequent queries

No business options.

### `user listLoginDevices`

List login devices recorded by the selected server

No business options.

### `user getPreference`

Get a user preference by name to query the corresponding server-side setting

| Option | Required | Type | Description |
|---|---:|---|---|
| `--name <name>` | yes | string | Preference name. |

## ipblock

IP access rules: inspect allowlists, denylists, and automatic blocking rules to check server access restrictions

### `ipblock listAllowedAddresses`

List allowed IP addresses to check the server's IP allowlist

No business options.

### `ipblock getAutoBlockRule`

Get automatic IP blocking rule to inspect settings for automatically restricting server access

No business options.

### `ipblock listDeniedAddresses`

List denied IP addresses to check the server's IP denylist

No business options.

## security

Firewall and process traffic: inspect configuration and selected processes to investigate network access and activity

### `security getFirewall`

Get firewall configuration to check the server's current firewall-related settings

No business options.

### `security getProcessTraffic`

Get process traffic data for selected processes supplied as a non-empty JSON array of process objects

| Option | Required | Type | Description |
|---|---:|---|---|
| `--processes <json>` | yes | json-record-array | Process objects as a JSON array. |

## network

Network interfaces and settings: inspect interfaces, gateways, and SSH status, or detect and query interfaces by name

### `network list`

List network information, using type to select a query type supported by the server

| Option | Required | Type | Description |
|---|---:|---|---|
| `--type <integer>` | no | integer | Network list type: 0 or 1. Default: `0`. |

### `network detect`

Detect a network interface, selecting the interface to test by its name

| Option | Required | Type | Description |
|---|---:|---|---|
| `--if-name <name>` | yes | string | Network interface name. |

### `network getGateway`

Get gateway information to check network gateway configuration on the selected server

No business options.

### `network getMultiGatewayStatus`

Get multi-gateway status to inspect the server's current multi-gateway state

No business options.

### `network getNicPerformanceMode`

Get NIC performance mode to check the server's network interface performance settings

No business options.

### `network getInfo`

Get network interface information for a specified interface, selecting the target NIC by name

| Option | Required | Type | Description |
|---|---:|---|---|
| `--if-name <name>` | yes | string | Network interface name. |

### `network getSshStatus`

Get SSH service status to inspect SSH-related state on the selected server

No business options.

## share

Sharing services and links: inspect file-sharing protocols and configuration, distinguishing service settings from link permissions

### `share smbOpt`

Get SMB options to inspect protocol-level SMB service settings on the server

No business options.

### `share dlnaOptions`

Get DLNA options to inspect the server's media-sharing service configuration

No business options.

### `share dlnaShareOptions`

Get DLNA share options to inspect configuration for content shared through that protocol

No business options.

### `share ftpOptions`

Get FTP options to inspect protocol-level FTP service settings on the server

No business options.

### `share ftpShareOptions`

Get FTP share options to inspect configuration for resources shared through that protocol

No business options.

### `share nfsOptions`

Get NFS options to inspect protocol-level NFS service settings on the server

No business options.

### `share nfsShareOptions`

Get NFS share options to inspect configuration for resources shared through that protocol

No business options.

### `share smbShareOptions`

Get SMB share options to inspect configuration for resources shared through that protocol

No business options.

### `share webdavOptions`

Get WebDAV options to inspect the server's configuration for that protocol

No business options.

### `share webdavShareOptions`

Get WebDAV share options to inspect configuration for resources shared through that protocol

No business options.

### `share getLinkDefaults`

Get share link defaults to check the default configuration used for links

No business options.

### `share getDefaultLink`

Get the default share link to inspect default link information returned by the server

No business options.

### `share listLinks`

List share links with keyword filtering, pagination, sorting, and an administrator-view option

| Option | Required | Type | Description |
|---|---:|---|---|
| `--is-admin <boolean>` | no | boolean | Use administrator view. Default: `false`. |
| `--keyword <keyword>` | no | string | Search keyword. Default: `""`. |
| `--page <integer>` | no | integer | Page number. Default: `1`. |
| `--page-size <integer>` | no | integer | Items per page. Default: `100`. |
| `--sort-column <column>` | no | string | Sort column. Default: `"createdTime"`. |
| `--sort-type <type>` | no | string | Sort direction. Default: `"DESC"`. |

### `share getLinkPermission`

Get share link permission information to check link permission settings returned by the server

No business options.

## iscsi

iSCSI configuration: inspect targets, LUNs, initiators, and user groups associated with LUNs

### `iscsi getConfig`

Get iSCSI configuration to inspect the server's block storage sharing settings

No business options.

### `iscsi listInitiators`

List iSCSI initiators to inspect storage access initiator objects returned by the server

No business options.

### `iscsi listLuns`

List iSCSI LUNs to identify logical unit objects offered by the server

No business options.

### `iscsi listLunUsergroups`

List iSCSI LUN user groups, filtering associated records by LUN name and WWN

| Option | Required | Type | Description |
|---|---:|---|---|
| `--lun-name <name>` | no | string | LUN name filter. Default: `""`. |
| `--wwn <wwn>` | no | string | WWN filter. Default: `""`. |

### `iscsi listTargets`

List iSCSI targets to identify storage access target objects offered by the server

No business options.

## netsvr

Server connections, certificates, and DDNS: inspect connection configuration and status to check remote access

### `netsvr listCertificates`

List server certificates to inspect certificate-related records returned by the server

No business options.

### `netsvr getConnectionConfig`

Get connection configuration to check server connection settings rather than runtime status

No business options.

### `netsvr getConnectionStatus`

Get connection status to inspect the current runtime state of server connections

No business options.

### `netsvr listDdnsProviders`

List DDNS providers to inspect dynamic DNS provider entries offered by the server

No business options.

### `netsvr listDdnsRecords`

List DDNS records using page number and page size to inspect dynamic DNS configuration

| Option | Required | Type | Description |
|---|---:|---|---|
| `--page <integer>` | no | integer | Page number. Default: `1`. |
| `--page-size <integer>` | no | integer | Items per page. Default: `200`. |

## docker

Docker containers, images, and networks: inspect these resources and Compose projects to understand the container service

### `docker listComposes`

List Docker Compose projects to inspect orchestration project records on the server

No business options.

### `docker listContainers`

List Docker containers, including stopped containers by default; adjust this with the all option

| Option | Required | Type | Description |
|---|---:|---|---|
| `--all <boolean>` | no | boolean | Include stopped containers. Default: `true`. |

### `docker stats`

Get Docker container statistics to observe container-related resource usage

No business options.

### `docker getSystemSettings`

Get Docker system settings to check the server's container service configuration

No business options.

### `docker listImageDownloads`

List Docker image downloads to inspect task records related to image pulls

No business options.

### `docker listImages`

List Docker images to inspect container image records already on the server

No business options.

### `docker listNetworks`

List Docker networks to inspect container network objects on the server

No business options.

### `docker listRegistryRepositories`

List Docker registry repositories with keyword filtering and paginated repository queries

| Option | Required | Type | Description |
|---|---:|---|---|
| `--keyword <keyword>` | no | string | Search keyword. Default: `""`. |
| `--page <integer>` | no | integer | Page number. Default: `1`. |
| `--page-size <integer>` | no | integer | Items per page. Default: `20`. |
