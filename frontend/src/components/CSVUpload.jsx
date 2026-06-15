import React, { useState } from 'react';
import axios from 'axios';

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
      await axios.post('http://localhost:8000/roster/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNotification("Participants uploaded! Welcome emails are pending approval - go to the Comms page to review and approve.");
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
    <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff', border: '1px dashed #ccc', borderRadius: '8px' }}>
      <h3 style={{ marginTop: 0 }}>Upload Participant Roster</h3>
      
      {notification && (
        <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notification}</span>
          <button 
            onClick={() => setNotification("")} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: '#155724' }}
          >
            &times;
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload} disabled={isUploading} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isUploading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </div>
    </div>
  );
};

export default CSVUpload;