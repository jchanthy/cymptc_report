const fs = require('fs');
const html = fs.readFileSync('server_page.html', 'utf8');

console.log('Searching server_page.html for share/reaction JSON patterns...');

// Search for any JSON-like key-value pairs matching share or reaction counts
const regexes = [
  /["']share_count["']\s*:\s*(\d+|{[^}]+})/g,
  /["']share_count_dict["']\s*:\s*(\d+|{[^}]+})/g,
  /["']i18n_share_count["']\s*:\s*["']([^"']+)["']/g,
  /["']i18n_reaction_count["']\s*:\s*["']([^"']+)["']/g,
  /["']reaction_count["']\s*:\s*(\d+|{[^}]+})/g,
  /["']comment_count["']\s*:\s*(\d+|{[^}]+})/g,
  /["']i18n_comment_count["']\s*:\s*["']([^"']+)["']/g,
  /["']view_count["']\s*:\s*(\d+|{[^}]+})/g,
  /["']play_count["']\s*:\s*(\d+|{[^}]+})/g,
  /["']i18n_play_count["']\s*:\s*["']([^"']+)["']/g
];

regexes.forEach(regex => {
  let match;
  console.log(`\n--- Results for: ${regex.toString()} ---`);
  let limit = 20;
  while ((match = regex.exec(html)) !== null && limit > 0) {
    console.log(`Matched: ${match[0]}`);
    limit--;
  }
});
