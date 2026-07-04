const http = require('http');

http.get('http://localhost:3000/ambient/sessions/08669ef3-f056-4474-b33a-33970b27bf9e/stream', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
