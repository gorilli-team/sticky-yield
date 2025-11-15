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
    Array<{ pool: string; amount: string; description?: string }>
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

      const [
        balance,
        vBalance,
        shares,
        allow,
        totalAssets,
        owner,
        idleBalance,
      ] = await Promise.all([
        tokenContract.balanceOf(address),
        vaultContract.balanceOf(address),
        vaultContract.userShares(address),
        tokenContract.allowance(address, VAULT_ADDRESS),
        vaultContract.totalAssets(),
        vaultContract.OWNER(),
        tokenContract.balanceOf(VAULT_ADDRESS), // Idle balance in vault
      ]);

      setTokenBalance(ethers.utils.formatUnits(balance, 6)); // Assuming 6 decimals
      setVaultBalance(ethers.utils.formatUnits(vBalance, 6));
      setUserShares(ethers.utils.formatUnits(shares, 6));
      setAllowance(ethers.utils.formatUnits(allow, 6));
      setVaultTotalAssets(ethers.utils.formatUnits(totalAssets, 6));
      setVaultIdleBalance(ethers.utils.formatUnits(idleBalance, 6));
      setIsVaultOwner(address.toLowerCase() === owner.toLowerCase());
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
          description: alloc.description || "Unknown Pool",
        }));

      setAllocations(allocationsWithData);
    } catch (err: any) {
      console.error("Error loading allocations:", err);
    } finally {
      setLoadingAllocations(false);
    }
  };

  // Load transaction history
  const loadTransactions = async () => {
    if (!authenticated || wallets.length === 0) return;

    setLoadingTransactions(true);
    try {
      const wallet = wallets[0];
      await wallet.switchChain(CHAIN_ID);
      const provider = await wallet.getEthersProvider();

      const vaultContract = new ethers.Contract(
        VAULT_ADDRESS,
        VAULT_ABI,
        provider
      );

      // Get contract creation block by trying to find when code was first deployed
      const currentBlock = await provider.getBlockNumber();
      let fromBlock = 0;

      // Try to find contract creation block by checking code existence
      // Start from a reasonable early block and work backwards
      try {
        // Check if we can get contract creation info
        // For HyperEVM, try querying from a large range
        // Most chains have reasonable block ranges, so use last 100k blocks
        fromBlock = Math.max(0, currentBlock - 100000);
      } catch {
        fromBlock = 0; // Fallback to genesis
      }

      console.log(
        `Querying transactions from block ${fromBlock} to ${currentBlock}`
      );

      // Fetch all events with error handling
      let depositEvents: any[] = [];
      let withdrawEvents: any[] = [];
      let rebalanceEvents: any[] = [];

      try {
        [depositEvents, withdrawEvents, rebalanceEvents] = await Promise.all([
          vaultContract.queryFilter(
            vaultContract.filters.Deposit(),
            fromBlock,
            currentBlock
          ),
          vaultContract.queryFilter(
            vaultContract.filters.Withdraw(),
            fromBlock,
            currentBlock
          ),
          vaultContract.queryFilter(
            vaultContract.filters.Rebalance(),
            fromBlock,
            currentBlock
          ),
        ]);
        console.log(
          `Found ${depositEvents.length} deposits, ${withdrawEvents.length} withdrawals, ${rebalanceEvents.length} rebalances`
        );
      } catch (err: any) {
        console.error("Error querying events, trying smaller range:", err);
        // If query fails, try a smaller range
        const smallerFromBlock = Math.max(0, currentBlock - 10000);
        [depositEvents, withdrawEvents, rebalanceEvents] = await Promise.all([
          vaultContract.queryFilter(
            vaultContract.filters.Deposit(),
            smallerFromBlock,
            currentBlock
          ),
          vaultContract.queryFilter(
            vaultContract.filters.Withdraw(),
            smallerFromBlock,
            currentBlock
          ),
          vaultContract.queryFilter(
            vaultContract.filters.Rebalance(),
            smallerFromBlock,
            currentBlock
          ),
        ]);
      }

      // Transform events to transaction format
      const txList: any[] = [];

      // Process deposit events
      for (const event of depositEvents) {
        const block = await provider.getBlock(event.blockNumber);
        txList.push({
          type: "Deposit" as const,
          user: event.args?.user || "",
          amount: ethers.utils.formatUnits(event.args?.assets || 0, 6),
          timestamp: new Date(block.timestamp * 1000),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      }

      // Process withdraw events
      for (const event of withdrawEvents) {
        const block = await provider.getBlock(event.blockNumber);
        txList.push({
          type: "Withdraw" as const,
          user: event.args?.user || "",
          amount: ethers.utils.formatUnits(event.args?.assets || 0, 6),
          timestamp: new Date(block.timestamp * 1000),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      }

      // Process rebalance events
      for (const event of rebalanceEvents) {
        const block = await provider.getBlock(event.blockNumber);
        txList.push({
          type: "Rebalance" as const,
          user: "", // Rebalance doesn't have user
          pool: event.args?.vault || "",
          amount: ethers.utils.formatUnits(event.args?.amount || 0, 6),
          timestamp: new Date(block.timestamp * 1000),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      }

      // Sort by block number (newest first)
      txList.sort((a, b) => {
        return b.blockNumber - a.blockNumber;
      });

      // Limit to last 50 transactions
      setTransactions(txList.slice(0, 50));
    } catch (err: any) {
      console.error("Error loading transactions:", err);
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

  return (
    <Layout>
      <div className="vault-page">
        <div className="vault-header">
          <button onClick={() => router.push("/")} className="back-button">
            ← Back to Yields
          </button>
          <h1>Vault Deposit</h1>
          <p className="vault-subtitle">
            Deposit USD₮0 tokens to earn optimized yields
          </p>
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
          <>
            {/* User Balances */}
            <div className="balances-grid">
              <div className="balance-card">
                <div className="balance-label">Your Wallet Balance</div>
                <div className="balance-value">
                  {parseFloat(tokenBalance).toFixed(2)} USD₮0
                </div>
              </div>
              <div className="balance-card">
                <div className="balance-label">Your Vault Balance</div>
                <div className="balance-value">
                  {parseFloat(vaultBalance).toFixed(2)} USD₮0
                </div>
              </div>
              <div className="balance-card">
                <div className="balance-label">Your Shares</div>
                <div className="balance-value">
                  {parseFloat(userShares).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Deposit Section */}
            <div className="action-card">
              <h2>Deposit Tokens</h2>
              <p className="action-description">
                Deposit your USD₮0 tokens into the vault to start earning
                yields.
              </p>

              {parseFloat(allowance) === 0 ? (
                <div className="approval-section">
                  <p className="approval-notice">
                    ⚠️ You need to approve the vault to spend your tokens first.
                  </p>
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "Approving..." : "Approve Vault"}
                  </button>
                </div>
              ) : (
                <div className="deposit-section">
                  <div className="input-group">
                    <input
                      type="number"
                      placeholder="Amount to deposit"
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
                  <button
                    onClick={handleDeposit}
                    disabled={
                      loading ||
                      !depositAmount ||
                      parseFloat(depositAmount) <= 0
                    }
                    className="btn-primary"
                  >
                    {loading ? "Depositing..." : "Deposit"}
                  </button>
                </div>
              )}
            </div>

            {/* Withdraw Section */}
            {parseFloat(userShares) > 0 && (
              <div className="action-card">
                <h2>Withdraw Tokens</h2>
                <p className="action-description">
                  Withdraw your tokens from the vault by burning your shares.
                </p>
                <div className="input-group">
                  <input
                    type="number"
                    placeholder="Shares to withdraw"
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
                <button
                  onClick={handleWithdraw}
                  disabled={
                    loading ||
                    !withdrawShares ||
                    parseFloat(withdrawShares) <= 0
                  }
                  className="btn-secondary"
                >
                  {loading ? "Withdrawing..." : "Withdraw"}
                </button>
              </div>
            )}

            {/* Best Pool Info */}
            {bestPool && (
              <div className="action-card best-pool-card">
                <div className="best-pool-header">
                  <h2>Best APY Pool</h2>
                  <div className="best-pool-badge">
                    {bestPool.total_apy?.toFixed(2) || "0.00"}% APY
                  </div>
                </div>
                <div className="best-pool-info">
                  <div className="info-row">
                    <span>Pool:</span>
                    <span>{bestPool.description || "Unknown"}</span>
                  </div>
                  <div className="info-row">
                    <span>Address:</span>
                    <span className="monospace">{bestPool.pool_address}</span>
                  </div>
                  {bestPool.url && (
                    <div className="info-row">
                      <span>URL:</span>
                      <a
                        href={bestPool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pool-link"
                      >
                        View Pool →
                      </a>
                    </div>
                  )}
                </div>
                {isVaultOwner && (
                  <div className="reallocate-section">
                    <p className="action-description">
                      Reallocate vault idle funds to the best APY pool for
                      optimal yields.
                      {parseFloat(vaultIdleBalance) > 0 ? (
                        <span
                          style={{
                            display: "block",
                            marginTop: "0.5rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Idle balance:{" "}
                          {parseFloat(vaultIdleBalance).toFixed(6)} tokens
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "block",
                            marginTop: "0.5rem",
                            color: "var(--secondary)",
                          }}
                        >
                          No idle funds available. All funds are already
                          allocated.
                        </span>
                      )}
                    </p>
                    <button
                      onClick={handleReallocateToBestPool}
                      disabled={loading || parseFloat(vaultIdleBalance) === 0}
                      className="btn-primary"
                    >
                      {loading
                        ? "Reallocating..."
                        : `Reallocate to Best Pool (${bestPool.total_apy?.toFixed(
                            2
                          )}% APY)`}
                    </button>
                  </div>
                )}
                {!isVaultOwner && (
                  <p
                    className="action-description"
                    style={{ marginTop: "1rem" }}
                  >
                    Only the vault owner can reallocate funds. Your deposits
                    will be allocated to the best pool by the owner.
                  </p>
                )}
              </div>
            )}

            {/* Fund Allocations */}
            <div className="action-card">
              <h2>Fund Allocations</h2>
              <p className="action-description">
                Current distribution of vault funds across pools
              </p>
              {loadingAllocations ? (
                <div className="loading-state">Loading allocations...</div>
              ) : allocations.length === 0 ? (
                <div className="empty-state">
                  No funds allocated to pools yet. All funds are idle in the
                  vault.
                </div>
              ) : (
                <div className="allocations-list">
                  {allocations.map((alloc, index) => (
                    <div key={index} className="allocation-item">
                      <div className="allocation-header">
                        <div className="allocation-pool">
                          <span className="allocation-label">Pool:</span>
                          <span className="allocation-name">
                            {alloc.description}
                          </span>
                        </div>
                        <div className="allocation-amount">
                          {parseFloat(alloc.amount).toFixed(6)} tokens
                        </div>
                      </div>
                      <div className="allocation-address">
                        <span className="monospace">{alloc.pool}</span>
                      </div>
                    </div>
                  ))}
                  <div className="allocation-summary">
                    <div className="summary-row">
                      <span>Total Allocated:</span>
                      <span>
                        {allocations
                          .reduce((sum, a) => sum + parseFloat(a.amount), 0)
                          .toFixed(6)}{" "}
                        tokens
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>Idle Balance:</span>
                      <span>
                        {parseFloat(vaultIdleBalance).toFixed(6)} tokens
                      </span>
                    </div>
                    <div className="summary-row summary-total">
                      <span>Total Assets:</span>
                      <span>
                        {parseFloat(vaultTotalAssets).toFixed(6)} tokens
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction History */}
            <div className="action-card">
              <h2>Transaction History</h2>
              <p className="action-description">
                Recent vault transactions (Deposits, Withdrawals, Reallocations)
              </p>
              {loadingTransactions ? (
                <div className="loading-state">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">No transactions found</div>
              ) : (
                <div className="transactions-list">
                  {transactions.map((tx, index) => (
                    <div key={index} className="transaction-item">
                      <div className="transaction-header">
                        <div className="transaction-type">
                          <span
                            className={`type-badge type-${tx.type.toLowerCase()}`}
                          >
                            {tx.type}
                          </span>
                        </div>
                        <div className="transaction-amount">
                          {parseFloat(tx.amount).toFixed(6)} tokens
                        </div>
                      </div>
                      <div className="transaction-details">
                        {tx.type === "Rebalance" && tx.pool && (
                          <div className="transaction-detail">
                            <span>Pool:</span>
                            <span className="monospace">{tx.pool}</span>
                          </div>
                        )}
                        {tx.user && (
                          <div className="transaction-detail">
                            <span>User:</span>
                            <span className="monospace">
                              {tx.user.slice(0, 6)}...{tx.user.slice(-4)}
                            </span>
                          </div>
                        )}
                        <div className="transaction-detail">
                          <span>Time:</span>
                          <span>{tx.timestamp.toLocaleString()}</span>
                        </div>
                        <div className="transaction-detail">
                          <span>Tx:</span>
                          <a
                            href={`https://www.hyperscan.com/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-link"
                          >
                            {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* APY Chart */}
            <ApyChart />

            {/* Vault Info */}
            <div className="vault-info">
              <h3>Vault Information</h3>
              <div className="info-row">
                <span>Vault Address:</span>
                <span className="monospace">{VAULT_ADDRESS}</span>
              </div>
              <div className="info-row">
                <span>Asset Token:</span>
                <span className="monospace">{ASSET_TOKEN}</span>
              </div>
              <div className="info-row">
                <span>Chain:</span>
                <span>HyperEVM (999)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
