import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://wisetinnovatex-r4vx.onrender.com';

const ParticipantTable = ({ refreshTrigger }) => {
  const [participants, setParticipants] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetchParticipants();
  }, [refreshTrigger]);

  const fetchParticipants = async () => {
    try {
      const res = await axios.get(`${API}/roster`);
      setParticipants(res.data);
    } catch (error) {
      console.error("Failed to fetch roster", error);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the roster?`)) return;
    setLoadingId(id);
    try {
      await axios.delete(`${API}/roster/${id}`);
      fetchParticipants();
    } catch (error) {
      alert("Failed to delete participant.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear the entire roster? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/roster/clear`);
      fetchParticipants();
    } catch (error) {
      alert("Failed to clear roster.");
    }
  };

  if (participants.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors duration-300">No participants uploaded yet. Upload a CSV to populate the roster.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300">Active Roster ({participants.length})</h3>
        <button
          onClick={handleClearAll}
          className="text-sm px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-semibold transition-colors duration-300 border border-red-200 dark:border-red-800/50 w-full sm:w-auto"
        >
          Clear All
        </button>
      </div>
      
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-colors duration-300">
        <table className="w-full text-left border-collapse bg-white dark:bg-slate-800 min-w-[600px] transition-colors duration-300">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hacker</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Skill Track</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Institution</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Experience</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {participants.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300">
                <td className="p-4">
                  <div className="font-bold text-slate-800 dark:text-slate-200 transition-colors duration-300">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">{p.email}</div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 transition-colors duration-300">
                    {p.skill}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-sm text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300">{p.institution || 'N/A'}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-slate-700 dark:text-slate-300 transition-colors duration-300">
                    {p.experience_level ? (
                      <span className="font-medium">{p.experience_level}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">Level Not Provided</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium transition-colors duration-300">
                    {p.prior_hackathons} Prior Hackathon{p.prior_hackathons !== 1 && 's'}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={loadingId === p.id}
                    className="text-xs px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md font-bold transition-colors duration-300 border border-slate-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-800/50 disabled:opacity-50"
                  >
                    {loadingId === p.id ? 'Removing...' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipantTable;