import http from 'http';

setTimeout(() => {
const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/clawhub/search?q=test',
  method: 'GET'
};
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(`BODY: ${data}`));
});
req.on('error', e => console.log('ERROR:', e.message));
req.end();
}, 8000);
