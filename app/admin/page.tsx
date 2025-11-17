// app/admin/page.tsx
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboardContent from '@/components/admin/AdminDashboardContent';

export default function AdminDashboardPage() {
  return (
    // The ProtectedRoute component handles the redirect if the user is not logged in
    <ProtectedRoute>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}