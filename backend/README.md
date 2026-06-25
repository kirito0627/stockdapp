# StockDApp Backend

## 安装
```bash
cd backend
npm install
```

## 配置环境变量

`.env` 文件已预配置，使用 **PublicNode 免费 RPC**（无需注册任何账号）：

```
# 免费公共 Sepolia RPC — 零注册零配置
RPC_URL=https://ethereum-sepolia.publicnode.com

# 部署者私钥（部署到 Sepolia 后填入）
DEPLOYER_PRIVATE_KEY=

# 合约地址（部署到 Sepolia 后填入）
USDT_ADDRESS=
MARKET_ADDRESS=

# 安全密钥（默认即可）
JWT_SECRET=stockdapp-jwt-secret-2024
ENCRYPTION_KEY=stockdapp-secret-key-2024

PORT=3001
```

### 两种运行模式

| 模式 | RPC_URL | 用途 |
|------|---------|------|
| **本地开发** | `http://127.0.0.1:8545` | 需要开 Ganache，用于调试合约逻辑 |
| **公网部署** | `https://ethereum-sepolia.publicnode.com` | 部署到 Railway/Render 等云平台，用户通过网址访问 |

**切换模式：只需改 `.env` 里的一行 `RPC_URL` 即可。**

## 启动
```bash
npm start
```

服务默认运行在 http://localhost:3001

## 部署步骤（公网版）

### 1. 领取 Sepolia 测试 ETH
访问 https://cloud.google.com/application/web3/faucet/ethereum/sepolia 或搜索 "sepolia faucet" 免费领取测试币。

### 2. 部署合约
```bash
npx hardhat run scripts/deploy.js --network sepolia
```
部署成功后将输出的合约地址填入 `.env` 的 `USDT_ADDRESS` 和 `MARKET_ADDRESS`。

### 3. 启动后端 + 前端
- 后端：部署到 Railway / Render（免费）
- 前端：`cd frontend && npm run build` → 部署到 Vercel（免费）

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（自动创建钱包+100万USDT） |
| POST | `/api/auth/login` | 登录（返回 JWT） |
| GET | `/api/account/balance` | 查余额 |
| GET | `/api/account/positions` | 查持仓 |
| GET | `/api/account/trades?limit=N` | 查交易记录 |
| POST | `/api/trade/buy` | 买入股票 |
| POST | `/api/trade/sell` | 卖出股票 |
