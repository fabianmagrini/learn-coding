import { create } from 'zustand';
import type { EvolutionConfig, Individual, GenerationStats } from '../types';

interface StoreState {
  config: EvolutionConfig;
  isRunning: boolean;
  isPaused: boolean;
  generation: number;
  stats: GenerationStats[];
  currentPopulation: Individual[];
  bestIndividual: Individual | null;
  replayIndividual: Individual | null;
  worker: Worker | null;

  // actions
  startEvolution(): void;
  stopEvolution(): void;
  pauseEvolution(): void;
  resumeEvolution(): void;
  updateConfig(partial: Partial<EvolutionConfig>): void;
  replayBest(): void;
  addStats(stats: GenerationStats): void;
  setPopulation(pop: Individual[]): void;
}

const defaultConfig: EvolutionConfig = {
  populationSize: 50,
  mutationRate: 0.1,
  maxDepth: 5,
  tournamentSize: 3,
  flapThreshold: 0,
  simulationSpeed: 5,
};

export const useStore = create<StoreState>((set, get) => ({
  config: defaultConfig,
  isRunning: false,
  isPaused: false,
  generation: 0,
  stats: [],
  currentPopulation: [],
  bestIndividual: null,
  replayIndividual: null,
  worker: null,

  startEvolution() {
    const { worker: existingWorker, config } = get();

    // Terminate existing worker if any
    if (existingWorker) {
      existingWorker.terminate();
    }

    const worker = new Worker(
      new URL('../engine/worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event) => {
      const { type, stats, population } = event.data;
      if (type === 'generationComplete') {
        const state = get();
        const bestInPop = population.reduce(
          (best: Individual | null, ind: Individual) =>
            best === null || ind.fitness > best.fitness ? ind : best,
          null
        );

        set((s) => ({
          generation: stats.generation,
          stats: [...s.stats, stats].slice(-200), // keep last 200
          currentPopulation: population,
          bestIndividual:
            state.bestIndividual === null ||
            (bestInPop && bestInPop.fitness > state.bestIndividual.fitness)
              ? bestInPop
              : state.bestIndividual,
        }));
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
    };

    worker.postMessage({ type: 'start', config });

    set({
      worker,
      isRunning: true,
      isPaused: false,
      generation: 0,
      stats: [],
      currentPopulation: [],
      bestIndividual: null,
      replayIndividual: null,
    });
  },

  stopEvolution() {
    const { worker } = get();
    if (worker) {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    }
    set({ isRunning: false, isPaused: false, worker: null });
  },

  pauseEvolution() {
    const { worker } = get();
    if (worker) {
      worker.postMessage({ type: 'pause' });
    }
    set({ isPaused: true });
  },

  resumeEvolution() {
    const { worker } = get();
    if (worker) {
      worker.postMessage({ type: 'resume' });
    }
    set({ isPaused: false });
  },

  updateConfig(partial) {
    const { worker } = get();
    set((s) => {
      const newConfig = { ...s.config, ...partial };
      if (worker) {
        worker.postMessage({ type: 'updateConfig', config: newConfig });
      }
      return { config: newConfig };
    });
  },

  replayBest() {
    const { bestIndividual } = get();
    if (bestIndividual) {
      set({ replayIndividual: bestIndividual });
    }
  },

  addStats(stats) {
    set((s) => ({ stats: [...s.stats, stats] }));
  },

  setPopulation(pop) {
    set({ currentPopulation: pop });
  },
}));
