import React, { useState } from 'react';
import PipelineBar from './PipelineBar';
import CSVUpload from './CSVUpload';
import ParticipantTable from './ParticipantTable';
import ActivityLog from './ActivityLog';
import CreateJudge from '../components/CreateJudge';
import PendingApprovals from './PendingApprovals';

const CommitteeDashboard = () => {
  const [refresh, setRefresh] = useState(0);

  const handleAction = () => setRefresh(prev => prev + 1);

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Command Center</h2>

      {/* Pipeline always spans full width */}
      <PipelineBar key={refresh} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">

        {/* Left (2/3): Participant intake + judge creation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <CSVUpload onUploadSuccess={handleAction} />
            <div className="mt-6">
              <ParticipantTable refreshTrigger={refresh} />
            </div>
          </div>

          <CreateJudge />
        </div>

        {/* Right (1/3): Pending approvals + activity log */}
        <div className="space-y-6">
          <PendingApprovals onAction={handleAction} />
          <ActivityLog refreshTrigger={refresh} />
        </div>

      </div>
    </div>
  );
};

export default CommitteeDashboard;
