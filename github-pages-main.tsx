import { createRoot } from 'react-dom/client';

import NextBookApp from '@/components/nextbook-app';
import './app/globals.css';

createRoot(document.getElementById('root')!).render(<NextBookApp />);
