const fs = require('fs');
const html = fs.readFileSync('server_mobile_page.html', 'utf8');

console.log('Searching server_mobile_page.html JSON scripts for exact counts...');

const patternList = [
  /["']total_comment_count["']\s*:\s*(\d+)/g,
  /["']reaction_count["']\s*:\s*(\d+|{[^}]+})/g,
  /["']play_count["']\s*:\s*(\d+)/g,
  /["']share_count["']\s*:\s*(\d+)/g,
  /["']share_fbid["']/g
];

patternList.forEach(regex => {
  let match;
  console.log(`\n--- Results for: ${regex.toString()} ---`);
  let limit = 10;
  while ((match = regex.exec(html)) !== null && limit > 0) {
    console.log(`Matched: ${match[0]}`);
    limit--;
  }
});
