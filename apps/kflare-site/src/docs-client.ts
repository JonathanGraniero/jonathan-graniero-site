import { wireCopyButtons } from './components/copy.ts';
import './index.css';

// Docs pages are pre-rendered and never hydrated: this is all their JavaScript.
wireCopyButtons(document);
