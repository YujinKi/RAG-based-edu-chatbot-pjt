import React from 'react';
import './Button.css';

function Button({ children, variant = 'primary', onClick, type = 'button', disabled = false }) {
  return (
    <button
      className={`button button-${variant}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
