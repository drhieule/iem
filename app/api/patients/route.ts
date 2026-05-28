import { NextRequest, NextResponse } from 'next/server';
import { getAllPatients, createPatient } from '@/lib/db';

export async function GET() {
  try {
    const patients = getAllPatients();
    return NextResponse.json(patients);
  } catch (error) {
    console.error('GET /api/patients error:', error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách bệnh nhân' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, dob_iso, weight_kg, diagnosis, subtype, prescribed_meds, protein_allowance_g_per_kg, formula_allowance_ml, emergency_contacts } = body;

    if (!name || !dob_iso || !weight_kg || !diagnosis) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: tên, ngày sinh, cân nặng, chẩn đoán' }, { status: 400 });
    }

    const patient = createPatient({
      name,
      dob_iso,
      weight_kg: Number(weight_kg),
      diagnosis,
      subtype: subtype || undefined,
      prescribed_meds: prescribed_meds || [],
      protein_allowance_g_per_kg: protein_allowance_g_per_kg ? Number(protein_allowance_g_per_kg) : undefined,
      formula_allowance_ml: formula_allowance_ml ? Number(formula_allowance_ml) : undefined,
      emergency_contacts: emergency_contacts || [],
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error('POST /api/patients error:', error);
    return NextResponse.json({ error: 'Lỗi tạo bệnh nhân mới' }, { status: 500 });
  }
}
