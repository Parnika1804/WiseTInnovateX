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

const Dashboard = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <h2>Dashboard</h2>
      <PipelineBar />
      <CSVUpload onUploadSuccess={() => setRefresh(prev => prev + 1)} />
      <ParticipantTable refreshTrigger={refresh} />
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

function App() {
  return (
    <Router>
      <div style={{ fontFamily: 'sans-serif', margin: '0 auto', maxWidth: '1200px', padding: '20px' }}>
        <nav style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #ccc' }}>
          <h1 style={{ display: 'inline-block', marginRight: '30px' }}>EventFlow Orchestrator</h1>
          <Link to="/" style={{ marginRight: '15px' }}>Dashboard</Link>
          <Link to="/teams" style={{ marginRight: '15px' }}>Team Formation</Link>
          <Link to="/comms">Communications</Link>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/teams" element={<TeamView />} />
            <Route path="/comms" element={<CommsLog />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;