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
  
  // Helper to format bytes to GB
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);
    return `${gb} GB`;
  };
  
  // Helper to format speed to MB/s
  const formatSpeed = (speed) => {
    if (!speed || speed === 0) return '0 MB/s';
    const mb = (speed / (1024 * 1024)).toFixed(2);
    return `${mb} MB/s`;
  };
  
  // Special handling for resmon.gen output (has 'item' field)
  if (obj.item !== undefined) {
    let items;
    if (typeof obj.item === 'string') {
      items = obj.item.split(',').map(s => s.trim());
    } else if (Array.isArray(obj.item)) {
      items = obj.item;
    } else if (typeof obj.item === 'object') {
      // item is an object containing the actual data (storeSpeed, netSpeed, cpuBusy, memPercent)
      const resultItems = [];
      
      if (obj.item.memPercent !== undefined) {
        resultItems.push(`Memory: ${obj.item.memPercent}%`);
      }
      if (obj.item.cpuBusy !== undefined) {
        resultItems.push(`CPU: ${obj.item.cpuBusy}%`);
      }
      if (obj.item.storeSpeed) {
        const read = formatSpeed(obj.item.storeSpeed.read);
        const write = formatSpeed(obj.item.storeSpeed.write);
        resultItems.push(`Storage: ↑ ${write} | ↓ ${read}`);
      }
      if (obj.item.netSpeed) {
        const receive = formatSpeed(obj.item.netSpeed.receive);
        const transmit = formatSpeed(obj.item.netSpeed.transmit);
        resultItems.push(`Network: ↑ ${transmit} | ↓ ${receive}`);
      }
      
      if (resultItems.length > 0) {
        result.push(resultItems.join(' | '));
      }
      
      // Add metadata at the end if present
      const metadata = {};
      if (obj.reqid) metadata.reqid = obj.reqid;
      if (obj.result) metadata.result = obj.result;
      if (obj.rev) metadata.rev = obj.rev;
      if (obj.req) metadata.req = obj.req;
      
      if (Object.keys(metadata).length > 0) {
        result.push('');
        result.push('─'.repeat(40));
        for (const [key, value] of Object.entries(metadata)) {
          result.push(`${key}: ${value}`);
        }
      }
      
      return result.join('\n');
    } else {
      // If item is neither string nor array nor object, skip special handling
      items = [];
    }
    
    const resultItems = [];
    
    if (items.includes('memPercent') && obj.memPercent !== undefined) {
      resultItems.push(`Memory: ${obj.memPercent}%`);
    }
    if (items.includes('cpuBusy') && obj.cpuBusy !== undefined) {
      resultItems.push(`CPU: ${obj.cpuBusy}%`);
    }
    if (items.includes('storeSpeed') && obj.storeSpeed) {
      const read = formatSpeed(obj.storeSpeed.read);
      const write = formatSpeed(obj.storeSpeed.write);
      resultItems.push(`Storage: ↑ ${write} | ↓ ${read}`);
    }
    if (items.includes('netSpeed') && obj.netSpeed) {
      const receive = formatSpeed(obj.netSpeed.receive);
      const transmit = formatSpeed(obj.netSpeed.transmit);
      resultItems.push(`Network: ↑ ${transmit} | ↓ ${receive}`);
    }
    
    if (resultItems.length > 0) {
      result.push(resultItems.join(' | '));
    }
    
    // Add metadata at the end if present
    const metadata = {};
    if (obj.reqid) metadata.reqid = obj.reqid;
    if (obj.result) metadata.result = obj.result;
    if (obj.rev) metadata.rev = obj.rev;
    if (obj.req) metadata.req = obj.req;
    
    if (Object.keys(metadata).length > 0) {
      result.push('');
      result.push('─'.repeat(40));
      for (const [key, value] of Object.entries(metadata)) {
        result.push(`${key}: ${value}`);
      }
    }
    
    return result.join('\n');
  }
  
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
      } else if (key === 'cpu' && typeof value === 'object') {
        // Format CPU info as compact lines
        const lines = [];
        if (value.name) lines.push(`CPU: ${value.name}`);
        if (value.core !== undefined) lines.push(`Cores: ${value.core}`);
        if (value.thread !== undefined) lines.push(`Threads: ${value.thread}`);
        if (value.maxFreq) lines.push(`Max Frequency: ${value.maxFreq} MHz`);
        if (value.num !== undefined) lines.push(`CPU Count: ${value.num}`);
        result.push(lines.join(' | '));
        
        // Handle nested fields within cpu object
        if (value.temp) {
          if (Array.isArray(value.temp) && value.temp.length > 0) {
            result.push(`Temperature: ${value.temp[0]}°C`);
          } else if (typeof value.temp === 'object') {
            const temps = Object.entries(value.temp).map(([k, v]) => {
              const core = k === '0' ? '' : `Core${k}: `;
              return `${core}${v}°C`;
            });
            result.push(`Temperature: ${temps.join(', ')}`);
          }
        }
        
        if (value.busy && value.busy.user !== undefined) {
          const user = value.busy.user || 0;
          const system = value.busy.system || 0;
          const iowait = value.busy.iowait || 0;
          const other = value.busy.other !== undefined ? value.busy.other : 0;
          const all = value.busy.all !== undefined ? value.busy.all : (user + system + iowait + other);
          result.push(`CPU Usage: user ${user}%, system ${system}%, iowait ${iowait}%, total ${all}%`);
        }
        
        if (value.loadavg && value.loadavg.avg1min !== undefined) {
          const avg1 = value.loadavg.avg1min.toFixed(2);
          const avg5 = value.loadavg.avg5min ? value.loadavg.avg5min.toFixed(2) : avg1;
          const avg15 = value.loadavg.avg15min ? value.loadavg.avg15min.toFixed(2) : avg1;
          result.push(`Load Average: ${avg1} (1m), ${avg5} (5m), ${avg15} (15m)`);
        }
      } else if (key === 'mem' && typeof value === 'object' && value.total !== undefined) {
        // Format memory info
        const total = formatBytes(value.total);
        const used = formatBytes(value.used);
        const free = formatBytes(value.free);
        const available = formatBytes(value.available);
        const cached = formatBytes(value.cached);
        const buffers = formatBytes(value.buffers);
        const percent = value.total ? ((value.used / value.total) * 100).toFixed(1) : 0;
        result.push(`Memory: ${used} / ${total} (${percent}%) | Free: ${free} | Available: ${available} | Cached: ${cached} | Buffers: ${buffers}`);
      } else if (key === 'swap' && typeof value === 'object' && value.total !== undefined) {
        // Format swap info
        const total = formatBytes(value.total);
        const used = formatBytes(value.used);
        const free = formatBytes(value.free);
        const percent = value.total ? ((value.used / value.total) * 100).toFixed(1) : 0;
        result.push(`Swap: ${used} / ${total} (${percent}%) | Free: ${free}`);
      } else if (key === 'storeSpeed' && typeof value === 'object') {
        // Format storage speed
        const read = formatSpeed(value.read);
        const write = formatSpeed(value.write);
        result.push(`Storage Speed: ↑ ${write} | ↓ ${read}`);
      } else if (key === 'netSpeed' && typeof value === 'object') {
        // Format network speed
        const receive = formatSpeed(value.receive);
        const transmit = formatSpeed(value.transmit);
        result.push(`Network Speed: ↑ ${transmit} | ↓ ${receive}`);
      } else if (key === 'busy' && value.user !== undefined) {
        // Format CPU busy usage as compact line
        const user = value.user || 0;
        const system = value.system || 0;
        const iowait = value.iowait || 0;
        const other = value.other !== undefined ? value.other : 0;
        const all = value.all !== undefined ? value.all : (user + system + iowait + other);
        result.push(`CPU Usage: user ${user}%, system ${system}%, iowait ${iowait}%, total ${all}%`);
      } else if (key === 'loadavg' && value.avg1min !== undefined) {
        // Format load average as compact line
        const avg1 = value.avg1min.toFixed(2);
        const avg5 = value.avg5min ? value.avg5min.toFixed(2) : avg1;
        const avg15 = value.avg15min ? value.avg15min.toFixed(2) : avg1;
        result.push(`Load Average: ${avg1} (1m), ${avg5} (5m), ${avg15} (15m)`);
      } else if (key === 'temp' && typeof value === 'object') {
        // Format temperature for CPU (might have core indices)
        const temps = Object.entries(value).map(([k, v]) => {
          const core = k === '0' ? '' : `Core${k}: `;
          return `${core}${v}°C`;
        });
        result.push(`Temperature: ${temps.join(', ')}`);
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