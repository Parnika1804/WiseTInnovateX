import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const ParticipantPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError("No access token provided. Please use your official secure link.");
      return;
    }
    
    try {
      // Simulating JWT decode
      const decoded = JSON.parse(atob(token));
      fetchPortal(decoded.id);
    } catch (err) {
      setError("Invalid or expired security token.");
    }
  }, [token]);

  const fetchPortal = async (id) => {
    try {
      const res = await axios.get(`http://localhost:8000/participant/${id}`);
      setData(res.data);
    } catch (err) {
      setError("Participant not found or backend error.");
    }
  };

  if (error) return <div style={{ padding: '20px', color: 'red' }}><h3>Access Denied</h3><p>{error}</p></div>;
  if (!data) return <div style={{ padding: '20px' }}>Loading secure portal...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#f8f9fa', padding: '30px', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>EventFlow Participant Portal</h2>
      <h3 style={{ color: '#0056b3' }}>Welcome back, {data.participant.name}!</h3>
      
      {/* Progression Invite Alert */}
      {data.current_stage.name === 'RESULTS' && data.progression && (
        <div style={{ padding: '15px', borderRadius: '8px', marginBottom: '20px', backgroundColor: data.progression.is_qualified ? '#d4edda' : '#fff3cd', border: `1px solid ${data.progression.is_qualified ? '#c3e6cb' : '#ffeeba'}`, color: data.progression.is_qualified ? '#155724' : '#856404' }}>
          <h4 style={{ margin: '0 0 5px 0' }}>{data.progression.is_qualified ? '🎉 Phase 2 Invitation' : '📊 Evaluation Results'}</h4>
          <p style={{ margin: 0 }}>{data.progression.message}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          <h4 style={{ marginTop: 0 }}>Current Status</h4>
          <p><strong>Stage:</strong> {data.current_stage.label}</p>
          <p><strong>Evaluator:</strong> {data.evaluator || 'Pending Assignment'}</p>
        </div>
        
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          <h4 style={{ marginTop: 0 }}>My Team</h4>
          <p><strong>Team:</strong> {data.team ? `${data.team.name} (${data.team.status})` : 'Unassigned'}</p>
          {data.team && (
            <ul style={{ paddingLeft: '20px', margin: '5px 0', fontSize: '14px' }}>
              {data.team.members.map(m => (
                <li key={m.id}>{m.name} ({m.skill}) {m.id === data.participant.id ? '(You)' : ''}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantPortal;