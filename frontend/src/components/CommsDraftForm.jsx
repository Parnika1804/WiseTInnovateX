import React, { useState } from 'react';
import axios from 'axios';

const CommsDraftForm = ({ onDraftSaved }) => {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleDraft = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/comms/draft', {
        recipient_email: email,
        subject: subject,
        message: message
      });
      alert("Draft saved successfully!");
      setEmail(''); setSubject(''); setMessage('');
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      console.error("Draft error:", err);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>Draft New Communication</h3>
      <form onSubmit={handleDraft} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input type="email" placeholder="Recipient Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '8px' }} />
        <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} required style={{ padding: '8px' }} />
        <textarea placeholder="Message body..." value={message} onChange={e => setMessage(e.target.value)} required style={{ padding: '8px', minHeight: '80px' }} />
        <button type="submit" style={{ backgroundColor: '#007bff', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Save Draft</button>
      </form>
    </div>
  );
};

export default CommsDraftForm;