import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./features/auth/pages/Login.jsx";
import Register from "./features/auth/pages/Register.jsx";

import Home from "./features/home/pages/Home.jsx";
import Verify from "./features/auth/pages/Verify.jsx";
import Dashboard from "./features/chats/pages/Dashboard.jsx";
import BuildPage from "./features/build/pages/BuildPage.jsx";


function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/verifyEmail" element={<Verify />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/build" element={<BuildPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
