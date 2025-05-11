// components/HemiFlappy.js (переписано на основе Clumsy Bird)
import { useEffect, useRef, useState } from 'react';

export default function HemiFlappy() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 360;
    canvas.height = 640;

    const bird = {
      x: 60,
      y: 150,
      width: 34,
      height: 24,
      gravity: 0.25,
      lift: -4.6,
      velocity: 0,
      sprite: new Image(),
    };
    bird.sprite.src = '/images/flappy_bird_bird.png';

    const bg = new Image();
    bg.src = '/images/bg.png';
    const fg = new Image();
    fg.src = '/images/fg.png';
    const pipeNorth = new Image();
    pipeNorth.src = '/images/pipeUp.png';
    const pipeSouth = new Image();
    pipeSouth.src = '/images/pipeBottom.png';

    const gap = 120;
    const pipeWidth = 52;
    const pipeList = [{ x: canvas.width, y: -150 }];

    let animationId;

    function draw() {
      ctx.drawImage(bg, 0, 0);

      // Pipes
      for (let i = 0; i < pipeList.length; i++) {
        const p = pipeList[i];

        ctx.drawImage(pipeNorth, p.x, p.y);
        ctx.drawImage(pipeSouth, p.x, p.y + pipeNorth.height + gap);

        p.x -= 2;

        if (p.x === 180) {
          const newY = Math.floor(Math.random() * pipeNorth.height) - pipeNorth.height;
          pipeList.push({ x: canvas.width, y: newY });
        }

        // Collision detection
        if (
          bird.x + bird.width >= p.x &&
          bird.x <= p.x + pipeWidth &&
          (bird.y <= p.y + pipeNorth.height ||
            bird.y + bird.height >= p.y + pipeNorth.height + gap)
        ) {
          cancelAnimationFrame(animationId);
          setTimeout(() => window.location.reload(), 800);
        }

        // Score
        if (p.x + pipeWidth === bird.x) {
          setScore(prev => prev + 1);
        }
      }

      ctx.drawImage(fg, 0, canvas.height - fg.height);

      // Bird physics
      bird.velocity += bird.gravity;
      bird.y += bird.velocity;

      if (bird.y + bird.height >= canvas.height - fg.height) {
        bird.y = canvas.height - fg.height - bird.height;
        cancelAnimationFrame(animationId);
        setTimeout(() => window.location.reload(), 800);
      }

      ctx.drawImage(bird.sprite, bird.x, bird.y);

      // Score text
      ctx.fillStyle = '#000';
      ctx.font = '24px Arial';
      ctx.fillText('Score: ' + score, 10, 30);

      animationId = requestAnimationFrame(draw);
    }

    function jump() {
      bird.velocity = bird.lift;
    }

    document.addEventListener('keydown', jump);
    bird.sprite.onload = draw;

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('keydown', jump);
    };
  }, [score]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-100">
      <canvas ref={canvasRef} className="rounded shadow-lg" />
    </div>
  );
}
