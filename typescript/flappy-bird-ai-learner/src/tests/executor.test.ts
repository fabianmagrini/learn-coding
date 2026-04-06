import { describe, it, expect } from 'vitest';
import { executeProgram } from '../engine/executor';
import type { Program, Variable } from '../types';

const defaultVars: Record<Variable, number> = {
  bird_y: 300,
  bird_velocity: -2,
  pipe_distance: 150,
  pipe_gap_y: 250,
};

describe('Executor', () => {
  describe('operators', () => {
    it('add: correctly adds two values', () => {
      const program: Program = {
        type: 'func',
        op: 'add',
        left: { type: 'terminal', value: 3 },
        right: { type: 'terminal', value: 4 },
      };
      expect(executeProgram(program, defaultVars)).toBe(7);
    });

    it('sub: correctly subtracts two values', () => {
      const program: Program = {
        type: 'func',
        op: 'sub',
        left: { type: 'terminal', value: 10 },
        right: { type: 'terminal', value: 3 },
      };
      expect(executeProgram(program, defaultVars)).toBe(7);
    });

    it('mul: correctly multiplies two values', () => {
      const program: Program = {
        type: 'func',
        op: 'mul',
        left: { type: 'terminal', value: 4 },
        right: { type: 'terminal', value: 5 },
      };
      expect(executeProgram(program, defaultVars)).toBe(20);
    });

    it('div: correctly divides two values', () => {
      const program: Program = {
        type: 'func',
        op: 'div',
        left: { type: 'terminal', value: 10 },
        right: { type: 'terminal', value: 4 },
      };
      expect(executeProgram(program, defaultVars)).toBe(2.5);
    });

    it('gt: returns 1 when left > right', () => {
      const program: Program = {
        type: 'func',
        op: 'gt',
        left: { type: 'terminal', value: 5 },
        right: { type: 'terminal', value: 3 },
      };
      expect(executeProgram(program, defaultVars)).toBe(1);
    });

    it('gt: returns -1 when left <= right', () => {
      const program: Program = {
        type: 'func',
        op: 'gt',
        left: { type: 'terminal', value: 3 },
        right: { type: 'terminal', value: 5 },
      };
      expect(executeProgram(program, defaultVars)).toBe(-1);
    });

    it('lt: returns 1 when left < right', () => {
      const program: Program = {
        type: 'func',
        op: 'lt',
        left: { type: 'terminal', value: 2 },
        right: { type: 'terminal', value: 8 },
      };
      expect(executeProgram(program, defaultVars)).toBe(1);
    });

    it('lt: returns -1 when left >= right', () => {
      const program: Program = {
        type: 'func',
        op: 'lt',
        left: { type: 'terminal', value: 8 },
        right: { type: 'terminal', value: 2 },
      };
      expect(executeProgram(program, defaultVars)).toBe(-1);
    });
  });

  describe('division by zero', () => {
    it('returns 0 when dividing by zero', () => {
      const program: Program = {
        type: 'func',
        op: 'div',
        left: { type: 'terminal', value: 10 },
        right: { type: 'terminal', value: 0 },
      };
      expect(executeProgram(program, defaultVars)).toBe(0);
    });
  });

  describe('variable resolution', () => {
    it('resolves bird_y variable', () => {
      const program: Program = { type: 'terminal', value: 'bird_y' };
      expect(executeProgram(program, defaultVars)).toBe(300);
    });

    it('resolves bird_velocity variable', () => {
      const program: Program = { type: 'terminal', value: 'bird_velocity' };
      expect(executeProgram(program, defaultVars)).toBe(-2);
    });

    it('resolves pipe_distance variable', () => {
      const program: Program = { type: 'terminal', value: 'pipe_distance' };
      expect(executeProgram(program, defaultVars)).toBe(150);
    });

    it('resolves pipe_gap_y variable', () => {
      const program: Program = { type: 'terminal', value: 'pipe_gap_y' };
      expect(executeProgram(program, defaultVars)).toBe(250);
    });
  });

  describe('nested expressions', () => {
    it('evaluates nested expression: (bird_y - pipe_gap_y)', () => {
      const program: Program = {
        type: 'func',
        op: 'sub',
        left: { type: 'terminal', value: 'bird_y' },
        right: { type: 'terminal', value: 'pipe_gap_y' },
      };
      // 300 - 250 = 50
      expect(executeProgram(program, defaultVars)).toBe(50);
    });

    it('evaluates deeply nested expression', () => {
      // ((bird_y - pipe_gap_y) * 2) + bird_velocity
      const program: Program = {
        type: 'func',
        op: 'add',
        left: {
          type: 'func',
          op: 'mul',
          left: {
            type: 'func',
            op: 'sub',
            left: { type: 'terminal', value: 'bird_y' },
            right: { type: 'terminal', value: 'pipe_gap_y' },
          },
          right: { type: 'terminal', value: 2 },
        },
        right: { type: 'terminal', value: 'bird_velocity' },
      };
      // ((300 - 250) * 2) + (-2) = 100 - 2 = 98
      expect(executeProgram(program, defaultVars)).toBe(98);
    });
  });

  describe('output clamping', () => {
    it('clamps output to maximum 1000', () => {
      const program: Program = {
        type: 'func',
        op: 'mul',
        left: { type: 'terminal', value: 1000000 },
        right: { type: 'terminal', value: 1000000 },
      };
      expect(executeProgram(program, defaultVars)).toBe(1000);
    });

    it('clamps output to minimum -1000', () => {
      const program: Program = {
        type: 'func',
        op: 'mul',
        left: { type: 'terminal', value: -1000000 },
        right: { type: 'terminal', value: 1000000 },
      };
      expect(executeProgram(program, defaultVars)).toBe(-1000);
    });

    it('does not clamp values within range', () => {
      const program: Program = { type: 'terminal', value: 500 };
      expect(executeProgram(program, defaultVars)).toBe(500);
    });
  });

  describe('constant terminal', () => {
    it('returns constant value', () => {
      const program: Program = { type: 'terminal', value: 42 };
      expect(executeProgram(program, defaultVars)).toBe(42);
    });

    it('returns negative constant', () => {
      const program: Program = { type: 'terminal', value: -7.5 };
      expect(executeProgram(program, defaultVars)).toBe(-7.5);
    });
  });
});
