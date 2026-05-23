import React, { useState, useEffect } from 'react';

const DynamicTeamConfig = ({ suggestedRules, onRulesConfirmed }) => {
  // Initialize state with the AI's suggestions, or default fallbacks
  const [minSize, setMinSize] = useState(suggestedRules?.minSize || 1);
  const [maxSize, setMaxSize] = useState(suggestedRules?.maxSize || 4);
  const [allowCrossCollege, setAllowCrossCollege] = useState(suggestedRules?.allowCrossCollege || false);
  
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Update state if the AI sends new suggestions
  useEffect(() => {
    if (suggestedRules) {
      setMinSize(suggestedRules.minSize || 1);
      setMaxSize(suggestedRules.maxSize || 4);
      setAllowCrossCollege(suggestedRules.allowCrossCollege || false);
      setIsConfirmed(false); // Reset confirmation if new rules come in
    }
  }, [suggestedRules]);

  const handleConfirm = (e) => {
    e.preventDefault();
    setIsConfirmed(true);
    
    if (onRulesConfirmed) {
      onRulesConfirmed({ minSize, maxSize, allowCrossCollege });
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* Header Section */}
      <div className="bg-blue-50 border-b border-blue-100 p-5 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-blue-900 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Team Formation Rules
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Based on your event description, the AI extracted these rules. Review and modify them if necessary.
          </p>
        </div>
        {isConfirmed && (
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
            Confirmed
          </span>
        )}
      </div>

      {/* Form Section */}
      <form onSubmit={handleConfirm} className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Min Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Team Size</label>
            <input
              type="number"
              min="1"
              value={minSize}
              onChange={(e) => {
                setMinSize(parseInt(e.target.value));
                setIsConfirmed(false);
              }}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Max Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Team Size</label>
            <input
              type="number"
              min={minSize}
              value={maxSize}
              onChange={(e) => {
                setMaxSize(parseInt(e.target.value));
                setIsConfirmed(false);
              }}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Toggle Option */}
        <div className="flex items-center">
          <input
            id="cross-college"
            type="checkbox"
            checked={allowCrossCollege}
            onChange={(e) => {
              setAllowCrossCollege(e.target.checked);
              setIsConfirmed(false);
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="cross-college" className="ml-2 text-sm font-medium text-gray-700">
            Allow Cross-College / Cross-Organization Teams
          </label>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            className={`px-5 py-2 rounded-lg font-medium text-white transition-colors ${
              isConfirmed ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isConfirmed ? 'Update Rules' : 'Confirm Rules'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DynamicTeamConfig;