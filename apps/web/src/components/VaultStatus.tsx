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
      <div className="yields-grid">
        {yieldData.pools &&
          yieldData.pools.map((pool: any, idx: number) => (
            <div key={idx} className="yield-card">
              <h3>{pool.name || "Pool"}</h3>
              <p className="apy">APY: {pool.apy}%</p>
              <p className="tvl">TVL: ${pool.tvl}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
