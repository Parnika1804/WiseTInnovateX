import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ApproveRejectButtons from './ApproveRejectButtons';

const TeamList = ({ refreshTrigger }) => {
  const [teams, setTeams] = useState([]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get('http://localhost:8000/teams');
      setTeams(res.data); 
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [refreshTrigger]);

  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>3. Review Proposed Teams</h3>
      {teams.length === 0 ? (
        <p>No teams generated yet. Run the generator above.</p>
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
                <strong>Member IDs:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '14px' }}>
                  {team.member_ids ? team.member_ids.map((id, i) => <li key={i}>Participant #{id}</li>) : <li>No members listed</li>}
                </ul>
              </div>

              {/* AI Rationale Box */}
              <div style={{ fontSize: '13px', color: '#333', backgroundColor: '#f0f7ff', borderLeft: '3px solid #0056b3', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                <strong>✨ AI Rationale:</strong> <br/>
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