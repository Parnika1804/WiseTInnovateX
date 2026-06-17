import React from 'react';

const DynamicPipelineBar = ({ stages = [], currentStageIndex = 0 }) => {
  if (!stages || stages.length === 0) {
    return (
      <div className="w-full p-8 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 mb-8 transition-colors duration-300">
        <svg className="w-12 h-12 mb-3 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <p className="font-medium">No event pipeline configured.</p>
        <p className="text-sm">Please set up the event configuration to see the stages here.</p>
      </div>
    );
  }

  return (
    <div className="w-full py-8 mb-6 px-4">
      <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto">

        {/* Background Track Line */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-700 z-0 rounded-full transition-colors duration-300"></div>

        {/* Active Progress Line */}
        <div
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 dark:bg-blue-500 z-0 rounded-full transition-all duration-700 ease-in-out"
          style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
        ></div>

        {/* Stage Nodes */}
        {stages.map((stage, index) => {
          const isActive    = index === currentStageIndex;
          const isCompleted = index < currentStageIndex;

          return (
            <div key={index} className="relative z-10 flex flex-col items-center group cursor-default">

              {/* Circle Node */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-600 dark:bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900/50 scale-110'
                    : isCompleted
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-slate-300 dark:border-slate-600'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Stage Label */}
              <span
                className={`absolute top-12 mt-1 text-xs font-semibold whitespace-nowrap px-2 py-1 rounded transition-colors duration-300 ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                    : isCompleted
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DynamicPipelineBar;