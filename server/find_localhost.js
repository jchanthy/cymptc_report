const fs = require('fs');
const path = require('path');

const files = ['app.js', 'index.html', 'vite.config.js'];
const search = 'http://localhost:3000';
const targetDir = 'C:\\Users\\chant\\OneDrive - Cambodia Academy of Digital Technology\\@projects\\mptc_yccp_report';

files.forEach(f => {
  const filePath = path.join(targetDir, f);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const count = (content.match(/localhost:3000/g) || []).length;
    console.log(`File: ${f} -> matches found: ${count}`);
  } else {
    console.log(`File not found: ${f}`);
  }
});
