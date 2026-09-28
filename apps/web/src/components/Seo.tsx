const SITE_NAME = 'Jonathan Graniero';

interface SeoProps {
  title?: string;
  description?: string;
  type?: 'website' | 'article';
}

/** Uses React 19's native hoisting of <title>/<meta> into <head>. */
export function Seo({ title, description, type = 'website' }: SeoProps) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      {description && <meta property="og:description" content={description} />}
    </>
  );
}
