const fs = require('fs');
const html = fs.readFileSync('server_page.html', 'utf8');

console.log('--- Exhaustive Share Search ---');

// Search for any occurrence of the word "share" in all JSON scripts
let pos = 0;
let foundCount = 0;
while (true) {
  pos = html.toLowerCase().indexOf('share', pos);
  if (pos === -1) break;
  foundCount++;
  
  // Extract 100 characters before and after
  const start = Math.max(0, pos - 100);
  const end = Math.min(html.length, pos + 100);
  const snippet = html.substring(start, end).trim();
  
  // Print if it looks like it could be a count or variable definition
  if (snippet.match(/\d/) || snippet.includes('"') || snippet.includes(':')) {
    console.log(`Match #${foundCount} at ${pos}:`);
    console.log(`  Snippet: ${JSON.stringify(snippet)}`);
    console.log('----------------------------------------');
  }
  
  pos += 5; // skip 'share'
  if (foundCount > 150) {
    console.log('Too many matches, truncating search.');
    break;
  }
}
