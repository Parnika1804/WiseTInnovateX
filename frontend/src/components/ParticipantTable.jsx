import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ParticipantTable = ({ refreshTrigger }) => {
  const [participants, setParticipants] = useState([]);

  const fetchParticipants = () => {
    axios.get('http://localhost:8000/roster')
      .then(res => setParticipants(res.data))
      .catch(err => console.error("Error fetching participants:", err));
  };

  useEffect(() => { fetchParticipants(); }, [refreshTrigger]);

  const handleClearAll = async () => {
    if (!window.confirm(`Delete all ${participants.length} participants? This cannot be undone.`)) return;
    try {
      await axios.delete('http://localhost:8000/roster/clear');
      setParticipants([]);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to clear roster');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await axios.delete(`http://localhost:8000/roster/${id}`);
      setParticipants(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete participant');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Participant Roster ({participants.length})</h3>
        {participants.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{ backgroundColor: '#e53e3e', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            🗑 Clear All
          </button>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>ID</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Name</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Email</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>Skills</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}></th>
          </tr>
        </thead>
        <tbody>
          {participants.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: '#999' }}>No participants loaded.</td></tr>
          ) : (
            participants.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{p.id}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.name}</td>
                <td style={{ padding: '12px' }}>{p.email}</td>
                <td style={{ padding: '12px' }}>{p.skill}</td>
                <td style={{ padding: '8px' }}>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    style={{ backgroundColor: 'transparent', color: '#e53e3e', border: '1px solid #e53e3e', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ParticipantTable;