const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\chant\\.gemini\\antigravity-cli\\brain\\f4c62a8f-cf5f-4d46-a55e-31c98da05841\\.system_generated\\tasks\\task-884.log', 'utf8');
const marker = '--- Watch Page DOM Elements Dump ---';
const parts = content.split(marker);
if (parts.length > 1) {
  const jsonStr = parts[1].trim();
  try {
    const arr = JSON.parse(jsonStr);
    console.log(`Total elements dumped: ${arr.length}`);
    arr.forEach((el, idx) => {
      const text = el.text || '';
      const label = el.label || '';
      // search for share/shares/ចែករំលែក and check if it has numbers
      if (text.toLowerCase().includes('share') || label.toLowerCase().includes('share') || 
          text.includes('ចែករំលែក') || label.includes('ចែករំលែក')) {
        console.log(`Index ${el.idx}: Tag=${el.tagName}, Class=${el.className}`);
        console.log(`  Text: ${JSON.stringify(text)}`);
        console.log(`  Label: ${JSON.stringify(label)}`);
      }
    });
  } catch (e) {
    console.error(e);
  }
} else {
  console.log("Marker not found.");
}
