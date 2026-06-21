import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ParticipantLink = () => {
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    axios.get('https://wisetinnovatex-r4vx.onrender.com/participants/portal').then(res => setParticipants(res.data));
    axios.get('https://wisetinnovatex-r4vx.onrender.com/teams').then(res => setTeams(res.data));
  }, []);

  const generateParticipantToken = (id) => btoa(JSON.stringify({ id }));
  const generateJudgeToken = (teamId, judgeName) => btoa(JSON.stringify({ teamId, judgeName }));

  return (
    <div>
      <h2>Secure Portal Link Generator</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Participant Links */}
        <div style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Participant Links</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {participants.map(p => {
              const link = `https://wise-t-innovate-x-nu.vercel.app/portal?token=${generateParticipantToken(p.id)}`;
              return (
                <li key={p.id} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                  <strong>{p.name}</strong> (ID: {p.id})<br/>
                  <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#0056b3', wordBreak: 'break-all' }}>{link}</a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Judge Links */}
        <div style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Judge Links</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>Generate evaluation links for active teams.</p>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {teams.filter(t => t.status === 'APPROVED').map(t => {
              const link = `https://wise-t-innovate-x-nu.vercel.app/judge?token=${generateJudgeToken(t.id, 'Main Judge')}`;
              return (
                <li key={t.id} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                  <strong>{t.name}</strong><br/>
                  <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#28a745', wordBreak: 'break-all' }}>{link}</a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ParticipantLink;