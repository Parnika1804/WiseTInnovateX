import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Leaderboard = ({ refreshTrigger }) => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/scores/leaderboard')
      .then(res => setLeaderboard(res.data))
      .catch(err => console.error("Error fetching leaderboard:", err));
  }, [refreshTrigger]);

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
          </tr>
        </thead>
        <tbody>
          {leaderboard.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '12px', textAlign: 'center' }}>No scores submitted yet.</td></tr>
          ) : (
            leaderboard.map((team, index) => (
              <tr key={team.team_id} style={{ backgroundColor: team.results_on_hold ? '#fff3cd' : 'transparent' }}>
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
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        * Teams flagged with an anomaly have a judge score deviating &gt; 2.0 points from the panel average.
      </p>
    </div>
  );
};

export default Leaderboard;