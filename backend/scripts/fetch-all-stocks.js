// 全市场股票列表生成脚本
// 运行方式: cd backend && node scripts/fetch-all-stocks.js
// 输出: ../stock-meta.json 和 ../stock-secids.json

const fs = require('fs');
const path = require('path');

const BASE = 'https://push2.eastmoney.com/api/qt/clist/get';
const FIELDS = 'f12,f14';
const FS = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048';
const PAGE_SIZE = 200; // EastMoney max page size is ~200

async function fetchPage(pn) {
  const url = `${BASE}?pn=${pn}&pz=${PAGE_SIZE}&po=1&np=1&fields=${FIELDS}&fid=f3&fs=${FS}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://quote.eastmoney.com/' } });
  return r.json();
}

async function main() {
  console.log('Fetching first page to get total...');
  const first = await fetchPage(1);
  const total = first.data?.total || 0;
  console.log('Total stocks:', total);

  if (total === 0) {
    console.error('No data returned');
    return;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log('Total pages:', totalPages);

  let allStocks = [];
  for (let pn = 1; pn <= totalPages; pn++) {
    console.log(`Fetching page ${pn}/${totalPages}...`);
    const data = await fetchPage(pn);
    if (data.data?.diff) {
      allStocks = allStocks.concat(data.data.diff);
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Total fetched:', allStocks.length);

  // Build stock-meta.json (array of { code, name })
  const meta = allStocks.map(s => ({ code: s.f12, name: s.f14 }));

  // Build stock-secids.json (map of code -> secid)
  const secids = {};
  for (const s of allStocks) {
    const code = s.f12;
    // Determine secid prefix based on code
    let prefix;
    if (code.startsWith('6')) prefix = '1';
    else if (code.startsWith('8') || code.startsWith('4')) prefix = '1';
    else prefix = '0'; // 0, 3开头 → 深圳
    secids[code] = `${prefix}.${code}`;
  }

  const outDir = path.join(__dirname, '..');
  // Write meta
  fs.writeFileSync(path.join(outDir, 'stock-meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  // Write secids (minified, smaller)
  fs.writeFileSync(path.join(outDir, 'stock-secids.json'), JSON.stringify(secids), 'utf-8');

  console.log(`✓ Wrote ${meta.length} stocks to stock-meta.json`);
  console.log(`✓ Wrote ${Object.keys(secids).length} secids to stock-secids.json`);
}

main().catch(e => console.error('Error:', e));
