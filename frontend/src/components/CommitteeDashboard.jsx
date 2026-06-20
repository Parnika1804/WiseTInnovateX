import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PipelineBar from './PipelineBar';
import CSVUpload from './CSVUpload';
import ParticipantTable from './ParticipantTable';
import ActivityLog from './ActivityLog';
import CreateJudge from '../components/CreateJudge';
import PendingApprovals from './PendingApprovals';
import MentorManager from './MentorManager';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'https://wisetinnovatex-r4vx.onrender.com';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'judges', label: 'Judges' },
  { id: 'mentors', label: 'Mentors' },
  { id: 'special-mentions', label: 'Special Mentions' },
  { id: 'feedback', label: 'Feedback' },
];

const SpecialMentions = () => {
  const [nominations, setNominations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState('');

  useEffect(() => { fetchNominations(); }, []);

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
      setActionStatus(`Success: Nomination ${action.toLowerCase()} successfully.`);
      fetchNominations();
    } catch (err) {
      setActionStatus(`Error: ${err.response?.data?.detail || 'Action failed.'}`);
    }
  };

  const pending = nominations.filter(n => n.status === 'PENDING');
  const reviewed = nominations.filter(n => n.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Nominations</p>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{nominations.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pending Review</p>
          <p className="text-3xl font-black text-amber-500 dark:text-amber-400">{pending.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Approved</p>
          <p className="text-3xl font-black text-green-600 dark:text-green-400">{nominations.filter(n => n.status === 'APPROVED').length}</p>
        </div>
      </div>

      {actionStatus && (
        <div className={`p-3 rounded-lg text-sm font-medium transition-colors duration-300 ${actionStatus.startsWith('Success')
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
          {actionStatus}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden transition-colors duration-300">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pending Nominations</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">Loading nominations...</div>
        ) : pending.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium">No pending nominations.</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Mentor nominations will appear here after elimination rounds.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {pending.map(n => (
              <div key={n.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{n.team_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 font-bold">PENDING</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      Nominated by mentor <strong className="text-slate-700 dark:text-slate-300">{n.mentor_name}</strong>
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {n.nominated_members.map(m => (
                        <span key={m.id} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-full text-xs font-semibold">
                          {m.name} · {m.skill}
                        </span>
                      ))}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-lg p-3 transition-colors duration-300">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Mentor's Reason</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{n.mentor_reason}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-fit">
                    <button onClick={() => handleAction(n.id, 'APPROVED')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors">
                      Approve
                    </button>
                    <button onClick={() => handleAction(n.id, 'REJECTED')}
                      className="px-4 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm font-bold rounded-lg transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden transition-colors duration-300">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Reviewed Nominations</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {reviewed.map(n => (
              <div key={n.id} className="p-6 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{n.team_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border transition-colors duration-300 ${n.status === 'APPROVED'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'
                      }`}>
                      {n.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Mentor: <strong className="text-slate-700 dark:text-slate-300">{n.mentor_name}</strong>
                    {n.reviewed_by && <span> · Reviewed by <strong className="text-slate-700 dark:text-slate-300">{n.reviewed_by}</strong></span>}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {n.nominated_members.map(m => (
                      <span key={m.id} className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-600 rounded-full text-xs font-medium transition-colors duration-300">
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

const FeedbackSummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSummary(); }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/feedback/summary`);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch feedback summary', err);
    } finally {
      setLoading(false);
    }
  };

  const RatingBar = ({ label, value, breakdown }) => {
    const total = Object.values(breakdown || {}).reduce((a, b) => a + b, 0);
    return (
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{value ? value.toFixed(1) : 'N/A'} / 5</span>
          </div>
        </div>
        {breakdown && total > 0 && (
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map(star => {
              const count = breakdown[String(star)] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="w-6 text-right">{star} Pt</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-slate-400 dark:bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-400 dark:text-slate-500">Loading feedback...</div>;

  if (!summary || summary.total_responses === 0) return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center shadow-sm transition-colors duration-300">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">No Feedback Yet</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Feedback emails are sent automatically when the event is finalized. Responses will show up here.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm text-center transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Responses</p>
          <p className="text-4xl font-black text-slate-800 dark:text-slate-100">{summary.total_responses}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm text-center transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Avg Event Rating</p>
          <p className="text-3xl font-black text-slate-700 dark:text-slate-200">{summary.avg_event_rating?.toFixed(1) ?? '—'}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm text-center transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Avg Judging Rating</p>
          <p className="text-3xl font-black text-slate-700 dark:text-slate-200">{summary.avg_judging_rating?.toFixed(1) ?? '—'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5 border-b border-slate-100 dark:border-slate-700 pb-3 transition-colors duration-300">Rating Breakdown</h3>
        <RatingBar label="Overall Event" value={summary.avg_event_rating} breakdown={summary.breakdown?.event} />
        <RatingBar label="Judging Process" value={summary.avg_judging_rating} breakdown={summary.breakdown?.judging} />
        {summary.avg_mentor_rating !== null && (
          <RatingBar label="Mentor Experience" value={summary.avg_mentor_rating} breakdown={summary.breakdown?.mentor} />
        )}
      </div>

      {summary.comments?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden transition-colors duration-300">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Participant Comments</h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">{summary.comments.length} comment{summary.comments.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {summary.comments.map((c, idx) => (
              <div key={idx} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{c.participant_name}</p>
                  <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>Event: <strong className="text-slate-700 dark:text-slate-300">{c.event_rating}/5</strong></span>
                    <span>Judging: <strong className="text-slate-700 dark:text-slate-300">{c.judging_rating}/5</strong></span>
                    {c.mentor_rating && <span>Mentor: <strong className="text-slate-700 dark:text-slate-300">{c.mentor_rating}/5</strong></span>}
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                  "{c.comment}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-right">
        <button onClick={fetchSummary} className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
          Refresh Data
        </button>
      </div>
    </div>
  );
};

const CommitteeDashboard = () => {
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [unreadFeedback, setUnreadFeedback] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const handleAction = () => setRefresh(prev => prev + 1);

  useEffect(() => {
    axios.get(`${API}/feedback/count`).then(res => {
      const total = res.data.count;
      const lastSeen = parseInt(localStorage.getItem('feedback_last_seen') || '0');
      if (total > lastSeen) {
        setUnreadFeedback(total - lastSeen);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    }).catch(() => {});
  }, []);

  const wsStatus = useWebSocket('dashboard', (data) => {
    if (data.event === 'dashboard_updated') {
      handleAction();
    }
  });

  const handleFactoryReset = async () => {
    const confirm1 = window.confirm("WARNING: Are you sure you want to start a new event?");
    if (!confirm1) return;
    const confirm2 = window.confirm("FINAL WARNING: This will permanently delete ALL current participants, teams, scores, judges, and configurations. ONLY Committee accounts will remain. Proceed?");
    if (!confirm2) return;
    try {
      await axios.delete('https://wisetinnovatex-r4vx.onrender.com/system/reset');
      alert("System reset successful. You may now configure your new event.");
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to reset system. Please check the backend connection.");
      console.error("Reset Error:", error);
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'feedback') {
      axios.get(`${API}/feedback/count`).then(res => {
        localStorage.setItem('feedback_last_seen', res.data.count);
        setUnreadFeedback(0);
        setShowToast(false);
      }).catch(() => {});
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 transition-colors duration-300">Command Center</h2>
          {wsStatus === 'open' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 transition-colors duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live updates ON
            </span>
          )}
        </div>
        <button
          onClick={handleFactoryReset}
          className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-600 dark:hover:bg-red-600 hover:text-white dark:hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          Start New Event (Reset Data)
        </button>
      </div>

      <PipelineBar key={`pipeline-${refresh}`} />

      <div className="mt-6 mb-6 border-b border-slate-200 dark:border-slate-700 w-full overflow-hidden transition-colors duration-300">
        <div className="flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide pb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-5 py-3 sm:py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 outline-none flex-shrink-0 ${activeTab === tab.id
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.id === 'feedback' && unreadFeedback > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {unreadFeedback}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-colors duration-300">
              <CSVUpload onUploadSuccess={handleAction} />
              <div className="mt-6">
                <ParticipantTable refreshTrigger={refresh} />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <PendingApprovals onAction={handleAction} />
            <ActivityLog refreshTrigger={refresh} />
          </div>
        </div>
      )}
      {activeTab === 'judges' && <div className="max-w-xl"><CreateJudge /></div>}
      {activeTab === 'mentors' && <MentorManager />}
      {activeTab === 'special-mentions' && <SpecialMentions />}
      {activeTab === 'feedback' && <FeedbackSummary />}

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-3">
          🔔 {unreadFeedback} new feedback{unreadFeedback > 1 ? 's' : ''} received
          <button onClick={() => setShowToast(false)} className="text-slate-400 hover:text-white ml-2">✕</button>
        </div>
      )}
    </div>
  );
};

export default CommitteeDashboard;