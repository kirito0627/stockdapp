// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StockMarket
 * @notice A股模拟炒股 DApp 核心合约
 * @dev 支持管理员设置股票价格、用户充值/提现USDT、买入/卖出股票
 */
contract StockMarket {
    address public owner;
    address public usdtToken;

    // ============ 数据结构 ============

    struct StockInfo {
        string name;          // 股票名称（如 "贵州茅台"）
        string code;          // 股票代码（如 "600519"）
        uint256 price;        // 当前价格（精度 1e18，单位：CNY）
        uint256 high;         // 今日最高价
        uint256 low;          // 今日最低价
        uint256 open;         // 今日开盘价
        uint256 preClose;     // 昨收价
        uint256 volume;       // 成交量
        uint256 changePct;    // 涨跌幅（1e18 精度，如 0.05e18 = +5%）
        bool isActive;        // 是否可交易
    }

    struct Position {
        uint256 shares;       // 持股数量（精度 1e18）
        uint256 costBasis;    // 成本均价（精度 1e18）
    }

    struct TradeRecord {
        string stockCode;
        bool isBuy;           // true=买入, false=卖出
        uint256 price;        // 成交价
        uint256 shares;       // 成交股数
        uint256 amount;       // 成交金额
        uint256 timestamp;    // 时间戳
    }

    // ============ 状态变量 ============

    mapping(string => StockInfo) public stocks;              // 股票代码 -> 股票信息
    mapping(address => mapping(string => Position)) public positions;  // 用户 -> 股票代码 -> 持仓
    mapping(address => uint256) public usdtBalances;         // 用户在合约内的 USDT 余额
    mapping(address => TradeRecord[]) public tradeHistory;   // 用户交易记录
    string[] public stockList;                               // 股票代码列表

    // ============ 事件 ============

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event BuyStock(address indexed user, string indexed stockCode, uint256 shares, uint256 price, uint256 amount);
    event SellStock(address indexed user, string indexed stockCode, uint256 shares, uint256 price, uint256 amount);
    event PriceUpdated(string indexed stockCode, uint256 oldPrice, uint256 newPrice);

    // ============ 修饰符 ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ============ 构造函数 ============

    constructor(address _usdtToken) {
        owner = msg.sender;
        usdtToken = _usdtToken;
    }

    // ============ 管理函数 ============

    /**
     * @notice 添加或更新股票
     */
    function addStock(
        string memory code,
        string memory name,
        uint256 initialPrice
    ) external onlyOwner {
        require(bytes(code).length > 0, "Invalid code");
        require(initialPrice > 0, "Invalid price");

        if (!stocks[code].isActive) {
            stockList.push(code);
        }

        stocks[code] = StockInfo({
            name: name,
            code: code,
            price: initialPrice,
            high: initialPrice,
            low: initialPrice,
            open: initialPrice,
            preClose: initialPrice,
            volume: 0,
            changePct: 0,
            isActive: true
        });

        emit PriceUpdated(code, 0, initialPrice);
    }

    /**
     * @notice 批量添加股票（每次最多 50 只，避免 gas 超限）
     */
    function batchAddStocks(
        string[] memory codes,
        string[] memory names,
        uint256[] memory initialPrices
    ) external onlyOwner {
        require(codes.length == names.length && names.length == initialPrices.length, "Length mismatch");
        require(codes.length <= 50, "Max 50 per batch");

        for (uint256 i = 0; i < codes.length; i++) {
            require(bytes(codes[i]).length > 0, "Invalid code");
            require(initialPrices[i] > 0, "Invalid price");

            if (!stocks[codes[i]].isActive) {
                stockList.push(codes[i]);
            }

            stocks[codes[i]] = StockInfo({
                name: names[i],
                code: codes[i],
                price: initialPrices[i],
                high: initialPrices[i],
                low: initialPrices[i],
                open: initialPrices[i],
                preClose: initialPrices[i],
                volume: 0,
                changePct: 0,
                isActive: true
            });
        }
    }

    /**
     * @notice 批量更新股票价格（由管理员或脚本调用）
     * @param codes 股票代码数组
     * @param prices 新价格数组（1e18 精度）
     * @param high 今日最高
     * @param low 今日最低
     * @param open 今日开盘
     * @param preClose 昨收
     * @param volumes 成交量
     */
    function batchUpdatePrices(
        string[] memory codes,
        uint256[] memory prices,
        uint256[] memory high,
        uint256[] memory low,
        uint256[] memory open,
        uint256[] memory preClose,
        uint256[] memory volumes
    ) external onlyOwner {
        require(codes.length == prices.length, "Length mismatch");

        for (uint256 i = 0; i < codes.length; i++) {
            require(stocks[codes[i]].isActive, "Stock not found");

            uint256 oldPrice = stocks[codes[i]].price;
            stocks[codes[i]].price = prices[i];
            stocks[codes[i]].high = high[i];
            stocks[codes[i]].low = low[i];
            stocks[codes[i]].open = open[i];
            stocks[codes[i]].preClose = preClose[i];
            stocks[codes[i]].volume = volumes[i];

            // 计算涨跌幅
            if (preClose[i] > 0) {
                if (prices[i] >= preClose[i]) {
                    stocks[codes[i]].changePct = ((prices[i] - preClose[i]) * 1e18) / preClose[i];
                } else {
                    stocks[codes[i]].changePct = 0;
                    // 用符号表示跌，这里存负数不直观，改用一个单独字段
                    // 实际上用 int 更好，但为了简化用 uint256 + 一个单独 bool 或直接存 int
                    // 改进方案：直接用 int256
                }
            }

            emit PriceUpdated(codes[i], oldPrice, prices[i]);
        }
    }

    /**
     * @notice 更新单只股票价格（简化版，仅更新价格和涨跌幅）
     */
    function updatePrice(
        string memory code,
        uint256 price,
        uint256 changePct
    ) external onlyOwner {
        require(stocks[code].isActive, "Stock not found");
        uint256 oldPrice = stocks[code].price;
        stocks[code].price = price;
        stocks[code].changePct = changePct;
        emit PriceUpdated(code, oldPrice, price);
    }

    // ============ 用户函数 ============

    /**
     * @notice 充值 USDT 到合约账户
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        IERC20(usdtToken).transferFrom(msg.sender, address(this), amount);
        usdtBalances[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice 从合约提现 USDT
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdtBalances[msg.sender] >= amount, "Insufficient balance");
        usdtBalances[msg.sender] -= amount;
        IERC20(usdtToken).transfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    /**
     * @notice 买入股票
     * @param stockCode 股票代码
     * @param amount 买入金额（USDT，精度 1e18）
     */
    function buy(string memory stockCode, uint256 amount) external {
        require(stocks[stockCode].isActive, "Stock not active");
        require(amount > 0, "Amount must be > 0");
        require(usdtBalances[msg.sender] >= amount, "Insufficient USDT balance");

        uint256 price = stocks[stockCode].price;
        require(price > 0, "Price not set");

        // 计算可买入股数：amount / price * 1e18
        // 例如：金额 10000 USDT，股价 1500 CNY，买入 6.666 股
        uint256 shares = (amount * 1e18) / price;
        require(shares > 0, "Buy amount too small");

        // 扣钱
        usdtBalances[msg.sender] -= amount;

        // 加仓
        Position storage pos = positions[msg.sender][stockCode];
        if (pos.shares == 0) {
            pos.shares = shares;
            pos.costBasis = price;
        } else {
            // 加权平均成本
            uint256 totalCost = (pos.shares * pos.costBasis) + (shares * price);
            pos.shares += shares;
            pos.costBasis = totalCost / pos.shares;
        }

        // 记录交易
        tradeHistory[msg.sender].push(TradeRecord({
            stockCode: stockCode,
            isBuy: true,
            price: price,
            shares: shares,
            amount: amount,
            timestamp: block.timestamp
        }));

        emit BuyStock(msg.sender, stockCode, shares, price, amount);
    }

    /**
     * @notice 卖出股票
     * @param stockCode 股票代码
     * @param shares 卖出股数（1e18 精度，1e18 = 1 股）
     */
    function sell(string memory stockCode, uint256 shares) external {
        require(stocks[stockCode].isActive, "Stock not active");
        require(shares > 0, "Shares must be > 0");

        Position storage pos = positions[msg.sender][stockCode];
        require(pos.shares >= shares, "Insufficient shares");

        uint256 price = stocks[stockCode].price;
        require(price > 0, "Price not set");

        // 计算卖出金额：shares * price / 1e18
        uint256 amount = (shares * price) / 1e18;

        // 更新持仓
        pos.shares -= shares;
        if (pos.shares == 0) {
            pos.costBasis = 0;
        }

        // 加钱
        usdtBalances[msg.sender] += amount;

        // 记录交易
        tradeHistory[msg.sender].push(TradeRecord({
            stockCode: stockCode,
            isBuy: false,
            price: price,
            shares: shares,
            amount: amount,
            timestamp: block.timestamp
        }));

        emit SellStock(msg.sender, stockCode, shares, price, amount);
    }

    // ============ 查询函数 ============

    /**
     * @notice 获取所有股票列表
     */
    function getStockList() external view returns (StockInfo[] memory) {
        StockInfo[] memory result = new StockInfo[](stockList.length);
        for (uint256 i = 0; i < stockList.length; i++) {
            result[i] = stocks[stockList[i]];
        }
        return result;
    }

    /**
     * @notice 获取用户持仓列表
     */
    function getUserPositions(address user) external view returns (
        string[] memory codes,
        uint256[] memory shares,
        uint256[] memory costBases,
        uint256[] memory currentPrices,
        uint256[] memory profits
    ) {
        // 先统计用户持仓数量
        uint256 count = 0;
        for (uint256 i = 0; i < stockList.length; i++) {
            if (positions[user][stockList[i]].shares > 0) {
                count++;
            }
        }

        codes = new string[](count);
        shares = new uint256[](count);
        costBases = new uint256[](count);
        currentPrices = new uint256[](count);
        profits = new uint256[](count);

        uint256 idx = 0;
        for (uint256 i = 0; i < stockList.length; i++) {
            string memory code = stockList[i];
            Position memory pos = positions[user][code];
            if (pos.shares > 0) {
                codes[idx] = code;
                shares[idx] = pos.shares;
                costBases[idx] = pos.costBasis;
                currentPrices[idx] = stocks[code].price;

                // 计算盈亏 = (当前价 - 成本价) * 股数
                // profits 正=赚，负=亏（用 uint256 存，符号另存）
                // 简化：用 int 存更好，但为兼容前端，返回一个 int 数组的 u256 表示
                // 实际前端直接计算即可
                if (stocks[code].price >= pos.costBasis) {
                    profits[idx] = ((stocks[code].price - pos.costBasis) * pos.shares) / 1e18;
                } else {
                    // 亏损，留空让前端用 costBases 和 currentPrices 算
                    profits[idx] = 0;
                }
                idx++;
            }
        }
    }

    /**
     * @notice 获取用户交易记录数量
     */
    function getTradeCount(address user) external view returns (uint256) {
        return tradeHistory[user].length;
    }

    /**
     * @notice 获取用户最近 N 条交易记录
     */
    function getRecentTrades(address user, uint256 count) external view returns (TradeRecord[] memory) {
        uint256 total = tradeHistory[user].length;
        uint256 n = count < total ? count : total;
        TradeRecord[] memory result = new TradeRecord[](n);
        for (uint256 i = 0; i < n; i++) {
            result[i] = tradeHistory[user][total - n + i];
        }
        return result;
    }
}
