// components/Game2048.js
import { useEffect, useState } from "react";
import { supabase } from '../lib/supabaseClient';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useWriteContract } from 'wagmi';
import HemiMemoryABI from '../lib/HemiMemoryABI.json';

const SIZE = 4;
const HEMI_MAINNET_CHAIN_ID = 43111;
const CONTRACT_ADDRESS = "0x9b618640424FC34da8406ea307ed46Ff72eac506";

function createEmptyBoard() {
  return Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
}

function getRandomEmptyCell(board) {
  const empty = [];
  board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === 0) empty.push([y, x]);
    });
  });
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}

function cloneBoard(board) {
  return board.map(row => [...row]);
}

function addRandomTile(board) {
  const cell = getRandomEmptyCell(board);
  if (!cell) return board;
  const [y, x] = cell;
  const newBoard = cloneBoard(board);
  newBoard[y][x] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function moveLeft(board, setScore) {
  let moved = false;
  let scoreGained = 0;
  const newBoard = board.map(row => {
    const filtered = row.filter(v => v !== 0);
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2;
        scoreGained += filtered[i];
        filtered[i + 1] = 0;
        moved = true;
      }
    }
    const compacted = filtered.filter(v => v !== 0);
    while (compacted.length < SIZE) compacted.push(0);
    if (row.join() !== compacted.join()) moved = true;
    return compacted;
  });
  if (scoreGained > 0) setScore(prev => prev + scoreGained);
  return [newBoard, moved];
}

function rotateRight(board) {
  const newBoard = createEmptyBoard();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      newBoard[x][SIZE - 1 - y] = board[y][x];
    }
  }
  return newBoard;
}

function rotateLeft(board) {
  const newBoard = createEmptyBoard();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      newBoard[SIZE - 1 - x][y] = board[y][x];
    }
  }
  return newBoard;
}

function hasMoves(board) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === 0) return true;
      if (x < SIZE - 1 && board[y][x] === board[y][x + 1]) return true;
      if (y < SIZE - 1 && board[y][x] === board[y + 1][x]) return true;
    }
  }
  return false;
}

function getTileStyle(value) {
  const base = "flex items-center justify-center text-4xl font-bold rounded-lg shadow-inner transition-all duration-300 ease-in-out transform animate-fade-in";
  const colors = {
    0: "bg-orange-200 text-transparent",
    2: "bg-orange-100 text-orange-800",
    4: "bg-orange-200 text-orange-900",
    8: "bg-orange-400 text-white",
    16: "bg-orange-500 text-white",
    32: "bg-orange-600 text-white",
    64: "bg-orange-700 text-white",
    128: "bg-orange-800 text-white",
    256: "bg-orange-900 text-white",
    512: "bg-orange-900 text-white",
    1024: "bg-orange-900 text-white",
    2048: "bg-black text-white",
  };
  return `${base} ${colors[value] || 'bg-orange-900 text-white'}`;
}

export default function Game2048() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();

  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('leaderboard_2048')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);

    if (!error && data) setLeaderboard(data);
  }

  async function saveResultToChain() {
    if (!isConnected || chainId !== HEMI_MAINNET_CHAIN_ID) return;
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: HemiMemoryABI,
        functionName: 'submitScore',
        args: [score, score],
      });
    } catch (err) {
      console.error('Failed to submit score');
    }
  }

  async function saveResultToSupabase() {
    if (!address) return;
    try {
      await supabase.from('leaderboard_2048').insert([
        { name: address, score: score },
      ]);
    } catch (error) {
      console.error('Failed to save to Supabase:', error);
    }
  }

  function checkEndGame(board) {
    const flat = board.flat();
    if (flat.includes(2048) || !hasMoves(board)) {
      setGameOver(true);
      saveResultToChain();
      saveResultToSupabase();
    }
  }

  function resetGame() {
    let newBoard = createEmptyBoard();
    newBoard = addRandomTile(newBoard);
    newBoard = addRandomTile(newBoard);
    setBoard(newBoard);
    setGameOver(false);
    setScore(0);
  }

  useEffect(() => {
    const storedBest = localStorage.getItem('best2048');
    if (storedBest) setBest(Number(storedBest));
  }, []);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem('best2048', score);
    }
  }, [score]);

  useEffect(() => {
    fetchLeaderboard();
    resetGame();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (gameOver) return;
      let newBoard, moved;
      if (e.key === "ArrowLeft") {
        [newBoard, moved] = moveLeft(board, setScore);
      } else if (e.key === "ArrowRight") {
        [newBoard, moved] = moveLeft(rotateLeft(rotateLeft(board)), setScore);
        newBoard = rotateRight(rotateRight(newBoard));
      } else if (e.key === "ArrowUp") {
        [newBoard, moved] = moveLeft(rotateLeft(board), setScore);
        newBoard = rotateRight(newBoard);
      } else if (e.key === "ArrowDown") {
        [newBoard, moved] = moveLeft(rotateRight(board), setScore);
        newBoard = rotateLeft(newBoard);
      } else {
        return;
      }
      if (moved) {
        const nextBoard = addRandomTile(newBoard);
        setBoard(nextBoard);
        checkEndGame(nextBoard);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [board, gameOver]);

  return (
    <div className="min-h-screen flex flex-col items-center text-orange-900 p-4 relative" style={{ backgroundImage: 'url("/background-orange.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute top-4 left-4">
        <ConnectButton />
      </div>

      <button
        onClick={() => setShowRules(true)}
        className="absolute top-4 right-4 px-4 py-2 bg-white text-orange-500 font-bold rounded shadow hover:scale-105 transition-transform duration-200"
      >
        RULES
      </button>

      <h1 className="text-7xl font-extrabold mb-4">2048</h1>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl items-start justify-center">
        <div className="flex flex-col gap-6 items-center">
          <div className="flex gap-4">
            <div className="bg-orange-300 px-6 py-4 rounded-lg text-center">
              <div className="text-sm">SCORE</div>
              <div className="text-2xl font-bold">{score}</div>
            </div>
            <div className="bg-orange-300 px-6 py-4 rounded-lg text-center">
              <div className="text-sm">BEST</div>
              <div className="text-2xl font-bold">{best}</div>
            </div>
          </div>

          <div className="flex gap-8 items-start">
            <div className="flex flex-col gap-4">
              <button
                onClick={resetGame}
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-lg font-semibold text-base"
              >
                New Game
              </button>
              <button
                onClick={saveResultToChain}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow"
              >
                Submit to Blockchain
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 bg-orange-300 p-6 rounded-xl shadow-xl">
              {board.flat().map((num, i) => (
                <div
                  key={i}
                  className={getTileStyle(num)}
                  style={{ width: "100px", height: "100px" }}
                >
                  {num !== 0 ? num : ''}
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-center w-full md:w-80 bg-white p-4 rounded-xl shadow text-black">
              <h2 className="text-xl font-bold mb-3 text-center">🏆 Leaderboard</h2>
              <ul className="space-y-2 text-base">
                {leaderboard.map((entry, index) => (
                  <li key={index} className="flex justify-between items-center bg-white px-3 py-2 rounded-md shadow-sm text-black">
                    <span className="truncate w-40 font-medium">
                      {entry.name?.startsWith("0x") ? `${entry.name.slice(0, 6)}...${entry.name.slice(-4)}` : entry.name || "Unknown"}
                    </span>
                    <span className="font-bold">{entry.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-10 text-center text-gray-700 text-sm">
        Made with ❤️ by <a href="https://x.com/hemiheads" target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">hemiheads</a>
      </footer>

      {showRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md shadow-xl text-black">
            <h2 className="text-2xl font-bold mb-4">How to Play</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Use arrow keys to move the tiles.</li>
              <li>When two tiles with the same number touch, they merge into one.</li>
              <li>Try to reach the 2048 tile!</li>
            </ul>
            <button onClick={() => setShowRules(false)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded">Close</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
