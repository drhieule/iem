import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

const DEFAULT_NOTE =
  'Buổi chiều T3 & T5 tại P.E02.03 — bệnh nhân nên đến trước 14:00 để làm xét nghiệm có kết quả sớm. Buổi sáng T2–T6 đăng ký Phòng khám Chuyên gia để được khám RLCH - Di truyền.';

export async function GET() {
  try {
    const note = getSetting('clinic_footer_note') ?? DEFAULT_NOTE;
    return NextResponse.json({ note });
  } catch (error) {
    console.error('GET /api/public/clinic-note error:', error);
    return NextResponse.json({ note: DEFAULT_NOTE });
  }
}
