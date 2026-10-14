import { useState } from 'react';
import type { Barber } from '../../api';

export function BarberPortrait({ barber }: { barber: Barber }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div className="barber-portrait">
      {barber.portrait && failedSource !== barber.portrait ? (
        <img src={barber.portrait} alt={"Licensed stock portrait illustrating a fictional barber profile, not a Studio North employee."} width={800} height={1000}
          loading="lazy" decoding="async" onError={() => setFailedSource(barber.portrait)} />
      ) : (
        <div className="barber-portrait-placeholder" role="img" aria-label="Sample portrait unavailable">
          <span className="type-label text-accent">Studio North / Sample profile</span>
          <p className="type-subtitle mt-4">Portrait unavailable.</p>
        </div>
      )}
    </div>
  );
}
