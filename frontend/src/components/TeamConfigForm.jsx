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
    <div className="p-5 md:p-6 bg-white border border-slate-200 rounded-xl mb-6 shadow-sm">
      <h3 className="mt-0 text-lg font-bold text-slate-800 mb-4">1. Configure Formation Rules</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <label className="font-bold text-slate-700 text-sm">Team Size:</label>
          <input 
            type="number" 
            value={teamSize} 
            onChange={(e) => setTeamSize(Number(e.target.value))} 
            min="2" 
            max="10" 
            className="p-2 border border-slate-300 rounded-lg w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>
        <div>
          <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700">
            <input 
              type="checkbox" 
              checked={balanceSkills} 
              onChange={(e) => setBalanceSkills(e.target.checked)} 
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            Balance across participant skill tags
          </label>
        </div>
        <button 
          type="submit" 
          className="w-full sm:w-auto self-start px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-sm"
        >
          Save Configuration
        </button>
      </form>
    </div>
  );
};

export default TeamConfigForm;