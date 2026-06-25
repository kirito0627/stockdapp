// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @notice 模拟 USDT 代币，用于模拟炒股充值
 */
contract MockUSDT is ERC20 {
    constructor(uint256 initialSupply) ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
