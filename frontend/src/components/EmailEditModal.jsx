import React, { useState } from 'react';
import axios from 'axios';

const EmailEditModal = ({ log, onClose, onSave }) => {
  const [subject, setSubject] = useState(log.subject || '');
  const [message, setMessage] = useState(log.message || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`http://localhost:8000/comms/log/${log.id}`, { subject, message });
      onSave(); 
      onClose(); 
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl flex flex-col transition-colors duration-300">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700/50 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg transition-colors duration-300">Edit Email Draft</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl font-bold transition-colors duration-300">&times;</button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="bg-blue-50 dark:bg-indigo-900/10 border border-blue-100 dark:border-indigo-800/30 rounded-lg p-3 transition-colors duration-300">
            <span className="text-xs font-bold text-blue-800 dark:text-indigo-400 uppercase tracking-wider block mb-1 transition-colors duration-300">Recipient</span>
            <span className="text-sm text-blue-900 dark:text-indigo-300 font-medium transition-colors duration-300">{log.recipient_email}</span>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors duration-300">Subject</label>
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors duration-300" 
            />
          </div>
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase transition-colors duration-300">Message Body</label>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors duration-300">{message.length} characters</span>
            </div>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              rows={10}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y transition-colors duration-300" 
            />
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl transition-colors duration-300">
          <button 
            onClick={onClose} 
            className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailEditModal;