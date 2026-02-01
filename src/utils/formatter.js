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
 * Format array as table with borders
 * @param {Array} arr - Array to format
 * @returns {string} Formatted table
 */
function formatArray(arr) {
  if (arr.length === 0) {
    return 'Empty array';
  }

  // Get all keys from objects
  const keys = Object.keys(arr[0]);
  const columnWidths = keys.map(key => {
    const headerWidth = key.length;
    const maxValWidth = Math.max(...arr.map(item => {
      const val = item[key];
      return val ? String(val).length : 0;
    }));
    return Math.max(headerWidth, maxValWidth);
  });

  // Helper to format value with units
  const formatValue = (key, val) => {
    if (val === null || val === undefined) return '';
    if (key === 'temp') return `${val}°C`;
    if (key === 'read' || key === 'write') return val.toString();
    if (key === 'busy') return `${val}%`;
    if (key === 'standby') return val ? '✓' : '✗';
    return String(val);
  };

  // Build top border
  let output = '┌';
  columnWidths.forEach((width, i) => {
    output += '─'.repeat(width + 2);
    if (i < columnWidths.length - 1) output += '┬';
  });
  output += '┐\n';

  // Build header
  output += '│';
  keys.forEach((key, i) => {
    output += ' ' + key.padEnd(columnWidths[i]) + ' │';
  });
  output += '\n';

  // Build separator
  output += '├';
  columnWidths.forEach((width, i) => {
    output += '─'.repeat(width + 2);
    if (i < columnWidths.length - 1) output += '┼';
  });
  output += '┤\n';

  // Build rows
  arr.forEach(item => {
    output += '│';
    keys.forEach((key, i) => {
      const val = item[key];
      const formattedVal = formatValue(key, val);
      output += ' ' + formattedVal.padEnd(columnWidths[i]) + ' │';
    });
    output += '\n';
  });

  // Build bottom border
  output += '└';
  columnWidths.forEach((width, i) => {
    output += '─'.repeat(width + 2);
    if (i < columnWidths.length - 1) output += '┴';
  });
  output += '┘\n';

  return output;
}

/**
 * Format object as pretty-printed JSON
 * @param {Object} obj - Object to format
 * @returns {string} Formatted output
 */
function formatObject(obj) {
  const result = [];
  
  // Handle special fields first
  const metadata = {};
  const dataFields = {};
  let hasMainData = false;
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip certain metadata fields or handle them separately
    if (['reqid', 'result', 'rev', 'req'].includes(key)) {
      metadata[key] = value;
    } else if (key === 'data' && typeof value === 'object' && value !== null) {
      // Handle 'data' field specially - don't show 'data:' prefix
      hasMainData = true;
      // Recursively format the data object
      const formattedData = formatObject(value);
      if (formattedData) {
        result.push(formattedData);
      }
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        // Format array as table with header
        const title = key.charAt(0).toUpperCase() + key.slice(1);
        result.push(`${title} (${value.length} items)`);
        result.push(formatArray(value));
      } else {
        // Handle nested objects
        result.push(`${key}:`);
        result.push(formatObject(value));
      }
    } else {
      dataFields[key] = value;
    }
  }
  
  // Add data fields at the beginning
  if (Object.keys(dataFields).length > 0) {
    for (const [key, value] of Object.entries(dataFields)) {
      result.unshift(`${key}: ${value}`);
    }
    if (!hasMainData) {
      result.push('');
    }
  }
  
  // Add metadata at the end if present
  if (Object.keys(metadata).length > 0) {
    if (result.length > 0) {
      result.push('');
    }
    result.push('─'.repeat(40));
    for (const [key, value] of Object.entries(metadata)) {
      result.push(`${key}: ${value}`);
    }
  }
  
  return result.join('\n');
}

module.exports = { formatOutput };