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
    <div
className="
bg-white
p-8
rounded-3xl
shadow-sm
border border-slate-200
mb-6
"
>
  <div className="
inline-flex items-center gap-2
px-4 py-2
rounded-full
bg-gradient-to-r
from-violet-50
to-indigo-50
border border-violet-100
text-sm font-semibold
text-violet-700
mb-4
">
✨ AI Powered
</div>
      <h3 className="text-3xl font-bold text-slate-900 mb-2">AI Team Formation</h3>
      <p className="text-slate-500 mb-6">Type a plain English requirement, and our AI will convert it into a strict formation rubric.</p>

      <div className="flex gap-3 mb-6">
        <textarea
  rows={3}
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
  placeholder="Describe how teams should be formed..."
  className="
    flex-1
    p-4
    border border-slate-200
    rounded-2xl
    bg-slate-50
    resize-none
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
  "
/>
        <button
          onClick={handleAskAI}
          disabled={loadingAI || !prompt}
          className="
bg-gradient-to-r
from-indigo-600
to-violet-600
text-white
px-6
py-3
rounded-2xl
font-semibold
disabled:bg-slate-300
disabled:cursor-not-allowed
hover:shadow-lg
hover:-translate-y-0.5
transition-all
"
        >
          {loadingAI ? 'Thinking...' : 'Draft Rubric'}
        </button>
      </div>

      {error && (
        <p className="text-red-500 mb-4 font-medium bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {rubric && (
        <div className="mt-8">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            AI Generated Rubric (Edit if needed):
          </label>
          <textarea
            value={rubric}
            onChange={handleRubricChange}
            className={`w-full h-48 p-4 font-mono text-sm bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 transition-colors ${
              jsonError
                ? 'border-red-400 focus:ring-red-400'
                : 'border-green-400 focus:ring-green-500'
            }`}
          />
          {jsonError && (
            <p className="text-red-500 text-xs mt-1 font-mono">{jsonError}</p>
          )}
          {!jsonError && (
            <p className="text-green-600 text-xs mt-1">✓ Valid JSON</p>
          )}
          <button
            onClick={handleGenerateTeams}
            disabled={generating || !isJsonValid}

            className="
              mt-6
              w-full
              py-4
              rounded-2xl
              font-bold
              text-white
              bg-gradient-to-r
              from-emerald-600
              to-green-600
              hover:shadow-lg
              hover:-translate-y-0.5
              transition-all
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {generating ? 'Generating Teams...' : 'Confirm & Generate Teams'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AITeamGenerator;
