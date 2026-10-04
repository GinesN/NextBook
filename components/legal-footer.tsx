import { ArrowUpRight, BookOpen } from 'lucide-react';

const siteBasePath = import.meta.env.BASE_URL;

export function LegalFooter({ showNextBookLink = false }: { showNextBookLink?: boolean }) {
  return <footer className="nextbook-legal-footer">
    <div className="nextbook-legal-copy">
      {showNextBookLink && <a className="nextbook-about-link" href={`${siteBasePath}presentacion/`}>
        <BookOpen size={16} strokeWidth={1.7} aria-hidden="true" />
        <span>Descubre NextBook</span>
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>}
      <p>Tus respuestas se usan para encontrar tu próxima lectura.</p>
    </div>
    <nav aria-label="Información de privacidad">
      <a href={`${siteBasePath}informacion/#privacidad`} target="_blank" rel="noopener noreferrer">Privacidad<span className="sr-only"> (se abre en otra pestaña)</span></a>
      <a href={`${siteBasePath}informacion/#cookies`} target="_blank" rel="noopener noreferrer">Cookies<span className="sr-only"> (se abre en otra pestaña)</span></a>
    </nav>
  </footer>;
}
