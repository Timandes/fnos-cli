const { stripVTControlCharacters } = require('node:util');

const BYTE_GROUPS = new Set(['mem', 'swap']);
const BYTE_FIELDS = new Set(['total', 'used', 'free', 'available', 'cached', 'buffers']);
const SPEED_GROUPS = new Set(['storespeed', 'netspeed']);
const PERCENT_FIELDS = new Set(['busy', 'cpubusy', 'mempercent']);

function normalizedName(value) {
  return sanitizeText(value).replace(/[_\s-]/g, '').toLowerCase();
}

function sanitizeText(value) {
  return stripVTControlCharacters(String(value)
    .replace(/\u0090/g, '\u001bP')
    .replace(/\u009b/g, '\u001b[')
    .replace(/\u009d/g, '\u001b]')
    .replace(/\u009c/g, '\u001b\\'))
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');
}

function humanizeKey(key) {
  const words = sanitizeText(key)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  if (!words) return sanitizeText(key);
  return (words.charAt(0).toUpperCase() + words.slice(1))
    .replace(/\bcpu\b/gi, 'CPU')
    .replace(/\bgpu\b/gi, 'GPU')
    .replace(/\bnpu\b/gi, 'NPU');
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  const match = String(value).match(/^(-?)(\d+)(\.\d+)?$/);
  if (!match) return String(value);
  const integer = match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${match[1]}${integer}${match[3] || ''}`;
}

function formatBytes(value) {
  return value === 0 ? '0 GB' : `${(value / (1024 ** 3)).toFixed(2)} GB`;
}

function formatSpeed(value) {
  return value === 0 ? '0 MB/s' : `${(value / (1024 ** 2)).toFixed(2)} MB/s`;
}

function formatScalar(key, value, path = []) {
  if (value === null || value === undefined) return '—';
  if (value === '') return '\"\"';
  if (typeof value === 'boolean') return value ? '✓ Yes' : '✗ No';
  if (typeof value !== 'number') return sanitizeText(value);
  const field = normalizedName(key);
  const group = normalizedName(path[path.length - 1] || '');
  if (BYTE_GROUPS.has(group) && BYTE_FIELDS.has(field)) return formatBytes(value);
  if (SPEED_GROUPS.has(group)) return formatSpeed(value);
  if (field === 'temp' || field === 'temperature' ||
      ((group === 'temp' || group === 'temperature') && /^\d+$/.test(field))) {
    return `${formatNumber(value)}°C`;
  }
  if (PERCENT_FIELDS.has(field) || field.endsWith('percent') ||
      field.endsWith('percentage') || group === 'busy') {
    return `${formatNumber(value)}%`;
  }
  if (field === 'maxfreq') return `${formatNumber(value)} MHz`;
  return formatNumber(value);
}

function compactValue(value) {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? '—' : sanitizeText(serialized);
  } catch (error) {
    return '[Circular]';
  }
}

function formatValue(key, value, path = []) {
  const field = normalizedName(key);
  if (Array.isArray(value) && value.length > 0 &&
      (field === 'temp' || field === 'temperature') &&
      value.every(item => typeof item === 'number')) {
    return value.map(item => formatScalar(key, item, path)).join(', ');
  }
  if (typeof value === 'object' && value !== null) return compactValue(value);
  return formatScalar(key, value, path);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isRecordArray(value) {
  return Array.isArray(value) && value.some(isPlainObject) &&
    value.every(item => item === null || isPlainObject(item));
}

module.exports = { compactValue, formatValue, humanizeKey, isPlainObject, isRecordArray, sanitizeText };
