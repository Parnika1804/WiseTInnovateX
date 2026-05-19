import React, { useState } from 'react';
import axios from 'axios';

const GenerateTeamsButton = ({ onGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await axios.post('http://localhost:8000/teams/generate', { team_size: 3, skill_balance: true, constraints: null });
      alert("Teams successfully generated!");
      if (onGenerated) onGenerated();
    } catch (error) {
      console.error("Error generating teams:", error);
      alert("Failed to generate teams.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc' }}>
      <h3 style={{ marginTop: 0 }}>2. Auto-Generate Teams</h3>
      <button onClick={handleGenerate} disabled={isGenerating} style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', fontSize: '16px', border: 'none', borderRadius: '5px', cursor: isGenerating ? 'not-allowed' : 'pointer' }}>
        {isGenerating ? '🤖 AI is grouping...' : 'Generate Teams'}
      </button>
    </div>
  );
};

export default GenerateTeamsButton;