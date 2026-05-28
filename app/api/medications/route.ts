import { NextRequest, NextResponse } from 'next/server';
import { getAllMedications, createMedication } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';
    const medications = getAllMedications(activeOnly);
    return NextResponse.json(medications);
  } catch (error) {
    console.error('GET /api/medications error:', error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách thuốc' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patient_id, drug_name, dose_mg_per_kg, dose_total_mg,
      frequency, route, indication, start_date, end_date, notes,
    } = body;

    if (!patient_id || !drug_name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: bệnh nhân và tên thuốc' }, { status: 400 });
    }

    const medication = createMedication({
      patient_id: Number(patient_id),
      drug_name,
      dose_mg_per_kg: dose_mg_per_kg ? Number(dose_mg_per_kg) : undefined,
      dose_total_mg: dose_total_mg ? Number(dose_total_mg) : undefined,
      frequency: frequency || undefined,
      route: route || 'uống',
      indication: indication || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      active: 1,
      notes: notes || undefined,
    });

    return NextResponse.json(medication, { status: 201 });
  } catch (error) {
    console.error('POST /api/medications error:', error);
    return NextResponse.json({ error: 'Lỗi kê thuốc' }, { status: 500 });
  }
}
