const https = require('https');
const fs = require('fs');

const workflowId = '29ImA7AxQFcGznN7';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNGUzYzViZC1kNDAyLTQ5MjQtOWFkNi1hOWZhZjI5ZDI4ZjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImM2NTlkMjViLTM4NDAtNDY2YS05YWRhLTZhZDA4YTA2MzZjOCIsImp0aSI6MTc3MjE1MDgxOH0.rwhZABnwso-J05bCxxM0_n82t3iYblhQA_Yssdd0O9k';

try {
    const data = fs.readFileSync('update_workflow.json', 'utf8');

    const options = {
        hostname: 'n8n-n8n.xaxebh.easypanel.host',
        port: 443,
        path: `/api/v1/workflows/${workflowId}`,
        method: 'PUT',
        headers: {
            'X-N8N-API-KEY': token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        },
        rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            console.log(body);
        });
    });

    req.on('error', (e) => {
        console.error('Request Error:', e);
    });

    req.write(data);
    req.end();
} catch (err) {
    console.error('File Error:', err);
}
