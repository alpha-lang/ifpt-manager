import './globals.css';
import { Inter } from 'next/font/google';

// Utilisation d'une police système/inter très lisible pour les données denses
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = {
  title: 'IFPT Finance Manager | ERP Pro',
  description: 'Logiciel de gestion financière et comptable - IFPT v2.0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning={true}>
      {/* bg-[#f0f2f5] : Gris neutre type logiciel ERP 
          antialiased : Meilleure lisibilité des petites polices techniques
      */}
      <body className={`${inter.className} bg-[#f0f2f5] text-[#1e293b] antialiased min-h-screen`} suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}