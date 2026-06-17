import React, { useState } from 'react';
import axios from 'axios';

const TeamConfigForm = () => {
  const [teamSize, setTeamSize] = useState(3);
  const [balanceSkills, setBalanceSkills] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/teams/configure', {
        team_size: teamSize,
        skill_balance: balanceSkills,
        constraints: null
      });
      alert("Team configuration saved!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-5 border border-gray-200 dark:border-slate-700 rounded-lg mb-5 bg-white dark:bg-slate-900">
      <h3 className="mt-0 mb-4 text-base font-bold text-slate-900 dark:text-slate-100">1. Configure Formation Rules</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="font-bold mr-2.5 text-slate-700 dark:text-slate-300">Team Size:</label>
          <input
            type="number"
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            min="2"
            max="10"
            className="p-1.5 w-16 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={balanceSkills}
              onChange={(e) => setBalanceSkills(e.target.checked)}
              className="accent-blue-700 dark:accent-blue-500"
            />
            Balance across participant skill tags
          </label>
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-[#0056b3] dark:bg-blue-600 hover:bg-[#00468f] dark:hover:bg-blue-500 text-white border-none rounded font-medium cursor-pointer w-fit transition-colors"
        >
          Save Configuration
        </button>
      </form>
    </div>
  );
};

export default TeamConfigForm;