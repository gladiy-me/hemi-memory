import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useWriteContract } from 'wagmi';
import HemiMemoryABI from '../lib/HemiMemoryABI.json';

const cardSets = {
  easy: [1, 2, 3, 4],
  medium: [1, 2, 3, 4, 5, 6],
  hard: [1, 2, 3, 4, 5, 6, 7, 8, 9],
};

function createCards(ids) {
  return ids.map(id => ({ id, image: `/images/card${id}.png` }));
}

function shuffleArray(array) {
  const duplicated = [...array, ...array];
  for (let i = duplicated.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [duplicated[i], duplicated[j]] = [duplicated[j], duplicated[i]];
  }
  return duplicated.map((card, index) => ({ ...card, uniqueId: `card-${card.id}-${index}` }));
}

export default function MemoryGame() {
  const [mode, setMode] = useState('easy');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [time, setTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();

  const HEMI_MAINNET_CHAIN_ID = 43111;

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    const newCards = createCards(cardSets[mode]);
    setCards(shuffleArray(newCards));
    resetGame();
    fetchLeaderboard();
  }, [mode]);

  useEffect(() => {
    if (isConnected && chainId === HEMI_MAINNET_CHAIN_ID) {
      setPlayerName(address);
    } else {
      setPlayerName("");
    }
  }, [isConnected, address, chainId]);

  useEffect(() => {
    let timer;
    if (timerRunning) {
      timer = setInterval(() => setTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [timerRunning]);

  async function saveResult(name, score, time, mistakes, finalScore) {
    const { error } = await supabase
      .from('leaderboard')
      .insert([{ name, score, time, mistakes, finalScore, mode }]);
    if (error) {
      alert('Failed to save result. Please try again.');
    }
  }

  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('mode', mode)
      .order('finalScore', { ascending: false })
      .limit(10);

    if (error) {
      alert('Failed to load leaderboard.');
    } else {
      setLeaderboard(data);
    }
  }

  function handleFlip(card) {
    if (!isConnected || chainId !== HEMI_MAINNET_CHAIN_ID) {
      return alert("Please connect to Hemi Mainnet to play.");
    }
    if (flipped.length === 2 || flipped.includes(card.uniqueId) || matched.includes(card.uniqueId)) {
      return;
    }
    if (!timerRunning) setTimerRunning(true);
    setFlipped((prev) => [...prev, card.uniqueId]);
  }

  useEffect(() => {
    if (flipped.length === 2) {
      const [firstId, secondId] = flipped;
      const firstCard = cards.find((card) => card.uniqueId === firstId);
      const secondCard = cards.find((card) => card.uniqueId === secondId);

      if (firstCard && secondCard && firstCard.id === secondCard.id) {
        setMatched((prev) => [...prev, firstId, secondId]);
        setScore((prev) => prev + 1);
      } else {
        setMistakes((prev) => prev + 1);
      }

      setTimeout(() => setFlipped([]), 1000);
    }
  }, [flipped, cards]);

  useEffect(() => {
    async function recordScore(finalScore) {
      try {
        await writeContractAsync({
          address: '0x9b618640424FC34da8406ea307ed46Ff72eac506',
          abi: HemiMemoryABI,
          functionName: 'submitScore',
          args: [time, score],
        });
        alert('Your score has been successfully recorded to the blockchain!');
      } catch (err) {
        alert('Failed to record score to the blockchain. Please try again.');
      }
    }

    if (matched.length === cards.length && cards.length > 0 && timerRunning && playerName) {
      setTimerRunning(false);
      const finalScore = score * 100 - time * 2 - mistakes * 10;
      saveResult(playerName, score, time, mistakes, finalScore);
      fetchLeaderboard();
      recordScore(finalScore);
    }
  }, [matched, cards, timerRunning, playerName, score, time, mistakes]);

  function resetGame() {
    const newCards = createCards(cardSets[mode]);
    setCards(shuffleArray(newCards));
    setFlipped([]);
    setMatched([]);
    setScore(0);
    setMistakes(0);
    setTime(0);
    setTimerRunning(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center p-4 font-sans relative" style={{ backgroundImage: 'url("/background-orange.png")' }}>
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <button onClick={() => setShowRules(true)} className="w-32 px-4 py-2 bg-white text-orange-500 font-bold rounded shadow hover:scale-105 transition-transform duration-200">RULES</button>
        <button onClick={resetGame} className="w-32 px-4 py-2 bg-white text-orange-500 font-bold rounded shadow hover:scale-105 transition-transform duration-200">Reset</button>
        <button onClick={() => window.location.href = '/leaderboard'} className="w-32 px-4 py-2 bg-white text-orange-500 font-bold rounded shadow hover:scale-105 transition-transform duration-200">Top 100</button>
      </div>

      <div className="absolute top-4 left-4">
        <ConnectButton />
        {isClient && isConnected && (
          <div className="mt-2 text-white text-sm">
            Address: {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        )}
        {isClient && isConnected && chainId !== HEMI_MAINNET_CHAIN_ID && (
          <div className="mt-2 text-sm text-red-700 font-semibold">
            Please switch to Hemi Mainnet to play the game.
          </div>
        )}
      </div>

      <div className="flex gap-4 my-4">
        {["easy", "medium", "hard"].map(level => (
          <button
            key={level}
            onClick={() => setMode(level)}
            className={`px-4 py-2 w-24 rounded ${
              mode === level
                ? level === "easy"
                  ? "bg-green-600 text-white"
                  : level === "medium"
                  ? "bg-yellow-500 text-white"
                  : "bg-red-500 text-white"
                : level === "easy"
                ? "bg-white text-green-600"
                : level === "medium"
                ? "bg-white text-yellow-600"
                : "bg-white text-red-600"
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      <h1 className="text-4xl font-bold mb-2">Hemi Memory Game</h1>
      <h2 className="text-2xl font-semibold mb-4">Mode: {mode.toUpperCase()}</h2>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-7xl items-start">
        <div className="p-4 bg-orange-400 rounded-xl shadow-lg w-full max-w-5xl md:mr-auto">
          <div className="flex items-center justify-between mb-4 text-white font-semibold text-lg">
            <p>Score: {score}</p>
            <p>Mistakes: {mistakes}</p>
            <p>Time: {time} sec</p>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: mode === 'easy' ? 'repeat(4, 1fr)' : 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            {cards.map((card) => {
              const isFlipped = flipped.includes(card.uniqueId) || matched.includes(card.uniqueId);
              const isMatched = matched.includes(card.uniqueId);
              return (
                <div key={card.uniqueId} onClick={() => handleFlip(card)} className="perspective w-full h-40 sm:h-48 cursor-pointer select-none">
                  <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched-glow' : ''}`}>
                    <div className="flip-card-front flex items-center justify-center bg-gray-700 w-full h-full rounded shadow">
                      <span className="text-5xl text-white font-bold">?</span>
                    </div>
                    <div className="flip-card-back flex items-center justify-center bg-white w-full h-full rounded shadow">
                      <img src={card.image} alt="card" className="w-28 h-28 object-contain" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full md:w-96 bg-white p-4 rounded-xl shadow-lg text-black">
          <h2 className="text-xl font-bold mb-3 text-center">🏆 Leaderboard</h2>
          <ul className="space-y-2 text-base">
            {leaderboard.map((entry, index) => (
              <li key={index} className="flex justify-between items-center bg-white px-3 py-2 rounded-md shadow-sm text-black">
                <span className="truncate w-48 font-medium">
                  {entry.name?.startsWith("0x") ? `${entry.name.slice(0, 6)}...${entry.name.slice(-4)}` : entry.name || "Unknown"}
                </span>
                <span className="font-bold">{entry.finalScore}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {matched.length === cards.length && cards.length > 0 && (
        <div className="mt-6">
          <p className="text-xl font-semibold mb-4">You matched all cards! 🎉</p>
          <button onClick={resetGame} className="px-4 py-2 bg-blue-500 text-white rounded text-base">Play Again</button>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md shadow-xl text-black">
            <h2 className="text-2xl font-bold mb-4">How to Play</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Flip two cards at a time to find matching pairs.</li>
              <li>You get +100 points for every matched pair.</li>
              <li>Time and mistakes reduce your final score.</li>
              <li>Finish faster and with fewer mistakes for a better score!</li>
            </ul>
            <button onClick={() => setShowRules(false)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded">Close</button>
          </div>
        </div>
      )}

      <footer className="mt-10 text-center text-gray-700 text-sm">
        Made with ❤️ by <a href="https://x.com/hemiheads" target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">hemiheads</a>
        <div className="mt-2">
          <a
            href="https://hemiheads.gitbook.io/https-www.hemiheads.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 px-4 py-2 text-white bg-orange-500 rounded hover:bg-orange-600 transition-colors duration-200 text-sm font-semibold"
          >
            📘 Docs
          </a>
        </div>
      </footer>

      <style jsx global>{`
        .perspective { perspective: 1000px; }
        .flip-card-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.6s; }
        .flip-card-inner.flipped { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 0.5rem; }
        .flip-card-back { transform: rotateY(180deg); }
        .matched-glow { animation: glow 0.6s ease-in-out, bounce 0.6s ease-in-out; box-shadow: 0 0 12px 6px #00ff88; z-index: 2; }
        @keyframes glow { 0% { box-shadow: 0 0 0px #00ff88; } 50% { box-shadow: 0 0 20px 10px #00ff88; } 100% { box-shadow: 0 0 0px #00ff88; } }
        @keyframes bounce { 0% { transform: rotateY(180deg) translateY(0); } 30% { transform: rotateY(180deg) translateY(-10px); } 60% { transform: rotateY(180deg) translateY(5px); } 100% { transform: rotateY(180deg) translateY(0); } }
      `}</style>
    </div>
  );
}