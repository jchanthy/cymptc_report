const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\chant\\.gemini\\antigravity-cli\\brain\\f4c62a8f-cf5f-4d46-a55e-31c98da05841\\.system_generated\\tasks\\task-806.log', 'utf8');

const marker = '--- Watch Page DOM Elements Dump ---';
const parts = content.split(marker);

if (parts.length > 1) {
  const jsonStr = parts[1].trim();
  try {
    const arr = JSON.parse(jsonStr);
    console.log(`Total elements dumped: ${arr.length}`);
    
    const matches = arr.filter(el => {
      const text = el.text || '';
      const label = el.label || '';
      return text.includes('3.9') || label.includes('3.9') || text.includes('share') || label.includes('share') || text.includes('ចែករំលែក') || label.includes('ចែករំលែក') || text.includes('3,9') || label.includes('3,9');
    });
    
    console.log('Matches:');
    console.log(JSON.stringify(matches.slice(0, 100), null, 2));
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
  }
} else {
  console.log('Marker not found.');
}
