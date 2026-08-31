import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://bookmatch-finder.ginesnavarro2006.chatgpt.site'),
  title: 'BookMatch — Encuentra tu próxima gran lectura',
  description: 'Responde unas preguntas y descubre tres libros elegidos para ti.',
  openGraph: {
    title: 'BookMatch — Tu próxima gran lectura',
    description: 'Responde unas preguntas y descubre tres libros elegidos para ti.',
    type: 'website',
    url: 'https://bookmatch-finder.ginesnavarro2006.chatgpt.site',
    images: [{
      url: 'https://bookmatch-finder.ginesnavarro2006.chatgpt.site/og.png',
      width: 1200,
      height: 630,
      alt: 'BookMatch, tu próxima gran lectura',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BookMatch — Tu próxima gran lectura',
    description: 'Responde unas preguntas y descubre tres libros elegidos para ti.',
    images: ['https://bookmatch-finder.ginesnavarro2006.chatgpt.site/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
