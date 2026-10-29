import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import {LocaleProvider} from './i18n/Locale';
import {LearningProvider} from './learning/LearningContext';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><LocaleProvider><LearningProvider><App/></LearningProvider></LocaleProvider></React.StrictMode>);
