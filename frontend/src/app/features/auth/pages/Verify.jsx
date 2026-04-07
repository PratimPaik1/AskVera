import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || "your email";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-md text-center">

        {/* Logo / Brand */}
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent mb-2">
          AskVera
        </h1>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-4">
          Verify Your Email
        </h2>

        {/* Message */}
        <p className="text-gray-400 text-sm mb-6">
          We’ve sent a verification link to:
        </p>

        {/* Email Highlight */}
        <p className="text-red-400 font-medium mb-6 break-all">
          {email}
        </p>

        <p className="text-gray-500 text-xs mb-6">
          Please check your inbox and click the link to activate your account.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          

          <button
            onClick={() => navigate("/login")}
            className="w-full py-2 border border-gray-700 hover:bg-red-800 rounded-lg text-sm transition"
          >
            Back to Login
          </button>

        </div>

      </div>
    </div>
  );
}