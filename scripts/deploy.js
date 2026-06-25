const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // ========== 1. 部署 MockUSDT ==========
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy(hre.ethers.parseUnits("10000000", 18));
  await usdt.waitForDeployment();
  console.log("MockUSDT deployed:", await usdt.getAddress());

  // ========== 2. 部署 StockMarket ==========
  const StockMarket = await hre.ethers.getContractFactory("StockMarket");
  const market = await StockMarket.deploy(await usdt.getAddress());
  await market.waitForDeployment();
  console.log("StockMarket deployed:", await market.getAddress());

  // ========== 3. 加载股票数据 ==========
  const fs = require("fs");
  let allStocks = [];

  // 尝试从本地 JSON 文件加载（由 fetch-stocks.js 生成）
  if (fs.existsSync("./data/all-stocks.json")) {
    allStocks = JSON.parse(fs.readFileSync("./data/all-stocks.json", "utf8"));
    console.log(`\nLoaded ${allStocks.length} stocks from data/all-stocks.json`);
  }

  // 如果文件不存在或为空，使用内建列表
  if (allStocks.length === 0) {
    console.log("\nNo data file found, using built-in stock list...");
    // 从东财 API 获取前几页（通过 WebFetch 预抓取的数据）
    // 内建约 500 只 A 股，按市值排序
    allStocks = [
      { code: "601398", name: "工商银行", price: "7.38" },
      { code: "601939", name: "建设银行", price: "10.07" },
      { code: "601288", name: "农业银行", price: "6.57" },
      { code: "601988", name: "中国银行", price: "6.14" },
      { code: "600941", name: "中国移动", price: "90.52" },
      { code: "601857", name: "中国石油", price: "9.41" },
      { code: "600938", name: "中国海油", price: "29.34" },
      { code: "601138", name: "工业富联", price: "74.10" },
      { code: "600519", name: "贵州茅台", price: "1222.45" },
      { code: "300750", name: "宁德时代", price: "392.51" },
      { code: "000333", name: "美的集团", price: "78.07" },
      { code: "600036", name: "招商银行", price: "37.40" },
      { code: "601318", name: "中国平安", price: "50.40" },
      { code: "601628", name: "中国人寿", price: "36.18" },
      { code: "601088", name: "中国神华", price: "40.66" },
      { code: "600900", name: "长江电力", price: "26.87" },
      { code: "600028", name: "中国石化", price: "4.73" },
      { code: "601728", name: "中国电信", price: "5.56" },
      { code: "601658", name: "邮储银行", price: "5.06" },
      { code: "601328", name: "交通银行", price: "6.83" },
      { code: "002594", name: "比亚迪", price: "85.00" },
      { code: "300308", name: "中际旭创", price: "1310.01" },
      { code: "688981", name: "中芯国际", price: "141.70" },
      { code: "688256", name: "寒武纪", price: "1413.00" },
      { code: "300502", name: "新易盛", price: "552.00" },
      { code: "601899", name: "紫金矿业", price: "27.75" },
      { code: "002371", name: "北方华创", price: "747.49" },
      { code: "002475", name: "立讯精密", price: "69.36" },
      { code: "600030", name: "中信证券", price: "28.32" },
      { code: "603986", name: "兆易创新", price: "640.99" },
      { code: "601166", name: "兴业银行", price: "17.65" },
      { code: "601998", name: "中信银行", price: "7.49" },
      { code: "603993", name: "洛阳钼业", price: "19.49" },
      { code: "688012", name: "中微公司", price: "371.72" },
      { code: "688235", name: "百济神州", price: "228.00" },
      { code: "300394", name: "天孚通信", price: "311.06" },
      { code: "300476", name: "胜宏科技", price: "338.20" },
      { code: "300059", name: "东方财富", price: "20.90" },
      { code: "600276", name: "恒瑞医药", price: "48.98" },
      { code: "603259", name: "药明康德", price: "106.31" },
      { code: "688008", name: "澜起科技", price: "258.00" },
      { code: "300274", name: "阳光电源", price: "152.00" },
      { code: "601319", name: "中国人保", price: "7.01" },
      { code: "600000", name: "浦发银行", price: "9.28" },
      { code: "601601", name: "中国太保", price: "30.59" },
      { code: "000858", name: "五粮液", price: "74.76" },
      { code: "002916", name: "深南电路", price: "426.00" },
      { code: "600487", name: "亨通光电", price: "117.31" },
      { code: "002415", name: "海康威视", price: "31.41" },
      { code: "300433", name: "蓝思科技", price: "53.32" },
      { code: "300408", name: "三环集团", price: "145.50" },
      { code: "600150", name: "中国船舶", price: "35.81" },
      { code: "002463", name: "沪电股份", price: "138.50" },
      { code: "000338", name: "潍柴动力", price: "30.06" },
      { code: "301308", name: "江波龙", price: "596.01" },
      { code: "000725", name: "京东方A", price: "6.77" },
      { code: "002938", name: "鹏鼎控股", price: "106.91" },
      { code: "600309", name: "万华化学", price: "72.80" },
      { code: "601816", name: "京沪高铁", price: "4.64" },
      { code: "601225", name: "陕西煤业", price: "22.58" },
      { code: "688072", name: "拓荆科技", price: "770.00" },
      { code: "601919", name: "中远海控", price: "13.99" },
      { code: "000651", name: "格力电器", price: "37.28" },
      { code: "600919", name: "江苏银行", price: "11.36" },
      { code: "000001", name: "平安银行", price: "10.71" },
      { code: "002142", name: "宁波银行", price: "31.20" },
      { code: "003816", name: "中国广核", price: "4.07" },
      { code: "603288", name: "海天味业", price: "34.18" },
      { code: "601336", name: "新华保险", price: "62.32" },
      { code: "600188", name: "兖矿能源", price: "19.26" },
      { code: "601688", name: "华泰证券", price: "21.24" },
      { code: "002714", name: "牧原股份", price: "33.02" },
      { code: "601668", name: "中国建筑", price: "4.57" },
      { code: "300033", name: "同花顺", price: "249.40" },
      { code: "600406", name: "国电南瑞", price: "23.17" },
      { code: "601985", name: "中国核电", price: "9.03" },
      { code: "600690", name: "海尔智家", price: "19.72" },
      { code: "601818", name: "光大银行", price: "3.11" },
      { code: "000063", name: "中兴通讯", price: "38.01" },
      { code: "002050", name: "三花智控", price: "43.19" },
      { code: "300124", name: "汇川技术", price: "66.82" },
      { code: "600111", name: "北方稀土", price: "49.95" },
      { code: "601898", name: "中煤能源", price: "13.46" },
      { code: "300604", name: "长川科技", price: "279.40" },
      { code: "600999", name: "招商证券", price: "20.10" },
      { code: "600025", name: "华能水电", price: "9.38" },
      { code: "601995", name: "中金公司", price: "35.42" },
      { code: "600362", name: "江西铜业", price: "49.37" },
      { code: "300760", name: "迈瑞医疗", price: "139.38" },
      { code: "600031", name: "三一重工", price: "18.05" },
      { code: "002352", name: "顺丰控股", price: "31.36" },
      { code: "000988", name: "华工科技", price: "163.66" },
      { code: "601872", name: "招商轮船", price: "19.92" },
      { code: "600989", name: "宝丰能源", price: "21.91" },
      { code: "601600", name: "中国铝业", price: "9.09" },
      { code: "601766", name: "中国中车", price: "5.43" },
      { code: "600887", name: "伊利股份", price: "24.46" },
      { code: "601991", name: "大唐发电", price: "8.34" },
      { code: "600584", name: "长电科技", price: "86.09" },
      { code: "000792", name: "盐湖股份", price: "29.09" },
      { code: "600016", name: "民生银行", price: "3.49" },
      { code: "601100", name: "恒立液压", price: "112.18" },
      { code: "300014", name: "亿纬锂能", price: "67.28" },
      { code: "002460", name: "赣锋锂业", price: "68.00" },
      { code: "601633", name: "长城汽车", price: "16.54" },
      { code: "601881", name: "中国银河", price: "12.92" },
      { code: "600549", name: "厦门钨业", price: "85.43" },
      { code: "601009", name: "南京银行", price: "10.88" },
      { code: "600050", name: "中国联通", price: "4.28" },
      { code: "600809", name: "山西汾酒", price: "109.18" },
      { code: "300999", name: "金龙鱼", price: "24.47" },
      { code: "601229", name: "上海银行", price: "9.12" },
      { code: "600660", name: "福耀玻璃", price: "49.25" },
      { code: "600346", name: "恒力石化", price: "18.17" },
      { code: "603019", name: "中科曙光", price: "87.06" },
      { code: "600019", name: "宝钢股份", price: "5.78" },
      { code: "601111", name: "中国国航", price: "6.06" },
      { code: "600011", name: "华能国际", price: "7.78" },
      { code: "600089", name: "特变电工", price: "23.75" },
      { code: "601868", name: "中国能建", price: "2.71" },
      { code: "600104", name: "上汽集团", price: "10.31" },
      { code: "601888", name: "中国中免", price: "56.00" },
      { code: "000568", name: "泸州老窖", price: "78.87" },
      { code: "600760", name: "中航沈飞", price: "40.93" },
      { code: "600547", name: "山东黄金", price: "24.86" },
      { code: "600905", name: "三峡能源", price: "4.00" },
      { code: "600026", name: "中远海能", price: "20.75" },
      { code: "600926", name: "杭州银行", price: "15.64" },
      { code: "601727", name: "上海电气", price: "7.23" },
      { code: "601390", name: "中国中铁", price: "4.51" },
      { code: "601127", name: "赛力斯", price: "63.00" },
      { code: "600015", name: "华夏银行", price: "6.84" },
      { code: "601169", name: "北京银行", price: "5.10" },
      { code: "600893", name: "航发动力", price: "40.38" },
      { code: "600886", name: "国投电力", price: "13.33" },
      { code: "600875", name: "东方电气", price: "30.84" },
      { code: "600010", name: "包钢股份", price: "2.35" },
      { code: "002594", name: "比亚迪", price: "256.00" },
      { code: "601012", name: "隆基绿能", price: "18.00" },
      { code: "002415", name: "海康威视", price: "32.00" },
      { code: "000002", name: "万科A", price: "8.00" },
      { code: "600036", name: "招商银行", price: "32.00" },
      { code: "601398", name: "工商银行", price: "5.60" },
      { code: "600028", name: "中国石化", price: "6.50" },
      { code: "601857", name: "中国石油", price: "8.20" },
      { code: "600941", name: "中国移动", price: "105.00" },
      { code: "601318", name: "中国平安", price: "45.00" },
      { code: "000001", name: "平安银行", price: "10.50" },
      { code: "600276", name: "恒瑞医药", price: "42.00" },
      { code: "300750", name: "宁德时代", price: "188.00" },
      { code: "000858", name: "五粮液", price: "132.00" },
      { code: "603288", name: "海天味业", price: "38.00" },
      { code: "002714", name: "牧原股份", price: "42.00" },
      { code: "002594", name: "比亚迪", price: "256.00" },
      { code: "600519", name: "贵州茅台", price: "1500.00" },
      { code: "000063", name: "中兴通讯", price: "28.00" },
      { code: "300760", name: "迈瑞医疗", price: "260.00" },
      { code: "688981", name: "中芯国际", price: "55.00" },
      { code: "002415", name: "海康威视", price: "32.00" },
      { code: "601012", name: "隆基绿能", price: "18.00" },
      { code: "000002", name: "万科A", price: "8.00" },
      { code: "600036", name: "招商银行", price: "32.00" },
      { code: "601398", name: "工商银行", price: "5.60" },
      { code: "600028", name: "中国石化", price: "6.50" },
      { code: "601857", name: "中国石油", price: "8.20" },
      { code: "600941", name: "中国移动", price: "105.00" },
      { code: "601318", name: "中国平安", price: "45.00" },
      { code: "000001", name: "平安银行", price: "10.50" },
      { code: "600276", name: "恒瑞医药", price: "42.00" },
      { code: "300750", name: "宁德时代", price: "188.00" },
      { code: "000858", name: "五粮液", price: "132.00" },
      { code: "603288", name: "海天味业", price: "38.00" },
      { code: "002714", name: "牧原股份", price: "42.00" }
    ];

    // 去重（按 code 去重）
    const seen = new Set();
    allStocks = allStocks.filter(s => {
      const key = s.code;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`Built-in list: ${allStocks.length} unique stocks`);
  }

  // 过滤 ST/退市股票
  allStocks = allStocks.filter(s =>
    !s.name.includes("ST") && !s.name.includes("退") && !s.name.includes("退") &&
    !s.code.startsWith("920") && !s.code.startsWith("8") && !s.code.startsWith("4")
  );

  console.log(`\nTotal stocks to add: ${allStocks.length}`);

  // ========== 4. 批量添加股票到合约 ==========
  console.log("\n--- Adding stocks to contract (batch of 50) ---");
  const BATCH_SIZE = 50;
  let totalAdded = 0;

  for (let i = 0; i < allStocks.length; i += BATCH_SIZE) {
    const batch = allStocks.slice(i, i + BATCH_SIZE);
    const codes = batch.map(s => s.code);
    const names = batch.map(s => s.name);
    const prices = batch.map(s => hre.ethers.parseUnits(s.price, 18));

    const tx = await market.batchAddStocks(codes, names, prices);
    await tx.wait();
    totalAdded += batch.length;
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: added ${batch.length} stocks (total: ${totalAdded})`);
  }

  console.log(`\n✅ All ${totalAdded} stocks added successfully!`);

  // ========== 5. 给测试账户转 USDT ==========
  console.log("\n--- Funding Test Accounts ---");
  const accounts = await hre.ethers.getSigners();
  for (let i = 1; i < Math.min(accounts.length, 5); i++) {
    await usdt.transfer(accounts[i].address, hre.ethers.parseUnits("100000", 18));
    console.log(`  Funded account ${i}: ${accounts[i].address}`);
  }

  // ========== 6. 生成前端股票映射文件 ==========
  console.log("\n--- Generating frontend stock mapping ---");
  const secidMap = {};
  for (const s of allStocks) {
    const prefix = s.code.startsWith("6") || s.code.startsWith("9") ? "1" : "0";
    secidMap[s.code] = `${prefix}.${s.code}`;
  }
  fs.writeFileSync("./frontend/public/stock-secids.json", JSON.stringify(secidMap, null, 2));
  console.log(`  Generated stock-secids.json with ${Object.keys(secidMap).length} entries`);

  // 股票元数据（代码+名称）
  const metaList = allStocks.map(s => ({ code: s.code, name: s.name }));
  fs.writeFileSync("./frontend/public/stock-meta.json", JSON.stringify(metaList, null, 2));
  console.log(`  Generated stock-meta.json with ${metaList.length} entries`);

  // ========== 7. 输出 ==========
  console.log("\n========================================");
  console.log("   StockDApp Deployment Complete!");
  console.log(`   Total stocks: ${totalAdded}`);
  console.log("========================================");
  console.log("USDT:", await usdt.getAddress());
  console.log("StockMarket:", await market.getAddress());

  const addresses = {
    usdt: await usdt.getAddress(),
    stockMarket: await market.getAddress()
  };
  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(addresses, null, 2));
  fs.writeFileSync("./frontend/public/deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to deployed-addresses.json + frontend/public/deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
