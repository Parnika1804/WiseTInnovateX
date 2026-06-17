import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ParticipantLink = () => {
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/participants/portal').then(res => setParticipants(res.data));
    axios.get('http://localhost:8000/teams').then(res => setTeams(res.data));
  }, []);

  const generateParticipantToken = (id) => btoa(JSON.stringify({ id }));
  const generateJudgeToken = (teamId, judgeName) => btoa(JSON.stringify({ teamId, judgeName }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-5 text-slate-900 dark:text-slate-100">
        Secure Portal Link Generator
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Participant Links */}
        <div className="
          p-5 rounded-xl border shadow-sm
          bg-white dark:bg-slate-900
          border-slate-200 dark:border-slate-800
        ">
          <h3 className="mt-0 mb-4 text-base font-bold text-slate-900 dark:text-slate-100">
            Participant Links
          </h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {participants.map(p => {
              const link = `http://localhost:5173/portal?token=${generateParticipantToken(p.id)}`;
              return (
                <li
                  key={p.id}
                  className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:mb-0 last:pb-0"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {p.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    {' '}(ID: {p.id})
                  </span>
                  <br />
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="
                      text-xs break-all
                      text-blue-600 dark:text-blue-400
                      hover:underline
                    "
                  >
                    {link}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Judge Links */}
        <div className="
          p-5 rounded-xl border shadow-sm
          bg-white dark:bg-slate-900
          border-slate-200 dark:border-slate-800
        ">
          <h3 className="mt-0 mb-2 text-base font-bold text-slate-900 dark:text-slate-100">
            Judge Links
          </h3>
          <p className="text-sm mb-4 text-slate-500 dark:text-slate-400">
            Generate evaluation links for active teams.
          </p>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {teams.filter(t => t.status === 'APPROVED').map(t => {
              const link = `http://localhost:5173/judge?token=${generateJudgeToken(t.id, 'Main Judge')}`;
              return (
                <li
                  key={t.id}
                  className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:mb-0 last:pb-0"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {t.name}
                  </span>
                  <br />
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="
                      text-xs break-all
                      text-green-600 dark:text-green-400
                      hover:underline
                    "
                  >
                    {link}
                  </a>
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