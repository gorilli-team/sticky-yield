import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import Layout from "@/components/Layout";
import { getAutomationHistory } from "@/lib/api";
import { VAULT_ADDRESS } from "@/config/contracts";

export default function AutomationPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAutomationHistory(VAULT_ADDRESS, 100);
      if (response.success && response.history) {
        setHistory(response.history);
      } else {
        setError("No automation history available");
        setHistory([]);
      }
    } catch (err: any) {
      console.error("Error loading automation history:", err);
      setError(err.message || "Failed to load automation history");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatNumber = (value: string | number, decimals: number = 2) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (num === 0) return "0";
    if (num < 0.01 && num > 0) return "<0.01";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case "reallocate_to_better_pool":
        return "#10b981"; // green
      case "deposit_idle":
        return "#3b82f6"; // blue
      case "no_action":
        return "#6b7280"; // gray
      case "error":
        return "#ef4444"; // red
      default:
        return "#6b7280";
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case "reallocate_to_better_pool":
        return "Reallocated to Better Pool";
      case "deposit_idle":
        return "Deposited Idle Funds";
      case "no_action":
        return "No Action";
      case "error":
        return "Error";
      default:
        return decision;
    }
  };

  return (
    <Layout>
      <div className="automation-page">
        <div className="automation-header">
          <h1>Vault Automation History</h1>
          <button onClick={loadHistory} className="refresh-button">
            Refresh
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-state">Loading automation history...</div>
        ) : history.length === 0 ? (
          <div className="empty-state">No automation history available</div>
        ) : (
          <div className="automation-table-container">
            <table className="automation-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Decision</th>
                  <th>Best Pool</th>
                  <th>Current Pool</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, index) => {
                  const recordKey = record._id || index.toString();
                  const isExpanded = expandedRows.has(recordKey);

                  return (
                    <React.Fragment key={recordKey}>
                      <tr className="data-row">
                        <td>{formatDate(record.timestamp)}</td>
                        <td>
                          <span
                            className="decision-badge"
                            style={{
                              backgroundColor: getDecisionColor(
                                record.decision
                              ),
                            }}
                          >
                            {getDecisionLabel(record.decision)}
                          </span>
                        </td>
                        <td>
                          {record.best_pool ? (
                            <div className="pool-info">
                              <div className="pool-name">
                                {record.best_pool.description || "Unknown"}
                              </div>
                              <div className="pool-meta">
                                Score:{" "}
                                {record.best_pool.opportunity_score?.toFixed(
                                  2
                                ) || "N/A"}
                                {" | "}
                                APY: {record.best_pool.apy?.toFixed(2) || "0"}%
                              </div>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>
                          {record.current_pool ? (
                            <div className="pool-info">
                              <div className="pool-name">
                                {record.current_pool.description || "Unknown"}
                              </div>
                              <div className="pool-meta">
                                Score:{" "}
                                {record.current_pool.opportunity_score?.toFixed(
                                  2
                                ) || "N/A"}
                                {" | "}
                                APY:{" "}
                                {record.current_pool.apy?.toFixed(2) || "0"}%
                              </div>
                            </div>
                          ) : (
                            "Not Allocated"
                          )}
                        </td>
                        <td>
                          {record.action?.type === "none" ? (
                            "None"
                          ) : record.action ? (
                            <div className="action-info">
                              <div className="action-type">
                                {record.action.type}
                              </div>
                              {record.action.amount && (
                                <div className="action-amount">
                                  {formatNumber(
                                    ethers.utils.formatUnits(
                                      record.action.amount,
                                      6
                                    ),
                                    2
                                  )}{" "}
                                  tokens
                                </div>
                              )}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>
                          {record.success ? (
                            <span className="status-success">✓ Success</span>
                          ) : (
                            <span className="status-error">✗ Failed</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="expand-button"
                            onClick={() => toggleRow(recordKey)}
                          >
                            {isExpanded ? "▼ Hide" : "▶ Show"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="details-row">
                          <td colSpan={7}>
                            <div className="automation-details">
                              <div className="details-section">
                                <h3>Vault State</h3>
                                <div className="details-grid">
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Idle Balance:
                                    </span>
                                    <span className="detail-value">
                                      {formatNumber(
                                        ethers.utils.formatUnits(
                                          record.vault_state?.idle_balance ||
                                            "0",
                                          6
                                        ),
                                        2
                                      )}{" "}
                                      tokens
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Total Assets:
                                    </span>
                                    <span className="detail-value">
                                      {formatNumber(
                                        ethers.utils.formatUnits(
                                          record.vault_state?.total_assets ||
                                            "0",
                                          6
                                        ),
                                        2
                                      )}{" "}
                                      tokens
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Allocated:
                                    </span>
                                    <span className="detail-value">
                                      {formatNumber(
                                        ethers.utils.formatUnits(
                                          record.vault_state
                                            ?.allocated_amount || "0",
                                          6
                                        ),
                                        2
                                      )}{" "}
                                      tokens
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {record.better_pool_found && (
                                <div className="details-section">
                                  <h3>Better Pool Found</h3>
                                  <div className="opportunity-diff">
                                    Opportunity Score Difference: +
                                    {record.opportunity_score_difference?.toFixed(
                                      2
                                    ) || "0"}
                                  </div>
                                </div>
                              )}

                              {record.action &&
                                record.action.type !== "none" && (
                                  <div className="details-section">
                                    <h3>Action Details</h3>
                                    <div className="details-grid">
                                      {record.action.from_pool && (
                                        <div className="detail-item">
                                          <span className="detail-label">
                                            From Pool:
                                          </span>
                                          <span className="detail-value">
                                            {formatAddress(
                                              record.action.from_pool
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      {record.action.to_pool && (
                                        <div className="detail-item">
                                          <span className="detail-label">
                                            To Pool:
                                          </span>
                                          <span className="detail-value">
                                            {formatAddress(
                                              record.action.to_pool
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      <div className="detail-item">
                                        <span className="detail-label">
                                          Amount:
                                        </span>
                                        <span className="detail-value">
                                          {formatNumber(
                                            ethers.utils.formatUnits(
                                              record.action.amount || "0",
                                              6
                                            ),
                                            2
                                          )}{" "}
                                          tokens
                                        </span>
                                      </div>
                                      {record.action.tx_hash && (
                                        <div className="detail-item">
                                          <span className="detail-label">
                                            TX Hash:
                                          </span>
                                          <a
                                            href={`https://www.hyperscan.com/tx/${record.action.tx_hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tx-link"
                                          >
                                            {formatAddress(
                                              record.action.tx_hash
                                            )}
                                          </a>
                                        </div>
                                      )}
                                      {record.action.error_message && (
                                        <div className="detail-item error">
                                          <span className="detail-label">
                                            Error:
                                          </span>
                                          <span className="detail-value">
                                            {record.action.error_message}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                              {record.available_pools &&
                                record.available_pools.length > 0 && (
                                  <div className="details-section">
                                    <h3>
                                      Available Pools (
                                      {record.available_pools.length})
                                    </h3>
                                    <div className="pools-list">
                                      {record.available_pools
                                        .slice(0, 10)
                                        .map((pool: any, idx: number) => (
                                          <div key={idx} className="pool-item">
                                            <div className="pool-item-header">
                                              <span className="pool-item-name">
                                                {pool.description || "Unknown"}
                                              </span>
                                              <span className="pool-item-score">
                                                Score:{" "}
                                                {pool.opportunity_score?.toFixed(
                                                  2
                                                ) || "N/A"}
                                              </span>
                                            </div>
                                            <div className="pool-item-meta">
                                              APY: {pool.apy?.toFixed(2) || "0"}
                                              %{" | "}
                                              TVL: $
                                              {formatNumber(
                                                pool.tvl_usd || 0,
                                                0
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                              {record.error_message && (
                                <div className="details-section error">
                                  <h3>Error</h3>
                                  <div className="error-message">
                                    {record.error_message}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
