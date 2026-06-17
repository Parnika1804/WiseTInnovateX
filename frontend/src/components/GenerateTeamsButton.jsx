import React, { useState } from 'react';
import axios from 'axios';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const GenerateTeamsButton = ({ onGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.post('http://localhost:8000/teams/generate', {
        team_size: 3,
        skill_balance: true,
        constraints: null,
      });
      alert("Teams successfully generated!");

      if (res.data?.team_assignment_emails_drafted) {
        notifyEmailDraft(res.data.team_assignment_emails_drafted);
      }

      if (onGenerated) onGenerated();
    } catch (error) {
      console.error("Error generating teams:", error);
      alert("Failed to generate teams.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="
      mb-5 p-5 rounded-xl border border-dashed
      bg-slate-50 dark:bg-slate-900
      border-slate-300 dark:border-slate-700
    ">
      <h3 className="mt-0 mb-3 text-base font-bold text-slate-800 dark:text-slate-100">
        2. Auto-Generate Teams
      </h3>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="
          px-6 py-3 rounded-lg font-semibold text-sm transition-colors
          bg-green-600 hover:bg-green-700
          dark:bg-green-500 dark:hover:bg-green-600
          disabled:opacity-50 disabled:cursor-not-allowed
          text-white
        "
      >
        {isGenerating ? ' AI is grouping...' : 'Generate Teams'}
      </button>
    </div>
  );
};

export default GenerateTeamsButton;