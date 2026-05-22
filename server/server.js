const express = require('express');
const cors = require('cors');

// Try loading puppeteer-extra with stealth, fallback to standard puppeteer if not found
let puppeteer;
try {
  const puppeteerExtra = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteerExtra.use(StealthPlugin());
  puppeteer = puppeteerExtra;
  console.log('🤖 Loaded Puppeteer-Stealth plugin successfully.');
} catch (e) {
  puppeteer = require('puppeteer');
  console.log('⚠️ Puppeteer-Stealth not found. Falling back to standard Puppeteer.');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'Facebook URL is required.' });
  }

  console.log(`\n🚀 Received scrape request for: ${url}`);
  let browser = null;

  try {
    // Launch headless Chromium
    browser = await puppeteer.launch({
      headless: "new", // Run in headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,800',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport and extra HTTP headers to look organic
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,km;q=0.8'
    });

    console.log('🌐 Opening Facebook post...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Wait a brief moment to let animations or dynamic updates render
    console.log('⏳ Page loaded. Parsing DOM metrics...');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

    // Extract engagement stats using regular expressions & stable DOM selectors
    const metrics = await page.evaluate(() => {
      // 1. Convert Khmer digits to ASCII and clean up
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
          
          // Exclude comments, replies, sidebars, recommendations, and ads
          if (/comment|reply|មតិ|ឆ្លើយតប|sidebar|widget|recommended|sponsored/i.test(className) ||
              /comment|reply|មតិ|ឆ្លើយតប|sidebar|widget|recommended|sponsored/i.test(label) ||
              /comment|reply|sidebar/i.test(id)) {
            return true;
          }
          
          // Nested role="article" indicates comment thread items rather than the main post
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

      // Extract Likes from reaction elements and their parents
      for (const el of reactionElements) {
        if (isInsideCommentOrSidebar(el)) continue;
        
        const cleanText = getCleanText(el.innerText || '');
        const cleanLabel = getCleanText(el.getAttribute('aria-label') || '');
        
        if (cleanText && cleanText.length <= 150) extractLikes(cleanText).forEach(n => likesCandidates.push(n));
        if (cleanLabel && cleanLabel.length <= 150) extractLikes(cleanLabel).forEach(n => likesCandidates.push(n));

        if (el.parentElement) {
          const pCleanText = getCleanText(el.parentElement.innerText || '');
          const pCleanLabel = getCleanText(el.parentElement.getAttribute('aria-label') || '');
          if (pCleanText && pCleanText.length <= 250) extractLikes(pCleanText).forEach(n => likesCandidates.push(n));
          if (pCleanLabel && pCleanLabel.length <= 250) extractLikes(pCleanLabel).forEach(n => likesCandidates.push(n));
        }
      }

      // Extract Comments from comment elements and their parents
      for (const el of commentElements) {
        if (isInsideCommentOrSidebar(el)) continue;
        
        const cleanText = getCleanText(el.innerText || '');
        const cleanLabel = getCleanText(el.getAttribute('aria-label') || '');
        
        if (cleanText && cleanText.length <= 150) extractComments(cleanText).forEach(n => commentsCandidates.push(n));
        if (cleanLabel && cleanLabel.length <= 150) extractComments(cleanLabel).forEach(n => commentsCandidates.push(n));

        if (el.parentElement) {
          const pCleanText = getCleanText(el.parentElement.innerText || '');
          const pCleanLabel = getCleanText(el.parentElement.getAttribute('aria-label') || '');
          if (pCleanText && pCleanText.length <= 250) extractComments(pCleanText).forEach(n => commentsCandidates.push(n));
          if (pCleanLabel && pCleanLabel.length <= 250) extractComments(pCleanLabel).forEach(n => commentsCandidates.push(n));
        }
      }

      // Extract Shares from share elements and their parents
      for (const el of shareElements) {
        if (isInsideCommentOrSidebar(el)) continue;
        
        const cleanText = getCleanText(el.innerText || '');
        const cleanLabel = getCleanText(el.getAttribute('aria-label') || '');
        
        if (cleanText && cleanText.length <= 150) extractShares(cleanText).forEach(n => sharesCandidates.push(n));
        if (cleanLabel && cleanLabel.length <= 150) extractShares(cleanLabel).forEach(n => sharesCandidates.push(n));

        if (el.parentElement) {
          const pCleanText = getCleanText(el.parentElement.innerText || '');
          const pCleanLabel = getCleanText(el.parentElement.getAttribute('aria-label') || '');
          if (pCleanText && pCleanText.length <= 250) extractShares(pCleanText).forEach(n => sharesCandidates.push(n));
          if (pCleanLabel && pCleanLabel.length <= 250) extractShares(pCleanLabel).forEach(n => sharesCandidates.push(n));
        }
      }

      // 4. Targeted scan of the DOM for total metric headers (e.g. 'All reactions', 'reactions', 'ប្រតិកម្ម')
      const totalMetricsElements = Array.from(document.querySelectorAll('span, div, a'));
      for (const el of totalMetricsElements) {
        if (isInsideCommentOrSidebar(el)) continue;

        const text = el.innerText || '';
        if (text.length > 500) continue; // Bypass very large elements to keep scan clean

        const cleanText = getCleanText(text);

        const hasReactionKeyword = /all\s+reactions|reactions?|ប្រតិកម្មទាំងអស់|ប្រតិកម្ម/i.test(cleanText);
        const hasCommentKeyword = /comments?|មតិយោបល់|មតិ/i.test(cleanText);
        const hasShareKeyword = /shares?|ការចែករំលែក|ចែករំលែក/i.test(cleanText);

        // To prevent parent containers from returning merged/concatenated metrics (e.g. "620155 comments"),
        // a candidate element in the page-wide scan must ONLY contain a single type of metric keyword.
        const keywordCount = (hasReactionKeyword ? 1 : 0) + (hasCommentKeyword ? 1 : 0) + (hasShareKeyword ? 1 : 0);
        if (keywordCount > 1) continue;

        if (hasReactionKeyword) {
          extractLikes(cleanText).forEach(n => likesCandidates.push(n));
        }
        if (hasCommentKeyword) {
          extractComments(cleanText).forEach(n => commentsCandidates.push(n));
        }
        if (hasShareKeyword) {
          extractShares(cleanText).forEach(n => sharesCandidates.push(n));
        }
      }

      const likes = likesCandidates.length > 0 ? Math.max(...likesCandidates) : 0;
      const comments = commentsCandidates.length > 0 ? Math.max(...commentsCandidates) : 0;
      const shares = sharesCandidates.length > 0 ? Math.max(...sharesCandidates) : 0;

      return { likes, comments, shares };
    });

    console.log(`✅ Success! Extracted metrics:`, metrics);
    return res.status(200).json({ success: true, ...metrics });

  } catch (error) {
    console.error(`❌ Error scraping: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      console.log('🔒 Closing browser session.');
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`🚀 YCPP Self-Hosted Scraper API Running!`);
  console.log(`👉 Address: http://localhost:${PORT}`);
  console.log(`👉 Scrape Endpoint: http://localhost:${PORT}/api/scrape`);
  console.log(`================================================`);
});
