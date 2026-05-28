'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PatientCard } from '@/components/PatientCard';
import { FlagBadge } from '@/components/FlagBadge';
import { Plus, LayoutDashboard, Activity, AlertTriangle, Users, RefreshCw } from 'lucide-react';

interface Patient {
  id: number;
  name: string;
  dob_iso: string;
  weight_kg: number;
  diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
  subtype?: string;
}

interface FlagEvent {
  id: number;
  patient_id: number;
  started_at: string;
  level: 'RED' | 'YELLOW' | 'GREEN';
}

interface PatientWithFlag extends Patient {
  currentFlag: 'RED' | 'YELLOW' | 'GREEN';
  lastCheckin?: string;
}

export default function HomePage() {
  const [patients, setPatients] = useState<PatientWithFlag[]>([]);
  const [activeFlags, setActiveFlags] = useState<FlagEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [pRes, fRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/flags'),
      ]);
      const patientsData: Patient[] = await pRes.json();
      const flagsData: FlagEvent[] = await fRes.json();
      setActiveFlags(flagsData);

      // Load last checkin for each patient
      const patientsWithFlags = await Promise.all(
        patientsData.map(async (p) => {
          const cRes = await fetch(`/api/checkin/${p.id}`);
          const entries = await cRes.json();
          const activeFlag = flagsData.find(f => f.patient_id === p.id);
          const currentFlag = activeFlag ? activeFlag.level : 'GREEN';
          const lastEntry = Array.isArray(entries) && entries.length > 0 ? entries[0] : null;
          return {
            ...p,
            currentFlag: currentFlag as 'RED' | 'YELLOW' | 'GREEN',
            lastCheckin: lastEntry?.timestamp,
          };
        })
      );

      // Sort: RED first, then YELLOW, then GREEN
      patientsWithFlags.sort((a, b) => {
        const order = { RED: 0, YELLOW: 1, GREEN: 2 };
        return order[a.currentFlag] - order[b.currentFlag];
      });

      setPatients(patientsWithFlags);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await fetch('/api/seed', { method: 'POST' });
      await loadData();
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const redCount = patients.filter(p => p.currentFlag === 'RED').length;
  const yellowCount = patients.filter(p => p.currentFlag === 'YELLOW').length;
  const greenCount = patients.filter(p => p.currentFlag === 'GREEN').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">IEM Monitor</h1>
              <p className="text-xs text-gray-500">Phòng khám Nhi đồng Hiếu Phúc</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Tải lại"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard NVYT
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col items-center">
            <Users className="w-6 h-6 text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
            <p className="text-xs text-gray-500">Tổng bệnh nhân</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-4 flex flex-col items-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mb-1 animate-pulse" />
            <p className="text-2xl font-bold text-red-700">{redCount}</p>
            <p className="text-xs text-red-600">Cảnh báo ĐỎ</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-4 flex flex-col items-center">
            <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
            <p className="text-2xl font-bold text-amber-700">{yellowCount}</p>
            <p className="text-xs text-amber-600">Theo dõi VÀNG</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href="/patients/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm bệnh nhân
          </Link>
          {patients.length === 0 && !loading && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-300"
            >
              {seeding ? 'Đang tạo...' : 'Tải dữ liệu mẫu'}
            </button>
          )}
        </div>

        {/* Patient Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-500">Đang tải danh sách bệnh nhân...</p>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Chưa có bệnh nhân</h3>
            <p className="text-gray-500 text-sm mb-4">Thêm bệnh nhân đầu tiên hoặc tải dữ liệu mẫu để bắt đầu</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {seeding ? 'Đang tải...' : 'Tải dữ liệu mẫu (4 BN)'}
            </button>
          </div>
        ) : (
          <>
            {redCount > 0 && (
              <div>
                <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Cảnh báo khẩn cấp ({redCount})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patients.filter(p => p.currentFlag === 'RED').map(p => (
                    <PatientCard key={p.id} patient={p} currentFlag={p.currentFlag} lastCheckin={p.lastCheckin} />
                  ))}
                </div>
              </div>
            )}
            {yellowCount > 0 && (
              <div>
                <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Đang theo dõi ({yellowCount})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patients.filter(p => p.currentFlag === 'YELLOW').map(p => (
                    <PatientCard key={p.id} patient={p} currentFlag={p.currentFlag} lastCheckin={p.lastCheckin} />
                  ))}
                </div>
              </div>
            )}
            {greenCount > 0 && (
              <div>
                <h2 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Bình thường ({greenCount})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patients.filter(p => p.currentFlag === 'GREEN').map(p => (
                    <PatientCard key={p.id} patient={p} currentFlag={p.currentFlag} lastCheckin={p.lastCheckin} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
