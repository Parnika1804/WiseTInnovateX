import React, { useState } from 'react';
import axios from 'axios';

const AITeamGenerator = ({ onTeamsGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [rubric, setRubric] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAskAI = async () => {
    if (!prompt) return;
    setLoadingAI(true);
    setError('');
    
    try {
      const res = await axios.post('http://localhost:8000/teams/translate-rubric', { prompt });
      // Format the JSON beautifully so the committee can read/edit it easily
      setRubric(JSON.stringify(res.data, null, 2));
    } catch (err) {
      setError("Failed to generate rubric. Check backend connection.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleGenerateTeams = async () => {
    if (!rubric) return;
    setGenerating(true);
    setError('');
    
    try {
      // Parse the edited text back into a real JSON object
      const parsedConfig = JSON.parse(rubric);
      
      // Send it to the backend generator
      await axios.post('http://localhost:8000/teams/generate', parsedConfig);
      
      alert("Teams successfully generated based on your custom rubric!");
      onTeamsGenerated(); // Refreshes the team list below
    } catch (err) {
      setError("Generation failed. Make sure your JSON format is valid (watch out for missing commas!)");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <h3 className="text-xl font-bold mb-2">AI Team Formation</h3>
      <p className="text-gray-600 mb-4">Type a plain English requirement, and our AI will convert it into a strict formation rubric.</p>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., form teams of 4 with diverse skills, no two people from same college"
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          onClick={handleAskAI}
          disabled={loadingAI}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300 transition-colors"
        >
          {loadingAI ? 'Thinking...' : 'Draft Rubric'}
        </button>
      </div>

      {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}

      {rubric && (
        <div className="mt-6 animate-fade-in">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            AI Generated Rubric (Edit if needed):
          </label>
          <textarea 
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            className="w-full h-48 p-4 font-mono text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button 
            onClick={handleGenerateTeams}
            disabled={generating}
            className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold disabled:bg-green-300 w-full transition-colors"
          >
            {generating ? 'Generating Teams...' : 'Confirm & Generate Teams'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AITeamGenerator;