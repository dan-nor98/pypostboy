import React from 'react';
export function Button({children, kind = 'secondary', className = '', ...props}) {
  return (
    <button className={`button button-${kind} ${className}`} {...props}>
      {children}
    </button>
  );
}
