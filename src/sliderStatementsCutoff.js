import React, { useState } from 'react';

const SliderStatementsCutoff = ({ onStatementsCutoffChange }) => {
  const [statementsCutoff, setStatementsCutoff] = useState(0);

  const handleStatementsCutoffChange = (event) => {
    const newValue = event.target.value;
    setStatementsCutoff(newValue);
    onStatementsCutoffChange(newValue);
  };

  return (
    <div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        step="1" 
        value={statementsCutoff} 
        onChange={handleStatementsCutoffChange} 
      />
      <p>Minimální počet výroků: {statementsCutoff}</p>
    </div>
  );
};

export default SliderStatementsCutoff;
