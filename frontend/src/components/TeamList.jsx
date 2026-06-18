import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ApproveRejectButtons from './ApproveRejectButtons';

const API = 'http://localhost:8000';

const TeamList = ({ refreshTrigger }) => {
  const [teams, setTeams] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [moveState, setMoveState] = useState({}); 
  const [moveStatus, setMoveStatus] = useState('');

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${API}/teams`);
      setTeams(res.data);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  useEffect(() => { fetchTeams(); }, [refreshTrigger]);

  const handleClearTeams = async () => {
    if (!window.confirm("Clear all generated teams? This cannot be undone.")) return;
    setClearing(true);
    try {
      await axios.delete(`${API}/teams/clear`);
      setTeams([]);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to clear teams.");
    } finally {
      setClearing(false);
    }
  };

  const toggleMovePanel = (memberId) => {
    setMoveState(prev => ({
      ...prev,
      [memberId]: {
        open: !prev[memberId]?.open,
        selectedTeam: '',
        moving: false
      }
    }));
    setMoveStatus('');
  };

  const handleMoveConfirm = async (member, fromTeamId) => {
    const state = moveState[member.id];
    if (!state?.selectedTeam) return;

    setMoveState(prev => ({ ...prev, [member.id]: { ...prev[member.id], moving: true } }));
    setMoveStatus('');

    try {
      const res = await axios.patch(`${API}/teams/move-member`, {
        member_id: member.id,
        from_team_id: fromTeamId,
        to_team_id: parseInt(state.selectedTeam)
      });
      setMoveStatus(`Success: ${res.data.message}`);
      setMoveState(prev => ({ ...prev, [member.id]: { open: false, selectedTeam: '', moving: false } }));
      fetchTeams();
    } catch (err) {
      setMoveStatus(`Error: ${err.response?.data?.detail || 'Move failed.'}`);
      setMoveState(prev => ({ ...prev, [member.id]: { ...prev[member.id], moving: false } }));
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-100 dark:border-slate-700/50 pb-4 mb-6 gap-4 transition-colors duration-300">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 m-0 transition-colors">Review Proposed Teams ({teams.length})</h3>
        {teams.length > 0 && (
          <button
            onClick={handleClearTeams}
            disabled={clearing}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            {clearing ? 'Clearing...' : 'Clear All Teams'}
          </button>
        )}
      </div>

      {moveStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-semibold border transition-colors duration-300 ${
          moveStatus.startsWith('Success') ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800/50'
        }`}>
          {moveStatus}
        </div>
      )}

      {teams.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">No teams generated yet. Use the AI Team Formation above to generate.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex flex-col transition-colors duration-300">

              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-4 gap-3 transition-colors">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 m-0 truncate transition-colors">{team.name}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                    team.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 
                    team.status === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : 
                    'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400'
                  }`}>
                    {team.status || 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="mb-4 flex-1">
                <strong className="text-sm text-slate-800 dark:text-slate-200 block mb-2 transition-colors">Members:</strong>
                <ul className="space-y-2">
                  {team.members && team.members.length > 0
                    ? team.members.map((member) => (
                      <li key={member.id}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 gap-3 transition-colors">
                          <span className="text-sm text-slate-800 dark:text-slate-200 transition-colors">
                            <strong className="font-semibold">{member.name}</strong>
                            {member.skill && <span className="text-slate-500 dark:text-slate-400 ml-1.5 text-xs transition-colors">({member.skill})</span>}
                          </span>
                          <button
                            onClick={() => toggleMovePanel(member.id)}
                            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors border w-full sm:w-auto shrink-0 ${
                              moveState[member.id]?.open ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {moveState[member.id]?.open ? 'Cancel' : 'Move'}
                          </button>
                        </div>

                        {moveState[member.id]?.open && (
                          <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30 rounded-lg flex flex-col sm:flex-row gap-2 items-stretch sm:items-center transition-colors">
                            <select
                              value={moveState[member.id]?.selectedTeam || ''}
                              onChange={(e) => setMoveState(prev => ({
                                ...prev,
                                [member.id]: { ...prev[member.id], selectedTeam: e.target.value }
                              }))}
                              className="text-sm p-2 rounded-md border border-indigo-300 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-200 flex-1 transition-colors"
                            >
                              <option value="">Move to team...</option>
                              {teams
                                .filter(t => t.id !== team.id)
                                .map(t => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.members?.length || 0} members)</option>
                                ))}
                            </select>
                            <button
                              onClick={() => handleMoveConfirm(member, team.id)}
                              disabled={!moveState[member.id]?.selectedTeam || moveState[member.id]?.moving}
                              className={`text-sm px-4 py-2 rounded-md font-semibold transition-colors w-full sm:w-auto shrink-0 ${
                                moveState[member.id]?.selectedTeam ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-300 dark:bg-indigo-800/50 text-indigo-50 dark:text-indigo-300 cursor-not-allowed'
                              }`}
                            >
                              {moveState[member.id]?.moving ? 'Processing' : 'Confirm'}
                            </button>
                          </div>
                        )}
                      </li>
                    ))
                    : team.member_ids?.map((id, i) => <li key={i} className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Participant #{id}</li>)
                  }
                </ul>
              </div>

              <div className="text-sm text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-600 dark:border-blue-500 p-4 rounded-r-lg mb-4 transition-colors duration-300">
                <strong className="block mb-1 text-blue-900 dark:text-blue-300 transition-colors">AI Rationale:</strong>
                {team.rationale}
              </div>

              <ApproveRejectButtons teamId={team.id} currentStatus={team.status} onStatusChange={fetchTeams} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamList;