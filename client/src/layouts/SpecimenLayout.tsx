import { Outlet } from 'react-router';
import { Container } from '../components/Container';

export function SpecimenLayout() {
  return (
    <Container>
      <a href="#main" className="skip-link">Skip to content</a>
      <main id="main" tabIndex={-1}><Outlet /></main>
    </Container>
  );
}
