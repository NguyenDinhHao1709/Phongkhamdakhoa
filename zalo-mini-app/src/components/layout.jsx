import React, { useEffect } from "react";
import {
  App,
  ZMPRouter,
  AnimationRoutes,
  Route,
  SnackbarProvider,
  BottomNavigation,
  Icon,
  useLocation,
  useNavigate,
} from "zmp-ui";
import { AuthProvider, useAuth } from "../lib/auth";
import { api } from "../lib/api";
import LoginPage from "../pages/login";
import HomePage from "../pages/home";
import BookingPage from "../pages/booking";
import AppointmentsPage from "../pages/appointments";
import RecordsPage from "../pages/records";
import ProfilePage from "../pages/profile";
import NotificationsPage from "../pages/notifications";
import AiChatPage from "../pages/ai-chat";
import HealthPage from "../pages/health";

const TABS = [
  { path: "/", label: "Trang chủ", icon: "zi-home" },
  { path: "/lich-hen", label: "Lịch hẹn", icon: "zi-calendar", activeIcon: "zi-calendar-solid" },
  { path: "/bac-si-ai", label: "Bác sĩ AI", icon: "zi-chat", activeIcon: "zi-chat-solid" },
  { path: "/suc-khoe", label: "Sức khỏe", icon: "zi-heart", activeIcon: "zi-heart-solid" },
  { path: "/ca-nhan", label: "Cá nhân", icon: "zi-user", activeIcon: "zi-user-solid" },
];

function ThanhDieuHuong() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <BottomNavigation fixed activeKey={pathname} onChange={(key) => navigate(key, { animate: false })}>
      {TABS.map((t) => (
        <BottomNavigation.Item
          key={t.path}
          itemKey={t.path}
          label={t.label}
          icon={<Icon icon={t.icon} />}
          activeIcon={<Icon icon={t.activeIcon || t.icon} />}
        />
      ))}
    </BottomNavigation>
  );
}

function NoiDung() {
  const { user } = useAuth();

  // AI service (Render free) ngủ sau 15 phút, thức dậy mất 20s–1 phút: đánh thức sớm ngay khi vào app
  useEffect(() => {
    if (user) api.get("/ai/health").catch(() => {});
  }, [user?.id]);

  if (!user) {
    return (
      <AnimationRoutes>
        <Route path="*" element={<LoginPage />} />
      </AnimationRoutes>
    );
  }

  return (
    <>
      <AnimationRoutes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dat-lich" element={<BookingPage />} />
        <Route path="/lich-hen" element={<AppointmentsPage />} />
        <Route path="/ho-so" element={<RecordsPage />} />
        <Route path="/ca-nhan" element={<ProfilePage />} />
        <Route path="/thong-bao" element={<NotificationsPage />} />
        <Route path="/bac-si-ai" element={<AiChatPage />} />
        <Route path="/suc-khoe" element={<HealthPage />} />
        <Route path="*" element={<HomePage />} />
      </AnimationRoutes>
      <ThanhDieuHuong />
    </>
  );
}

export default function Layout() {
  return (
    <App>
      <SnackbarProvider>
        <AuthProvider>
          <ZMPRouter>
            <NoiDung />
          </ZMPRouter>
        </AuthProvider>
      </SnackbarProvider>
    </App>
  );
}
