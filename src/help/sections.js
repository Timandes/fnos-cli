const { getLanguage, t } = require('../i18n');
const { COMMAND_CATALOG } = require('../commands/catalog');
const { wrapParagraph } = require('./wrap');
const { m, domains, overrides, utilities } = require('./content');

const localize = value => typeof value === 'string' ? value : value[getLanguage()];
const text = (zh, en) => localize(m(zh, en));
const titles = {
  purpose: m('用途：', 'Purpose:'), objects: m('对象与关系：', 'Objects and Relationships:'),
  parameters: m('参数契约：', 'Parameter Contract:'), effects: m('条件与影响：', 'Conditions and Effects:'),
  results: m('结果：', 'Results:'), examples: m('示例：', 'Examples:'), related: m('相关命令：', 'Related Commands:')
};

function identify(path) {
  const name = path.join(' ');
  if (Object.hasOwn(utilities, name)) return { utility: utilities[name], path };
  const parts = path.length === 1 ? path[0].split('.') : path;
  if (parts.length !== 2) return null;
  const [domain, command] = parts;
  const group = COMMAND_CATALOG[domain];
  const definition = group?.commands[command];
  return definition ? { domain, command, definition, path: parts } : null;
}

function parameterContract(definition) {
  return definition.options.map(option => {
    const type = {
      string: text('非空字符串', 'non-empty string'), integer: text('整数', 'integer'),
      boolean: text('布尔值', 'boolean'), csv: text('逗号分隔列表', 'comma-separated list'),
      json: text('JSON 对象', 'JSON object'),
      'json-record-array': text('非空 JSON 对象数组', 'non-empty JSON array of objects')
    }[option.type];
    const details = [option.required ? text('必填', 'required') : text('可选', 'optional'), type];
    if (option.defaultValue !== undefined) details.push(`${t('default')}: ${JSON.stringify(option.defaultValue)}`);
    const allowed = option.allowedValues || (option.type === 'boolean' ? [true, false] : null);
    if (allowed) details.push(`${text('可选值', 'allowed')}: ${allowed.join(', ')}`);
    if (option.min !== undefined) details.push(`${text('最小值', 'minimum')}: ${option.min}`);
    if (option.max !== undefined) details.push(`${text('最大值', 'maximum')}: ${option.max}`);
    return `${option.flag} — ${t(option.description)}; ${details.join('; ')}`;
  });
}

function exampleValue(option) {
  if (option.allowedValues) return String(option.allowedValues[0]);
  if (option.type === 'integer') return `<${option.name}>`;
  if (option.type === 'json-record-array') return '[{"pid":1001,"process":"demo"}]';
  return `<${option.name}>`;
}

function commandExamples(path) {
  const found = identify(path);
  if (!found) return [];
  if (found.utility) return found.utility.examples.map(tokens => [...tokens]);
  const override = overrides[`${found.domain}.${found.command}`];
  if (override?.examples) return override.examples.map(tokens => [...tokens]);
  const tokens = ['fnos', ...found.path, '--server', 'office'];
  for (const option of found.definition.options) {
    if (option.required) tokens.push(option.flag.split(' ')[0], exampleValue(option));
  }
  return [[...tokens, '--raw']];
}

function quoteToken(value) {
  // Quotes protect shell syntax, including placeholders and JSON, without eval.
  return /^[a-zA-Z0-9_./:@=-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}
function formatExample(tokens) { return tokens.map(quoteToken).join(' '); }

function inputConstraints(definition) {
  const types = new Set(definition.options.map(option => option.type));
  const lines = [];
  if (types.has('boolean')) lines.push(text('布尔值参数必须显式带 true 或 false；不能只写参数名。', 'Boolean options require an explicit true or false value; the option name alone is insufficient.'));
  if (types.has('csv')) lines.push(text('CSV 按逗号拆分、去除首尾空白并丢弃空项；显式提供时至少需要一项，不支持值内逗号转义。', 'CSV values split on commas, trim surrounding whitespace, and discard empty entries; supplied values require at least one item, with no escaping for literal commas.'));
  if (types.has('json')) lines.push(text('JSON 必须为对象，不能为数组或 null；未明确列出的内部字段结构尚未确认。', 'JSON must be an object, not an array or null; internal field schemas not explicitly documented have not been confirmed.'));
  if (types.has('json-record-array')) lines.push(text('JSON 必须为非空对象数组，每项均为对象；shell 中应使用单引号保护整个 JSON。', 'JSON must be a non-empty array of objects; protect the entire JSON value with single quotes in a POSIX shell.'));
  if (definition.options.some(option => option.defaultValue !== undefined)) lines.push(text('默认值仅在省略参数时使用；显式空字符串仍按输入类型校验，不等同于省略。', 'Defaults apply only when an option is omitted; an explicitly empty string is validated as input and is not equivalent to omission.'));
  if (definition.options.some(option => option.name === 'page')) lines.push(text('分页接口每次只请求指定页，不自动遍历全部页面。', 'Paginated endpoints request one specified page per invocation and do not traverse all pages automatically.'));
  return lines;
}

function businessSections(found) {
  const base = domains[found.domain];
  const data = { ...base, ...overrides[`${found.domain}.${found.command}`] };
  const parameters = parameterContract(found.definition);
  const effects = [
    text('作用于所选服务器，按认证账户权限执行；接口与硬件能力以目标设备支持为准。', 'Operates on the selected server with the authenticated account permissions; API and hardware capabilities depend on the target device.'),
    text('--server 不可与临时 endpoint、username、password 或 password-stdin 组合使用。', '--server cannot be combined with temporary endpoint, username, password, or password-stdin.'),
    text('临时 endpoint 和 username 必须一起提供；未提供密码时 TTY 隐藏输入，非交互调用需提供密码输入方式。', 'Temporary endpoint and username must be supplied together; omitting a password prompts without echo in a TTY, while noninteractive calls require a password input method.'),
    ...inputConstraints(found.definition),
    ...(data.constraints || []).map(localize),
    ...(data.effects || [m('读取远端业务信息，不修改查询对象的业务配置。', 'Reads remote business information without changing business configuration.')]).map(localize)
  ];
  return {
    purpose: [localize(data.purpose)], objects: data.objects.map(localize),
    parameters: parameters.length ? parameters : [text('无业务专属参数；使用上方认证和全局选项。', 'No business-specific options; use the authentication and global options above.')],
    effects,
    results: [...data.results.map(localize),
      text('--raw 保留原始 JSON 的字段名和结构；默认格式面向人类阅读。', '--raw preserves original JSON field names and structure; the default format is intended for human reading.'),
      text('应同时检查业务响应与退出状态；收到响应本身不保证业务成功。', 'Inspect both the business response and exit status; receiving a response alone does not guarantee business success.')],
    related: data.related.filter(name => name !== found.path.join(' '))
  };
}

function getHelpSections(path) {
  const found = identify(path);
  if (!found) return [];
  let data;
  if (found.utility) {
    const source = found.utility;
    data = Object.fromEntries(['objects', 'parameters', 'results'].map(key => [key, source[key].map(localize)]));
    data.purpose = [localize(source.purpose)];
    data.effects = [...(source.constraints || []), ...source.effects].map(localize);
    data.related = source.related;
  } else data = businessSections(found);
  const examples = commandExamples(path);
  const exampleNotes = [];
  if (examples.some(tokens => tokens.includes('office'))) exampleNotes.push(text('office 为示例连接名称，请替换为实际保存的连接名称。', 'office is an example connection name; replace it with your saved connection name.'));
  if (examples.some(tokens => tokens.some(token => token.includes('<')))) exampleNotes.push(text('<...> 为占位符，请替换为实际值。', '<...> marks placeholders to replace with actual values.'));
  return [
    ...['purpose', 'objects', 'parameters', 'effects', 'results'].map(key => ({ title: localize(titles[key]), lines: data[key] })),
    { title: localize(titles.examples), lines: exampleNotes, examples },
    { title: localize(titles.related), lines: data.related.map(name => `fnos ${name} --help`) }
  ].filter(section => section.lines.length || section.examples?.length);
}

function renderHelpDetails(path, columns = 80) {
  return getHelpSections(path).map(section => [
    section.title,
    ...section.lines.map(line => wrapParagraph(line, columns)),
    ...(section.examples || []).map(tokens => `  ${formatExample(tokens)}`)
  ].join('\n')).join('\n\n');
}

module.exports = { getHelpSections, commandExamples, formatExample, renderHelpDetails };
