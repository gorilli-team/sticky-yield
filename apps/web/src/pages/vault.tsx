import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import Layout from "@/components/Layout";
import ApyChart from "@/components/ApyChart";
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

  // Load user balances
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

      const [balance, vBalance, shares, allow] = await Promise.all([
        tokenContract.balanceOf(address),
        vaultContract.balanceOf(address),
        vaultContract.userShares(address),
        tokenContract.allowance(address, VAULT_ADDRESS),
      ]);

      setTokenBalance(ethers.utils.formatUnits(balance, 6)); // Assuming 6 decimals
      setVaultBalance(ethers.utils.formatUnits(vBalance, 6));
      setUserShares(ethers.utils.formatUnits(shares, 6));
      setAllowance(ethers.utils.formatUnits(allow, 6));
    } catch (err: any) {
      console.error("Error loading balances:", err);
    }
  };

  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      loadBalances();
    }
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
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.message || "Deposit failed");
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
