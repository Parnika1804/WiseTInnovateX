import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // If no one is logged in, send them to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If they are logged in but don't have the right role, block them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center mt-10">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  // If they pass the checks, render the page!
  return children;
};

export default ProtectedRoute;