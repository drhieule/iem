'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, FileImage, CheckCircle, ChevronRight,
  AlertTriangle, FlaskConical, RotateCcw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'scanning' | 'review' | 'saved';

type ExtractedResult = {
  test_name: string;
  test_name_en: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string;
  flag: 'H' | 'L' | null;
  suggested_type: string;
  // UI state
  include: boolean;
  edited_value: string;
};

interface Patient {
  id: number;
  name: string;
  diagnosis: string;
}

const TEST_TYPE_OPTIONS = [
  { value: 'glucose', label: 'Đường huyết' },
  { value: 'NH3', label: 'NH3' },
  { value: 'leucine', label: 'Leucine' },
  { value: 'isoleucine', label: 'Isoleucine' },
  { value: 'valine', label: 'Valine' },
  { value: 'CBC', label: 'CBC' },
  { value: 'LFT', label: 'Gan (LFT)' },
  { value: 'kidney', label: 'Thận' },
  { value: 'CK', label: 'CK' },
  { value: 'lactate', label: 'Lactate' },
  { value: 'plasma_amino_acids', label: 'Amino acid HT' },
  { value: 'other', label: 'Khác' },
];

const SCAN_MESSAGES = [
  'Đang nhận dạng phiếu xét nghiệm...',
  'Đang trích xuất chỉ số...',
  'Đang so sánh giá trị tham chiếu...',
  'Đang hoàn thiện kết quả...',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInterpretation(
  value: number,
  refLow: number | null,
  refHigh: number | null,
): string {
  if (refHigh !== null && value > refHigh * 2) return 'critical_high';
  if (refHigh !== null && value > refHigh) return 'high';
  if (refLow !== null && value < refLow * 0.5) return 'critical_low';
  if (refLow !== null && value < refLow) return 'low';
  return 'normal';
}

function getRowStyle(result: ExtractedResult): string {
  const val = Number(result.edited_value) || result.value;
  if (result.ref_high !== null && val > result.ref_high) return 'bg-red-50';
  if (result.ref_low !== null && val < result.ref_low) return 'bg-amber-50';
  if (result.flag === 'H') return 'bg-red-50';
  if (result.flag === 'L') return 'bg-amber-50';
  return 'bg-white';
}

function getBadge(result: ExtractedResult): { label: string; cls: string } {
  const val = Number(result.edited_value) || result.value;
  if (result.ref_high !== null && val > result.ref_high * 2) {
    return { label: 'NGUY HIỂM CAO', cls: 'bg-red-100 text-red-700 font-bold' };
  }
  if (result.ref_high !== null && val > result.ref_high) {
    return { label: 'CAO', cls: 'bg-red-100 text-red-700' };
  }
  if (result.ref_low !== null && val < result.ref_low * 0.5) {
    return { label: 'NGUY HIỂM THẤP', cls: 'bg-red-100 text-red-700 font-bold' };
  }
  if (result.ref_low !== null && val < result.ref_low) {
    return { label: 'THẤP', cls: 'bg-amber-100 text-amber-700' };
  }
  if (result.flag === 'H' && result.ref_high === null) {
    return { label: 'CAO', cls: 'bg-red-100 text-red-700' };
  }
  if (result.flag === 'L' && result.ref_low === null) {
    return { label: 'THẤP', cls: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Bình thường', cls: 'bg-green-100 text-green-700' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabUploadPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [step, setStep] = useState<Step>('upload');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileSizeWarning, setFileSizeWarning] = useState(false);
  const [scanMessage, setScanMessage] = useState(0);
  const [results, setResults] = useState<ExtractedResult[]>([]);
  const [labDate, setLabDate] = useState<string | null>(null);
  const [labName, setLabName] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedResults, setSavedResults] = useState<ExtractedResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load patient
  useEffect(() => {
    fetch(`/api/patients/${patientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPatient(data); });
  }, [patientId]);

  // Scan message cycling
  useEffect(() => {
    if (step !== 'scanning') return;
    const interval = setInterval(() => {
      setScanMessage(m => (m + 1) % SCAN_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [step]);

  function selectFile(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      setFileSizeWarning(true);
      return;
    }
    setFileSizeWarning(false);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
  }

  async function handleAnalyze() {
    if (!file) return;
    setExtractError(null);
    setStep('scanning');
    setScanMessage(0);

    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('patient_id', patientId);

      const res = await fetch('/api/lab-extract', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok || data.error) {
        setExtractError(data.error || 'Lỗi phân tích phiếu xét nghiệm');
        setStep('upload');
        return;
      }

      setLabDate(data.lab_date);
      setLabName(data.lab_name);

      const enriched: ExtractedResult[] = (data.results || []).map(
        (r: Omit<ExtractedResult, 'include' | 'edited_value'>) => ({
          ...r,
          include: true,
          edited_value: String(r.value),
        }),
      );

      setResults(enriched);
      setStep('review');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      setExtractError(`Lỗi: ${msg}`);
      setStep('upload');
    }
  }

  const allChecked = results.every(r => r.include);
  const checkedCount = results.filter(r => r.include).length;

  function toggleAll() {
    setResults(rs => rs.map(r => ({ ...r, include: !allChecked })));
  }

  function toggleOne(idx: number) {
    setResults(rs => rs.map((r, i) => i === idx ? { ...r, include: !r.include } : r));
  }

  function updateValue(idx: number, val: string) {
    setResults(rs => rs.map((r, i) => i === idx ? { ...r, edited_value: val } : r));
  }

  function updateType(idx: number, val: string) {
    setResults(rs => rs.map((r, i) => i === idx ? { ...r, suggested_type: val } : r));
  }

  async function handleSave() {
    const toSave = results.filter(r => r.include);
    if (toSave.length === 0) return;
    setSaving(true);

    const today = new Date().toISOString().split('T')[0];
    const testedAt = labDate || today;

    await Promise.all(
      toSave.map(r => {
        const val = Number(r.edited_value) || r.value;
        const interp = getInterpretation(val, r.ref_low, r.ref_high);
        return fetch('/api/lab-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: Number(patientId),
            tested_at: testedAt,
            test_type: r.suggested_type,
            test_name: r.test_name,
            value: val,
            unit: r.unit,
            reference_low: r.ref_low,
            reference_high: r.ref_high,
            interpretation: interp,
            notes: 'Nhập từ phiếu XN qua Claude Vision',
          }),
        });
      }),
    );

    setSavedResults(toSave);
    setSaving(false);
    setStep('saved');
  }

  function resetToUpload() {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResults([]);
    setLabDate(null);
    setLabName(null);
    setExtractError(null);
    setFileSizeWarning(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ─── Step indicator ──────────────────────────────────────────────────────────

  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'scanning', label: 'Scanning' },
    { key: 'review', label: 'Xem lại' },
    { key: 'saved', label: 'Đã lưu' },
  ];
  const stepIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/patients/${patientId}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">Upload phiếu xét nghiệm</h1>
            {patient && (
              <p className="text-xs text-gray-500">{patient.name} — {patient.diagnosis}</p>
            )}
          </div>
          <FlaskConical className="w-5 h-5 text-blue-500" />
        </div>

        {/* Step progress */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  i < stepIdx ? 'text-green-600' : i === stepIdx ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < stepIdx ? 'bg-green-100 text-green-600' :
                    i === stepIdx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < stepIdx ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < stepIdx ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            {extractError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Lỗi phân tích</p>
                  <p className="text-sm text-red-600 mt-0.5">{extractError}</p>
                </div>
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[220px] ${
                dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileInput}
              />

              {preview ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="max-h-48 max-w-full rounded-xl shadow-md object-contain" />
                  <p className="text-sm text-gray-600 font-medium">{file?.name}</p>
                  <p className="text-xs text-gray-400">{((file?.size || 0) / 1024).toFixed(0)} KB — Nhấn để đổi ảnh</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                    <FileImage className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-base font-semibold text-gray-700 text-center">Kéo thả phiếu xét nghiệm vào đây</p>
                  <p className="text-sm text-gray-500 mt-1">hoặc nhấn để chọn file</p>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    JPEG, PNG, WebP · PDF (chỉ đọc trang đầu)
                  </p>
                </>
              )}
            </div>

            {fileSizeWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700">Ảnh quá lớn, vui lòng chọn ảnh dưới 5MB</p>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!file}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FlaskConical className="w-5 h-5" />
              Phân tích phiếu xét nghiệm
            </button>
          </div>
        )}

        {/* ── STEP 2: Scanning ── */}
        {step === 'scanning' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Image with scan animation */}
              <div className="relative flex-shrink-0 w-full sm:w-1/2 rounded-2xl overflow-hidden shadow-lg bg-gray-900">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="scanning" className="w-full object-contain opacity-70" />
                )}
                {/* Scan overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute left-0 right-0 h-1 bg-blue-400 shadow-[0_0_16px_4px_rgba(96,165,250,0.8)]"
                    style={{
                      animation: 'scanLine 2s ease-in-out infinite',
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-blue-900/20" />
                </div>
                <style>{`
                  @keyframes scanLine {
                    0%   { top: 0%; }
                    50%  { top: 96%; }
                    100% { top: 0%; }
                  }
                `}</style>
              </div>

              {/* Status */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
                {/* Spinner */}
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FlaskConical className="w-7 h-7 text-blue-500" />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-bold text-blue-700">Claude Vision đang phân tích...</p>
                  <p className="text-sm text-gray-500 mt-2 min-h-[1.5em] transition-all duration-500">
                    {SCAN_MESSAGES[scanMessage]}
                  </p>
                </div>

                <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm cursor-not-allowed">
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Meta info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <h2 className="font-bold text-gray-900 text-base">Xem lại kết quả trích xuất</h2>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                  {labName && <span>Phòng XN: <strong className="text-gray-700">{labName}</strong></span>}
                  {labDate && <span>Ngày XN: <strong className="text-gray-700">{new Date(labDate).toLocaleDateString('vi-VN')}</strong></span>}
                </div>
              </div>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="phiếu" className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              <p className="text-sm text-gray-500">
                Đã chọn <strong>{checkedCount}</strong>/{results.length} chỉ số
              </p>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-8 px-3 py-2.5"></th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600">Tên xét nghiệm</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Kết quả</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Khoảng TK</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600">Đánh giá</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600">Phân loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, idx) => {
                      const badge = getBadge(r);
                      const rowCls = getRowStyle(r);
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-gray-100 last:border-0 ${rowCls} ${!r.include ? 'opacity-50' : ''}`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={r.include}
                              onChange={() => toggleOne(idx)}
                              className="w-4 h-4 accent-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-gray-900">{r.test_name}</p>
                            <p className="text-xs text-gray-400">{r.test_name_en}</p>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={r.edited_value}
                                onChange={e => updateValue(idx, e.target.value)}
                                className="w-20 border border-gray-200 rounded px-1.5 py-0.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                              <span className="text-xs text-gray-500">{r.unit}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                            {r.ref_text || (r.ref_low !== null || r.ref_high !== null
                              ? `${r.ref_low ?? '—'} – ${r.ref_high ?? '—'}`
                              : '—')}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={r.suggested_type}
                              onChange={e => updateType(idx, e.target.value)}
                              className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                            >
                              {TEST_TYPE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Vui lòng kiểm tra lại các giá trị bất thường trước khi lưu. Claude Vision có thể nhận dạng sai — hãy chỉnh sửa nếu cần.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetToUpload}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </button>
              <button
                onClick={handleSave}
                disabled={checkedCount === 0 || saving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Lưu {checkedCount} chỉ số đã chọn
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Saved ── */}
        {step === 'saved' && (
          <div className="space-y-6">
            {/* Success animation */}
            <div className="flex flex-col items-center py-8 gap-4">
              <div
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
                style={{ animation: 'scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both' }}
              >
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <style>{`
                @keyframes scaleIn {
                  from { transform: scale(0); opacity: 0; }
                  to   { transform: scale(1); opacity: 1; }
                }
              `}</style>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">Đã lưu thành công!</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Đã lưu {savedResults.length} chỉ số xét nghiệm vào hồ sơ{' '}
                  <strong>{patient?.name}</strong>
                </p>
              </div>
            </div>

            {/* Saved list */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Các chỉ số đã lưu</p>
              </div>
              <div className="divide-y divide-gray-100">
                {savedResults.map((r, idx) => {
                  const badge = getBadge(r);
                  return (
                    <div key={idx} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.test_name}</p>
                        <p className="text-xs text-gray-400">{r.test_name_en}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {Number(r.edited_value) || r.value} {r.unit}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/patients/${patientId}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
              >
                Xem hồ sơ bệnh nhân
                <ChevronRight className="w-4 h-4" />
              </Link>
              <button
                onClick={resetToUpload}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Upload thêm phiếu
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
