'use client';

import { computeGlucosePolymerRegimen, getAgeMonths } from '@/lib/glucose-calculator';
import { Beaker, Clock, Droplets } from 'lucide-react';

interface GlucoseCalculatorWidgetProps {
  dob_iso: string;
  weight_kg: number;
  patientName: string;
}

export function GlucoseCalculatorWidget({ dob_iso, weight_kg, patientName }: GlucoseCalculatorWidgetProps) {
  const ageMonths = getAgeMonths(dob_iso);
  const regimen = computeGlucosePolymerRegimen(ageMonths, weight_kg);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Beaker className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-blue-800 text-base">Liều Glucose Polymer (Maltodextrin)</h3>
      </div>

      <div className="text-sm text-blue-700">
        <p>Bệnh nhân: <strong>{patientName}</strong> — {ageMonths < 12 ? `${ageMonths} tháng` : `${Math.floor(ageMonths / 12)} tuổi ${ageMonths % 12} tháng`}, {weight_kg} kg</p>
        <p className="text-xs text-blue-500 mt-0.5">Nhóm tuổi: {regimen.age_group} — Theo bảng BIMDG</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Nồng độ</p>
          <p className="text-2xl font-bold text-blue-700">{regimen.concentration_pct}%</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Tổng dịch/ngày</p>
          <p className="text-2xl font-bold text-blue-700">{regimen.total_ml} ml</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Mỗi lần uống</p>
          <p className="text-2xl font-bold text-green-700">{regimen.ml_per_dose} ml</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Số lần/ngày</p>
          <p className="text-2xl font-bold text-green-700">{regimen.doses_per_day} lần</p>
        </div>
      </div>

      {/* Preparation */}
      <div className="bg-white rounded-lg p-3 border border-blue-100 space-y-2">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-500" />
          <p className="font-semibold text-gray-700 text-sm">Cách pha mỗi lần</p>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>{regimen.grams_per_dose}g</strong> glucose polymer (~<strong>{regimen.scoops_per_dose} muỗng</strong> gạt ngang)</p>
          <p>• Hoà tan trong <strong>{regimen.ml_per_dose} ml</strong> nước đun sôi để nguội</p>
          <p>• 1 muỗng (5ml) ≈ 7g glucose polymer</p>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-lg p-3 border border-blue-100">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <p className="font-semibold text-gray-700 text-sm">Lịch uống (mỗi {regimen.interval_hours} giờ)</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {regimen.schedule.map((time, i) => (
            <span key={i} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 rounded px-2 py-1 text-center">
              {time}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">* Liều tính theo bảng BIMDG. Liên hệ bác sĩ nếu trẻ không uống được.</p>
    </div>
  );
}
