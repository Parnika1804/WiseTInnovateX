import React, { useState } from 'react';
import axios from 'axios';

const TeamConfigForm = () => {
  const [teamSize, setTeamSize] = useState(3);
  const [balanceSkills, setBalanceSkills] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/teams/configure', {
        team_size: teamSize,
        skill_balance: balanceSkills,
        constraints: null
      });
      alert("Team configuration saved!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fff' }}>
      <h3 style={{ marginTop: 0 }}>1. Configure Formation Rules</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Team Size:</label>
          <input type="number" value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} min="2" max="10" style={{ padding: '5px', width: '60px' }} />
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={balanceSkills} onChange={(e) => setBalanceSkills(e.target.checked)} />
            Balance across participant skill tags
          </label>
        </div>
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: 'fit-content' }}>
          Save Configuration
        </button>
      </form>
    </div>
  );
};

export default TeamConfigForm;