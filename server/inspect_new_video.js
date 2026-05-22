const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://web.facebook.com/watch/?v=894626316942483&__cft__[0]=AZZPER01Q5oC_vzxcTqUr0KxchvaGEMpSeFX21L5NF5ecJVi6GwxRciR89NH9fzPWhv7tJiiuXlpttGwIRBGj1k0PuZn-w9nmKNjjjnwL_hqbhHERWx0hiuuNXgHhyIkLh8ahO4-GR73Ekp2xk7Ww62ZsRSdT7uk5qISSk9hsBjGUDX3Etc_B_t0K5d_aIj64eynC2FxBnAfc1R96yIhfwKc&__tn__=%2CO%2CP-R';
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
