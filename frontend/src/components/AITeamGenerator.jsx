import React, { useState } from 'react';
import axios from 'axios';

const AITeamGenerator = ({ onTeamsGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [rubric, setRubric] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleAskAI = async () => {
    if (!prompt) return;
    setLoadingAI(true);
    setError('');
    setJsonError('');

    try {
      const res = await axios.post('http://localhost:8000/teams/translate-rubric', { prompt });
      setRubric(JSON.stringify(res.data, null, 2));
    } catch (err) {
      setError("Failed to generate rubric. Check backend connection.");
    } finally {
      setLoadingAI(false);
    }
  };

  // Validate JSON live as user edits
  const handleRubricChange = (e) => {
    const val = e.target.value;
    setRubric(val);
    try {
      JSON.parse(val);
      setJsonError('');
    } catch (e) {
      setJsonError(`Invalid JSON: ${e.message}`);
    }
  };

  const handleGenerateTeams = async () => {
    if (!rubric) return;
    setGenerating(true);
    setError('');

    // Step 1: Validate JSON before even hitting the backend
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(rubric);
    } catch (e) {
      setError(`Invalid JSON — please fix it before generating. (${e.message})`);
      setGenerating(false);
      return;
    }

    // Step 2: Send to backend
    try {
      await axios.post('http://localhost:8000/teams/generate', parsedConfig);
      alert("Teams successfully generated based on your custom rubric!");
      onTeamsGenerated();
    } catch (err) {
      // Show the actual backend error message if available
      const detail = err?.response?.data?.detail;
      setError(detail
        ? `Generation failed: ${detail}`
        : "Generation failed. Check that the backend is running and an event is configured."
      );
    } finally {
      setGenerating(false);
    }
  };

  const isJsonValid = !jsonError;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
      <h3 className="text-xl font-bold mb-2 text-slate-800">AI Team Formation</h3>
      <p className="text-slate-500 mb-5 text-sm sm:text-base">Type a plain English requirement, and our AI will convert it into a strict formation rubric.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
          placeholder="e.g., form teams of 4 with diverse skills, no two people from same college"
          className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAskAI}
          disabled={loadingAI || !prompt}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300 transition-colors w-full sm:w-auto shrink-0 shadow-sm"
        >
          {loadingAI ? 'Thinking...' : 'Draft Rubric'}
        </button>
      </div>

      {error && (
        <p className="text-red-600 mb-4 font-medium bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          {error}
        </p>
      )}

      {rubric && (
        <div className="mt-6 animate-fade-in">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            AI Generated Rubric (Edit if needed):
          </label>
          <textarea
            value={rubric}
            onChange={handleRubricChange}
            className={`w-full h-48 p-4 font-mono text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              jsonError
                ? 'border-red-400 focus:ring-red-400'
                : 'border-green-400 focus:ring-green-500'
            }`}
          />
          {jsonError && (
            <p className="text-red-500 text-xs mt-1.5 font-mono">{jsonError}</p>
          )}
          {!jsonError && (
            <p className="text-green-600 text-xs mt-1.5 font-semibold">✓ Valid JSON</p>
          )}
          <button
            onClick={handleGenerateTeams}
            disabled={generating || !isJsonValid}
            className="mt-5 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold disabled:bg-slate-300 disabled:cursor-not-allowed w-full transition-colors shadow-sm"
          >
            {generating ? 'Generating Teams...' : 'Confirm & Generate Teams'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AITeamGenerator;