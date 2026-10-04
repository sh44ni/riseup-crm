import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  Check,
  Lock,
  Mail,
  User,
  Phone,
  AlertCircle,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Camera,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/common/BrandLogo';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { setSessionUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<{
    email: string;
    invited_by: string;
    roles: Array<{ id: number; name: string; description?: string }>;
    primary_role: string;
    expires_at: string;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Email verification / OTP state
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [resendSuccessMessage, setResendSuccessMessage] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (!token) {
      setLoadError('No invitation token was provided in the URL.');
      setIsLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.getPublicInvitation(token);
        if (res.ok && res.invitation) {
          setInvitation(res.invitation);
          if ((res.invitation as any).name) {
            setName((res.invitation as any).name);
          }
          if ((res.invitation as any).phone) {
            setPhone((res.invitation as any).phone);
          }
          if ((res as any).verified) {
            setIsEmailVerified(true);
          } else {
            setIsEmailVerified(false);
            // Proactively trigger OTP dispatch so user receives their code immediately upon opening
            try {
              await api.resendOtp(res.invitation.email);
            } catch {
              // Ignore rate limit or send failure on mount
            }
          }
        } else {
          setLoadError('Invalid invitation link.');
        }
      } catch (err: any) {
        setLoadError(err.message || 'Invitation link is invalid or has expired.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation?.email) return;
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setOtpError('Please enter the 6-digit confirmation code.');
      return;
    }
    setOtpError(null);
    setOtpLoading(true);
    try {
      const res = await api.verifyOtp(invitation.email, cleanOtp);
      if (res && res.token) {
        setIsEmailVerified(true);
        setStep(1);
      } else {
        throw new Error('Verification succeeded but confirmation token was missing.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired confirmation code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!invitation?.email || resendCountdown > 0 || resendLoading) return;
    setResendLoading(true);
    setOtpError(null);
    try {
      await api.resendOtp(invitation.email);
      setResendSuccessMessage('A fresh 6-digit code has been emailed to you.');
      setResendCountdown(60);
      setTimeout(() => setResendSuccessMessage(null), 5000);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const handleNextToStep2 = () => {
    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    setFormError(null);
    setStep(2);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.acceptPublicInvitation(token!, {
        name: name.trim(),
        password,
        phone: phone.trim() || undefined,
      });

      if (res.ok && res.token && res.user) {
        // Set the token explicitly in the API client before making another request
        api.setToken(res.token);
        
        if (avatarFile) {
          try {
            await api.uploadAvatar(avatarFile);
          } catch (uploadErr) {
            console.error('Failed to upload avatar', uploadErr);
            // Non-fatal error, proceed to success step
          }
        }
        
        setSessionUser(res.token, res.user);
        setStep(3);
      } else {
        throw new Error('Failed to activate account.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openApp = () => {
    window.location.href = '/';
  };

  const hasMinLength = password.length >= 6;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  if (isLoading || loadError) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-sky-50/40 to-amber-50/20 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex justify-center mb-3">
              <BrandLogo size="lg" themeMode="light" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
              <ShieldCheck size={14} className="text-sky-600" />
              <span>Team Invitation</span>
            </div>
          </div>
          <div className="rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 space-y-3">
                <RotateCcw size={28} className="animate-spin mx-auto text-sky-600" />
                <p className="text-xs font-semibold">Verifying secure invitation token...</p>
              </div>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
                  <AlertCircle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Invitation Unavailable</h3>
                  <p className="text-xs text-slate-600">{loadError}</p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-all cursor-pointer"
                >
                  Go to Sign In
                </button>
              </div>
            )}
          </div>
          
          <div className="text-center mt-8 text-xs font-semibold text-slate-500">
            Rise Up Roofing & Construction
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-sky-50/40 to-amber-50/20 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <BrandLogo size="lg" themeMode="light" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
            <ShieldCheck size={14} className="text-sky-600" />
            <span>Account Activation</span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="w-full mb-8 relative">
          <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-200 z-0"></div>
          <div 
            className="absolute top-4 left-0 h-0.5 bg-sky-500 z-0 transition-all duration-500 ease-in-out" 
            style={{ width: !isEmailVerified ? '0%' : `${((step - 1) / 2) * 100}%` }}
          ></div>
          
          <div className="flex justify-between w-full relative z-10">
            {[
              { id: 0, label: 'Verify' },
              { id: 1, label: 'Profile' },
              { id: 2, label: 'Security' },
              { id: 3, label: 'Complete' },
            ].map(s => {
              const isActive = !isEmailVerified ? s.id === 0 : step === s.id;
              const isCompleted = isEmailVerified && (s.id === 0 || step > s.id);
              
              return (
                <div key={s.id} className="flex flex-col items-center gap-2">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 
                      isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 
                      'bg-white border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check size={16} /> : <span className="text-xs font-bold">{s.id === 0 ? '•' : s.id}</span>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? 'text-sky-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Card */}
        <div className="w-full rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl transition-all duration-300">
          
          {formError && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 0: Email OTP Confirmation */}
          {!isEmailVerified ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1878B8] to-sky-400 flex items-center justify-center text-white shadow-md shadow-sky-600/20 mx-auto mb-3">
                  <ShieldCheck size={26} className="stroke-[2.2]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Confirm It's You</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  To confirm you own this email and secure your account, please enter the 6-digit confirmation code sent to{' '}
                  <strong className="text-slate-900 font-semibold font-mono">{invitation?.email}</strong>.
                </p>
              </div>

              {otpError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                  <span className="flex-1">{otpError}</span>
                </div>
              )}

              {resendSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>{resendSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      if (otpError) setOtpError(null);
                    }}
                    placeholder="• • • • • •"
                    className="w-full py-3.5 text-center text-2xl font-mono font-bold tracking-[0.4em] rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/10 shadow-2xs transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.trim().length < 6}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:grayscale"
                >
                  {otpLoading ? (
                    <>
                      <RotateCcw size={15} className="animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Continue</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCountdown > 0 || resendLoading}
                  className="font-bold text-sky-600 hover:text-sky-700 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {resendLoading ? 'Sending...' : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Profile Setup */}
              {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Invitation Details Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-slate-50 border border-sky-100/50 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Invited Email:</span>
                  <span className="font-bold text-slate-900 font-mono flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    {invitation?.email}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Invited By:</span>
                  <span className="font-semibold text-slate-800">{invitation?.invited_by}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-100/50 mt-1">
                  <span className="text-slate-500">Role Assigned:</span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wide bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1">
                    <Shield size={12} />
                    {invitation?.primary_role}
                  </span>
                </div>
              </div>

              {/* Profile Photo */}
              <div className="flex flex-col items-center pt-2">
                <div 
                  className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-100 to-amber-100 border-4 border-white shadow-lg relative group cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-sky-600 opacity-60">
                      {name ? getInitials(name) : <User size={40} className="text-slate-300" />}
                    </span>
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white mb-1" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">Upload</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-wider">
                  Profile Photo (Optional)
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Marc Sarellano"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(760) 555-0199"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleNextToStep2}
                  className="w-full py-3 mt-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Create Password */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Secure Your Account</h3>
                <p className="text-xs text-slate-500">Create a strong password to protect your access to the CRM.</p>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Create Password *
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-2xs transition-all"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-2xs transition-all"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                
                {/* Password Requirements Checklist */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className={`flex items-center gap-2 text-xs font-semibold ${hasMinLength ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {hasMinLength ? <Check size={14} className="shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />}
                    <span>At least 6 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold ${passwordsMatch ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {passwordsMatch ? <Check size={14} className="shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />}
                    <span>Passwords match</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !hasMinLength || !passwordsMatch}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#1878B8] via-sky-500 to-[#55C4F5] hover:opacity-95 shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:grayscale"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCcw size={15} className="animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <Sparkles size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="text-center space-y-6 py-6 animate-in zoom-in-95 duration-500">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
                <div className="absolute inset-0 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-100 shadow-xl shadow-emerald-500/20">
                  <Check size={40} className="text-emerald-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to Rise Up Roofing!</h2>
                <p className="text-sm text-slate-500">Your account has been activated and you're ready to start.</p>
              </div>

              <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm mx-auto text-left min-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-xs">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{name}</div>
                  <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">{invitation?.primary_role}</div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={openApp}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1878B8] to-[#2F9FE3] hover:shadow-lg hover:shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Open Rise Up CRM</span>
                  <ArrowRight size={16} />
                </button>
                
                <div className="relative">
                  <button
                    disabled
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 border border-slate-200 opacity-60 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>Install CRM App</span>
                  </button>
                  <div className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm rotate-3 border border-white">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}

        </div>
        
        <div className="text-center mt-8 text-xs font-semibold text-slate-500/80">
          Rise Up Roofing & Construction
        </div>
      </div>
    </div>
  );
}
