import React, { useState } from 'react';
import axios from 'axios';

const ParticipantPortal = () => {
  const [participantId, setParticipantId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const fetchPortal = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.get(`http://localhost:8000/participant/${participantId}`);
      setData(res.data);
      setError('');
    } catch (err) {
      setError("Participant not found or backend error.");
      setData(null);
    }
  };

  return (
    <div>
      <h2>Participant Portal (Read-Only View)</h2>
      <form onSubmit={fetchPortal} style={{ marginBottom: '20px' }}>
        <input type="number" placeholder="Enter Participant ID (e.g. 1)" value={participantId} onChange={e => setParticipantId(e.target.value)} required style={{ padding: '8px', marginRight: '10px' }} />
        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View Portal</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {data && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>Welcome, {data.participant.name}!</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #eee' }}>
              <h4>Current Status</h4>
              <p><strong>Stage:</strong> {data.current_stage.label}</p>
              <p><strong>Team:</strong> {data.team ? `${data.team.name} (${data.team.status})` : 'Unassigned'}</p>
              <p><strong>Evaluator:</strong> {data.evaluator || 'Pending'}</p>
            </div>
            
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #eee' }}>
              <h4>Progression</h4>
              <p style={{ color: data.progression.is_qualified ? '#28a745' : '#856404', fontWeight: 'bold' }}>
                {data.progression.message}
              </p>
              <h4>Key Dates</h4>
              <ul style={{ paddingLeft: '20px', fontSize: '14px' }}>
                <li>Start: {data.key_dates.event_start}</li>
                <li>Results: {data.key_dates.results_date}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantPortal;