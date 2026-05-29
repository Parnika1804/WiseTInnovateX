import React, { useState } from 'react';
import PipelineBar from './PipelineBar';
import CSVUpload from './CSVUpload';
import ParticipantTable from './ParticipantTable';
import ActivityLog from './ActivityLog';
import CreateJudge from '../components/CreateJudge';

const CommitteeDashboard = () => {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Command Center</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Pipeline & Participants */}
        <div className="lg:col-span-2 space-y-6">
          <PipelineBar />
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <CSVUpload onUploadSuccess={() => setRefresh(prev => prev + 1)} />
            <div className="mt-6">
              <ParticipantTable refreshTrigger={refresh} />
            </div>
          </div>
        </div>

        {/* Right Column: Activity Log */}
        <div className="space-y-6">
          <ActivityLog />
        </div>
      </div>
      <CreateJudge />
    </div>
  );
};

export default CommitteeDashboard;