const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://web.facebook.com/watch/?v=894626316942483';
  console.log(`Opening URL to inspect metadata: ${url}`);
  
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
    
    const data = await page.evaluate(() => {
      const results = {
        ogDesc: '',
        metaDesc: '',
        jsonLds: [],
        x8cjs6tTexts: []
      };
      
      const og = document.querySelector('meta[property="og:description"]');
      if (og) results.ogDesc = og.getAttribute('content') || '';
      
      const desc = document.querySelector('meta[name="description"]');
      if (desc) results.metaDesc = desc.getAttribute('content') || '';
      
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(s => {
        results.jsonLds.push(s.textContent);
      });

      // Let's also look for elements with views and see what is nearby
      const elements = Array.from(document.querySelectorAll('*'));
      elements.forEach(el => {
        const text = (el.innerText || '').trim();
        if (text.includes('·') && (text.toLowerCase().includes('view') || text.includes('ទស្សនា') || text.toLowerCase().includes('comment') || text.includes('មតិ') || text.toLowerCase().includes('share') || text.includes('ចែករំលែក'))) {
          if (text.length < 300) {
            results.x8cjs6tTexts.push(text);
          }
        }
      });
      
      return results;
    });
    
    console.log('=== og:description ===');
    console.log(data.ogDesc);
    console.log('=== description ===');
    console.log(data.metaDesc);
    console.log('=== JSON-LD Count ===', data.jsonLds.length);
    data.jsonLds.forEach((j, i) => {
      console.log(`--- JSON-LD Script #${i} ---`);
      console.log(j);
    });
    console.log('=== Sibling Metrics / Views Text Elements ===');
    console.log(JSON.stringify(data.x8cjs6tTexts, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
