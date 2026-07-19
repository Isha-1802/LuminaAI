import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import "@/App.css";

import Landing from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import NewInterview from "@/pages/NewInterview";
import Interview from "@/pages/Interview";
import InterviewReport from "@/pages/InterviewReport";
import InterviewerConsole from "@/pages/InterviewerConsole";
import Profile from "@/pages/Profile";
import InterviewerBrowse from "@/pages/InterviewerBrowse";
import InterviewerProfile from "@/pages/InterviewerProfile";
import BookingDetails from "@/pages/BookingDetails";
import SharedReport from "@/pages/SharedReport";
import RoomDetail from "@/pages/RoomDetail";
import PracticeHub from "@/pages/PracticeHub";
import ProtectedRoute from "@/components/ProtectedRoute";
import CoachChat from "@/components/CoachChat";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function AppRouter() {
  const location = useLocation();
  // Handle OAuth session_id synchronously before ProtectedRoute runs
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/share/:token" element={<SharedReport />} />
      <Route path="/rooms/:roomId" element={<RoomDetail />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice"
        element={
          <ProtectedRoute>
            <PracticeHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts"
        element={
          <ProtectedRoute>
            <InterviewerBrowse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interviewer/:id"
        element={
          <ProtectedRoute>
            <InterviewerProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/:id"
        element={
          <ProtectedRoute>
            <BookingDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/console"
        element={
          <ProtectedRoute>
            <InterviewerConsole />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/new"
        element={
          <ProtectedRoute>
            <NewInterview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id"
        element={
          <ProtectedRoute>
            <Interview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id/report"
        element={
          <ProtectedRoute>
            <InterviewReport />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <AppRouter />
          <CoachChat />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "rgba(18,20,24,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                backdropFilter: "blur(20px)",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
