import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import useAuthStore from "./store/authStore";

/* ================================================================
   Lazy-loaded pages — code splitting for performance
   ================================================================ */
const HomePage        = lazy(() => import("./pages/Public/HomePage.jsx"));
const LoginPage       = lazy(() => import("./pages/Login/LoginPage.jsx"));
const RegisterPage    = lazy(() => import("./pages/Login/RegisterPage.jsx"));
const UnauthorizedPage = lazy(() => import("./pages/Unauthorized/UnauthorizedPage.jsx"));

// Portals
import ReceptionistPortal from "./pages/Receptionist/ReceptionistPortal.jsx";
import DoctorPortal from "./pages/Doctor/DoctorPortal.jsx";
import LabPortal from "./pages/Lab/LabPortal.jsx";
import PharmacyPortal from "./pages/Pharmacy/PharmacyPortal.jsx";
import CashierPortal from "./pages/Cashier/CashierPortal.jsx";
import ManagementPortal from "./pages/Management/ManagementPortal.jsx";
import PatientPortal from "./pages/Patient/PatientPortal.jsx";

/* ================================================================
   Role-based home redirect
   ================================================================ */
const ROLE_HOME = {
  tiep_tan:      "/tiep-tan",
  bac_si:        "/bac-si",
  ky_thuat_vien: "/ky-thuat-vien",
  nhan_vien_nha_thuoc: "/nha-thuoc",
  nha_thuoc:     "/nha-thuoc",
  thu_ngan:      "/thu-ngan",
  quan_tri_vien: "/quan-ly",
  quan_tri_vien_cap_cao: "/quan-ly",
  ban_giam_doc:  "/quan-ly",
  benh_nhan:     "/benh-nhan",
};

function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  const home = ROLE_HOME[user.vaiTro] || "/unauthorized";
  return <Navigate to={home} replace />;
}

/* ================================================================
   Route Guards
   ================================================================ */
function PrivateRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  console.log('PrivateRoute User:', user);
  console.log('PrivateRoute allowedRoles:', allowedRoles);

  if (allowedRoles && user && !allowedRoles.includes(user.vaiTro)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

/* ================================================================
   Loading Fallback
   ================================================================ */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Đang tải...</p>
      </div>
    </div>
  );
}

/* ================================================================
   App Router
   ================================================================ */
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Public Homepage cho Khách vãng lai */}
        <Route path="/" element={<HomePage />} />

        {/* Receptionist Portal */}
        <Route
          path="/tiep-tan/*"
          element={
            <PrivateRoute allowedRoles={["tiep_tan", "quan_tri_vien", "quan_tri_vien_cap_cao"]}>
              <ReceptionistPortal />
            </PrivateRoute>
          }
        />

        {/* Doctor Portal */}
        <Route
          path="/bac-si/*"
          element={
            <PrivateRoute allowedRoles={["bac_si", "quan_tri_vien", "quan_tri_vien_cap_cao"]}>
              <DoctorPortal />
            </PrivateRoute>
          }
        />

        {/* Lab Technician Portal */}
        <Route
          path="/ky-thuat-vien/*"
          element={
            <PrivateRoute allowedRoles={["ky_thuat_vien", "quan_tri_vien", "quan_tri_vien_cap_cao"]}>
              <LabPortal />
            </PrivateRoute>
          }
        />

        {/* Pharmacy Portal */}
        <Route
          path="/nha-thuoc/*"
          element={
            <PrivateRoute allowedRoles={["nhan_vien_nha_thuoc", "nha_thuoc", "quan_tri_vien", "quan_tri_vien_cap_cao"]}>
              <PharmacyPortal />
            </PrivateRoute>
          }
        />

        {/* Cashier Portal */}
        <Route
          path="/thu-ngan/*"
          element={
            <PrivateRoute allowedRoles={["thu_ngan"]}>
              <CashierPortal />
            </PrivateRoute>
          }
        />

        {/* Management Portal */}
        <Route
          path="/quan-ly/*"
          element={
            <PrivateRoute allowedRoles={["quan_tri_vien", "quan_tri_vien_cap_cao", "ban_giam_doc"]}>
              <ManagementPortal />
            </PrivateRoute>
          }
        />

        {/* Patient Portal */}
        <Route
          path="/benh-nhan/*"
          element={
            <PrivateRoute allowedRoles={["benh_nhan"]}>
              <PatientPortal />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
