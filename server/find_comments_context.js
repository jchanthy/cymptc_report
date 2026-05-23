const fs = require('fs');
const html = fs.readFileSync('server_page.html', 'utf8');

const target = '"total_comment_count":';
const idx = html.indexOf(target);

if (idx !== -1) {
  console.log(`Found target at index ${idx}`);
  const start = Math.max(0, idx - 1500);
  const end = Math.min(html.length, idx + 1500);
  console.log('--- CONTEXT ---');
  console.log(html.substring(start, end));
} else {
  console.log('Target not found.');
}
