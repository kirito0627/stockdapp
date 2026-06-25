import { ethers } from 'ethers';

// ============ 配置 ============
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';

// 合约地址 — 部署后自动填充或手动配置
const USDT_ADDRESS = process.env.USDT_ADDRESS || '';
const MARKET_ADDRESS = process.env.MARKET_ADDRESS || '';

// ABI（精简版，只含后端需要的函数）
const ERC20_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const MARKET_ABI = [
  'function addStock(string code, string name, uint256 initialPrice) external',
  'function updatePrice(string code, uint256 price, uint256 changePct) external',
  'function buy(string stockCode, uint256 amount) external',
  'function sell(string stockCode, uint256 shares) external',
  'function deposit(uint256 amount) external',
  'function usdtBalances(address) view returns (uint256)',
  'function stocks(string) view returns (string name, string code, uint256 price, uint256 high, uint256 low, uint256 open, uint256 preClose, uint256 volume, uint256 changePct, bool isActive)',
  'function getUserPositions(address) view returns (string[] codes, uint256[] shares, uint256[] costBases, uint256[] currentPrices, uint256[] profits)',
  'function getTradeCount(address) view returns (uint256)',
  'function getRecentTrades(address, uint256) view returns (tuple(string stockCode, bool isBuy, uint256 price, uint256 shares, uint256 amount, uint256 timestamp)[])',
  'function getStockList() view returns (tuple(string name, string code, uint256 price, uint256 high, uint256 low, uint256 open, uint256 preClose, uint256 volume, uint256 changePct, bool isActive)[])',
  'function owner() view returns (address)',
];

let provider;
let deployerWallet;
let usdtContract;
let marketContract;

export async function initContracts() {
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);

    if (DEPLOYER_PRIVATE_KEY) {
      deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
      console.log('Deployer wallet:', deployerWallet.address);
    } else {
      // Ganache 本地模式：用第一个账户（需要 provider 支持 eth_accounts）
      try {
        const accounts = await provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          deployerWallet = await provider.getSigner(accounts[0]);
          console.log('Using first Ganache account as deployer:', accounts[0]);
        } else {
          console.warn('No accounts available from RPC');
        }
      } catch (e) {
        console.warn('RPC eth_accounts not available (expected on public RPC):', e.message);
        console.warn('Virtual balance mode does not need on-chain contracts.');
      }
    }

    if (USDT_ADDRESS) {
      usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, deployerWallet || provider);
    }
    if (MARKET_ADDRESS) {
      marketContract = new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, deployerWallet || provider);
    }

    console.log('Contracts initialized.');
    console.log('  RPC_URL:', RPC_URL);
    console.log('  USDT:', USDT_ADDRESS || '(not set, using virtual balance)');
    console.log('  MARKET:', MARKET_ADDRESS || '(not set, using virtual balance)');
  } catch (e) {
    console.warn('Contracts init failed (non-critical, virtual balance mode):', e.message);
  }
}

export function getProvider() { return provider; }
export function getDeployer() { return deployerWallet; }
export function getUSDT() { return usdtContract; }
export function getMarket() { return marketContract; }

// 为用户创建钱包（从私钥恢复）
export function getUserWallet(encryptedPrivateKey, decryptFn) {
  const privateKey = decryptFn(encryptedPrivateKey);
  return new ethers.Wallet(privateKey, provider);
}

// 简单的私钥加密/解密（XOR，仅用于演示，生产环境应使用更安全的方案）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'stockdapp-secret-key-2024';

export function encryptPrivateKey(privateKey) {
  const key = ENCRYPTION_KEY;
  let result = '';
  for (let i = 0; i < privateKey.length; i++) {
    result += String.fromCharCode(privateKey.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(result, 'binary').toString('base64');
}

export function decryptPrivateKey(encrypted) {
  const key = ENCRYPTION_KEY;
  const decoded = Buffer.from(encrypted, 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// 为新用户创建钱包（纯本地，不再铸币）
export async function createUserWallet() {
  const wallet = ethers.Wallet.createRandom();
  const encryptedKey = encryptPrivateKey(wallet.privateKey);
  return {
    address: wallet.address,
    encryptedPrivateKey: encryptedKey,
  };
}

// 用用户钱包操作合约
export function getMarketForUser(userWallet) {
  return new ethers.Contract(MARKET_ADDRESS, MARKET_ABI, userWallet);
}

export function getUSDTForUser(userWallet) {
  return new ethers.Contract(USDT_ADDRESS, ERC20_ABI, userWallet);
}
