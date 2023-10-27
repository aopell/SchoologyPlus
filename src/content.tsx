import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const root = document.createElement('div');
root.id = 'crx-root';
document.body.append(root);

createRoot(root).render(<App />);
