/**
 * Output formatter utility
 */

/**
 * Format output based on data type
 * @param {*} data - Data to format
 * @param {boolean} raw - If true, output raw JSON
 * @returns {string} Formatted output
 */
function formatOutput(data, raw = false) {
  if (raw) {
    return JSON.stringify(data, null, 2);
  }

  if (data === null || data === undefined) {
    return 'No data returned';
  }

  if (Array.isArray(data)) {
    return formatArray(data);
  }

  if (typeof data === 'object') {
    return formatObject(data);
  }

  return String(data);
}

/**
 * Format array as table
 * @param {Array} arr - Array to format
 * @returns {string} Formatted table
 */
function formatArray(arr) {
  if (arr.length === 0) {
    return 'Empty array';
  }

  // Get all keys from objects
  const keys = Object.keys(arr[0]);
  const maxKeyLength = Math.max(...keys.map(k => k.length));
  const columnWidths = keys.map(key => {
    return Math.max(key.length, ...arr.map(item => {
      const val = item[key];
      return val ? String(val).length : 0;
    }));
  });

  // Build header
  let output = '';
  keys.forEach((key, i) => {
    output += key.padEnd(columnWidths[i] + 2);
  });
  output += '\n';

  // Build separator
  keys.forEach((key, i) => {
    output += '-'.repeat(columnWidths[i]).padEnd(columnWidths[i] + 2);
  });
  output += '\n';

  // Build rows
  arr.forEach(item => {
    keys.forEach((key, i) => {
      const val = item[key];
      const strVal = val !== null && val !== undefined ? String(val) : '';
      output += strVal.padEnd(columnWidths[i] + 2);
    });
    output += '\n';
  });

  return output;
}

/**
 * Format object as pretty-printed JSON
 * @param {Object} obj - Object to format
 * @returns {string} Formatted output
 */
function formatObject(obj) {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result.push(`${key}:`);
      result.push(JSON.stringify(value, null, 2));
    } else {
      result.push(`${key}: ${value}`);
    }
  }
  return result.join('\n');
}

module.exports = { formatOutput };