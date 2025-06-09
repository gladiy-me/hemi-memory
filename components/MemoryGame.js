// components/MemoryGame.js
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabaseClient"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useChainId, useWriteContract } from "wagmi"

// ABI вашего контракта (скопируйте из Remix ABI JSON)
const MemoryABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "NewScore",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "score", "type": "uint256" }],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalPlays",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }],
    "name": "getPlay",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// Адрес контракта (тот, что вы видите в Remix под MEMORYSCORES)
const CONTRACT_ADDRESS = "0x91e640523BEfbF095E6FEdf3a0a402350FD13f05"
const HEMI_MAINNET_CHAIN_ID = 43111

const cardSets = {
  easy: [1, 2, 3, 4],
  medium: [1, 2, 3, 4, 5, 6],
  hard: [1, 2, 3, 4, 5, 6, 7, 8, 9],
}

function createCards(ids) {
  return ids.map((id) => ({ id, image: `/images/card${id}.png` }))
}

function shuffleArray(array) {
  const duplicated = [...array, ...array]
  for (let i = duplicated.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[duplicated[i], duplicated[j]] = [duplicated[j], duplicated[i]]
  }
  return duplicated.map((card, index) => ({
    ...card,
    uniqueId: `card-${card.id}-${index}`,
  }))
}

export default function MemoryGame() {
  // --- состояние ---
  const [mode, setMode] = useState("easy")
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [time, setTime] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [playerName, setPlayerName] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { writeContractAsync } = useWriteContract()

  // Пометим, что это клиент
  useEffect(() => setIsClient(true), [])

  // Сброс и загрузка лидеров при смене режима
  useEffect(() => {
    resetGame()
    fetchLeaderboard()
  }, [mode])

  // Установим playerName, когда кошелёк на Hemi Mainnet
  useEffect(() => {
    if (isConnected && chainId === HEMI_MAINNET_CHAIN_ID && address) {
      setPlayerName(address)
    } else {
      setPlayerName("")
    }
  }, [isConnected, chainId, address])

  // Таймер
  useEffect(() => {
    let timer
    if (timerRunning) timer = setInterval(() => setTime((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [timerRunning])

  // Сохранение в Supabase
  async function saveResult(name, score, time, mistakes, finalScore) {
    const { error } = await supabase
      .from("leaderboard")
      .insert([{ name, score, time, mistakes, finalScore, mode }])
    if (error) console.error("Failed to save result:", error)
  }

  // Загрузка топ-10
  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("name, finalScore")
      .eq("mode", mode)
      .order("finalScore", { ascending: false })
      .limit(10)
    if (error) console.error("Failed to load leaderboard:", error)
    else setLeaderboard(data)
  }

  // Ход игрока
  function handleFlip(card) {
    if (!isConnected || chainId !== HEMI_MAINNET_CHAIN_ID) {
      return alert("Please connect to Hemi Mainnet to play.")
    }
    if (flipped.length === 2 || flipped.includes(card.uniqueId) || matched.includes(card.uniqueId)) {
      return
    }
    if (!timerRunning) setTimerRunning(true)
    setFlipped((f) => [...f, card.uniqueId])
  }

  // Проверяем пару
  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped
      const first = cards.find((c) => c.uniqueId === a)
      const second = cards.find((c) => c.uniqueId === b)
      if (first?.id === second?.id) {
        setMatched((m) => [...m, a, b])
        setScore((s) => s + 1)
      } else {
        setMistakes((m) => m + 1)
      }
      setTimeout(() => setFlipped([]), 800)
    }
  }, [flipped, cards])

  // Конец игры: отправляем в Supabase и в блокчейн
  useEffect(() => {
    if (
      matched.length === cards.length &&
      cards.length > 0 &&
      timerRunning &&
      playerName
    ) {
      setTimerRunning(false)
      const finalScore = score * 100 - time * 2 - mistakes * 10

      // Supabase
      saveResult(playerName, score, time, mistakes, finalScore)
      fetchLeaderboard()

      // Blockchain
      ;(async () => {
        try {
          const txHash = await writeContractAsync({
            address:      CONTRACT_ADDRESS,
            abi:          MemoryABI,
            functionName: "submitScore",
            args:         [finalScore],
          })
          console.log("Chain tx hash:", txHash)
        } catch (e) {
          console.error("Chain save failed:", e.reason || e)
          alert(`Blockchain save failed: ${e.reason || "unknown error"}`)
        }
      })()
    }
  }, [matched, cards, timerRunning, playerName])

  // Сброс доски
  function resetGame() {
    const newCards = createCards(cardSets[mode])
    setCards(shuffleArray(newCards))
    setFlipped([])
    setMatched([])
    setScore(0)
    setMistakes(0)
    setTime(0)
    setTimerRunning(false)
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center p-4 relative"
      style={{ backgroundImage: 'url("/background-orange.png")' }}
    >
      {/* Управление */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button onClick={() => setShowRules(true)} className="px-4 py-2 bg-white text-orange-500 rounded shadow">
          RULES
        </button>
        <button onClick={resetGame} className="px-4 py-2 bg-white text-orange-500 rounded shadow">
          Reset
        </button>
        <button onClick={() => (window.location.href = "/leaderboard")} className="px-4 py-2 bg-white text-orange-500 rounded shadow">
          Top 100
        </button>
      </div>

      {/* Кнопка подключения */}
      <div className="absolute top-4 left-4">
        <ConnectButton />
        {isClient && isConnected && (
          <div className="mt-2 text-white text-sm">
            {address.slice(0, 6)}…{address.slice(-4)}
          </div>
        )}
        {isClient && isConnected && chainId !== HEMI_MAINNET_CHAIN_ID && (
          <div className="mt-2 text-sm text-red-700 font-semibold">
            Switch to Hemi Mainnet
          </div>
        )}
      </div>

      {/* Выбор режима */}
      <div className="flex gap-4 my-4">
        {["easy", "medium", "hard"].map((lvl) => (
          <button
            key={lvl}
            onClick={() => { setMode(lvl); resetGame() }}
            className={`px-4 py-2 rounded ${
              mode === lvl
                ? lvl === "easy"
                  ? "bg-green-600 text-white"
                  : lvl === "medium"
                  ? "bg-yellow-500 text-white"
                  : "bg-red-500 text-white"
                : "bg-white text-black"
            }`}
          >
            {lvl.toUpperCase()}
          </button>
        ))}
      </div>

      <h1 className="text-4xl font-bold mb-2">Hemi Memory</h1>

      {/* Поле и лидерборд */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-7xl">
        {/* Поле */}
        <div className="bg-orange-400 p-4 rounded-xl shadow-lg w-full md:flex-1">
          <div className="flex justify-between text-white mb-4">
            <div>Score: {score}</div>
            <div>Mistakes: {mistakes}</div>
            <div>Time: {time}s</div>
          </div>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns:
                mode === "easy" ? "repeat(4,1fr)" : "repeat(auto-fit,minmax(120px,1fr))",
            }}
          >
            {cards.map((card) => {
              const flippedOrMatched =
                flipped.includes(card.uniqueId) || matched.includes(card.uniqueId)
              return (
                <div
                  key={card.uniqueId}
                  className="perspective w-full h-40 sm:h-48 cursor-pointer"
                  onClick={() => handleFlip(card)}
                >
                  <div
                    className={`flip-card-inner ${
                      flippedOrMatched ? "flipped" : ""
                    } ${matched.includes(card.uniqueId) ? "matched-glow" : ""}`}
                  >
                    <div className="flip-card-front flex items-center justify-center bg-gray-700 w-full h-full rounded">
                      <span className="text-5xl text-white">?</span>
                    </div>
                    <div className="flip-card-back flex items-center justify-center bg-white w-full h-full rounded">
                      <img src={card.image} alt="" className="w-28 h-28 object-contain" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* Лидерборд */}
        <div className="bg-orange-400 text-black p-4 rounded-xl shadow-lg w-full md:w-96">
          <h2 className="text-xl font-bold mb-3 text-center">🏆 Leaderboard</h2>
          <ul className="space-y-2">
            {leaderboard.map((entry, i) => (
              <li key={i} className="flex justify-between px-3 py-2 rounded shadow-sm">
                <span className="truncate">{entry.name}</span>
                <span className="font-bold">{entry.finalScore}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Модалка правил */}
      {showRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg text-black max-w-md">
            <h2 className="text-2xl font-bold mb-4">How to Play</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Flip two cards to find a matching pair.</li>
              <li>Get +100 per match; time and mistakes deduct points.</li>
              <li>Play faster and with fewer mistakes to top the board!</li>
            </ul>
            <button onClick={() => setShowRules(false)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Анимационные стили */}
      <style jsx global>{`
        .perspective { perspective: 1000px; }
        .flip-card-inner {
          position: relative;
          width: 100%; height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.6s;
        }
        .flip-card-inner.flipped { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back {
          position: absolute; width: 100%; height: 100%;
          backface-visibility: hidden; border-radius: 0.5rem;
        }
        .flip-card-back { transform: rotateY(180deg); }
        .matched-glow {
          animation: glow 0.6s ease-in-out;
          box-shadow: 0 0 12px 6px #00ff88;
        }
        @keyframes glow {
          0% { box-shadow: 0 0 0 transparent; }
          100% { box-shadow: 0 0 12px 6px #00ff88; }
        }
      `}</style>
    </div>
  )
}
