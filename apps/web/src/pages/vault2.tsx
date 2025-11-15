import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import Layout from "@/components/Layout";
import ApyChart from "@/components/ApyChart";
import { getLatestApy } from "@/lib/api";
import {
  VAULT_ADDRESS,
  ASSET_TOKEN,
  VAULT_ABI,
  ERC20_ABI,
  CHAIN_ID,
} from "@/config/contracts";

export default function VaultPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // User balances
  const [tokenBalance, setTokenBalance] = useState("0");
  const [vaultBalance, setVaultBalance] = useState("0");
  const [userShares, setUserShares] = useState("0");
  const [allowance, setAllowance] = useState("0");

  // Best APY pool
  const [bestPool, setBestPool] = useState<any>(null);
  const [vaultTotalAssets, setVaultTotalAssets] = useState("0");
  const [vaultIdleBalance, setVaultIdleBalance] = useState("0");
  const [isVaultOwner, setIsVaultOwner] = useState(false);

  // Fund allocations
  const [allocations, setAllocations] = useState<
    Array<{
      pool: string;
      amount: string;
      balanceBN?: ethers.BigNumber;
      description?: string;
    }>
  >([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

  // Transaction history
  const [transactions, setTransactions] = useState<
    Array<{
      type: "Deposit" | "Withdraw" | "Rebalance";
      user: string;
      amount: string;
      pool?: string;
      timestamp: Date;
      txHash: string;
    }>
  >([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Load user balances and vault info
  const loadBalances = async () => {
    if (!authenticated || wallets.length === 0) return;

    try {
      const wallet = wallets[0];
      await wallet.switchChain(CHAIN_ID);
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const tokenContract = new ethers.Contract(
        ASSET_TOKEN,
        ERC20_ABI,
        provider
      );
      const vaultContract = new ethers.Contract(
        VAULT_ADDRESS,
        VAULT_ABI,
        provider
      );

      const [balance, vBalance, shares, allow, owner, idleBalance] =
        await Promise.all([
          tokenContract.balanceOf(address),
          vaultContract.balanceOf(address),
          vaultContract.userShares(address),
          tokenContract.allowance(address, VAULT_ADDRESS),
          vaultContract.OWNER(),
          tokenContract.balanceOf(VAULT_ADDRESS), // Idle balance in vault
        ]);

      setTokenBalance(ethers.utils.formatUnits(balance, 6)); // Assuming 6 decimals
      setVaultBalance(ethers.utils.formatUnits(vBalance, 6));
      setUserShares(ethers.utils.formatUnits(shares, 6));
      setAllowance(ethers.utils.formatUnits(allow, 6));
      setVaultIdleBalance(ethers.utils.formatUnits(idleBalance, 6));
      setIsVaultOwner(address.toLowerCase() === owner.toLowerCase());
      // Set initial total assets to idle balance (will be updated when allocations load)
      setVaultTotalAssets(ethers.utils.formatUnits(idleBalance, 6));
    } catch (err: any) {
      console.error("Error loading balances:", err);
    }
  };

  // Load best APY pool
  const loadBestPool = async () => {
    try {
      const response = await getLatestApy();
      if (response.success && response.pools) {
        // Filter pools for the asset token and find the one with highest APY
        const tokenPools = response.pools.filter(
          (pool: any) =>
            pool.input_token?.toLowerCase() === ASSET_TOKEN.toLowerCase()
        );

        if (tokenPools.length > 0) {
          // Sort by total_apy descending and get the first one
          const best = tokenPools.sort(
            (a: any, b: any) => (b.total_apy || 0) - (a.total_apy || 0)
          )[0];
          setBestPool(best);
        }
      }
    } catch (err: any) {
      console.error("Error loading best pool:", err);
    }
  };

  // Load fund allocations
  const loadAllocations = async () => {
    if (!authenticated || wallets.length === 0) return;

    setLoadingAllocations(true);
    try {
      const wallet = wallets[0];
      await wallet.switchChain(CHAIN_ID);
      const provider = await wallet.getEthersProvider();

      const vaultContract = new ethers.Contract(
        VAULT_ADDRESS,
        VAULT_ABI,
        provider
      );

      // Get all tracked pools from backend
      const response = await getLatestApy();
      const tokenPools =
        response.pools?.filter(
          (pool: any) =>
            pool.input_token?.toLowerCase() === ASSET_TOKEN.toLowerCase()
        ) || [];

      // Get actual token balances from pool contracts (more accurate than vaultAllocations)
      const tokenContract = new ethers.Contract(
        ASSET_TOKEN,
        ERC20_ABI,
        provider
      );

      // Check actual token balance in each pool contract for the vault address
      const allocationPromises = tokenPools.map(async (pool: any) => {
        try {
          // Method 1: Check if pool is a vault that tracks shares
          // Get vault's shares/balance from the pool vault contract
          let vaultBalanceInPool = ethers.BigNumber.from(0);

          try {
            // Try to get balance using vault interface (most pools use this)
            const poolVaultContract = new ethers.Contract(
              pool.pool_address,
              [
                "function balanceOf(address) external view returns (uint256)",
                "function convertToAssets(uint256) external view returns (uint256)",
                "function totalAssets() external view returns (uint256)",
                "function totalSupply() external view returns (uint256)",
              ],
              provider
            );

            // Get vault's shares in the pool
            const shares = await poolVaultContract.balanceOf(VAULT_ADDRESS);

            if (!shares.isZero()) {
              // Try to convert shares to assets (most accurate)
              try {
                const assets = await poolVaultContract.convertToAssets(shares);
                vaultBalanceInPool = assets;
              } catch {
                // If conversion fails, calculate from total assets and total shares
                try {
                  const [totalAssets, totalShares] = await Promise.all([
                    poolVaultContract.totalAssets(),
                    poolVaultContract.totalSupply(),
                  ]);
                  if (!totalShares.isZero()) {
                    vaultBalanceInPool = totalAssets
                      .mul(shares)
                      .div(totalShares);
                  } else {
                    vaultBalanceInPool = shares; // Use shares as fallback
                  }
                } catch {
                  vaultBalanceInPool = shares; // Use shares as fallback
                }
              }
            }
          } catch (err) {
            // Pool doesn't support vault interface, try ERC20 balance
            // Some pools might hold tokens directly
            try {
              const directBalance = await tokenContract.balanceOf(
                pool.pool_address
              );
              // This is the pool's total balance, not vault's share
              // We can't determine vault's share without pool interface
              vaultBalanceInPool = ethers.BigNumber.from(0);
            } catch {
              vaultBalanceInPool = ethers.BigNumber.from(0);
            }
          }

          // Also check vaultAllocations mapping as fallback/reference
          const allocationMapping = await vaultContract.vaultAllocations(
            pool.pool_address
          );

          // Use the actual balance from pool if available, otherwise use allocation mapping
          const finalBalance = !vaultBalanceInPool.isZero()
            ? vaultBalanceInPool
            : allocationMapping;

          return {
            pool: pool.pool_address,
            amount: ethers.utils.formatUnits(finalBalance, 6),
            balanceBN: finalBalance,
            description: pool.description,
          };
        } catch (err: any) {
          console.error(`Error checking pool ${pool.pool_address}:`, err);
          return {
            pool: pool.pool_address,
            amount: "0",
            balanceBN: ethers.BigNumber.from(0),
            description: pool.description,
          };
        }
      });

      const allAllocations = await Promise.all(allocationPromises);

      // Filter out pools with zero balances
      const allocationsWithData = allAllocations
        .filter((a) => !a.balanceBN.isZero())
        .map((alloc) => ({
          pool: alloc.pool,
          amount: alloc.amount,
          balanceBN: alloc.balanceBN,
          description: alloc.description || "Unknown Pool",
        }));

      setAllocations(allocationsWithData);

      // Calculate total assets = idle balance + sum of allocated funds
      const idleBalanceBN = await tokenContract.balanceOf(VAULT_ADDRESS);
      const totalAllocatedBN = allocationsWithData.reduce(
        (sum, alloc) => sum.add(alloc.balanceBN || ethers.BigNumber.from(0)),
        ethers.BigNumber.from(0)
      );
      const calculatedTotalAssets = idleBalanceBN.add(totalAllocatedBN);
      setVaultTotalAssets(ethers.utils.formatUnits(calculatedTotalAssets, 6));
    } catch (err: any) {
      console.error("Error loading allocations:", err);
    } finally {
      setLoadingAllocations(false);
    }
  };

  // Load transaction history using Hyperscan API
  const loadTransactions = async () => {
    if (!authenticated || wallets.length === 0) return;

    setLoadingTransactions(true);
    try {
      // Function selectors for our contract methods
      const DEPOSIT_SELECTOR = "0xb6b55f25"; // deposit(uint256)
      const WITHDRAW_SELECTOR = "0x2e1a7d4d"; // withdraw(uint256)
      const REALLOCATE_SELECTOR = "0xec1a6438"; // reallocate(address,uint256)

      // Fetch transactions from Hyperscan API
      const apiUrl = `https://www.hyperscan.com/api?module=account&action=txlist&address=${VAULT_ADDRESS}&startblock=0&endblock=99999999&sort=asc`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status !== "1" || !data.result) {
        console.error("Hyperscan API error:", data);
        setTransactions([]);
        return;
      }

      const txList: any[] = [];

      // Process each transaction
      for (const tx of data.result) {
        // Skip contract creation transaction
        if (!tx.to || tx.to.toLowerCase() !== VAULT_ADDRESS.toLowerCase()) {
          continue;
        }

        // Skip failed transactions
        if (tx.isError === "1") {
          continue;
        }

        const methodId = tx.input.slice(0, 10).toLowerCase();
        const timestamp = new Date(parseInt(tx.timeStamp) * 1000);

        // Parse deposit transactions
        if (methodId === DEPOSIT_SELECTOR) {
          try {
            // Decode: deposit(uint256 assets)
            const iface = new ethers.utils.Interface([
              "function deposit(uint256 assets) external returns (uint256 shares)",
            ]);
            const decoded = iface.decodeFunctionData("deposit", tx.input);
            const amount = ethers.utils.formatUnits(decoded.assets, 6);

            txList.push({
              type: "Deposit" as const,
              user: tx.from,
              amount: parseFloat(amount).toFixed(6),
              timestamp: timestamp,
              txHash: tx.hash,
              blockNumber: parseInt(tx.blockNumber),
            });
          } catch (err) {
            console.error("Error decoding deposit:", err);
          }
        }
        // Parse withdraw transactions
        else if (methodId === WITHDRAW_SELECTOR) {
          try {
            // Decode: withdraw(uint256 shares)
            const iface = new ethers.utils.Interface([
              "function withdraw(uint256 shares) external returns (uint256 assets)",
            ]);
            const decoded = iface.decodeFunctionData("withdraw", tx.input);
            const amount = ethers.utils.formatUnits(decoded.shares, 6);

            txList.push({
              type: "Withdraw" as const,
              user: tx.from,
              amount: parseFloat(amount).toFixed(6),
              timestamp: timestamp,
              txHash: tx.hash,
              blockNumber: parseInt(tx.blockNumber),
            });
          } catch (err) {
            console.error("Error decoding withdraw:", err);
          }
        }
        // Parse reallocate transactions
        else if (methodId === REALLOCATE_SELECTOR) {
          try {
            // Decode: reallocate(address vault, uint256 amount)
            const iface = new ethers.utils.Interface([
              "function reallocate(address vault, uint256 amount) external",
            ]);
            const decoded = iface.decodeFunctionData("reallocate", tx.input);
            const amount = ethers.utils.formatUnits(decoded.amount, 6);

            txList.push({
              type: "Rebalance" as const,
              user: tx.from,
              pool: decoded.vault,
              amount: parseFloat(amount).toFixed(6),
              timestamp: timestamp,
              txHash: tx.hash,
              blockNumber: parseInt(tx.blockNumber),
            });
          } catch (err) {
            console.error("Error decoding reallocate:", err);
          }
        }
      }

      // Sort by block number (newest first)
      txList.sort((a, b) => {
        return b.blockNumber - a.blockNumber;
      });

      console.log(`Loaded ${txList.length} transactions from Hyperscan API`);

      // Limit to last 50 transactions
      setTransactions(txList.slice(0, 50));
    } catch (err: any) {
      console.error("Error loading transactions:", err);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      loadBalances();
      loadAllocations();
      loadTransactions();
    }
    loadBestPool();
    // Refresh best pool every 30 seconds
    const interval = setInterval(loadBestPool, 30000);
    return () => clearInterval(interval);
  }, [authenticated, wallets]);

  const handleApprove = async () => {
    if (!authenticated) {
      login();
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const wallet = wallets[0];
      await wallet.switchChain(CHAIN_ID);
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();

      const tokenContract = new ethers.Contract(ASSET_TOKEN, ERC20_ABI, signer);

      // Approve max amount for convenience
      const maxAmount = ethers.constants.MaxUint256;
      const tx = await tokenContract.approve(VAULT_ADDRESS, maxAmount);

      setSuccess("Approval transaction sent! Waiting for confirmation...");
      await tx.wait();

      setSuccess("✅ Approval successful! You can now deposit.");
      await loadBalances();
    } catch (err: any) {
      console.error("Approval error:", err);
      setError(err.message || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const wallet = wallets[0];
      await wallet.switchChain(CHAIN_ID);
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();

      const vaultContract = new ethers.Contract(
        VAULT_ADDRESS,
        VAULT_ABI,
        signer
      );

      const amount = ethers.utils.parseUnits(depositAmount, 6); // Assuming 6 decimals
      const tx = await vaultContract.deposit(amount);

      setSuccess("Deposit transaction sent! Waiting for confirmation...");
      await tx.wait();

      setSuccess("✅ Deposit successful!");
      setDepositAmount("");
      await loadBalances();
      await loadAllocations();
      await loadTransactions();

      // After deposit, show info about best pool
      await loadBestPool();
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReallocateToBestPool = async () => {
    if (!authenticated || !isVaultOwner) {
      setError("Only vault owner can reallocate funds");
      return;
    }

    if (!bestPool) {
      setError("No best pool found");
      return;
    }

    if (parseFloat(vaultIdleBalance) === 0) {
      setError(
        "No idle funds in vault to reallocate. All funds may already be allocated to pools."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const wallet = wallets[0];
      await wallet.switchChain(CHAIN_ID);
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();

      const vaultContract = new ethers.Contract(
        VAULT_ADDRESS,
        [
          ...VAULT_ABI,
          "function reallocate(address vault, uint256 amount) external",
        ],
        signer
      );

      // Get the actual idle balance (tokens in the contract, not allocated)
      const tokenContract = new ethers.Contract(
        ASSET_TOKEN,
        ERC20_ABI,
        provider
      );
      const idleBalance = await tokenContract.balanceOf(VAULT_ADDRESS);

      // Use a smaller buffer (0.1 tokens) or no buffer if balance is small
      const buffer = idleBalance.gt(ethers.utils.parseUnits("1", 6))
        ? ethers.utils.parseUnits("0.1", 6) // 0.1 token buffer if balance > 1
        : ethers.BigNumber.from(0); // No buffer if balance is small

      const amountToReallocate = idleBalance.gt(buffer)
        ? idleBalance.sub(buffer)
        : idleBalance; // Use all if balance is very small

      if (amountToReallocate.lte(0) || idleBalance.eq(0)) {
        const idleFormatted = ethers.utils.formatUnits(idleBalance, 6);
        setError(
          `No idle funds available to reallocate. Idle balance: ${parseFloat(
            idleFormatted
          ).toFixed(6)} tokens. Funds may already be allocated to pools.`
        );
        setLoading(false);
        return;
      }

      const tx = await vaultContract.reallocate(
        bestPool.pool_address,
        amountToReallocate
      );

      setSuccess(
        `Reallocation transaction sent! Moving funds to ${
          bestPool.description
        } (${bestPool.total_apy.toFixed(2)}% APY)...`
      );
      await tx.wait();

      setSuccess(
        `✅ Successfully reallocated to ${
          bestPool.description
        } (${bestPool.total_apy.toFixed(2)}% APY)!`
      );
      await loadBalances();
      await loadAllocations();
      await loadTransactions();
    } catch (err: any) {
      console.error("Reallocation error:", err);
      setError(err.message || "Reallocation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!withdrawShares || parseFloat(withdrawShares) <= 0) {
      setError("Please enter a valid amount of shares");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const wallet = wallets[0];
      await wallet.switchChain(CHAIN_ID);
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();

      const vaultContract = new ethers.Contract(
        VAULT_ADDRESS,
        VAULT_ABI,
        signer
      );

      const shares = ethers.utils.parseUnits(withdrawShares, 6); // Assuming 6 decimals
      const tx = await vaultContract.withdraw(shares);

      setSuccess("Withdraw transaction sent! Waiting for confirmation...");
      await tx.wait();

      setSuccess("✅ Withdrawal successful!");
      setWithdrawShares("");
      await loadBalances();
      await loadAllocations();
      await loadTransactions();
    } catch (err: any) {
      console.error("Withdraw error:", err);
      setError(err.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatNumber = (value: string, decimals: number = 2) => {
    const num = parseFloat(value);
    if (num === 0) return "0";
    if (num < 0.01 && num > 0) return "<0.01";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <Layout>
      <div className="vault-page-container">
        <div className="vault-header-section">
          <div className="vault-title">
            <p className="vault-subtitle">USD₮0 Yield Vault </p>
          </div>
        </div>

        {!authenticated ? (
          <div className="connect-wallet-card">
            <h2>Connect Your Wallet</h2>
            <p>
              Connect your wallet to deposit into the vault and start earning
              yields.
            </p>
            <button onClick={login} className="btn-primary">
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="vault-content">
            {/* Left Side - Vault Information */}
            <div className="vault-left">
              {/* Vault Stats */}
              <div className="vault-stats-card">
                <h2>Vault Overview</h2>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">Total Assets</div>
                    <div className="stat-value">
                      ${formatNumber(vaultTotalAssets)}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Best APY</div>
                    <div className="stat-value">
                      {bestPool
                        ? `${bestPool.total_apy?.toFixed(2) || "0"}%`
                        : "Loading..."}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Idle Balance</div>
                    <div className="stat-value">
                      ${formatNumber(vaultIdleBalance)}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Active Pools</div>
                    <div className="stat-value">{allocations.length}</div>
                  </div>
                </div>
              </div>

              {/* Fund Allocations */}
              <div className="vault-section-card">
                <div className="section-header">
                  <h3>Fund Allocations</h3>
                  {isVaultOwner &&
                    bestPool &&
                    parseFloat(vaultIdleBalance) > 0 && (
                      <button
                        onClick={handleReallocateToBestPool}
                        disabled={loading}
                        className="btn-secondary btn-small"
                      >
                        {loading ? "Reallocating..." : "Optimize Allocation"}
                      </button>
                    )}
                </div>
                {loadingAllocations ? (
                  <div className="loading-state">Loading allocations...</div>
                ) : (
                  <div className="allocations-table">
                    {/* Show idle funds first */}
                    {parseFloat(vaultIdleBalance) > 0 && (
                      <div className="allocation-row allocation-idle">
                        <div className="allocation-info">
                          <div className="allocation-name">
                            Idle Funds (Vault)
                          </div>
                          <div className="allocation-address">
                            {formatAddress(VAULT_ADDRESS)}
                          </div>
                        </div>
                        <div className="allocation-amount">
                          ${formatNumber(vaultIdleBalance)}
                        </div>
                      </div>
                    )}
                    {/* Show pool allocations */}
                    {allocations.length === 0
                      ? parseFloat(vaultIdleBalance) === 0 && (
                          <div className="empty-state">
                            No funds allocated to pools yet.
                          </div>
                        )
                      : allocations.map((alloc, index) => (
                          <div key={index} className="allocation-row">
                            <div className="allocation-info">
                              <div className="allocation-name">
                                {alloc.description}
                              </div>
                              <div className="allocation-address">
                                {formatAddress(alloc.pool)}
                              </div>
                            </div>
                            <div className="allocation-amount">
                              ${formatNumber(alloc.amount)}
                            </div>
                          </div>
                        ))}
                  </div>
                )}
              </div>

              {/* APY Chart */}
              <div className="vault-section-card">
                <ApyChart />
              </div>

              {/* Transaction History */}
              <div className="vault-section-card">
                <h3>Recent Transactions</h3>
                {loadingTransactions ? (
                  <div className="loading-state">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                  <div className="empty-state">No transactions yet</div>
                ) : (
                  <div className="transactions-table">
                    {transactions.slice(0, 10).map((tx, index) => (
                      <div key={index} className="transaction-row">
                        <div className="transaction-info">
                          <span
                            className={`tx-type tx-${tx.type.toLowerCase()}`}
                          >
                            {tx.type}
                          </span>
                          <span className="tx-amount">
                            ${formatNumber(tx.amount)}
                          </span>
                          <span className="tx-time">
                            {tx.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                        <a
                          href={`https://www.hyperscan.com/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tx-link"
                        >
                          ↗
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contract Info */}
              <div className="vault-section-card">
                <h3>Contract Details</h3>
                <div className="contract-info">
                  <div className="info-row">
                    <span className="info-label">Vault Address</span>
                    <span className="info-value monospace">
                      {formatAddress(VAULT_ADDRESS)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Asset Token</span>
                    <span className="info-value monospace">
                      {formatAddress(ASSET_TOKEN)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Network</span>
                    <span className="info-value">HyperEVM (Chain ID: 999)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - User Interactions */}
            <div className="vault-right">
              {/* Best Pool Card */}
              {bestPool && (
                <div className="best-pool-card">
                  <div className="best-pool-header">
                    <h4>Current Best Pool</h4>
                    <span className="best-apy">
                      {bestPool.total_apy?.toFixed(2) || "0"}% APY
                    </span>
                  </div>
                  <p className="best-pool-name">{bestPool.description}</p>
                  {bestPool.url && (
                    <a
                      href={bestPool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pool-link"
                    >
                      View Pool Details ↗
                    </a>
                  )}
                </div>
              )}
              {/* User Balances */}
              <div className="user-balances-card">
                <h3>Your Balances</h3>
                <div className="balance-grid">
                  <div className="balance-item">
                    <span className="balance-label">Wallet Balance</span>
                    <span className="balance-value">
                      {formatNumber(tokenBalance, 4)} USD₮0
                    </span>
                  </div>
                  <div className="balance-item">
                    <span className="balance-label">Deposited</span>
                    <span className="balance-value">
                      {formatNumber(vaultBalance, 4)} USD₮0
                    </span>
                  </div>
                  <div className="balance-item">
                    <span className="balance-label">Shares</span>
                    <span className="balance-value">
                      {formatNumber(userShares, 4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              {/* Deposit/Withdraw Tabs */}
              <div className="action-tabs">
                <button
                  className={`tab ${activeTab === "deposit" ? "active" : ""}`}
                  onClick={() => setActiveTab("deposit")}
                >
                  Deposit
                </button>
                <button
                  className={`tab ${activeTab === "withdraw" ? "active" : ""}`}
                  onClick={() => setActiveTab("withdraw")}
                  disabled={parseFloat(userShares) === 0}
                >
                  Withdraw
                </button>
              </div>

              {/* Deposit Tab Content */}
              {activeTab === "deposit" && (
                <div className="action-card">
                  {parseFloat(allowance) === 0 ? (
                    <div className="approval-section">
                      <p className="approval-notice">
                        You need to approve the vault to use your USD₮0 tokens.
                      </p>
                      <button
                        onClick={handleApprove}
                        disabled={loading}
                        className="btn-primary btn-large"
                      >
                        {loading ? "Approving..." : "Approve USD₮0"}
                      </button>
                    </div>
                  ) : (
                    <div className="deposit-section">
                      <div className="input-group">
                        <div className="input-with-max">
                          <input
                            id="deposit-amount"
                            type="number"
                            placeholder="0.00"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            disabled={loading}
                            step="0.000001"
                            min="0"
                          />
                          <button
                            onClick={() => setDepositAmount(tokenBalance)}
                            className="max-button"
                            disabled={loading}
                          >
                            MAX
                          </button>
                        </div>
                        <span className="input-helper">
                          Balance: {formatNumber(tokenBalance, 4)} USD₮0
                        </span>
                      </div>
                      <button
                        onClick={handleDeposit}
                        disabled={
                          loading ||
                          !depositAmount ||
                          parseFloat(depositAmount) <= 0
                        }
                        className="btn-primary btn-large"
                      >
                        {loading ? "Depositing..." : "Deposit USD₮0"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Withdraw Tab Content */}
              {activeTab === "withdraw" && (
                <div className="action-card">
                  <div className="withdraw-section">
                    <div className="input-group">
                      <div className="input-with-max">
                        <input
                          id="withdraw-amount"
                          type="number"
                          placeholder="0.00"
                          value={withdrawShares}
                          onChange={(e) => setWithdrawShares(e.target.value)}
                          disabled={loading}
                          step="0.000001"
                          min="0"
                        />
                        <button
                          onClick={() => setWithdrawShares(userShares)}
                          className="max-button"
                          disabled={loading}
                        >
                          MAX
                        </button>
                      </div>
                      <span className="input-helper">
                        Available: {formatNumber(userShares, 4)} shares
                      </span>
                    </div>
                    <button
                      onClick={handleWithdraw}
                      disabled={
                        loading ||
                        !withdrawShares ||
                        parseFloat(withdrawShares) <= 0
                      }
                      className="btn-primary btn-large"
                    >
                      {loading ? "Withdrawing..." : "Withdraw"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
