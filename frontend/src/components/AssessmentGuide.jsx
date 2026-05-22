import React, { useState } from 'react';
import axios from 'axios';

const AssessmentGuide = ({ teamId }) => {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchGuide = async () => {
    if (!teamId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`http://localhost:8000/scores/assessment-guide/${teamId}`);
      setGuide(res.data.assessment_guide);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch assessment guide. Make sure the Team ID is correct.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
      <h3 style={{ marginTop: 0 }}>✨ AI Assessment Guide</h3>
      <p style={{ fontSize: '14px', color: '#555' }}>
        Enter a Team ID in the score form below, then click here to generate a custom evaluation rubric for their specific skill set.
      </p>
      <button 
        onClick={fetchGuide} 
        disabled={loading || !teamId}
        style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: (!teamId || loading) ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Generating...' : 'Generate Rubric for this Team'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

      {guide && (
        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f0f7ff', borderLeft: '4px solid #17a2b8', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
          {guide}
        </div>
      )}
    </div>
  );
};

export default AssessmentGuide;