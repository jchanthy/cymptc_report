const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = 'https://web.facebook.com/watch/?v=894626316942483';
  console.log(`Opening URL to search full HTML: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,800',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,km;q=0.8'
    });
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
    
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    
    console.log(`HTML size: ${html.length} chars`);
    
    // Save html to a file to inspect later if needed
    fs.writeFileSync('server_page.html', html);
    console.log('Saved page HTML to server_page.html');
    
    // Let's search for "4K" case insensitively
    let pos = 0;
    let occurrences = 0;
    while (true) {
      pos = html.toLowerCase().indexOf('4k', pos);
      if (pos === -1) break;
      occurrences++;
      const start = Math.max(0, pos - 150);
      const end = Math.min(html.length, pos + 150);
      console.log(`--- Match #${occurrences} at position ${pos} ---`);
      console.log(html.substring(start, end).replace(/\n/g, '\\n'));
      pos += 2;
    }
    
    // Let's also search for "ចែករំលែក"
    pos = 0;
    occurrences = 0;
    while (true) {
      pos = html.indexOf('ចែករំលែក', pos);
      if (pos === -1) break;
      occurrences++;
      const start = Math.max(0, pos - 150);
      const end = Math.min(html.length, pos + 150);
      console.log(`--- Khmer Share Match #${occurrences} at position ${pos} ---`);
      console.log(html.substring(start, end).replace(/\n/g, '\\n'));
      pos += 'ចែករំលែក'.length;
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
