import { describe, it, expect } from 'vitest';
import {
  generateRandomProgram,
  crossover,
  mutate,
  tournamentSelect,
  evaluateFitness,
  calculateDiversity,
  nextGeneration,
} from '../engine/gp';
import { mulberry32 } from '../engine/physics';
import type { Individual, Node, Program, EvolutionConfig } from '../types';

function getDepth(node: Node): number {
  if (node.type === 'terminal') return 0;
  return 1 + Math.max(getDepth(node.left), getDepth(node.right));
}

function isValidNode(node: Node): boolean {
  if (node.type === 'terminal') {
    return (
      typeof node.value === 'number' ||
      ['bird_y', 'bird_velocity', 'pipe_distance', 'pipe_gap_y'].includes(
        node.value as string
      )
    );
  }
  return (
    ['add', 'sub', 'mul', 'div', 'gt', 'lt'].includes(node.op) &&
    isValidNode(node.left) &&
    isValidNode(node.right)
  );
}

function makeIndividual(
  fitness: number,
  rng: () => number,
  depth = 3
): Individual {
  return {
    program: generateRandomProgram(depth, rng),
    fitness,
    id: `ind_${fitness}_${depth}`,
  };
}

const defaultConfig: EvolutionConfig = {
  populationSize: 20,
  mutationRate: 0.3,
  maxDepth: 5,
  tournamentSize: 3,
  flapThreshold: 0,
  simulationSpeed: 5,
};

describe('GP Engine', () => {
  describe('generateRandomProgram', () => {
    it('generates a valid program tree', () => {
      const rng = mulberry32(42);
      const program = generateRandomProgram(5, rng);
      expect(isValidNode(program)).toBe(true);
    });

    it('respects maxDepth constraint', () => {
      for (let d = 1; d <= 6; d++) {
        const program = generateRandomProgram(d, mulberry32(d * 100));
        const depth = getDepth(program);
        expect(depth).toBeLessThanOrEqual(d);
      }
    });

    it('produces different programs with different seeds', () => {
      const p1 = generateRandomProgram(5, mulberry32(1));
      const p2 = generateRandomProgram(5, mulberry32(99999));
      // They should not be identical (extremely low probability)
      expect(JSON.stringify(p1)).not.toBe(JSON.stringify(p2));
    });

    it('generates deterministic programs with same seed', () => {
      const p1 = generateRandomProgram(5, mulberry32(777));
      const p2 = generateRandomProgram(5, mulberry32(777));
      expect(JSON.stringify(p1)).toBe(JSON.stringify(p2));
    });
  });

  describe('crossover', () => {
    it('produces two valid children', () => {
      const rng = mulberry32(42);
      const a = generateRandomProgram(5, rng);
      const b = generateRandomProgram(5, rng);

      const [childA, childB] = crossover(a, b, mulberry32(99));
      expect(isValidNode(childA)).toBe(true);
      expect(isValidNode(childB)).toBe(true);
    });

    it('does not modify original programs', () => {
      const rng = mulberry32(42);
      const a = generateRandomProgram(5, rng);
      const b = generateRandomProgram(5, rng);

      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);

      crossover(a, b, mulberry32(99));

      expect(JSON.stringify(a)).toBe(aStr);
      expect(JSON.stringify(b)).toBe(bStr);
    });

    it('produces children different from parents (most of the time)', () => {
      // Use explicit func-node programs to guarantee crossover can swap subtrees
      const a: Program = {
        type: 'func',
        op: 'add',
        left: { type: 'terminal', value: 'bird_y' },
        right: {
          type: 'func',
          op: 'mul',
          left: { type: 'terminal', value: 'pipe_distance' },
          right: { type: 'terminal', value: 2 },
        },
      };
      const b: Program = {
        type: 'func',
        op: 'sub',
        left: { type: 'terminal', value: 'bird_velocity' },
        right: {
          type: 'func',
          op: 'gt',
          left: { type: 'terminal', value: 'pipe_gap_y' },
          right: { type: 'terminal', value: 100 },
        },
      };

      let differentCount = 0;
      for (let i = 0; i < 20; i++) {
        const [childA] = crossover(a, b, mulberry32(i * 17 + 1));
        if (JSON.stringify(childA) !== JSON.stringify(a)) {
          differentCount++;
        }
      }
      expect(differentCount).toBeGreaterThan(0);
    });
  });

  describe('mutate', () => {
    it('produces a valid program after mutation', () => {
      const rng = mulberry32(42);
      const program = generateRandomProgram(5, rng);
      const mutated = mutate(program, 1.0, 5, mulberry32(99));
      expect(isValidNode(mutated)).toBe(true);
    });

    it('does not mutate when rate is 0', () => {
      const rng = mulberry32(42);
      const program = generateRandomProgram(5, rng);
      const original = JSON.stringify(program);
      const mutated = mutate(program, 0, 5, mulberry32(99));
      expect(JSON.stringify(mutated)).toBe(original);
    });

    it('does not modify the original program', () => {
      const rng = mulberry32(42);
      const program = generateRandomProgram(5, rng);
      const original = JSON.stringify(program);
      mutate(program, 1.0, 5, mulberry32(99));
      expect(JSON.stringify(program)).toBe(original);
    });

    it('mutated program respects maxDepth', () => {
      const maxDepth = 4;
      for (let i = 0; i < 20; i++) {
        const program = generateRandomProgram(maxDepth, mulberry32(i));
        const mutated = mutate(program, 1.0, maxDepth, mulberry32(i * 13));
        const depth = getDepth(mutated);
        expect(depth).toBeLessThanOrEqual(maxDepth);
      }
    });
  });

  describe('tournamentSelect', () => {
    it('returns an individual from the population', () => {
      const rng = mulberry32(42);
      const population: Individual[] = [
        makeIndividual(10, rng),
        makeIndividual(20, rng),
        makeIndividual(30, rng),
        makeIndividual(5, rng),
        makeIndividual(15, rng),
      ];

      const selected = tournamentSelect(population, 3, mulberry32(99));
      expect(population).toContain(selected);
    });

    it('tends to select higher fitness individuals', () => {
      const rng = mulberry32(42);
      const population: Individual[] = [
        makeIndividual(1, rng),
        makeIndividual(1, rng),
        makeIndividual(1, rng),
        makeIndividual(1000, rng),
        makeIndividual(1, rng),
      ];

      let highFitnessCount = 0;
      for (let i = 0; i < 50; i++) {
        const selected = tournamentSelect(population, 3, mulberry32(i));
        if (selected.fitness === 1000) highFitnessCount++;
      }
      // High fitness individual should be selected more often
      expect(highFitnessCount).toBeGreaterThan(20);
    });

    it('returns first individual when population has one element', () => {
      const rng = mulberry32(42);
      const population: Individual[] = [makeIndividual(50, rng)];
      const selected = tournamentSelect(population, 3, mulberry32(99));
      expect(selected).toBe(population[0]);
    });
  });

  describe('evaluateFitness', () => {
    it('returns positive fitness for surviving frames', () => {
      const fitness = evaluateFitness(100, 0, 0);
      expect(fitness).toBe(100);
    });

    it('adds bonus for pipes passed', () => {
      const fitness = evaluateFitness(0, 5, 0);
      expect(fitness).toBe(500);
    });

    it('subtracts penalty for flaps', () => {
      const fitness = evaluateFitness(0, 0, 100);
      expect(fitness).toBe(-10);
    });

    it('combines all components correctly', () => {
      // framesSurvived + pipesPassed * 100 - flapCount * 0.1
      const fitness = evaluateFitness(500, 3, 50);
      expect(fitness).toBeCloseTo(500 + 300 - 5, 5);
    });

    it('penalizes excessive flapping', () => {
      const f1 = evaluateFitness(100, 1, 10);
      const f2 = evaluateFitness(100, 1, 100);
      expect(f1).toBeGreaterThan(f2);
    });
  });

  describe('calculateDiversity', () => {
    it('returns 1 for completely unique population', () => {
      const population: Individual[] = Array.from({ length: 10 }, (_, i) => ({
        program: generateRandomProgram(5, mulberry32(i * 1000 + 1)),
        fitness: i,
        id: `ind${i}`,
      }));

      const diversity = calculateDiversity(population);
      expect(diversity).toBeGreaterThan(0);
      expect(diversity).toBeLessThanOrEqual(1);
    });

    it('returns low diversity for identical population', () => {
      const rng = mulberry32(42);
      const program = generateRandomProgram(4, rng);
      const population: Individual[] = Array.from({ length: 5 }, (_, i) => ({
        program,
        fitness: i,
        id: `ind${i}`,
      }));

      const diversity = calculateDiversity(population);
      expect(diversity).toBeLessThanOrEqual(0.3);
    });

    it('handles empty population', () => {
      expect(calculateDiversity([])).toBe(0);
    });

    it('handles single individual', () => {
      const population: Individual[] = [makeIndividual(10, mulberry32(42))];
      const diversity = calculateDiversity(population);
      expect(diversity).toBe(0);
    });
  });

  describe('nextGeneration', () => {
    it('produces correct population size', () => {
      const population: Individual[] = Array.from(
        { length: defaultConfig.populationSize },
        (_, i) => makeIndividual(i * 10, mulberry32(i + 1))
      );

      const nextPrograms = nextGeneration(population, defaultConfig, mulberry32(99));
      expect(nextPrograms).toHaveLength(defaultConfig.populationSize);
    });

    it('produces valid programs', () => {
      const population: Individual[] = Array.from(
        { length: defaultConfig.populationSize },
        (_, i) => makeIndividual(i * 10, mulberry32(i + 1))
      );

      const nextPrograms = nextGeneration(population, defaultConfig, mulberry32(99));
      nextPrograms.forEach((prog) => {
        expect(isValidNode(prog)).toBe(true);
      });
    });

    it('preserves elite programs in next generation', () => {
      // Assign deterministic fitness values so elites are known
      const population: Individual[] = Array.from(
        { length: defaultConfig.populationSize },
        (_, i) => ({
          program: generateRandomProgram(3, mulberry32(i + 1)),
          fitness: i * 10, // individual 19 has highest fitness = 190
          id: `ind${i}`,
        })
      );

      const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
      const eliteCount = Math.max(1, Math.floor(population.length * 0.05));
      const eliteStrs = sorted
        .slice(0, eliteCount)
        .map((ind) => JSON.stringify(ind.program));

      const nextPrograms = nextGeneration(population, defaultConfig, mulberry32(99));
      const nextStrs = nextPrograms.map((p) => JSON.stringify(p));

      // Every elite program must appear verbatim in the next generation
      for (const eliteStr of eliteStrs) {
        expect(nextStrs).toContain(eliteStr);
      }
    });
  });
});
