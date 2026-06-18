import React from 'react';

const EmailViewModal = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-800 text-lg">View Email</h3>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
              {log.comm_type}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
            <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              {log.recipient_email}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
            <p className="text-sm text-slate-800 font-bold bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              {log.subject}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message Body</label>
            <pre className="text-sm text-slate-700 bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 whitespace-pre-wrap font-sans">
              {log.message}
            </pre>
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-xl">
          <button 
            onClick={onClose} 
            className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailViewModal;