import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { createGameState, tickGame, GAME_WIDTH, GAME_HEIGHT, PIPE_WIDTH, BIRD_X, BIRD_RADIUS } from '../engine/physics';
import { executeProgram } from '../engine/executor';
import type { GameState, Variable } from '../types';

const CANVAS_SCALE = 1;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentPopulation, bestIndividual, replayIndividual, isRunning, config } = useStore();
  const animFrameRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const frameRef = useRef(0);

  // Replay mode: simulate replayIndividual's game
  useEffect(() => {
    if (!replayIndividual) {
      gameStateRef.current = null;
      frameRef.current = 0;
    } else {
      gameStateRef.current = createGameState(1, 42);
      frameRef.current = 0;
    }
  }, [replayIndividual]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    function drawFrame() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      skyGrad.addColorStop(0, '#70c5ce');
      skyGrad.addColorStop(1, '#b8e0e8');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Ground
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);
      ctx.fillStyle = '#5da13b';
      ctx.fillRect(0, GAME_HEIGHT - 25, GAME_WIDTH, 8);

      if (replayIndividual && gameStateRef.current) {
        // Replay mode
        const state = gameStateRef.current;
        const bird = state.birds[0];

        if (!bird || !bird.alive) {
          // Reset after death
          gameStateRef.current = createGameState(1, 42);
          frameRef.current = 0;
        } else {
          // Tick
          const pipe = state.pipes.find((p) => p.x + PIPE_WIDTH > BIRD_X);
          const vars: Record<Variable, number> = {
            bird_y: bird.y,
            bird_velocity: bird.velocity,
            pipe_distance: pipe ? pipe.x - BIRD_X : 400,
            pipe_gap_y: pipe ? pipe.gapY + pipe.gapHeight / 2 : GAME_HEIGHT / 2,
          };
          const output = executeProgram(replayIndividual.program, vars);
          const shouldFlap = output > config.flapThreshold;
          gameStateRef.current = tickGame(state, [shouldFlap], 42 + frameRef.current);
          frameRef.current++;
        }

        // Draw pipes
        drawPipes(ctx, gameStateRef.current);

        // Draw bird
        const b = gameStateRef.current.birds[0];
        if (b) {
          drawBird(ctx, BIRD_X, b.y, '#FFD700', true);
        }

        // Score overlay
        drawOverlay(ctx, {
          mode: 'Replay',
          pipes: b?.pipesPassed ?? 0,
          alive: b?.alive ? 1 : 0,
          generation: 0,
        });
      } else if (isRunning && currentPopulation.length > 0) {
        // Live visualization - show current population state
        // We simulate a few frames of top birds for visual
        const topBirds = [...currentPopulation]
          .sort((a, b) => b.fitness - a.fitness)
          .slice(0, 10);

        // Show static representation of population fitness
        // Draw a live game of the best individual
        if (bestIndividual) {
          if (!gameStateRef.current || frameRef.current > 2000) {
            gameStateRef.current = createGameState(1, 42);
            frameRef.current = 0;
          }

          const state = gameStateRef.current;
          const bird = state.birds[0];

          if (!bird || !bird.alive) {
            gameStateRef.current = createGameState(1, 42);
            frameRef.current = 0;
          } else {
            const pipe = state.pipes.find((p) => p.x + PIPE_WIDTH > BIRD_X);
            const vars: Record<Variable, number> = {
              bird_y: bird.y,
              bird_velocity: bird.velocity,
              pipe_distance: pipe ? pipe.x - BIRD_X : 400,
              pipe_gap_y: pipe ? pipe.gapY + pipe.gapHeight / 2 : GAME_HEIGHT / 2,
            };
            const output = executeProgram(bestIndividual.program, vars);
            const shouldFlap = output > config.flapThreshold;
            gameStateRef.current = tickGame(state, [shouldFlap], 42 + frameRef.current);
            frameRef.current++;
          }

          drawPipes(ctx, gameStateRef.current);

          // Draw ghost birds (top birds visual indicators)
          topBirds.forEach((_, i) => {
            const ghostY = 50 + i * 50;
            if (ghostY < GAME_HEIGHT - 30) {
              ctx.globalAlpha = 0.2;
              drawBird(ctx, BIRD_X - 10 + i * 5, ghostY, '#888', false);
              ctx.globalAlpha = 1;
            }
          });

          const b = gameStateRef.current.birds[0];
          if (b) {
            drawBird(ctx, BIRD_X, b.y, '#FFD700', true);
          }

          const aliveCount = currentPopulation.filter((ind) => ind.fitness > 0).length;
          drawOverlay(ctx, {
            mode: 'Running',
            pipes: b?.pipesPassed ?? 0,
            alive: aliveCount,
            generation: useStore.getState().generation,
          });
        } else {
          drawIdleScreen(ctx);
        }
      } else {
        drawIdleScreen(ctx);
      }

      animId = requestAnimationFrame(drawFrame);
    }

    animId = requestAnimationFrame(drawFrame);
    animFrameRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [currentPopulation, bestIndividual, replayIndividual, isRunning, config]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH * CANVAS_SCALE}
      height={GAME_HEIGHT * CANVAS_SCALE}
      style={{ border: '2px solid #333', borderRadius: '4px', display: 'block' }}
    />
  );
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  highlight: boolean
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, BIRD_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  if (highlight) {
    ctx.strokeStyle = '#FF8C00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye
    ctx.beginPath();
    ctx.arc(x + 5, y - 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 6, y - 3, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();

    // Beak
    ctx.beginPath();
    ctx.moveTo(x + BIRD_RADIUS, y);
    ctx.lineTo(x + BIRD_RADIUS + 6, y - 2);
    ctx.lineTo(x + BIRD_RADIUS + 6, y + 2);
    ctx.closePath();
    ctx.fillStyle = '#FFA500';
    ctx.fill();
  }
  ctx.restore();
}

function drawPipes(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const pipe of state.pipes) {
    // Top pipe
    ctx.fillStyle = '#5cb85c';
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
    // Top pipe cap
    ctx.fillStyle = '#4cae4c';
    ctx.fillRect(pipe.x - 5, pipe.gapY - 20, PIPE_WIDTH + 10, 20);

    // Bottom pipe
    const bottomStart = pipe.gapY + pipe.gapHeight;
    ctx.fillStyle = '#5cb85c';
    ctx.fillRect(pipe.x, bottomStart, PIPE_WIDTH, GAME_HEIGHT - bottomStart);
    // Bottom pipe cap
    ctx.fillStyle = '#4cae4c';
    ctx.fillRect(pipe.x - 5, bottomStart, PIPE_WIDTH + 10, 20);
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  info: { mode: string; pipes: number; alive: number; generation: number }
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(5, 5, 160, 90);

  ctx.fillStyle = 'white';
  ctx.font = '12px monospace';
  ctx.fillText(`Mode: ${info.mode}`, 10, 22);
  ctx.fillText(`Gen: ${info.generation}`, 10, 38);
  ctx.fillText(`Pipes: ${info.pipes}`, 10, 54);
  ctx.fillText(`Alive: ${info.alive}`, 10, 70);
  ctx.restore();
}

function drawIdleScreen(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Flappy Bird AI', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
  ctx.font = '16px sans-serif';
  ctx.fillText('Press Start to begin evolution', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
  ctx.textAlign = 'left';
}
