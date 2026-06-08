import React, { useState } from 'react';
import axios from 'axios';
import PipelineBar from './PipelineBar';
import CSVUpload from './CSVUpload';
import ParticipantTable from './ParticipantTable';
import ActivityLog from './ActivityLog';
import CreateJudge from '../components/CreateJudge';
import PendingApprovals from './PendingApprovals';
import MentorManager from './MentorManager';

const TABS = [
  { id: 'overview', label: '🏠 Overview' },
  { id: 'mentors', label: '🧑‍🏫 Mentors' },
];

const CommitteeDashboard = () => {
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  const handleAction = () => setRefresh(prev => prev + 1);

  const handleFactoryReset = async () => {
    const confirm1 = window.confirm("⚠️ WARNING: Are you sure you want to start a new event?");
    if (!confirm1) return;

    const confirm2 = window.confirm("🚨 FINAL WARNING: This will permanently delete ALL current participants, teams, scores, judges, and configurations. ONLY Committee accounts will remain. Proceed?");
    if (!confirm2) return;

    try {
      await axios.delete('http://localhost:8000/system/reset');
      alert("System reset successful. You may now configure your new event.");
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to reset system. Please check the backend connection.");
      console.error("Reset Error:", error);
    }
  };

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Command Center</h2>
        <button
          onClick={handleFactoryReset}
          className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <span>♻️</span> Start New Event (Reset Data)
        </button>
      </div>

      {/* Pipeline always spans full width */}
      <PipelineBar key={`pipeline-${refresh}`} />

      {/* Tabs */}
      <div className="flex gap-1 mt-6 mb-6 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-slate-800 text-slate-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left (2/3): Participant intake + judge creation */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <CSVUpload onUploadSuccess={handleAction} />
              <div className="mt-6">
                <ParticipantTable refreshTrigger={refresh} />
              </div>
            </div>
            <CreateJudge />
          </div>

          {/* Right (1/3): Pending approvals + activity log */}
          <div className="space-y-6">
            <PendingApprovals onAction={handleAction} />
            <ActivityLog refreshTrigger={refresh} />
          </div>
        </div>
      )}

      {/* Tab: Mentors */}
      {activeTab === 'mentors' && (
        <MentorManager />
      )}
    </div>
  );
};

export default CommitteeDashboard;