const fs = require('fs');
const html = fs.readFileSync('server_page.html', 'utf8');

console.log('Searching server_page.html for numbers between 3500 and 4600...');

// Let's search for any number in JSON that could be the shares count
const regex = /"([a-zA-Z0-9_]+)"\s*:\s*(3[5-9]\d{2}|4[0-5]\d{2})\b/g;

let match;
let count = 0;
while ((match = regex.exec(html)) !== null && count < 100) {
  console.log(`Match #${++count}: ${match[0]} (Key: ${match[1]}, Value: ${match[2]})`);
  
  // Print surrounding context
  const start = Math.max(0, match.index - 100);
  const end = Math.min(html.length, match.index + 100);
  console.log(`Context: ${html.substring(start, end).replace(/\n/g, '\\n')}`);
  console.log('----------------------------------------');
}
