const http = require('http');

const data = JSON.stringify({
  url: 'https://web.facebook.com/Khuong.Sreng/posts/pfbid072NSiL1csYZprYn92wK8JUuB7otaxdZNjjwGRg1o9m7aRb7ZFKSCyRPfzVx6SSN9l?__cft__[0]=AZZFlYj9AvSZ81AYvx9AbXR_zH4K21zVJBp9CChpIdeho6E_zpiz_lAQT-4fUtEDQZSpj0iT1Ju87FvV5q4If6ERIppmjdMMjcikvdcv1lRpOGCzwVgsiTfpJxAtI3fqJPkf9fz6xqkrQ4SNaHrZYfBWTN03n3HuwLAJKk-HjnAzxpqvMciHU8pcy7rk-RYxZVla8zWgJl-qk8BflisX3XWp&__tn__=%2CO%2CP-R'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/scrape',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
  });
});

req.on('error', error => {
  console.error('ERROR calling localhost:3000:', error.message);
});

req.write(data);
req.end();
