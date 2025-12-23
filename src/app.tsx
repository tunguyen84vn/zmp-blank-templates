// ZaUI stylesheet
import "zmp-ui/zaui.css";
// Tailwind stylesheet
import "@/css/tailwind.scss";
// Your stylesheet
import "@/css/app.scss";

// React core
import React from "react";
import { createRoot } from "react-dom/client";

// Add dayjs
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
dayjs.locale('vi');  // Tiếng Việt for date

// ZMP Router for navigation
import { ZMPRouter } from 'zmp-ui';

// Pages
import Home from './pages/index';  // Home page (lịch sân)

// Mount the app
// Expose app configuration
import appConfig from "../app-config.json";

if (!window.APP_CONFIG) {
  window.APP_CONFIG = appConfig as any;
}

const Layout = () => (
  <ZMPRouter>
    <Home />  // Single view - use navigateTo for admin
  </ZMPRouter>
);

const root = createRoot(document.getElementById("app")!);
root.render(<Layout />);