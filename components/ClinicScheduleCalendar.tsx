'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Pencil, X, Check } from 'lucide-react';

interface ClinicSession {
  id: number;
  session_date: string;
  doctor_name: string | null;
  notes: string | null;
}

interface Props {
  editable?: boolean;
}

const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  // Returns 0=Mon ... 6=Sun
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getUTCDow(dateStr: string): number {
  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  return new Date(dateStr + 'T12:00:00Z').getUTCDay();
}

function isTueThu(dateStr: string): boolean {
  const dow = getUTCDow(dateStr);
  return dow === 2 || dow === 4;
}

function isWeekday(dateStr: string): boolean {
  const dow = getUTCDow(dateStr);
  return dow >= 1 && dow <= 5;
}

export function ClinicScheduleCalendar({ editable = false }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sessions, setSessions] = useState<Record<string, ClinicSession>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDoctor, setEditDoctor] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/clinic-schedule?year=${year}&month=${month}`);
      const data: ClinicSession[] = await res.json();
      const map: Record<string, ClinicSession> = {};
      for (const s of data) map[s.session_date] = s;
      setSessions(map);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  function startEdit(dateStr: string) {
    if (!editable) return;
    const s = sessions[dateStr];
    setEditing(dateStr);
    setEditDoctor(s?.doctor_name || '');
    setEditNotes(s?.notes || '');
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await fetch('/api/clinic-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_date: editing,
          doctor_name: editDoctor.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      setEditing(null);
      fetchSessions();
    } finally {
      setSaving(false);
    }
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
        <button onClick={prevMonth} className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-white font-bold text-sm">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button onClick={nextMonth} className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Sáng T2–T6: Đăng ký PKC Chuyên gia (RLCH - Di truyền)
        </span>
        <span className="flex items-center gap-1 text-blue-700">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          Chiều T3&T5: P.E02.03 — Đến trước 14:00 để XN có kết quả sớm
        </span>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DOW_LABELS.map(d => (
          <div key={d} className={`text-center text-xs font-semibold py-2 ${
            d === 'T7' || d === 'CN' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="min-h-[72px] bg-gray-50/50" />;

            const dateStr = toDateStr(year, month, day);
            const isToday = dateStr === todayStr;
            const isTT = isTueThu(dateStr);
            const isWD = isWeekday(dateStr);
            const session = sessions[dateStr];
            const isWeekend = !isWD;

            return (
              <div
                key={idx}
                className={`min-h-[72px] p-1 flex flex-col gap-0.5 ${
                  isWeekend ? 'bg-gray-50/50' : 'bg-white'
                } ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}`}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : isWeekend ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {day}
                </span>

                {/* Afternoon metabolic session (Tue/Thu) */}
                {isTT && (
                  <div
                    className={`text-[9px] leading-tight rounded px-1 py-0.5 flex items-start justify-between gap-0.5 ${
                      session?.doctor_name
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-500 border border-dashed border-gray-300'
                    } ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => editable && startEdit(dateStr)}
                    title={editable ? 'Nhấn để phân công bác sĩ' : undefined}
                  >
                    <span className="truncate flex-1">
                      {session?.doctor_name
                        ? `Chiều: ${session.doctor_name}`
                        : 'Chiều: chưa sắp'}
                    </span>
                    {editable && (
                      <Pencil className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 opacity-60" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800 text-sm">
                Phân công buổi chiều {new Date(editing + 'T12:00:00Z').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}
              </h4>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bác sĩ phụ trách</label>
                <input
                  type="text"
                  value={editDoctor}
                  onChange={e => setEditDoctor(e.target.value)}
                  placeholder="VD: BS. Hồng Phúc"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="VD: Nghỉ lễ, dời lịch..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Phòng E02.03 — Bệnh viện Nhi Đồng 1
            </p>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
        <strong>Lưu ý:</strong> Buổi chiều T3 &amp; T5 tại P.E02.03 — bệnh nhân nên đến trước 14:00 để làm xét nghiệm có kết quả sớm.
        Buổi sáng T2–T6 đăng ký <strong>Phòng khám Chuyên gia</strong> để được khám RLCH - Di truyền.
      </div>
    </div>
  );
}
