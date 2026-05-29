'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/useUser';
import { ArrowLeft, Plus, RefreshCw, X, Shield, Stethoscope, CheckCircle, XCircle } from 'lucide-react';

interface Staff {
  id: number;
  name: string;
  role: 'doctor' | 'nurse';
  username: string;
  department: string;
  phone?: string;
  avatar_initials?: string;
  active: number;
  created_at: string;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export default function StaffPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState<Staff | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', role: 'nurse' as 'doctor' | 'nurse', username: '',
    password: '', department: 'Phòng khám Chuyển hóa Bẩm sinh', phone: '',
  });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!userLoading && user?.role !== 'doctor') {
      router.push('/');
    }
  }, [user, userLoading, router]);

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'doctor') loadStaff();
  }, [user]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/auth/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi tạo nhân viên'); return; }
      setShowAddModal(false);
      setForm({ name: '', role: 'nurse', username: '', password: '', department: 'Phòng khám Chuyển hóa Bẩm sinh', phone: '' });
      loadStaff();
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!passwordModal) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/auth/staff/${passwordModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setPasswordModal(null);
        setNewPassword('');
      } else {
        const data = await res.json();
        setError(data.error || 'Lỗi đặt lại mật khẩu');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(s: Staff) {
    await fetch(`/api/auth/staff/${s.id}`, { method: 'DELETE' });
    setConfirmDeactivate(null);
    loadStaff();
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'doctor') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/clinic" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Quản lý Nhân viên Y tế</h1>
              <p className="text-xs text-gray-500">Phòng khám Chuyển hóa Bẩm sinh</p>
            </div>
          </div>
          <button
            onClick={() => { setShowAddModal(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm nhân viên
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Tên', 'Vai trò', 'Tên đăng nhập', 'Khoa', 'Điện thoại', 'Trạng thái', 'Hành động'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        Chưa có nhân viên. Nhấn &quot;Thêm nhân viên&quot; để bắt đầu.
                      </td>
                    </tr>
                  ) : staff.map((s, i) => (
                    <tr key={s.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                            {s.avatar_initials || s.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${s.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {s.role === 'doctor' ? <Stethoscope className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {s.role === 'doctor' ? 'Bác sĩ' : 'Điều dưỡng'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.username}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{s.department || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.phone || '—'}</td>
                      <td className="px-4 py-3">
                        {s.active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Vô hiệu
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setPasswordModal(s); setNewPassword(''); setError(''); }}
                            className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200"
                          >
                            Đặt lại MK
                          </button>
                          {s.active ? (
                            <button
                              onClick={() => setConfirmDeactivate(s)}
                              className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                            >
                              Vô hiệu hóa
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add Staff Modal */}
      {showAddModal && (
        <Modal title="Thêm nhân viên y tế" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Họ tên *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="BS. Nguyễn Văn A" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vai trò *</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'doctor' | 'nurse' }))} className={selectCls}>
                <option value="nurse">Điều dưỡng</option>
                <option value="doctor">Bác sĩ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên đăng nhập *</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className={inputCls} placeholder="bs.nguyenvana" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu *</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Khoa / Phòng</label>
              <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Điện thoại</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="0901234567" />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Đang lưu...' : 'Thêm nhân viên'}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {passwordModal && (
        <Modal title={`Đặt lại mật khẩu: ${passwordModal.name}`} onClose={() => setPasswordModal(null)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu mới *</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} required />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60">
                {saving ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
              </button>
              <button type="button" onClick={() => setPasswordModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivate Confirm */}
      {confirmDeactivate && (
        <Modal title="Xác nhận vô hiệu hóa" onClose={() => setConfirmDeactivate(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Bạn có chắc muốn vô hiệu hóa tài khoản của <strong>{confirmDeactivate.name}</strong>? Họ sẽ không thể đăng nhập cho đến khi được kích hoạt lại.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeactivate(confirmDeactivate)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Xác nhận vô hiệu hóa
              </button>
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
