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
  let { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'Facebook URL is required.' });
  }

  // Normalize mobile URLs to desktop web.facebook.com for primary scraping phase
  if (url.includes('m.facebook.com')) {
    url = url.replace('m.facebook.com', 'web.facebook.com');
  } else if (url.includes('mobile.facebook.com')) {
    url = url.replace('mobile.facebook.com', 'web.facebook.com');
  }

  console.log(`\n🚀 Received scrape request for: ${url}`);
  let browser = null;

  try {
    // Launch headless Chromium optimized and verified for Linux container environments
    browser = await puppeteer.launch({
      headless: "new", // Run in headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-features=IsolateOrigins,site-per-process',
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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait a brief moment to let animations or dynamic updates render
    console.log('⏳ Page loaded. Parsing DOM metrics...');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

    const isVideo = url.includes('/watch') || url.includes('/videos') || url.includes('fb.watch') || url.includes('?v=') || url.includes('&v=') || url.includes('/reel/') || url.includes('/reels/');

    // Extract engagement stats using regular expressions & stable DOM selectors
    const metrics = await page.evaluate((isVideo) => {
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

      // -------------------------------------------------------------
      // EXPLICIT SEPARATION FOR FACEBOOK WATCH / VIDEO POST SCRAPING
      // -------------------------------------------------------------
      if (isVideo) {
        let likes = 0;
        let comments = 0;
        let shares = 0;
        let views = 0;

        // 1. JSON-LD Schema Scraping (Primary precise metrics source)
        try {
          const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
          for (const script of jsonLdScripts) {
            try {
              const data = JSON.parse(script.textContent);
              const objects = Array.isArray(data) ? data : [data];
              for (const obj of objects) {
                function findInteractionStatistics(item) {
                  if (!item || typeof item !== 'object') return;
                  
                  if (item.interactionStatistic) {
                    const stats = Array.isArray(item.interactionStatistic) 
                      ? item.interactionStatistic 
                      : [item.interactionStatistic];
                    
                    for (const stat of stats) {
                      if (stat.interactionType && stat.userInteractionCount !== undefined) {
                        const count = parseInt(stat.userInteractionCount, 10);
                        if (!isNaN(count)) {
                          const type = stat.interactionType['@type'] || '';
                          if (type.includes('LikeAction')) {
                            likes = count;
                          } else if (type.includes('CommentAction')) {
                            comments = count;
                          } else if (type.includes('ShareAction')) {
                            shares = count;
                          } else if (type.includes('WatchAction') || type.includes('ViewAction')) {
                            views = count;
                          }
                        }
                      }
                    }
                  }
                  
                  for (const key in item) {
                    if (Object.prototype.hasOwnProperty.call(item, key)) {
                      findInteractionStatistics(item[key]);
                    }
                  }
                }
                findInteractionStatistics(obj);
              }
            } catch (e) {}
          }
        } catch (err) {}

        // 2. Meta Scraping Fallback (Checking multiple meta properties)
        try {
          const metaSelectors = [
            'meta[property="og:description"]',
            'meta[name="description"]',
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'meta[name="twitter:description"]',
            'meta[property="og:image:alt"]',
            'meta[name="twitter:image:alt"]'
          ];
          
          for (const selector of metaSelectors) {
            const metaEl = document.querySelector(selector);
            if (metaEl) {
              const metaText = metaEl.getAttribute('content') || '';
              if (metaText) {
                if (!likes) {
                  const likeMatch = metaText.match(/([\d.,]+(?:K|M|ពាន់|លាន)?)\s*(?:likes?|reactions?|ចូលចិត្ត|ប្រតិកម្ម)/i) ||
                                    metaText.match(/(?:likes?|reactions?|ចូលចិត្ត|ប្រតិកម្ម)\s*([\d.,]+(?:K|M|ពាន់|លាន)?)/i);
                  if (likeMatch) likes = parseNum(likeMatch[1]);
                }
                if (!comments) {
                  const commentMatch = metaText.match(/([\d.,]+(?:K|M|ពាន់|លាន)?)\s*(?:comments?|មតិយោបល់|មតិ)/i) ||
                                       metaText.match(/(?:comments?|មតិយោបល់|មតិ)\s*([\d.,]+(?:K|M|ពាន់|លាន)?)/i);
                  if (commentMatch) comments = parseNum(commentMatch[1]);
                }
                if (!shares) {
                  const shareMatch = metaText.match(/([\d.,]+(?:K|M|ពាន់|លាន)?)\s*(?:shares?|ការចែករំលែក|ចែករំលែក)/i) ||
                                     metaText.match(/(?:shares?|ការចែករំលែក|ចែករំលែក)\s*([\d.,]+(?:K|M|ពាន់|លាន)?)/i);
                  if (shareMatch) shares = parseNum(shareMatch[1]);
                }
                if (!views) {
                  const viewMatch = metaText.match(/([\d.,]+(?:K|M|ពាន់|លាន)?)\s*(?:views?|ទស្សនា|ការទស្សនា)/i) ||
                                    metaText.match(/(?:views?|ទស្សនា|ការទស្សនា)\s*([\d.,]+(?:K|M|ពាន់|លាន)?)/i);
                  if (viewMatch) views = parseNum(viewMatch[1]);
                }
              }
            }
          }
        } catch (e) {}

        // 3. DOM Watch Metrics Bar Splitting Fallback
        try {
          const candidates = Array.from(document.querySelectorAll('div, span'));
          for (const el of candidates) {
            const text = (el.innerText || '').trim();
            if (text.includes('·') || text.includes('\n')) {
              const containsViews = text.toLowerCase().includes('view') || text.includes('ទស្សនា');
              const containsComments = text.toLowerCase().includes('comment') || text.includes('មតិ');
              
              if (containsViews && text.length < 200) {
                const parts = text.split(/[\n·•\r]+/).map(p => p.trim()).filter(Boolean);
                let localLikes = 0;
                let localComments = 0;
                let localShares = 0;
                let localViews = 0;
                
                for (const part of parts) {
                  const cleanPart = part.toLowerCase();
                  if (cleanPart.includes('comment') || cleanPart.includes('មតិ')) {
                    const match = part.match(/([\d.,]+(?:K|M|ពាន់|លាន)?)/);
                    if (match) localComments = parseNum(match[1]);
                  } else if (cleanPart.includes('share') || cleanPart.includes('ចែករំលែក')) {
                    const match = part.match(/([\d.,]+(?:K|M|ពាន់|លាន)?)/);
                    if (match) localShares = parseNum(match[1]);
                  } else if (cleanPart.includes('view') || cleanPart.includes('ទស្សនា')) {
                    const match = part.match(/([\d.,]+(?:K|M|ពាន់|លាន)?)/);
                    if (match) localViews = parseNum(match[1]);
                  } else {
                    const match = part.match(/^([\d.,]+(?:K|M|ពាន់|លាន)?)$/);
                    if (match) {
                      localLikes = parseNum(match[1]);
                    } else {
                      const generalMatch = part.match(/([\d.,]+(?:K|M|ពាន់|លាន)?)/);
                      if (generalMatch) localLikes = parseNum(generalMatch[1]);
                    }
                  }
                }
                
                if (localLikes && !likes) likes = localLikes;
                if (localComments && !comments) comments = localComments;
                if (localShares && !shares) shares = localShares;
                if (localViews && !views) views = localViews;
              }
            }
          }
        } catch (e) {}

        // 4. Dedicated video DOM selector fallback (guaranteeing no views count bleed into reactions)
        if (!likes || !comments || !shares) {
          const isInvalidVideoElement = (text, label) => {
            const combined = (text + ' ' + label).toLowerCase();
            return combined.includes('view') || combined.includes('ទស្សនា');
          };
          
          if (!likes) {
            const reactionEls = Array.from(document.querySelectorAll(
              'a[href*="/reaction/profile/browser/"], a[href*="reaction_profile"], a[href*="reaction"], [aria-label*="reaction" i], [aria-label*="Reactions" i], [aria-label*="Like" i], [aria-label*="like" i], [aria-label*="reacted" i], [aria-label*="បញ្ចេញមតិប្រតិកម្ម" i], [aria-label*="ប្រតិកម្ម" i], [data-testid*="reaction" i], [data-testid*="Reactions" i], [class*="reactions" i]'
            ));
            const cands = [];
            for (const el of reactionEls) {
              const text = el.innerText || '';
              const label = el.getAttribute('aria-label') || '';
              if (isInvalidVideoElement(text, label)) continue;
              if (text && text.length <= 150) extractLikes(text).forEach(n => cands.push(n));
              if (label && label.length <= 150) extractLikes(label).forEach(n => cands.push(n));
            }
            if (cands.length > 0) likes = Math.max(...cands);
          }
          
          if (!comments) {
            const commentEls = Array.from(document.querySelectorAll(
              '[aria-label*="comment" i], [aria-label*="comments" i], [aria-label*="មតិយោបល់" i], [aria-label*="មតិ" i], [data-testid*="comment" i], [class*="comment" i]'
            ));
            const cands = [];
            for (const el of commentEls) {
              const text = el.innerText || '';
              const label = el.getAttribute('aria-label') || '';
              if (isInvalidVideoElement(text, label)) continue;
              if (text && text.length <= 150) extractComments(text).forEach(n => cands.push(n));
              if (label && label.length <= 150) extractComments(label).forEach(n => cands.push(n));
            }
            if (cands.length > 0) comments = Math.max(...cands);
          }
          
          if (!shares) {
            const shareEls = Array.from(document.querySelectorAll(
              '[aria-label*="share" i], [aria-label*="shares" i], [aria-label*="ចែករំលែក" i], [aria-label*="ការចែករំលែក" i], [data-testid*="share" i], [class*="share" i]'
            ));
            const cands = [];
            for (const el of shareEls) {
              const text = el.innerText || '';
              const label = el.getAttribute('aria-label') || '';
              if (isInvalidVideoElement(text, label)) continue;
              if (text && text.length <= 150) extractShares(text).forEach(n => cands.push(n));
              if (label && label.length <= 150) extractShares(label).forEach(n => cands.push(n));
            }
            if (cands.length > 0) shares = Math.max(...cands);
          }
        }

        // 5. Dedicated Reels DOM Layout & Text Fallback
        if (!likes || !comments || !shares) {
          try {
            const textContent = (document.body ? document.body.innerText : '') || '';
            const lines = textContent.split('\n').map(l => l.trim()).filter(Boolean);
            const reelsIdx = lines.findIndex(l => l.toLowerCase() === 'reels');
            if (reelsIdx !== -1) {
              const candidates = [];
              for (let i = reelsIdx - 1; i >= 0 && i >= reelsIdx - 3; i--) {
                const line = lines[i];
                if (/^[\d.,]+(K|M|ពាន់|លាន)?$/i.test(line)) {
                  candidates.unshift(parseNum(line));
                } else {
                  break;
                }
              }
              
              if (candidates.length > 0) {
                if (candidates.length === 3) {
                  if (!likes) likes = candidates[0];
                  if (!comments) comments = candidates[1];
                  if (!shares) shares = candidates[2];
                } else if (candidates.length === 2) {
                  if (!likes) likes = candidates[0];
                  if (!comments) comments = candidates[1];
                } else if (candidates.length === 1) {
                  if (!likes) likes = candidates[0];
                }
              }
            }
          } catch (e) {}
        }

        return { likes, comments, shares, views };
      }

      // -------------------------------------------------------------
      // STANDARD IMAGE POST SCRAPING LOGIC (STRICTLY UNCHANGED)
      // -------------------------------------------------------------
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
    }, isVideo);

    // If the post is a video and the shares count is 0, fetch mobile view fallback
    if (isVideo && metrics.shares === 0) {
      console.log('🕵️ Video shares count is 0 on desktop view. Fetching mobile view fallback...');
      try {
        const mobilePage = await browser.newPage();
        await mobilePage.setViewport({ width: 375, height: 812, isMobile: true });
        await mobilePage.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9'
        });
        
        let mobileUrl = url;
        if (!mobileUrl.includes('m.facebook.com')) {
          mobileUrl = mobileUrl.replace(/(?:web\.|www\.)?facebook\.com/i, 'm.facebook.com');
        }
        if (!mobileUrl.startsWith('http')) {
          mobileUrl = 'https://m.facebook.com' + (mobileUrl.startsWith('/') ? '' : '/') + mobileUrl;
        }
        
        console.log(`📱 Loading mobile fallback URL: ${mobileUrl}`);
        await mobilePage.goto(mobileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await mobilePage.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
        
        const mobileShares = await mobilePage.evaluate(() => {
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

          function parseMobileShares(label) {
            if (!label) return 0;
            const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
            let cleanLabel = label.trim().replace(/[០-៩]/g, char => khmerDigits.indexOf(char));
            
            let match = cleanLabel.match(/Share,\s*([\d.,]+)\s*shares?/i);
            if (match) {
              const val = parseFloat(match[1].replace(/,/g, ''));
              return isNaN(val) ? 0 : val;
            }
            match = cleanLabel.match(/Share,\s*([\d.,]+)\s*thousand\s*shares?/i);
            if (match) {
              const val = parseFloat(match[1].replace(/,/g, ''));
              return isNaN(val) ? 0 : Math.round(val * 1000);
            }
            match = cleanLabel.match(/Share,\s*([\d.,]+)\s*million\s*shares?/i);
            if (match) {
              const val = parseFloat(match[1].replace(/,/g, ''));
              return isNaN(val) ? 0 : Math.round(val * 1000000);
            }
            
            // Match Khmer: e.g. "ចែករំលែក ចំនួន 4 ពាន់ ដង" or "ការចែករំលែក 4 ពាន់"
            match = cleanLabel.match(/(?:ចែករំលែក|ការចែករំលែក)[^\d]*([\d.,]+)\s*(ពាន់|លាន)?/i);
            if (match) {
              const numPart = match[1].replace(/,/g, '');
              const suffix = match[2];
              const parsed = parseFloat(numPart);
              if (isNaN(parsed)) return 0;
              if (suffix === 'ពាន់') return Math.round(parsed * 1000);
              if (suffix === 'លាន') return Math.round(parsed * 1000000);
              return parsed;
            }
            return 0;
          }

          const shareButtons = Array.from(document.querySelectorAll('[aria-label*="share" i], [aria-label*="shares" i], [aria-label*="ចែករំលែក" i]'));
          for (const btn of shareButtons) {
            const label = btn.getAttribute('aria-label') || '';
            const parsed = parseMobileShares(label);
            if (parsed > 0) return parsed;
          }

          const allEls = Array.from(document.querySelectorAll('*'));
          let bestVal = 0;
          for (const el of allEls) {
            const text = (el.innerText || '').trim();
            const label = el.getAttribute('aria-label') || '';
            
            const parsedLabel = parseMobileShares(label);
            if (parsedLabel > bestVal) bestVal = parsedLabel;
            
            if (text.length > 0 && text.length < 150) {
              if (text.toLowerCase().includes('share') || text.includes('ចែករំលែក')) {
                const match = text.match(/([\d.,]+(?:K|M|thousand|million|លាន|ពាន់)?)\s*(?:shares?|ការចែករំលែក|ចែករំលែក)/i) ||
                              text.match(/(?:shares?|ការចែករំលែក|ចែករំលែក)[^\d\n]*([\d.,]+(?:K|M|thousand|million|លាន|ពាន់)?)/i);
                if (match) {
                  const val = parseNum(match[1]);
                  if (val > bestVal) bestVal = val;
                }
              }
            }
          }
          return bestVal;
        });
        
        console.log(`🎯 Successfully scraped mobile shares fallback: ${mobileShares}`);
        if (mobileShares > 0) {
          metrics.shares = mobileShares;
        }
        await mobilePage.close();
      } catch (mobileErr) {
        console.error('⚠️ Failed to scrape mobile shares fallback:', mobileErr);
      }
    }

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
