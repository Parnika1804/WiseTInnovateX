import React, { useState } from 'react';
import axios from 'axios';

const ApproveRejectButtons = ({ teamId, currentStatus, onStatusChange }) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await axios.post('http://localhost:8000/teams/approve', {
        team_id: teamId,
        action: action
      });
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
    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
      <button 
        onClick={() => handleAction('APPROVED')} 
        disabled={loading}
        style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
        Approve
      </button>
      <button 
        onClick={() => handleAction('REJECTED')} 
        disabled={loading}
        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
        Reject
      </button>
    </div>
  );
};

export default ApproveRejectButtons;