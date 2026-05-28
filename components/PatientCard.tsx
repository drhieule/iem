'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import { FlagBadge } from '@/components/FlagBadge';
import { User, Calendar, Weight, AlertCircle, ChevronRight } from 'lucide-react';

interface PatientCardProps {
  patient: {
    id: number;
    name: string;
    dob_iso: string;
    weight_kg: number;
    diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
    subtype?: string;
  };
  currentFlag: 'RED' | 'YELLOW' | 'GREEN';
  lastCheckin?: string;
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
  const years = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  const totalMonths = years * 12 + months;

  if (totalMonths < 12) {
    return `${totalMonths} tháng`;
  }
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y} tuổi ${m} tháng` : `${y} tuổi`;
}

function formatLastCheckin(ts?: string): string {
  if (!ts) return 'Chưa có check-in';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function PatientCard({ patient, currentFlag, lastCheckin }: PatientCardProps) {
  const borderColor = {
    RED: 'border-red-500 shadow-red-100',
    YELLOW: 'border-amber-400 shadow-amber-100',
    GREEN: 'border-green-500 shadow-green-100',
  };

  const bgColor = {
    RED: 'bg-red-50',
    YELLOW: 'bg-amber-50',
    GREEN: 'bg-white',
  };

  return (
    <Link href={`/patients/${patient.id}`}>
      <div
        className={clsx(
          'rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden',
          borderColor[currentFlag]
        )}
      >
        {/* Header */}
        <div className={clsx('px-4 py-3 flex items-center justify-between', bgColor[currentFlag])}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{patient.name}</h3>
              <p className="text-xs text-gray-500">{getAge(patient.dob_iso)}</p>
            </div>
          </div>
          <FlagBadge flag={currentFlag} size="sm" />
        </div>

        {/* Body */}
        <div className="px-4 py-3 bg-white space-y-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium">{patient.diagnosis}</span>
            <span className="text-gray-400">—</span>
            <span className="text-gray-500 truncate">{diagnosisLabels[patient.diagnosis]}</span>
          </div>
          {patient.subtype && (
            <p className="text-xs text-gray-500 pl-5.5">{patient.subtype}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Weight className="w-3.5 h-3.5" />
                {patient.weight_kg} kg
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatLastCheckin(lastCheckin)}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {currentFlag === 'RED' && (
          <div className="bg-red-500 px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-semibold">YÊU CẦU XỬ LÝ KHẨN CẤP</span>
          </div>
        )}
      </div>
    </Link>
  );
}
