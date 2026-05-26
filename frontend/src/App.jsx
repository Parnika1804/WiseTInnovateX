import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth & Layout Imports
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Layout from './components/Layout';

// Component Imports
import CommitteeDashboard from './components/CommitteeDashboard';
import DynamicTeamConfig from './components/DynamicTeamConfig';
import GenerateTeamsButton from './components/GenerateTeamsButton';
import TeamList from './components/TeamList';
import CommsDraftForm from './components/CommsDraftForm';
import CommsLogTable from './components/CommsLogTable';
import ScoreSubmitForm from './components/ScoreSubmitForm';
import Leaderboard from './components/Leaderboard';
import ActivityLog from './components/ActivityLog';
import DynamicLeaderboard from './components/DynamicLeaderboard';
import ParticipantPortal from './components/ParticipantPortal';
import JudgePortal from './components/JudgePortal';
import EventDescriptionForm from './components/EventDescriptionForm';

// --- INLINE PAGE COMPONENTS ---
const TeamView = () => {
  const [refreshTeams, setRefreshTeams] = useState(0);
  const mockExtractedRules = { minSize: 2, maxSize: 5, allowCrossCollege: true };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Team Formation & Approval</h2>
      <DynamicTeamConfig suggestedRules={mockExtractedRules} onRulesConfirmed={(finalRules) => console.log("Database updated with:", finalRules)} />
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

  const mockDynamicCategories = ["Innovation", "Technical Depth", "Presentation"];
  const mockTeamData = [
    { id: 1, name: "Tech Titans", scores: { "Innovation": 8, "Technical Depth": 9, "Presentation": 7 } },
    { id: 2, name: "Code Crafters", scores: { "Innovation": 9, "Technical Depth": 7, "Presentation": 9 } },
    { id: 3, name: "Data Demons", scores: { "Innovation": 6, "Technical Depth": 8, "Presentation": 6 } },
  ];
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Evaluation & Results</h2>
      <ScoreSubmitForm onScoreSubmitted={() => setRefreshScores(prev => prev + 1)} />
      
      {/* THE REAL AI LEADERBOARD */}
      <Leaderboard refreshTrigger={refreshScores} />
    </div>
  );
};
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
            <Route path="/evaluation" element={<EvaluationView />} />
          </Route>

          {/* === JUDGE ONLY ROUTES === */}
          <Route element={<ProtectedRoute allowedRoles={['Judge']}><Layout /></ProtectedRoute>}>
            <Route path="/judge-dashboard" element={<JudgePortal />} />
          </Route>

          {/* === PARTICIPANT ONLY ROUTES === */}
          <Route element={<ProtectedRoute allowedRoles={['Participant']}><Layout /></ProtectedRoute>}>
            <Route path="/participant-portal" element={<ParticipantPortal />} />
          </Route>

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;