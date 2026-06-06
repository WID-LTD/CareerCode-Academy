const https = require('https');

https.get('https://google.com', (res) => {
  console.log('HTTP connection success! Status code:', res.statusCode);
}).on('error', (err) => {
  console.error('HTTP connection error:', err);
});
