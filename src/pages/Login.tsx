import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../stores/authStore';
import { ArrowRight, CheckCircle2, Compass, Lock, Menu, Share2, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SYSTEM_BRAND } from '../lib/branding';


function shouldShowMobileInstallIntro() {
  if (typeof window === 'undefined') return false;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const isMobileOrTablet = window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches;
  return isMobileOrTablet && !isStandalone && localStorage.getItem('origin_mobile_install_intro_seen') !== 'true';
}

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstallIntro, setShowInstallIntro] = useState(shouldShowMobileInstallIntro);
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  const continueToLogin = () => {
    localStorage.setItem('origin_mobile_install_intro_seen', 'true');
    setShowInstallIntro(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // In development, the Vite proxy handles /api, or in production the express server does
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          deviceInfo: {
            deviceLabel: `${navigator.platform || 'Dispositivo'} • ${navigator.language || ''}`,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login');
        return;
      }

      setAuth(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (showInstallIntro) {
    return (
      <div className="pwa-install-screen min-h-screen bg-brand-navydark flex flex-col justify-center items-center p-4">
        <div className="pwa-install-card w-full max-w-md bg-brand-navylight border border-gray-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gold" />
          <div className="flex flex-col items-center text-center mb-5">
            <img
              src={SYSTEM_BRAND.logoMarkUrl}
              alt={SYSTEM_BRAND.name}
              className="pwa-install-logo w-24 h-24 mb-3 drop-shadow-2xl"
            />
            <div className="text-white font-bold text-2xl leading-tight">Instalar {SYSTEM_BRAND.name}</div>
            <div className="text-brand-gold text-sm font-semibold mt-1">Melhor experiência de uso no celular</div>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed mb-5 text-center">
            Para instalar e usar o {SYSTEM_BRAND.name} com aparência de aplicativo, sem ocupar espaço com a barra do navegador,
            adicione o {SYSTEM_BRAND.name} à tela de início do seu telefone.
          </p>

          <div className="space-y-3 mb-5">
            <div className="pwa-install-step pwa-install-step-highlight">
              <Compass className="w-5 h-5 text-brand-gold shrink-0" />
              <div>
                <div className="font-bold text-white">iPhone: abra o link pelo Safari</div>
                <div className="text-gray-300 text-sm">
                  No iPhone, primeiro abra este link no navegador <strong>Safari</strong>. Se você estiver dentro do WhatsApp,
                  Instagram, Gmail ou outro app, toque em <strong>Abrir no Safari</strong> antes de instalar.
                </div>
              </div>
            </div>
            <div className="pwa-install-step">
              <Share2 className="w-5 h-5 text-brand-gold shrink-0" />
              <div>
                <div className="font-semibold text-white">No Safari</div>
                <div className="text-gray-400 text-sm">
                  Toque no botão <strong>Compartilhar</strong> <Share2 className="inline w-4 h-4" />, escolha
                  <strong> Adicionar à Tela de Início</strong> e confirme em <strong>Adicionar</strong>.
                </div>
              </div>
            </div>
            <div className="pwa-install-step">
              <Menu className="w-5 h-5 text-brand-gold shrink-0" />
              <div>
                <div className="font-semibold text-white">Android / Chrome</div>
                <div className="text-gray-400 text-sm">
                  Abra no <strong>Chrome</strong>, toque no menu <strong>⋮</strong>, depois em
                  <strong> Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
                </div>
              </div>
            </div>
            <div className="pwa-install-step">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Depois abra pelo ícone {SYSTEM_BRAND.name}</div>
                <div className="text-gray-400 text-sm">
                  Use o ícone criado na tela inicial para abrir com cara de aplicativo e melhor aproveitamento da tela.
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={continueToLogin}
            className="h-auto w-full gap-2 rounded-lg bg-brand-gold px-4 py-3 has-[>svg]:px-4 text-sm font-bold text-brand-navydark transition-colors hover:bg-brand-goldhover"
          >
            Seguir para o Login
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-navydark flex flex-col justify-center items-center p-4">
      
      <div className="w-full max-w-md bg-brand-navylight border border-gray-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Subtle accent line on top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gold" />
        
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={SYSTEM_BRAND.logoMarkUrl} alt={SYSTEM_BRAND.name} className="mb-3 h-24 w-24 object-contain drop-shadow-2xl" />
          <div className="text-center leading-tight">
            <div className="text-3xl font-black tracking-[0.16em] text-brand-gold">AURA</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.34em] text-gray-300">Sistemas</div>
          </div>
          <p className="text-gray-400 text-sm mt-4">Acesso ao Sistema</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/40 border border-red-500/50 rounded text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Login</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-[#171717] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold sm:text-sm transition-colors"
                placeholder="login"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-[#171717] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold sm:text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-8 h-auto w-full rounded-lg border border-transparent bg-brand-gold px-4 py-3 text-sm font-medium text-brand-navydark shadow-sm transition-colors hover:bg-brand-goldhover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold focus:ring-offset-brand-navy focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-gold focus-visible:ring-offset-brand-navy"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>

    </div>
  );
}
