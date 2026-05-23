import React, { useState } from 'react';
import ClarificationDialog from './ClarificationDialog';
const EventDescriptionForm = ({ onConfigExtracted }) => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
    const [showClarification, setShowClarification] = useState(false);
    const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // Enterprise-ready validation: Prevent empty submissions
    if (!description.trim()) {
      setError('Please provide a description of your event before submitting.');
      return;
    }

    // Enterprise-ready UX: Show loading state to prevent double-clicks
    setIsLoading(true);

try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // NEW MOCK DATA: Simulating an incomplete description!
      const mockParsedConfig = {
        isComplete: false, 
        clarificationQuestions: [
          "What is the maximum team size allowed for this hackathon?",
          "Will the 'Final Pitch' stage require video submissions or live presentations?"
        ] 
      };

      if (!mockParsedConfig.isComplete) {
        // If incomplete, show the modal with the questions
        setClarificationQuestions(mockParsedConfig.clarificationQuestions);
        setShowClarification(true);
      } else if (onConfigExtracted) {
        onConfigExtracted(mockParsedConfig);
      }

    
    } catch (err) {
      setError('Failed to process the event configuration. Please try again later.');
      console.error("API Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Configure New Event</h2>
        <p className="text-sm text-gray-500">
          Describe your event format in plain English. Include details about stages, team sizes, and scoring. 
          Our AI will automatically configure the pipeline for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="event-description" className="sr-only">Event Description</label>
          <textarea
            id="event-description"
            rows={6}
            className={`w-full p-4 border rounded-lg focus:ring-2 focus:outline-none transition-all resize-y ${
              error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
            }`}
            placeholder="e.g., We are hosting a 48-hour hackathon. Teams must have 2-4 members. The stages are Registration, Ideation, and Final Pitch. Scoring is based on 50% technical and 50% design..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
          {/* Error Message Display */}
          {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all flex items-center justify-center min-w-[140px] ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Generate Pipeline'
            )}
          </button>
        </div>
      </form>
      {showClarification && (
        <ClarificationDialog 
          questions={clarificationQuestions}
          onSubmitAnswers={(answers) => {
            console.log("Answers submitted:", answers);
            setShowClarification(false);
            // Here is where you would trigger the final save to the DB later
            alert("Configuration updated successfully!"); 
          }}
          onCancel={() => setShowClarification(false)}
        />
      )}
    </div>
  );
};

export default EventDescriptionForm;