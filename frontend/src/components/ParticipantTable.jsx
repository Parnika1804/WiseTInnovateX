import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ParticipantTable = ({ refreshTrigger }) => {
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/roster')
      .then(res => setParticipants(res.data))
      .catch(err => console.error("Error fetching participants:", err));
  }, [refreshTrigger]);

  return (
    <div>
      <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Participant Roster</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>ID</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Name</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Email</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Skills</th>
          </tr>
        </thead>
        <tbody>
          {participants.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '12px', textAlign: 'center' }}>No participants loaded.</td></tr>
          ) : (
            participants.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{p.id}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.name}</td>
                <td style={{ padding: '12px' }}>{p.email}</td>
                <td style={{ padding: '12px' }}>{p.skill}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ParticipantTable;