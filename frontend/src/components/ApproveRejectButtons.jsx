import React, { useState } from 'react';
import axios from 'axios';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const ApproveRejectButtons = ({ teamId, currentStatus, onStatusChange }) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      const res = await axios.post('https://wisetinnovatex-r4vx.onrender.com/teams/approve', {
        team_id: teamId,
        action: action
      });
      
      // Trigger Toast for drafted emails
      if (res.data?.emails_drafted) {
        notifyEmailDraft(res.data.emails_drafted);
      }

      if (onStatusChange) onStatusChange();
    } catch (err) {
      console.error(`Error marking team as ${action}:`, err);
      alert("Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus !== 'PENDING') return null;

  return (
    <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
      <button 
        onClick={() => handleAction('APPROVED')} 
        disabled={loading}
        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        Approve
      </button>
      <button 
        onClick={() => handleAction('REJECTED')} 
        disabled={loading}
        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
};

export default ApproveRejectButtons;