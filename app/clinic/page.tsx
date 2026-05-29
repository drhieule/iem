'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity, ArrowLeft, Users, AlertTriangle, Calendar, FlaskConical,
  Pill, Salad, BarChart3, RefreshCw, Plus, X, CheckCircle,
  Clock, ChevronDown, Building2, Stethoscope, FileImage,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  name: string;
  dob_iso: string;
  weight_kg: number;
  diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
  subtype?: string;
}

interface LabResult {
  id: number;
  patient_id: number;
  tested_at: string;
  test_type: string;
  test_name: string;
  value: number;
  unit: string;
  reference_low?: number;
  reference_high?: number;
  interpretation?: string;
  notes?: string;
  created_at: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  scheduled_at: string;
  type: string;
  doctor?: string;
  department?: string;
  status: string;
  notes?: string;
  created_at: string;
}

interface DietaryPrescription {
  id: number;
  patient_id: number;
  prescribed_at: string;
  prescribed_by?: string;
  protein_g_per_kg?: number;
  protein_g_total?: number;
  formula_name?: string;
  formula_ml_per_day?: number;
  special_formula?: string;
  additional_supplements: string[];
  restrictions: string[];
  meal_schedule: Record<string, string>;
  notes?: string;
  active: number;
  created_at: string;
}

interface Medication {
  id: number;
  patient_id: number;
  drug_name: string;
  dose_mg_per_kg?: number;
  dose_total_mg?: number;
  frequency?: string;
  route?: string;
  indication?: string;
  start_date?: string;
  end_date?: string;
  active: number;
  notes?: string;
  created_at: string;
}

interface FlagEvent {
  id: number;
  patient_id: number;
  started_at: string;
  level: 'RED' | 'YELLOW' | 'GREEN';
  patient: { id: number; name: string; diagnosis: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_TYPES = [
  { value: 'NH3', label: 'NH3 máu', unit: 'µmol/L', low: 10, high: 80 },
  { value: 'leucine', label: 'Leucine huyết tương', unit: 'µmol/L', low: 70, high: 200 },
  { value: 'isoleucine', label: 'Isoleucine huyết tương', unit: 'µmol/L', low: 40, high: 100 },
  { value: 'valine', label: 'Valine huyết tương', unit: 'µmol/L', low: 100, high: 300 },
  { value: 'acylcarnitine', label: 'Acylcarnitine huyết tương', unit: 'µmol/L', low: undefined, high: 2.5 },
  { value: 'glucose', label: 'Đường huyết', unit: 'mmol/L', low: 3.9, high: 6.1 },
  { value: 'lactate', label: 'Lactate máu', unit: 'mmol/L', low: 0.5, high: 2.2 },
  { value: 'CBC', label: 'Tổng phân tích máu (CBC)', unit: '', low: undefined, high: undefined },
  { value: 'CK', label: 'Creatine Kinase (CK)', unit: 'U/L', low: undefined, high: 170 },
  { value: 'kidney', label: 'Chức năng thận', unit: '', low: undefined, high: undefined },
  { value: 'LFT', label: 'Chức năng gan (LFT)', unit: '', low: undefined, high: undefined },
  { value: 'urine_organic_acids', label: 'Acid hữu cơ niệu', unit: 'mmol/mol Cr', low: undefined, high: undefined },
  { value: 'plasma_amino_acids', label: 'Amino acid huyết tương', unit: 'µmol/L', low: undefined, high: undefined },
  { value: 'other', label: 'Khác', unit: '', low: undefined, high: undefined },
];

const APPT_TYPES = [
  { value: 'routine', label: 'Tái khám định kỳ' },
  { value: 'urgent', label: 'Khám khẩn' },
  { value: 'followup', label: 'Tái khám theo dõi' },
  { value: 'newborn_screen', label: 'Tầm soát sơ sinh' },
  { value: 'annual', label: 'Khám hàng năm' },
];

const APPT_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Đã lên lịch', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Đã khám', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Hủy', cls: 'bg-gray-100 text-gray-600' },
  no_show: { label: 'Vắng mặt', cls: 'bg-red-100 text-red-700' },
};

const INTERPRET_LABELS: Record<string, { label: string; cls: string }> = {
  normal: { label: 'Bình thường', cls: 'bg-green-100 text-green-700' },
  low: { label: 'Thấp', cls: 'bg-amber-100 text-amber-700' },
  high: { label: 'Cao', cls: 'bg-amber-100 text-amber-700' },
  critical_low: { label: 'Nguy hiểm thấp', cls: 'bg-red-100 text-red-700' },
  critical_high: { label: 'Nguy hiểm cao', cls: 'bg-red-100 text-red-700' },
};

const DIAGNOSIS_LABELS: Record<string, string> = {
  UCD: 'Rối loạn chu trình Urea',
  MSUD: 'Bệnh Siro Phong',
  OA: 'Acid Hữu Cơ Niệu',
  FAOD: 'Rối loạn Oxy hóa Axit Béo',
};

const ROUTE_OPTIONS = ['uống', 'tiêm bắp', 'tiêm tĩnh mạch', 'nhỏ mắt', 'bôi ngoài da'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeInterpretation(value: number, low?: number | string, high?: number | string): string {
  const lo = low !== undefined && low !== '' ? Number(low) : undefined;
  const hi = high !== undefined && high !== '' ? Number(high) : undefined;
  if (lo !== undefined && value < lo * 0.8) return 'critical_low';
  if (hi !== undefined && value > hi * 2) return 'critical_high';
  if (lo !== undefined && value < lo) return 'low';
  if (hi !== undefined && value > hi) return 'high';
  return 'normal';
}

function timeSince(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 2) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function patientName(patients: Patient[], id: number): string {
  return patients.find(p => p.id === id)?.name || `BN #${id}`;
}

// ─── Modal Overlay ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
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

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) { onChange([...tags, v]); }
    setInput('');
  }
  return (
    <div className="border border-gray-300 rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[42px]">
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder || 'Nhập rồi Enter...'}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
      />
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

// ─── Tab: Tổng quan ───────────────────────────────────────────────────────────

function OverviewTab({ patients, flags, appointments, labResults }: {
  patients: Patient[];
  flags: FlagEvent[];
  appointments: Appointment[];
  labResults: LabResult[];
}) {
  const todayAppts = appointments.filter(a => {
    const d = new Date(a.scheduled_at);
    const now = new Date();
    return d.toDateString() === now.toDateString() && a.status === 'scheduled';
  });
  const pendingLabs = labResults.filter(l => !l.interpretation || l.interpretation === '');
  const redFlags = flags.filter(f => f.level === 'RED');
  const yellowFlags = flags.filter(f => f.level === 'YELLOW');

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng bệnh nhân', value: patients.length, icon: <Users className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 border-blue-200' },
          { label: 'Cảnh báo RED', value: redFlags.length, icon: <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />, bg: 'bg-red-50 border-red-200' },
          { label: 'Lịch khám hôm nay', value: todayAppts.length, icon: <Calendar className="w-5 h-5 text-green-500" />, bg: 'bg-green-50 border-green-200' },
          { label: 'XN chờ kết quả', value: pendingLabs.length, icon: <FlaskConical className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50 border-purple-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex flex-col items-center ${s.bg}`}>
            {s.icon}
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            <p className="text-xs text-gray-600 text-center mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Critical alerts */}
      {(redFlags.length > 0 || yellowFlags.length > 0) && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Cảnh báo đang hoạt động
          </h3>
          <div className="space-y-2">
            {[...redFlags, ...yellowFlags].map(f => (
              <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl border ${f.level === 'RED' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${f.level === 'RED' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{f.patient?.name || patientName(patients, f.patient_id)}</p>
                    <p className="text-xs text-gray-500">{timeSince(f.started_at)}</p>
                  </div>
                </div>
                <Link href={`/patients/${f.patient_id}`} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${f.level === 'RED' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
                  Xem
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's appointments */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-green-600" />
          Lịch khám hôm nay
        </h3>
        {todayAppts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Không có lịch khám hôm nay</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayAppts.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{patientName(patients, a.patient_id)}</p>
                    <p className="text-xs text-gray-500">{APPT_TYPES.find(t => t.value === a.type)?.label || a.type} — {a.doctor || 'N/A'}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {new Date(a.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">Thao tác nhanh</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Users className="w-4 h-4" />
            Xem tất cả bệnh nhân
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Xét nghiệm ─────────────────────────────────────────────────────────

function LabTab({ patients, labResults, onRefresh }: { patients: Patient[]; labResults: LabResult[]; onRefresh: () => void }) {
  const router = useRouter();
  const [filterPatient, setFilterPatient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);

  const [form, setForm] = useState({
    patient_id: '', test_type: '', test_name: '', tested_at: new Date().toISOString().split('T')[0],
    value: '', unit: '', reference_low: '', reference_high: '', notes: '',
  });

  const filtered = labResults.filter(l => {
    if (filterPatient && String(l.patient_id) !== filterPatient) return false;
    if (filterType && l.test_type !== filterType) return false;
    return true;
  });

  function handleTypeChange(type: string) {
    const preset = TEST_TYPES.find(t => t.value === type);
    setForm(f => ({
      ...f,
      test_type: type,
      test_name: preset?.label || f.test_name,
      unit: preset?.unit || f.unit,
      reference_low: preset?.low !== undefined ? String(preset.low) : '',
      reference_high: preset?.high !== undefined ? String(preset.high) : '',
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.patient_id) e.patient_id = 'Vui lòng chọn bệnh nhân';
    if (!form.test_type) e.test_type = 'Vui lòng chọn loại xét nghiệm';
    if (!form.value) e.value = 'Vui lòng nhập kết quả';
    if (!form.unit) e.unit = 'Vui lòng nhập đơn vị';
    if (!form.tested_at) e.tested_at = 'Vui lòng nhập ngày xét nghiệm';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const interpretation = computeInterpretation(Number(form.value), form.reference_low, form.reference_high);
      await fetch('/api/lab-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, value: Number(form.value), interpretation }),
      });
      setShowModal(false);
      setForm({ patient_id: '', test_type: '', test_name: '', tested_at: new Date().toISOString().split('T')[0], value: '', unit: '', reference_low: '', reference_high: '', notes: '' });
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  function rowBg(interp?: string) {
    if (interp === 'critical_low' || interp === 'critical_high') return 'bg-red-50';
    if (interp === 'low' || interp === 'high') return 'bg-amber-50';
    return '';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={filterPatient} onChange={e => setFilterPatient(e.target.value)} className={`${selectCls} w-44`}>
            <option value="">Tất cả bệnh nhân</option>
            {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`${selectCls} w-44`}>
            <option value="">Tất cả loại XN</option>
            {TEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Upload phiếu XN dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUploadDropdown(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <FileImage className="w-4 h-4" />
              Upload phiếu XN
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showUploadDropdown && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chọn bệnh nhân</p>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setShowUploadDropdown(false);
                        router.push(`/patients/${p.id}/lab-upload`);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 text-sm text-gray-800 flex items-center justify-between"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-400">{p.diagnosis}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nhập kết quả mới
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Ngày', 'Bệnh nhân', 'Tên xét nghiệm', 'Kết quả', 'Khoảng BT', 'Đánh giá', 'Ghi chú'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                <FlaskConical className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Chưa có kết quả xét nghiệm
              </td></tr>
            ) : filtered.map((l, i) => (
              <tr key={l.id} className={`border-b border-gray-100 last:border-0 ${rowBg(l.interpretation)} ${i % 2 === 0 && !rowBg(l.interpretation) ? 'bg-white' : ''}`}>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{fmtDate(l.tested_at)}</td>
                <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{patientName(patients, l.patient_id)}</td>
                <td className="px-3 py-2.5 text-gray-700">{l.test_name}</td>
                <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{l.value} {l.unit}</td>
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                  {l.reference_low !== undefined || l.reference_high !== undefined
                    ? `${l.reference_low ?? '—'} – ${l.reference_high ?? '—'}`
                    : '—'}
                </td>
                <td className="px-3 py-2.5">
                  {l.interpretation ? (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${INTERPRET_LABELS[l.interpretation]?.cls || 'bg-gray-100 text-gray-600'}`}>
                      {INTERPRET_LABELS[l.interpretation]?.label || l.interpretation}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2.5 text-gray-500 max-w-[150px] truncate">{l.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Nhập kết quả xét nghiệm mới" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Bệnh nhân *" error={errors.patient_id}>
              <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} className={selectCls}>
                <option value="">-- Chọn bệnh nhân --</option>
                {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name} ({p.diagnosis})</option>)}
              </select>
            </Field>
            <Field label="Loại xét nghiệm *" error={errors.test_type}>
              <select value={form.test_type} onChange={e => handleTypeChange(e.target.value)} className={selectCls}>
                <option value="">-- Chọn loại xét nghiệm --</option>
                {TEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Tên hiển thị xét nghiệm" error={errors.test_name}>
              <input value={form.test_name} onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))} className={inputCls} placeholder="VD: NH3 máu" />
            </Field>
            <Field label="Ngày xét nghiệm *" error={errors.tested_at}>
              <input type="date" value={form.tested_at} onChange={e => setForm(f => ({ ...f, tested_at: e.target.value }))} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kết quả *" error={errors.value}>
                <input type="number" step="any" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className={inputCls} placeholder="0.0" />
              </Field>
              <Field label="Đơn vị *" error={errors.unit}>
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inputCls} placeholder="µmol/L" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tham chiếu thấp">
                <input type="number" step="any" value={form.reference_low} onChange={e => setForm(f => ({ ...f, reference_low: e.target.value }))} className={inputCls} placeholder="—" />
              </Field>
              <Field label="Tham chiếu cao">
                <input type="number" step="any" value={form.reference_high} onChange={e => setForm(f => ({ ...f, reference_high: e.target.value }))} className={inputCls} placeholder="—" />
              </Field>
            </div>
            {form.value && form.reference_low || form.reference_high ? (
              <div className={`text-xs px-3 py-2 rounded-lg ${INTERPRET_LABELS[computeInterpretation(Number(form.value), form.reference_low, form.reference_high)]?.cls || 'bg-gray-100'}`}>
                Đánh giá tự động: <strong>{INTERPRET_LABELS[computeInterpretation(Number(form.value), form.reference_low, form.reference_high)]?.label}</strong>
              </div>
            ) : null}
            <Field label="Ghi chú">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} h-16 resize-none`} placeholder="Ghi chú thêm..." />
            </Field>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                {saving ? 'Đang lưu...' : 'Lưu kết quả'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: Lịch khám ───────────────────────────────────────────────────────────

function AppointmentsTab({ patients, appointments, onRefresh }: { patients: Patient[]; appointments: Appointment[]; onRefresh: () => void }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    patient_id: '', scheduled_at: '', type: 'routine',
    doctor: '', department: 'Phòng khám Chuyển hóa', notes: '',
  });

  const filtered = appointments.filter(a => {
    if (filterStatus === 'upcoming') return a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date();
    if (filterStatus === 'past') return new Date(a.scheduled_at) < new Date();
    return true;
  }).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  function validate() {
    const e: Record<string, string> = {};
    if (!form.patient_id) e.patient_id = 'Vui lòng chọn bệnh nhân';
    if (!form.scheduled_at) e.scheduled_at = 'Vui lòng chọn ngày giờ khám';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, patient_id: Number(form.patient_id) }),
      });
      setShowModal(false);
      setForm({ patient_id: '', scheduled_at: '', type: 'routine', doctor: '', department: 'Phòng khám Chuyển hóa', notes: '' });
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    setUpdating(id);
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onRefresh();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[{ v: 'all', l: 'Tất cả' }, { v: 'upcoming', l: 'Sắp tới' }, { v: 'past', l: 'Đã qua' }].map(opt => (
            <button key={opt.v} onClick={() => setFilterStatus(opt.v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === opt.v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
              {opt.l}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Đặt lịch mới
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Ngày giờ', 'Bệnh nhân', 'Loại khám', 'Bác sĩ', 'Trạng thái', 'Thao tác'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Không có lịch khám
              </td></tr>
            ) : filtered.map((a, i) => (
              <tr key={a.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{fmtDateTime(a.scheduled_at)}</td>
                <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{patientName(patients, a.patient_id)}</td>
                <td className="px-3 py-2.5 text-gray-700">{APPT_TYPES.find(t => t.value === a.type)?.label || a.type}</td>
                <td className="px-3 py-2.5 text-gray-600">{a.doctor || '—'}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${APPT_STATUS_LABELS[a.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                    {APPT_STATUS_LABELS[a.status]?.label || a.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {a.status === 'scheduled' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateStatus(a.id, 'completed')}
                        disabled={updating === a.id}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        {updating === a.id ? '...' : 'Đã khám'}
                      </button>
                      <button
                        onClick={() => updateStatus(a.id, 'cancelled')}
                        disabled={updating === a.id}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Đặt lịch khám mới" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Bệnh nhân *" error={errors.patient_id}>
              <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} className={selectCls}>
                <option value="">-- Chọn bệnh nhân --</option>
                {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name} ({p.diagnosis})</option>)}
              </select>
            </Field>
            <Field label="Ngày giờ khám *" error={errors.scheduled_at}>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Loại khám">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={selectCls}>
                {APPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Bác sĩ phụ trách">
              <input value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} className={inputCls} placeholder="BS. Hiếu Phúc" />
            </Field>
            <Field label="Khoa / Phòng">
              <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Ghi chú">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} h-16 resize-none`} placeholder="Ghi chú thêm..." />
            </Field>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Đang lưu...' : 'Đặt lịch'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: Chế độ ăn ───────────────────────────────────────────────────────────

function DietaryTab({ patients, prescriptions, onRefresh }: { patients: Patient[]; prescriptions: DietaryPrescription[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    patient_id: '', prescribed_at: new Date().toISOString().split('T')[0],
    prescribed_by: '', protein_g_per_kg: '', formula_name: '',
    formula_ml_per_day: '', special_formula: '', notes: '',
    additional_supplements: [] as string[], restrictions: [] as string[],
  });

  const selectedPatient = patients.find(p => String(p.id) === form.patient_id);
  const totalProtein = selectedPatient && form.protein_g_per_kg
    ? (Number(form.protein_g_per_kg) * selectedPatient.weight_kg).toFixed(1)
    : '';

  function validate() {
    const e: Record<string, string> = {};
    if (!form.patient_id) e.patient_id = 'Vui lòng chọn bệnh nhân';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await fetch('/api/dietary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          patient_id: Number(form.patient_id),
          protein_g_per_kg: form.protein_g_per_kg ? Number(form.protein_g_per_kg) : undefined,
          protein_g_total: totalProtein ? Number(totalProtein) : undefined,
          formula_ml_per_day: form.formula_ml_per_day ? Number(form.formula_ml_per_day) : undefined,
        }),
      });
      setShowModal(false);
      setForm({ patient_id: '', prescribed_at: new Date().toISOString().split('T')[0], prescribed_by: '', protein_g_per_kg: '', formula_name: '', formula_ml_per_day: '', special_formula: '', notes: '', additional_supplements: [], restrictions: [] });
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: number) {
    setDeactivating(id);
    try {
      await fetch(`/api/dietary/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: 0 }),
      });
      onRefresh();
    } finally {
      setDeactivating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{prescriptions.length} đơn chế độ ăn đang hoạt động</p>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Kê chế độ ăn mới
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Bệnh nhân', 'Đạm (g/kg)', 'Công thức', 'Liều (ml/ngày)', 'Bổ sung', 'Ngày kê', 'Bác sĩ', ''].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prescriptions.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                <Salad className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Chưa có đơn chế độ ăn
              </td></tr>
            ) : prescriptions.map((p, i) => (
              <tr key={p.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{patientName(patients, p.patient_id)}</td>
                <td className="px-3 py-2.5 text-gray-700">{p.protein_g_per_kg ?? '—'}</td>
                <td className="px-3 py-2.5 text-gray-700 max-w-[140px] truncate" title={p.formula_name}>{p.formula_name || '—'}</td>
                <td className="px-3 py-2.5 text-gray-700">{p.formula_ml_per_day ?? '—'}</td>
                <td className="px-3 py-2.5">
                  {p.additional_supplements.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.additional_supplements.slice(0, 2).map(s => (
                        <span key={s} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{s.split(' ')[0]}</span>
                      ))}
                      {p.additional_supplements.length > 2 && <span className="text-xs text-gray-400">+{p.additional_supplements.length - 2}</span>}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(p.prescribed_at)}</td>
                <td className="px-3 py-2.5 text-gray-600">{p.prescribed_by || '—'}</td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => handleDeactivate(p.id)}
                    disabled={deactivating === p.id}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deactivating === p.id ? '...' : 'Ngừng'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Kê chế độ ăn mới" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Bệnh nhân *" error={errors.patient_id}>
              <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} className={selectCls}>
                <option value="">-- Chọn bệnh nhân --</option>
                {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name} — {p.weight_kg}kg ({p.diagnosis})</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Đạm (g/kg/ngày)">
                <input type="number" step="0.1" value={form.protein_g_per_kg} onChange={e => setForm(f => ({ ...f, protein_g_per_kg: e.target.value }))} className={inputCls} placeholder="1.2" />
              </Field>
              <Field label="Tổng đạm (g/ngày)">
                <input readOnly value={totalProtein ? `${totalProtein} g` : '—'} className={`${inputCls} bg-gray-50`} />
              </Field>
            </div>
            <Field label="Tên công thức đặc trị">
              <input value={form.formula_name} onChange={e => setForm(f => ({ ...f, formula_name: e.target.value }))} className={inputCls} placeholder="VD: UCD Anamix Junior" />
            </Field>
            <Field label="Thể tích công thức (ml/ngày)">
              <input type="number" value={form.formula_ml_per_day} onChange={e => setForm(f => ({ ...f, formula_ml_per_day: e.target.value }))} className={inputCls} placeholder="400" />
            </Field>
            <Field label="Bổ sung thêm (nhập rồi Enter)">
              <TagInput tags={form.additional_supplements} onChange={v => setForm(f => ({ ...f, additional_supplements: v }))} placeholder="VD: L-Carnitine 100mg..." />
            </Field>
            <Field label="Thực phẩm hạn chế (nhập rồi Enter)">
              <TagInput tags={form.restrictions} onChange={v => setForm(f => ({ ...f, restrictions: v }))} placeholder="VD: Thịt đỏ..." />
            </Field>
            <Field label="Ngày kê">
              <input type="date" value={form.prescribed_at} onChange={e => setForm(f => ({ ...f, prescribed_at: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Bác sĩ kê">
              <input value={form.prescribed_by} onChange={e => setForm(f => ({ ...f, prescribed_by: e.target.value }))} className={inputCls} placeholder="BS. Hiếu Phúc" />
            </Field>
            <Field label="Ghi chú">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} h-20 resize-none`} placeholder="Ghi chú thêm về chế độ ăn..." />
            </Field>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Đang lưu...' : 'Lưu đơn chế độ ăn'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: Thuốc ───────────────────────────────────────────────────────────────

function MedicationsTab({ patients, medications, onRefresh }: { patients: Patient[]; medications: Medication[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stopping, setStopping] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    patient_id: '', drug_name: '', dose_mg_per_kg: '',
    frequency: '', route: 'uống', indication: '',
    start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '',
  });

  const selectedPatient = patients.find(p => String(p.id) === form.patient_id);
  const totalDose = selectedPatient && form.dose_mg_per_kg
    ? (Number(form.dose_mg_per_kg) * selectedPatient.weight_kg).toFixed(1)
    : '';

  function validate() {
    const e: Record<string, string> = {};
    if (!form.patient_id) e.patient_id = 'Vui lòng chọn bệnh nhân';
    if (!form.drug_name) e.drug_name = 'Vui lòng nhập tên thuốc';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          patient_id: Number(form.patient_id),
          dose_mg_per_kg: form.dose_mg_per_kg ? Number(form.dose_mg_per_kg) : undefined,
          dose_total_mg: totalDose ? Number(totalDose) : undefined,
        }),
      });
      setShowModal(false);
      setForm({ patient_id: '', drug_name: '', dose_mg_per_kg: '', frequency: '', route: 'uống', indication: '', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' });
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStop(id: number) {
    setStopping(id);
    try {
      await fetch(`/api/medications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: 0, end_date: new Date().toISOString().split('T')[0] }),
      });
      onRefresh();
    } finally {
      setStopping(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{medications.length} thuốc đang sử dụng</p>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Kê thuốc mới
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Bệnh nhân', 'Thuốc', 'Liều (mg/kg)', 'Tổng liều', 'Tần suất', 'Đường dùng', 'Chỉ định', 'Bắt đầu', ''].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {medications.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                <Pill className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Chưa có thuốc được kê
              </td></tr>
            ) : medications.map((m, i) => (
              <tr key={m.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{patientName(patients, m.patient_id)}</td>
                <td className="px-3 py-2.5 text-gray-900 font-medium max-w-[160px] truncate" title={m.drug_name}>{m.drug_name}</td>
                <td className="px-3 py-2.5 text-gray-700">{m.dose_mg_per_kg ?? '—'}</td>
                <td className="px-3 py-2.5 text-gray-700">{m.dose_total_mg ? `${m.dose_total_mg.toFixed(0)} mg` : '—'}</td>
                <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{m.frequency || '—'}</td>
                <td className="px-3 py-2.5">
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{m.route || 'uống'}</span>
                </td>
                <td className="px-3 py-2.5 text-gray-600 max-w-[140px] truncate" title={m.indication}>{m.indication || '—'}</td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{m.start_date ? fmtDate(m.start_date) : '—'}</td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => handleStop(m.id)}
                    disabled={stopping === m.id}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {stopping === m.id ? '...' : 'Ngừng'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Kê thuốc mới" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Bệnh nhân *" error={errors.patient_id}>
              <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} className={selectCls}>
                <option value="">-- Chọn bệnh nhân --</option>
                {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name} — {p.weight_kg}kg ({p.diagnosis})</option>)}
              </select>
            </Field>
            <Field label="Tên thuốc *" error={errors.drug_name}>
              <input value={form.drug_name} onChange={e => setForm(f => ({ ...f, drug_name: e.target.value }))} className={inputCls} placeholder="VD: Sodium Benzoate" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Liều (mg/kg)">
                <input type="number" step="any" value={form.dose_mg_per_kg} onChange={e => setForm(f => ({ ...f, dose_mg_per_kg: e.target.value }))} className={inputCls} placeholder="100" />
              </Field>
              <Field label="Tổng liều tự tính">
                <input readOnly value={totalDose ? `${totalDose} mg` : '—'} className={`${inputCls} bg-gray-50`} />
              </Field>
            </div>
            <Field label="Tần suất dùng">
              <input value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className={inputCls} placeholder="VD: 3 lần/ngày" />
            </Field>
            <Field label="Đường dùng">
              <select value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))} className={selectCls}>
                {ROUTE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Chỉ định">
              <input value={form.indication} onChange={e => setForm(f => ({ ...f, indication: e.target.value }))} className={inputCls} placeholder="VD: Thải NH3 dư thừa" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngày bắt đầu">
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Ngày kết thúc">
                <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inputCls} />
              </Field>
            </div>
            <Field label="Ghi chú">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} h-16 resize-none`} placeholder="Ghi chú thêm..." />
            </Field>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Đang lưu...' : 'Kê thuốc'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: Báo cáo ─────────────────────────────────────────────────────────────

function ReportsTab({ patients, flags }: { patients: Patient[]; flags: FlagEvent[] }) {
  const diagCounts = patients.reduce((acc, p) => { acc[p.diagnosis] = (acc[p.diagnosis] || 0) + 1; return acc; }, {} as Record<string, number>);
  const diagColors: Record<string, string> = { UCD: 'bg-blue-500', MSUD: 'bg-purple-500', OA: 'bg-orange-500', FAOD: 'bg-teal-500' };
  const total = patients.length || 1;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const recentFlags = flags.filter(f => new Date(f.started_at) >= thirtyDaysAgo);
  const redThisMonth = recentFlags.filter(f => f.level === 'RED').length;
  const yellowThisMonth = recentFlags.filter(f => f.level === 'YELLOW').length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tổng bệnh nhân', value: patients.length, cls: 'text-blue-700' },
          { label: 'Số lần YELLOW (30 ngày)', value: yellowThisMonth, cls: 'text-amber-700' },
          { label: 'Số lần RED (30 ngày)', value: redThisMonth, cls: 'text-red-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-3xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Diagnosis distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Phân bố theo chẩn đoán</h3>
        {patients.length === 0 ? (
          <p className="text-gray-400 text-sm">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(diagCounts).map(([diag, count]) => (
              <div key={diag} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-700 w-12">{diag}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${diagColors[diag] || 'bg-gray-400'} transition-all`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-16">{count} BN ({Math.round((count / total) * 100)}%)</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">{DIAGNOSIS_LABELS.UCD} · {DIAGNOSIS_LABELS.MSUD} · {DIAGNOSIS_LABELS.OA} · {DIAGNOSIS_LABELS.FAOD}</p>
      </div>

      {/* Patient summary table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Tóm tắt theo bệnh nhân</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Bệnh nhân', 'Chẩn đoán', 'RED (30 ngày)', 'YELLOW (30 ngày)', 'Trạng thái hiện tại'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Chưa có dữ liệu</td></tr>
              ) : patients.map((p, i) => {
                const pFlags = recentFlags.filter(f => f.patient_id === p.id);
                const redCount = pFlags.filter(f => f.level === 'RED').length;
                const yellowCount = pFlags.filter(f => f.level === 'YELLOW').length;
                const currentFlag = flags.find(f => f.patient_id === p.id);
                const status = currentFlag?.level || 'GREEN';
                return (
                  <tr key={p.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      <Link href={`/patients/${p.id}`} className="hover:text-blue-600">{p.name}</Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{p.diagnosis}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {redCount > 0 ? (
                        <span className="text-sm font-bold text-red-700">{redCount}</span>
                      ) : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {yellowCount > 0 ? (
                        <span className="text-sm font-bold text-amber-600">{yellowCount}</span>
                      ) : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${status === 'RED' ? 'bg-red-100 text-red-700' : status === 'YELLOW' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {status === 'RED' ? 'Cảnh báo ĐỎ' : status === 'YELLOW' ? 'Theo dõi VÀNG' : 'Bình thường'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <div className="relative group">
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed border border-gray-200"
          >
            <BarChart3 className="w-4 h-4" />
            Xuất báo cáo PDF
          </button>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Tính năng đang phát triển
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'labs' | 'appointments' | 'dietary' | 'medications' | 'reports';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Tổng quan', icon: <Activity className="w-4 h-4" /> },
  { id: 'labs', label: 'Xét nghiệm', icon: <FlaskConical className="w-4 h-4" /> },
  { id: 'appointments', label: 'Lịch khám', icon: <Calendar className="w-4 h-4" /> },
  { id: 'dietary', label: 'Chế độ ăn', icon: <Salad className="w-4 h-4" /> },
  { id: 'medications', label: 'Thuốc', icon: <Pill className="w-4 h-4" /> },
  { id: 'reports', label: 'Báo cáo', icon: <BarChart3 className="w-4 h-4" /> },
];

export default function ClinicPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [flags, setFlags] = useState<FlagEvent[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<DietaryPrescription[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, fRes, lRes, aRes, dRes, mRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/flags'),
        fetch('/api/lab-results'),
        fetch('/api/appointments'),
        fetch('/api/dietary'),
        fetch('/api/medications'),
      ]);
      const [p, f, l, a, d, m] = await Promise.all([pRes.json(), fRes.json(), lRes.json(), aRes.json(), dRes.json(), mRes.json()]);
      setPatients(Array.isArray(p) ? p : []);
      setFlags(Array.isArray(f) ? f : []);
      setLabResults(Array.isArray(l) ? l : []);
      setAppointments(Array.isArray(a) ? a : []);
      setPrescriptions(Array.isArray(d) ? d : []);
      setMedications(Array.isArray(m) ? m : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Phòng khám Chuyển hóa Bẩm sinh</h1>
              <p className="text-xs text-gray-500">Bệnh viện Nhi Đồng 1</p>
            </div>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-500">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab patients={patients} flags={flags} appointments={appointments} labResults={labResults} />
            )}
            {activeTab === 'labs' && (
              <LabTab patients={patients} labResults={labResults} onRefresh={loadAll} />
            )}
            {activeTab === 'appointments' && (
              <AppointmentsTab patients={patients} appointments={appointments} onRefresh={loadAll} />
            )}
            {activeTab === 'dietary' && (
              <DietaryTab patients={patients} prescriptions={prescriptions} onRefresh={loadAll} />
            )}
            {activeTab === 'medications' && (
              <MedicationsTab patients={patients} medications={medications} onRefresh={loadAll} />
            )}
            {activeTab === 'reports' && (
              <ReportsTab patients={patients} flags={flags} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
