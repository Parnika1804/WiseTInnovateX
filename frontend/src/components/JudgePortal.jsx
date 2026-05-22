import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AssessmentGuide from './AssessmentGuide';

const JudgePortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [authData, setAuthData] = useState(null);
  
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (token) {
      try {
        setAuthData(JSON.parse(atob(token))); // Simulate JWT decode
      } catch (err) {
        console.error("Invalid token");
      }
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8000/scores/submit', {
        team_id: authData.teamId,
        judge_name: authData.judgeName,
        score: parseFloat(score),
        notes: notes
      });
      alert(res.data.warning ? res.data.warning : "Evaluation submitted successfully!");
      setScore(''); setNotes('');
    } catch (error) {
      alert("Failed to submit evaluation.");
    }
  };

  if (!authData) return <div style={{ padding: '20px' }}>Secure judge token required.</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ backgroundColor: '#343a40', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Judge Portal</h2>
        <p style={{ margin: '5px 0 0 0' }}>Welcome, <strong>{authData.judgeName}</strong> | Evaluating: <strong>Team #{authData.teamId}</strong></p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <AssessmentGuide teamId={authData.teamId} />
        </div>
        
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0 }}>Submit Official Score</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label><strong>Final Score (0-10):</strong></label>
              <input type="number" step="0.1" min="0" max="10" value={score} onChange={e => setScore(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
            </div>
            <div>
              <label><strong>Evaluation Notes:</strong></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '100px' }} />
            </div>
            <button type="submit" style={{ backgroundColor: '#28a745', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>Submit Evaluation</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JudgePortal;