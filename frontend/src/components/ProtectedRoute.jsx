import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0a09]" data-testid="auth-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border border-[#f2ece0]/10 border-t-[#c68b73] rounded-full animate-spin" />
          <span className="overline">Reading your dossier</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?mode=login" state={{ from: location }} replace />;
  }
  return children;
}
