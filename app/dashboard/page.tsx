'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FlagBadge } from '@/components/FlagBadge';
import { ArrowLeft, RefreshCw, AlertTriangle, Phone, CheckCircle, Clock, Users } from 'lucide-react';

interface FlagEvent {
  id: number;
  patient_id: number;
  started_at: string;
  ended_at?: string;
  level: 'RED' | 'YELLOW' | 'GREEN';
  escalated_from?: string;
  resolved_by_hcp: number;
  patient: {
    id: number;
    name: string;
    diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
    subtype?: string;
  };
}

function timeSince(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

const diagnosisLabels: Record<string, string> = {
  UCD: 'Rối loạn chu trình Urea',
  MSUD: 'Bệnh Siro Phong',
  OA: 'Acid Hữu Cơ Niệu',
  FAOD: 'Rối loạn Oxy hóa Axit Béo',
};

export default function DashboardPage() {
  const [flags, setFlags] = useState<FlagEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [resolving, setResolving] = useState<number | null>(null);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flags');
      const data = await res.json();
      setFlags(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadFlags, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadFlags]);

  async function handleResolve(flagId: number) {
    setResolving(flagId);
    try {
      await fetch(`/api/flags/${flagId}/resolve`, { method: 'POST' });
      await loadFlags();
    } finally {
      setResolving(null);
    }
  }

  const redFlags = flags.filter(f => f.level === 'RED').sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
  const yellowFlags = flags.filter(f => f.level === 'YELLOW').sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white">Dashboard NVYT</h1>
              <p className="text-xs text-gray-400">Phòng khám Chuyển hóa Bẩm sinh — BV Nhi Đồng 1</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={loadFlags}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-bold text-lg">{redFlags.length}</span>
            <span className="text-gray-400 text-sm">Cảnh báo ĐỎ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-amber-400 font-bold text-lg">{yellowFlags.length}</span>
            <span className="text-gray-400 text-sm">Đang theo dõi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400 text-sm">Tự động làm mới mỗi 2 phút</span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading && flags.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-gray-500 animate-spin mx-auto" />
              <p className="text-gray-400">Đang tải...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RED Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <h2 className="text-lg font-bold text-red-400">CẦU CỨU KHẨN CẤP ({redFlags.length})</h2>
              </div>

              {redFlags.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-400">Không có cảnh báo đỏ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {redFlags.map((flag) => (
                    <div key={flag.id} className="bg-red-950 border border-red-700 rounded-xl p-4 space-y-3">
                      {/* Patient Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base">{flag.patient.name}</h3>
                            <FlagBadge flag="RED" size="sm" />
                          </div>
                          <p className="text-sm text-red-300 mt-0.5">{flag.patient.diagnosis} — {diagnosisLabels[flag.patient.diagnosis]}</p>
                          {flag.patient.subtype && <p className="text-xs text-red-400">{flag.patient.subtype}</p>}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-2 bg-red-900/50 rounded-lg px-3 py-2">
                        <Clock className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-300">
                          Phát sinh: {timeSince(flag.started_at)}
                        </span>
                        {flag.escalated_from && (
                          <span className="text-xs text-red-500 ml-2">
                            (leo thang từ {flag.escalated_from})
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/patients/${flag.patient_id}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          Xem bệnh nhân
                        </Link>
                        <button
                          onClick={() => handleResolve(flag.id)}
                          disabled={resolving === flag.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {resolving === flag.id ? 'Đang xử lý...' : 'Xác nhận đã xử lý'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* YELLOW Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-amber-400">THEO DÕI ({yellowFlags.length})</h2>
              </div>

              {yellowFlags.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-400">Không có ca theo dõi vàng</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {yellowFlags.map((flag) => (
                    <div key={flag.id} className="bg-amber-950 border border-amber-700 rounded-xl p-4 space-y-3">
                      {/* Patient Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base">{flag.patient.name}</h3>
                            <FlagBadge flag="YELLOW" size="sm" />
                          </div>
                          <p className="text-sm text-amber-300 mt-0.5">{flag.patient.diagnosis} — {diagnosisLabels[flag.patient.diagnosis]}</p>
                          {flag.patient.subtype && <p className="text-xs text-amber-400">{flag.patient.subtype}</p>}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-2 bg-amber-900/40 rounded-lg px-3 py-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-amber-300">
                          Theo dõi từ: {timeSince(flag.started_at)}
                        </span>
                        {/* Escalation warning if > 10h */}
                        {(Date.now() - new Date(flag.started_at).getTime()) > 10 * 3600000 && (
                          <span className="text-xs bg-amber-800 text-amber-200 px-2 py-0.5 rounded-full">
                            Nguy cơ leo thang
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/patients/${flag.patient_id}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          Xem bệnh nhân
                        </Link>
                        <button
                          onClick={() => handleResolve(flag.id)}
                          disabled={resolving === flag.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
                        >
                          <Phone className="w-4 h-4" />
                          {resolving === flag.id ? 'Đang xử lý...' : 'Đã gọi điện'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* All clear */}
        {!loading && flags.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Tất cả bệnh nhân ổn định</h2>
            <p className="text-gray-400">Không có cảnh báo nào đang hoạt động</p>
          </div>
        )}
      </main>
    </div>
  );
}
