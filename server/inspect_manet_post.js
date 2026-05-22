const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://web.facebook.com/Khuong.Sreng/posts/pfbid072NSiL1csYZprYn92wK8JUuB7otaxdZNjjwGRg1o9m7aRb7ZFKSCyRPfzVx6SSN9l?__cft__[0]=AZZFlYj9AvSZ81AYvx9AbXR_zH4K21zVJBp9CChpIdeho6E_zpiz_lAQT-4fUtEDQZSpj0iT1Ju87FvV5q4If6ERIppmjdMMjcikvdcv1lRpOGCzwVgsiTfpJxAtI3fqJPkf9fz6xqkrQ4SNaHrZYfBWTN03n3HuwLAJKk-HjnAzxpqvMciHU8pcy7rk-RYxZVla8zWgJl-qk8BflisX3XWp&__tn__=%2CO%2CP-R';
  console.log(`Opening URL: ${url}`);
  
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
      function parseNum(text) {
        if (!text) return 0;
        const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
        let clean = text.trim().toUpperCase().replace(/[០-៩]/g, char => khmerDigits.indexOf(char));
        clean = clean.replace(/,/g, '');
        
        if (clean.endsWith('K') || clean.includes('K') || clean.endsWith('ពាន់') || clean.includes('ពាន់')) {
          const numPart = clean.replace('K', '').replace('ពាន់', '');
          const parsed = parseFloat(numPart);
          return isNaN(parsed) ? 0 : Math.round(parsed * 1000);
        }
        if (clean.endsWith('M') || clean.includes('M') || clean.endsWith('លាន') || clean.includes('លាន')) {
          const numPart = clean.replace('M', '').replace('លាន', '');
          const parsed = parseFloat(numPart);
          return isNaN(parsed) ? 0 : Math.round(parsed * 1000000);
        }
        const val = parseInt(clean, 10);
        return isNaN(val) ? 0 : val;
      }

      function getCleanText(str) {
        if (!str) return '';
        const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
        return str.trim().replace(/[០-៩]/g, char => khmerDigits.indexOf(char));
      }

      function extractLikes(cleanText) {
        const candidates = [];
        const keywords = '(?:likes?|reactions?|people|others?|នាក់|ចូលចិត្ត|ប្រតិកម្ម|love|haha|wow|sad|angry|care|ស្រឡាញ់|ហាហា|អស្ចារ្យ|ស្រណោះ|ខឹង)';
        const p1 = new RegExp(`([\\d.,]+(?:K|M|ពាន់|លាន)?)[ \\t]*${keywords}`, 'gi');
        const p2 = new RegExp(`${keywords}[ \\t៖::]+([\\d.,]+(?:K|M|ពាន់|លាន)?)`, 'gi');
        
        const matchedSpans = [];
        let match;
        
        while ((match = p1.exec(cleanText)) !== null) {
          const matchedStr = match[1];
          const val = parseNum(matchedStr);
          const start = match.index;
          const end = start + matchedStr.length;
          matchedSpans.push({ start, end, val });
        }
        
        p2.lastIndex = 0;
        while ((match = p2.exec(cleanText)) !== null) {
          const matchedStr = match[1];
          const val = parseNum(matchedStr);
          const fullMatchStr = match[0];
          const numIdxInMatch = fullMatchStr.indexOf(matchedStr);
          const start = match.index + numIdxInMatch;
          const end = start + matchedStr.length;
          matchedSpans.push({ start, end, val });
        }
        
        const uniqueSpans = [];
        for (const span of matchedSpans) {
          const isDuplicate = uniqueSpans.some(existing => {
            return span.start < existing.end && span.end > existing.start;
          });
          if (!isDuplicate) {
            uniqueSpans.push(span);
          }
        }
        
        const found = uniqueSpans.map(s => s.val);
        if (found.length > 0) {
          found.forEach(num => candidates.push(num));
          if (found.length > 1) {
            const sum = found.reduce((a, b) => a + b, 0);
            candidates.push(sum);
          }
        }
        return candidates;
      }

      function extractComments(cleanText) {
        const p1 = /([\d.,]+(?:K|M|ពាន់|លាន)?)[ \t]*(?:comments?|មតិយោបល់|មតិ)/gi;
        const p2 = /(?:comments?|មតិយោបល់|មតិ)[ \t៖::]+([\d.,]+(?:K|M|ពាន់|លាន)?)/gi;
        
        const matchedSpans = [];
        let match;
        
        while ((match = p1.exec(cleanText)) !== null) {
          const matchedStr = match[1];
          const val = parseNum(matchedStr);
          const start = match.index;
          const end = start + matchedStr.length;
          matchedSpans.push({ start, end, val });
        }
        
        p2.lastIndex = 0;
        while ((match = p2.exec(cleanText)) !== null) {
          const matchedStr = match[1];
          const val = parseNum(matchedStr);
          const fullMatchStr = match[0];
          const numIdxInMatch = fullMatchStr.indexOf(matchedStr);
          const start = match.index + numIdxInMatch;
          const end = start + matchedStr.length;
          matchedSpans.push({ start, end, val });
        }
        
        const uniqueSpans = [];
        for (const span of matchedSpans) {
          const isDuplicate = uniqueSpans.some(existing => {
            return span.start < existing.end && span.end > existing.start;
          });
          if (!isDuplicate) {
            uniqueSpans.push(span);
          }
        }
        
        return uniqueSpans.map(s => s.val);
      }

      function isInsideCommentOrSidebar(el) {
        let parent = el;
        while (parent) {
          const className = parent.getAttribute ? (parent.getAttribute('class') || '') : '';
          const label = parent.getAttribute ? (parent.getAttribute('aria-label') || '') : '';
          const id = parent.id || '';
          const role = parent.getAttribute ? (parent.getAttribute('role') || '') : '';
          
          if (/comment|reply|មតិ|ឆ្លើយតប|sidebar|widget|recommended|sponsored/i.test(className) ||
              /comment|reply|មតិ|ឆ្លើយតប|sidebar|widget|recommended|sponsored/i.test(label) ||
              /comment|reply|sidebar/i.test(id)) {
            return true;
          }
          
          if (role.toLowerCase() === 'article') {
            let ancestor = parent.parentElement;
            while (ancestor) {
              if ((ancestor.getAttribute ? (ancestor.getAttribute('role') || '') : '').toLowerCase() === 'article') {
                return true;
              }
              ancestor = ancestor.parentElement;
            }
          }
          parent = parent.parentElement;
        }
        return false;
      }

      const elementsLog = [];
      const totalMetricsElements = Array.from(document.querySelectorAll('span, div, a'));
      totalMetricsElements.forEach((el, idx) => {
        if (isInsideCommentOrSidebar(el)) return;
        const text = el.innerText || '';
        if (text.length > 500) return;
        
        const cleanText = getCleanText(text);
        
        const hasReactionKeyword = /all\s+reactions|reactions?|ប្រតិកម្មទាំងអស់|ប្រតិកម្ម/i.test(cleanText);
        const hasCommentKeyword = /comments?|មតិយោបល់|មតិ/i.test(cleanText);
        const hasShareKeyword = /shares?|ការចែករំលែក|ចែករំលែក/i.test(cleanText);
        
        const keywordCount = (hasReactionKeyword ? 1 : 0) + (hasCommentKeyword ? 1 : 0) + (hasShareKeyword ? 1 : 0);
        if (keywordCount > 1) return;
        
        const label = el.getAttribute('aria-label') || '';
        const cleanLabel = getCleanText(label);
        
        const likesT = extractLikes(cleanText);
        const likesL = extractLikes(cleanLabel);
        const commentsT = extractComments(cleanText);
        const commentsL = extractComments(cleanLabel);
        
        if (likesT.length > 0 || likesL.length > 0 || commentsT.length > 0 || commentsL.length > 0) {
          elementsLog.push({
            idx,
            tagName: el.tagName,
            text: text.substring(0, 300),
            label: label.substring(0, 300),
            likesT,
            likesL,
            commentsT,
            commentsL
          });
        }
      });

      return elementsLog;
    });

    console.log('--- Post Analysis ---');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
