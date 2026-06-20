import React, { useState } from 'react';
import axios from 'axios';

const GenerateTeamsButton = ({ onGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await axios.post('https://wisetinnovatex-r4vx.onrender.com/teams/generate', { team_size: 3, skill_balance: true, constraints: null });
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
    <div className="mb-5 p-5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 transition-colors duration-300">
      <h3 className="mt-0 text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 transition-colors duration-300">
        2. Auto-Generate Teams
      </h3>
      <button 
        onClick={handleGenerate} 
        disabled={isGenerating} 
        className={`px-6 py-3 text-white text-base rounded-md transition-colors duration-300 ${
          isGenerating 
            ? 'bg-green-400 dark:bg-emerald-700/50 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 cursor-pointer'
        }`}
      >
        {isGenerating ? ' AI is grouping...' : 'Generate Teams'}
      </button>
    </div>
  );
};

export default GenerateTeamsButton;