import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ApproveRejectButtons from './ApproveRejectButtons';

const API = 'http://localhost:8000';

const TeamList = ({ refreshTrigger }) => {
  const [teams, setTeams] = useState([]);
  const [clearing, setClearing] = useState(false);

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

      {teams.length === 0 ? (
        <p style={{ color: '#888', fontSize: '14px' }}>No teams generated yet. Use the AI Team Formation above to generate.</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {teams.map((team) => (
            <div key={team.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>{team.name}</h4>
                <span style={{
                  padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                  backgroundColor: team.status === 'APPROVED' ? '#d4edda' : team.status === 'REJECTED' ? '#f8d7da' : '#fff3cd',
                  color: team.status === 'APPROVED' ? '#155724' : team.status === 'REJECTED' ? '#721c24' : '#856404'
                }}>
                  {team.status || 'PENDING'}
                </span>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Members:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '14px' }}>
                  {team.member_ids
                    ? team.member_ids.map((id, i) => <li key={i}>Participant #{id}</li>)
                    : <li>No members listed</li>}
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
