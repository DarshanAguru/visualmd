import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import 'katex/dist/katex.min.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary isRoot fallbackTitle="VisualMD Encountered an Initial Render Exception">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

