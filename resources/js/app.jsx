import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadDictionary } from './i18n';

// The dictionary comes first: the app's modules translate some labels as soon as they load.
loadDictionary()
    .then(() => import('./Router'))
    .then(({ App }) => {
        createRoot(document.getElementById('app')).render(
            <StrictMode>
                <App />
            </StrictMode>,
        );
    });
