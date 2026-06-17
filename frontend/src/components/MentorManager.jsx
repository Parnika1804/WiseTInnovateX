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
      setUploadStatus(`✅ ${res.data.message}`);
      fetchMentors();
    } catch (err) {
      setUploadStatus(`❌ ${err.response?.data?.detail || 'Upload failed.'}`);
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
      setEmailStatus(`✅ ${res.data.mentor_emails_drafted} emails drafted and queued for approval in Comms tab.`);
      if (res.data.mentor_emails_drafted) notifyEmailDraft(res.data.mentor_emails_drafted);
    } catch (err) {
      setEmailStatus(`❌ ${err.response?.data?.detail || 'Failed to draft emails.'}`);
    } finally {
      setSendingEmails(false);
    }
  };

  const handleSendPortalLinks = async () => {
    setSendingLinks(true);
    setLinkStatus('');
    try {
      const res = await axios.post(`${API}/mentors/send-portal-links`);
      setLinkStatus(`✅ ${res.data.mentor_link_emails_drafted} mentor portal link emails drafted and queued for approval in Comms tab.`);
      if (res.data.mentor_link_emails_drafted) notifyEmailDraft(res.data.mentor_link_emails_drafted);
    } catch (err) {
      setLinkStatus(`❌ ${err.response?.data?.detail || 'Failed to draft portal link emails.'}`);
    } finally {
      setSendingLinks(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all mentors? This cannot be undone.')) return;
    setClearing(true);
    try {
      const res = await axios.delete(`${API}/mentors/clear`);
      setUploadStatus(`✅ ${res.data.message}`);
      setMentors([]);
    } catch (err) {
      setUploadStatus(`❌ ${err.response?.data?.detail || 'Clear failed.'}`);
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
      setReassignStatus(`✅ ${res.data.message}`);
      setReassignRow(null);
      setSelectedNewMentor('');
      fetchMentors();
    } catch (err) {
      setReassignStatus(`❌ ${err.response?.data?.detail || 'Reassignment failed.'}`);
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
      setReassignStatus(`✅ ${res.data.message}`);
      setAssignRow(null);
      setSelectedTeam('');
      fetchMentors();
    } catch (err) {
      setReassignStatus(`❌ ${err.response?.data?.detail || 'Assignment failed.'}`);
    } finally {
      setReassigning(false);
    }
  };

  const toggleRow = (id) => setExpandedRow(prev => prev === id ? null : id);

  const assignedCount = mentors.filter(m => m.assigned_team_id).length;
  const unassignedCount = mentors.length - assignedCount;
  const allMentorsExcept = (excludeMentorId) => mentors.filter(m => m.id !== excludeMentorId);

  // Shared status banner classes
  const statusClass = (msg, positiveColor) =>
    `mt-3 p-3 rounded-lg text-sm font-medium border ${
      msg.startsWith('✅')
        ? `${positiveColor}`
        : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
    }`;

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="
          rounded-xl p-5 shadow-sm border
          bg-white dark:bg-slate-900
          border-slate-200 dark:border-slate-800
        ">
          <p className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
            Total Mentors
          </p>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{mentors.length}</p>
        </div>
        <div className="
          rounded-xl p-5 shadow-sm border
          bg-white dark:bg-slate-900
          border-slate-200 dark:border-slate-800
        ">
          <p className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
            Assigned
          </p>
          <p className="text-3xl font-black text-green-600 dark:text-green-400">{assignedCount}</p>
        </div>
        <div className="
          rounded-xl p-5 shadow-sm border
          bg-white dark:bg-slate-900
          border-slate-200 dark:border-slate-800
        ">
          <p className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
            Unassigned
          </p>
          <p className={`text-3xl font-black ${
            unassignedCount > 0
              ? 'text-red-500 dark:text-red-400'
              : 'text-slate-300 dark:text-slate-600'
          }`}>
            {unassignedCount}
          </p>
        </div>
      </div>

      {/* Warning */}
      {unassignedCount > 0 && (
        <div className="
          rounded-xl p-4 flex items-center gap-3 border
          bg-amber-50 dark:bg-amber-950/30
          border-amber-200 dark:border-amber-800
        ">
          <span className="text-2xl"></span>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {unassignedCount} mentor{unassignedCount > 1 ? 's are' : ' is'} unassigned.
            Use the <strong>Assign</strong> button to manually assign them to a team.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="
        rounded-xl p-6 shadow-sm border
        bg-white dark:bg-slate-900
        border-slate-200 dark:border-slate-800
      ">
        <h3 className="
          text-lg font-bold mb-4 border-b pb-2
          text-slate-800 dark:text-slate-100
          border-slate-100 dark:border-slate-800
        ">
          Mentor Management
        </h3>

        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
              id="mentor-csv-upload"
            />
            <label
              htmlFor="mentor-csv-upload"
              className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm ${
                uploading
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white border-slate-800 dark:border-slate-700'
              }`}
            >
              {uploading ? ' Uploading...' : ' Upload Mentor CSV'}
            </label>
          </div>

          <button
            onClick={handleSendPortalLinks}
            disabled={sendingLinks || mentors.length === 0}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm
              bg-violet-600 hover:bg-violet-700
              dark:bg-violet-500 dark:hover:bg-violet-600
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white border-violet-600 dark:border-violet-500
            "
          >
            {sendingLinks ? ' Generating...' : '🔗 Send Mentor Portal Links'}
          </button>

          <button
            onClick={handleSendEmails}
            disabled={sendingEmails || mentors.length === 0}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm
              bg-indigo-600 hover:bg-indigo-700
              dark:bg-indigo-500 dark:hover:bg-indigo-600
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white border-indigo-600 dark:border-indigo-500
            "
          >
            {sendingEmails ? ' Drafting...' : ' Draft Intro Emails'}
          </button>

          <button
            onClick={fetchMentors}
            disabled={loading}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm
              bg-white dark:bg-slate-800
              hover:bg-slate-50 dark:hover:bg-slate-700
              text-slate-700 dark:text-slate-300
              border-slate-200 dark:border-slate-700
            "
          >
            🔄 Refresh
          </button>

          <button
            onClick={handleClear}
            disabled={clearing || mentors.length === 0}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm ml-auto
              bg-red-50 dark:bg-red-950/30
              hover:bg-red-100 dark:hover:bg-red-950/50
              disabled:opacity-40 disabled:cursor-not-allowed
              text-red-700 dark:text-red-400
              border-red-200 dark:border-red-800
            "
          >
            {clearing ? ' Clearing...' : ' Clear All'}
          </button>
        </div>

        <p className="text-xs mt-3 text-slate-400 dark:text-slate-500">
          CSV format:{' '}
          <code className="
            px-1.5 py-0.5 rounded
            bg-slate-100 dark:bg-slate-800
            text-slate-600 dark:text-slate-400
          ">
            name, email, expertise, phone
          </code>
        </p>

        {uploadStatus && (
          <div className={statusClass(uploadStatus, 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800')}>
            {uploadStatus}
          </div>
        )}
        {linkStatus && (
          <div className={statusClass(linkStatus, 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800')}>
            {linkStatus}
          </div>
        )}
        {emailStatus && (
          <div className={statusClass(emailStatus, 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800')}>
            {emailStatus}
          </div>
        )}
        {reassignStatus && (
          <div className={statusClass(reassignStatus, 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800')}>
            {reassignStatus}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="
        rounded-xl shadow-sm overflow-hidden border
        bg-white dark:bg-slate-900
        border-slate-200 dark:border-slate-800
      ">
        <div className="
          px-6 py-4 border-b flex items-center justify-between
          border-slate-100 dark:border-slate-800
        ">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Mentor Assignments</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {mentors.length} mentor{mentors.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center font-medium text-slate-400 dark:text-slate-500">
            Loading mentors...
          </div>
        ) : mentors.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3"></div>
            <p className="font-medium text-slate-500 dark:text-slate-400">No mentors uploaded yet.</p>
            <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">Upload a CSV to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="
                  border-b
                  bg-slate-50 dark:bg-slate-800/50
                  border-slate-100 dark:border-slate-700
                ">
                  {['Name', 'Email', 'Expertise', 'Phone', 'Assigned Team', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {mentors.map((mentor) => (
                  <React.Fragment key={mentor.id}>
                    <tr
                      className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${mentor.mentor_rationale ? 'cursor-pointer' : ''}`}
                      onClick={(e) => {
                        if (!e.target.closest('button') && !e.target.closest('select') && mentor.mentor_rationale) {
                          toggleRow(mentor.id);
                        }
                      }}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          {mentor.mentor_rationale && (
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                              {expandedRow === mentor.id ? '▼' : '▶'}
                            </span>
                          )}
                          {mentor.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{mentor.email}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {mentor.expertise || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {mentor.phone || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {mentor.assigned_team_name ? (
                          <span className="
                            font-semibold px-2.5 py-1 rounded-lg border
                            text-indigo-700 dark:text-indigo-300
                            bg-indigo-50 dark:bg-indigo-950/40
                            border-indigo-100 dark:border-indigo-800
                          ">
                            {mentor.assigned_team_name}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {mentor.assigned_team_id ? (
                          <span className="
                            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                            bg-green-100 dark:bg-green-950/40
                            text-green-700 dark:text-green-300
                            border-green-200 dark:border-green-800
                          ">
                            ✓ Assigned
                          </span>
                        ) : (
                          <span className="
                            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                            bg-red-100 dark:bg-red-950/40
                            text-red-600 dark:text-red-300
                            border-red-200 dark:border-red-800
                          ">
                             Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {mentor.assigned_team_id ? (
                          reassignRow === mentor.assigned_team_id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedNewMentor}
                                onChange={(e) => setSelectedNewMentor(e.target.value)}
                                className="
                                  text-xs rounded-lg px-2 py-1.5 border outline-none
                                  bg-white dark:bg-slate-800
                                  border-slate-200 dark:border-slate-700
                                  text-slate-700 dark:text-slate-300
                                  focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500
                                "
                              >
                                <option value="">Pick mentor...</option>
                                {allMentorsExcept(mentor.id).map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}{m.assigned_team_name ? ` (${m.assigned_team_name})` : ' (Unassigned)'}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleReassignConfirm(mentor.assigned_team_id)}
                                disabled={!selectedNewMentor || reassigning}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                              >
                                {reassigning ? '...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => { setReassignRow(null); setSelectedNewMentor(''); }}
                                className="
                                  text-xs px-2 py-1.5 rounded-lg font-semibold transition-colors
                                  bg-slate-100 dark:bg-slate-800
                                  hover:bg-slate-200 dark:hover:bg-slate-700
                                  text-slate-600 dark:text-slate-400
                                "
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleReassignClick(mentor.assigned_team_id)}
                              className="
                                text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors
                                bg-orange-50 dark:bg-orange-950/30
                                hover:bg-orange-100 dark:hover:bg-orange-950/50
                                text-orange-700 dark:text-orange-300
                                border-orange-200 dark:border-orange-800
                              "
                            >
                              🔀 Reassign
                            </button>
                          )
                        ) : (
                          assignRow === mentor.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="
                                  text-xs rounded-lg px-2 py-1.5 border outline-none
                                  bg-white dark:bg-slate-800
                                  border-slate-200 dark:border-slate-700
                                  text-slate-700 dark:text-slate-300
                                  focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500
                                "
                              >
                                <option value="">Pick team...</option>
                                {teams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignConfirm(mentor.id)}
                                disabled={!selectedTeam || reassigning}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                              >
                                {reassigning ? '...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => { setAssignRow(null); setSelectedTeam(''); }}
                                className="
                                  text-xs px-2 py-1.5 rounded-lg font-semibold transition-colors
                                  bg-slate-100 dark:bg-slate-800
                                  hover:bg-slate-200 dark:hover:bg-slate-700
                                  text-slate-600 dark:text-slate-400
                                "
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAssignClick(mentor.id)}
                              className="
                                text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors
                                bg-blue-50 dark:bg-blue-950/30
                                hover:bg-blue-100 dark:hover:bg-blue-950/50
                                text-blue-700 dark:text-blue-300
                                border-blue-200 dark:border-blue-800
                              "
                            >
                              ➕ Assign
                            </button>
                          )
                        )}
                      </td>
                    </tr>

                    {/* Collapsible AI Rationale Row */}
                    {expandedRow === mentor.id && mentor.mentor_rationale && (
                      <tr className="
                        border-b-2
                        bg-slate-50 dark:bg-slate-800/50
                        border-slate-200 dark:border-slate-700
                      ">
                        <td colSpan="7" className="p-6">
                          <div className="
                            rounded-lg p-5 shadow-inner border
                            bg-white dark:bg-slate-900
                            border-purple-200 dark:border-purple-800
                          ">
                            <h4 className="
                              text-sm font-bold uppercase tracking-wider mb-2 border-b pb-2
                              text-purple-600 dark:text-purple-400
                              border-purple-100 dark:border-purple-800
                            ">
                               AI Assignment Rationale
                            </h4>
                            <p className="text-sm italic m-0 text-slate-600 dark:text-slate-400">
                              "{mentor.mentor_rationale}"
                            </p>
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