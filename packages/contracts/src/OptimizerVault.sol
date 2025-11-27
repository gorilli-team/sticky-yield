// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20, IVault} from "./Interfaces.sol";

/**
 * @title OptimizerVault
 * @dev Yield optimizer vault with optional whitelist mode
 * @notice Can operate in whitelist mode (restricted) or permissionless mode (any pool)
 */
contract OptimizerVault {
    // Constants
    uint256 public constant MAX_BPS = 10_000;
    uint256 public constant PERFORMANCE_FEE_SHARE_BPS = 1_000; // 10%
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    // State variables
    address public immutable OWNER;
    address public immutable ASSET; // Base asset (e.g., USDC)

    bool public whitelistEnabled; // Toggle between whitelist and permissionless mode

    address[] public whitelistedVaults;
    mapping(address => bool) public isWhitelisted;
    mapping(address => uint256) public vaultAllocations; // Amount allocated to each vault

    mapping(address => uint256) public userShares;
    uint256 public totalShares;

    address public feeRecipient;
    uint256 public lastOptimizerApyBps;
    uint256 public lastMarketApyBps;
    uint64 public lastAccrualTimestamp;

    // Events
    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 shares, uint256 assets);
    event Rebalance(address indexed vault, uint256 amount);
    event WhitelistUpdated(address indexed vault, bool allowed);
    event WhitelistModeChanged(bool enabled);
    event FeeRecipientUpdated(address indexed newRecipient);
    event PerformanceFeeAccrued(
        address indexed recipient,
        uint256 feeAssets,
        uint256 feeShares,
        uint256 optimizerApyBps,
        uint256 marketApyBps,
        uint256 elapsed
    );
    event ApyObservationUpdated(uint256 optimizerApyBps, uint256 marketApyBps);

    // Modifiers
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function _checkOwner() internal view {
        require(msg.sender == OWNER, "Not owner");
    }

    /**
     * @dev Update the address that receives performance fee shares
     * @param newRecipient Address that will receive newly minted fee shares
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @dev View helper returning the fee that would be minted for current APY snapshot
     * @param optimizerApyBps APY (basis points) delivered by the optimizer allocations
     * @param marketApyBps TVL-weighted market APY (basis points) for the tracked asset
     */
    function previewPerformanceFee(
        uint256 optimizerApyBps,
        uint256 marketApyBps
    ) external view returns (uint256 feeAssets, uint256 feeShares) {
        return _previewPerformanceFee(optimizerApyBps, marketApyBps);
    }

    /**
     * @dev Accrue and mint performance fee shares based on APY improvement and elapsed time.
     *      Designed to be called by an off-chain keeper whenever fresh APY data is available.
     * @param optimizerApyBps APY (basis points) produced by the optimizer strategy
     * @param marketApyBps TVL-weighted market APY (basis points) for the same asset
     */
    function accruePerformanceFee(
        uint256 optimizerApyBps,
        uint256 marketApyBps
    ) external onlyOwner returns (uint256 feeAssets, uint256 feeShares) {
        (feeAssets, feeShares) = _accruePerformanceFee(
            optimizerApyBps,
            marketApyBps
        );
    }

    /**
     * @dev Constructor
     * @param _asset Base asset token address
     * @param _whitelist Initial list of whitelisted vault addresses
     * @param _whitelistEnabled Whether to enable whitelist mode (true) or permissionless mode (false)
     */
    constructor(address _asset, address[] memory _whitelist, bool _whitelistEnabled) {
        OWNER = msg.sender;
        ASSET = _asset;
        whitelistEnabled = _whitelistEnabled;
        feeRecipient = msg.sender;
        lastAccrualTimestamp = uint64(block.timestamp);

        for (uint256 i = 0; i < _whitelist.length; i++) {
            whitelistedVaults.push(_whitelist[i]);
            isWhitelisted[_whitelist[i]] = true;
        }
    }

    /**
     * @dev Deposit assets into the optimizer vault
     * @param assets Amount of assets to deposit
     * @return shares Number of shares minted
     */
    function deposit(uint256 assets) external returns (uint256 shares) {
        require(assets > 0, "Zero assets");

        // Transfer assets from user
        require(
            IERC20(ASSET).transferFrom(msg.sender, address(this), assets),
            "Transfer failed"
        );

        // Calculate shares (simplified: 1:1 for first deposit)
        if (totalShares == 0) {
            shares = assets;
        } else {
            shares = (assets * totalShares) / totalAssets();
        }

        userShares[msg.sender] += shares;
        totalShares += shares;

        emit Deposit(msg.sender, assets, shares);

        return shares;
    }

    /**
     * @dev Withdraw assets from the optimizer vault
     * @param shares Number of shares to redeem
     * @return assets Amount of assets withdrawn
     */
    function withdraw(uint256 shares) external returns (uint256 assets) {
        require(shares > 0, "Zero shares");
        require(userShares[msg.sender] >= shares, "Insufficient shares");

        // Calculate assets to return
        assets = (shares * totalAssets()) / totalShares;

        userShares[msg.sender] -= shares;
        totalShares -= shares;

        // Transfer assets to user
        require(IERC20(ASSET).transfer(msg.sender, assets), "Transfer failed");

        emit Withdraw(msg.sender, shares, assets);

        return assets;
    }

    /**
     * @dev Reallocate funds to a vault (checks whitelist if enabled)
     * @param vault Target vault address
     * @param amount Amount to allocate
     */
    function reallocate(address vault, uint256 amount) external onlyOwner {
        require(vault != address(0), "Invalid vault address");
        require(amount > 0, "Zero amount");
        
        // Only check whitelist if whitelist mode is enabled
        if (whitelistEnabled) {
            require(isWhitelisted[vault], "Vault not whitelisted");
        }

        // Approve and deposit into target vault
        IERC20(ASSET).approve(vault, amount);
        IVault(vault).deposit(amount, address(this));

        vaultAllocations[vault] += amount;

        emit Rebalance(vault, amount);
    }

    /**
     * @dev Withdraw funds from a vault back to this contract
     * @param vault Source vault address
     * @param amount Amount to withdraw
     */
    function withdrawFromVault(
        address vault,
        uint256 amount
    ) external onlyOwner {
        require(vaultAllocations[vault] >= amount, "Insufficient allocation");

        // Only check whitelist if whitelist mode is enabled
        if (whitelistEnabled) {
            require(isWhitelisted[vault], "Vault not whitelisted");
        }

        IVault(vault).withdraw(amount, address(this), address(this));

        vaultAllocations[vault] -= amount;

        emit Rebalance(vault, 0);
    }

    /**
     * @dev Update whitelist status for a vault
     * @param vault Vault address
     * @param allowed Whether the vault should be whitelisted
     */
    function updateWhitelist(address vault, bool allowed) external onlyOwner {
        if (allowed && !isWhitelisted[vault]) {
            whitelistedVaults.push(vault);
            isWhitelisted[vault] = true;
        } else if (!allowed && isWhitelisted[vault]) {
            // Remove from whitelist (gas inefficient but fine for hackathon)
            for (uint256 i = 0; i < whitelistedVaults.length; i++) {
                if (whitelistedVaults[i] == vault) {
                    whitelistedVaults[i] = whitelistedVaults[
                        whitelistedVaults.length - 1
                    ];
                    whitelistedVaults.pop();
                    break;
                }
            }
            isWhitelisted[vault] = false;
        }

        emit WhitelistUpdated(vault, allowed);
    }

    /**
     * @dev Toggle whitelist mode on/off
     * @param enabled True to enable whitelist mode, false for permissionless mode
     */
    function setWhitelistMode(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistModeChanged(enabled);
    }

    /**
     * @dev Get total assets under management
     * @return Total assets including allocated funds
     */
    function totalAssets() public view returns (uint256) {
        uint256 idle = IERC20(ASSET).balanceOf(address(this));
        uint256 allocated = 0;

        for (uint256 i = 0; i < whitelistedVaults.length; i++) {
            allocated += vaultAllocations[whitelistedVaults[i]];
        }

        return idle + allocated;
    }

    /**
     * @dev Get number of whitelisted vaults
     * @return Number of vaults
     */
    function getWhitelistedVaultsCount() external view returns (uint256) {
        return whitelistedVaults.length;
    }

    /**
     * @dev Get user's asset balance
     * @param user User address
     * @return User's share of total assets
     */
    function balanceOf(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (userShares[user] * totalAssets()) / totalShares;
    }

    /**
     * @dev Internal minting logic for performance fees. Returns accrued assets and shares.
     */
    function _accruePerformanceFee(
        uint256 optimizerApyBps,
        uint256 marketApyBps
    ) internal returns (uint256 feeAssets, uint256 feeShares) {
        uint64 previousAccrual = lastAccrualTimestamp;
        (feeAssets, feeShares) = _previewPerformanceFee(
            optimizerApyBps,
            marketApyBps
        );

        lastOptimizerApyBps = optimizerApyBps;
        lastMarketApyBps = marketApyBps;
        lastAccrualTimestamp = uint64(block.timestamp);

        if (feeShares == 0 || feeRecipient == address(0)) {
            emit ApyObservationUpdated(optimizerApyBps, marketApyBps);
            return (feeAssets, feeShares);
        }

        userShares[feeRecipient] += feeShares;
        totalShares += feeShares;

        emit PerformanceFeeAccrued(
            feeRecipient,
            feeAssets,
            feeShares,
            optimizerApyBps,
            marketApyBps,
            block.timestamp - previousAccrual
        );
        emit ApyObservationUpdated(optimizerApyBps, marketApyBps);
    }

    /**
     * @dev Pure preview helper executed against storage state.
     */
    function _previewPerformanceFee(
        uint256 optimizerApyBps,
        uint256 marketApyBps
    ) internal view returns (uint256 feeAssets, uint256 feeShares) {
        if (
            optimizerApyBps <= marketApyBps ||
            totalShares == 0 ||
            lastAccrualTimestamp == 0
        ) {
            return (0, 0);
        }

        uint256 elapsed = block.timestamp - lastAccrualTimestamp;
        if (elapsed == 0) {
            return (0, 0);
        }

        uint256 improvementBps = optimizerApyBps - marketApyBps;
        uint256 assetsBefore = totalAssets();
        if (assetsBefore == 0) {
            return (0, 0);
        }

        feeAssets =
            (((assetsBefore * improvementBps) / MAX_BPS) *
                PERFORMANCE_FEE_SHARE_BPS *
                elapsed) /
            (MAX_BPS * SECONDS_PER_YEAR);

        if (feeAssets == 0) {
            return (0, 0);
        }

        feeShares = (feeAssets * totalShares) / assetsBefore;
    }
}
