const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = 'https://m.facebook.com/watch/?v=894626316942483';
  console.log(`Opening Mobile Watch URL: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=375,812',
      '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,km;q=0.8'
    });
    
    page.on('framenavigated', frame => {
      console.log(`[Frame Navigated] ${frame.url()}`);
    });
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('DOM content loaded. Sleeping 10s for page to settle...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const finalUrl = page.url();
    console.log(`Setted Final URL: ${finalUrl}`);
    
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    fs.writeFileSync('server_mobile_page.html', html);
    console.log(`Saved mobile page HTML to server_mobile_page.html (${html.length} chars)`);
    
    const textDump = await page.evaluate(() => {
      const results = [];
      const els = Array.from(document.querySelectorAll('span, div, a, p, button, [role="button"], i, b'));
      els.forEach((el, idx) => {
        const text = (el.innerText || '').trim();
        const label = el.getAttribute('aria-label') || '';
        if (text.length > 0 && text.length < 200) {
          if (text.match(/\d/) || label.match(/\d/) || /share|comment|like|view|ចែករំលែក/i.test(text) || /share|comment|like|view|ចែករំលែក/i.test(label)) {
            results.push({
              idx,
              tagName: el.tagName,
              text,
              label
            });
          }
        }
      });
      return results;
    });
    
    console.log('--- Mobile Page DOM Match Snippets ---');
    const sharesAndCounts = textDump.filter(x => 
      x.text.toLowerCase().includes('share') || x.label.toLowerCase().includes('share') ||
      x.text.includes('ចែករំលែក') || x.label.includes('ចែករំលែក') ||
      x.text.includes('4K') || x.text.includes('3.4K') || x.text.includes('144K')
    );
    console.log(JSON.stringify(sharesAndCounts, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
