import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useSelector } from "react-redux"

import { useAuth } from "../../auth/hooks/use.auth";

export default function Home() {
  const { handelLogout } = useAuth()


  const { user, loading } = useSelector((state) => state.auth);

  const lines = [
    "Ask anything. Get instant answers.",
    "Build faster with AI-powered coding help.",
    "Your personal AI for productivity.",
    "Learn, create, and explore smarter."
  ];
  const features = [
    {
      title: "Smart AI Chat",
      desc: "Get instant answers, coding help, and explanations powered by AI."
    },
    {
      title: "Code Generation",
      desc: "Generate clean, production-ready code in multiple languages within seconds."
    },
    {
      title: "Bug Fixing",
      desc: "Identify errors in your code and get accurate fixes with explanations."
    },
    {
      title: "Email Automation",
      desc: "Send emails using AI by simply describing your intent or message."
    },
    {
      title: "Content Summarization",
      desc: "Summarize long articles, documents, or notes into concise insights."
    },
    {
      title: "Idea Generation",
      desc: "Get creative ideas for projects, startups, or content instantly."
    },
    {
      title: "Productivity Assistant",
      desc: "Automate repetitive tasks and save hours of manual work."
    },
    {
      title: "Learning Companion",
      desc: "Understand complex topics with step-by-step explanations."
    },
    {
      title: "Multi-purpose AI",
      desc: "One platform for coding, learning, writing, and productivity."
    }
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % lines.length);
    }, 3000);

    // GSAP hero animation
    gsap.set(".hero-title", { opacity: 0, y: 50 });
    gsap.set(".hero-sub", { opacity: 0, y: 30 });
    gsap.set(".cta-btn", { opacity: 0, scale: 0.8 });

    gsap.to(".hero-title", {
      y: 0,
      opacity: 1,
      duration: 1,
      ease: "power3.out",
    });

    gsap.to(".hero-sub", {
      y: 0,
      opacity: 1,
      duration: 1,
    });

    gsap.to(".cta-btn", {
      scale: 1,
      opacity: 1,
      duration: 0.8,
      delay: 0.6,
    });

    // Cursor logic
    const cursor = document.querySelector(".custom-cursor");
    const area = document.querySelector(".cursor-area");
    if (!cursor || !area) {
      return () => clearInterval(interval);
    }

    const moveCursor = (e) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.2,
        ease: "power2.out"
      });
    };

    const showCursor = () => {
      gsap.to(cursor, { opacity: 1, duration: 0.2 });
    };

    const hideCursor = () => {
      gsap.to(cursor, { opacity: 0, duration: 0.2 });
    };

    area.addEventListener("mousemove", moveCursor);
    area.addEventListener("mouseenter", showCursor);
    area.addEventListener("mouseleave", hideCursor);

    return () => {
      clearInterval(interval);
      area.removeEventListener("mousemove", moveCursor);
      area.removeEventListener("mouseenter", showCursor);
      area.removeEventListener("mouseleave", hideCursor);
    };
  }, [lines.length]);

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

  return (
    <div className="cursor-area min-h-screen bg-gray-950 text-white relative overflow-hidden">

      {/* Custom Cursor (GLOBAL) */}
      <div className="custom-cursor fixed w-8 h-8 rounded-full pointer-events-none mix-blend-difference bg-white z-50 -translate-x-1/2 -translate-y-1/2 opacity-0 hidden md:block"></div>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
          AskVera
        </h1>

        <div className="flex gap-6 items-center">
          <a
            href="#about"
            className="hover:text-red-400 transition hover:scale-115 hidden md:block"
          >
            About
          </a>

          {!user ? (
            <>
              <Link
                to="/login"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg hover:scale-95"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg hover:scale-95"
              >
                Register
              </Link>
            </>
          ) : (<>
            <span className="text-green-400 font-medium hover:scale-95 transition ease-in">
              Hello, {user?.userName}
            </span>
            <span className="text-red-400 font-medium hover:scale-95 transition ease-in" onClick={() => { handelLogout() }}>Log Out</span>
          </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-20">
        <h2 className="hero-title text-4xl sm:text-5xl font-bold mb-4 ">
          Your AI Assistant for Everything
        </h2>

        <p className="hero-sub text-gray-400 max-w-xl mb-8 transition-opacity duration-500">
          {lines[index]}
        </p>
        <div className="flex flex-col gap-9 sm:flex-row">
          <Link
            to={!user ? "/login" : "/dashboard"}
            className="block cta-btn px-6 py-3 bg-gradient-to-r from-red-500 to-orange-400 rounded-xl font-semibold hover:scale-105 transition text-center"
          >
            {!user ? "Get Started" : "Chat with AskVera"}
          </Link>

          {user && (
            <Link
              to="build"
              className="block cta-btn px-6 py-3 bg-gradient-to-r from-red-500 to-orange-400 rounded-xl font-semibold hover:scale-105 transition text-center"
            >
              Build with AskVera
            </Link>
          )}
        </div>      </section>

      {/* Features */}
      <section className="px-6 py-16 grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((f, i) => (
          <div key={i} className="feature-card bg-gray-900 p-6 rounded-xl hover:scale-105 hover:bg-amber-950  transition">
            <h4 className="text-lg font-semibold mb-2">{f.title}</h4>
            <p className="text-gray-400">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* About */}
      <section id="about" className="px-6 py-16 bg-gray-900 text-center">
        <h3 className="text-3xl font-bold mb-6">About AskVera</h3>

        <p className="text-gray-400 max-w-2xl mx-auto mb-4">
          <span className="text-white font-semibold">AskVera</span> is an intelligent AI-powered platform designed to simplify how you interact with technology. Whether you need instant answers, help with coding, or creative ideas, AskVera acts as your personal assistant—fast, accurate, and always available.
        </p>

        <p className="text-gray-400 max-w-2xl mx-auto mb-4">
          Built with modern AI capabilities, AskVera helps users boost productivity by automating everyday tasks like generating code, summarizing content, and even sending emails based on user requests.
        </p>

        <p className="text-gray-400 max-w-2xl mx-auto">
          Our goal is to make advanced AI accessible to everyone—developers, students, and professionals—so they can focus on what truly matters while AskVera handles the rest.
        </p>
      </section>



      {/* Footer */}
      <footer className="text-center py-6 border-t border-gray-800 text-gray-500 text-sm">
        © {new Date().getFullYear()} AskVera. All rights reserved.
        <span className="block mt-1 text-gray-400">
          Crafted by Pratim Paik
        </span>
      </footer>
    </div>
  );
}
