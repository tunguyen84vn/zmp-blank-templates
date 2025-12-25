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
import { ZMPRouter, Route } from 'zmp-ui';
import { Routes } from 'react-router-dom';

// Jotai Provider for state
import { Provider } from 'jotai';

// Pages
import Home from './pages/index';           // Home page
import Summary from './pages/SummaryPage';   // Trang tóm tắt

// Expose app configuration
import appConfig from "../app-config.json";

if (!window.APP_CONFIG) {
  window.APP_CONFIG = appConfig as any;
}

// Layout với routes
const Layout = () => (
  <Provider>
    <ZMPRouter>
      <Routes>
        <Route path="/" Component={Home} />
        <Route path="/summary" Component={Summary} />
      </Routes>
    </ZMPRouter>
  </Provider>
);

const root = createRoot(document.getElementById("app")!);
root.render(<Layout />);