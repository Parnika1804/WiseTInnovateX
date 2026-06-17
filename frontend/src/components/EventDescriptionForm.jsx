import React, { useState } from 'react';
import axios from 'axios';

const EventDescriptionForm = ({ onConfigExtracted }) => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [clarificationData, setClarificationData] = useState(null);
  const [answers, setAnswers] = useState({});

  // Per-round advancement rules state
  const [showAdvancementRules, setShowAdvancementRules] = useState(false);
  const [advancementRules, setAdvancementRules] = useState([]);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesSaved, setRulesSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!description.trim()) {
      setStatus({ type: 'error', message: 'Please describe your event before generating.' });
      return;
    }

    setIsLoading(true);

    try {
      const describeRes = await axios.post('http://localhost:8000/event/describe', { description });

      if (describeRes.data.status === 'incomplete') {
        setStatus({ type: 'info', message: 'Analyzing missing information...' });

        const clarifyRes = await axios.post('http://localhost:8000/event/clarify', {
          description: description,
          missing_fields: describeRes.data.missing_fields
        });

        setClarificationData({
          message: clarifyRes.data.message,
          questions: clarifyRes.data.questions
        });

        const initialAnswers = {};
        clarifyRes.data.questions.forEach(q => { initialAnswers[q.field] = ''; });
        setAnswers(initialAnswers);
        setStatus({ type: '', message: '' });

      } else {
        const configRes = await axios.post('http://localhost:8000/event/configure', { description });
        setStatus({ type: 'success', message: '✅ Event configured successfully!' });
        if (onConfigExtracted) onConfigExtracted(describeRes.data.config);
        setDescription('');
        setupAdvancementRules(configRes.data.config);
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to process event description.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Processing your answers and configuring event...' });

    try {
      const resubmitRes = await axios.post('http://localhost:8000/event/clarify/resubmit', {
        original_description: description,
        answers: answers
      });

      const combinedDescription = resubmitRes.data.combined_description;
      const configRes = await axios.post('http://localhost:8000/event/configure', { description: combinedDescription });

      setStatus({ type: 'success', message: `✅ Event "${configRes.data.config?.event_name || 'configured'}" successfully!` });

      setClarificationData(null);
      setDescription('');
      setAnswers({});
      if (onConfigExtracted) onConfigExtracted(configRes.data.config);
      setupAdvancementRules(configRes.data.config);

    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to configure event with clarification.' });
    } finally {
      setIsLoading(false);
    }
  };

  const setupAdvancementRules = (config) => {
    if (!config || !config.stages) return;
    // Only show for stages that are actual rounds (not registration/team formation)
    const roundStages = config.stages.filter(s => {
      const label = s.label?.toLowerCase() || '';
      const name = s.name?.toLowerCase() || '';
      return label.includes('round') || name.includes('round') || label.includes('eval') || name.includes('eval');
    });

    if (roundStages.length === 0) return;

    setAdvancementRules(roundStages.map((s, idx) => ({
      round: idx + 1,
      stage_name: s.name,
      label: s.label,
      rule: ''
    })));
    setShowAdvancementRules(true);
    setRulesSaved(false);
  };

  const handleRuleChange = (index, value) => {
    setAdvancementRules(prev => prev.map((r, i) => i === index ? { ...r, rule: value } : r));
  };

  const handleSaveRules = async () => {
    const unfilled = advancementRules.filter(r => !r.rule.trim());
    if (unfilled.length > 0) {
      alert('Please fill in advancement rules for all rounds.');
      return;
    }

    setSavingRules(true);
    try {
      await axios.patch('http://localhost:8000/event/config/advancement-rules', {
        rules: advancementRules.map(r => ({
          round: r.round,
          stage_name: r.stage_name,
          rule: r.rule
        }))
      });
      setRulesSaved(true);
    } catch (err) {
      alert('Failed to save advancement rules. Please try again.');
    } finally {
      setSavingRules(false);
    }
  };

  const handleAnswerChange = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const cancelClarification = () => {
    setClarificationData(null);
    setAnswers({});
    setStatus({ type: '', message: '' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Dynamic Event Setup</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
          Describe how you want to run this event. Our AI will map out the pipeline, scoring rules, and team structures automatically.
        </p>
      </div>

      {/* View 1: Initial Description Phase */}
      {!clarificationData ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className={`w-full p-4 h-40 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 border focus:ring-2 focus:outline-none transition-all resize-y ${
              status.type === 'error' ? 'border-red-400 dark:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/40' : 'border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-100 dark:focus:ring-blue-900/40'
            }`}
            placeholder="e.g., We are hosting a hackathon called InnovateX. Teams must have 4 members. The stages are Registration, Ideation, and Final Pitch. Scoring is out of 10 points. Top 10 advance to finals..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />

          {status.message && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              status.type === 'error' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800' :
              status.type === 'success' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800' :
              'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
            }`}>
              {status.message}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
                isLoading ? 'bg-blue-400 dark:bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 shadow-sm'
              }`}
            >
              {isLoading ? ' AI is analyzing...' : 'Generate Pipeline & Rules'}
            </button>
          </div>
        </form>
      ) : (
        /* View 2: Clarification Phase */
        <div className="animate-fade-in">
          <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 dark:border-amber-600 p-4 mb-6 rounded-r-md">
            <div className="flex items-start">
              <span className="text-xl mr-3"></span>
              <div>
                <h3 className="text-amber-800 dark:text-amber-300 font-bold mb-1">More Information Needed</h3>
                <p className="text-amber-700 dark:text-amber-400 text-sm">{clarificationData.message}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleClarificationSubmit} className="space-y-5">
            {clarificationData.questions.map((q, index) => (
              <div key={q.field} className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <label className="block font-semibold text-gray-800 dark:text-slate-200 mb-2">
                  <span className="text-blue-600 dark:text-blue-400 mr-2">Q{index + 1}.</span>
                  {q.question}
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-900/40 focus:outline-none"
                  placeholder="Type your answer here..."
                  value={answers[q.field] || ''}
                  onChange={(e) => handleAnswerChange(q.field, e.target.value)}
                  disabled={isLoading}
                />
              </div>
            ))}

            {status.message && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                status.type === 'error' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
              }`}>
                {status.message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={cancelClarification}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel & Edit Original
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-8 py-2.5 rounded-lg font-semibold text-white transition-colors ${
                  isLoading ? 'bg-blue-400 dark:bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 shadow-sm'
                }`}
              >
                {isLoading ? 'Configuring...' : 'Submit Answers & Finalize'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View 3: Per-round advancement rules — appears after config saved */}
      {showAdvancementRules && (
        <div className="mt-8 border-t border-gray-100 dark:border-slate-700 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📊</span>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">Set Advancement Rules Per Round</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
            Define how many teams advance after each round. You can use percentages like "top 50%" or fixed numbers like "top 3 teams".
          </p>

          <div className="space-y-3">
            {advancementRules.map((r, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="flex-shrink-0 w-32">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{r.label || r.stage_name}</span>
                </div>
                <input
                  type="text"
                  className="flex-1 p-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-900/40 focus:outline-none text-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-800"
                  placeholder='e.g. "top 50%" or "top 3 teams"'
                  value={r.rule}
                  onChange={(e) => handleRuleChange(idx, e.target.value)}
                  disabled={rulesSaved}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            {rulesSaved ? (
              <div className="flex items-center gap-2 px-6 py-2.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg font-semibold text-sm">
                ✅ Advancement rules saved
              </div>
            ) : (
              <button
                onClick={handleSaveRules}
                disabled={savingRules}
                className={`px-8 py-2.5 rounded-lg font-semibold text-white transition-colors ${
                  savingRules ? 'bg-blue-400 dark:bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500'
                }`}
              >
                {savingRules ? 'Saving...' : 'Save Advancement Rules'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDescriptionForm;