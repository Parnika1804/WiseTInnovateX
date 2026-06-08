import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const MentorManager = () => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMentors();
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
    } catch (err) {
      setEmailStatus(`❌ ${err.response?.data?.detail || 'Failed to draft emails.'}`);
    } finally {
      setSendingEmails(false);
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

  const assignedCount = mentors.filter(m => m.assigned_team_id).length;
  const unassignedCount = mentors.length - assignedCount;

  return (
    <div className="space-y-6">

      {/* Header stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Mentors</p>
          <p className="text-3xl font-black text-slate-800">{mentors.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Assigned</p>
          <p className="text-3xl font-black text-green-600">{assignedCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unassigned</p>
          <p className="text-3xl font-black text-amber-500">{unassignedCount}</p>
        </div>
      </div>

      {/* Actions card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Mentor Management</h3>

        <div className="flex flex-wrap gap-3 items-center">
          {/* CSV Upload */}
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
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-800'
              }`}
            >
              {uploading ? '⏳ Uploading...' : '📂 Upload Mentor CSV'}
            </label>
          </div>

          {/* Draft emails */}
          <button
            onClick={handleSendEmails}
            disabled={sendingEmails || mentors.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 disabled:cursor-not-allowed text-white border-indigo-600"
          >
            {sendingEmails ? '⏳ Drafting...' : '✉️ Draft Intro Emails'}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchMentors}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
          >
            🔄 Refresh
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            disabled={clearing || mentors.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border shadow-sm bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed text-red-700 border-red-200 ml-auto"
          >
            {clearing ? '⏳ Clearing...' : '🗑️ Clear All'}
          </button>
        </div>

        {/* CSV format hint */}
        <p className="text-xs text-slate-400 mt-3">
          CSV format: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">name, email, expertise, phone</code>
        </p>

        {/* Status messages */}
        {uploadStatus && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            uploadStatus.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {uploadStatus}
          </div>
        )}
        {emailStatus && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            emailStatus.startsWith('✅') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {emailStatus}
          </div>
        )}
      </div>

      {/* Mentors table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Mentor Assignments</h3>
          <span className="text-sm text-slate-500">{mentors.length} mentor{mentors.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-medium">Loading mentors...</div>
        ) : mentors.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🧑‍🏫</div>
            <p className="text-slate-500 font-medium">No mentors uploaded yet.</p>
            <p className="text-slate-400 text-sm mt-1">Upload a CSV to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Expertise</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Team</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mentors.map((mentor) => (
                  <tr key={mentor.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{mentor.name}</td>
                    <td className="px-6 py-4 text-slate-600">{mentor.email}</td>
                    <td className="px-6 py-4 text-slate-600">{mentor.expertise || <span className="text-slate-300">—</span>}</td>
                    <td className="px-6 py-4 text-slate-600">{mentor.phone || <span className="text-slate-300">—</span>}</td>
                    <td className="px-6 py-4">
                      {mentor.assigned_team_name ? (
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          {mentor.assigned_team_name}
                        </span>
                      ) : (
                        <span className="text-slate-300">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {mentor.assigned_team_id ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                          ✓ Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                  </tr>
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