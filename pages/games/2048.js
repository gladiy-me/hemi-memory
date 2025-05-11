// pages/games/2048.js
import dynamic from 'next/dynamic';

const Game2048 = dynamic(() => import('../../components/Game2048'), { ssr: false });

export default function Game2048Page() {
  return <Game2048 />;
}