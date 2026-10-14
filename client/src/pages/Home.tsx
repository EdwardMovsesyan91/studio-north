import { HomeHero } from '../components/home/HomeHero';
import { ServicesPreview } from '../components/home/ServicesPreview';
import { TeamPreview } from '../components/home/TeamPreview';
import { GalleryPreview } from '../components/home/GalleryPreview';
import { SampleTestimonials } from '../components/home/SampleTestimonials';
import { BusinessLocation } from '../components/home/BusinessLocation';

export function Home() {
  return <><HomeHero /><ServicesPreview /><TeamPreview /><GalleryPreview /><SampleTestimonials /><BusinessLocation /></>;
}
