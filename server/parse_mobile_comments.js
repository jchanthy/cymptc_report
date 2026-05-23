const fs = require('fs');
const html = fs.readFileSync('server_mobile_page.html', 'utf8');

console.log('Searching server_mobile_page.html for comments elements...');

// Search for any element or text with comments count (3.4K, 3,400)
let pos = 0;
let occurrences = 0;
while (true) {
  pos = html.toLowerCase().indexOf('comment', pos);
  if (pos === -1) break;
  occurrences++;
  const start = Math.max(0, pos - 150);
  const end = Math.min(html.length, pos + 150);
  console.log(`--- Match #${occurrences} at position ${pos} ---`);
  console.log(html.substring(start, end).replace(/\n/g, '\\n'));
  pos += 7;
  if (occurrences > 20) break;
}
