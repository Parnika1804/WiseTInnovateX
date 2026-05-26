import React from 'react';

const ErrorMessage = ({ title = "Error", message }) => (
  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md my-4">
    <div className="flex items-center mb-1">
      <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <h3 className="text-red-800 font-bold">{title}</h3>
    </div>
    <p className="text-red-700 text-sm ml-7">{message}</p>
  </div>
);

export default ErrorMessage;