// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GKI Bungur Bakal Jemaat Alam Sutera',
  description: 'Website resmi GKI Bungur Bakal Jemaat Alam Sutera',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* We use a flex column to push the footer to the bottom */}
        <div className="flex flex-col min-h-screen"> 
          <Navbar />
          {/* Main content area that grows */}
          <main className="flex-grow"> 
            {children} {/* This is your page content */}
          </main>
          <Footer /> {/* <-- The Footer is placed here */}
        </div>
      </body>
    </html>
  );
}