# Command Reference

fnos-cli exposes 111 commands across 21 domains.

## resmon

### `resmon.cpu`

Get CPU resource monitoring information

No business options.

### `resmon.gpu`

Get GPU resource monitoring information

No business options.

### `resmon.mem`

Get memory resource monitoring information

No business options.

### `resmon.disk`

Get disk resource monitoring information

No business options.

### `resmon.net`

Get network resource monitoring information

No business options.

### `resmon.gen`

Get general resource monitoring information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--items <items>` | no | csv | Comma-separated monitoring items. Default: `null`. |

### `resmon.npu`

Get NPU resource monitoring information

No business options.

### `resmon.processes`

List monitored processes

No business options.

### `resmon.serviceProcesses`

List monitored service processes

No business options.

### `resmon.systemFan`

Get system fan monitoring information

No business options.

## event

### `event.commonList`

List common event log entries

No business options.

## notify

### `notify.unreadTotal`

Get unread notification total

No business options.

## store

### `store.general`

Get storage general information

No business options.

### `store.calcSpace`

Calculate storage space information

No business options.

### `store.listDisk`

List disk information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--no-hot-spare <boolean>` | no | boolean | Exclude hot spare disks. Default: `true`. |

### `store.diskSmart`

Get disk SMART information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--disk <disk>` | yes | string | Disk device name. |

### `store.state`

Get storage state information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--name <names>` | no | csv | Comma-separated array names. Default: `[]`. |
| `--uuid <uuids>` | no | csv | Comma-separated array UUIDs. Default: `[]`. |

### `store.getUserStorage`

Get user storage information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--space-info <boolean>` | no | boolean | Include space information. Default: `false`. |
| `--stor-info <boolean>` | no | boolean | Include storage information. Default: `false`. |
| `--quota-info <boolean>` | no | boolean | Include quota information. Default: `false`. |

### `store.getCacheDeviceState`

Get cache device state

No business options.

### `store.getDiskIdleTime`

Get disk idle time

No business options.

### `store.getDiskWakeup`

Get disk wake-up state

No business options.

### `store.getRemovableConfig`

Get removable device configuration

No business options.

### `store.listCacheDevices`

List cache devices

No business options.

### `store.listRemovableDevices`

List removable devices

No business options.

## file

### `file.ls`

List files and directories

| Option | Required | Type | Description |
|---|---:|---|---|
| `--path <path>` | no | string | Directory path. Default: `null`. |

### `file.mkdir`

Create a directory

| Option | Required | Type | Description |
|---|---:|---|---|
| `--path <path>` | yes | string | Directory path. |

### `file.rm`

Remove files or directories

| Option | Required | Type | Description |
|---|---:|---|---|
| `--files <files>` | yes | csv | Comma-separated file paths. |
| `--move-to-trashbin <boolean>` | no | boolean | Move removed files to trash. Default: `true`. |
| `--details <json>` | no | json | File detail object as JSON. Default: `null`. |

### `file.getAcl`

Get file ACL information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--files <files>` | yes | csv | Comma-separated vol-prefixed paths. |

### `file.listAppDirectories`

List application directories

No business options.

### `file.listFavorites`

List favorite files

No business options.

### `file.listDirectoryEntries`

List directory entries

No business options.

### `file.listRecent`

List recent files

No business options.

### `file.listShared`

List shared files

No business options.

### `file.listSharedByOthers`

List files shared by others

No business options.

### `file.listTeamTrashBins`

List team trash bins

No business options.

### `file.listTrash`

List trash entries

No business options.

## backup

### `backup.listTasks`

List backup tasks

| Option | Required | Type | Description |
|---|---:|---|---|
| `--direction <integer>` | yes | integer | Backup direction: 0 or 1. |

## download

### `download.getDefaultSaveDirectory`

Get the default download directory

No business options.

### `download.getStatistics`

Get download statistics

No business options.

### `download.queryTasks`

Query download tasks

| Option | Required | Type | Description |
|---|---:|---|---|
| `--state-filter <integer>` | no | integer | Task state bit mask. Default: `65535`. |
| `--init-flag <boolean>` | no | boolean | Include initialization data. Default: `true`. |

## mount

### `mount.listMounts`

List mounted resources

No business options.

### `mount.getSettings`

Get mount settings

No business options.

## sysinfo

### `sysinfo.getHostName`

Get host name information

No business options.

### `sysinfo.getTrimVersion`

Get Trim version information

No business options.

### `sysinfo.getMachineId`

Get machine ID information

No business options.

### `sysinfo.getHardwareInfo`

Get hardware information

No business options.

### `sysinfo.getUptime`

Get system uptime information

No business options.

### `sysinfo.getReservedPartition`

Get reserved partition information

No business options.

## sac

### `sac.upsStatus`

Get UPS status information

No business options.

### `sac.getEmailConfig`

Get email notification configuration

No business options.

### `sac.listEmailProviders`

List email notification providers

No business options.

## license

### `license.list`

List installed software licenses

| Option | Required | Type | Description |
|---|---:|---|---|
| `--page <integer>` | no | integer | Page number. Default: `1`. |
| `--page-size <integer>` | no | integer | Items per page. Default: `200`. |

## liveupdate

### `liveupdate.getStatus`

Get live update status

No business options.

## sysrestore

### `sysrestore.getInfo`

Get system restore information

No business options.

## user

### `user.info`

Get user information

No business options.

### `user.listUG`

List users and groups

No business options.

### `user.groupUsers`

Get user grouping information

No business options.

### `user.isAdmin`

Check whether the current user is an administrator

No business options.

### `user.listTokens`

List authentication tokens

No business options.

### `user.getMyTwofaConfig`

Get current user two-factor configuration

No business options.

### `user.getGlobalTwofaConfig`

Get global two-factor configuration

No business options.

### `user.getUserTwofaConfig`

Get a user two-factor configuration

| Option | Required | Type | Description |
|---|---:|---|---|
| `--uid <integer>` | yes | integer | User ID. |

### `user.getActiveState`

Get current user active state

No business options.

### `user.getGroupInfo`

Get group information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--group <group>` | yes | string | Group name. |

### `user.listGroups`

List groups

No business options.

### `user.listLoginDevices`

List login devices

No business options.

### `user.getPreference`

Get a user preference

| Option | Required | Type | Description |
|---|---:|---|---|
| `--name <name>` | yes | string | Preference name. |

## ipblock

### `ipblock.listAllowedAddresses`

List allowed IP addresses

No business options.

### `ipblock.getAutoBlockRule`

Get automatic IP blocking rule

No business options.

### `ipblock.listDeniedAddresses`

List denied IP addresses

No business options.

## security

### `security.getFirewall`

Get firewall configuration

No business options.

### `security.getProcessTraffic`

Get process traffic data

| Option | Required | Type | Description |
|---|---:|---|---|
| `--processes <json>` | yes | json-record-array | Process objects as a JSON array. |

## network

### `network.list`

List network information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--type <integer>` | no | integer | Network list type: 0 or 1. Default: `0`. |

### `network.detect`

Detect a network interface

| Option | Required | Type | Description |
|---|---:|---|---|
| `--if-name <name>` | yes | string | Network interface name. |

### `network.getGateway`

Get gateway information

No business options.

### `network.getMultiGatewayStatus`

Get multi-gateway status

No business options.

### `network.getNicPerformanceMode`

Get NIC performance mode

No business options.

### `network.getInfo`

Get network interface information

| Option | Required | Type | Description |
|---|---:|---|---|
| `--if-name <name>` | yes | string | Network interface name. |

### `network.getSshStatus`

Get SSH service status

No business options.

## share

### `share.smbOpt`

Get SMB options

No business options.

### `share.dlnaOptions`

Get DLNA options

No business options.

### `share.dlnaShareOptions`

Get DLNA share options

No business options.

### `share.ftpOptions`

Get FTP options

No business options.

### `share.ftpShareOptions`

Get FTP share options

No business options.

### `share.nfsOptions`

Get NFS options

No business options.

### `share.nfsShareOptions`

Get NFS share options

No business options.

### `share.smbShareOptions`

Get SMB share options

No business options.

### `share.webdavOptions`

Get WebDAV options

No business options.

### `share.webdavShareOptions`

Get WebDAV share options

No business options.

### `share.getLinkDefaults`

Get share link defaults

No business options.

### `share.getDefaultLink`

Get the default share link

No business options.

### `share.listLinks`

List share links

| Option | Required | Type | Description |
|---|---:|---|---|
| `--is-admin <boolean>` | no | boolean | Use administrator view. Default: `false`. |
| `--keyword <keyword>` | no | string | Search keyword. Default: `""`. |
| `--page <integer>` | no | integer | Page number. Default: `1`. |
| `--page-size <integer>` | no | integer | Items per page. Default: `100`. |
| `--sort-column <column>` | no | string | Sort column. Default: `"createdTime"`. |
| `--sort-type <type>` | no | string | Sort direction. Default: `"DESC"`. |

### `share.getLinkPermission`

Get share link permission

No business options.

## iscsi

### `iscsi.getConfig`

Get iSCSI configuration

No business options.

### `iscsi.listInitiators`

List iSCSI initiators

No business options.

### `iscsi.listLuns`

List iSCSI LUNs

No business options.

### `iscsi.listLunUsergroups`

List iSCSI LUN user groups

| Option | Required | Type | Description |
|---|---:|---|---|
| `--lun-name <name>` | no | string | LUN name filter. Default: `""`. |
| `--wwn <wwn>` | no | string | WWN filter. Default: `""`. |

### `iscsi.listTargets`

List iSCSI targets

No business options.

## netsvr

### `netsvr.listCertificates`

List server certificates

No business options.

### `netsvr.getConnectionConfig`

Get connection configuration

No business options.

### `netsvr.getConnectionStatus`

Get connection status

No business options.

### `netsvr.listDdnsProviders`

List DDNS providers

No business options.

### `netsvr.listDdnsRecords`

List DDNS records

| Option | Required | Type | Description |
|---|---:|---|---|
| `--page <integer>` | no | integer | Page number. Default: `1`. |
| `--page-size <integer>` | no | integer | Items per page. Default: `200`. |

## docker

### `docker.listComposes`

List Docker Compose projects

No business options.

### `docker.listContainers`

List Docker containers

| Option | Required | Type | Description |
|---|---:|---|---|
| `--all <boolean>` | no | boolean | Include stopped containers. Default: `true`. |

### `docker.stats`

Get Docker container statistics

No business options.

### `docker.getSystemSettings`

Get Docker system settings

No business options.

### `docker.listImageDownloads`

List Docker image downloads

No business options.

### `docker.listImages`

List Docker images

No business options.

### `docker.listNetworks`

List Docker networks

No business options.

### `docker.listRegistryRepositories`

List Docker registry repositories

| Option | Required | Type | Description |
|---|---:|---|---|
| `--keyword <keyword>` | no | string | Search keyword. Default: `""`. |
| `--page <integer>` | no | integer | Page number. Default: `1`. |
| `--page-size <integer>` | no | integer | Items per page. Default: `20`. |
