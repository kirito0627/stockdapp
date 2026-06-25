const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StockMarket", function () {
  let usdt, market, owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy(ethers.parseUnits("1000000", 18));

    const StockMarket = await ethers.getContractFactory("StockMarket");
    market = await StockMarket.deploy(await usdt.getAddress());

    // 添加股票
    await market.addStock("600519", "贵州茅台", ethers.parseUnits("1500", 18));
    await market.addStock("000001", "平安银行", ethers.parseUnits("10.5", 18));
  });

  describe("Admin", function () {
    it("should add stocks", async function () {
      const list = await market.getStockList();
      expect(list.length).to.equal(2);
      expect(list[0].name).to.equal("贵州茅台");
      expect(list[0].price).to.equal(ethers.parseUnits("1500", 18));
    });

    it("should update price", async function () {
      await market.updatePrice("600519", ethers.parseUnits("1550", 18), ethers.parseUnits("0.0333", 18));
      const stock = await market.stocks("600519");
      expect(stock.price).to.equal(ethers.parseUnits("1550", 18));
    });
  });

  describe("Trading", function () {
    beforeEach(async function () {
      // 给 user1 转 USDT
      await usdt.transfer(user1.address, ethers.parseUnits("50000", 18));
      // user1 授权并充值
      await usdt.connect(user1).approve(await market.getAddress(), ethers.parseUnits("50000", 18));
      await market.connect(user1).deposit(ethers.parseUnits("50000", 18));
    });

    it("should allow deposit", async function () {
      const bal = await market.usdtBalances(user1.address);
      expect(bal).to.equal(ethers.parseUnits("50000", 18));
    });

    it("should allow buying stocks", async function () {
      // 用 10000 USDT 买茅台，股价 1500
      await market.connect(user1).buy("600519", ethers.parseUnits("10000", 18));

      const pos = await market.positions(user1.address, "600519");
      // 10000 / 1500 = 6.666... 股
      expect(pos.shares).to.be.gt(0);

      // USDT 余额减少
      const bal = await market.usdtBalances(user1.address);
      expect(bal).to.equal(ethers.parseUnits("40000", 18));
    });

    it("should allow selling stocks", async function () {
      await market.connect(user1).buy("600519", ethers.parseUnits("15000", 18));
      const pos = await market.positions(user1.address, "600519");
      const shares = pos.shares;

      // 全部卖出
      await market.connect(user1).sell("600519", shares);
      const posAfter = await market.positions(user1.address, "600519");
      expect(posAfter.shares).to.equal(0);

      // USDT 余额≈原余额（无涨跌）
      const bal = await market.usdtBalances(user1.address);
      expect(bal).to.be.closeTo(ethers.parseUnits("50000", 18), ethers.parseUnits("1", 18));
    });

    it("should reject buying with insufficient balance", async function () {
      await expect(
        market.connect(user1).buy("600519", ethers.parseUnits("100000", 18))
      ).to.be.revertedWith("Insufficient USDT balance");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      await usdt.transfer(user1.address, ethers.parseUnits("10000", 18));
      await usdt.connect(user1).approve(await market.getAddress(), ethers.parseUnits("10000", 18));
      await market.connect(user1).deposit(ethers.parseUnits("10000", 18));
    });

    it("should allow withdrawal", async function () {
      await market.connect(user1).withdraw(ethers.parseUnits("5000", 18));
      const bal = await market.usdtBalances(user1.address);
      expect(bal).to.equal(ethers.parseUnits("5000", 18));
    });
  });
});
