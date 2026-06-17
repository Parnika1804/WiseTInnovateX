import React, { useState } from 'react';

export default function ScoreSubmitForm({ teamId, judgeName, maxScore, onScoreSubmitted }) {
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fallback to 100 if maxScore isn't immediately available to prevent NaN errors
  const dynamicMax = maxScore || 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numericScore = parseFloat(score);

    // Dynamic validation against the event config's max score
    if (isNaN(numericScore) || numericScore < 0 || numericScore > dynamicMax) {
      setError(`Please enter a valid score between 0 and ${dynamicMax}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:8000/scores/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: teamId,
          judge_name: judgeName,
          score: numericScore,
          notes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit score. Please try again.');
      }

      const data = await response.json();
      
      // Clear form on success
      setScore('');
      setNotes('');
      
      if (onScoreSubmitted) {
        onScoreSubmitted(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Submit Evaluation</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="score" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Score (Out of {dynamicMax})
          </label>
          <input
            type="number"
            id="score"
            name="score"
            min="0"
            max={dynamicMax}
            step="0.5" // Allows half-points. Adjust to "1" if you only want whole numbers.
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            placeholder={`0 - ${dynamicMax}`}
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Evaluation Notes & Feedback
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            placeholder="Provide context for this score..."
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isSubmitting ? 'bg-blue-400 dark:bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500 transition-colors`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Score'}
        </button>
      </form>
    </div>
  );
}