import React, { useState } from 'react';
import axios from 'axios';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const CSVUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState("");

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file first.");
    setIsUploading(true);
    setNotification("");
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('https://wisetinnovatex-r4vx.onrender.com/roster/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNotification("Participants uploaded! Welcome emails are pending approval - go to the Comms page to review and approve.");

      // Trigger Toast
      const draftedCount = res.data?.welcome_emails_drafted || 1;
      notifyEmailDraft(draftedCount);

      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-8 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white m-0">Upload Participant Roster</h3>
      </div>

      {notification && (
        <div className="p-4 mb-5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 rounded-xl flex justify-between items-center text-sm font-medium">
          <span>{notification}</span>
          <button onClick={() => setNotification("")} className="text-lg leading-none hover:text-green-900 dark:hover:text-green-300 transition-colors">&times;</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <input 
          type="file" 
          accept=".csv" 
          onChange={(e) => setFile(e.target.files[0])} 
          className="block w-full text-sm text-slate-500 dark:text-slate-400
            file:mr-4 file:py-2.5 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-slate-100 file:text-slate-700
            hover:file:bg-slate-200
            dark:file:bg-slate-800 dark:file:text-slate-300
            dark:hover:file:bg-slate-700
            transition-all cursor-pointer"
        />
        <button 
          onClick={handleUpload} 
          disabled={isUploading || !file} 
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  );
};

export default CSVUpload;