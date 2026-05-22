const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\chant\\.gemini\\antigravity-cli\\brain\\f4c62a8f-cf5f-4d46-a55e-31c98da05841\\.system_generated\\tasks\\task-884.log', 'utf8');

const marker = '--- Watch Page DOM Elements Dump ---';
const parts = content.split(marker);

if (parts.length > 1) {
  const jsonStr = parts[1].trim();
  try {
    const arr = JSON.parse(jsonStr);
    console.log(`Total elements dumped: ${arr.length}`);
    
    console.log('=== SEARCH FOR "SHARE" OR "ចែករំលែក" OR "4K" ===');
    const matches = arr.filter(el => {
      const text = (el.text || '').toLowerCase();
      const label = (el.label || '').toLowerCase();
      return text.includes('share') || label.includes('share') || text.includes('ចែករំលែក') || label.includes('ចែករំលែក') || text.includes('4k') || label.includes('4k');
    });
    
    matches.forEach((res, idx) => {
      console.log(`${idx + 1}. Index: ${res.idx}, Tag: ${res.tagName}, Class: ${res.className}`);
      console.log(`   Text: "${res.text.replace(/\n/g, '\\n')}"`);
      console.log(`   Label: "${res.label}"`);
      console.log('----------------------------------------');
    });
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
  }
} else {
  console.log('Marker not found.');
}
