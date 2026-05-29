'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FlagBadge } from '@/components/FlagBadge';
import { GlucoseCalculatorWidget } from '@/components/GlucoseCalculatorWidget';
import {
  ArrowLeft, ClipboardList, BookOpen, Calculator, Phone,
  Calendar, Weight, Pill, Clock, ChevronRight, AlertTriangle, Trash2, FileImage,
} from 'lucide-react';

interface Patient {
  id: number;
  name: string;
  dob_iso: string;
  weight_kg: number;
  diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
  subtype?: string;
  prescribed_meds: string[];
  protein_allowance_g_per_kg?: number;
  formula_allowance_ml?: number;
  emergency_contacts: Array<{ name: string; phone: string; relation: string }>;
  created_at: string;
}

interface SymptomEntry {
  id: number;
  patient_id: number;
  timestamp: string;
  symptoms: string[];
  vital_signs: { glucose?: number; ketone?: string; heart_rate?: number; temperature?: number };
  trigger_factors: string[];
  adherence_score?: number;
  computed_flag: 'RED' | 'YELLOW' | 'GREEN';
  reasoning_codes: string[];
}

interface FlagEvent {
  id: number;
  patient_id: number;
  started_at: string;
  level: 'RED' | 'YELLOW' | 'GREEN';
}

const diagnosisLabels: Record<string, string> = {
  UCD: 'Rối loạn chu trình Urea',
  MSUD: 'Bệnh Siro Phong',
  OA: 'Acid Hữu Cơ Niệu',
  FAOD: 'Rối loạn Oxy hóa Axit Béo',
};

function getAge(dob_iso: string): string {
  const dob = new Date(dob_iso);
  const now = new Date();
  const totalMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (totalMonths < 12) return `${totalMonths} tháng tuổi`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y} tuổi ${m} tháng` : `${y} tuổi`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function timeSince(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [activeFlag, setActiveFlag] = useState<FlagEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalc, setShowCalc] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pRes, eRes, fRes] = await Promise.all([
          fetch(`/api/patients/${id}`),
          fetch(`/api/checkin/${id}`),
          fetch('/api/flags'),
        ]);
        if (!pRes.ok) { router.push('/'); return; }
        const pData = await pRes.json();
        const eData = await eRes.json();
        const fData: FlagEvent[] = await fRes.json();
        setPatient(pData);
        setEntries(Array.isArray(eData) ? eData.slice(0, 5) : []);
        setActiveFlag(fData.find(f => f.patient_id === Number(id)) || null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  async function handleDelete() {
    if (!confirm('Bạn có chắc muốn xóa bệnh nhân này?')) return;
    setDeleting(true);
    await fetch(`/api/patients/${id}`, { method: 'DELETE' });
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!patient) return null;

  const currentFlag = activeFlag?.level || 'GREEN';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b shadow-sm ${
        currentFlag === 'RED' ? 'bg-red-50 border-red-200' :
        currentFlag === 'YELLOW' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-black/5 text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">{patient.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{patient.diagnosis}</span>
                <FlagBadge flag={currentFlag} size="sm" />
              </div>
            </div>
          </div>
          <button onClick={handleDelete} disabled={deleting} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {currentFlag === 'RED' && (
        <div className="bg-red-500 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-white animate-pulse flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">CẢNH BÁO ĐỎ - CẦN XỬ LÝ NGAY</p>
            <p className="text-red-100 text-xs">Đã phát sinh {activeFlag ? timeSince(activeFlag.started_at) : ''}. Liên hệ NVYT hoặc đến cơ sở y tế.</p>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Patient Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide text-gray-500">Thông tin bệnh nhân</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Ngày sinh</p>
                <p className="text-sm font-medium">{new Date(patient.dob_iso).toLocaleDateString('vi-VN')}</p>
                <p className="text-xs text-blue-600">{getAge(patient.dob_iso)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Cân nặng</p>
                <p className="text-sm font-medium">{patient.weight_kg} kg</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-1">Chẩn đoán</p>
            <p className="text-sm font-semibold text-blue-700">{patient.diagnosis} — {diagnosisLabels[patient.diagnosis]}</p>
            {patient.subtype && <p className="text-xs text-gray-500 mt-0.5">{patient.subtype}</p>}
          </div>
          {patient.protein_allowance_g_per_kg && (
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Khẩu phần đạm</p>
                <p className="font-medium">{patient.protein_allowance_g_per_kg} g/kg/ngày</p>
              </div>
              {patient.formula_allowance_ml && (
                <div>
                  <p className="text-xs text-gray-500">Công thức đặc biệt</p>
                  <p className="font-medium">{patient.formula_allowance_ml} ml/ngày</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3">
          <Link
            href={`/patients/${id}/checkin`}
            className="flex items-center justify-between bg-blue-600 text-white rounded-xl px-4 py-3.5 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5" />
              <div>
                <p className="font-bold">Nhập triệu chứng mới</p>
                <p className="text-xs text-blue-200">Ghi nhận tình trạng hôm nay</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </Link>

          <Link
            href={`/patients/${id}/lab-upload`}
            className="flex items-center justify-between bg-white border border-blue-200 rounded-xl px-4 py-3.5 hover:bg-blue-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <FileImage className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-bold text-gray-800">Upload phiếu XN</p>
                <p className="text-xs text-gray-500">Scan & lưu kết quả xét nghiệm</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href={`/patients/${id}/protocol`}
            className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-bold text-gray-800">Xem Sick-Day Protocol</p>
                <p className="text-xs text-gray-500">Hướng dẫn xử trí khi bệnh</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <button
            onClick={() => setShowCalc(!showCalc)}
            className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:bg-gray-50 transition-colors shadow-sm w-full text-left"
          >
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-bold text-gray-800">Tính liều Glucose Polymer</p>
                <p className="text-xs text-gray-500">Liều theo cân nặng và tuổi</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showCalc ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Glucose Calculator */}
        {showCalc && (
          <GlucoseCalculatorWidget
            dob_iso={patient.dob_iso}
            weight_kg={patient.weight_kg}
            patientName={patient.name}
          />
        )}

        {/* Medications */}
        {patient.prescribed_meds.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Pill className="w-4 h-4 text-blue-500" />
              <h2 className="font-bold text-gray-800">Thuốc đang dùng</h2>
            </div>
            <ul className="space-y-2">
              {patient.prescribed_meds.map((med, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-gray-700">{med}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Emergency Contacts */}
        {patient.emergency_contacts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-red-500" />
              <h2 className="font-bold text-gray-800">Liên hệ khẩn cấp</h2>
            </div>
            <div className="space-y-2">
              {patient.emergency_contacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.relation}</p>
                  </div>
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">
                    <Phone className="w-3.5 h-3.5" />
                    {c.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Entries */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <h2 className="font-bold text-gray-800">Lịch sử gần đây</h2>
          </div>
          {entries.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Chưa có lần ghi nhận nào trong 48 giờ qua</p>
          ) : (
            <div className="space-y-3">
              {entries.slice(0, 3).map((entry) => (
                <div key={entry.id} className={`border rounded-lg p-3 ${
                  entry.computed_flag === 'RED' ? 'border-red-200 bg-red-50' :
                  entry.computed_flag === 'YELLOW' ? 'border-amber-200 bg-amber-50' :
                  'border-gray-100 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <FlagBadge flag={entry.computed_flag} size="sm" />
                    <span className="text-xs text-gray-500">{formatTime(entry.timestamp)}</span>
                  </div>
                  {entry.symptoms.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Triệu chứng: {entry.symptoms.slice(0, 3).join(', ')}{entry.symptoms.length > 3 ? '...' : ''}
                    </p>
                  )}
                  {entry.reasoning_codes.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{entry.reasoning_codes[0]}</p>
                  )}
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                    {entry.vital_signs.temperature && <span>Nhiệt độ: {entry.vital_signs.temperature}°C</span>}
                    {entry.vital_signs.glucose && <span>Đường huyết: {entry.vital_signs.glucose} mmol/L</span>}
                    {entry.vital_signs.ketone && <span>Ketone: {entry.vital_signs.ketone}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
