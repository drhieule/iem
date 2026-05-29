'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle, Lock, Phone, FileText, Eye, EyeOff, Activity, ChevronDown, ChevronUp } from 'lucide-react';

type Tab = 'staff' | 'patient';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('staff');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  // Staff form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Patient form
  const [phone, setPhone] = useState('');
  const [recordNumber, setRecordNumber] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body =
        activeTab === 'staff'
          ? { type: 'staff', username, password }
          : { type: 'patient', phone, record_number: recordNumber };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đăng nhập thất bại');
        return;
      }

      // Redirect based on role
      if (data.user.role === 'patient') {
        router.push(`/patients/${data.user.patientId}`);
      } else {
        router.push('/');
      }
      router.refresh();
    } catch {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Bệnh viện Nhi Đồng 1</h1>
            <p className="text-blue-100 text-sm mt-1">Phòng khám Chuyển hóa Bẩm sinh</p>
          </div>

          <div className="px-8 py-6">
            {/* Tab buttons */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => { setActiveTab('staff'); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'staff'
                    ? 'bg-white shadow text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Nhân viên Y tế
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('patient'); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'patient'
                    ? 'bg-white shadow text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Bệnh nhân
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'staff' ? (
                <>
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Tên đăng nhập
                    </label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="bs.hieule"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Số điện thoại
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="0901234567"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Record number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Số hồ sơ bệnh nhân
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={recordNumber}
                        onChange={e => setRecordNumber(e.target.value)}
                        placeholder="NĐ1-2024-001234"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Số hồ sơ ghi trên phiếu khám của bệnh nhân
                    </p>
                  </div>
                </>
              )}

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-5 border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDemo(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span>Tài khoản demo</span>
                {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showDemo && (
                <div className="px-4 py-3 space-y-2 bg-white">
                  <div className="grid grid-cols-[80px_1fr] gap-1 text-xs">
                    <span className="text-gray-500 font-medium">Bác sĩ:</span>
                    <span className="text-gray-800 font-mono">bs.hieule / HieuPhuc@2026</span>
                    <span className="text-gray-500 font-medium">Điều dưỡng:</span>
                    <span className="text-gray-800 font-mono">dn.lan / NhiDong@2026</span>
                    <span className="text-gray-500 font-medium">Bệnh nhân:</span>
                    <span className="text-gray-800 font-mono">0901234567 / NĐ1-2024-0001</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
