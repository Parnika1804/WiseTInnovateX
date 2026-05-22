import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import PipelineBar from './components/PipelineBar';
import CSVUpload from './components/CSVUpload';
import ParticipantTable from './components/ParticipantTable';
import TeamConfigForm from './components/TeamConfigForm';
import GenerateTeamsButton from './components/GenerateTeamsButton';
import TeamList from './components/TeamList';
import CommsDraftForm from './components/CommsDraftForm';
import CommsLogTable from './components/CommsLogTable';
import ScoreSubmitForm from './components/ScoreSubmitForm';
import Leaderboard from './components/Leaderboard';
import ActivityLog from './components/ActivityLog';
import ParticipantPortal from './components/ParticipantPortal';
import JudgePortal from './components/JudgePortal';
import ParticipantLink from './components/ParticipantLink';

const Dashboard = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      <div>
        <h2>Dashboard</h2>
        <PipelineBar />
        <CSVUpload onUploadSuccess={() => setRefresh(prev => prev + 1)} />
        <ParticipantTable refreshTrigger={refresh} />
      </div>
      <div>
        <h2 style={{ visibility: 'hidden' }}>Activity</h2>
        <ActivityLog />
      </div>
    </div>
  );
};

const TeamView = () => {
  const [refreshTeams, setRefreshTeams] = useState(0);
  return (
    <div>
      <h2>Team Formation & Approval</h2>
      <TeamConfigForm />
      <GenerateTeamsButton onGenerated={() => setRefreshTeams(prev => prev + 1)} />
      <TeamList refreshTrigger={refreshTeams} />
    </div>
  );
};

const CommsLog = () => {
  const [refreshLog, setRefreshLog] = useState(0);
  return (
    <div>
      <h2>Communications Center</h2>
      <CommsDraftForm onDraftSaved={() => setRefreshLog(prev => prev + 1)} />
      <CommsLogTable refreshTrigger={refreshLog} />
    </div>
  );
};

const EvaluationView = () => {
  const [refreshScores, setRefreshScores] = useState(0);
  return (
    <div>
      <h2>Evaluation & Results</h2>
      <ScoreSubmitForm onScoreSubmitted={() => setRefreshScores(prev => prev + 1)} />
      <Leaderboard refreshTrigger={refreshScores} />
    </div>
  );
};

function App() {
  return (
    <Router>
      <div style={{ fontFamily: 'sans-serif', margin: '0 auto', maxWidth: '1200px', padding: '20px' }}>
        
        {/* We only show the main navigation for the committee members */}
        <Routes>
          <Route path="/portal" element={null} />
          <Route path="/judge" element={null} />
          <Route path="*" element={
            <nav style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <h1 style={{ margin: '0 20px 0 0' }}>EventFlow Orchestrator</h1>
              <Link to="/">Dashboard</Link>
              <Link to="/teams">Teams</Link>
              <Link to="/comms">Comms</Link>
              <Link to="/evaluation">Evaluations</Link>
              <Link to="/links" style={{ backgroundColor: '#0056b3', color: 'white', padding: '5px 10px', borderRadius: '4px', textDecoration: 'none' }}>Portal Links</Link>
            </nav>
          } />
        </Routes>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/teams" element={<TeamView />} />
            <Route path="/comms" element={<CommsLog />} />
            <Route path="/evaluation" element={<EvaluationView />} />
            <Route path="/links" element={<ParticipantLink />} />
            
            {/* Secure Portal Routes (No main navigation) */}
            <Route path="/portal" element={<ParticipantPortal />} />
            <Route path="/judge" element={<JudgePortal />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;