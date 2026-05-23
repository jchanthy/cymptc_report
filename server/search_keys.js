const fs = require('fs');
const html = fs.readFileSync('server_page.html', 'utf8');

console.log('Searching server_page.html for custom share and comment JSON patterns...');

const keys = ['share', 'comment', 'view', 'reaction', 'count'];
const foundPatterns = new Set();

// Let's search for JSON keys containing "share" or "comment" or "count" or "play"
// Format: "key": value
const regex = /"([a-zA-Z0-9_]*share[a-zA-Z0-9_]*|[a-zA-Z0-9_]*comment[a-zA-Z0-9_]*)"\s*:\s*([^,}\]]+)/gi;

let match;
let count = 0;
while ((match = regex.exec(html)) !== null && count < 100) {
  const line = match[0];
  if (!foundPatterns.has(line)) {
    foundPatterns.add(line);
    console.log(line);
    count++;
  }
}

console.log('\nLet\'s search for specific structures like "share_count", "shareCount", "shares" in JSON objects:');
const shareRegex = /"([a-zA-Z0-9_]*share[a-zA-Z0-9_]*)"\s*:\s*({[^}]+}|\d+|"[^"]*")/gi;
count = 0;
while ((match = shareRegex.exec(html)) !== null && count < 50) {
  console.log(`Share match: ${match[0]}`);
  count++;
}
