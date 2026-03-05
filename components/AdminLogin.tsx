import React, { useState } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';
import { signIn, AuthUser } from '../services/authService';

interface Props {
  onLogin: (user: AuthUser) => void;
  lang: Language;
}

const AdminLogin: React.FC<Props> = ({ onLogin, lang }) => {
  const t = translations[lang];
  const [email, setEmail] = useState('admin@mails.tsinghua.edu.cn');
  const [password, setPassword] = useState('BIDBIDBID88');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { user, error: authError } = await signIn(email, password);
    setLoading(false);

    if (authError || !user) {
      setError(authError || t.loginError);
      return;
    }

    onLogin(user);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-tsinghua-100">
        {/* Logo */}
        <div className="w-14 h-14 bg-tsinghua-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-xl font-black shadow-lg shadow-tsinghua-200">
          BM
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-8 text-center tracking-tight">
          {t.loginTitle}
        </h2>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2">
              {t.emailLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2">
              {t.passwordLabel}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center font-semibold bg-red-50 py-2 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-tsinghua-500 hover:bg-tsinghua-600 text-white font-black rounded-2xl transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] uppercase tracking-widest text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (lang === 'CN' ? '登录中...' : 'Signing in...') : t.loginBtn}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
