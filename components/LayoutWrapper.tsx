'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const isPrivacyPolicy = pathname === '/privacypolicy';

  return (
    <>
      {!isAdminPage && !isPrivacyPolicy && <Navbar />}
      
      <main className="flex-grow">
        {children}
      </main>
      
      {!isAdminPage && !isPrivacyPolicy && <Footer />}
    </>
  );
}
