'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Save } from 'lucide-react';

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

const diagnosisOptions = [
  { value: 'UCD', label: 'UCD - Rối loạn chu trình Urea' },
  { value: 'MSUD', label: 'MSUD - Bệnh Siro Phong' },
  { value: 'OA', label: 'OA - Acid Hữu Cơ Niệu (IVA/PA/MMA)' },
  { value: 'FAOD', label: 'FAOD - Rối loạn Oxy hóa Axit Béo' },
];

const subtypeOptions: Record<string, string[]> = {
  UCD: ['OTC Deficiency', 'CPS1 Deficiency', 'ASS1 Deficiency (Citrullinemia type I)', 'ASL Deficiency (Argininosuccinic aciduria)', 'ARG1 Deficiency (Argininemia)', 'NAGS Deficiency'],
  MSUD: ['Classic MSUD', 'Intermediate MSUD', 'Intermittent MSUD', 'Thiamine-responsive MSUD'],
  OA: ['IVA (Isovaleric Acidemia)', 'PA (Propionic Acidemia)', 'MMA (Methylmalonyl-CoA Mutase Deficiency)', 'MMA (Methylmalonyl-CoA Epimerase Deficiency)'],
  FAOD: ['VLCAD (Very Long Chain Acyl-CoA Dehydrogenase Deficiency)', 'LCHAD (Long Chain 3-Hydroxy Acyl-CoA Dehydrogenase Deficiency)', 'TFP (Trifunctional Protein Deficiency)', 'MCAD (Medium Chain Acyl-CoA Dehydrogenase Deficiency)', 'SCAD (Short Chain Acyl-CoA Dehydrogenase Deficiency)', 'CUD (Carnitine Uptake Deficiency)', 'CPT1 Deficiency', 'CPT2 Deficiency'],
};

export default function NewPatientPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    dob_iso: '',
    weight_kg: '',
    diagnosis: '',
    subtype: '',
    protein_allowance_g_per_kg: '',
    formula_allowance_ml: '',
    prescribed_meds: [''],
    emergency_contacts: [{ name: '', phone: '', relation: 'Mẹ' }] as EmergencyContact[],
  });

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addMed() {
    setForm(prev => ({ ...prev, prescribed_meds: [...prev.prescribed_meds, ''] }));
  }

  function updateMed(idx: number, val: string) {
    setForm(prev => {
      const meds = [...prev.prescribed_meds];
      meds[idx] = val;
      return { ...prev, prescribed_meds: meds };
    });
  }

  function removeMed(idx: number) {
    setForm(prev => ({ ...prev, prescribed_meds: prev.prescribed_meds.filter((_, i) => i !== idx) }));
  }

  function addContact() {
    setForm(prev => ({ ...prev, emergency_contacts: [...prev.emergency_contacts, { name: '', phone: '', relation: '' }] }));
  }

  function updateContact(idx: number, field: keyof EmergencyContact, val: string) {
    setForm(prev => {
      const contacts = prev.emergency_contacts.map((c, i) => i === idx ? { ...c, [field]: val } : c);
      return { ...prev, emergency_contacts: contacts };
    });
  }

  function removeContact(idx: number) {
    setForm(prev => ({ ...prev, emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.dob_iso || !form.weight_kg || !form.diagnosis) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc (*)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          dob_iso: form.dob_iso,
          weight_kg: Number(form.weight_kg),
          diagnosis: form.diagnosis,
          subtype: form.subtype || undefined,
          prescribed_meds: form.prescribed_meds.filter(m => m.trim()),
          protein_allowance_g_per_kg: form.protein_allowance_g_per_kg ? Number(form.protein_allowance_g_per_kg) : undefined,
          formula_allowance_ml: form.formula_allowance_ml ? Number(form.formula_allowance_ml) : undefined,
          emergency_contacts: form.emergency_contacts.filter(c => c.name && c.phone),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Lỗi tạo bệnh nhân');
        return;
      }
      const patient = await res.json();
      router.push(`/patients/${patient.id}`);
    } catch (e) {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">Thêm bệnh nhân mới</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}

          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800">Thông tin cơ bản</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh *</label>
                <input
                  type="date"
                  value={form.dob_iso}
                  onChange={e => updateField('dob_iso', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cân nặng (kg) *</label>
                <input
                  type="number"
                  value={form.weight_kg}
                  onChange={e => updateField('weight_kg', e.target.value)}
                  placeholder="12.5"
                  min="0.5"
                  max="100"
                  step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chẩn đoán *</label>
              <select
                value={form.diagnosis}
                onChange={e => updateField('diagnosis', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="">-- Chọn chẩn đoán --</option>
                {diagnosisOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {form.diagnosis && subtypeOptions[form.diagnosis] && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phân nhóm</label>
                <select
                  value={form.subtype}
                  onChange={e => updateField('subtype', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Chọn phân nhóm --</option>
                  {subtypeOptions[form.diagnosis].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Dietary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800">Chế độ ăn & dinh dưỡng</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khẩu phần đạm (g/kg/ngày)</label>
                <input
                  type="number"
                  value={form.protein_allowance_g_per_kg}
                  onChange={e => updateField('protein_allowance_g_per_kg', e.target.value)}
                  placeholder="1.2"
                  min="0"
                  max="5"
                  step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lượng công thức (ml/ngày)</label>
                <input
                  type="number"
                  value={form.formula_allowance_ml}
                  onChange={e => updateField('formula_allowance_ml', e.target.value)}
                  placeholder="400"
                  min="0"
                  step="10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Medications */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800">Thuốc đang dùng</h2>
            <div className="space-y-2">
              {form.prescribed_meds.map((med, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={med}
                    onChange={e => updateMed(i, e.target.value)}
                    placeholder={`Thuốc ${i + 1} (vd: Sodium Benzoate 250mg/kg/ngày)`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {form.prescribed_meds.length > 1 && (
                    <button type="button" onClick={() => removeMed(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMed}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Thêm thuốc
            </button>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800">Liên hệ khẩn cấp</h2>
            <div className="space-y-3">
              {form.emergency_contacts.map((contact, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Liên hệ {i + 1}</span>
                    {form.emergency_contacts.length > 1 && (
                      <button type="button" onClick={() => removeContact(i)} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={contact.name}
                      onChange={e => updateContact(i, 'name', e.target.value)}
                      placeholder="Họ tên"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={e => updateContact(i, 'phone', e.target.value)}
                      placeholder="Số điện thoại"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <select
                    value={contact.relation}
                    onChange={e => updateContact(i, 'relation', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="Mẹ">Mẹ</option>
                    <option value="Ba">Ba</option>
                    <option value="Ông">Ông</option>
                    <option value="Bà">Bà</option>
                    <option value="Bác sĩ điều trị">Bác sĩ điều trị</option>
                    <option value="Người thân khác">Người thân khác</option>
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addContact}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Thêm liên hệ
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold text-base hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Đang lưu...' : 'Lưu bệnh nhân'}
          </button>
        </form>
      </main>
    </div>
  );
}
