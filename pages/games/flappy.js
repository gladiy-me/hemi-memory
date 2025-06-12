// pages/games/flappy.js

import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { writeScoreToChain } from "../../lib/contract";

const HEMI_MAINNET_CHAIN_ID = 43111;

export default function FlappyPage({ initialLeaders, fetchError }) {
  const [leaders, setLeaders] = useState(initialLeaders || []);
  const [errorLeaders, setErrorLeaders] = useState(fetchError);
  const [modalOpen, setModalOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // 1) Инициализация Unity один раз
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/flappy/Build/flappy.loader.js";
    script.onload = () => {
      const canvas = document.getElementById("unity-canvas");
      if (!canvas) {
        console.error("Unity canvas not found");
        return;
      }
      if (typeof createUnityInstance !== "function") {
        console.error("createUnityInstance not available");
        return;
      }
      createUnityInstance(canvas, {
        dataUrl: "/flappy/Build/flappy.data",
        frameworkUrl: "/flappy/Build/flappy.framework.js",
        codeUrl: "/flappy/Build/flappy.wasm",
        streamingAssetsUrl: "StreamingAssets",
      });
    };
    script.onerror = () => console.error("Failed to load Unity loader");
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
      // keep <canvas> intact to avoid Unity warnings
    };
  }, []);

  // 2) Регистрация колбэка GameOver при изменении кошелька/сети
  useEffect(() => {
    window.onFlappyGameOver = async (score) => {
      console.log("🔥 GameOver callback:", score);
      setErrorLeaders(null);

      if (!isConnected || chainId !== HEMI_MAINNET_CHAIN_ID) {
        setErrorLeaders("Подключите кошелёк Hemi Mainnet");
        return;
      }

      try {
        if (window.ethereum) {
          await window.ethereum.request({ method: "eth_requestAccounts" });
        }

        console.log("Before writeScoreToChain");
        const receipt = await writeScoreToChain(score);
        console.log("After writeScoreToChain, tx:", receipt.transactionHash);

        console.log("Sending to Supabase: score=", score);
        const res = await fetch("/api/leaderboard/flappy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: address,
            username: address,
            score,
            tx_hash: receipt.transactionHash,
          }),
        });
        console.log("Supabase POST status:", res.status);
        const json = await res.json();
        console.log("Supabase response:", json);
        if (!res.ok) throw new Error(json.error || res.statusText);

        setLeaders((prev) =>
          [json, ...prev]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
        );
      } catch (err) {
        console.error("Error on GameOver flow:", err);
        setErrorLeaders(
          err.message.includes("User rejected")
            ? "Транзакция отклонена"
            : "Не удалось отправить результат"
        );
      }
    };
    return () => {
      delete window.onFlappyGameOver;
    };
  }, [address, chainId, isConnected]);

  // Анонимизация адреса: первые 3 и последние 5 символов
  const anonymize = (addr) => (addr ? `${addr.slice(0, 3)}…${addr.slice(-5)}` : "—");

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#000",
        margin: 0,
        padding: 0,
      }}
    >
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 1000 }}>
        <ConnectButton showBalance={false} />
      </div>

      <button
        onClick={() => setModalOpen(true)}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "#222",
          color: "#fff",
          fontSize: 24,
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        🏆
      </button>

      <canvas
        id="unity-canvas"
        width="1920"
        height="1080"
        style={{ width: "100%", height: "100%" }}
      />

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "80vw",
              maxWidth: 400,
              background: "#111",
              borderRadius: 8,
              padding: 16,
              color: "#fff",
              position: "relative",
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <h2 style={{ margin: 0, marginBottom: 12 }}>🏆 Топ-10 Flappy</h2>
            {errorLeaders ? (
              <p style={{ color: "tomato" }}>{errorLeaders}</p>
            ) : (
              <ol style={{ padding: 0, margin: 0 }}>
                {leaders.map((r) => (
                  <li key={r.id} style={{ marginBottom: 8 }}>
                    <strong>{anonymize(r.username)}</strong> — {r.score} pts
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabaseAdmin
    .from("leaderboard_flappy")
    .select("id, wallet_address, username, score, created_at")
    .order("score", { ascending: false })
    .limit(10);

  return {
    props: {
      initialLeaders: error ? [] : data,
      fetchError: error ? "Не удалось загрузить leaderboard" : null,
    },
  };
}