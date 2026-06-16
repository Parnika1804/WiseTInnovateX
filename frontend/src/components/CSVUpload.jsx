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
      const res = await axios.post('http://localhost:8000/roster/upload', formData, {
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
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8 hover:shadow-lg transition-all duration-300">
    <div className="flex items-start gap-4 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">
        📄
      </div>

      <div>
        <h3 className="text-2xl font-bold text-slate-900">
          Upload Participant Roster
        </h3>

        <p className="text-slate-500 mt-1">
          Import your participant CSV to initialize the event roster and
          draft welcome communications.
        </p>
      </div>
    </div>

    {notification && (
      <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700">
        <span>{notification}</span>

        <button
          onClick={() => setNotification("")}
          className="text-xl font-bold hover:opacity-70"
        >
          ×
        </button>
      </div>
    )}

    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8">
      <div className="flex flex-col items-center text-center">

        <div className="mb-4 text-4xl">
          📤
        </div>

        <h4 className="text-lg font-semibold text-slate-900">
          Choose your participant CSV
        </h4>

        <p className="mt-2 text-sm text-slate-500">
          Supported format: .CSV
        </p>

        <label className="mt-6 cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600">
          Browse Files

          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        {file && (
          <div className="mt-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Selected file:
            <span className="ml-2 font-semibold">
              {file.name}
            </span>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`mt-8 rounded-2xl px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 ${
            !file || isUploading
              ? "cursor-not-allowed bg-slate-300 shadow-none"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-1 hover:shadow-blue-500/25"
          }`}
        >
          {isUploading
            ? "Uploading..."
            : "Upload Participant Roster"}
        </button>
      </div>
    </div>

    <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-500">
      <strong className="text-slate-700">
        CSV should include:
      </strong>

      <div className="mt-2">
        Name, Email, Skills, Year
      </div>
    </div>
  </div>
);
};

export default CSVUpload;