import React from "react";

interface VaultStatusProps {
  yieldData: any;
}

export default function VaultStatus({ yieldData }: VaultStatusProps) {
  if (!yieldData) {
    return (
      <div className="vault-status">
        <h2>Loading yield data...</h2>
      </div>
    );
  }

  return (
    <div className="vault-status">
      <h2>Current Best Yields</h2>

      {/* Display yield cards if data exists */}
      {yieldData.pools && yieldData.pools.length > 0 && (
        <div className="yields-grid">
          {yieldData.pools.map((pool: any, idx: number) => (
            <div key={idx} className="yield-card">
              <h3>
                {pool.description ||
                  pool.name ||
                  pool.pool_address?.slice(0, 10) + "..." ||
                  "Pool"}
              </h3>
              {pool.url && (
                <a
                  href={pool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pool-link"
                >
                  View Pool →
                </a>
              )}
              <p className="apy">
                Total APY: {pool.apy ? `${pool.apy.toFixed(2)}%` : "N/A"}
              </p>
              {pool.historic_apy !== undefined && (
                <p className="apy-detail">
                  Historic: {pool.historic_apy.toFixed(2)}%
                </p>
              )}
              {pool.rewards_apy !== undefined && pool.rewards_apy > 0 && (
                <p className="apy-detail">
                  Rewards: {pool.rewards_apy.toFixed(2)}%
                </p>
              )}
              <p className="chain">Chain: {pool.chain || "N/A"}</p>
              <p className="token-address">Pool: {pool.pool_address}</p>
              {pool.input_token && (
                <p className="token">Token: {pool.input_token}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Display full API response */}
      <div className="api-response">
        <h3>Full API Response:</h3>
        <pre>{JSON.stringify(yieldData, null, 2)}</pre>
      </div>
    </div>
  );
}
