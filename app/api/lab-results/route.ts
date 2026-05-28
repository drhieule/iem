import { NextRequest, NextResponse } from 'next/server';
import { getAllLabResults, createLabResult } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const results = getAllLabResults(patientId ? Number(patientId) : undefined);
    return NextResponse.json(results);
  } catch (error) {
    console.error('GET /api/lab-results error:', error);
    return NextResponse.json({ error: 'Lỗi lấy kết quả xét nghiệm' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, tested_at, test_type, test_name, value, unit, reference_low, reference_high, interpretation, notes } = body;

    if (!patient_id || !tested_at || !test_type || !test_name || value === undefined || !unit) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const result = createLabResult({
      patient_id: Number(patient_id),
      tested_at,
      test_type,
      test_name,
      value: Number(value),
      unit,
      reference_low: reference_low !== undefined ? Number(reference_low) : undefined,
      reference_high: reference_high !== undefined ? Number(reference_high) : undefined,
      interpretation: interpretation || undefined,
      notes: notes || undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/lab-results error:', error);
    return NextResponse.json({ error: 'Lỗi tạo kết quả xét nghiệm' }, { status: 500 });
  }
}
