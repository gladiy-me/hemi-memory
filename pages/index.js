// pages/index.js
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const games = [
  {
    title: 'Hemi Memory',
    description: 'Find matching cards before time runs out',
    image: '/images/memory-thumb.png',
    link: '/games/memory',
  },
  {
    title: 'Hemi 2048',
    description: 'Combine numbers to reach 2048!',
    image: '/images/2048-thumb.png',
    link: '/games/2048',
  }
];

export default function GameHub() {
  const { address, isConnected } = useAccount();
  const [totalScore, setTotalScore] = useState(null);

  useEffect(() => {
    async function fetchUserScore() {
      if (!address) return;

      let total = 0;
      const tables = ['leaderboard_2048', 'leaderboard'];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('score')
          .eq('name', address);

        if (!error && data.length > 0) {
          total += data.reduce((acc, cur) => acc + cur.score, 0);
        } else if (error) {
          console.error(`Error fetching from ${table}:`, error.message);
        }
      }

      setTotalScore(total);
    }

    fetchUserScore();
  }, [address]);

  return (
    <div
      className="min-h-screen p-6 relative text-white"
      style={{
        backgroundImage: 'url("/background-orange.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute top-4 right-4 text-right">
        <ConnectButton />
        {isConnected && totalScore !== null && (
          <div className="mt-2 text-sm">
            Your total score: <span className="font-bold">{totalScore}</span>
          </div>
        )}
      </div>

      <h1 className="text-4xl font-bold text-center mb-8">🎮 Hemi Game Hub</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {games.map((game, index) => (
          <Link href={game.link} key={index}>
            <div className="cursor-pointer bg-orange-100 hover:bg-orange-200 border border-orange-300 text-black rounded-xl shadow-md hover:shadow-lg p-4 text-center transition-transform transform hover:scale-105 duration-200">
              <img
                src={game.image}
                alt={game.title}
                className="w-full h-40 object-cover mb-4 rounded"
              />
              <h2 className="text-xl font-bold mb-2">{game.title}</h2>
              <p className="text-sm text-gray-600">{game.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <footer className="mt-10 text-center text-white text-sm">
        Made with ❤️ by{' '}
        <a
          href="https://x.com/hemiheads"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          hemiheads
        </a>
      </footer>
    </div>
  );
}
