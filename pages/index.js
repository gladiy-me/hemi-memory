import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';

const initialCards = [
  { id: 1, image: "/images/aries.png" },
  { id: 2, image: "/images/taurus.png" },
  { id: 3, image: "/images/gemini.png" },
  { id: 4, image: "/images/cancer.png" },
  { id: 5, image: "/images/leo.png" },
  { id: 6, image: "/images/virgo.png" },
  { id: 7, image: "/images/libra.png" },
  { id: 8, image: "/images/scorpio.png" },
];

function shuffleArray(array) {
  return array
    .concat(array)
    .sort(() => Math.random() - 0.5)
    .map((card, index) => ({ ...card, uniqueId: index }));
}

export default function MemoryGame() {
  const [cards, setCards] = useState(shuffleArray(initialCards));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [time, setTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    let timer;
    if (timerRunning) {
      timer = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerRunning]);

  async function saveResult(name, score, time) {
    const { error } = await supabase
      .from('leaderboard')
      .insert([{ name, score, time }]);
    if (error) console.error('Ошибка сохранения:', error);
  }

  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('time', { ascending: true })
      .limit(5);

    if (error) {
      console.error('Ошибка загрузки лидерборда:', error);
    } else {
      setLeaderboard(data);
    }
  }

  function handleFlip(card) {
    if (!nameSubmitted) return alert("Please enter your name to start the game.");
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

      if (firstCard.image === secondCard.image) {
        setMatched((prev) => [...prev, firstId, secondId]);
        setScore((prev) => prev + 1);
      }

      setTimeout(() => setFlipped([]), 1000);
    }
  }, [flipped, cards]);

  useEffect(() => {
    if (matched.length === cards.length && timerRunning && playerName) {
      setTimerRunning(false);
      saveResult(playerName, score, time);
      fetchLeaderboard();
    }
  }, [matched, cards.length, timerRunning, playerName, score, time]);

  function resetGame() {
    setCards(shuffleArray(initialCards));
    setFlipped([]);
    setMatched([]);
    setScore(0);
    setTime(0);
    setTimerRunning(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-orange-400 to-yellow-300 p-4 relative font-sans">
      <div className="absolute top-4 right-4">
        <button onClick={() => setShowRules(true)} className="px-4 py-2 bg-white text-orange-500 font-bold rounded shadow text-base">
          RULES
        </button>
      </div>

      {showRules && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white text-black p-8 rounded-lg max-w-md text-center relative">
            <button onClick={() => setShowRules(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl">✖️</button>
            <h2 className="text-2xl font-bold mb-4">How to Play</h2>
            <p className="mb-2 text-base">- Click two cards to flip them over.</p>
            <p className="mb-2 text-base">- Find matching pairs to keep them open.</p>
            <p className="mb-4 text-base">- Match all pairs to win the game!</p>
            <p className="text-base font-semibold">Take your time, have fun — HEMI believes in you! 💫</p>
          </div>
        </div>
      )}

      <h1 className="text-4xl font-bold mb-2">Hemi Memory Game</h1>
      <h2 className="text-2xl font-semibold mb-4">Match the cards and beat the clock!</h2>

      {!nameSubmitted && (
        <div className="mb-6 text-center">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="px-4 py-2 rounded text-black mr-2"
          />
          <button
            onClick={() => setNameSubmitted(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={!playerName.trim()}
          >
            Start Game
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl items-start">
        <div className="p-4 bg-orange-400 rounded-xl shadow-lg w-full md:w-[520px]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold text-white">Score: {score}</p>
            <p className="text-lg font-semibold text-white">Time: {time} sec</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {cards.map((card) => {
              const isFlipped = flipped.includes(card.uniqueId) || matched.includes(card.uniqueId);
              return (
                <div
                  key={card.uniqueId}
                  onClick={() => handleFlip(card)}
                  className={`w-24 h-32 flex items-center justify-center rounded shadow cursor-pointer select-none ${
                    isFlipped ? "bg-white" : "bg-gray-700"
                  }`}
                >
                  {isFlipped ? (
                    <img src={card.image} alt="card" className="w-24 h-24 object-contain" />
                  ) : (
                    <span className="text-4xl text-white font-bold">?</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full md:w-64 bg-white bg-opacity-90 p-4 rounded-xl shadow-lg text-black">
          <h2 className="text-xl font-bold mb-3 text-center">🏆 Leaderboard</h2>
          <ul className="space-y-2 text-base">
            {leaderboard.map((entry, index) => (
              <li key={index} className="flex justify-between border-b pb-1">
                <span>{entry.name || "Unknown"}</span>
                <span>{entry.time}s</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {matched.length === cards.length && (
        <div className="mt-6">
          <p className="text-xl font-semibold mb-4">You matched all cards! 🎉</p>
          <button onClick={resetGame} className="px-4 py-2 bg-blue-500 text-white rounded text-base">Play Again</button>
        </div>
      )}

      <footer className="mt-10 text-center text-gray-700 text-sm">
        Made with ❤️ by <a href="https://x.com/Ivankakone" target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">Gladiy</a>
      </footer>
    </div>
  );
}
