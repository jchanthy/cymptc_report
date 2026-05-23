function parseMobileShares(label) {
  if (!label) return 0;
  // Match "Share, 488 shares"
  let match = label.match(/Share,\s*([\d.,]+)\s*shares?/i);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(val) ? 0 : val;
  }
  // Match "Share, 4 thousand shares" or "Share, 1.5 thousand shares"
  match = label.match(/Share,\s*([\d.,]+)\s*thousand\s*shares?/i);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(val) ? 0 : Math.round(val * 1000);
  }
  // Match "Share, 1.5 million shares"
  match = label.match(/Share,\s*([\d.,]+)\s*million\s*shares?/i);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(val) ? 0 : Math.round(val * 1000000);
  }
  return 0;
}

const tests = [
  "Share, 4 thousand shares",
  "Share, 488 shares",
  "Share, 1.5 thousand shares",
  "Share, 2.3 million shares",
  "Share, 0 shares"
];

tests.forEach(t => {
  console.log(`Input: "${t}" -> Parsed: ${parseMobileShares(t)}`);
});
