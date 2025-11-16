"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getVaultTvlHistory } from "@/lib/api";
import { VAULT_ADDRESS } from "@/config/contracts";

interface VaultTvlDataPoint {
  timestamp: string;
  tvl: number | null;
}

const VaultTvlChart: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "6h" | "24h" | "7d" | "30d"
  >("7d");
  const [chartData, setChartData] = useState<VaultTvlDataPoint[]>([]);
  const [latestData, setLatestData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hoursMap = {
    "6h": 6,
    "24h": 24,
    "7d": 168,
    "30d": 720,
  };

  useEffect(() => {
    const fetchVaultTvlData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const hours = hoursMap[selectedPeriod];
        const response = await getVaultTvlHistory(VAULT_ADDRESS, hours);

        if (!response.success) {
          throw new Error(response.error || "Failed to fetch vault TVL data");
        }

        const historyData = response.data || [];

        if (historyData.length === 0) {
          setError("No vault TVL data available for this period");
          setChartData([]);
          setIsLoading(false);
          return;
        }

        // Transform data for chart
        const chartDataPoints: VaultTvlDataPoint[] = historyData
          .filter((point: any) => point.total_tvl !== null && point.total_tvl !== undefined)
          .map((point: any) => {
            const timestamp = new Date(point.timestamp);
            return {
              timestamp: timestamp.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              tvl: point.total_tvl,
            };
          });

        setChartData(chartDataPoints);
        
        // Store latest data point for distribution display
        if (historyData.length > 0) {
          const latest = historyData[historyData.length - 1];
          setLatestData(latest);
        } else {
          setLatestData(null);
        }
      } catch (err: any) {
        console.error("Error fetching vault TVL data:", err);
        setError(err.message || "Failed to load vault TVL data");
        setChartData([]);
        setLatestData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultTvlData();
  }, [selectedPeriod]);

  const formatTooltipValue = (value: number) => {
    if (typeof value !== "number" || isNaN(value)) return "N/A";
    return `$${value.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  const latestTvl = latestData?.total_tvl || (chartData.length > 0 ? chartData[chartData.length - 1].tvl : null);
  
  // Calculate sum of all allocations for display
  const sumOfAllocations = latestData?.allocations
    ? latestData.allocations.reduce((sum: number, alloc: any) => sum + alloc.amount, 0)
    : null;

  return (
    <div className="apy-chart-container">
      <div className="apy-chart-header">
        <div className="apy-chart-title-section">
          <h3 className="apy-chart-title">Vault Historical TVL</h3>
          <span className="apy-chart-subtitle">
            Track the vault's total value locked over time
            {latestTvl !== null && (
              <>
                <span style={{ marginLeft: "0.5rem", fontWeight: 600 }}>
                  Current: ${latestTvl.toLocaleString(undefined, { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </span>
                {sumOfAllocations !== null && (
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", opacity: 0.8 }}>
                    (Sum: ${sumOfAllocations.toLocaleString(undefined, { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })})
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        {/* Time Period Selector */}
        <div className="apy-period-selector">
          {(["6h", "24h", "7d", "30d"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`apy-period-button ${
                selectedPeriod === period ? "apy-period-active" : ""
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="apy-chart-wrapper">
        {isLoading ? (
          <div className="apy-chart-loading">
            <span>Loading vault TVL data...</span>
          </div>
        ) : error ? (
          <div className="apy-chart-error">
            <span>{error}</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="apy-chart-empty">
            <span>No vault TVL data available for this period</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                stroke="#9ca3af"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) =>
                  `$${value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                }
                domain={["auto", "auto"]}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#ffffff",
                }}
                formatter={formatTooltipValue}
              />
              <Area
                type="monotone"
                dataKey="tvl"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorTvl)"
                fillOpacity={1}
                activeDot={{ r: 5, fill: "#10b981" }}
                connectNulls={false}
                name="Vault TVL"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        
        {/* Token Distribution */}
        {latestData && latestData.allocations && latestData.allocations.length > 0 && (
          <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
            <h4 style={{ marginBottom: "1rem", fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Token Distribution
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Allocations (includes idle funds if present) */}
              {latestData.allocations
                .sort((a: any, b: any) => b.amount - a.amount) // Sort by amount descending
                .map((alloc: any, index: number) => {
                  // Determine color: gray for idle funds, green for pool allocations
                  const isIdle = alloc.pool_description?.includes("Idle") || 
                                alloc.pool_address?.toLowerCase() === VAULT_ADDRESS.toLowerCase();
                  const barColor = isIdle ? "#6b7280" : "#10b981";
                  
                  return (
                    <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                        {alloc.pool_description || alloc.pool_address.slice(0, 8) + "..."}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ 
                          width: "100px", 
                          height: "8px", 
                          backgroundColor: "var(--border-color)",
                          borderRadius: "4px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${Math.min(alloc.percentage, 100)}%`, // Cap at 100%
                            height: "100%",
                            backgroundColor: barColor
                          }} />
                        </div>
                        <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-primary)", minWidth: "80px", textAlign: "right" }}>
                          ${alloc.amount.toLocaleString(undefined, { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                          })} ({alloc.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultTvlChart;

