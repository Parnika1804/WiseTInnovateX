import React, { useState } from 'react';
import axios from 'axios';
import AssessmentGuide from './AssessmentGuide'; // Importing our new AI component

const ScoreSubmitForm = ({ onScoreSubmitted }) => {
  const [teamId, setTeamId] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8000/scores/submit', {
        team_id: parseInt(teamId),
        judge_name: judgeName,
        score: parseFloat(score),
        notes: notes
      });
      
      if (res.data.warning) {
        alert(res.data.warning); // Alerts the judge if their score triggers the anomaly threshold
      } else {
        alert("Score submitted successfully!");
      }
      
      setTeamId(''); setScore(''); setNotes('');
      if (onScoreSubmitted) onScoreSubmitted();
    } catch (error) {
      console.error("Error submitting score:", error);
      alert(error.response?.data?.detail || "Failed to submit score.");
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
      
      {/* Left Column: The Submission Form */}
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
        <h3>Submit Judge Evaluation</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="number" placeholder="Team ID (e.g. 1)" value={teamId} onChange={e => setTeamId(e.target.value)} required style={{ padding: '8px' }} />
          <input type="text" placeholder="Judge Name" value={judgeName} onChange={e => setJudgeName(e.target.value)} required style={{ padding: '8px' }} />
          <input type="number" step="0.1" min="0" max="10" placeholder="Score (0-10)" value={score} onChange={e => setScore(e.target.value)} required style={{ padding: '8px' }} />
          <textarea placeholder="Evaluation Notes..." value={notes} onChange={e => setNotes(e.target.value)} style={{ padding: '8px', minHeight: '60px' }} />
          <button type="submit" style={{ backgroundColor: '#28a745', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Submit Score</button>
        </form>
      </div>

      {/* Right Column: The AI Assessment Guide */}
      <div>
        <AssessmentGuide teamId={teamId} />
      </div>

    </div>
  );
};

export default ScoreSubmitForm;