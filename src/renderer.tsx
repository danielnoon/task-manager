import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import QuickEntryApp from './components/QuickEntryApp';
import './index.css';

const root = document.getElementById('root');

if (root) {
    const isQuickEntry = window.location.hash === '#quick-entry';
    if (isQuickEntry) {
        document.body.classList.add('quick-entry-mode');
        document.documentElement.classList.add('quick-entry-mode');
    }

    createRoot(root).render(
        <StrictMode>
            {isQuickEntry ? <QuickEntryApp /> : <App />}
        </StrictMode>
    );
}
