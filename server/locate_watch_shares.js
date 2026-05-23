const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://web.facebook.com/watch/?v=894626316942483';
  console.log(`Opening URL to search share elements: ${url}`);
  
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
    
    const results = await page.evaluate(() => {
      const dump = [];
      const allElements = Array.from(document.querySelectorAll('*'));
      
      allElements.forEach((el, index) => {
        const text = (el.innerText || '').trim();
        const label = el.getAttribute('aria-label') || '';
        const html = el.outerHTML.substring(0, 100);
        
        // If it contains "share" or "ចែករំលែក" (case insensitive) and is less than 300 characters
        if ((text.toLowerCase().includes('share') || label.toLowerCase().includes('share') || 
             text.includes('ចែករំលែក') || label.includes('ចែករំលែក')) && text.length < 300) {
          
          dump.push({
            index,
            tagName: el.tagName,
            class: el.getAttribute('class') || '',
            text,
            label
          });
        }
      });
      
      return dump;
    });
    
    console.log(`Found ${results.length} elements containing 'share' / 'ចែករំលែក':`);
    console.log(JSON.stringify(results, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
