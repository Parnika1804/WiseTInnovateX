import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const EmailDraftToast = () => {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleDraftEvent = (e) => {
      setCount(e.detail.count);
      setVisible(true);
    };

    window.addEventListener('emailDrafted', handleDraftEvent);
    return () => window.removeEventListener('emailDrafted', handleDraftEvent);
  }, []);

  useEffect(() => {
    // Auto-dismiss after 8 seconds, but ONLY if count is 10 or less
    if (visible && count <= 10) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [visible, count]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-white dark:bg-slate-800 border-l-4 border-blue-500 dark:border-indigo-500 shadow-xl rounded-lg p-4 z-50 flex items-start gap-4 max-w-sm transition-all transform duration-300 translate-y-0 opacity-100">
      <div className="flex-1">
        <p className="text-slate-800 dark:text-slate-100 font-semibold text-sm transition-colors duration-300">
          {count} email{count !== 1 ? 's' : ''} {count === 1 ? 'has' : 'have'} been drafted.
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 transition-colors duration-300">
          Go to Comms Page Approvals to review.
        </p>
        <button
          onClick={() => {
            setVisible(false);
            navigate('/comms');
          }}
          className="mt-3 text-xs bg-blue-50 dark:bg-indigo-900/30 hover:bg-blue-100 dark:hover:bg-indigo-900/50 text-blue-700 dark:text-indigo-400 font-bold py-1.5 px-3 rounded transition-colors duration-300"
        >
          Go to Comms
        </button>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold ml-2 text-lg leading-none transition-colors duration-300"
      >
        &times;
      </button>
    </div>
  );
};

export default EmailDraftToast;