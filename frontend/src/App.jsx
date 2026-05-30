import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth & Layout Imports
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Layout from './components/Layout';
import AITeamGenerator from './components/AITeamGenerator';
// Component Imports
import CommitteeDashboard from './components/CommitteeDashboard';
import DynamicTeamConfig from './components/DynamicTeamConfig';
import GenerateTeamsButton from './components/GenerateTeamsButton';
import TeamList from './components/TeamList';
import CommsDraftForm from './components/CommsDraftForm';
import CommsLogTable from './components/CommsLogTable';
import Leaderboard from './components/Leaderboard';
import DynamicLeaderboard from './components/DynamicLeaderboard';
import ParticipantPortal from './components/ParticipantPortal';
import JudgePortal from './components/JudgePortal';
import EventDescriptionForm from './components/EventDescriptionForm';

// --- INLINE PAGE COMPONENTS (COMMITTEE ONLY) ---
// --- INLINE PAGE COMPONENTS (COMMITTEE ONLY) ---
const TeamView = () => {
  const [refreshTeams, setRefreshTeams] = useState(0);
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Team Formation & Approval</h2>
      
      {/* The New AI Generator Component! */}
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

  const mockDynamicCategories = ["Innovation", "Technical Depth", "Presentation"];
  const mockTeamData = [
    { id: 1, name: "Tech Titans", scores: { "Innovation": 8, "Technical Depth": 9, "Presentation": 7 } },
    { id: 2, name: "Code Crafters", scores: { "Innovation": 9, "Technical Depth": 7, "Presentation": 9 } },
    { id: 3, name: "Data Demons", scores: { "Innovation": 6, "Technical Depth": 8, "Presentation": 6 } },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Evaluation Results & Anomaly Monitor</h2>
      {/* Committee only sees the leaderboard and anomalies. They CANNOT submit scores here. */}
      <Leaderboard refreshTrigger={refreshScores} />
      <DynamicLeaderboard scoringCategories={mockDynamicCategories} teamData={mockTeamData} />
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