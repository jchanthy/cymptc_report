const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://web.facebook.com/watch/?v=1669836554168199&__cft__[0]=AZa113te4jzF96fbPLnP2XNJQRwsNmPiXFqvg6A34vPXbekH8tm3aiyXRXWTxjMsmouX6w20HK4a45FyLy2tMIX058Mpe7T4_3jRYEQHpJZu-Y2fu9zdi8L-WWB-VX7FfXQ8JSirIGklM2T9KhJK0QYnXPeuahlPi94OjIp81jWbwZy45VMxezAbE8u5P6-cFqpefdmnCi7Vnw6E3f3Uoz5V&__tn__=%2CO%2CP-R';
  console.log(`Opening Watch URL: ${url}`);
  
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
      const spans = Array.from(document.querySelectorAll('span, div, a, [role="button"]'));
      
      spans.forEach((el, idx) => {
        const text = (el.innerText || '').trim();
        const label = el.getAttribute('aria-label') || '';
        const id = el.id || '';
        const className = el.getAttribute('class') || '';
        
        if (text.length > 0 && text.length < 200) {
          // If it looks like a metric or has share/comment/reaction keywords
          if (text.match(/\d/) || label.match(/\d/) ||
              /share|comment|reaction|like|views|ចែករំលែក|មតិ/i.test(text) ||
              /share|comment|reaction|like|views|ចែករំលែក|មតិ/i.test(label)) {
            dump.push({
              idx,
              tagName: el.tagName,
              id,
              className: className.substring(0, 50),
              text,
              label
            });
          }
        }
      });
      
      return dump;
    });
    
    console.log('--- Watch Page DOM Elements Dump ---');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
