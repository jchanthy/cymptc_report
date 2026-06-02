const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://web.facebook.com/reel/1784527562954976/';
  console.log(`Opening Reel URL: ${url}`);
  
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
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
    
    const pageTitle = await page.title();
    console.log(`Page Title: ${pageTitle}`);

    // Let's dump all text or metadata
    const results = await page.evaluate(() => {
      const texts = [];
      const metas = [];
      
      const allMetas = document.querySelectorAll('meta');
      for (const m of allMetas) {
        metas.push({
          property: m.getAttribute('property'),
          name: m.getAttribute('name'),
          content: m.getAttribute('content')
        });
      }

      // Check for ld+json scripts
      const jsonLd = [];
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        jsonLd.push(s.textContent);
      }

      // Look at matching texts
      const bodyText = document.body ? document.body.innerText : '';

      return { metas, jsonLd, bodyTextSnippet: bodyText.substring(0, 2000), bodyTextLength: bodyText.length };
    });

    console.log('Metas found:');
    results.metas.forEach(m => {
      if (m.property || m.name) {
        console.log(` - ${m.property || m.name}: ${m.content}`);
      }
    });

    console.log(`LD+JSON scripts count: ${results.jsonLd.length}`);
    results.jsonLd.forEach((json, idx) => {
      console.log(`\n--- Script ${idx} ---`);
      console.log(json.substring(0, 500));
    });

    console.log(`\nBody text length: ${results.bodyTextLength}`);
    console.log(`Body text snippet:\n${results.bodyTextSnippet}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
