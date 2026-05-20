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
      <h3>Live Leaderboard</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#fff' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f9' }}>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Rank</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Team Name</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Average Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.length === 0 ? (
            <tr><td colSpan="3" style={{ padding: '12px', textAlign: 'center' }}>No scores submitted yet.</td></tr>
          ) : (
            leaderboard.map((team, index) => (
              <tr key={team.team_id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>#{index + 1}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{team.team_name}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', color: team.average_score >= 7.0 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                  {team.average_score.toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;