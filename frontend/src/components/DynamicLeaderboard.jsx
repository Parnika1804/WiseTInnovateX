import React, { useMemo } from 'react';

const DynamicLeaderboard = ({ scoringCategories = [], teamData = [] }) => {
  // Enterprise-ready UX: Handle state before event has started or scored
  if (!scoringCategories || scoringCategories.length === 0) {
    return (
      <div className="w-full p-10 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-500 shadow-sm mt-6">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        <p className="font-semibold text-gray-700">Waiting for Scoring Configuration</p>
        <p className="text-sm mt-1">The leaderboard will appear once the event description is parsed and scores are submitted.</p>
      </div>
    );
  }

  // Calculate totals and sort teams by highest score
  const rankedTeams = useMemo(() => {
    return [...teamData]
      .map(team => {
        // Calculate total score based on dynamic categories
        const totalScore = scoringCategories.reduce((sum, category) => {
          return sum + (team.scores[category] || 0);
        }, 0);
        return { ...team, totalScore };
      })
      .sort((a, b) => b.totalScore - a.totalScore); // Sort descending
  }, [teamData, scoringCategories]);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="bg-gray-50 border-b border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-800">Live Leaderboard</h3>
        <p className="text-sm text-gray-500 mt-1">Rankings based on dynamically configured evaluation criteria.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-xs border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 w-16 text-center">Rank</th>
              <th className="px-6 py-4">Team Name</th>
              
              {/* DYNAMIC COLUMNS: Render a column for each category the AI found */}
              {scoringCategories.map((category, index) => (
                <th key={index} className="px-6 py-4 text-center">{category}</th>
              ))}
              
              <th className="px-6 py-4 text-center bg-gray-200">Total Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rankedTeams.length === 0 ? (
              <tr>
                <td colSpan={scoringCategories.length + 3} className="px-6 py-8 text-center text-gray-500">
                  No teams have been scored yet.
                </td>
              </tr>
            ) : (
              rankedTeams.map((team, index) => (
                <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-center font-bold text-gray-900">
                    {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : index + 1}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{team.name}</td>
                  
                  {/* DYNAMIC SCORES: Match the scores to the dynamic columns */}
                  {scoringCategories.map((category, i) => (
                    <td key={i} className="px-6 py-4 text-center">
                      {team.scores[category] !== undefined ? team.scores[category] : '-'}
                    </td>
                  ))}
                  
                  <td className="px-6 py-4 text-center font-bold text-blue-600 bg-blue-50/30">
                    {team.totalScore}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DynamicLeaderboard;