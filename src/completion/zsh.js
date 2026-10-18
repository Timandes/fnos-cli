function visibleText(value) {
  return String(value).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function quoteZsh(value) {
  return `'${visibleText(value).replace(/'/g, `'\\''`)}'`;
}

function escapeZshSpecText(value) {
  return visibleText(value).replace(/[\\[\]:]/g, '\\$&');
}

function functionName(path) {
  if (path.length === 0) return '_fnos_root';
  const suffix = Buffer.from(path.join('\0'), 'utf8').toString('hex');
  return `_fnos_node_${suffix}`;
}

const SERVER_HELPERS = `typeset -ga _fnos_server_cache
typeset -g _fnos_server_cache_key=''

_fnos_settings_key() {
  zmodload -F zsh/stat b:zstat 2>/dev/null || return 1
  local -A details
  if ! zstat -H details -- "\${HOME}/.fnos/settings.json" 2>/dev/null; then
    REPLY='missing'
    return 0
  fi
  REPLY="\${details[inode]}:\${details[size]}:\${details[mtime]}"
}

_fnos_complete_servers() {
  local key
  if ! _fnos_settings_key; then
    local -a uncached
    uncached=("\${(@f)\$(command fnos __complete server 2>/dev/null)}")
    (( \${#uncached} )) && compadd -- "\${uncached[@]}"
    return
  fi
  key="$REPLY"
  if [[ "$key" != "$_fnos_server_cache_key" ]]; then
    _fnos_server_cache=("\${(@f)\$(command fnos __complete server 2>/dev/null)}")
    _fnos_server_cache_key="$key"
  fi
  (( \${#_fnos_server_cache} )) && compadd -- "\${_fnos_server_cache[@]}"
}`;

function optionAction(option) {
  if (!option.requiredValue && !option.optionalValue) return '';
  const labelMatch = option.flags.match(/[<\[]([^>\]]+)[>\]]/);
  const label = escapeZshSpecText(labelMatch?.[1] || 'value');
  const separator = option.optionalValue ? '::' : ':';
  if (option.completion?.kind === 'server') {
    return `${separator}${label}:->fnos_servers`;
  }
  if (option.completion?.kind === 'values') {
    const values = option.completion.values.map(escapeZshSpecText).join(' ');
    return `${separator}${label}:(${values})`;
  }
  return `${separator}${label}:`;
}

function renderOptionSpecs(option) {
  const names = [option.short, option.long].filter(Boolean);
  const exclusion = names.join(' ');
  const repeat = option.variadic ? '*' : '';
  const description = escapeZshSpecText(option.description);
  const action = optionAction(option);
  return names.map((name) => {
    const valueSyntax = action ? (name === option.long ? '=' : '+') : '';
    return `${repeat}(${exclusion})${name}${valueSyntax}[${description}]${action}`;
  });
}

function flatten(node) {
  return [node, ...node.commands.flatMap(flatten)];
}

function childCandidates(node) {
  return node.commands.map((child) => ({
    value: child.name,
    description: child.description,
    functionName: functionName(child.path)
  }));
}

function fixedArgumentCandidates(argument) {
  if (argument?.completion?.kind !== 'values') return [];
  return argument.completion.values.map((value) => ({
    value,
    description: argument.description,
    functionName: null
  }));
}

function mergeCandidates(...groups) {
  const merged = new Map();
  for (const candidate of groups.flat()) {
    if (!merged.has(candidate.value)) merged.set(candidate.value, candidate);
  }
  return [...merged.values()];
}

function candidateEntry(candidate) {
  return quoteZsh(
    `${escapeZshSpecText(candidate.value)}:` +
    escapeZshSpecText(candidate.description || candidate.value)
  );
}

function renderCandidateCase(stateName, label, candidates) {
  const entries = candidates
    .map((candidate) => '        ' + candidateEntry(candidate))
    .join('\n');
  return [
    '    ' + stateName + ')',
    '      local -a candidates',
    '      candidates=(',
    entries,
    '      )',
    '      _describe ' + quoteZsh(label) + ' candidates',
    '      ;;'
  ].join('\n');
}

function renderNodeFunction(node) {
  const specs = [];
  const cases = [];
  for (const option of node.options) specs.push(...renderOptionSpecs(option));

  const children = childCandidates(node);
  node.arguments.forEach((argument, index) => {
    const position = index + 1;
    const values = fixedArgumentCandidates(argument);
    const candidates = index === 0
      ? mergeCandidates(children, values)
      : values;
    const label = argument.description || argument.name;
    if (candidates.length === 0) {
      const repeat = argument.variadic ? '*' : '';
      specs.push(
        repeat + String(position) + ':' + escapeZshSpecText(label) + ':'
      );
      return;
    }
    const stateName = 'fnos_values_' + String(position);
    specs.push(
      String(position) + ':' + escapeZshSpecText(label) + ':->' + stateName
    );
    cases.push(renderCandidateCase(stateName, label, candidates));
  });

  if (node.arguments.length === 0 && children.length > 0) {
    const position = 1;
    const stateName = 'fnos_values_' + String(position);
    specs.push(String(position) + ':command:->' + stateName);
    cases.push(renderCandidateCase(stateName, 'command', children));
  }

  if (node.options.some((option) => option.completion?.kind === 'server')) {
    cases.push('    fnos_servers)\n      _fnos_complete_servers\n      ;;');
  }
  if (children.length > 0) {
    const childPosition = 1;
    specs.push('*:argument:->fnos_dispatch');
    const branches = children.map((child) =>
      '        ' + quoteZsh(child.value) + ') ' +
      child.functionName + ' "$@" ;;'
    ).join('\n');
    cases.push([
      '    fnos_dispatch)',
      '      (( NORMARG > 0 )) || return 1',
      '      (( CURRENT -= NORMARG - 1 ))',
      '      words=( "${(@)words[NORMARG,-1]}" )',
      '      case "${line[' + String(childPosition) + ']}" in',
      branches,
      '      esac',
      '      ;;'
    ].join('\n'));
  }

  const argumentsBlock = specs
    .map((spec) => '    ' + quoteZsh(spec))
    .join(' \\' + '\n');
  // Stop parent option parsing at the command so child options keep their context.
  const parserFlags = children.length > 0 ? '-C -n -A "-*"' : '-C';
  const lines = [
    functionName(node.path) + '() {',
    '  local context state state_descr line',
    '  integer NORMARG',
    '  typeset -A opt_args',
    '  _arguments ' + parserFlags + ' \\',
    argumentsBlock + ' && return 0'
  ];
  if (cases.length > 0) {
    lines.push('  case "$state" in', cases.join('\n'), '  esac');
  }
  lines.push('}');
  return lines.join('\n');
}

function renderZsh(spec, options = {}) {
  const format = options.format || 'source';
  const version = options.version || 'unknown';
  if (!['source', 'autoload'].includes(format)) {
    throw new TypeError(`Unsupported zsh completion format: ${format}`);
  }
  const definitions = flatten(spec)
    .map((node) => renderNodeFunction(node))
    .join('\n\n');
  const common = `${SERVER_HELPERS}\n\n${definitions}\n\n` +
    `_fnos() {\n  _fnos_root "$@"\n}`;
  if (format === 'source') {
    return `${common}\n` +
      `if (( $+functions[compdef] )); then\n` +
      `  compdef _fnos fnos\n` +
      `else\n` +
      `  print -u2 'fnos completion: initialize compinit before evaluating this script.'\n` +
      `fi\n`;
  }
  return `#compdef fnos\n` +
    `# Generated by fnos-cli ${version}; DO NOT EDIT.\n` +
    `${common}\n_fnos_root "$@"\n`;
}

module.exports = { escapeZshSpecText, quoteZsh, renderZsh };
