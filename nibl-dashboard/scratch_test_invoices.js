const http = require('http');

http.get('http://localhost:3000/api/invoices?from=2026-01-01&to=2026-07-13', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(res.statusCode);
    console.log(data);
  });
}).on('error', err => console.log(err));
