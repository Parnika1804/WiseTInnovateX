import React, { useState } from 'react';
import axios from 'axios';

const ParticipantProfileForm = ({ participantId }) => {
  const [techStack, setTechStack] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [resumeLink, setResumeLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // This route will need to be built in your FastAPI backend!
      await axios.put(`http://localhost:8000/participant/${participantId}/profile`, {
        tech_stack: techStack,
        project_link: projectLink,
        resume_link: resumeLink
      });
      alert("Profile updated successfully! Judges and the Committee can now view your portfolio.");
    } catch (error) {
      alert("Failed to update profile. Check backend connection.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <h3 className="text-xl font-bold mb-4">Complete Your Hacker Profile</h3>
      <p className="text-gray-600 mb-6">Update your details so organizers can match you with the perfect team.</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block font-semibold mb-1">Primary Tech Stack (e.g., React, Python, ML)</label>
          <input 
            type="text" 
            value={techStack} 
            onChange={(e) => setTechStack(e.target.value)} 
            className="w-full p-2 border rounded"
            placeholder="React, Node.js, Tailwind..."
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Recent Project / GitHub Link</label>
          <input 
            type="url" 
            value={projectLink} 
            onChange={(e) => setProjectLink(e.target.value)} 
            className="w-full p-2 border rounded"
            placeholder="https://github.com/yourusername/project"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Resume Link (Google Drive / PDF)</label>
          <input 
            type="url" 
            value={resumeLink} 
            onChange={(e) => setResumeLink(e.target.value)} 
            className="w-full p-2 border rounded"
            placeholder="https://drive.google.com/..."
          />
        </div>

        <button type="submit" className="mt-4 bg-teal-600 text-white py-2 px-4 rounded hover:bg-teal-700">
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default ParticipantProfileForm;