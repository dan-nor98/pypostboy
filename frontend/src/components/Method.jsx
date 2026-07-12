import React from 'react';
import {methods} from '../data/demoWorkspace';

export function Method({m}) {
  return <span className={`method method-${methods[m]}`}>{m}</span>;
}
