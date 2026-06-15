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
      onSave(); // Refresh list
      onClose(); // Close modal
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 text-lg">✏️ Edit Email Draft</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        </div>
        
        <div className="p-5 flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
            <div className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              {log.recipient_email}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            />
          </div>
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Message Body</label>
              <span className="text-xs text-slate-400 font-medium">{message.length} characters</span>
            </div>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              rows={10}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y" 
            />
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button 
            onClick={onClose} 
            className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailEditModal;