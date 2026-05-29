'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/useUser';
import { User, LogOut, ChevronDown, Stethoscope, Shield, HeartPulse } from 'lucide-react';

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-purple-100 text-purple-700' },
  doctor: { label: 'Bác sĩ', cls: 'bg-blue-100 text-blue-700' },
  nurse: { label: 'Điều dưỡng', cls: 'bg-teal-100 text-teal-700' },
  patient: { label: 'Bệnh nhân', cls: 'bg-green-100 text-green-700' },
};

function RoleIcon({ role }: { role: string }) {
  if (role === 'admin') return <Shield className="w-3.5 h-3.5" />;
  if (role === 'doctor') return <Stethoscope className="w-3.5 h-3.5" />;
  if (role === 'nurse') return <HeartPulse className="w-3.5 h-3.5" />;
  return <HeartPulse className="w-3.5 h-3.5" />;
}

export function UserMenu() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  if (loading) {
    return <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
      >
        <User className="w-4 h-4" />
        Đăng nhập
      </button>
    );
  }

  const roleInfo = ROLE_LABELS[user.role] || { label: user.role, cls: 'bg-gray-100 text-gray-700' };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
      >
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="font-medium text-gray-800 max-w-[120px] truncate hidden sm:block">{user.name}</span>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hidden sm:flex ${roleInfo.cls}`}>
          <RoleIcon role={user.role} />
          {roleInfo.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${roleInfo.cls}`}>
              <RoleIcon role={user.role} />
              {roleInfo.label}
            </div>
          </div>
          <div className="py-1">
            {user.role === 'admin' && (
              <button
                onClick={() => { setOpen(false); router.push('/admin'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Shield className="w-4 h-4 text-purple-500" />
                Quản trị tài khoản
              </button>
            )}
            {user.role === 'doctor' && (
              <button
                onClick={() => { setOpen(false); router.push('/admin/staff'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Shield className="w-4 h-4 text-gray-400" />
                Quản lý nhân viên
              </button>
            )}
            <button
              disabled
              className="w-full text-left px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed flex items-center gap-2"
              title="Tính năng đang phát triển"
            >
              <User className="w-4 h-4" />
              Đổi mật khẩu
            </button>
          </div>
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
