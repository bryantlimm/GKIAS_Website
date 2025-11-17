// components/ProtectedRoute.tsx
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext'; // Assuming path is correct

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is done and there is NO user, redirect to login
    if (!loading && !user) {
      // You'll create this page next
      router.push('/admin/login'); 
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Show a loading state or nothing while redirecting/checking
    return (
        <div className="flex items-center justify-center min-h-screen pt-20">
            <p className="text-xl text-blue-600">Mengecek status admin...</p>
        </div>
    );
  }

  // If user is logged in, show the child components
  return <>{children}</>;
};

export default ProtectedRoute;