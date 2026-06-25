/**
 * A 股全量数据爬取脚本
 * 
 * 在你自己电脑上运行（网络不受限），拉取全部 5000+ A 股
 * 
 * 用法：
 *   node scripts/fetch-all-stocks.js
 * 
 * 然后重新部署：
 *   npx hardhat run scripts/deploy.js --network ganache
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PAGE_SIZE = 100;  // 东财 API 每页最多 100 条
const TOTAL_PAGES = 56;  // 5534 / 100 ≈ 56 页

function fetchPage(page) {
  return new Promise((resolve, reject) => {
    const url = `/api/qt/clist/get?pn=${page}&pz=${PAGE_SIZE}&po=1&fid=f20&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f14,f2&np=1&fltt=2`;
    const opts = { hostname: "push2.eastmoney.com", port: 80, path: url, method: "GET", timeout: 15000 };

    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

async function main() {
  console.log("🚀 开始爬取全部 A 股数据...\n");

  const allStocks = [];
  const seenCodes = new Set();

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    try {
      const data = await fetchPage(page);
      const diff = data?.data?.diff || [];
      
      // diff 可能是对象 { "0": {...}, "1": {...} } 或数组 [...]
      const items = Array.isArray(diff) ? diff : Object.values(diff);
      
      if (items.length === 0) {
        console.log(`  📄 第 ${page} 页: 无数据，结束`);
        break;
      }

      for (const item of items) {
        const code = String(item.f12 || "").trim();
        const name = String(item.f14 || "").trim();
        const price = Number(item.f2 || 0) / 100; // 东财价格单位是分

        // 过滤无效、退市、ST
        if (!code || !name || price <= 0) continue;
        if (name.includes("ST") || name.includes("退")) continue;
        if (code.startsWith("920") || code.startsWith("8") || code.startsWith("4")) continue;
        if (seenCodes.has(code)) continue;

        seenCodes.add(code);
        allStocks.push({
          code,
          name: name,
          price: price.toFixed(2)
        });
      }

      console.log(`  📄 第 ${page}/${TOTAL_PAGES} 页: +${items.length} 条 → 累计 ${allStocks.length} 只`);

      // 礼貌等待，避免被封
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`  ❌ 第 ${page} 页失败: ${err.message}，跳过`);
    }
  }

  console.log(`\n✅ 爬取完成！共 ${allStocks.length} 只 A 股`);

  // 保存到 data 目录
  const outputPath = path.join(__dirname, "..", "data", "all-stocks.json");
  fs.writeFileSync(outputPath, JSON.stringify(allStocks, null, 2), "utf-8");
  console.log(`💾 已保存到 ${outputPath}`);

  // 生成前端股票映射文件
  const secidMap = {};
  for (const s of allStocks) {
    const prefix = s.code.startsWith("6") || s.code.startsWith("9") ? "1" : "0";
    secidMap[s.code] = `${prefix}.${s.code}`;
  }
  const secidPath = path.join(__dirname, "..", "frontend", "public", "stock-secids.json");
  fs.writeFileSync(secidPath, JSON.stringify(secidMap, null, 2), "utf-8");
  console.log(`💾 前端映射文件已更新: ${secidPath}`);

  console.log("\n🎯 现在运行部署命令:");
  console.log("   npx hardhat run scripts/deploy.js --network ganache");
}

main().catch(console.error);
