import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PipelineBar = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:8000/pipeline/status')
      .then(res => setData(res.data))
      .catch(err => console.error("Error fetching pipeline status:", err));
  }, []);

  if (!data) return <div>Loading pipeline...</div>;

  return (
    <div style={{ display: 'flex', gap: '10px', padding: '20px', backgroundColor: '#f4f4f9', borderRadius: '8px', marginBottom: '20px', overflowX: 'auto' }}>
      {data.stages?.map((stage) => (
        <div key={stage.order} style={{
          padding: '10px 20px',
          borderRadius: '20px',
          backgroundColor: stage.status === 'ACTIVE' ? '#0056b3' : (stage.status === 'COMPLETED' ? '#28a745' : '#e0e0e0'),
          color: stage.status === 'UPCOMING' ? '#333' : 'white',
          fontWeight: stage.status === 'ACTIVE' ? 'bold' : 'normal',
          whiteSpace: 'nowrap'
        }}>
          {stage.order}. {stage.label}
        </div>
      ))}
    </div>
  );
};

export default PipelineBar;