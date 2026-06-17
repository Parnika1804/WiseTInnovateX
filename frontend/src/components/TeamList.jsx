import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ApproveRejectButtons from './ApproveRejectButtons';

const API = 'http://localhost:8000';

const TeamList = ({ refreshTrigger }) => {
  const [teams, setTeams] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [moveState, setMoveState] = useState({}); // { memberId: { open, selectedTeam, moving } }
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
      setMoveStatus(`✅ ${res.data.message}`);
      setMoveState(prev => ({ ...prev, [member.id]: { open: false, selectedTeam: '', moving: false } }));
      fetchTeams();
    } catch (err) {
      setMoveStatus(`❌ ${err.response?.data?.detail || 'Move failed.'}`);
      setMoveState(prev => ({ ...prev, [member.id]: { ...prev[member.id], moving: false } }));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center border-b-2 border-gray-100 dark:border-slate-700 pb-2.5 mb-4">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 font-bold">Review Proposed Teams ({teams.length})</h3>
        {teams.length > 0 && (
          <button
            onClick={handleClearTeams}
            disabled={clearing}
            className={`text-white border-none px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
              clearing ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed' : 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 cursor-pointer'
            }`}
          >
            {clearing ? 'Clearing...' : '🗑 Clear All Teams'}
          </button>
        )}
      </div>

      {/* Move status message */}
      {moveStatus && (
        <div className={`mb-3 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold border ${
          moveStatus.startsWith('✅')
            ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
        }`}>
          {moveStatus}
        </div>
      )}

      {teams.length === 0 ? (
        <p className="text-gray-500 dark:text-slate-400 text-sm">No teams generated yet. Use the AI Team Formation above to generate.</p>
      ) : (
        <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {teams.map((team) => (
            <div key={team.id} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-sm">

              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2.5 mb-2.5">
                <h4 className="m-0 text-slate-900 dark:text-slate-100 font-semibold">{team.name}</h4>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    team.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300' :
                    team.status === 'REJECTED' ? 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300' :
                    'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                  }`}>
                    {team.status || 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="mb-2.5">
                <strong className="text-[13px] text-slate-700 dark:text-slate-300">Members:</strong>
                <ul className="my-1.5 pl-0 list-none text-[13px]">
                  {team.members && team.members.length > 0
                    ? team.members.map((member) => (
                      <li key={member.id} className="mb-1.5">
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-md">
                          <span className="text-slate-900 dark:text-slate-100">
                            <strong>{member.name}</strong>
                            {member.skill && <span className="text-gray-500 dark:text-slate-400 ml-1.5 text-xs">({member.skill})</span>}
                          </span>
                          <button
                            onClick={() => toggleMovePanel(member.id)}
                            className={`text-[11px] px-2 py-1 rounded border font-semibold transition-colors ${
                              moveState[member.id]?.open
                                ? 'bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-gray-700 dark:text-slate-200'
                                : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200'
                            }`}
                          >
                            {moveState[member.id]?.open ? 'Cancel' : '↔ Move'}
                          </button>
                        </div>

                        {/* Move panel */}
                        {moveState[member.id]?.open && (
                          <div className="mt-1 p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-md border border-indigo-200 dark:border-indigo-800 flex gap-1.5 items-center">
                            <select
                              value={moveState[member.id]?.selectedTeam || ''}
                              onChange={(e) => setMoveState(prev => ({
                                ...prev,
                                [member.id]: { ...prev[member.id], selectedTeam: e.target.value }
                              }))}
                              className="text-xs px-1.5 py-1 rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex-1"
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
                              className={`text-xs px-2.5 py-1 rounded border-none text-white font-semibold transition-colors ${
                                moveState[member.id]?.selectedTeam
                                  ? 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 cursor-pointer'
                                  : 'bg-indigo-300 dark:bg-indigo-700 cursor-not-allowed'
                              }`}
                            >
                              {moveState[member.id]?.moving ? '...' : 'Confirm'}
                            </button>
                          </div>
                        )}
                      </li>
                    ))
                    : team.member_ids?.map((id, i) => <li key={i} className="text-slate-700 dark:text-slate-300">Participant #{id}</li>)
                  }
                </ul>
              </div>

              <div className="text-[13px] text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-950/30 border-l-[3px] border-[#0056b3] dark:border-blue-500 p-2.5 rounded mb-4">
                <strong className="text-slate-900 dark:text-slate-100"> AI Rationale:</strong><br />
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