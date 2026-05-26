import React, { useState } from 'react';

const ClarificationDialog = ({ questions, onSubmitAnswers, onCancel }) => {
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAnswerChange = (index, text) => {
    setAnswers((prev) => ({ ...prev, [index]: text }));
    if (error) setError('');
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).filter((key) => answers[key].trim() !== '').length;
    if (answeredCount < questions.length) {
      setError('Please provide an answer for all questions before continuing.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onSubmitAnswers(answers);
    } catch (err) {
      setError('Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!questions || questions.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#fff', padding: '0', borderRadius: '8px', width: '100%', maxWidth: '600px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ backgroundColor: '#fff3cd', borderBottom: '1px solid #ffeeba', padding: '20px' }}>
          <h3 style={{ margin: 0, color: '#856404', display: 'flex', alignItems: 'center' }}>
            {/* HERE IS THE FIXED ICON SIZE */}
            <svg style={{ width: '24px', height: '24px', marginRight: '10px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            Clarification Needed
          </h3>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#666' }}>
            The AI needs a few more details to accurately configure your event pipeline. Please answer the questions below.
          </p>
        </div>

        {/* Questions Body */}
        <div style={{ padding: '20px', maxHeight: '50vh', overflowY: 'auto' }}>
          {questions.map((question, index) => (
            <div key={index} style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                {index + 1}. {question}
              </label>
              <textarea
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', minHeight: '60px', fontFamily: 'inherit' }}
                placeholder="Type your answer here..."
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          ))}
          {error && <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', fontSize: '14px', marginTop: '10px' }}>{error}</div>}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '15px 20px', borderTop: '1px solid #eee', backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onCancel} disabled={isSubmitting} style={{ padding: '8px 16px', border: '1px solid #000', backgroundColor: '#ffc107', borderRadius: '4px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} style={{ padding: '8px 16px', border: '1px solid #000', backgroundColor: '#ffc107', color: '#000', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            {isSubmitting ? 'Updating...' : 'Confirm Answers'}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default ClarificationDialog;