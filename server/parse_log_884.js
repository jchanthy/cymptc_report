const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\chant\\.gemini\\antigravity-cli\\brain\\f4c62a8f-cf5f-4d46-a55e-31c98da05841\\.system_generated\\tasks\\task-884.log', 'utf8');

const marker = '--- Watch Page DOM Elements Dump ---';
const parts = content.split(marker);

if (parts.length > 1) {
  const jsonStr = parts[1].trim();
  try {
    const arr = JSON.parse(jsonStr);
    console.log(`Total elements dumped: ${arr.length}`);
    
    const results = [];
    
    arr.forEach(el => {
      const text = (el.text || '').trim();
      const label = (el.label || '').trim();
      
      // Let's look for 144K
      if (text === '144K' || label.includes('144K') || text.includes('144K')) {
        results.push({ type: 'Reactions/Likes (144K)', el });
      }
      
      // Let's look for 3.4K
      if (text.includes('3.4K') || label.includes('3.4K')) {
        results.push({ type: 'Comments (3.4K)', el });
      }
      
      // Let's look for 4K
      if (text.includes('4K') || label.includes('4K') || text === '4K') {
        results.push({ type: 'Shares (4K)', el });
      }
      
      // Let's look for 5.1M
      if (text.includes('5.1M') || label.includes('5.1M') || text === '5.1M') {
        results.push({ type: 'Views (5.1M)', el });
      }
    });
    
    console.log('--- FOCUSSED MATCHES ---');
    results.forEach(res => {
      console.log(`Type: ${res.type}`);
      console.log(`Tag: ${res.el.tagName}, ID: ${res.el.id || 'none'}, Class: ${res.el.className}`);
      console.log(`Text: "${res.el.text}"`);
      console.log(`Label: "${res.el.label}"`);
      console.log('----------------------------------------');
    });
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
  }
} else {
  console.log('Marker not found.');
}
