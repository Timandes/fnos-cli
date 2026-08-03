const { isPlainObject, sanitizeText } = require('./output/values');
const { renderValue } = require('./output/objects');
const { renderKeyValueTable } = require('./output/tables');
const { createTheme } = require('./output/theme');

const METADATA_KEYS = new Set(['result', 'reqid', 'req', 'rev']);

function hasMainData(value) {
  if (Array.isArray(value)) return value.length > 0;
  return isPlainObject(value) && Object.keys(value).length > 0;
}

function splitResponse(data) {
  if (!isPlainObject(data)) return { values: [data], metadata: {} };
  const business = {};
  const metadata = {};
  let mainData;
  let unwrapData = false;
  for (const [key, value] of Object.entries(data)) {
    if (METADATA_KEYS.has(key)) {
      metadata[key] = value;
    } else if (key === 'data' && hasMainData(value)) {
      mainData = value;
      unwrapData = true;
    } else {
      business[key] = value;
    }
  }
  const values = [];
  if (Object.keys(business).length > 0) values.push(business);
  if (unwrapData) values.push(mainData);
  return { values, metadata };
}

function renderMetadata(metadata, options) {
  const theme = createTheme(options.color);
  const chunks = [];
  const entries = [];
  if (metadata.result === 'succ') {
    chunks.push(theme.success('✓ Success'));
  } else if (Object.prototype.hasOwnProperty.call(metadata, 'result')) {
    entries.push({ key: 'Result', value: sanitizeText(metadata.result) });
  }
  if (Object.prototype.hasOwnProperty.call(metadata, 'req')) {
    entries.push({ key: 'Request', value: sanitizeText(metadata.req) });
  }
  if (Object.prototype.hasOwnProperty.call(metadata, 'reqid')) {
    entries.push({ key: 'ID', value: sanitizeText(metadata.reqid) });
  }
  if (Object.prototype.hasOwnProperty.call(metadata, 'rev')) {
    entries.push({ key: 'Rev', value: sanitizeText(metadata.rev) });
  }
  const details = renderKeyValueTable(entries, options);
  if (details) chunks.push(details);
  return chunks.join('\n');
}

function formatOutput(data, raw = false, options = {}) {
  if (raw) return JSON.stringify(data, null, 2);
  if (data === null || data === undefined) return 'No data returned';
  const context = {
    color: Boolean(options.color),
    columns: Number.isInteger(options.columns) && options.columns > 0
      ? options.columns
      : undefined
  };
  const { values, metadata } = splitResponse(data);
  const chunks = values.map(value => renderValue(value, context)).filter(Boolean);
  const footer = renderMetadata(metadata, context);
  if (footer) {
    if (chunks.length > 0) {
      const dividerWidth = Math.min(40, context.columns || 40);
      chunks.push(createTheme(context.color).muted('─'.repeat(dividerWidth)));
    }
    chunks.push(footer);
  }
  if (chunks.length === 0) return isPlainObject(data) ? '{}' : renderValue(data, context);
  return chunks.join('\n\n');
}

module.exports = { formatOutput };
