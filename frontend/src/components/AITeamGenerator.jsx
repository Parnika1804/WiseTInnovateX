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
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">AI Team Formation</h3>
      <p className="text-gray-600 dark:text-slate-400 mb-4">Type a plain English requirement, and our AI will convert it into a strict formation rubric.</p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
          placeholder="e.g., form teams of 4 with diverse skills, no two people from same college"
          className="flex-1 p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-900/40"
        />
        <button
          onClick={handleAskAI}
          disabled={loadingAI || !prompt}
          className="bg-blue-600 dark:bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 font-semibold disabled:bg-blue-300 dark:disabled:bg-blue-800 transition-colors"
        >
          {loadingAI ? 'Thinking...' : 'Draft Rubric'}
        </button>
      </div>

      {error && (
        <p className="text-red-500 dark:text-red-400 mb-4 font-medium bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {error}
        </p>
      )}

      {rubric && (
        <div className="mt-6 animate-fade-in">
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            AI Generated Rubric (Edit if needed):
          </label>
          <textarea
            value={rubric}
            onChange={handleRubricChange}
            className={`w-full h-48 p-4 font-mono text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              jsonError
                ? 'border-red-400 dark:border-red-500 focus:ring-red-400 dark:focus:ring-red-900/40'
                : 'border-green-400 dark:border-green-600 focus:ring-green-500 dark:focus:ring-green-900/40'
            }`}
          />
          {jsonError && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1 font-mono">{jsonError}</p>
          )}
          {!jsonError && (
            <p className="text-green-600 dark:text-green-400 text-xs mt-1">✓ Valid JSON</p>
          )}
          <button
            onClick={handleGenerateTeams}
            disabled={generating || !isJsonValid}
            className="mt-4 bg-green-600 dark:bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-500 font-bold disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed w-full transition-colors"
          >
            {generating ? 'Generating Teams...' : 'Confirm & Generate Teams'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AITeamGenerator;