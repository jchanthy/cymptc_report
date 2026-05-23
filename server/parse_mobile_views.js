const fs = require('fs');
const html = fs.readFileSync('server_mobile_page.html', 'utf8');

console.log('Searching server_mobile_page.html for views / play counts...');

// Search for views, 5.1M, play_count
const regexes = [
  /5\.[1-2]M/gi,
  /views?/gi,
  /play_count/gi,
  /ទស្សនា/g
];

regexes.forEach(regex => {
  let match;
  console.log(`\n--- Results for: ${regex.toString()} ---`);
  let limit = 10;
  while ((match = regex.exec(html)) !== null && limit > 0) {
    const start = Math.max(0, match.index - 100);
    const end = Math.min(html.length, match.index + 100);
    console.log(`Match: "${match[0]}" at ${match.index}. Context: ${html.substring(start, end).replace(/\n/g, '\\n')}`);
    limit--;
  }
});
