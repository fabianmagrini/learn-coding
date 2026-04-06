import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';
import type { Program } from '../types';

const terminalProgram: Program = { type: 'terminal', value: 0 };

const defaultConfig = {
  populationSize: 50,
  mutationRate: 0.1,
  maxDepth: 5,
  tournamentSize: 3,
  flapThreshold: 0,
  simulationSpeed: 5,
};

function resetStore() {
  useStore.setState({
    config: { ...defaultConfig },
    isRunning: false,
    isPaused: false,
    generation: 0,
    stats: [],
    currentPopulation: [],
    bestIndividual: null,
    replayIndividual: null,
    worker: null,
  });
}

describe('useStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('default state', () => {
    it('has correct default config', () => {
      const { config } = useStore.getState();
      expect(config.populationSize).toBe(50);
      expect(config.mutationRate).toBe(0.1);
      expect(config.maxDepth).toBe(5);
      expect(config.tournamentSize).toBe(3);
      expect(config.flapThreshold).toBe(0);
      expect(config.simulationSpeed).toBe(5);
    });

    it('starts not running and not paused', () => {
      const { isRunning, isPaused } = useStore.getState();
      expect(isRunning).toBe(false);
      expect(isPaused).toBe(false);
    });

    it('starts at generation 0', () => {
      expect(useStore.getState().generation).toBe(0);
    });

    it('starts with empty stats and population', () => {
      expect(useStore.getState().stats).toHaveLength(0);
      expect(useStore.getState().currentPopulation).toHaveLength(0);
    });

    it('starts with null best and replay individuals', () => {
      expect(useStore.getState().bestIndividual).toBeNull();
      expect(useStore.getState().replayIndividual).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('merges a partial config update', () => {
      useStore.getState().updateConfig({ populationSize: 100 });
      const { config } = useStore.getState();
      expect(config.populationSize).toBe(100);
      expect(config.mutationRate).toBe(0.1); // unchanged
    });

    it('updates multiple fields at once', () => {
      useStore.getState().updateConfig({ mutationRate: 0.3, maxDepth: 6 });
      const { config } = useStore.getState();
      expect(config.mutationRate).toBe(0.3);
      expect(config.maxDepth).toBe(6);
    });

    it('does not modify other config fields', () => {
      useStore.getState().updateConfig({ simulationSpeed: 10 });
      const { config } = useStore.getState();
      expect(config.populationSize).toBe(50);
      expect(config.mutationRate).toBe(0.1);
      expect(config.maxDepth).toBe(5);
      expect(config.tournamentSize).toBe(3);
      expect(config.flapThreshold).toBe(0);
    });
  });

  describe('addStats', () => {
    it('appends a stats entry', () => {
      const stats = {
        generation: 1,
        bestFitness: 100,
        avgFitness: 50,
        diversity: 0.8,
        bestProgram: terminalProgram,
      };
      useStore.getState().addStats(stats);
      expect(useStore.getState().stats).toHaveLength(1);
      expect(useStore.getState().stats[0]).toEqual(stats);
    });

    it('accumulates multiple entries in order', () => {
      useStore.getState().addStats({
        generation: 1, bestFitness: 100, avgFitness: 50, diversity: 0.8, bestProgram: terminalProgram,
      });
      useStore.getState().addStats({
        generation: 2, bestFitness: 150, avgFitness: 75, diversity: 0.7, bestProgram: terminalProgram,
      });
      const { stats } = useStore.getState();
      expect(stats).toHaveLength(2);
      expect(stats[0].generation).toBe(1);
      expect(stats[1].generation).toBe(2);
    });
  });

  describe('setPopulation', () => {
    it('replaces the current population', () => {
      const pop = [{ program: terminalProgram, fitness: 100, id: 'ind1' }];
      useStore.getState().setPopulation(pop);
      expect(useStore.getState().currentPopulation).toEqual(pop);
    });

    it('replaces a non-empty population with a new one', () => {
      useStore.getState().setPopulation([
        { program: terminalProgram, fitness: 10, id: 'a' },
        { program: terminalProgram, fitness: 20, id: 'b' },
      ]);
      useStore.getState().setPopulation([{ program: terminalProgram, fitness: 99, id: 'c' }]);
      expect(useStore.getState().currentPopulation).toHaveLength(1);
      expect(useStore.getState().currentPopulation[0].id).toBe('c');
    });
  });

  describe('replayBest', () => {
    it('sets replayIndividual to bestIndividual', () => {
      const best = { program: terminalProgram, fitness: 200, id: 'best' };
      useStore.setState({ bestIndividual: best });
      useStore.getState().replayBest();
      expect(useStore.getState().replayIndividual).toBe(best);
    });

    it('does nothing when bestIndividual is null', () => {
      useStore.getState().replayBest();
      expect(useStore.getState().replayIndividual).toBeNull();
    });

    it('updates replayIndividual when called again with a newer best', () => {
      const first = { program: terminalProgram, fitness: 100, id: 'first' };
      useStore.setState({ bestIndividual: first });
      useStore.getState().replayBest();
      expect(useStore.getState().replayIndividual?.id).toBe('first');

      const second = { program: terminalProgram, fitness: 200, id: 'second' };
      useStore.setState({ bestIndividual: second });
      useStore.getState().replayBest();
      expect(useStore.getState().replayIndividual?.id).toBe('second');
    });
  });

  describe('pauseEvolution', () => {
    it('sets isPaused to true without a worker', () => {
      useStore.setState({ isRunning: true, worker: null });
      useStore.getState().pauseEvolution();
      expect(useStore.getState().isPaused).toBe(true);
    });
  });

  describe('resumeEvolution', () => {
    it('sets isPaused to false without a worker', () => {
      useStore.setState({ isRunning: true, isPaused: true, worker: null });
      useStore.getState().resumeEvolution();
      expect(useStore.getState().isPaused).toBe(false);
    });
  });

  describe('stopEvolution', () => {
    it('sets isRunning and isPaused to false', () => {
      useStore.setState({ isRunning: true, isPaused: true });
      useStore.getState().stopEvolution();
      expect(useStore.getState().isRunning).toBe(false);
      expect(useStore.getState().isPaused).toBe(false);
    });

    it('clears the worker reference', () => {
      useStore.setState({ worker: null });
      useStore.getState().stopEvolution();
      expect(useStore.getState().worker).toBeNull();
    });
  });
});
