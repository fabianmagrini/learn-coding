import { GameCanvas } from './components/GameCanvas';
import { Dashboard } from './components/Dashboard';
import { Charts } from './components/Charts';
import { ProgramTree } from './components/ProgramTree';
import './index.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Flappy Bird AI Learner</h1>
        <p className="subtitle">Genetic Programming evolves programs to play Flappy Bird</p>
      </header>
      <main className="app-main">
        <aside className="game-panel">
          <GameCanvas />
        </aside>
        <section className="right-panel">
          <div className="panel dashboard-panel">
            <Dashboard />
          </div>
          <div className="panel charts-panel">
            <Charts />
          </div>
          <div className="panel tree-panel">
            <ProgramTree />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
