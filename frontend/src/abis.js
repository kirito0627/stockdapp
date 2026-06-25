// ========== 后端 API 基地址 ==========
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ========== ERC20 ABI ==========
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// ========== StockMarket ABI ==========
export const MARKET_ABI = [
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function buy(string stockCode, uint256 amount)",
  "function sell(string stockCode, uint256 shares)",
  "function usdtBalances(address) view returns (uint256)",
  "function stocks(string) view returns (string name, string code, uint256 price, uint256 high, uint256 low, uint256 open, uint256 preClose, uint256 volume, uint256 changePct, bool isActive)",
  "function positions(address, string) view returns (uint256 shares, uint256 costBasis)",
  "function getStockList() view returns (tuple(string name, string code, uint256 price, uint256 high, uint256 low, uint256 open, uint256 preClose, uint256 volume, uint256 changePct, bool isActive)[])",
  "function getUserPositions(address) view returns (string[] codes, uint256[] shares, uint256[] costBases, uint256[] currentPrices, uint256[] profits)",
  "function getTradeCount(address) view returns (uint256)",
  "function getRecentTrades(address, uint256) view returns (tuple(string stockCode, bool isBuy, uint256 price, uint256 shares, uint256 amount, uint256 timestamp)[])",
  "function updatePrice(string code, uint256 price, uint256 changePct)",
  "event Deposit(address indexed user, uint256 amount)",
  "event Withdraw(address indexed user, uint256 amount)",
  "event BuyStock(address indexed user, string indexed stockCode, uint256 shares, uint256 price, uint256 amount)",
  "event SellStock(address indexed user, string indexed stockCode, uint256 shares, uint256 price, uint256 amount)"
];

// ========== 合约地址 ==========
// 部署后替换
export const CONTRACT_ADDRESSES = {
  USDT: "0x75719fF8bF3e90D817427A707dF6bc965755e554",
  STOCK_MARKET: "0x58f77AfFcD1985C262f8d6448bE8b628452c948c"
};

// 从 deployed-addresses.json 加载
export async function loadDeployedAddresses() {
  try {
    const resp = await fetch("/deployed-addresses.json");
    if (resp.ok) {
      const data = await resp.json();
      CONTRACT_ADDRESSES.USDT = data.usdt || "";
      CONTRACT_ADDRESSES.STOCK_MARKET = data.stockMarket || "";
      return true;
    }
  } catch (e) {}
  return false;
}
