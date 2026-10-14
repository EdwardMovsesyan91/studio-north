import { useState } from 'react';
import type { GalleryPhoto } from '../../data/gallery';

export function GalleryImage({ photo, preview = false }: { photo: GalleryPhoto; preview?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sizes = preview
    ? '(min-width: 40rem) 45rem, calc(100vw - 2.5rem)'
    : photo.composition === 'wide'
      ? '(min-width: 40rem) 45rem, calc(100vw - 2.5rem)'
      : '(min-width: 40rem) 23rem, calc(100vw - 2.5rem)';
  return (
    <div className="gallery-image" data-composition={photo.composition} data-photo-id={photo.id}>
      {failedSource === photo.src ? (
        <div className="gallery-image-placeholder" role="img" aria-label={`${photo.alt} Photograph unavailable.`}>
          <span className="type-label text-accent">Atmosphere reference</span>
          <p className="type-caption mt-4 text-secondary">Photograph unavailable.</p>
        </div>
      ) : (
        <img src={photo.src} srcSet={`${photo.smallSrc} ${photo.smallWidth}w, ${photo.src} ${photo.width}w`}
          sizes={sizes} width={photo.width} height={photo.height} alt={photo.alt}
          loading="lazy" decoding="async" onError={() => setFailedSource(photo.src)} />
      )}
    </div>
  );
}
