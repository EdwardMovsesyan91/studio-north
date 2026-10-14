import { Link } from 'react-router';
import { SectionHeading } from '../SectionHeading';
import { GalleryImage } from '../gallery/GalleryImage';
import { galleryPreviewPhotos, galleryDisclosure } from '../../data/gallery';

export function GalleryPreview() {
  return (
    <section id="home-gallery" tabIndex={-1} aria-labelledby="gallery-preview-title" className="marketing-section pb-section">
      <SectionHeading id="gallery-preview-title" eyebrow="Atmosphere / In the details"
        title="Room for the craft." description="A few glimpses of the spaces, tools and gestures that inspire the Studio North concept." />
      <div className="gallery-preview-grid">
        {galleryPreviewPhotos.map((photo) => <GalleryImage key={photo.id} photo={photo} preview />)}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-6">
        <p className="type-caption max-w-xl text-secondary">{galleryDisclosure}</p>
        <Link to="/gallery" className="button" data-variant="secondary">Explore the gallery</Link>
      </div>
    </section>
  );
}
