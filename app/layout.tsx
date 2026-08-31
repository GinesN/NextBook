import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BookMatch — Encuentra tu próxima gran lectura',
  description: 'Responde unas preguntas y descubre tres libros elegidos para ti.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
