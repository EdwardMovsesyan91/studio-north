export interface GalleryPhoto {
  id: string;
  src: string;
  smallSrc: string;
  width: number;
  height: number;
  smallWidth: number;
  alt: string;
  composition: 'wide' | 'portrait' | 'square';
}

// Licensed atmosphere references, not Studio North premises, staff or results.
// Source URLs, creators and licenses are recorded in docs/assets.md.
export const galleryPhotos: readonly GalleryPhoto[] = [
  { id: 'interior', src: '/images/gallery-interior-1200.webp', smallSrc: '/images/gallery-interior-600.webp', width: 1200, height: 900, smallWidth: 600, composition: 'wide', alt: 'Barber chairs facing tall rounded mirrors and warm wooden shelving in a dark green interior.' },
  { id: 'tools', src: '/images/gallery-tools-800.webp', smallSrc: '/images/gallery-tools-400.webp', width: 800, height: 1200, smallWidth: 400, composition: 'portrait', alt: 'Scissors, combs and electric clippers arranged in a wooden grooming-tool organizer.' },
  { id: 'scissor-work', src: '/images/gallery-scissor-work-800.webp', smallSrc: '/images/gallery-scissor-work-400.webp', width: 800, height: 800, smallWidth: 400, composition: 'square', alt: 'Close-up of scissors and a comb blending short hair at the back of a head.' },
  { id: 'detail', src: '/images/gallery-detail-800.webp', smallSrc: '/images/gallery-detail-400.webp', width: 800, height: 800, smallWidth: 400, composition: 'square', alt: 'A barber working with a comb and cutting tool along the side of a client’s hair.' },
  { id: 'chair', src: '/images/gallery-chair-800.webp', smallSrc: '/images/gallery-chair-400.webp', width: 800, height: 800, smallWidth: 400, composition: 'square', alt: 'An empty black barber chair beside a tool cabinet and mirror in a bright vintage interior.' },
  { id: 'process', src: '/images/gallery-beard-work-800.webp', smallSrc: '/images/gallery-beard-work-400.webp', width: 800, height: 1200, smallWidth: 400, composition: 'portrait', alt: 'A barber in a white shirt and dark apron using clippers beside a seated client.' },
  { id: 'atmosphere', src: '/images/barber-chair-1200.webp', smallSrc: '/images/barber-chair-640.webp', width: 1200, height: 800, smallWidth: 640, composition: 'wide', alt: 'A brown leather barber chair beneath tall mirrors in a warmly lit barbershop.' },
];

export const galleryPreviewPhotos = galleryPhotos.slice(0, 3);
export const galleryDisclosure = 'Licensed stock photography for this fictional concept. These images do not show Studio North premises, employees or customer results.';
