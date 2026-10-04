const siteBasePath = import.meta.env.BASE_URL;

export function LegalFooter() {
  return <footer className="nextbook-legal-footer">
    <p>Tus respuestas se usan para encontrar tu próxima lectura.</p>
    <nav aria-label="Información de privacidad">
      <a href={`${siteBasePath}informacion/#privacidad`} target="_blank" rel="noopener noreferrer">Privacidad<span className="sr-only"> (se abre en otra pestaña)</span></a>
      <a href={`${siteBasePath}informacion/#cookies`} target="_blank" rel="noopener noreferrer">Cookies<span className="sr-only"> (se abre en otra pestaña)</span></a>
    </nav>
  </footer>;
}
