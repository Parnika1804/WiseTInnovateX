import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const API = 'http://localhost:8000';

const MentorManager = () => {
  const [mentors, setMentors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [linkStatus, setLinkStatus] = useState('');
  const [reassignStatus, setReassignStatus] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);
  const [sendingLinks, setSendingLinks] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [reassignRow, setReassignRow] = useState(null);
  const [assignRow, setAssignRow] = useState(null); 
  const [selectedNewMentor, setSelectedNewMentor] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMentors();
    fetchTeams();
  }, []);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/mentors`);
      setMentors(res.data);
    } catch (err) {
      console.error('Failed to fetch mentors', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${API}/teams`);
      setTeams(res.data.filter(t => t.status === 'APPROVED'));
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/mentors/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus(`Success: ${res.data.message}`);
      fetchMentors();
    } catch (err) {
      setUploadStatus(`Error: ${err.response?.data?.detail || 'Upload failed.'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendEmails = async () => {
    setSendingEmails(true);
    setEmailStatus('');
    try {
      const res = await axios.post(`${API}/mentors/send-intro-emails`);
      setEmailStatus(`Success: ${res.data.mentor_emails_drafted} emails drafted and queued for approval.`);
      if (res.data.mentor_emails_drafted) notifyEmailDraft(res.data.mentor_emails_drafted);
    } catch (err) {
      setEmailStatus(`Error: ${err.response?.data?.detail || 'Failed to draft emails.'}`);
    } finally {
      setSendingEmails(false);
    }
  };

  const handleSendPortalLinks = async () => {
    setSendingLinks(true);
    setLinkStatus('');
    try {
      const res = await axios.post(`${API}/mentors/send-portal-links`);
      setLinkStatus(`Success: ${res.data.mentor_link_emails_drafted} mentor portal link emails drafted and queued for approval.`);
      if (res.data.mentor_link_emails_drafted) notifyEmailDraft(res.data.mentor_link_emails_drafted);
    } catch (err) {
      setLinkStatus(`Error: ${err.response?.data?.detail || 'Failed to draft portal link emails.'}`);
    } finally {
      setSendingLinks(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all mentors? This action cannot be undone.')) return;
    setClearing(true);
    try {
      const res = await axios.delete(`${API}/mentors/clear`);
      setUploadStatus(`Success: ${res.data.message}`);
      setMentors([]);
    } catch (err) {
      setUploadStatus(`Error: ${err.response?.data?.detail || 'Clear failed.'}`);
    } finally {
      setClearing(false);
    }
  };

  const handleReassignClick = (teamId) => {
    setReassignRow(teamId);
    setAssignRow(null);
    setSelectedNewMentor('');
    setSelectedTeam('');
    setReassignStatus('');
  };

  const handleReassignConfirm = async (teamId) => {
    if (!selectedNewMentor) return;
    setReassigning(true);
    setReassignStatus('');
    try {
      const res = await axios.patch(`${API}/mentors/${teamId}/reassign`, {
        new_mentor_id: parseInt(selectedNewMentor),
      });
      setReassignStatus(`Success: ${res.data.message}`);
      setReassignRow(null);
      setSelectedNewMentor('');
      fetchMentors();
    } catch (err) {
      setReassignStatus(`Error: ${err.response?.data?.detail || 'Reassignment failed.'}`);
    } finally {
      setReassigning(false);
    }
  };

  const handleAssignClick = (mentorId) => {
    setAssignRow(mentorId);
    setReassignRow(null);
    setSelectedTeam('');
    setReassignStatus('');
  };

  const handleAssignConfirm = async (mentorId) => {
    if (!selectedTeam) return;
    setReassigning(true);
    setReassignStatus('');
    try {
      const res = await axios.patch(`${API}/mentors/manual-assign`, {
        mentor_id: mentorId,
        team_id: parseInt(selectedTeam),
      });
      setReassignStatus(`Success: ${res.data.message}`);
      setAssignRow(null);
      setSelectedTeam('');
      fetchMentors();
    } catch (err) {
      setReassignStatus(`Error: ${err.response?.data?.detail || 'Assignment failed.'}`);
    } finally {
      setReassigning(false);
    }
  };

  const toggleRow = (id) => setExpandedRow(prev => prev === id ? null : id);

  const assignedCount = mentors.filter(m => m.assigned_team_id).length;
  const unassignedCount = mentors.length - assignedCount;

  const allMentorsExcept = (excludeMentorId) =>
    mentors.filter(m => m.id !== excludeMentorId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 transition-colors duration-300">Total Mentors</p>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100 transition-colors duration-300">{mentors.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 transition-colors duration-300">Assigned</p>
          <p className="text-3xl font-black text-green-600 dark:text-green-400 transition-colors duration-300">{assignedCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-300">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 transition-colors duration-300">Unassigned</p>
          <p className={`text-3xl font-black transition-colors duration-300 ${unassignedCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-300 dark:text-slate-600'}`}>{unassignedCount}</p>
        </div>
      </div>

      {unassignedCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-center gap-3 transition-colors duration-300">
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 transition-colors duration-300">
            Attention: {unassignedCount} mentor{unassignedCount > 1 ? 's are' : ' is'} unassigned. Use the Assign button to manually allocate them to a team.
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2 transition-colors duration-300">Mentor Management</h3>

        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleUpload} className="hidden" id="mentor-csv-upload" />
            <label htmlFor="mentor-csv-upload" className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm ${uploading ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 cursor-not-allowed' : 'bg-slate-800 dark:bg-slate-200 hover:bg-slate-700 dark:hover:bg-white text-white dark:text-slate-800 border-slate-800 dark:border-slate-200'}`}>
              {uploading ? 'Processing...' : 'Upload Mentor CSV'}
            </label>
          </div>

          <button onClick={handleSendPortalLinks} disabled={sendingLinks || mentors.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm bg-violet-600 hover:bg-violet-700 disabled:bg-violet-200 dark:disabled:bg-violet-900/30 disabled:cursor-not-allowed text-white border-violet-600 dark:border-violet-500">
            {sendingLinks ? 'Generating...' : 'Send Mentor Portal Links'}
          </button>

          <button onClick={handleSendEmails} disabled={sendingEmails || mentors.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 dark:disabled:bg-indigo-900/30 disabled:cursor-not-allowed text-white border-indigo-600 dark:border-indigo-500">
            {sendingEmails ? 'Drafting...' : 'Draft Intro Emails'}
          </button>

          <button onClick={fetchMentors} disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600">
            Refresh Data
          </button>

          <button onClick={handleClear} disabled={clearing || mentors.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 ml-auto transition-colors duration-300">
            {clearing ? 'Clearing...' : 'Clear All'}
          </button>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 transition-colors duration-300">
          Required CSV format: <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 transition-colors duration-300">name, email, expertise, phone</code>
        </p>

        {uploadStatus && <div className={`mt-3 p-3 rounded-lg text-sm font-medium transition-colors duration-300 ${uploadStatus.startsWith('Success') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}>{uploadStatus}</div>}
        {linkStatus && <div className={`mt-3 p-3 rounded-lg text-sm font-medium transition-colors duration-300 ${linkStatus.startsWith('Success') ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}>{linkStatus}</div>}
        {emailStatus && <div className={`mt-3 p-3 rounded-lg text-sm font-medium transition-colors duration-300 ${emailStatus.startsWith('Success') ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}>{emailStatus}</div>}
        {reassignStatus && <div className={`mt-3 p-3 rounded-lg text-sm font-medium transition-colors duration-300 ${reassignStatus.startsWith('Success') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}>{reassignStatus}</div>}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden transition-colors duration-300">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors duration-300">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300">Mentor Assignments</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">{mentors.length} total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium transition-colors duration-300">Loading mentor data...</div>
        ) : mentors.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors duration-300">No mentors uploaded yet.</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 transition-colors duration-300">Upload a CSV to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 transition-colors duration-300">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expertise</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Team</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {mentors.map((mentor) => (
                  <React.Fragment key={mentor.id}>
                    <tr
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300 ${mentor.mentor_rationale ? 'cursor-pointer' : ''}`}
                      onClick={(e) => {
                        if (!e.target.closest('button') && !e.target.closest('select') && mentor.mentor_rationale) {
                          toggleRow(mentor.id);
                        }
                      }}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 transition-colors duration-300">
                        <div className="flex items-center gap-2">
                          {mentor.mentor_rationale && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 transition-colors duration-300">{expandedRow === mentor.id ? '▼' : '▶'}</span>
                          )}
                          {mentor.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 transition-colors duration-300">{mentor.email}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 transition-colors duration-300">{mentor.expertise || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 transition-colors duration-300">{mentor.phone || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                      <td className="px-6 py-4">
                        {mentor.assigned_team_name ? (
                          <span className="font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/50 transition-colors duration-300">
                            {mentor.assigned_team_name}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 transition-colors duration-300">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {mentor.assigned_team_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 transition-colors duration-300">Assigned</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 transition-colors duration-300">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {mentor.assigned_team_id ? (
                          reassignRow === mentor.assigned_team_id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedNewMentor}
                                onChange={(e) => setSelectedNewMentor(e.target.value)}
                                className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors duration-300"
                              >
                                <option value="">Select Mentor</option>
                                {allMentorsExcept(mentor.id).map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}{m.assigned_team_name ? ` (${m.assigned_team_name})` : ' (Unassigned)'}
                                  </option>
                                ))}
                              </select>
                              <button onClick={() => handleReassignConfirm(mentor.assigned_team_id)} disabled={!selectedNewMentor || reassigning}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 dark:disabled:bg-orange-900/30 disabled:cursor-not-allowed text-white transition-colors">
                                {reassigning ? 'Processing' : 'Confirm'}
                              </button>
                              <button onClick={() => { setReassignRow(null); setSelectedNewMentor(''); }}
                                className="text-xs px-2 py-1.5 rounded-lg font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors duration-300">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleReassignClick(mentor.assigned_team_id)}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 transition-colors duration-300">
                              Reassign
                            </button>
                          )
                        ) : (
                          assignRow === mentor.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-300"
                              >
                                <option value="">Select Team</option>
                                {teams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                              <button onClick={() => handleAssignConfirm(mentor.id)} disabled={!selectedTeam || reassigning}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 dark:disabled:bg-blue-900/30 disabled:cursor-not-allowed text-white transition-colors">
                                {reassigning ? 'Processing' : 'Confirm'}
                              </button>
                              <button onClick={() => { setAssignRow(null); setSelectedTeam(''); }}
                                className="text-xs px-2 py-1.5 rounded-lg font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors duration-300">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleAssignClick(mentor.id)}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 transition-colors duration-300">
                              Assign
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                    {expandedRow === mentor.id && mentor.mentor_rationale && (
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b-2 border-slate-200 dark:border-slate-700 transition-colors duration-300">
                        <td colSpan="7" className="p-6">
                          <div className="bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/50 rounded-lg p-5 shadow-inner transition-colors duration-300">
                            <h4 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 border-b border-purple-100 dark:border-purple-800/50 pb-2 transition-colors duration-300">
                              AI Assignment Rationale
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 italic m-0 transition-colors duration-300">"{mentor.mentor_rationale}"</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorManager;