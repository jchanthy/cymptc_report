const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\Users\\chant\\OneDrive - Cambodia Academy of Digital Technology\\@projects\\mptc_yccp_report';
const files = ['app.js', 'index.html'];
const searchUrl = 'http://localhost:3000';
const replaceUrl = 'https://ycpp-facebook-scraper-server-56450014005.asia-southeast1.run.app';

files.forEach(f => {
  const filePath = path.join(targetDir, f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all exact instances of the dev URL
    const updated = content.split(searchUrl).join(replaceUrl);
    
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Successfully replaced URL in ${f}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});
