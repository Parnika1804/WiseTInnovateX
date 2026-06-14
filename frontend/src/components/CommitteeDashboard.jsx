import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PipelineBar from './PipelineBar';
import CSVUpload from './CSVUpload';
import ParticipantTable from './ParticipantTable';
import ActivityLog from './ActivityLog';
import CreateJudge from '../components/CreateJudge';
import PendingApprovals from './PendingApprovals';
import MentorManager from './MentorManager';

const API = 'http://localhost:8000';

const TABS = [
  { id: 'overview', label: '🏠 Overview' },
  { id: 'mentors', label: '🧑‍🏫 Mentors' },
  { id: 'special-mentions', label: '⭐ Special Mentions' },
];

const SpecialMentions = () => {
  const [nominations, setNominations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState('');

  useEffect(() => {
    fetchNominations();
  }, []);

  const fetchNominations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/special-mention`);
      setNominations(res.data);
    } catch (err) {
      console.error('Failed to fetch nominations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (nominationId, action) => {
    setActionStatus('');
    try {
      await axios.post(`${API}/special-mention/approve`, {
        nomination_id: nominationId,
        action,
        reviewed_by: 'committee'
      });
      setActionStatus(`✅ Nomination ${action.toLowerCase()} successfully.`);
      fetchNominations();
    } catch (err) {
      setActionStatus(`❌ ${err.response?.data?.detail || 'Action failed.'}`);
    }
  };

  const pending = nominations.filter(n => n.status === 'PENDING');
  const reviewed = nominations.filter(n => n.status !== 'PENDING');

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Nominations</p>
          <p className="text-3xl font-black text-slate-800">{nominations.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending Review</p>
          <p className="text-3xl font-black text-amber-500">{pending.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Approved</p>
          <p className="text-3xl font-black text-green-600">{nominations.filter(n => n.status === 'APPROVED').length}</p>
        </div>
      </div>

      {actionStatus && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          actionStatus.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {actionStatus}
        </div>
      )}

      {/* Pending nominations */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Pending Nominations</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading nominations...</div>
        ) : pending.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">⭐</div>
            <p className="text-slate-500 font-medium">No pending nominations.</p>
            <p className="text-slate-400 text-sm mt-1">Mentor nominations will appear here after elimination round.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map(n => (
              <div key={n.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-slate-800">{n.team_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold">PENDING</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">
                      Nominated by mentor <strong className="text-slate-700">{n.mentor_name}</strong>
                    </p>

                    {/* Nominated members */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {n.nominated_members.map(m => (
                        <span key={m.id} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                          {m.name} · {m.skill}
                        </span>
                      ))}
                    </div>

                    {/* Reason */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mentor's Reason</p>
                      <p className="text-sm text-slate-700">{n.mentor_reason}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 min-w-fit">
                    <button
                      onClick={() => handleAction(n.id, 'APPROVED')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleAction(n.id, 'REJECTED')}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-bold rounded-lg transition-colors"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed nominations */}
      {reviewed.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Reviewed Nominations</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {reviewed.map(n => (
              <div key={n.id} className="p-6 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-slate-800">{n.team_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                      n.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {n.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Mentor: <strong className="text-slate-700">{n.mentor_name}</strong>
                    {n.reviewed_by && <span> · Reviewed by <strong className="text-slate-700">{n.reviewed_by}</strong></span>}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {n.nominated_members.map(m => (
                      <span key={m.id} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <CSVUpload onUploadSuccess={handleAction} />
              <div className="mt-6">
                <ParticipantTable refreshTrigger={refresh} />
              </div>
            </div>
            <CreateJudge />
          </div>
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

      {/* Tab: Special Mentions */}
      {activeTab === 'special-mentions' && (
        <SpecialMentions />
      )}
    </div>
  );
};

export default CommitteeDashboard;