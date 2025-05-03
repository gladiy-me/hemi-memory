import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("finalScore", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Ошибка загрузки лидерборда:", error);
      } else {
        setLeaderboard(data);
      }
    }

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-orange-100 flex flex-col items-center py-12 px-4">
      <div className="max-w-3xl w-full bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6 text-orange-600">
          🏆 Top 100 Players
        </h1>

        <ul className="divide-y divide-gray-300">
          {leaderboard.map((entry, index) => (
            <li key={index} className="flex justify-between items-center py-3 px-2">
              <span className="text-gray-700 font-semibold w-8">{index + 1}.</span>
              <span className="w-48 truncate text-black">
                {entry.name?.startsWith("0x")
                  ? `${entry.name.slice(0, 6)}...${entry.name.slice(-4)}`
                  : entry.name || "Unknown"}
              </span>
              <span className="font-bold text-right text-black">{entry.finalScore}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 text-center">
          <Link href="/">
            <span className="text-orange-600 underline hover:text-orange-800 cursor-pointer">
              ← Back to Game
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
