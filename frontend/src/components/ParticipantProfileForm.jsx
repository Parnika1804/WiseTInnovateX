import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ParticipantProfileForm = ({ participant, onProfileUpdate }) => {
  const [techStack, setTechStack] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [resumeLink, setResumeLink] = useState('');

  useEffect(() => {
    if (participant) {
      setTechStack(participant.tech_stack || '');
      setProjectLink(participant.project_link || '');
      setResumeLink(participant.resume_link || '');
    }
  }, [participant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:8000/participant/${participant.id}/profile`, {
        tech_stack: techStack,
        project_link: projectLink,
        resume_link: resumeLink
      });
      alert("Project and Profile updated successfully! Judges can now view your portfolio.");
      if (onProfileUpdate) onProfileUpdate();
    } catch (error) {
      alert("Failed to update profile. Check backend connection.");
    }
  };

  return (
    <div className="
      p-6 rounded-xl shadow-sm border mt-6
      bg-white dark:bg-slate-900
      border-slate-200 dark:border-slate-800
    ">
      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">
        Project Submission &amp; Hacker Profile
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
        Submit your final project link here. All team members can submit the same shared repository link.
      </p>

      {(participant?.project_link || participant?.resume_link) && (
        <div className="
          mb-6 p-4 rounded-lg border
          bg-blue-50 dark:bg-blue-950/30
          border-blue-100 dark:border-blue-800
        ">
          <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-300">Your Current Submissions:</h4>
          <div className="flex gap-4 text-sm">
            {participant.project_link && (
              <a
                href={participant.project_link}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                 View Submitted Project
              </a>
            )}
            {participant.resume_link && (
              <a
                href={participant.resume_link}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                 View Submitted Resume
              </a>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Primary Tech Stack (e.g., React, Python, ML)
          </label>
          <input
            type="text"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            className="
              w-full p-2.5 rounded-lg outline-none border
              bg-white dark:bg-slate-800
              border-slate-200 dark:border-slate-700
              text-slate-900 dark:text-slate-100
              placeholder-slate-400 dark:placeholder-slate-500
              focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
            "
            placeholder="React, Node.js, Tailwind..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Final Project / GitHub Link
          </label>
          <input
            type="url"
            value={projectLink}
            onChange={(e) => setProjectLink(e.target.value)}
            className="
              w-full p-2.5 rounded-lg outline-none border
              bg-white dark:bg-slate-800
              border-slate-200 dark:border-slate-700
              text-slate-900 dark:text-slate-100
              placeholder-slate-400 dark:placeholder-slate-500
              focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
            "
            placeholder="https://github.com/yourusername/project"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Resume Link (Google Drive / PDF)
          </label>
          <input
            type="url"
            value={resumeLink}
            onChange={(e) => setResumeLink(e.target.value)}
            className="
              w-full p-2.5 rounded-lg outline-none border
              bg-white dark:bg-slate-800
              border-slate-200 dark:border-slate-700
              text-slate-900 dark:text-slate-100
              placeholder-slate-400 dark:placeholder-slate-500
              focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
            "
            placeholder="https://drive.google.com/..."
          />
        </div>

        <button
          type="submit"
          className="
            mt-2 py-3 px-4 rounded-lg font-bold transition-colors
            bg-blue-600 hover:bg-blue-700
            dark:bg-blue-500 dark:hover:bg-blue-600
            text-white
          "
        >
          Save &amp; Submit Project
        </button>
      </form>
    </div>
  );
};

export default ParticipantProfileForm;