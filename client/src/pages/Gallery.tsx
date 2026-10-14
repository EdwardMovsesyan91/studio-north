import { GalleryImage } from '../components/gallery/GalleryImage';
import { galleryPhotos, galleryDisclosure } from '../data/gallery';

export function Gallery() {
  return (
    <div className="pb-section">
      <section aria-labelledby="gallery-title" className="py-section">
        <p className="type-label mb-6 text-accent">Studio North / Atmosphere</p>
        <h1 id="gallery-title" className="type-display max-w-3xl">A closer look at the details.</h1>
        <p className="mt-6 max-w-xl text-lead text-secondary">Tools with purpose. Spaces with character. A photographic study of the craft and the time spent in the chair.</p>
        <p className="type-caption mt-6 max-w-2xl text-secondary">{galleryDisclosure}</p>
      </section>
      <div className="gallery-grid">
        {galleryPhotos.map((photo) => <GalleryImage key={photo.id} photo={photo} />)}
      </div>
    </div>
  );
}
