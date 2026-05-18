// M3U / M3U8 playlist parser
const M3UParser = (() => {
  function parseAttributes(extinfLine) {
    const attrs = {};
    const attrRegex = /([\w-]+)="([^"]*?)"/g;
    let m;
    while ((m = attrRegex.exec(extinfLine)) !== null) {
      attrs[m[1].toLowerCase()] = m[2];
    }
    return attrs;
  }

  function parse(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const channels = [];
    let current = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        const attrs = parseAttributes(line);
        const commaIdx = line.indexOf(',');
        const name = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : 'Canal sin nombre';
        current = {
          name: attrs['tvg-name'] || name,
          logo: attrs['tvg-logo'] || attrs['logo'] || '',
          group: attrs['group-title'] || 'Sin grupo',
          id: attrs['tvg-id'] || '',
          url: '',
        };
      } else if (line.startsWith('#')) {
        // skip other directives
      } else if (current) {
        current.url = line;
        channels.push(current);
        current = null;
      }
    }
    return channels;
  }

  return { parse };
})();
