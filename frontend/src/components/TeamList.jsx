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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Review Proposed Teams ({teams.length})</h3>
        {teams.length > 0 && (
          <button
            onClick={handleClearTeams}
            disabled={clearing}
            style={{
              backgroundColor: clearing ? '#aaa' : '#e53e3e',
              color: 'white', border: 'none', padding: '6px 14px',
              borderRadius: '6px', cursor: clearing ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: '600',
            }}
          >
            {clearing ? 'Clearing...' : '🗑 Clear All Teams'}
          </button>
        )}
      </div>

      {/* Move status message */}
      {moveStatus && (
        <div style={{
          marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
          backgroundColor: moveStatus.startsWith('✅') ? '#d4edda' : '#f8d7da',
          color: moveStatus.startsWith('✅') ? '#155724' : '#721c24',
          border: `1px solid ${moveStatus.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {moveStatus}
        </div>
      )}

      {teams.length === 0 ? (
        <p style={{ color: '#888', fontSize: '14px' }}>No teams generated yet. Use the AI Team Formation above to generate.</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {teams.map((team) => (
            <div key={team.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>{team.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                    backgroundColor: team.status === 'APPROVED' ? '#d4edda' : team.status === 'REJECTED' ? '#f8d7da' : '#fff3cd',
                    color: team.status === 'APPROVED' ? '#155724' : team.status === 'REJECTED' ? '#721c24' : '#856404'
                  }}>
                    {team.status || 'PENDING'}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong style={{ fontSize: '13px' }}>Members:</strong>
                <ul style={{ margin: '6px 0', paddingLeft: '0', listStyle: 'none', fontSize: '13px' }}>
                  {team.members && team.members.length > 0
                    ? team.members.map((member) => (
                      <li key={member.id} style={{ marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: '6px 10px', borderRadius: '6px' }}>
                          <span>
                            <strong>{member.name}</strong>
                            {member.skill && <span style={{ color: '#666', marginLeft: '6px', fontSize: '12px' }}>({member.skill})</span>}
                          </span>
                          <button
                            onClick={() => toggleMovePanel(member.id)}
                            style={{
                              fontSize: '11px', padding: '3px 8px', borderRadius: '5px', border: '1px solid #cbd5e0',
                              backgroundColor: moveState[member.id]?.open ? '#e2e8f0' : '#fff',
                              cursor: 'pointer', fontWeight: '600', color: '#4a5568'
                            }}
                          >
                            {moveState[member.id]?.open ? 'Cancel' : '↔ Move'}
                          </button>
                        </div>

                        {/* Move panel */}
                        {moveState[member.id]?.open && (
                          <div style={{ marginTop: '4px', padding: '8px', backgroundColor: '#eef2ff', borderRadius: '6px', border: '1px solid #c7d2fe', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <select
                              value={moveState[member.id]?.selectedTeam || ''}
                              onChange={(e) => setMoveState(prev => ({
                                ...prev,
                                [member.id]: { ...prev[member.id], selectedTeam: e.target.value }
                              }))}
                              style={{ fontSize: '12px', padding: '4px 6px', borderRadius: '5px', border: '1px solid #a5b4fc', flex: 1 }}
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
                              style={{
                                fontSize: '12px', padding: '4px 10px', borderRadius: '5px', border: 'none',
                                backgroundColor: moveState[member.id]?.selectedTeam ? '#4f46e5' : '#a5b4fc',
                                color: 'white', cursor: moveState[member.id]?.selectedTeam ? 'pointer' : 'not-allowed',
                                fontWeight: '600'
                              }}
                            >
                              {moveState[member.id]?.moving ? '...' : 'Confirm'}
                            </button>
                          </div>
                        )}
                      </li>
                    ))
                    : team.member_ids?.map((id, i) => <li key={i}>Participant #{id}</li>)
                  }
                </ul>
              </div>

              <div style={{ fontSize: '13px', color: '#333', backgroundColor: '#f0f7ff', borderLeft: '3px solid #0056b3', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                <strong>✨ AI Rationale:</strong><br />
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