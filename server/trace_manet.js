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
      const logs = [];

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
        
        // Pattern 1: <number> <keyword> (horizontal space only)
        const p1 = new RegExp(`([\\d.,]+(?:K|M|ពាន់|លាន)?)[ \\t]*${keywords}`, 'gi');
        // Pattern 2: <keyword> <number> (horizontal space / Cambodian colons only)
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
        
        // Deduplicate overlapping spans
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
          // If there is a breakdown of multiple reactions (e.g. "Like: 16K, Love: 2.1K"), sum them!
          if (found.length > 1) {
            const sum = found.reduce((a, b) => a + b, 0);
            candidates.push(sum);
          }
        }
        return candidates;
      }

      function extractComments(cleanText) {
        const candidates = [];
        // Pattern 1: <number> <word> (horizontal space only)
        const p1 = /([\d.,]+(?:K|M|ពាន់|លាន)?)[ \t]*(?:comments?|មតិយោបល់|មតិ)/gi;
        // Pattern 2: <word> <number> (horizontal space / Cambodian colons only)
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
        
        // Deduplicate overlapping spans
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

      function extractShares(cleanText) {
        const candidates = [];
        // Pattern 1: <number> <word> (horizontal space only)
        const p1 = /([\d.,]+(?:K|M|ពាន់|លាន)?)[ \t]*(?:shares?|ការចែករំលែក|ចែករំលែក)/gi;
        // Pattern 2: <word> <number> (horizontal space / Cambodian colons only)
        const p2 = /(?:shares?|ការចែករំលែក|ចែករំលែក)[ \t៖::]+([\d.,]+(?:K|M|ពាន់|លាន)?)/gi;
        
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
        
        // Deduplicate overlapping spans
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

      function logCandidate(metric, source, value, text, label, element) {
        logs.push({
          metric,
          source,
          value,
          text: text ? text.substring(0, 150) : '',
          label: label ? label.substring(0, 150) : '',
          tagName: element ? element.tagName : 'unknown'
        });
      }

      const likesCandidates = [];
      const commentsCandidates = [];
      const sharesCandidates = [];

      // 1. Target Reactions Elements
      const reactionElements = Array.from(document.querySelectorAll(
        'a[href*="/reaction/profile/browser/"], a[href*="reaction_profile"], a[href*="reaction"], [aria-label*="reaction" i], [aria-label*="Reactions" i], [aria-label*="Like" i], [aria-label*="like" i], [aria-label*="reacted" i], [aria-label*="បញ្ចេញមតិប្រតិកម្ម" i], [aria-label*="ប្រតិកម្ម" i], [data-testid*="reaction" i], [data-testid*="Reactions" i], [class*="reactions" i]'
      ));

      // 2. Target Comments Elements
      const commentElements = Array.from(document.querySelectorAll(
        '[aria-label*="comment" i], [aria-label*="comments" i], [aria-label*="មតិយោបល់" i], [aria-label*="មតិ" i], [data-testid*="comment" i], [class*="comment" i]'
      ));

      // 3. Target Shares Elements
      const shareElements = Array.from(document.querySelectorAll(
        '[aria-label*="share" i], [aria-label*="shares" i], [aria-label*="ចែករំលែក" i], [aria-label*="ការចែករំលែក" i], [data-testid*="share" i], [class*="share" i]'
      ));

      // Extract Likes
      for (const el of reactionElements) {
        if (isInsideCommentOrSidebar(el)) continue;
        
        const cleanText = getCleanText(el.innerText || '');
        const cleanLabel = getCleanText(el.getAttribute('aria-label') || '');
        
        if (cleanText && cleanText.length <= 150) {
          extractLikes(cleanText).forEach(n => {
            likesCandidates.push(n);
            logCandidate('likes', 'reactionElement-text', n, cleanText, cleanLabel, el);
          });
        }
        if (cleanLabel && cleanLabel.length <= 150) {
          extractLikes(cleanLabel).forEach(n => {
            likesCandidates.push(n);
            logCandidate('likes', 'reactionElement-label', n, cleanText, cleanLabel, el);
          });
        }

        if (el.parentElement) {
          const pCleanText = getCleanText(el.parentElement.innerText || '');
          const pCleanLabel = getCleanText(el.parentElement.getAttribute('aria-label') || '');
          if (pCleanText && pCleanText.length <= 250) {
            extractLikes(pCleanText).forEach(n => {
              likesCandidates.push(n);
              logCandidate('likes', 'reactionElement-parentText', n, pCleanText, pCleanLabel, el.parentElement);
            });
          }
          if (pCleanLabel && pCleanLabel.length <= 250) {
            extractLikes(pCleanLabel).forEach(n => {
              likesCandidates.push(n);
              logCandidate('likes', 'reactionElement-parentLabel', n, pCleanText, pCleanLabel, el.parentElement);
            });
          }
        }
      }

      // Extract Comments
      for (const el of commentElements) {
        if (isInsideCommentOrSidebar(el)) continue;
        
        const cleanText = getCleanText(el.innerText || '');
        const cleanLabel = getCleanText(el.getAttribute('aria-label') || '');
        
        if (cleanText && cleanText.length <= 150) {
          extractComments(cleanText).forEach(n => {
            commentsCandidates.push(n);
            logCandidate('comments', 'commentElement-text', n, cleanText, cleanLabel, el);
          });
        }
        if (cleanLabel && cleanLabel.length <= 150) {
          extractComments(cleanLabel).forEach(n => {
            commentsCandidates.push(n);
            logCandidate('comments', 'commentElement-label', n, cleanText, cleanLabel, el);
          });
        }

        if (el.parentElement) {
          const pCleanText = getCleanText(el.parentElement.innerText || '');
          const pCleanLabel = getCleanText(el.parentElement.getAttribute('aria-label') || '');
          if (pCleanText && pCleanText.length <= 250) {
            extractComments(pCleanText).forEach(n => {
              commentsCandidates.push(n);
              logCandidate('comments', 'commentElement-parentText', n, pCleanText, pCleanLabel, el.parentElement);
            });
          }
          if (pCleanLabel && pCleanLabel.length <= 250) {
            extractComments(pCleanLabel).forEach(n => {
              commentsCandidates.push(n);
              logCandidate('comments', 'commentElement-parentLabel', n, pCleanText, pCleanLabel, el.parentElement);
            });
          }
        }
      }

      // Extract Shares
      for (const el of shareElements) {
        if (isInsideCommentOrSidebar(el)) continue;
        
        const cleanText = getCleanText(el.innerText || '');
        const cleanLabel = getCleanText(el.getAttribute('aria-label') || '');
        
        if (cleanText && cleanText.length <= 150) {
          extractShares(cleanText).forEach(n => {
            sharesCandidates.push(n);
            logCandidate('shares', 'shareElement-text', n, cleanText, cleanLabel, el);
          });
        }
        if (cleanLabel && cleanLabel.length <= 150) {
          extractShares(cleanLabel).forEach(n => {
            sharesCandidates.push(n);
            logCandidate('shares', 'shareElement-label', n, cleanText, cleanLabel, el);
          });
        }

        if (el.parentElement) {
          const pCleanText = getCleanText(el.parentElement.innerText || '');
          const pCleanLabel = getCleanText(el.parentElement.getAttribute('aria-label') || '');
          if (pCleanText && pCleanText.length <= 250) {
            extractShares(pCleanText).forEach(n => {
              sharesCandidates.push(n);
              logCandidate('shares', 'shareElement-parentText', n, pCleanText, pCleanLabel, el.parentElement);
            });
          }
          if (pCleanLabel && pCleanLabel.length <= 250) {
            extractShares(pCleanLabel).forEach(n => {
              sharesCandidates.push(n);
              logCandidate('shares', 'shareElement-parentLabel', n, pCleanText, pCleanLabel, el.parentElement);
            });
          }
        }
      }

      // 4. Targeted scan
      const totalMetricsElements = Array.from(document.querySelectorAll('span, div, a'));
      for (const el of totalMetricsElements) {
        if (isInsideCommentOrSidebar(el)) continue;

        const text = el.innerText || '';
        if (text.length > 500) continue; 

        const cleanText = getCleanText(text);

        const hasReactionKeyword = /all\s+reactions|reactions?|ប្រតិកម្មទាំងអស់|ប្រតិកម្ម/i.test(cleanText);
        const hasCommentKeyword = /comments?|មតិយោបល់|មតិ/i.test(cleanText);
        const hasShareKeyword = /shares?|ការចែករំលែក|ចែករំលែក/i.test(cleanText);

        const keywordCount = (hasReactionKeyword ? 1 : 0) + (hasCommentKeyword ? 1 : 0) + (hasShareKeyword ? 1 : 0);
        if (keywordCount > 1) continue;

        if (hasReactionKeyword) {
          extractLikes(cleanText).forEach(n => {
            likesCandidates.push(n);
            logCandidate('likes', 'targetDOM-reactions', n, cleanText, '', el);
          });
        }
        if (hasCommentKeyword) {
          extractComments(cleanText).forEach(n => {
            commentsCandidates.push(n);
            logCandidate('comments', 'targetDOM-comments', n, cleanText, '', el);
          });
        }
        if (hasShareKeyword) {
          extractShares(cleanText).forEach(n => {
            sharesCandidates.push(n);
            logCandidate('shares', 'targetDOM-shares', n, cleanText, '', el);
          });
        }
      }

      const likes = likesCandidates.length > 0 ? Math.max(...likesCandidates) : 0;
      const comments = commentsCandidates.length > 0 ? Math.max(...commentsCandidates) : 0;
      const shares = sharesCandidates.length > 0 ? Math.max(...sharesCandidates) : 0;

      return {
        likes,
        comments,
        shares,
        logs
      };
    });

    console.log('--- Trace Results ---');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
