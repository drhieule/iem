'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/useUser';
import {
  ArrowLeft, Shield, Plus, RefreshCw, X, Eye, EyeOff,
  Stethoscope, CheckCircle, XCircle, Users, UserCheck, Key,
} from 'lucide-react';

interface StaffAccount {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'nurse';
  username: string;
  department: string;
  phone?: string;
  avatar_initials?: string;
  active: number;
  created_at: string;
}

interface PatientAccount {
  id: number;
  name: string;
  record_number: string | null;
  login_phone: string;
  diagnosis: string;
  active_login: boolean;
}

interface AllPatient {
  id: number;
  name: string;
  diagnosis: string;
  login_phone?: string | null;
}

type Tab = 'all' | 'staff' | 'patients';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
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

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function RoleBadge({ role }: { role: 'admin' | 'doctor' | 'nurse' }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
        <Shield className="w-3 h-3" />
        Admin
      </span>
    );
  }
  if (role === 'doctor') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
        <Stethoscope className="w-3 h-3" />
        Bác sĩ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-teal-100 text-teal-700">
      <UserCheck className="w-3 h-3" />
      Điều dưỡng
    </span>
  );
}

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [patients, setPatients] = useState<PatientAccount[]>([]);
  const [allPatients, setAllPatients] = useState<AllPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState<StaffAccount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'staff' | 'patient'; item: StaffAccount | PatientAccount } | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);

  // Staff form
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: 'nurse' as 'admin' | 'doctor' | 'nurse',
    username: '',
    password: '',
    confirmPassword: '',
    department: 'Phòng khám Chuyển hóa Bẩm sinh',
    phone: '',
  });
  const [showStaffPwd, setShowStaffPwd] = useState(false);

  // Reset password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Grant patient login form
  const [grantForm, setGrantForm] = useState({
    patient_id: '',
    login_phone: '',
    record_number: '',
  });
  const [patientSearch, setPatientSearch] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [newPatientDiagnosis, setNewPatientDiagnosis] = useState<'UCD'|'MSUD'|'OA'|'FAOD'>('UCD');

  useEffect(() => {
    if (!userLoading && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, userLoading, router]);

  async function loadData() {
    setLoading(true);
    try {
      const [accountsRes, patientsRes] = await Promise.all([
        fetch('/api/auth/admin/accounts'),
        fetch('/api/patients'),
      ]);
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setStaff(Array.isArray(data.staff) ? data.staff : []);
        setPatients(Array.isArray(data.patients) ? data.patients : []);
      }
      if (patientsRes.ok) {
        const data: AllPatient[] = await patientsRes.json();
        setAllPatients(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') loadData();
  }, [user]);

  async function handleAddStaff(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (staffForm.password !== staffForm.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_type: 'staff',
          name: staffForm.name,
          role: staffForm.role,
          username: staffForm.username,
          password: staffForm.password,
          department: staffForm.department,
          phone: staffForm.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi tạo tài khoản'); return; }
      setShowAddStaffModal(false);
      setStaffForm({ name: '', role: 'nurse', username: '', password: '', confirmPassword: '', department: 'Phòng khám Chuyển hóa Bẩm sinh', phone: '' });
      loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!passwordModal) return;
    setError('');
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/auth/admin/accounts/${passwordModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });
      if (res.ok) {
        setPasswordModal(null);
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        const data = await res.json();
        setError(data.error || 'Lỗi đặt lại mật khẩu');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { type, item } = confirmDelete;
    await fetch(`/api/auth/admin/accounts/${item.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_type: type }),
    });
    setConfirmDelete(null);
    loadData();
  }

  async function handleGrantLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let patientId = grantForm.patient_id ? parseInt(grantForm.patient_id, 10) : null;

      // Create new patient first if in create mode
      if (createMode) {
        const createRes = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: patientSearch.trim(),
            dob_iso: '2000-01-01',
            weight_kg: 0,
            diagnosis: newPatientDiagnosis,
            prescribed_meds: [],
            emergency_contacts: [],
          }),
        });
        if (!createRes.ok) { setError('Không thể tạo bệnh nhân'); return; }
        const newPatient = await createRes.json();
        patientId = newPatient.id;
      }

      if (!patientId) { setError('Vui lòng chọn hoặc nhập tên bệnh nhân'); return; }

      const res = await fetch('/api/auth/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_type: 'patient',
          patient_id: patientId,
          login_phone: grantForm.login_phone,
          record_number: grantForm.record_number,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi cấp quyền'); return; }
      setShowGrantModal(false);
      setGrantForm({ patient_id: '', login_phone: '', record_number: '' });
      setPatientSearch('');
      setCreateMode(false);
      loadData();
    } finally {
      setSaving(false);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'admin') return null;

  const adminCount = staff.filter(s => s.role === 'admin').length;
  const activeStaff = staff.filter(s => s.active).length;

  const filteredPatientsForGrant = allPatients.filter(p =>
    patientSearch === '' || p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  function renderStaffRow(s: StaffAccount) {
    const isSelf = s.id === user?.id;
    return (
      <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
              {s.avatar_initials || s.name.charAt(0)}
            </div>
            <div>
              <span className="font-medium text-gray-900">{s.name}</span>
              {isSelf && <span className="ml-1.5 text-xs text-gray-400">(bạn)</span>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">Nhân viên</td>
        <td className="px-4 py-3">
          <RoleBadge role={s.role} />
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.username}</td>
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
              onClick={() => { setPasswordModal(s); setNewPassword(''); setConfirmNewPassword(''); setError(''); }}
              className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200 flex items-center gap-1"
            >
              <Key className="w-3 h-3" />
              Đặt lại MK
            </button>
            {isSelf ? (
              <button
                disabled
                title="Không thể xóa tài khoản của chính mình"
                className="text-xs px-2.5 py-1.5 bg-gray-50 text-gray-400 rounded-lg border border-gray-200 cursor-not-allowed"
              >
                Xóa
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete({ type: 'staff', item: s })}
                className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
              >
                Xóa
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function renderPatientRow(p: PatientAccount) {
    return (
      <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
        <td className="px-4 py-3">
          <span className="font-medium text-gray-900">{p.name}</span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">Bệnh nhân</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">
            Bệnh nhân
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-700">
          SĐT: {p.login_phone}
          {p.record_number && <span className="block text-gray-400">Hồ sơ: {p.record_number}</span>}
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Hoạt động
          </span>
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => setConfirmDelete({ type: 'patient', item: p })}
            className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
          >
            Xóa tài khoản
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Quản trị hệ thống</h1>
              <p className="text-xs text-gray-500">Bệnh viện Nhi Đồng 1</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold bg-purple-100 text-purple-700 border border-purple-200">
            <Shield className="w-3.5 h-3.5" />
            Admin
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([
            { key: 'all', label: 'Tất cả tài khoản' },
            { key: 'staff', label: 'Nhân viên Y tế' },
            { key: 'patients', label: 'Bệnh nhân' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.key ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Tab: All accounts ── */}
            {activeTab === 'all' && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center shadow-sm">
                    <Users className="w-5 h-5 text-blue-500 mb-1" />
                    <p className="text-xl font-bold text-gray-900">{staff.length}</p>
                    <p className="text-xs text-gray-500">Tổng nhân viên</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center shadow-sm">
                    <UserCheck className="w-5 h-5 text-green-500 mb-1" />
                    <p className="text-xl font-bold text-gray-900">{patients.length}</p>
                    <p className="text-xs text-gray-500">Bệnh nhân có TK</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center shadow-sm">
                    <CheckCircle className="w-5 h-5 text-teal-500 mb-1" />
                    <p className="text-xl font-bold text-gray-900">{activeStaff}</p>
                    <p className="text-xs text-gray-500">Nhân viên hoạt động</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center shadow-sm">
                    <Shield className="w-5 h-5 text-purple-500 mb-1" />
                    <p className="text-xl font-bold text-gray-900">{adminCount}</p>
                    <p className="text-xs text-gray-500">Tài khoản Admin</p>
                  </div>
                </div>

                {/* Combined table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Tên', 'Loại', 'Vai trò', 'Tên đăng nhập / Thông tin đăng nhập', 'Trạng thái', 'Hành động'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {staff.length === 0 && patients.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chưa có tài khoản nào</td>
                          </tr>
                        ) : (
                          <>
                            {staff.map(s => renderStaffRow(s))}
                            {patients.map(p => renderPatientRow(p))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── Tab: Staff ── */}
            {activeTab === 'staff' && (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={() => { setShowAddStaffModal(true); setError(''); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo tài khoản mới
                  </button>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Tên', 'Loại', 'Vai trò', 'Tên đăng nhập', 'Trạng thái', 'Hành động'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {staff.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chưa có nhân viên</td>
                          </tr>
                        ) : staff.map(s => renderStaffRow(s))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── Tab: Patients ── */}
            {activeTab === 'patients' && (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={() => { setShowGrantModal(true); setError(''); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Cấp quyền đăng nhập
                  </button>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Tên bệnh nhân', 'Chẩn đoán', 'Số điện thoại', 'Số hồ sơ', 'Hành động'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {patients.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                              Chưa có bệnh nhân nào được cấp quyền đăng nhập
                            </td>
                          </tr>
                        ) : patients.map(p => (
                          <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{p.diagnosis}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{p.login_phone}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs font-mono">{p.record_number || '—'}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setConfirmDelete({ type: 'patient', item: p })}
                                className="text-xs px-2.5 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                              >
                                Thu hồi quyền
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <Modal title="Tạo tài khoản nhân viên" onClose={() => setShowAddStaffModal(false)}>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Họ và tên *</label>
              <input
                value={staffForm.name}
                onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls}
                placeholder="BS. Nguyễn Văn A"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vai trò *</label>
              <select
                value={staffForm.role}
                onChange={e => setStaffForm(f => ({ ...f, role: e.target.value as 'admin' | 'doctor' | 'nurse' }))}
                className={selectCls}
              >
                <option value="admin">Admin</option>
                <option value="doctor">Bác sĩ</option>
                <option value="nurse">Điều dưỡng</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên đăng nhập *</label>
              <input
                value={staffForm.username}
                onChange={e => setStaffForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '') }))}
                className={inputCls}
                placeholder="bs.nguyenvana"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu *</label>
              <div className="relative">
                <input
                  type={showStaffPwd ? 'text' : 'password'}
                  value={staffForm.password}
                  onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                  className={inputCls + ' pr-10'}
                  required
                />
                <button type="button" onClick={() => setShowStaffPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showStaffPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Xác nhận mật khẩu *</label>
              <input
                type="password"
                value={staffForm.confirmPassword}
                onChange={e => setStaffForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Khoa / Bộ phận</label>
              <input
                value={staffForm.department}
                onChange={e => setStaffForm(f => ({ ...f, department: e.target.value }))}
                className={inputCls}
                placeholder="Phòng khám Chuyển hóa Bẩm sinh"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại</label>
              <input
                value={staffForm.phone}
                onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))}
                className={inputCls}
                placeholder="0901234567"
              />
            </div>
            {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
              <button type="button" onClick={() => setShowAddStaffModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
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
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={inputCls + ' pr-10'}
                  required
                />
                <button type="button" onClick={() => setShowNewPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Xác nhận mật khẩu *</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60">
                {saving ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>
              <button type="button" onClick={() => setPasswordModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <Modal
          title={confirmDelete.type === 'staff' ? 'Xác nhận xóa tài khoản nhân viên' : 'Thu hồi quyền đăng nhập'}
          onClose={() => setConfirmDelete(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Bạn có chắc muốn xóa tài khoản <strong>{confirmDelete.item.name}</strong>?
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              {confirmDelete.type === 'staff'
                ? 'Nhân viên này sẽ không thể đăng nhập sau khi bị xóa.'
                : 'Bệnh nhân này sẽ mất quyền đăng nhập vào hệ thống.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Xác nhận xóa
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Grant Patient Login Modal */}
      {showGrantModal && (
        <Modal title="Cấp quyền đăng nhập bệnh nhân" onClose={() => { setShowGrantModal(false); setCreateMode(false); setPatientSearch(''); setGrantForm({ patient_id: '', login_phone: '', record_number: '' }); }}>
          <form onSubmit={handleGrantLogin} className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bệnh nhân *</label>

              {/* Already selected existing patient */}
              {grantForm.patient_id && !createMode && (
                <div className="flex items-center justify-between border border-green-300 bg-green-50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-green-800">{patientSearch}</span>
                  <button type="button" onClick={() => { setGrantForm(f => ({ ...f, patient_id: '' })); setPatientSearch(''); }} className="text-xs text-green-600 hover:text-red-600 ml-2">Đổi</button>
                </div>
              )}

              {/* Creating new patient */}
              {createMode && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border border-blue-300 bg-blue-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-blue-800 flex-1">{patientSearch} <span className="text-xs text-blue-500">(bệnh nhân mới)</span></span>
                    <button type="button" onClick={() => { setCreateMode(false); setGrantForm(f => ({ ...f, patient_id: '' })); }} className="text-xs text-blue-500 hover:text-red-600">Đổi</button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Chẩn đoán *</label>
                    <select value={newPatientDiagnosis} onChange={e => setNewPatientDiagnosis(e.target.value as 'UCD'|'MSUD'|'OA'|'FAOD')} className={selectCls}>
                      <option value="UCD">UCD — Rối loạn chu trình Urea</option>
                      <option value="MSUD">MSUD — Bệnh Siro Phong</option>
                      <option value="OA">OA — Acid Hữu Cơ Niệu</option>
                      <option value="FAOD">FAOD — Rối loạn Oxy hóa Axit Béo</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Search / type name */}
              {!grantForm.patient_id && !createMode && (
                <>
                  <input
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); setGrantForm(f => ({ ...f, patient_id: '' })); }}
                    className={inputCls}
                    placeholder="Tìm kiếm hoặc nhập tên bệnh nhân..."
                    autoComplete="off"
                  />
                  {patientSearch.trim() && (
                    <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                      {filteredPatientsForGrant.length > 0 && (
                        <div className="max-h-36 overflow-y-auto divide-y divide-gray-50">
                          {filteredPatientsForGrant.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setGrantForm(f => ({ ...f, patient_id: String(p.id) })); setPatientSearch(p.name); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                            >
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-gray-400 ml-2">{p.diagnosis}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setCreateMode(true)}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium border-t border-gray-100 flex items-center gap-2"
                      >
                        <span>＋</span> Tạo mới &ldquo;{patientSearch.trim()}&rdquo;
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại đăng nhập *</label>
              <input
                value={grantForm.login_phone}
                onChange={e => setGrantForm(f => ({ ...f, login_phone: e.target.value }))}
                className={inputCls}
                placeholder="0901234567"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số hồ sơ *</label>
              <input
                value={grantForm.record_number}
                onChange={e => setGrantForm(f => ({ ...f, record_number: e.target.value }))}
                className={inputCls}
                placeholder="Nhập số hồ sơ bệnh nhân"
                required
              />
            </div>
            {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || (!grantForm.patient_id && !createMode) || (createMode && !patientSearch.trim())}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Đang cấp...' : 'Cấp quyền'}
              </button>
              <button type="button" onClick={() => setShowGrantModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
