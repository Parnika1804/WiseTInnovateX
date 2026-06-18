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

    let parsedConfig;
    try {
      parsedConfig = JSON.parse(rubric);
    } catch (e) {
      setError(`Invalid JSON — please fix it before generating. (${e.message})`);
      setGenerating(false);
      return;
    }

    try {
      await axios.post('http://localhost:8000/teams/generate', parsedConfig);
      alert("Teams successfully generated based on your custom rubric!");
      onTeamsGenerated();
    } catch (err) {
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
    <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors duration-300">
      <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100 transition-colors">AI Team Formation</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-5 text-sm sm:text-base transition-colors">Type a plain English requirement, and our AI will convert it into a strict formation rubric.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
          placeholder="e.g., form teams of 4 with diverse skills, no two people from same college"
          className="flex-1 p-3 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
        <button
          onClick={handleAskAI}
          disabled={loadingAI || !prompt}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300 dark:disabled:bg-blue-800/50 transition-colors w-full sm:w-auto shrink-0 shadow-sm"
        >
          {loadingAI ? 'Thinking...' : 'Draft Rubric'}
        </button>
      </div>

      {error && (
        <p className="text-red-600 dark:text-red-400 mb-4 font-medium bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-lg p-3 text-sm transition-colors">
          {error}
        </p>
      )}

      {rubric && (
        <div className="mt-6 animate-fade-in">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 transition-colors">
            AI Generated Rubric (Edit if needed):
          </label>
          <textarea
            value={rubric}
            onChange={handleRubricChange}
            className={`w-full h-48 p-4 font-mono text-sm bg-slate-50 dark:bg-slate-900/50 dark:text-slate-200 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-300 ${
              jsonError
                ? 'border-red-400 dark:border-red-500/50 focus:ring-red-400'
                : 'border-green-400 dark:border-green-500/50 focus:ring-green-500'
            }`}
          />
          {jsonError && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1.5 font-mono transition-colors">{jsonError}</p>
          )}
          {!jsonError && (
            <p className="text-green-600 dark:text-green-400 text-xs mt-1.5 font-semibold transition-colors">✓ Valid JSON</p>
          )}
          <button
            onClick={handleGenerateTeams}
            disabled={generating || !isJsonValid}
            className="mt-5 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold disabled:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed w-full transition-colors shadow-sm"
          >
            {generating ? 'Generating Teams...' : 'Confirm & Generate Teams'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AITeamGenerator;