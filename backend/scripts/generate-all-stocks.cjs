// 生成全市场股票列表
const fs = require('fs');
const path = require('path');

const BASE = 'https://push2.eastmoney.com/api/qt/clist/get';
const FIELDS = 'f12,f14';
const FS = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048';
const PAGE_SIZE = 100;

async function fetchPage(pn) {
  const url = `${BASE}?pn=${pn}&pz=${PAGE_SIZE}&po=1&np=1&fields=${FIELDS}&fid=f3&fs=${FS}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://quote.eastmoney.com/' } });
  return r.json();
}

async function main() {
  console.log('Fetching total count...');
  const first = await fetchPage(1);
  const total = first.data?.total || 0;
  console.log('Total stocks:', total);
  if (total === 0) { console.error('No data'); return; }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log(`Fetching ${totalPages} pages sequentially...`);

  let all = [];
  for (let pn = 1; pn <= totalPages; pn++) {
    const t1 = Date.now();
    const d = await fetchPage(pn);
    if (d.data?.diff) all = all.concat(d.data.diff);
    const ms = Date.now() - t1;
    if (pn % 10 === 0 || pn === 1) {
      console.log(`  Page ${pn}/${totalPages} (${all.length}/${total} stocks, ${ms}ms)`);
    }
    await new Promise(r => setTimeout(r, 50)); // small delay
  }
  console.log('Total fetched:', all.length);

  // Build files
  const meta = all.map(s => ({ code: s.f12, name: s.f14 || s.f12 }));
  const secids = {};
  for (const s of all) {
    const code = s.f12;
    secids[code] = (code.startsWith('6') ? '1' : '0') + '.' + code;
  }

  const rootDir = path.resolve(__dirname, '..');
  fs.writeFileSync(path.join(rootDir, 'stock-meta.json'), JSON.stringify(meta), 'utf-8');
  fs.writeFileSync(path.join(rootDir, 'stock-secids.json'), JSON.stringify(secids), 'utf-8');
  
  const frontendDir = path.join(rootDir, '..', 'frontend', 'public');
  if (fs.existsSync(frontendDir)) {
    fs.copyFileSync(path.join(rootDir, 'stock-meta.json'), path.join(frontendDir, 'stock-meta.json'));
    fs.copyFileSync(path.join(rootDir, 'stock-secids.json'), path.join(frontendDir, 'stock-secids.json'));
    console.log('Copied to frontend/public/');
  }
  console.log(`Done! ${meta.length} stocks written.`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
