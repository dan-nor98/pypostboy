import React, {forwardRef} from 'react';
export const IconButton = forwardRef(function IconButton({label, children, ...props}, ref) {
  return (
    <button ref={ref} className="icon-button" title={label} aria-label={label} {...props}>
      {children}
    </button>
  );
});
