import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Quote,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { CoastalPalmTrees } from '@/components/common/CoastalPalmTrees';
import { useCompany } from '@/context/CompanyContext';

interface CraftQuote {
  text: string;
  author: string;
  location: string;
}

const CRAFT_QUOTES: CraftQuote[] = [
  {
    text: "Every roof we build is more than shelter — it's the standard of craftsmanship we leave behind.",
    author: "Rise Up Field Principles",
    location: "Oceanside, California",
  },
  {
    text: "We shape our buildings; thereafter, our buildings shape us.",
    author: "Winston Churchill",
    location: "On Architecture & Endurance",
  },
  {
    text: "Quality is never an accident; it is always the result of high intention, sincere effort, and intelligent execution.",
    author: "John Ruskin",
    location: "The Heritage of Craft",
  },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [themeMode, setThemeMode] = useState<'coastal' | 'obsidian'>('coastal');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);

  const { login, user } = useAuth();
  const { city, licenseNumber, legalName, dba, publicPhone, primaryEmail } = useCompany();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Gentle auto-rotation for inspiring quotes every 9 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveQuoteIndex((prev) => (prev + 1) % CRAFT_QUOTES.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(password, email);
      navigate('/');
    } catch (err: any) {
      setError(
        err.message ||
          'Authentication failed. Please check your work email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isCoastal = themeMode === 'coastal';
  const activeQuote = CRAFT_QUOTES[activeQuoteIndex];

  return (
    <div
      className={`min-h-screen relative flex flex-col justify-between overflow-x-hidden transition-colors duration-500 ${
        isCoastal ? 'light-glass-canvas text-slate-900' : 'bg-[#070B12] text-slate-100'
      }`}
    >
      {/* Ambient background gradients */}
      {isCoastal ? (
        <>
          <div className="absolute -top-32 left-[8%] w-[600px] h-[600px] bg-gradient-to-br from-sky-400/20 via-blue-400/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-[25%] right-[15%] w-[450px] h-[450px] bg-gradient-to-bl from-amber-300/15 via-yellow-200/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 left-[20%] w-[550px] h-[550px] bg-gradient-to-tr from-cyan-400/15 via-sky-300/10 to-transparent rounded-full blur-[110px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute -top-24 left-[5%] w-[600px] h-[600px] bg-[#1878B8]/15 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[25%] w-[550px] h-[550px] bg-[#EAA636]/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-[35%] right-[10%] w-[480px] h-[480px] bg-[#38BDF8]/10 rounded-full blur-[120px] pointer-events-none" />
        </>
      )}

      {/* ================================================================
          1. CLEAN TOP HEADER
          ================================================================ */}
      <header className="relative z-30 w-full border-b border-slate-200/50 dark:border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" themeMode={isCoastal ? 'light' : 'dark'} />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Help & Support */}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                isCoastal
                  ? 'bg-white/70 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-white'
                  : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/[0.08]'
              }`}
              title="Help & Contact"
            >
              <HelpCircle size={14} />
              <span className="hidden sm:inline">Support</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setThemeMode(isCoastal ? 'obsidian' : 'coastal')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isCoastal
                  ? 'bg-white/80 border-slate-200 text-slate-700 hover:border-sky-300 shadow-2xs'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-sky-400/50'
              }`}
              title={`Switch to ${isCoastal ? 'Obsidian Dark' : 'Coastal Light'} mode`}
            >
              {isCoastal ? (
                <>
                  <Moon size={14} className="text-slate-600" />
                  <span className="hidden sm:inline text-[11px]">Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-amber-400" />
                  <span className="hidden sm:inline text-[11px]">Light Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================
          2. MAIN STAGE: EDITORIAL QUOTE & CLEAN AUTH CARD
          ================================================================ */}
      <main className="relative z-20 flex-1 max-w-7xl mx-auto w-full px-6 py-10 lg:py-16 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* ────────────────────────────────────────────────────────────
              LEFT COLUMN: Editorial Craftsmanship & Inspiring Quote
              ──────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-8 lg:pr-6">
            {/* Subtle Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1878B8]/10 border border-[#1878B8]/20 text-[#1878B8] text-xs font-semibold w-fit">
              <Sparkles size={13} className="stroke-[2.2]" />
              <span>Rise Up Roofing CRM</span>
            </div>

            {/* Quote Container with Breathing Space */}
            <div className="relative pl-1">
              <Quote
                className={`w-12 h-12 mb-4 -ml-1 transition-colors duration-300 ${
                  isCoastal ? 'text-sky-500/25' : 'text-sky-400/20'
                }`}
              />

              <blockquote className="space-y-4">
                <p
                  key={activeQuoteIndex}
                  className={`text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight leading-[1.3] transition-all duration-500 animate-in fade-in ${
                    isCoastal ? 'text-slate-800' : 'text-slate-100'
                  }`}
                >
                  "{activeQuote.text}"
                </p>

                <div className="pt-2 flex flex-col">
                  <span
                    className={`text-sm font-semibold tracking-wide ${
                      isCoastal ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {activeQuote.author}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {activeQuote.location}
                  </span>
                </div>
              </blockquote>

              {/* Interactive Quote Switcher Controls */}
              <div className="flex items-center gap-4 mt-8 pt-2">
                <div className="flex items-center gap-1.5">
                  {CRAFT_QUOTES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveQuoteIndex(idx)}
                      className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                        idx === activeQuoteIndex
                          ? 'w-6 bg-[#1878B8]'
                          : isCoastal
                          ? 'w-1.5 bg-slate-300 hover:bg-slate-400'
                          : 'w-1.5 bg-white/20 hover:bg-white/40'
                      }`}
                      aria-label={`View quote ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuoteIndex(
                        (prev) => (prev - 1 + CRAFT_QUOTES.length) % CRAFT_QUOTES.length
                      )
                    }
                    className={`p-1 rounded-full border transition-colors cursor-pointer ${
                      isCoastal
                        ? 'border-slate-200 hover:bg-white text-slate-500 hover:text-slate-800'
                        : 'border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                    aria-label="Previous quote"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuoteIndex((prev) => (prev + 1) % CRAFT_QUOTES.length)
                    }
                    className={`p-1 rounded-full border transition-colors cursor-pointer ${
                      isCoastal
                        ? 'border-slate-200 hover:bg-white text-slate-500 hover:text-slate-800'
                        : 'border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                    aria-label="Next quote"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Subtle Minimal Imprint */}
            <div className="pt-4 border-t border-slate-200/50 dark:border-white/5">
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                {city || 'Oceanside'}, California • Licensed Contractor {licenseNumber || 'CSLB #1115874'}
              </p>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────
              RIGHT COLUMN: Focused, Clean Authentication Card
              ──────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div
              className={`w-full max-w-md rounded-3xl p-8 sm:p-10 border relative backdrop-blur-xl shadow-xl transition-all ${
                isCoastal
                  ? 'bg-white/85 border-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)]'
                  : 'bg-[#0E1626]/85 border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
              }`}
            >
              {/* Form Heading */}
              <div className="mb-7">
                <h2
                  className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                    isCoastal ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Welcome back
                </h2>
                <p
                  className={`text-xs sm:text-sm font-medium mt-1.5 ${
                    isCoastal ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Sign in to access your CRM workspace
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    !
                  </div>
                  <div className="flex-1 leading-relaxed">{error}</div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email address
                  </label>
                  <div className="relative flex items-center">
                    <Mail
                      size={16}
                      className={`absolute left-3.5 transition-colors ${
                        isCoastal ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@riseuprc.com"
                      autoComplete="email"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all focus:outline-none ${
                        isCoastal
                          ? 'bg-slate-50 hover:bg-white focus:bg-white text-slate-900 border border-slate-200 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/15'
                          : 'bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] text-white border border-white/10 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 placeholder-slate-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <Lock
                      size={16}
                      className={`absolute left-3.5 transition-colors ${
                        isCoastal ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className={`w-full pl-10 pr-11 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all focus:outline-none ${
                        isCoastal
                          ? 'bg-slate-50 hover:bg-white focus:bg-white text-slate-900 border border-slate-200 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/15'
                          : 'bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] text-white border border-white/10 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 placeholder-slate-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1878B8] border-slate-300 dark:border-white/20 focus:ring-[#1878B8] cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Remember me on this device
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-[#1878B8] to-[#0284c7] text-white text-sm font-semibold shadow-md shadow-sky-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 hover:brightness-105 hover:shadow-lg hover:shadow-sky-600/30 active:scale-[0.99]"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Copyright & Help */}
              <div className="mt-8 pt-5 border-t border-slate-200/60 dark:border-white/10 text-center space-y-1">
                <p className="text-xs text-slate-400">
                  © {new Date().getFullYear()} {legalName || dba || 'Rise Up Roofing & Construction Inc.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#1878B8] dark:hover:text-sky-400 cursor-pointer"
                >
                  Need assistance? Contact operations
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ================================================================
          3. SUBTLE COASTAL WATERMARK AT BASE
          ================================================================ */}
      <footer className="relative z-10 w-full overflow-hidden pointer-events-none opacity-20 select-none">
        <div className="max-w-7xl mx-auto px-6 flex justify-end">
          <CoastalPalmTrees width="320px" height="80px" />
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
