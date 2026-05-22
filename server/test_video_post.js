const http = require('http');

const data = JSON.stringify({
  url: 'https://web.facebook.com/watch/?v=1669836554168199&__cft__[0]=AZa113te4jzF96fbPLnP2XNJQRwsNmPiXFqvg6A34vPXbekH8tm3aiyXRXWTxjMsmouX6w20HK4a45FyLy2tMIX058Mpe7T4_3jRYEQHpJZu-Y2fu9zdi8L-WWB-VX7FfXQ8JSirIGklM2T9KhJK0QYnXPeuahlPi94OjIp81jWbwZy45VMxezAbE8u5P6-cFqpefdmnCi7Vnw6E3f3Uoz5V&__tn__=%2CO%2CP-R'
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
