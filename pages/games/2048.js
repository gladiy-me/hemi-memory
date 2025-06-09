// pages/games/2048.js
import dynamic from 'next/dynamic'

// отключаем SSR, чтобы внутри Game2048 спокойно работал window, wagmi и т.п.
const Game2048 = dynamic(() => import('../../components/Game2048'), {
  ssr: false,
})

export default function Page2048() {
  return <Game2048 />
}
