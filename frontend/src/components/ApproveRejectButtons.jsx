import React, { useState } from 'react';
import axios from 'axios';

const ApproveRejectButtons = ({
  teamId,
  currentStatus,
  onStatusChange,
}) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);

    try {
      await axios.post(
        'http://localhost:8000/teams/approve',
        {
          team_id: teamId,
          action,
        }
      );

      if (onStatusChange) {
        onStatusChange();
      }
    } catch (err) {
      console.error(
        `Error marking team as ${action}:`,
        err
      );

      alert('Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus !== 'PENDING') return null;

  return (
    <div className="mt-4 flex gap-3">
      <button
        onClick={() =>
          handleAction('APPROVED')
        }
        disabled={loading}
        className="
          px-4
          py-2

          rounded-xl

          bg-green-600
          hover:bg-green-700

          text-white

          text-sm
          font-semibold

          transition-all

          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        {loading ? 'Processing...' : '✓ Approve'}
      </button>

      <button
        onClick={() =>
          handleAction('REJECTED')
        }
        disabled={loading}
        className="
          px-4
          py-2

          rounded-xl

          bg-red-600
          hover:bg-red-700

          text-white

          text-sm
          font-semibold

          transition-all

          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        {loading ? 'Processing...' : '✕ Reject'}
      </button>
    </div>
  );
};

export default ApproveRejectButtons;