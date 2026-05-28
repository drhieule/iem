import { NextRequest, NextResponse } from 'next/server';
import { getAllDietaryPrescriptions, createDietaryPrescription } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';
    const prescriptions = getAllDietaryPrescriptions(activeOnly);
    return NextResponse.json(prescriptions);
  } catch (error) {
    console.error('GET /api/dietary error:', error);
    return NextResponse.json({ error: 'Lỗi lấy chế độ ăn' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patient_id, prescribed_at, prescribed_by,
      protein_g_per_kg, protein_g_total,
      formula_name, formula_ml_per_day, special_formula,
      additional_supplements, restrictions, meal_schedule, notes,
    } = body;

    if (!patient_id || !prescribed_at) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: bệnh nhân và ngày kê' }, { status: 400 });
    }

    const prescription = createDietaryPrescription({
      patient_id: Number(patient_id),
      prescribed_at,
      prescribed_by: prescribed_by || undefined,
      protein_g_per_kg: protein_g_per_kg ? Number(protein_g_per_kg) : undefined,
      protein_g_total: protein_g_total ? Number(protein_g_total) : undefined,
      formula_name: formula_name || undefined,
      formula_ml_per_day: formula_ml_per_day ? Number(formula_ml_per_day) : undefined,
      special_formula: special_formula || undefined,
      additional_supplements: additional_supplements || [],
      restrictions: restrictions || [],
      meal_schedule: meal_schedule || {},
      notes: notes || undefined,
      active: 1,
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    console.error('POST /api/dietary error:', error);
    return NextResponse.json({ error: 'Lỗi kê chế độ ăn' }, { status: 500 });
  }
}
