import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PipelineBar = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8000/pipeline/dynamic/status')
      .then(res => {
        if (res.data.status === 'not_configured') {
          setError(res.data.message);
        } else {
          setData(res.data);
        }
      })
      .catch(err => console.error("Error fetching pipeline status:", err));
  }, []);

  if (error) {
    return (
      <div className="w-full p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 mb-6">
        <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        <p className="font-medium text-gray-600">{error}</p>
        <p className="text-sm">Please go to the "Setup Event" tab to configure your pipeline.</p>
      </div>
    );
  }

  if (!data) return <div className="p-4 text-gray-500">Loading pipeline...</div>;

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Event Pipeline: <span className="text-blue-600">{data.event_name}</span></h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {data.stages?.map((stage) => (
          <div key={stage.order} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
            stage.status === 'ACTIVE' ? 'bg-blue-600 text-white shadow-md' :
            stage.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border border-green-200' :
            'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
            {stage.order}. {stage.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineBar;