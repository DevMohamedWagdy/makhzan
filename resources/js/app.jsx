import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadDictionary } from './i18n';
import { loadLocations } from './lib/locations';

// The dictionary comes first: the app's modules translate some labels as soon as they load. The
// governorates and cities load alongside the router, since forms and order views read them synchronously.
loadDictionary()
    .then(() => Promise.all([import('./Router'), loadLocations()]))
    .then(([{ App }]) => {
        createRoot(document.getElementById('app')).render(
            <StrictMode>
                <App />
            </StrictMode>,
        );
    });
