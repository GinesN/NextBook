import type { Metadata } from 'next';
import './globals.css';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  metadataBase: new URL('https://ginesn.github.io/NextBook/'),
  title: 'NextBook — Encuentra tu próxima gran lectura',
  description: 'Responde unas preguntas y descubre tres libros elegidos para ti.',
  openGraph: {
    title: 'NextBook — Tu próxima gran lectura',
    description: 'Responde unas preguntas y descubre tres libros elegidos para ti.',
    type: 'website',
    url: 'https://ginesn.github.io/NextBook/',
    images: [{
      url: 'https://ginesn.github.io/NextBook/og.png',
      width: 1200,
      height: 630,
      alt: 'NextBook, tu próxima gran lectura',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NextBook — Tu próxima gran lectura',
    description: 'Responde unas preguntas y descubre tres libros elegidos para ti.',
    images: ['https://ginesn.github.io/NextBook/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
