import type {
  Individual,
  GameState,
  EvolutionConfig,
  Variable,
  GenerationStats,
} from '../types';
import { createGameState, tickGame, GAME_HEIGHT, BIRD_X, PIPE_WIDTH } from './physics';
import { evaluateFitness, calculateDiversity } from './gp';
import { executeProgram } from './executor';

/**
 * Maximum number of frames a single individual is simulated before its run
 * ends. Prevents infinite loops for programs that never die (e.g. a perfect
 * centering strategy). Fitness is scored from the capped run.
 */
export const MAX_FRAMES = 2000;

/**
 * Run one individual's program headlessly through a full game simulation and
 * return the individual with its fitness score set.
 *
 * Each frame:
 *  1. Build the GP variable context from the current game state:
 *     - `bird_y`         — vertical position (pixels from top; 0 = ceiling)
 *     - `bird_velocity`  — current vertical velocity (negative = moving up)
 *     - `pipe_distance`  — horizontal gap between the bird and the next pipe
 *                          (pixels; 400 if no pipe is on screen yet)
 *     - `pipe_gap_y`     — vertical **centre** of the next pipe's gap (pixels
 *                          from top; GAME_HEIGHT/2 if no pipe is on screen)
 *  2. Evaluate the program tree with those variables.
 *  3. Flap if the output exceeds `config.flapThreshold` (default 0).
 *  4. Advance physics one tick.
 *
 * The simulation stops when the bird dies or `MAX_FRAMES` is reached.
 *
 * Determinism: the same `seed` always produces the same pipe layout and
 * therefore the same fitness for the same program.
 *
 * @param individual - The GP individual to evaluate (not mutated).
 * @param config     - Evolution configuration; `flapThreshold` is read here.
 * @param seed       - Base seed for the game's PRNG (passed to `tickGame`).
 * @returns A new individual object with `fitness` set.
 */
export function simulateIndividual(
  individual: Individual,
  config: EvolutionConfig,
  seed: number
): Individual {
  let gameState: GameState = createGameState(1, seed);
  const flapThreshold = config.flapThreshold;

  let frame = 0;
  while (frame < MAX_FRAMES && gameState.birds[0]?.alive) {
    const bird = gameState.birds[0];

    // Find the next pipe whose right edge is still ahead of the bird.
    // If no pipe is on screen yet, use safe default sensor values.
    const pipe = gameState.pipes.find((p) => p.x + PIPE_WIDTH > BIRD_X);

    const vars: Record<Variable, number> = {
      bird_y: bird.y,
      bird_velocity: bird.velocity,
      // Positive value: how far the bird still needs to travel to reach the pipe
      pipe_distance: pipe ? pipe.x - BIRD_X : 400,
      // Centre of the pipe's gap; the optimal target for the bird's y position
      pipe_gap_y: pipe ? pipe.gapY + pipe.gapHeight / 2 : GAME_HEIGHT / 2,
    };

    const output = executeProgram(individual.program, vars);
    const shouldFlap = output > flapThreshold;

    gameState = tickGame(gameState, [shouldFlap], seed + frame);
    frame++;
  }

  const bird = gameState.birds[0];
  const fitness = bird
    ? evaluateFitness(bird.framesSurvived, bird.pipesPassed, bird.flapCount)
    : 0;

  return { ...individual, fitness };
}

/**
 * Evaluate every individual in `population`, sort by fitness, and compute
 * generation-level statistics.
 *
 * All individuals in a generation share the same pipe layout, derived from
 * `generationNum`. This ensures fair comparison: every bird faces identical
 * obstacles.  Different generation numbers produce different layouts, so
 * programs cannot overfit to a single environment.
 *
 * Pipe-layout seed formula: `generationNum × 1337 + 42`
 *
 * @param population    - Unevaluated (or previously evaluated) individuals.
 * @param config        - Evolution configuration.
 * @param generationNum - Zero-based generation index; determines the pipe seed.
 * @returns An object containing:
 *   - `population` — individuals sorted by fitness descending, with scores set.
 *   - `stats`      — aggregated metrics for this generation.
 */
export function runGeneration(
  population: Individual[],
  config: EvolutionConfig,
  generationNum: number
): { population: Individual[]; stats: GenerationStats } {
  // Derive a deterministic seed from the generation index so each generation
  // uses a consistent but distinct pipe layout across all individuals.
  const seed = generationNum * 1337 + 42;

  const evaluated = population.map((ind) =>
    simulateIndividual(ind, config, seed)
  );

  evaluated.sort((a, b) => b.fitness - a.fitness);

  const bestFitness = evaluated[0]?.fitness ?? 0;
  const avgFitness =
    evaluated.reduce((sum, ind) => sum + ind.fitness, 0) / evaluated.length;
  const diversity = calculateDiversity(evaluated);
  const bestProgram = evaluated[0]?.program;

  const stats: GenerationStats = {
    generation: generationNum,
    bestFitness,
    avgFitness,
    diversity,
    bestProgram,
  };

  return { population: evaluated, stats };
}
