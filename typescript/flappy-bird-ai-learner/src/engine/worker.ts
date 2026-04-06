/// <reference lib="webworker" />

/**
 * Evolution Web Worker
 *
 * Runs the GP evolution loop on a background thread so the main thread
 * (React UI + canvas rendering) is never blocked.
 *
 * ─────────────────── Message protocol ────────────────────
 *
 * Messages IN (main thread → worker):
 *
 *   { type: 'start', config: EvolutionConfig }
 *     Initialise a fresh population and begin evolving. Any previous run is
 *     stopped implicitly (the worker module is recreated by the store).
 *
 *   { type: 'stop' }
 *     Exit the evolution loop after the current generation completes.
 *
 *   { type: 'pause' }
 *     Suspend the loop; the worker polls every 100 ms until resumed.
 *
 *   { type: 'resume' }
 *     Resume a paused loop from where it left off.
 *
 *   { type: 'updateConfig', config: EvolutionConfig }
 *     Hot-swap configuration (e.g. mutation rate, speed) without restarting.
 *     Takes effect at the start of the next generation.
 *
 * Messages OUT (worker → main thread):
 *
 *   { type: 'generationComplete', stats: GenerationStats, population: Individual[] }
 *     Emitted after each generation. `stats` contains aggregated metrics;
 *     `population` is the evaluated, fitness-sorted generation (used by the
 *     canvas to visualise the current best individual).
 *
 * ─────────────────── Speed control ───────────────────────
 *
 * At speed < 5× the worker sleeps between generations to allow the UI to
 * animate smoothly. At speed ≥ 5× it yields with `setTimeout(0)` to keep the
 * message queue draining while still running at full CPU speed.
 */

import type { EvolutionConfig, Individual, GenerationStats } from '../types';
import { generateRandomProgram, nextGeneration } from './gp';
import { mulberry32 } from './physics';
import { runGeneration } from './simulation';

type WorkerMessage =
  | { type: 'start'; config: EvolutionConfig }
  | { type: 'stop' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'updateConfig'; config: EvolutionConfig };

type WorkerOutput = {
  type: 'generationComplete';
  stats: GenerationStats;
  population: Individual[];
};

let isRunning = false;
let isPaused = false;
let currentConfig: EvolutionConfig | null = null;
let currentGeneration = 0;
let currentPopulation: Individual[] = [];
let rng = mulberry32(42);

async function runEvolution() {
  if (!currentConfig) return;

  isRunning = true;
  // Re-seed the population RNG so every fresh run is reproducible
  rng = mulberry32(42);

  const config = currentConfig;
  currentPopulation = [];
  for (let i = 0; i < config.populationSize; i++) {
    currentPopulation.push({
      program: generateRandomProgram(config.maxDepth, rng),
      fitness: 0,
      id: `gen0_ind${i}`,
    });
  }

  currentGeneration = 0;

  while (isRunning) {
    if (isPaused) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    // Allow config hot-swaps (e.g. mutation rate change) to take effect
    const activeConfig = currentConfig ?? config;

    // Evaluate the current population and collect stats
    const { population, stats } = runGeneration(
      currentPopulation,
      activeConfig,
      currentGeneration
    );

    currentPopulation = population;
    currentGeneration++;

    // Breed the next generation using a per-generation RNG seed
    const nextRng = mulberry32(currentGeneration * 1337 + 42);
    const nextPrograms = nextGeneration(population, activeConfig, nextRng);
    currentPopulation = nextPrograms.map((program, i) => ({
      program,
      fitness: 0,
      id: `gen${currentGeneration}_ind${i}`,
    }));

    // Send results to the main thread
    const message: WorkerOutput = {
      type: 'generationComplete',
      stats,
      population,
    };

    (self as unknown as Worker).postMessage(message);

    // Throttle based on speed setting to allow UI to remain responsive
    const speed = activeConfig.simulationSpeed;
    if (speed < 5) {
      // Slower speeds: sleep long enough for the canvas to render a frame
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 50 - speed * 10)));
    } else {
      // Full speed: yield to drain the message queue without sleeping
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

(self as unknown as Worker).addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'start':
      currentConfig = msg.config;
      currentGeneration = 0;
      currentPopulation = [];
      isRunning = false;
      isPaused = false;
      // Small delay ensures any pending 'stop' message is processed first
      setTimeout(() => {
        runEvolution();
      }, 10);
      break;

    case 'stop':
      isRunning = false;
      isPaused = false;
      break;

    case 'pause':
      isPaused = true;
      break;

    case 'resume':
      isPaused = false;
      break;

    case 'updateConfig':
      currentConfig = msg.config;
      break;
  }
});
