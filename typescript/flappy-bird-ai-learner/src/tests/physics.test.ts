import { describe, it, expect } from 'vitest';
import {
  createGameState,
  tickGame,
  mulberry32,
  GRAVITY,
  FLAP_STRENGTH,
  PIPE_INTERVAL,
  GAME_HEIGHT,
  GAME_WIDTH,
  BIRD_RADIUS,
} from '../engine/physics';

describe('Physics Engine', () => {
  describe('mulberry32 PRNG', () => {
    it('produces values between 0 and 1', () => {
      const rng = mulberry32(12345);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('produces deterministic output for same seed', () => {
      const rng1 = mulberry32(42);
      const rng2 = mulberry32(42);
      for (let i = 0; i < 20; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it('produces different output for different seeds', () => {
      const rng1 = mulberry32(1);
      const rng2 = mulberry32(2);
      const vals1 = Array.from({ length: 10 }, () => rng1());
      const vals2 = Array.from({ length: 10 }, () => rng2());
      expect(vals1).not.toEqual(vals2);
    });
  });

  describe('createGameState', () => {
    it('creates state with the correct number of birds', () => {
      const state = createGameState(5, 42);
      expect(state.birds).toHaveLength(5);
    });

    it('creates birds at vertical center', () => {
      const state = createGameState(3, 42);
      state.birds.forEach((bird) => {
        expect(bird.y).toBe(GAME_HEIGHT / 2);
        expect(bird.velocity).toBe(0);
        expect(bird.alive).toBe(true);
      });
    });

    it('creates empty pipes initially', () => {
      const state = createGameState(1, 42);
      expect(state.pipes).toHaveLength(0);
    });

    it('starts at frame 0', () => {
      const state = createGameState(1, 42);
      expect(state.frame).toBe(0);
    });
  });

  describe('tickGame determinism', () => {
    it('same seed produces same game state after multiple ticks', () => {
      const state1 = createGameState(3, 42);
      const state2 = createGameState(3, 42);

      let s1 = state1;
      let s2 = state2;

      for (let i = 0; i < 100; i++) {
        const flaps = [false, true, false];
        s1 = tickGame(s1, flaps, 42);
        s2 = tickGame(s2, flaps, 42);
      }

      expect(s1.birds[0].y).toBe(s2.birds[0].y);
      expect(s1.pipes.length).toBe(s2.pipes.length);
      expect(s1.frame).toBe(s2.frame);
    });
  });

  describe('gravity', () => {
    it('applies gravity to bird velocity each frame', () => {
      const state = createGameState(1, 42);
      const initialVelocity = state.birds[0].velocity;
      expect(initialVelocity).toBe(0);

      const nextState = tickGame(state, [false], 42);
      expect(nextState.birds[0].velocity).toBe(initialVelocity + GRAVITY);
    });

    it('bird falls due to gravity without flap', () => {
      const state = createGameState(1, 42);
      let s = state;
      for (let i = 0; i < 5; i++) {
        s = tickGame(s, [false], 42);
      }
      expect(s.birds[0].y).toBeGreaterThan(state.birds[0].y);
    });
  });

  describe('flap', () => {
    it('flap applies FLAP_STRENGTH to velocity', () => {
      const state = createGameState(1, 42);
      const nextState = tickGame(state, [true], 42);
      expect(nextState.birds[0].velocity).toBe(FLAP_STRENGTH);
    });

    it('flap increases flapCount', () => {
      const state = createGameState(1, 42);
      expect(state.birds[0].flapCount).toBe(0);
      const nextState = tickGame(state, [true], 42);
      expect(nextState.birds[0].flapCount).toBe(1);
    });

    it('flap makes bird go up compared to no flap', () => {
      // Let bird fall for 5 frames to build up downward velocity
      let stateBase = createGameState(1, 42);
      for (let i = 0; i < 5; i++) {
        stateBase = tickGame(stateBase, [false], 42);
      }

      // Apply one tick with flap vs without — from identical state
      const afterFlap = tickGame(stateBase, [true], 42);
      const afterNoFlap = tickGame(stateBase, [false], 42);

      // Bird that flapped should be higher (lower y value = higher on screen)
      expect(afterFlap.birds[0].y).toBeLessThan(afterNoFlap.birds[0].y);
      expect(afterFlap.birds[0].velocity).toBe(FLAP_STRENGTH);
    });
  });

  describe('pipe creation', () => {
    it('creates pipes at PIPE_INTERVAL frames', () => {
      let state = createGameState(1, 42);

      // Tick to just before interval
      for (let i = 0; i < PIPE_INTERVAL - 1; i++) {
        state = tickGame(state, [false], 42 + i);
      }
      expect(state.pipes).toHaveLength(0);

      // One more tick should create a pipe
      state = tickGame(state, [false], 42 + PIPE_INTERVAL - 1);
      expect(state.pipes.length).toBeGreaterThan(0);
    });

    it('pipes have valid gap positions', () => {
      let state = createGameState(1, 42);
      for (let i = 0; i < PIPE_INTERVAL + 10; i++) {
        state = tickGame(state, [false], 42 + i);
      }

      for (const pipe of state.pipes) {
        expect(pipe.gapY).toBeGreaterThan(0);
        expect(pipe.gapY + pipe.gapHeight).toBeLessThan(GAME_HEIGHT);
        expect(pipe.gapHeight).toBeGreaterThan(0);
      }
    });

    it('pipes start at the right edge of the screen', () => {
      let state = createGameState(1, 42);
      // Tick exactly PIPE_INTERVAL times
      for (let i = 0; i < PIPE_INTERVAL; i++) {
        state = tickGame(state, [false], 42 + i);
      }
      const newPipe = state.pipes.find((p) => p.x >= GAME_WIDTH - 10);
      expect(newPipe).toBeDefined();
    });
  });

  describe('collision detection', () => {
    it('bird dies when hitting the bottom', () => {
      let state = createGameState(1, 42);
      // Override bird position near bottom
      state = {
        ...state,
        birds: [{ ...state.birds[0], y: GAME_HEIGHT - BIRD_RADIUS }],
      };
      const nextState = tickGame(state, [false], 42);
      // After falling more, it should collide
      expect(nextState.birds[0].alive).toBe(false);
    });

    it('bird dies when hitting the top', () => {
      let state = createGameState(1, 42);
      state = {
        ...state,
        birds: [{ ...state.birds[0], y: BIRD_RADIUS, velocity: FLAP_STRENGTH }],
      };
      const nextState = tickGame(state, [true], 42);
      // Flapping at top edge should cause collision
      expect(nextState.birds[0].alive).toBe(false);
    });

    it('framesSurvived increments while alive', () => {
      let state = createGameState(1, 42);
      expect(state.birds[0].framesSurvived).toBe(0);

      // Keep bird centered with flaps to survive
      for (let i = 0; i < 10; i++) {
        state = tickGame(state, [state.birds[0].y > GAME_HEIGHT / 2], 42);
      }

      expect(state.birds[0].framesSurvived).toBeGreaterThan(0);
    });

    it('dead birds stay dead', () => {
      let state = createGameState(1, 42);
      state = {
        ...state,
        birds: [{ ...state.birds[0], alive: false }],
      };

      const nextState = tickGame(state, [true], 42);
      expect(nextState.birds[0].alive).toBe(false);
    });
  });
});
