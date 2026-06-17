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
      const res = await axios.get(
        `http://localhost:8000/scores/assessment-guide/${teamId}`
      );

      setGuide(res.data.assessment_guide);
    } catch (err) {
      console.error(err);

      setError(
        'Failed to fetch assessment guide. Make sure the Team ID is correct.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        bg-white/80
        dark:bg-slate-900/80

        backdrop-blur-md

        border
        border-slate-200
        dark:border-slate-800

        rounded-2xl

        shadow-sm

        p-6

        mb-6
      "
    >
      {/* Header */}
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        ✨ AI Assessment Guide
      </h3>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Enter a Team ID in the score form below, then generate a
        custom evaluation rubric tailored to that team's
        specific skill composition.
      </p>

      {/* Button */}
      <button
        onClick={fetchGuide}
        disabled={loading || !teamId}
        className="
          px-5
          py-3

          bg-cyan-600
          hover:bg-cyan-700

          disabled:bg-slate-400
          disabled:cursor-not-allowed

          text-white

          rounded-xl

          font-semibold

          transition-all
        "
      >
        {loading
          ? 'Generating...'
          : 'Generate Rubric for this Team'}
      </button>

      {/* Error */}
      {error && (
        <div
          className="
            mt-4

            p-4

            rounded-xl

            bg-red-50
            dark:bg-red-950/30

            border
            border-red-200
            dark:border-red-900

            text-red-700
            dark:text-red-300

            text-sm
          "
        >
          ❌ {error}
        </div>
      )}

      {/* Guide Output */}
      {guide && (
        <div
          className="
            mt-5

            p-5

            rounded-xl

            bg-cyan-50
            dark:bg-cyan-950/20

            border-l-4
            border-cyan-500

            text-slate-700
            dark:text-slate-300

            whitespace-pre-wrap

            text-sm

            leading-relaxed
          "
        >
          {guide}
        </div>
      )}
    </div>
  );
};

export default AssessmentGuide;