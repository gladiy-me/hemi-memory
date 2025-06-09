// pages/games/flappy.js

import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { writeScoreToChain } from "../../lib/contract"; // ваш ethers.js wrapper

const HEMI_MAINNET_CHAIN_ID = 43111;

export default function FlappyPage({ initialLeaders, fetchError }) {
  const [leaders, setLeaders] = useState(initialLeaders || []);
  const [errorLeaders, setErrorLeaders] = useState(fetchError);
  const [modalOpen, setModalOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    // 1) Unity вызовет эту функцию, когда игра закончится
    window.onFlappyGameOver = async (score, /*time*/) => {
      console.log("🔥 GameOver callback:", score);

      // 2) проверяем кошелёк
      if (!isConnected || chainId !== HEMI_MAINNET_CHAIN_ID) {
        setErrorLeaders("Подключите кошелёк Hemi Mainnet");
        return;
      }

      try {
        // 3) запрашиваем доступ (если ещё не дал)
        if (window.ethereum) {
          await window.ethereum.request({ method: "eth_requestAccounts" });
        }

        // 4) отправляем транзакцию в контракт (только score)
        await writeScoreToChain(score);

        // 5) сохраняем результат в Supabase
        const res = await fetch("/api/leaderboard/flappy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: address,
            username: address,
            score,
          }),
        });
        console.log("→ Supabase POST status:", res.status);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);

        // 6) обновляем локальный топ-10
        setLeaders((prev) =>
          [json, ...prev].sort((a, b) => b.score - a.score).slice(0, 10)
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

    // 7) подгружаем Unity WebGL loader
    const script = document.createElement("script");
    script.src = "/flappy/Build/flappy.loader.js";
    script.onload = () => {
      const canvas = document.getElementById("unity-canvas");
      if (!canvas) {
        console.error("Canvas #unity-canvas не найден");
        return;
      }
      if (typeof createUnityInstance !== "function") {
        console.error("createUnityInstance() не найден");
        return;
      }
      createUnityInstance(canvas, {
        dataUrl: "/flappy/Build/flappy.data",
        frameworkUrl: "/flappy/Build/flappy.framework.js",
        codeUrl: "/flappy/Build/flappy.wasm",
        streamingAssetsUrl: "StreamingAssets",
      });
    };
    script.onerror = () => console.error("Не удалось загрузить flappy.loader.js");
    document.body.appendChild(script);

    // 8) очистка при демонтировании
    return () => {
      document.body.removeChild(script);
      delete window.onFlappyGameOver;
      // Не удаляем сам <canvas>, чтобы Unity не ругалась
    };
  }, [address, chainId, isConnected]);

  // Анонимизация адреса: первые 3 и последние 5 символов
  const anonymize = (addr) =>
    addr ? `${addr.slice(0, 3)}…${addr.slice(-5)}` : "—";

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
      {/* 1) Кнопка подключения кошелька */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 1000 }}>
        <ConnectButton showBalance={false} />
      </div>

      {/* 2) Кнопка открытия модалки лидеров */}
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

      {/* 3) Unity Canvas */}
      <canvas
        id="unity-canvas"
        width="1920"
        height="1080"
        style={{ width: "100%", height: "100%" }}
      />

      {/* 4) Модалка с топ-10 */}
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
