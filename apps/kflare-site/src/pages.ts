import { App } from './App.tsx';
import { NotFound } from './NotFound.tsx';

/** The pre-rendered pages, by the name in their root element's `data-page`. */
export const PAGES = { home: App, 'not-found': NotFound } as const;

export type PageName = keyof typeof PAGES;
