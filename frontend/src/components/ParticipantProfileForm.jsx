import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ParticipantProfileForm = ({ participant, onProfileUpdate }) => {
  // Pre-fill the form with existing data if the user already submitted it!
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
      if (onProfileUpdate) onProfileUpdate(); // Refresh the portal data instantly
    } catch (error) {
      alert("Failed to update profile. Check backend connection.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-6">
      <h3 className="text-xl font-bold mb-2">Project Submission & Hacker Profile</h3>
      <p className="text-slate-600 mb-6 text-sm">
        Submit your final project link here. All team members can submit the same shared repository link.
      </p>

      {/* NEW: Show currently submitted links visually so hackers know it worked */}
      {(participant?.project_link || participant?.resume_link) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Your Current Submissions:</h4>
          <div className="flex gap-4 text-sm">
            {participant.project_link && (
              <a href={participant.project_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">📦 View Submitted Project</a>
            )}
            {participant.resume_link && (
              <a href={participant.resume_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">📄 View Submitted Resume</a>
            )}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700">Primary Tech Stack (e.g., React, Python, ML)</label>
          <input 
            type="text" 
            value={techStack} 
            onChange={(e) => setTechStack(e.target.value)} 
            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="React, Node.js, Tailwind..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700">Final Project / GitHub Link</label>
          <input 
            type="url" 
            value={projectLink} 
            onChange={(e) => setProjectLink(e.target.value)} 
            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://github.com/yourusername/project"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700">Resume Link (Google Drive / PDF)</label>
          <input 
            type="url" 
            value={resumeLink} 
            onChange={(e) => setResumeLink(e.target.value)} 
            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://drive.google.com/..."
          />
        </div>

        <button type="submit" className="mt-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-700 transition-colors">
          Save & Submit Project
        </button>
      </form>
    </div>
  );
};

export default ParticipantProfileForm;