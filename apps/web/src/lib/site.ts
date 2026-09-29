/**
 * Static facts shown in the home-page manifest that don't (yet) live in the
 * profile API. Keep this list short and true.
 */
export const SITE = {
  employer: 'Lattice',
  education: 'Ithaca College, 2009–2013',
  focus: ['kubernetes-operators', 'aws', 'backend-services'],
  languages: ['go', 'python', 'typescript', 'java'],
  /** Drop a photo at apps/web/public/me.jpg to replace the placeholder. */
  photo: '/me.jpg',
} as const;
