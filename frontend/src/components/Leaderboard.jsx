import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Leaderboard = ({ refreshTrigger }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null); // Tracks which row is open

  useEffect(() => {
    axios.get('http://localhost:8000/scores/leaderboard')
      .then(res => setLeaderboard(res.data))
      .catch(err => console.error("Error fetching leaderboard:", err));
  }, [refreshTrigger]);

  const toggleRow = (teamId) => {
    // If it's already open, close it. Otherwise, open the clicked row.
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  return (
    <div>
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Live Leaderboard
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f9' }}>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Rank</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Team Name</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Average Score</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Status</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd', textAlign: 'center' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: '12px', textAlign: 'center' }}>No scores submitted yet.</td></tr>
          ) : (
            leaderboard.map((team, index) => (
              <React.Fragment key={team.team_id}>
                {/* --- MAIN ROW --- */}
                <tr 
                  onClick={() => toggleRow(team.team_id)}
                  style={{ 
                    backgroundColor: team.results_on_hold ? '#fff3cd' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  className="hover:bg-gray-50"
                >
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>#{index + 1}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{team.team_name}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', color: team.average_score >= 7.0 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                    {team.average_score.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    {team.results_on_hold ? (
                      <span style={{ backgroundColor: '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        ⚠️ ANOMALY ON HOLD
                      </span>
                    ) : (
                      <span style={{ color: '#28a745', fontSize: '12px', fontWeight: 'bold' }}>VERIFIED</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#007bff' }}>
                    {expandedTeamId === team.team_id ? '▼ Hide' : '▶ View'}
                  </td>
                </tr>

                {/* --- EXPANDED DETAILS ROW --- */}
                {expandedTeamId === team.team_id && (
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <td colSpan="5" style={{ padding: '16px', borderBottom: '2px solid #ddd' }}>
                      <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#4a5568' }}>Detailed Judge Evaluations</h4>
                        
                        {team.scores && team.scores.length > 0 ? (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {team.scores.map((score, sIdx) => (
                              <div key={sIdx} style={{ 
                                padding: '12px', 
                                borderLeft: `4px solid ${score.is_anomaly ? '#ef4444' : '#3b82f6'}`,
                                backgroundColor: '#f8fafc',
                                borderRadius: '4px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{score.judge_name}</span>
                                  <span style={{ fontWeight: 'bold', color: score.is_anomaly ? '#ef4444' : '#0f172a' }}>
                                    Score: {score.score.toFixed(2)} 
                                    {score.is_anomaly && " (⚠️ Anomaly)"}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', color: '#475569', fontStyle: 'italic' }}>
                                  "{score.feedback}"
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>No detailed scores available for this team.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        * Teams flagged with an anomaly have a judge score deviating &gt; 2.0 points from the panel average. Click any row to view individual judge scores.
      </p>
    </div>
  );
};

export default Leaderboard;