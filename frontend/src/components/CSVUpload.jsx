import React, { useState } from 'react';
import axios from 'axios';

const CSVUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file first.");
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:8000/roster/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("CSV Uploaded successfully!");
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