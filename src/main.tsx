import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import {LearningProvider} from './learning/LearningContext';
import {AccountShell} from './sync/AccountShell';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AccountShell><LearningProvider><App/></LearningProvider></AccountShell></React.StrictMode>);
