import React from 'react';

const EmailViewModal = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-colors duration-300">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700/50 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg transition-colors duration-300">View Email</h3>
            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-indigo-900/30 text-blue-700 dark:text-indigo-400 border border-blue-200 dark:border-indigo-800/50 rounded-full text-xs font-bold transition-colors duration-300">
              {log.comm_type}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl font-bold transition-colors duration-300">&times;</button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors duration-300">To</label>
            <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors duration-300">
              {log.recipient_email}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors duration-300">Subject</label>
            <p className="text-sm text-slate-800 dark:text-slate-100 font-bold bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors duration-300">
              {log.subject}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors duration-300">Message Body</label>
            <pre className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700/50 whitespace-pre-wrap font-sans transition-colors duration-300">
              {log.message}
            </pre>
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-200 dark:border-slate-700/50 flex justify-end bg-slate-50 dark:bg-slate-900/50 rounded-b-xl transition-colors duration-300">
          <button 
            onClick={onClose} 
            className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailViewModal;