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
    <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-5 shadow-sm transition-colors duration-300">
      <h3 className="mt-0 text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors mb-2">
        ✨ AI Assessment Guide
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 transition-colors">
        Enter a Team ID in the score form below, then click here to generate a custom evaluation rubric for their specific skill set.
      </p>
      
      <button 
        onClick={fetchGuide} 
        disabled={loading || !teamId}
        className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${
          (!teamId || loading) 
            ? 'bg-slate-300 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed' 
            : 'bg-cyan-600 hover:bg-cyan-700'
        }`}
      >
        {loading ? 'Generating...' : 'Generate Rubric for this Team'}
      </button>

      {error && (
        <p className="text-red-600 dark:text-red-400 mt-3 text-sm font-medium transition-colors">
          {error}
        </p>
      )}

      {guide && (
        <div className="mt-4 p-4 bg-cyan-50 dark:bg-cyan-900/10 border-l-4 border-cyan-500 text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm rounded-r-lg transition-colors duration-300">
          {guide}
        </div>
      )}
    </div>
  );
};

export default AssessmentGuide;