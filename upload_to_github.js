const fs = require('fs');
const https = require('https');
const path = require('path');

const b64 = fs.readFileSync('C:/WorkBuddy/stockdapp/token_b64.txt', 'utf8').trim();
const token = Buffer.from(b64, 'base64').toString('utf8');
const repo = 'kirito0627/stockdapp';
const branch = 'main';

// Files to upload (key paths)
const filesToUpload = [
    'backend/src/server.js',
    'backend/src/routes/auth.js',
    'backend/src/routes/trade.js',
    'backend/src/routes/account.js',
    'backend/src/db.js',
    'backend/src/contracts.js',
    'backend/src/middleware/auth.js',
    'backend/package.json',
    'backend/.gitignore',
    'frontend/src/App.jsx',
    'frontend/src/App.css',
    'frontend/src/components/Login.jsx',
    'frontend/src/components/Portfolio.jsx',
    'frontend/src/components/TradePanel.jsx',
    'frontend/src/components/KlineChart.jsx',
    'frontend/src/components/AccountPanel.jsx',
    'frontend/src/components/StockList.jsx',
    'frontend/package.json',
    'frontend/vite.config.js',
    'frontend/vercel.json',
    'frontend/.env.production',
    'frontend/.gitignore',
    'frontend/index.html',
    '.gitignore',
    'render.yaml',
    'stock-meta.json',
    'stock-secids.json',
    'package.json',
    'hardhat.config.js',
];

let index = 0;

function uploadNext() {
    if (index >= filesToUpload.length) {
        console.log('ALL_UPLOADED');
        return;
    }
    
    const filePath = filesToUpload[index];
    const fullPath = 'C:/WorkBuddy/stockdapp/' + filePath.replace(/\//g, path.sep);
    
    try {
        const content = fs.readFileSync(fullPath, 'base64');
        const apiPath = '/repos/' + repo + '/contents/' + filePath;
        
        const data = JSON.stringify({
            message: `Add ${filePath}`,
            content: content,
            branch: branch
        });
        
        const req = https.request({
            hostname: 'api.github.com',
            path: apiPath,
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'nodejs',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode === 201 || res.statusCode === 200) {
                    console.log('OK: ' + filePath);
                } else {
                    const r = JSON.parse(body);
                    console.log(res.statusCode + ': ' + filePath + ' - ' + (r.message || body.slice(0,100)));
                }
                index++;
                uploadNext();
            });
        });
        
        req.on('error', (e) => {
            console.log('ERR: ' + filePath + ' - ' + e.message);
            index++;
            uploadNext();
        });
        
        req.write(data);
        req.end();
    } catch (e) {
        console.log('SKIP: ' + filePath + ' - ' + e.message);
        index++;
        uploadNext();
    }
}

uploadNext();
