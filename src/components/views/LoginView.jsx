import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';

// Đã loại bỏ các import không khả dụng trong môi trường preview (Firebase, utils/api)
// Sử dụng biến tĩnh để chạy trực tiếp trên Canvas
const LOCAL_AUTH_ENABLED = true;

export default function LoginView({ onLogin }) {
  const [username, setUsername] = useState(localStorage.getItem('saved_username') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Đăng nhập thất bại');
        triggerShake();
        setIsLoading(false);
        return;
      }

      // ✅ lưu thông tin user
      localStorage.setItem('saved_username', data.user.username);
      localStorage.setItem('user_branch', data.user.branch);
      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('token', data.token);

      // callback login
      onLogin(data.token);

    } catch (err) {
      console.error(err);
      setError('Không kết nối được server');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden edu-svg-bg font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(255,215,0,0.10),transparent_55%),radial-gradient(circle_at_40%_90%,rgba(255,255,255,0.06),transparent_60%)] edu-noise" />
      </div>

      <div
        className={`relative max-w-[400px] w-full transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${shake ? '[animation:shake_0.5s_ease-in-out]' : ''}`}
        style={shake ? { animation: 'shake 0.5s ease-in-out' } : {}}
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
          <div className="px-10 pt-10 pb-8 bg-gradient-to-r from-white via-white to-yellow-50">
            {/* Logo + Brand Row — centered */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <img src="/ace-logo.svg" alt="ACE" className="w-16 h-16 rounded-2xl shadow-md flex-shrink-0" />
              <div className="flex flex-col justify-center h-16">
                <h1 className="text-3xl font-black text-[#E11920] tracking-tight m-0 p-0 leading-none">ACE HRM</h1>
              </div>
            </div>
            {/* Subtitle — centered */}
            <div className="border-t border-slate-100 pt-6 text-center">
              <p className="text-sm font-bold text-slate-700">Đăng nhập hệ thống</p>
              <p className="text-xs text-slate-500 mt-1">Quản lý nhân sự · công việc · báo cáo</p>
            </div>
          </div>

          <div className="px-10 py-8 bg-white">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-username" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tài khoản</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#E11920] focus:ring-4 focus:ring-red-200/40 transition-all outline-none text-slate-900 placeholder-slate-400 font-bold"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#E11920] focus:ring-4 focus:ring-red-200/40 transition-all outline-none text-slate-900 placeholder-slate-400 font-bold"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold py-3 px-4 rounded-2xl">
                  {error}
                </div>
              )}

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed bg-[#E11920] hover:bg-[#c9151b] flex items-center justify-center gap-2"
              >
                {isLoading ? 'Đang xác thực…' : 'Đăng nhập'}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100">
            <p className="text-center text-[11px] text-slate-500 font-bold">© {new Date().getFullYear()} <span className="text-[#E11920]">ACE HRM</span></p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-8px); }
          30%, 70% { transform: translateX(8px); }
        }

        .edu-svg-bg {
          background-image:
            url('/4046152-01.svg');
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          animation: eduBgPan 18s ease-in-out infinite;
        }

        .edu-noise {
          opacity: 0.92;
          animation: eduPulse 10s ease-in-out infinite;
        }

        @keyframes eduBgPan {
          0% { background-position: 50% 50%, 50% 50%; }
          50% { background-position: 45% 52%, 46% 52%; }
          100% { background-position: 50% 50%, 50% 50%; }
        }

        @keyframes eduPulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
