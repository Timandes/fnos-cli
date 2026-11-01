// Chinese copy is authored first; its English translation travels with it.
const m = (zh, en) => Object.freeze({ 'zh-CN': zh, en });
const context = (purpose, objects, results, related) => ({ purpose, objects: [objects], results: [results], related });

const domains = {
  resmon: context(m('排查服务器资源使用情况；每次调用读取一次接口响应，持续监控需要重复采样。', 'Investigate server resource usage; each invocation reads one API response, so ongoing monitoring requires repeated sampling.'), m('监控对象属于所选服务器。进程、服务进程与硬件资源是不同的观察对象。', 'Monitored objects belong to the selected server. Processes, service processes, and hardware resources are distinct observation targets.'), m('返回所选监控接口的数据；指标可用性取决于设备与服务端，不猜测缺失指标的值或单位。', 'Returns data from the selected monitoring endpoint; metric availability depends on the device and server. Do not infer values or units for missing metrics.'), ['resmon gen', 'resmon processes']),
  event: context(m('通过事件日志了解服务器活动并辅助排查问题。', 'Use event entries to understand server activity and investigate problems.'), m('日志条目来自所选服务器，不是运行 CLI 的本机日志。', 'Event entries come from the selected server, not the computer running the CLI.'), m('返回服务端提供的事件日志条目。', 'Returns event log entries supplied by the server.'), ['sysinfo getTrimVersion']),
  notify: context(m('检查当前账户是否存在尚未查看的通知。', 'Check whether the current account has notifications to review.'), m('通知查询使用所选服务器和本次认证账户的上下文。', 'Notification queries use the selected server and the authenticated account context.'), m('返回未读通知数量；此接口不返回通知正文。', 'Returns an unread notification count; this endpoint does not return notification bodies.'), ['user info']),
  store: context(m('了解服务器存储情况，为磁盘、阵列或用户存储的后续查询选择对象。', 'Inspect server storage to select disks, arrays, or user storage for subsequent queries.'), m('磁盘设备名、阵列名称、阵列 UUID 和用户存储不是同一种标识；标识只用于取得它的服务器。', 'Disk device names, array names, array UUIDs, and user storage are distinct identifiers or objects; use identifiers on the server where they were obtained.'), m('返回对应存储接口的信息；未核实的字段或单位应按服务端响应进一步确认。', 'Returns information from the selected storage endpoint; unverified fields or units require confirmation from the server response.'), ['store general', 'store listDisk', 'store state']),
  file: context(m('在远端浏览或定位文件系统对象，为文件管理操作核对目标。', 'Browse or locate remote filesystem objects to check targets for file management operations.'), m('路径属于所选 fnOS 服务器，不是本机路径。不同文件接口的路径格式不能直接假定相同。', 'Paths belong to the selected fnOS server, not the local computer. Do not assume that different file endpoints accept identical path formats.'), m('返回服务端文件接口的响应；文件名与用户数据保持原文。', 'Returns the server file endpoint response; filenames and user data remain unchanged.'), ['file ls', 'file getAcl', 'file listTrash']),
  backup: context(m('按备份方向查询任务，了解相应任务列表。', 'Inspect backup task lists for a selected backup direction.'), m('任务属于所选服务器。direction 只接受 0 或 1，两个值的业务含义尚未确认。', 'Tasks belong to the selected server. direction accepts only 0 or 1; their business meanings have not been confirmed.'), m('返回指定方向的备份任务，不创建或启动备份。', 'Returns backup tasks for the specified direction without creating or starting a backup.'), ['sysinfo getTrimVersion']),
  download: context(m('查看下载中心的任务、统计或默认保存位置。', 'Inspect download center tasks, statistics, or the default save location.'), m('下载任务和保存目录均属于所选服务器；状态位掩码用于筛选任务，不是任务 ID。', 'Download tasks and save directories belong to the selected server; a state bit mask filters tasks and is not a task ID.'), m('返回对应下载中心接口的响应。', 'Returns the response from the selected download center endpoint.'), ['download queryTasks', 'download getStatistics', 'download getDefaultSaveDirectory']),
  mount: context(m('核对服务器挂载资源及其设置。', 'Check server mount resources and their settings.'), m('挂载对象属于所选服务器，不表示本机操作系统的挂载列表。', 'Mount objects belong to the selected server, not the local operating system mount list.'), m('返回挂载资源或挂载配置，不执行挂载或卸载。', 'Returns mounted resources or mount configuration without mounting or unmounting resources.'), ['mount listMounts', 'mount getSettings']),
  sysinfo: context(m('确认目标服务器的身份、系统版本或运行环境。', 'Identify the target server, system version, or runtime environment.'), m('信息来自本次实际请求的服务器，可用于核对已保存连接指向的目标。', 'Information comes from the server actually contacted and can help verify the target of a saved connection.'), m('返回对应系统信息；具体字段以服务端响应为准。', 'Returns the requested system information; exact fields depend on the server response.'), ['sysinfo getHostName', 'sysinfo getTrimVersion', 'sysinfo getHardwareInfo']),
  sac: context(m('核对 UPS 或邮件通知相关配置与状态。', 'Check UPS or email notification configuration and status.'), m('UPS、邮件配置和服务商记录属于所选服务器，分别由对应接口查询。', 'UPS state, email settings, and provider records belong to the selected server and are queried through separate endpoints.'), m('返回对应状态或配置，不发送测试邮件或调整 UPS。', 'Returns the requested state or configuration without sending test mail or adjusting the UPS.'), ['sac upsStatus', 'sac getEmailConfig', 'sac listEmailProviders']),
  license: context(m('按页查看服务器安装的软件许可记录。', 'Inspect installed software license records by page.'), m('许可属于所选服务器；页码与每页条数选择本次返回的记录范围。', 'Licenses belong to the selected server; page number and page size select the record range for this response.'), m('一次调用只请求指定页，不自动遍历所有页。', 'Each invocation requests the specified page and does not traverse all pages automatically.'), ['sysinfo getTrimVersion']),
  liveupdate: context(m('检查系统更新相关状态。', 'Inspect system update status.'), m('查询所选服务器的在线更新接口，不是查询 CLI 的 npm 版本。', 'Queries the selected server online update endpoint, not the CLI npm package version.'), m('返回更新状态；不下载、安装或启动系统升级。', 'Returns update status without downloading, installing, or initiating a system upgrade.'), ['sysinfo getTrimVersion']),
  sysrestore: context(m('查看系统还原相关信息。', 'Inspect system restore information.'), m('还原信息属于所选服务器，不是本机配置备份。', 'Restore information belongs to the selected server, not a local CLI configuration backup.'), m('返回还原信息，不创建还原点或触发还原。', 'Returns restore information without creating restore points or triggering a restore.'), ['sysinfo getTrimVersion']),
  user: context(m('核对账户、用户组或认证设置，区分个人与全局查询。', 'Check accounts, groups, or authentication settings, distinguishing personal queries from global queries.'), m('用户和用户组属于所选服务器；用户名、整数 uid 与用户组名称不能混用。', 'Users and groups belong to the selected server; usernames, integer uids, and group names are not interchangeable.'), m('返回对应用户接口的信息；全局设置与个人设置不是同一查询对象。', 'Returns information from the selected user endpoint; global settings and personal settings are distinct query targets.'), ['user info', 'user listUG', 'user listGroups']),
  ipblock: context(m('核对服务器 IP 访问限制和自动封禁设置。', 'Check server IP access restrictions and automatic blocking settings.'), m('允许列表、拒绝列表与自动封禁规则是不同对象，不能把未列出地址视为已允许访问。', 'Allowlists, denylists, and automatic blocking rules are distinct objects; an address absent from one list is not proof that access is allowed.'), m('返回对应列表或规则，不修改访问限制。', 'Returns the requested list or rule without modifying access restrictions.'), ['ipblock listAllowedAddresses', 'ipblock listDeniedAddresses', 'ipblock getAutoBlockRule']),
  security: context(m('核对防火墙配置或排查指定进程的网络流量。', 'Inspect firewall configuration or investigate network traffic for selected processes.'), m('防火墙配置与进程流量属于所选服务器，进程对象不能使用本机进程替代。', 'Firewall configuration and process traffic belong to the selected server; local processes cannot substitute for server process objects.'), m('返回所选安全接口的数据，不修改防火墙规则。', 'Returns data from the selected security endpoint without changing firewall rules.'), ['security getFirewall', 'resmon processes']),
  network: context(m('核对服务器网络配置、接口信息或执行指定接口检测。', 'Inspect server network configuration and interfaces, or perform detection on a selected interface.'), m('接口名属于所选服务器。可先查询 network list，再按返回的接口名使用 --if-name；具体返回字段尚未确认。', 'Interface names belong to the selected server. Query network list before using a returned interface name with --if-name; the exact response field has not been confirmed.'), m('返回对应网络接口的信息或检测结果。', 'Returns information or detection results from the selected network endpoint.'), ['network list', 'network getInfo', 'network getGateway']),
  share: context(m('核对文件共享协议、共享配置或分享链接。', 'Inspect file-sharing protocols, share configuration, or share links.'), m('协议服务设置、协议下的共享资源配置与分享链接权限是不同对象。', 'Protocol service settings, shared resource configuration, and share link permissions are distinct objects.'), m('返回对应配置或链接记录，不修改共享服务或创建分享链接。', 'Returns configuration or link records without changing sharing services or creating links.'), ['share smbOpt', 'share smbShareOptions', 'share listLinks']),
  iscsi: context(m('识别 iSCSI 存储访问对象并核对相关配置。', 'Identify iSCSI storage access objects and inspect their configuration.'), m('target、LUN、initiator 和 LUN 用户组是不同对象。listLunUsergroups 可按 LUN 名称和 WWN 筛选；其他关联键尚未确认。', 'Targets, LUNs, initiators, and LUN user groups are distinct objects. listLunUsergroups accepts LUN name and WWN filters; other relationship keys have not been confirmed.'), m('返回对应 iSCSI 配置或对象列表，不创建存储目标或映射。', 'Returns iSCSI configuration or object lists without creating storage targets or mappings.'), ['iscsi listTargets', 'iscsi listLuns', 'iscsi listInitiators', 'iscsi listLunUsergroups']),
  netsvr: context(m('核对远程访问所需的连接、证书或动态域名信息。', 'Inspect connections, certificates, or dynamic DNS information for remote access.'), m('连接配置描述设置，连接状态描述运行情况；证书和 DDNS 记录是独立对象。', 'Connection configuration describes settings, while connection status describes runtime state; certificates and DDNS records are separate objects.'), m('返回对应配置、状态或记录；不更新证书或修改 DDNS。', 'Returns configuration, state, or records without updating certificates or modifying DDNS.'), ['netsvr getConnectionConfig', 'netsvr getConnectionStatus', 'netsvr listCertificates', 'netsvr listDdnsRecords']),
  docker: context(m('查看容器服务对象与资源使用情况。', 'Inspect container service objects and resource usage.'), m('Compose 项目、容器、镜像和网络是不同对象。此 CLI 未确认跨列表关联字段，不应把名称或 ID 相互替代。', 'Compose projects, containers, images, and networks are distinct objects. Cross-list relationship fields have not been confirmed by this CLI; names and IDs are not interchangeable.'), m('返回对应 Docker 接口的数据，不创建、启动或删除容器。', 'Returns data from the selected Docker endpoint without creating, starting, or deleting containers.'), ['docker listContainers', 'docker stats', 'docker listImages', 'docker listNetworks'])
};

const overrides = {
  'store.listDisk': {
    purpose: m('发现服务器上的磁盘及其设备名，为 SMART 等详情查询选择目标。', 'Discover server disks and their device names to select targets for SMART and other detail queries.'),
    objects: [m('返回的 disk[].name 是磁盘设备名，可传给同一服务器上 store diskSmart 的 --disk。', 'The returned disk[].name is a disk device name accepted by store diskSmart --disk on the same server.')],
    constraints: [m('true 排除热备盘，false 不排除；默认结果不能直接视为全部磁盘清单。', 'true excludes hot spares; false does not exclude them. The default result is not an exhaustive disk inventory.')],
    effects: [m('读取磁盘信息，不修改磁盘配置，也不启动 SMART 自检。', 'Reads disk information without changing disk configuration or starting a SMART self-test.')],
    results: [m('返回磁盘列表；设备名位于 disk[].name。列出磁盘不代表已完成磁盘健康检查。', 'Returns the disk list with device names at disk[].name. Listing disks does not constitute a disk health check.')],
    examples: [['fnos', 'store', 'listDisk', '--server', 'office', '--raw'], ['fnos', 'store', 'listDisk', '--server', 'office', '--no-hot-spare', 'false', '--raw']],
    related: ['store diskSmart', 'store state']
  },
  'store.diskSmart': {
    objects: [m('--disk 是磁盘设备名，取自同一服务器 store listDisk 返回的 disk[].name；不是阵列 UUID 或文件路径。', '--disk is a disk device name from disk[].name returned by store listDisk on the same server, not an array UUID or file path.')],
    effects: [m('读取 SMART 信息，不启动 SMART 自检。', 'Reads SMART information without starting a SMART self-test.')],
    results: [m('返回磁盘 SMART 信息；字段可用性随设备而异。缺少指标不等于指标正常，请勿仅凭请求成功判定磁盘健康。', 'Returns disk SMART information; available fields vary by device. Missing metrics do not imply normal values, and request success alone does not establish disk health.')],
    related: ['store listDisk']
  },
  'store.state': { constraints: [m('省略 name 或 uuid 时 CLI 传入空数组；显式空字符串不能替代省略。两个筛选条件组合的服务端语义尚未确认。', 'Omitting name or uuid passes an empty array; an explicitly empty string is not equivalent to omission. Server semantics for combining both filters have not been confirmed.')] },
  'file.mkdir': { effects: [m('创建远端目录并修改文件系统；CLI 不提供预演或执行前确认。', 'Creates a remote directory and changes the filesystem; the CLI provides no dry run or confirmation.')] },
  'file.rm': {
    purpose: m('清理已确认不再需要的远端文件或目录，调用前核对服务器及目标路径。', 'Remove remote files or directories that are no longer needed, checking the server and target paths before invocation.'),
    effects: [m('修改远端文件系统；CLI 不提供预演或执行前确认。默认请求移入回收站，false 请求直接删除。', 'Changes the remote filesystem with no dry run or confirmation. The default requests trash; false requests direct deletion.')],
    constraints: [m('回收站可用性由服务端决定；details 内部字段结构尚未确认，不应猜测填写。', 'Trash availability is determined by the server; the internal details schema has not been confirmed and must not be guessed.')],
    results: [m('返回删除操作的服务端响应。请求移入回收站不代表已经验证文件可以恢复。', 'Returns the server response to the removal operation. Requesting trash does not establish that the files can be recovered.')]
  },
  'file.getAcl': { objects: [m('--files 使用 vol{stor_id}/{path} 格式的远端路径；不是宿主机绝对路径。不同文件接口返回的路径需核实后再使用。', '--files uses remote paths in vol{stor_id}/{path} form, not host absolute paths. Verify paths from other file endpoints before reusing them.')] },
  'resmon.gen': { constraints: [m('省略 items 时 SDK 请求 storeSpeed、netSpeed、cpuBusy、memPercent；这些项目名区分拼写。', 'When items is omitted, the SDK requests storeSpeed, netSpeed, cpuBusy, and memPercent; use these item spellings exactly.')] },
  'user.info': { objects: [m('查询对象为本次认证账户，不接受用于选择其他用户的 uid 参数。', 'Queries the authenticated account and does not accept a uid option for selecting another user.')] },
  'user.getMyTwofaConfig': { objects: [m('查询本次认证账户的两步验证配置；其他用户的配置由 getUserTwofaConfig 按 uid 查询。', 'Queries two-factor configuration for the authenticated account; getUserTwofaConfig queries another selected user by uid.')] },
  'user.getGlobalTwofaConfig': { objects: [m('查询服务器全局两步验证设置，不代表某个用户的个人配置。', 'Queries server-wide two-factor settings rather than an individual user configuration.')] },
  'user.getUserTwofaConfig': { objects: [m('--uid 是目标服务器的非负整数用户 ID，不是用户名。可先使用 user listUG 发现用户；对应 ID 字段尚未确认。', '--uid is a non-negative integer user ID on the target server, not a username. Use user listUG to discover users; the exact ID field has not been confirmed.')], related: ['user listUG', 'user getMyTwofaConfig', 'user getGlobalTwofaConfig'] },
  'user.getGroupInfo': { objects: [m('--group 使用用户组名称，可先通过同一服务器的 user listGroups 发现用户组；不要传用户 uid。', '--group accepts a group name discoverable through user listGroups on the same server; do not pass a user uid.')], related: ['user listGroups', 'user groupUsers'] },
  'user.getPreference': { constraints: [m('此处 name 是服务端用户偏好名称，与 config 命令管理的 CLI 本地 language 偏好不同。可用名称尚未列全。', 'Here name identifies a server-side user preference, distinct from the local CLI language preference managed by config. Available names are not fully documented.')] },
  'network.detect': { effects: [m('向所选服务器请求指定接口检测，不修改 CLI 的网络配置；检测过程的具体网络活动由服务端决定。', 'Requests detection for the selected server interface without changing CLI network configuration; the server determines the detection network activity.')] },
  'network.list': { constraints: [m('type 只接受 0 或 1，两个值对应的业务含义尚未确认。', 'type accepts only 0 or 1; their business meanings have not been confirmed.')] },
  'security.getProcessTraffic': { constraints: [m('processes 必须为非空 JSON 对象数组。示例字段为现有 CLI 示例使用的 pid 和 process；完整对象结构尚未确认。', 'processes must be a non-empty JSON array of objects. The example uses pid and process from the existing CLI example; the full object schema has not been confirmed.')] },
  'download.queryTasks': { constraints: [m('stateFilter 为非负整数位掩码，具体状态位含义尚未确认；不能把它当作单个任务 ID。', 'stateFilter is a non-negative integer bit mask; individual state bit meanings have not been confirmed. It is not a task ID.')] },
  'docker.listContainers': { constraints: [m('all 默认 true，包含已停止容器；false 请求不包含已停止容器的列表。', 'all defaults to true and includes stopped containers; false requests a list without stopped containers.')] }
};

const utilities = {
  login: {
    purpose: m('为后续业务命令建立服务器认证记录。', 'Establish saved server authentication for subsequent business commands.'),
    objects: [m('server 是本地连接名称，关联 endpoint 与认证记录；省略时保存为 default。', 'server is a local connection name associated with an endpoint and authentication record; omission saves as default.')],
    parameters: [m('auth 接受 password 或 oauth，默认 password；两种方式均必须提供 endpoint，password 还必须提供 username。', 'auth accepts password or oauth and defaults to password; both require endpoint, while password also requires username.'), m('password 与 password-stdin 互斥；省略密码时交互终端隐藏输入，非交互调用需提供输入方式。', 'password and password-stdin are mutually exclusive; omission prompts without echo in a TTY, while noninteractive calls require a password input method.')],
    constraints: [m('OAuth 需要交互终端、浏览器授权和授权码，不可组合用户名、密码、两步验证码或 trust-device。服务端 OAuth 支持需另行确认。', 'OAuth requires a TTY, browser authorization, and an authorization code; it cannot combine username, password, two-factor code, or trust-device. Server OAuth support must be confirmed separately.'), m('verify-ssl 默认关闭；开启后验证证书，OAuth 要求 HTTPS origin。登录保存此策略。', 'verify-ssl is disabled by default; enabling it verifies certificates and requires an HTTPS origin for OAuth. Login saves this policy.')],
    effects: [m('连接远端服务器进行认证，并写入本地认证记录；已有同名记录可能被更新。', 'Contacts the remote server to authenticate and writes local authentication records; an existing record with the same name may be updated.')],
    results: [m('成功摘要说明认证记录是否已保存，不包含密码或 token。', 'The success summary indicates saved authentication without including passwords or tokens.')],
    examples: [['fnos', 'login', '--server', 'office', '-e', '<endpoint>', '-u', '<username>'], ['fnos', 'login', '--auth', 'oauth', '--server', 'office', '-e', 'https://<host>:<port>']], related: ['auth.status', 'sysinfo getTrimVersion', 'logout']
  },
  logout: {
    purpose: m('移除不再使用的本地连接认证记录。', 'Remove saved authentication for a local connection that is no longer needed.'),
    objects: [m('server 选择本地保存的连接；省略时沿用现有连接选择规则。', 'server selects a locally saved connection; omission uses the existing connection selection rules.')],
    parameters: [m('可使用 --server 指定连接；不需要远端密码。', 'Use --server to select a connection; no remote password is required.')],
    effects: [m('清除所选连接的本地认证记录，不联系服务器，也不撤销服务端 token 或退出其他设备。', 'Clears the selected local authentication record; it does not contact the server, revoke server tokens, or log out other devices.')],
    results: [m('返回本地清除结果；未指定连接且没有记录时成功返回。', 'Reports the local removal result; succeeds when no connection is specified and no records exist.')],
    examples: [['fnos', 'logout', '--server', 'office']], related: ['auth.status', 'login']
  },
  'auth.status': {
    purpose: m('核对已保存连接的目标、认证类型和本地到期信息。', 'Check the target, authentication type, and local expiry metadata of a saved connection.'),
    objects: [m('server 选择本地认证记录，不代表服务器当前在线或授权仍有效。', 'server selects a local authentication record, not proof that the server is online or authorization remains valid.')],
    parameters: [m('可用 --server 显式选择连接；省略时沿用已有选择规则。', 'Use --server to explicitly select a connection; omission uses existing selection rules.')],
    effects: [m('仅查询本地元数据，不联系服务器，也不验证或刷新 token。', 'Reads local metadata only; it does not contact the server or verify or refresh tokens.')],
    results: [m('返回 server、endpoint、authType、verifySsl；OAuth 还包括 expiresAt 和 expired。expired 仅依据本地到期时间。', 'Returns server, endpoint, authType, and verifySsl; OAuth also includes expiresAt and expired. expired is based only on the locally saved expiry time.')],
    examples: [['fnos', 'auth.status', '--server', 'office', '--raw']], related: ['sysinfo getTrimVersion', 'login', 'logout']
  },
  completion: {
    purpose: m('生成供当前 shell 加载的补全脚本。', 'Generate a completion script for the current shell to load.'),
    objects: [m('作用于运行 CLI 的本机 shell，不连接 NAS。', 'Applies to the local shell running the CLI and does not contact a NAS.')],
    parameters: [m('shell 只支持 zsh；省略 shell 时显示帮助。', 'Only zsh is supported for shell; omitting shell displays help.')],
    effects: [m('脚本写入 stdout，不自动执行脚本或修改 shell 配置。', 'Writes the script to stdout without executing it or modifying shell configuration.')],
    results: [m('生成时的显示语言写入静态补全描述，修改语言后需要重新生成。', 'Static completion descriptions use the language active at generation time; regenerate after changing language.')],
    examples: [['fnos', 'completion', 'zsh']], related: ['completion install']
  },
  'completion install': {
    purpose: m('将补全脚本安装到本机当前用户目录。', 'Install a completion script in the current local user directory.'),
    objects: [m('安装对象是本机 zsh 补全文件，与服务器连接和凭据无关。', 'Installs a local zsh completion file independently of server connections or credentials.')],
    parameters: [m('shell 必填，目前只支持 zsh。', 'shell is required and currently supports only zsh.')],
    effects: [m('写入 ~/.fnos/completions/_fnos，并提示如何配置 fpath 和 compinit；不自动修改 ~/.zshrc。', 'Writes ~/.fnos/completions/_fnos and explains fpath and compinit setup; it does not modify ~/.zshrc automatically.')],
    results: [m('输出安装位置和启用步骤；修改显示语言后需重新安装以更新静态描述。', 'Reports the install path and enablement steps; reinstall after changing language to update static descriptions.')],
    examples: [['fnos', 'completion', 'install', 'zsh']], related: ['completion']
  }
};
for (const operation of ['get', 'set', 'unset']) {
  utilities[`config ${operation}`] = {
    purpose: m('管理本机 CLI 显示语言，不修改服务器设置或认证目标。', 'Manage the local CLI display language without changing server settings or authentication targets.'),
    objects: [m('language 是 ~/.fnos/settings.json 中的本地偏好，不是 user getPreference 查询的服务端用户偏好。', 'language is a local preference in ~/.fnos/settings.json, distinct from server-side preferences queried by user getPreference.')],
    parameters: [m('key 只支持 language；set 还需提供 zh-CN 或 en。', 'key supports only language; set also requires zh-CN or en.')],
    constraints: [m('优先级：命令行 --lang > FNOS_LANG > 已保存偏好 > zh-CN。', 'Priority: command-line --lang > FNOS_LANG > saved preference > zh-CN.')],
    effects: [operation === 'get' ? m('读取本地偏好，不写配置或连接服务器。', 'Reads the local preference without writing configuration or contacting the server.') : m('更新本地语言偏好，供后续调用使用；本次调用仍沿用启动时选定的语言。', 'Updates the local language preference for subsequent invocations; this invocation retains its startup language.')],
    results: [operation === 'get' ? m('返回 language、effectiveLanguage 和 source，分别表示保存值、当前生效值及来源。', 'Returns language, effectiveLanguage, and source: the saved value, effective value, and selection source.') : m('返回操作后的 language 值；unset 返回 null，临时覆盖仍然有效。', 'Returns the resulting language value; unset returns null, while temporary overrides still apply.')],
    examples: [['fnos', 'config', operation, 'language', ...(operation === 'set' ? ['en'] : [])]], related: ['config get', 'config set', 'config unset'].filter(x => x !== `config ${operation}`)
  };
}

module.exports = { m, domains, overrides, utilities };
