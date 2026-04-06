import { useStore } from '../store/useStore';

export function Dashboard() {
  const {
    config,
    isRunning,
    isPaused,
    generation,
    stats,
    currentPopulation,
    bestIndividual,
    startEvolution,
    stopEvolution,
    pauseEvolution,
    resumeEvolution,
    updateConfig,
    replayBest,
  } = useStore();

  const latestStats = stats[stats.length - 1];
  const aliveCount = currentPopulation.filter((ind) => ind.fitness > 0).length;

  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Controls</h2>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {!isRunning ? (
          <button
            onClick={startEvolution}
            style={btnStyle('#4CAF50')}
          >
            Start
          </button>
        ) : (
          <>
            <button onClick={stopEvolution} style={btnStyle('#f44336')}>
              Stop
            </button>
            {!isPaused ? (
              <button onClick={pauseEvolution} style={btnStyle('#FF9800')}>
                Pause
              </button>
            ) : (
              <button onClick={resumeEvolution} style={btnStyle('#2196F3')}>
                Resume
              </button>
            )}
          </>
        )}
        {bestIndividual && (
          <button onClick={replayBest} style={btnStyle('#9C27B0')}>
            Replay Best
          </button>
        )}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <SliderControl
          label={`Population Size: ${config.populationSize}`}
          min={10}
          max={500}
          step={10}
          value={config.populationSize}
          onChange={(v) => updateConfig({ populationSize: v })}
          disabled={isRunning}
        />
        <SliderControl
          label={`Mutation Rate: ${config.mutationRate.toFixed(2)}`}
          min={0.01}
          max={0.5}
          step={0.01}
          value={config.mutationRate}
          onChange={(v) => updateConfig({ mutationRate: v })}
        />
        <SliderControl
          label={`Speed: ${config.simulationSpeed}x`}
          min={1}
          max={20}
          step={1}
          value={config.simulationSpeed}
          onChange={(v) => updateConfig({ simulationSpeed: v })}
        />
        <SliderControl
          label={`Max Depth: ${config.maxDepth}`}
          min={3}
          max={8}
          step={1}
          value={config.maxDepth}
          onChange={(v) => updateConfig({ maxDepth: v })}
          disabled={isRunning}
        />
        <SliderControl
          label={`Flap Threshold: ${config.flapThreshold.toFixed(1)}`}
          min={-10}
          max={10}
          step={0.5}
          value={config.flapThreshold}
          onChange={(v) => updateConfig({ flapThreshold: v })}
        />
      </div>

      {/* Metrics */}
      <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Metrics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <MetricCard label="Generation" value={generation} />
        <MetricCard
          label="Best Fitness"
          value={latestStats?.bestFitness?.toFixed(1) ?? '—'}
        />
        <MetricCard
          label="Avg Fitness"
          value={latestStats?.avgFitness?.toFixed(1) ?? '—'}
        />
        <MetricCard label="Alive Birds" value={aliveCount} />
        <MetricCard
          label="Diversity"
          value={latestStats?.diversity?.toFixed(2) ?? '—'}
        />
        <MetricCard
          label="All-time Best"
          value={bestIndividual?.fitness?.toFixed(1) ?? '—'}
        />
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '8px 16px',
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  };
}

function SliderControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: '#f5f5f5',
        borderRadius: '6px',
        padding: '8px 12px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{value}</div>
    </div>
  );
}
