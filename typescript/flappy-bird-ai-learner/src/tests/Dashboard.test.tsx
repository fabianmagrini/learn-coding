import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../components/Dashboard';
import { useStore } from '../store/useStore';
import type { EvolutionConfig, GenerationStats, Individual, Program } from '../types';

vi.mock('../store/useStore');

const defaultConfig: EvolutionConfig = {
  populationSize: 50,
  mutationRate: 0.1,
  maxDepth: 5,
  tournamentSize: 3,
  flapThreshold: 0,
  simulationSpeed: 5,
};

const terminalProgram: Program = { type: 'terminal', value: 0 };

function makeStoreState(overrides: Record<string, unknown> = {}) {
  return {
    config: defaultConfig,
    isRunning: false,
    isPaused: false,
    generation: 0,
    stats: [] as GenerationStats[],
    currentPopulation: [] as Individual[],
    bestIndividual: null,
    startEvolution: vi.fn(),
    stopEvolution: vi.fn(),
    pauseEvolution: vi.fn(),
    resumeEvolution: vi.fn(),
    updateConfig: vi.fn(),
    replayBest: vi.fn(),
    ...overrides,
  };
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(useStore).mockReturnValue(makeStoreState() as ReturnType<typeof useStore>);
  });

  describe('button visibility', () => {
    it('shows Start button when not running', () => {
      render(<Dashboard />);
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('does not show Stop or Pause when not running', () => {
      render(<Dashboard />);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    });

    it('shows Stop and Pause when running', () => {
      vi.mocked(useStore).mockReturnValue(
        makeStoreState({ isRunning: true }) as ReturnType<typeof useStore>
      );
      render(<Dashboard />);
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.queryByText('Start')).not.toBeInTheDocument();
    });

    it('shows Resume instead of Pause when running and paused', () => {
      vi.mocked(useStore).mockReturnValue(
        makeStoreState({ isRunning: true, isPaused: true }) as ReturnType<typeof useStore>
      );
      render(<Dashboard />);
      expect(screen.getByText('Resume')).toBeInTheDocument();
      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    });

    it('shows Replay Best button when bestIndividual is set', () => {
      const bestIndividual: Individual = { program: terminalProgram, fitness: 100, id: 'best' };
      vi.mocked(useStore).mockReturnValue(
        makeStoreState({ bestIndividual }) as ReturnType<typeof useStore>
      );
      render(<Dashboard />);
      expect(screen.getByText('Replay Best')).toBeInTheDocument();
    });

    it('hides Replay Best when no best individual', () => {
      render(<Dashboard />);
      expect(screen.queryByText('Replay Best')).not.toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('calls startEvolution on Start click', () => {
      const store = makeStoreState();
      vi.mocked(useStore).mockReturnValue(store as ReturnType<typeof useStore>);
      render(<Dashboard />);
      fireEvent.click(screen.getByText('Start'));
      expect(store.startEvolution).toHaveBeenCalledOnce();
    });

    it('calls stopEvolution on Stop click', () => {
      const store = makeStoreState({ isRunning: true });
      vi.mocked(useStore).mockReturnValue(store as ReturnType<typeof useStore>);
      render(<Dashboard />);
      fireEvent.click(screen.getByText('Stop'));
      expect(store.stopEvolution).toHaveBeenCalledOnce();
    });

    it('calls pauseEvolution on Pause click', () => {
      const store = makeStoreState({ isRunning: true });
      vi.mocked(useStore).mockReturnValue(store as ReturnType<typeof useStore>);
      render(<Dashboard />);
      fireEvent.click(screen.getByText('Pause'));
      expect(store.pauseEvolution).toHaveBeenCalledOnce();
    });

    it('calls resumeEvolution on Resume click', () => {
      const store = makeStoreState({ isRunning: true, isPaused: true });
      vi.mocked(useStore).mockReturnValue(store as ReturnType<typeof useStore>);
      render(<Dashboard />);
      fireEvent.click(screen.getByText('Resume'));
      expect(store.resumeEvolution).toHaveBeenCalledOnce();
    });

    it('calls replayBest on Replay Best click', () => {
      const bestIndividual: Individual = { program: terminalProgram, fitness: 100, id: 'best' };
      const store = makeStoreState({ bestIndividual });
      vi.mocked(useStore).mockReturnValue(store as ReturnType<typeof useStore>);
      render(<Dashboard />);
      fireEvent.click(screen.getByText('Replay Best'));
      expect(store.replayBest).toHaveBeenCalledOnce();
    });
  });

  describe('config sliders', () => {
    it('renders five sliders', () => {
      render(<Dashboard />);
      expect(screen.getAllByRole('slider')).toHaveLength(5);
    });

    it('population size and max depth sliders are disabled when running', () => {
      vi.mocked(useStore).mockReturnValue(
        makeStoreState({ isRunning: true }) as ReturnType<typeof useStore>
      );
      render(<Dashboard />);
      const sliders = screen.getAllByRole('slider');
      const disabled = sliders.filter((s) => s.hasAttribute('disabled'));
      expect(disabled).toHaveLength(2);
    });

    it('no sliders are disabled when not running', () => {
      render(<Dashboard />);
      const sliders = screen.getAllByRole('slider');
      const disabled = sliders.filter((s) => s.hasAttribute('disabled'));
      expect(disabled).toHaveLength(0);
    });

    it('calls updateConfig with mutationRate when mutation slider changes', () => {
      const store = makeStoreState();
      vi.mocked(useStore).mockReturnValue(store as ReturnType<typeof useStore>);
      render(<Dashboard />);
      // Slider order: populationSize, mutationRate, speed, maxDepth, flapThreshold
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[1], { target: { value: '0.25' } });
      expect(store.updateConfig).toHaveBeenCalledWith({ mutationRate: 0.25 });
    });

    it('calls updateConfig with simulationSpeed when speed slider changes', () => {
      const store = makeStoreState();
      vi.mocked(useStore).mockReturnValue(store as ReturnType<typeof useStore>);
      render(<Dashboard />);
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[2], { target: { value: '15' } });
      expect(store.updateConfig).toHaveBeenCalledWith({ simulationSpeed: 15 });
    });
  });

  describe('metrics display', () => {
    it('shows the current generation number', () => {
      vi.mocked(useStore).mockReturnValue(
        makeStoreState({ generation: 42 }) as ReturnType<typeof useStore>
      );
      render(<Dashboard />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('shows dashes for all fitness metrics when there are no stats', () => {
      render(<Dashboard />);
      const dashes = screen.getAllByText('—');
      // Best Fitness, Avg Fitness, Diversity, All-time Best are all dashes
      expect(dashes.length).toBeGreaterThanOrEqual(4);
    });

    it('shows best fitness from the latest stats entry', () => {
      const stats: GenerationStats[] = [
        {
          generation: 1,
          bestFitness: 250.5,
          avgFitness: 100.0,
          diversity: 0.8,
          bestProgram: terminalProgram,
        },
      ];
      vi.mocked(useStore).mockReturnValue(
        makeStoreState({ stats }) as ReturnType<typeof useStore>
      );
      render(<Dashboard />);
      expect(screen.getByText('250.5')).toBeInTheDocument();
    });

    it('shows average fitness from the latest stats entry', () => {
      const stats: GenerationStats[] = [
        {
          generation: 1,
          bestFitness: 250.5,
          avgFitness: 123.4,
          diversity: 0.8,
          bestProgram: terminalProgram,
        },
      ];
      vi.mocked(useStore).mockReturnValue(
        makeStoreState({ stats }) as ReturnType<typeof useStore>
      );
      render(<Dashboard />);
      expect(screen.getByText('123.4')).toBeInTheDocument();
    });

    it('shows all-time best fitness from bestIndividual', () => {
      const bestIndividual: Individual = { program: terminalProgram, fitness: 999.9, id: 'top' };
      vi.mocked(useStore).mockReturnValue(
        makeStoreState({ bestIndividual }) as ReturnType<typeof useStore>
      );
      render(<Dashboard />);
      expect(screen.getByText('999.9')).toBeInTheDocument();
    });

    it('labels each metric section correctly', () => {
      render(<Dashboard />);
      expect(screen.getByText('Generation')).toBeInTheDocument();
      expect(screen.getByText('Best Fitness')).toBeInTheDocument();
      expect(screen.getByText('Avg Fitness')).toBeInTheDocument();
      expect(screen.getByText('Alive Birds')).toBeInTheDocument();
      expect(screen.getByText('Diversity')).toBeInTheDocument();
      expect(screen.getByText('All-time Best')).toBeInTheDocument();
    });
  });
});
