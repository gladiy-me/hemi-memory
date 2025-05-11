// pages/games/memory.js
import dynamic from 'next/dynamic';

// Включаем динамическую загрузку, чтобы избежать проблем с SSR
const MemoryGame = dynamic(() => import('../components/MemoryGame'), { ssr: false });

export default function MemoryPage() {
  return <MemoryGame />;
}
