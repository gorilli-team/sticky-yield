import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { getBestYield } from "../lib/api";
import Layout from "../components/Layout";
import VaultStatus from "../components/VaultStatus";

export default function Home() {
  const { login, logout, ready, authenticated, user } = usePrivy();
  const [yieldData, setYieldData] = useState<any>(null);

  useEffect(() => {
    if (authenticated) {
      getBestYield().then(setYieldData).catch(console.error);
    }
  }, [authenticated]);

  if (!ready) return <div>Loading...</div>;

  return (
    <Layout>
      <div className="container">
        <h1>GlueX Yield Optimizer</h1>

        {!authenticated && (
          <div className="connect-section">
            <p>Connect your wallet to start optimizing yields</p>
            <button onClick={login} className="btn-primary">
              Connect Wallet
            </button>
          </div>
        )}

        {authenticated && (
          <>
            <div className="wallet-info">
              <p>Connected: {user?.wallet?.address}</p>
              <button onClick={logout} className="btn-secondary">
                Disconnect
              </button>
            </div>

            <VaultStatus yieldData={yieldData} />
          </>
        )}
      </div>
    </Layout>
  );
}
