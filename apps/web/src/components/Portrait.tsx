import clsx from 'clsx';
import { useState } from 'react';
import { SITE } from '../lib/site.ts';
import { CoverArt } from './art/CoverArt.tsx';

/** Shows /me.jpg when present, otherwise a generated placeholder plate. */
export function Portrait({ name, className }: { name: string; className?: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <figure className={clsx('w-40 shrink-0 sm:w-48', missing && 'max-sm:hidden', className)}>
      <div className="aspect-[4/5] overflow-hidden border border-line bg-panel">
        {missing ? (
          <CoverArt seed={name} className="size-full" />
        ) : (
          <img
            src={SITE.photo}
            alt={`Photo of ${name}`}
            className="size-full object-cover grayscale-[35%] contrast-[1.05]"
            onError={() => setMissing(true)}
          />
        )}
      </div>
      <figcaption className="mt-2 text-[11px] text-faint">
        {missing ? 'me.jpg — pending' : 'me.jpg'}
      </figcaption>
    </figure>
  );
}
