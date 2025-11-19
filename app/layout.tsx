// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/components/AuthContext'

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GKI Alam Sutera',
  description: 'Gereja Kristen Indonesia Alam Sutera Websitea',
};

// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          {/* 1. Flex container that takes up at least 100% of screen height */}
          <div className="flex flex-col min-h-screen bg-white"> 
            
            <Navbar />
            
            {/* 2. Main content grows to fill available space, pushing footer down */}
            <main className="flex-grow"> 
              {children}
            </main>
            
            {/* 3. Footer sits at the bottom */}
            <Footer />
            
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}