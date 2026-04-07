import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../hooks/use.auth";
import {useSelector} from "react-redux"
export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [fromError, setfromError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
 


    const { user, loading, error } = useSelector((state) => state.auth);
    const {handleLogin}=useAuth()

 if (loading) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white relative overflow-hidden">

  {/* Background glow */}
  <div className="absolute w-[400px] h-[400px] bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>

  {/* Logo */}
  <h1 className="text-4xl font-extrabold bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent mb-8 tracking-wide">
    AskVera
  </h1>

  {/* Glass Loader Card */}
  <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center shadow-2xl">

    {/* Animated Rings */}
    <div className="relative flex items-center justify-center">
      <div className="absolute w-16 h-16 border-4 border-red-500/30 rounded-full animate-ping"></div>
      <div className="w-12 h-12 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin"></div>
    </div>

    {/* Text */}
    <p className="text-gray-300 mt-6 text-sm tracking-wide animate-pulse">
      Preparing your AI experience...
    </p>
  </div>

</div>
  );
}


if(!loading && user){
        return <Navigate to="/"  />
    }

  const handleSubmit = async(e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setfromError("Email and Password are required");
      return;
    }
    setfromError("");
    // console.log("Login Data:", form);
    try{
      
    const response=await handleLogin({
      email:form.email,
      password:form.password
    })
    if(response.status){
      navigate("/")
    }
    }

    catch(err){
      // console.log(error.message)
      if(error.message=="Please verify your email before logging in"){
        setfromError(error.message)
      }
      else{
        setfromError(
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.msg ||
      "Invalid credentials"
    );
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
      <div className="bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-lg w-full max-w-md">

        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent mb-2">AskVera</h1>
        <h2 className="text-xl font-semibold text-center mb-6">Login</h2>

        {fromError && (
          <p className="text-red-400 text-sm mb-4 text-center">{fromError}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter your email"
            />
          </div>

          <div className="relative">
            <label className="block text-sm mb-1">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400 hover:text-red-500"
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            Login
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          Don’t have an account?{' '}
          <button
            onClick={() => navigate("/register")}
            className="text-red-500 hover:underline"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}


