const url = 'https://ycpp-facebook-scraper-server-56450014005.asia-southeast1.run.app/api/scrape';
const postUrl = 'https://web.facebook.com/watch/?v=894626316942483';

console.log('Sending scrape request to: ' + url);
console.log('Target post: ' + postUrl);

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ url: postUrl })
})
.then(async res => {
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('Fetch error:', err);
});
