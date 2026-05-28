'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FlagBadge } from '@/components/FlagBadge';
import { ArrowLeft, Send, AlertTriangle, CheckCircle2, Phone } from 'lucide-react';

interface Patient {
  id: number;
  name: string;
  dob_iso: string;
  weight_kg: number;
  diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
  subtype?: string;
  emergency_contacts: Array<{ name: string; phone: string; relation: string }>;
}

// Symptom checkbox groups
const symptomGroups = {
  neurological: {
    label: 'Triệu chứng thần kinh',
    color: 'red',
    symptoms: [
      { id: 'altered_consciousness', label: 'Li bì, lơ mơ, hôn mê', isRed: true },
      { id: 'seizure', label: 'Co giật', isRed: true },
      { id: 'apnea', label: 'Ngưng thở (apnea)', isRed: true },
      { id: 'opisthotonus_cycling_fencing', label: 'Cứng cong lưng, đạp đạp chân', isRed: true },
      { id: 'unequal_pupils', label: 'Đồng tử không đều', isRed: true },
      { id: 'irritable_sleepy', label: 'Kích thích, quấy khóc, ngủ nhiều bất thường', isRed: false },
      { id: 'mild_headache', label: 'Đau đầu nhẹ', isRed: false },
      { id: 'mild_hypertonia', label: 'Tăng trương lực nhẹ', isRed: false },
    ],
  },
  gastrointestinal: {
    label: 'Tiêu hóa',
    color: 'orange',
    symptoms: [
      { id: 'vomiting_continuous_4h', label: 'Nôn ói liên tục >4 giờ', isRed: true },
      { id: 'vomiting_1_2', label: 'Nôn ói 1-2 lần', isRed: false },
      { id: 'poor_intake_70pct_24h', label: 'Bỏ ăn/bú kém (<70% khẩu phần)', isRed: false },
      { id: 'poor_intake_70pct', label: 'Ăn kém (<70% khẩu phần)', isRed: false },
      { id: 'poor_feeding_newborn', label: 'Trẻ sơ sinh bú kém', isRed: true },
      { id: 'mild_diarrhea', label: 'Tiêu chảy nhẹ', isRed: false },
      { id: 'severe_dehydration', label: 'Mất nước nặng', isRed: true },
      { id: 'abdominal_pain', label: 'Đau bụng', isRed: false },
      { id: 'weight_loss', label: 'Sụt cân bất thường', isRed: false },
      { id: 'slow_weight_gain', label: 'Tăng cân chậm', isRed: false },
    ],
  },
  respiratory: {
    label: 'Hô hấp',
    color: 'red',
    symptoms: [
      { id: 'kussmaul_breathing', label: 'Thở nhanh sâu kiểu Kussmaul', isRed: true },
      { id: 'abnormal_breathing', label: 'Thở bất thường', isRed: true },
      { id: 'respiratory_distress', label: 'Khó thở, suy hô hấp', isRed: true },
    ],
  },
  smell: {
    label: 'Mùi bất thường',
    color: 'yellow',
    symptoms: [
      { id: 'strong_maple_smell', label: 'Mùi siro phong mạnh (MSUD)', isRed: true },
      { id: 'faint_maple_smell', label: 'Mùi siro phong nhạt', isRed: false },
      { id: 'unusual_smell_iva', label: 'Mùi hôi bất thường (IVA)', isRed: false },
    ],
  },
  cardiovascular: {
    label: 'Tim mạch & Cơ',
    color: 'red',
    symptoms: [
      { id: 'arrhythmia', label: 'Rối loạn nhịp tim', isRed: true },
      { id: 'arrhythmia_chest_pain', label: 'Rối loạn nhịp tim, đau ngực', isRed: true },
      { id: 'pallor_cold_extremities', label: 'Tái nhợt, chi lạnh', isRed: true },
      { id: 'dark_urine_myoglobinuria', label: 'Nước tiểu màu nâu/đen (myoglobin)', isRed: true },
      { id: 'severe_muscle_pain', label: 'Đau cơ dữ dội', isRed: true },
      { id: 'generalized_weakness', label: 'Yếu liệt toàn thân', isRed: true },
      { id: 'mild_muscle_pain', label: 'Đau cơ nhẹ', isRed: false },
      { id: 'fatigue', label: 'Mệt mỏi bất thường', isRed: false },
      { id: 'edema_dyspnea', label: 'Phù, khó thở (tim)', isRed: true },
      { id: 'abnormal_bleeding', label: 'Chảy máu bất thường', isRed: true },
      { id: 'severe_infection_signs', label: 'Dấu hiệu nhiễm trùng nặng', isRed: true },
    ],
  },
  metabolic: {
    label: 'Chuyển hóa đặc hiệu',
    color: 'red',
    symptoms: [
      { id: 'hypoglycemia_symptomatic', label: 'Hạ đường huyết có triệu chứng', isRed: true },
      { id: 'glucose_below_3_3', label: 'Đường huyết <3.3 mmol/L', isRed: true },
      { id: 'glucose_3_3_to_3_9', label: 'Đường huyết 3.3-3.9 mmol/L', isRed: false },
      { id: 'ketone_strong_positive', label: 'Ketone niệu +++ (OA)', isRed: true },
      { id: 'ketone_mild_positive', label: 'Ketone niệu + (nhẹ)', isRed: false },
      { id: 'nh3_elevated', label: 'NH3 tăng cao nghi ngờ (UCD)', isRed: true },
    ],
  },
};

const triggerFactors = [
  { id: 'fever_infection', label: 'Sốt / Nhiễm trùng' },
  { id: 'trauma', label: 'Chấn thương' },
  { id: 'surgery', label: 'Phẫu thuật' },
  { id: 'protein_mistake', label: 'Ăn nhầm đạm' },
  { id: 'bcaa_mistake', label: 'Ăn nhầm BCAA (MSUD)' },
  { id: 'lc_fat_mistake', label: 'Ăn nhầm mỡ chuỗi dài (FAOD)' },
  { id: 'missed_medication', label: 'Quên/bỏ thuốc' },
  { id: 'missed_carnitine', label: 'Quên Carnitine' },
  { id: 'missed_carnitine_mct', label: 'Quên Carnitine/MCT (FAOD)' },
  { id: 'missed_formula', label: 'Quên/thiếu công thức đặc biệt' },
  { id: 'missed_meal_unsafe_fasting', label: 'Nhịn ăn quá lâu (FAOD)' },
  { id: 'prolonged_exercise', label: 'Gắng sức kéo dài' },
  { id: 'post_trauma', label: 'Sau chấn thương/phẫu thuật' },
];

export default function CheckinPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(new Set());
  const [vitals, setVitals] = useState({
    temperature: '',
    glucose: '',
    ketone: '',
    heart_rate: '',
  });
  const [adherence, setAdherence] = useState('');
  const [result, setResult] = useState<{ flag: string; reasoning: string[] } | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then(r => r.json())
      .then(setPatient)
      .finally(() => setLoading(false));
  }, [id]);

  function toggleSymptom(sym: string) {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  }

  function toggleTrigger(t: string) {
    setSelectedTriggers(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const vital_signs: Record<string, number | string> = {};
      if (vitals.temperature) vital_signs.temperature = parseFloat(vitals.temperature);
      if (vitals.glucose) vital_signs.glucose = parseFloat(vitals.glucose);
      if (vitals.ketone) vital_signs.ketone = vitals.ketone;
      if (vitals.heart_rate) vital_signs.heart_rate = parseInt(vitals.heart_rate);

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: Number(id),
          symptoms: Array.from(selectedSymptoms),
          vital_signs,
          trigger_factors: Array.from(selectedTriggers),
          adherence_score: adherence ? Number(adherence) : undefined,
        }),
      });
      const data = await res.json();
      setResult({ flag: data.flag, reasoning: data.reasoning });
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Đang tải...</p></div>;
  if (!patient) return null;

  if (result) {
    const flag = result.flag as 'RED' | 'YELLOW' | 'GREEN';
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href={`/patients/${id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-base font-bold text-gray-900">Kết quả đánh giá</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
          {/* Big flag result */}
          <div className={`rounded-2xl p-6 text-center ${
            flag === 'RED' ? 'bg-red-50 border-2 border-red-400' :
            flag === 'YELLOW' ? 'bg-amber-50 border-2 border-amber-400' :
            'bg-green-50 border-2 border-green-400'
          }`}>
            <div className="mb-4">
              {flag === 'RED' ? (
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
              ) : flag === 'YELLOW' ? (
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
              ) : (
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              )}
            </div>
            <FlagBadge flag={flag} size="lg" />
            <p className="mt-3 text-gray-600 font-medium">
              {flag === 'RED' ? 'Cần xử lý khẩn cấp - Liên hệ NVYT hoặc đến cơ sở y tế NGAY' :
               flag === 'YELLOW' ? 'Cần theo dõi - Áp dụng sick-day protocol và liên hệ bác sĩ' :
               'Tình trạng ổn định - Tiếp tục theo dõi thường quy'}
            </p>
          </div>

          {/* Reasoning */}
          {result.reasoning.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-3">Lý do đánh giá</h3>
              <ul className="space-y-2">
                {result.reasoning.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {flag === 'RED' && patient.emergency_contacts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="font-bold text-red-700 mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Liên hệ ngay
                </p>
                {patient.emergency_contacts.map((c, i) => (
                  <a key={i} href={`tel:${c.phone}`} className="flex items-center justify-between py-2 border-b border-red-100 last:border-0">
                    <span className="text-sm text-gray-800">{c.name} ({c.relation})</span>
                    <span className="text-red-600 font-medium text-sm">{c.phone}</span>
                  </a>
                ))}
              </div>
            )}

            <Link
              href={`/patients/${id}/protocol`}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors"
            >
              Xem Sick-Day Protocol
            </Link>
            <Link
              href={`/patients/${id}`}
              className="flex items-center justify-center w-full bg-white border border-gray-300 text-gray-700 rounded-xl py-3 font-medium hover:bg-gray-50 transition-colors"
            >
              Về trang bệnh nhân
            </Link>
            <button
              onClick={() => setResult(null)}
              className="flex items-center justify-center w-full text-gray-500 text-sm hover:text-gray-700"
            >
              Nhập lại triệu chứng
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/patients/${id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">Nhập triệu chứng</h1>
            <p className="text-xs text-gray-500">{patient.name} — {patient.diagnosis}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Vital Signs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3">Sinh hiệu</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nhiệt độ (°C)</label>
                <input
                  type="number"
                  value={vitals.temperature}
                  onChange={e => setVitals(v => ({ ...v, temperature: e.target.value }))}
                  placeholder="37.2"
                  min="35" max="42" step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Đường huyết (mmol/L)</label>
                <input
                  type="number"
                  value={vitals.glucose}
                  onChange={e => setVitals(v => ({ ...v, glucose: e.target.value }))}
                  placeholder="4.5"
                  min="1" max="30" step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ketone niệu</label>
                <select
                  value={vitals.ketone}
                  onChange={e => setVitals(v => ({ ...v, ketone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Không đo</option>
                  <option value="âm tính">Âm tính</option>
                  <option value="+">+ (nhẹ)</option>
                  <option value="++">++ (vừa)</option>
                  <option value="+++">+++ (nặng)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nhịp tim (lần/phút)</label>
                <input
                  type="number"
                  value={vitals.heart_rate}
                  onChange={e => setVitals(v => ({ ...v, heart_rate: e.target.value }))}
                  placeholder="90"
                  min="40" max="250"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Symptom Groups */}
          {Object.entries(symptomGroups).map(([groupKey, group]) => (
            <div key={groupKey} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="font-bold text-gray-800 mb-3">{group.label}</h2>
              <div className="space-y-2">
                {group.symptoms.map(sym => (
                  <label
                    key={sym.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedSymptoms.has(sym.id)
                        ? sym.isRed ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSymptoms.has(sym.id)}
                      onChange={() => toggleSymptom(sym.id)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">
                      {sym.label}
                      {sym.isRed && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          ĐỎ
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Trigger Factors */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3">Yếu tố thúc đẩy</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {triggerFactors.map(tf => (
                <label
                  key={tf.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                    selectedTriggers.has(tf.id)
                      ? 'bg-orange-50 border-orange-200'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTriggers.has(tf.id)}
                    onChange={() => toggleTrigger(tf.id)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                  />
                  <span className="text-sm text-gray-700">{tf.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Adherence */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3">Tuân thủ điều trị</h2>
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                % khẩu phần ăn hôm nay (0-100)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0" max="100" step="5"
                  value={adherence || 80}
                  onChange={e => setAdherence(e.target.value)}
                  className="flex-1"
                />
                <span className={`text-lg font-bold w-12 text-right ${
                  Number(adherence || 80) < 50 ? 'text-red-600' :
                  Number(adherence || 80) < 70 ? 'text-amber-600' : 'text-green-600'
                }`}>{adherence || 80}%</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Không ăn gì</span>
                <span>Đủ 100%</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-4 font-bold text-base hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
          >
            <Send className="w-5 h-5" />
            {submitting ? 'Đang đánh giá...' : 'Gửi và đánh giá ngay'}
          </button>
        </form>
      </main>
    </div>
  );
}
