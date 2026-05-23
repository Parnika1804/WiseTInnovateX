import React from 'react';

const DynamicPipelineBar = ({ stages = [], currentStageIndex = 0 }) => {
  // Enterprise-ready UX: Handle the case where no stages are configured yet
  if (!stages || stages.length === 0) {
    return (
      <div className="w-full p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 mb-8">
        <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 z-0 rounded-full"></div>
        
        {/* Active Progress Line */}
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 z-0 rounded-full transition-all duration-700 ease-in-out" 
          style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
        ></div>

        {/* Stage Nodes */}
        {stages.map((stage, index) => {
          const isActive = index === currentStageIndex;
          const isCompleted = index < currentStageIndex;

          return (
            <div key={index} className="relative z-10 flex flex-col items-center group cursor-default">
              
              {/* Circle Node */}
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' 
                    : isCompleted 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-400 border-2 border-gray-300'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                  index + 1
                )}
              </div>
              
              {/* Stage Label */}
              <span 
                className={`absolute top-12 mt-1 text-xs font-semibold whitespace-nowrap px-2 py-1 rounded transition-colors ${
                  isActive 
                    ? 'text-blue-700 bg-blue-50' 
                    : isCompleted 
                    ? 'text-gray-700' 
                    : 'text-gray-400'
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