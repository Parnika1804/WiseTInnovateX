import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth & Layout Imports
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Layout from './components/Layout';
import AITeamGenerator from './components/AITeamGenerator';
import DynamicTeamConfig from './components/DynamicTeamConfig';
// Component Imports
import CommitteeDashboard from './components/CommitteeDashboard';
import TeamList from './components/TeamList';
import CommsDraftForm from './components/CommsDraftForm';
import CommsLogTable from './components/CommsLogTable';
import Leaderboard from './components/Leaderboard';
import ParticipantPortal from './components/ParticipantPortal';
import JudgePortal from './components/JudgePortal';
import EventDescriptionForm from './components/EventDescriptionForm';

// --- INLINE PAGE COMPONENTS (COMMITTEE ONLY) ---
const TeamView = () => {
  const [refreshTeams, setRefreshTeams] = useState(0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Team Formation &amp; Approval</h2>

      {/* Step 1: Set round count and qualify % */}
      <DynamicTeamConfig onRulesConfirmed={(rules) => console.log('Round rules confirmed:', rules)} />

      {/* Step 2: AI rubric + team generation */}
      <AITeamGenerator onTeamsGenerated={() => setRefreshTeams(prev => prev + 1)} />

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

// Committee's view of the evaluation (Read-Only results, NO score submission)
const EvaluationResultsView = () => {
  const [refreshScores, setRefreshScores] = useState(0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Evaluation Results & Anomaly Monitor</h2>
      {/* Committee only sees the leaderboard and anomalies. They CANNOT submit scores here. */}
      <Leaderboard refreshTrigger={refreshScores} />
    </div>
  );
};

// --- THE SECURE APP ROUTER ---
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Fallback redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* === COMMITTEE ONLY ROUTES === */}
          <Route element={<ProtectedRoute allowedRoles={['Committee']}><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<CommitteeDashboard />} />
            <Route path="/setup" element={<EventDescriptionForm onConfigExtracted={(data) => console.log("Config:", data)} />} />
            <Route path="/teams" element={<TeamView />} />
            <Route path="/comms" element={<CommsLog />} />
            {/* The Committee checks the results, but doesn't grade */}
            <Route path="/evaluation" element={<EvaluationResultsView />} /> 
          </Route>

          {/* === JUDGE MAGIC LINK ROUTE (public – self-authenticates via token in URL) === */}
          {/* Must be outside ProtectedRoute: the judge arrives from an email link with no
              session yet. JudgePortal decodes the JWT from ?token= and calls login() itself. */}
          <Route path="/judge-dashboard" element={<JudgePortal />} />

          {/* === PARTICIPANT MAGIC LINK ROUTE (public – self-authenticates via token in URL) === */}
          {/* Must be outside ProtectedRoute: participant arrives from an email link with no
              session yet. ParticipantPortal decodes the JWT from ?token= and calls login() itself. */}
          <Route path="/participant-portal" element={<ParticipantPortal />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;