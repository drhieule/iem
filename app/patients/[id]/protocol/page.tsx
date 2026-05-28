'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProtocol, Protocol } from '@/lib/protocols';
import { GlucoseCalculatorWidget } from '@/components/GlucoseCalculatorWidget';
import { ArrowLeft, AlertTriangle, CheckCircle, Printer } from 'lucide-react';

interface Patient {
  id: number;
  name: string;
  dob_iso: string;
  weight_kg: number;
  diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
  subtype?: string;
}

export default function ProtocolPage() {
  const params = useParams();
  const id = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [protocol, setProtocol] = useState<Protocol | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then(r => r.json())
      .then((p: Patient) => {
        setPatient(p);
        setProtocol(getProtocol(p.diagnosis));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Đang tải...</p></div>;
  if (!patient || !protocol) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 print:hidden">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/patients/${id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">Sick-Day Protocol</h1>
              <p className="text-xs text-gray-500">{patient.name} — {patient.diagnosis}</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
          >
            <Printer className="w-4 h-4" />
            In
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Title */}
        <div className="bg-blue-600 rounded-xl p-5 text-white">
          <h2 className="text-xl font-bold">{protocol.disease}</h2>
          <p className="text-blue-100 text-sm mt-1">Hướng dẫn xử trí khi bệnh tại nhà</p>
          {patient.subtype && <p className="text-blue-200 text-xs mt-1">{patient.subtype}</p>}
        </div>

        {/* Emergency Warning */}
        <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h3 className="font-bold text-red-700 mb-2">CHUYỂN VIỆN CẤP CỨU NGAY KHI CÓ:</h3>
              <ul className="space-y-1">
                {protocol.emergencySymptoms.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-semibold text-red-800 bg-red-100 rounded-lg p-2">
                {protocol.emergencyWarning}
              </p>
            </div>
          </div>
        </div>

        {/* Protocol Steps */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800">Các bước thực hiện tại nhà</h3>
          {protocol.steps.map((step) => (
            <div
              key={step.step}
              className={`bg-white rounded-xl border shadow-sm p-4 ${
                step.isUrgent ? 'border-orange-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  step.isUrgent ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {step.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-bold text-gray-900">{step.title}</h4>
                    {step.isUrgent && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        QUAN TRỌNG
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{step.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Glucose Calculator */}
        <GlucoseCalculatorWidget
          dob_iso={patient.dob_iso}
          weight_kg={patient.weight_kg}
          patientName={patient.name}
        />

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-gray-800">Danh sách kiểm tra</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            {[
              'Đã dừng/giảm protein theo chỉ dẫn',
              'Đang cho uống glucose polymer đủ liều, đúng giờ',
              'Đã uống đủ tất cả thuốc được chỉ định',
              'Đang theo dõi sinh hiệu (nhiệt độ, đường huyết, ketone)',
              'Đã liên hệ bác sĩ/NVYT để thông báo tình trạng',
              'Biết các dấu hiệu cần đến cơ sở y tế ngay',
            ].map((item, i) => (
              <label key={i} className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-gray-300" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-gray-100 rounded-xl p-4 text-xs text-gray-500 text-center">
          <p>Protocol dựa theo hướng dẫn BIMDG / SSIEM / AAP</p>
          <p className="mt-1">Phòng khám Nhi đồng Hiếu Phúc — Hotline: 028-XXXX-XXXX</p>
        </div>
      </main>
    </div>
  );
}
