// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OptimizerVault.sol";
import "../src/Interfaces.sol";

/**
 * @title MockERC20
 * @dev Mock ERC20 token for testing
 */
contract MockERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(
        address account
    ) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(
        address to,
        uint256 amount
    ) external override returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external override returns (bool) {
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        return true;
    }
}

/**
 * @title OptimizerVaultTest
 * @dev Test suite for OptimizerVault
 */
contract OptimizerVaultTest is Test {
    OptimizerVault public vault;
    MockERC20 public token;

    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    address public mockVault1 = address(4);
    address public mockVault2 = address(5);

    function setUp() public {
        vm.startPrank(owner);

        token = new MockERC20();

        address[] memory whitelist = new address[](2);
        whitelist[0] = mockVault1;
        whitelist[1] = mockVault2;

        vault = new OptimizerVault(address(token), whitelist);

        vm.stopPrank();

        // Mint tokens to users
        token.mint(user1, 1000e18);
        token.mint(user2, 1000e18);
    }

    function testDeposit() public {
        vm.startPrank(user1);

        uint256 depositAmount = 100e18;
        token.approve(address(vault), depositAmount);

        uint256 shares = vault.deposit(depositAmount);

        assertEq(shares, depositAmount);
        assertEq(vault.userShares(user1), depositAmount);
        assertEq(vault.totalShares(), depositAmount);

        vm.stopPrank();
    }

    function testWhitelistUpdate() public {
        vm.startPrank(owner);

        address newVault = address(6);
        vault.updateWhitelist(newVault, true);

        assertTrue(vault.isWhitelisted(newVault));
        assertEq(vault.getWhitelistedVaultsCount(), 3);

        vm.stopPrank();
    }

    function testOnlyOwnerCanUpdateWhitelist() public {
        vm.startPrank(user1);

        vm.expectRevert("Not owner");
        vault.updateWhitelist(address(6), true);

        vm.stopPrank();
    }
}
