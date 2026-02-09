const http = require('http');

const url = 'http://localhost:3000/api/settings/management-budget?startYm=2026-01&endYm=2026-12';

console.log(`Connecting to ${url}...`);

http.get(url, (res) => {
    let data = '';
    console.log('Status Code:', res.statusCode);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response body:', data);
        try {
            const json = JSON.parse(data);
            console.log('Parsed JSON:', json);
        } catch (e) {
            console.log('Not a JSON response');
        }
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});
