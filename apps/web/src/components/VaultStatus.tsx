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
                {pool.name || pool.pool_address?.slice(0, 10) + "..." || "Pool"}
              </h3>
              <p className="apy">APY: {pool.apy ? `${pool.apy}%` : "N/A"}</p>
              <p className="tvl">TVL: {pool.tvl ? `$${pool.tvl}` : "N/A"}</p>
              <p className="chain">Chain: {pool.chain || "N/A"}</p>
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
