import { NextResponse } from 'next/server';
import { createPatient, createSymptomEntry, createFlagEvent, getDb } from '@/lib/db';
import { evaluateFlag } from '@/lib/flag-engine';

export async function POST() {
  try {
    // Clear existing data
    const db = getDb();
    db.exec('DELETE FROM flag_events; DELETE FROM symptom_entries; DELETE FROM patients;');

    // Patient 1: UCD - Stable (GREEN)
    const patient1 = createPatient({
      name: 'Nguyễn Minh Khoa',
      dob_iso: '2021-03-15',
      weight_kg: 12.5,
      diagnosis: 'UCD',
      subtype: 'OTC Deficiency',
      prescribed_meds: ['Sodium Benzoate 250mg/kg/ngày', 'L-Arginine 100mg/kg/ngày', 'Lactulose 5ml x 2 lần/ngày'],
      protein_allowance_g_per_kg: 1.2,
      formula_allowance_ml: 400,
      emergency_contacts: [
        { name: 'Nguyễn Thị Lan (Mẹ)', phone: '0901234567', relation: 'Mẹ' },
        { name: 'Nguyễn Văn Hùng (Ba)', phone: '0902345678', relation: 'Ba' },
      ],
    });

    // Add GREEN entry for patient 1
    const entry1 = {
      patient_id: patient1.id,
      symptoms: [],
      vital_signs: { glucose: 4.8, ketone: 'âm tính', heart_rate: 90, temperature: 37.1 },
      trigger_factors: [],
      adherence_score: 95,
      computed_flag: 'GREEN' as const,
      reasoning_codes: ['Không có triệu chứng đáng lo, sinh hiệu bình thường'],
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    };
    createSymptomEntry(entry1);

    // Patient 2: MSUD - Yellow Alert
    const patient2 = createPatient({
      name: 'Trần Thị Bảo Ngọc',
      dob_iso: '2019-07-22',
      weight_kg: 18.0,
      diagnosis: 'MSUD',
      subtype: 'Classic MSUD',
      prescribed_meds: ['Công thức MSUD Analog 1', 'Isoleucine supplement 50mg/ngày', 'Valine supplement 50mg/ngày', 'Thiamine 10mg/ngày'],
      protein_allowance_g_per_kg: 0.8,
      formula_allowance_ml: 600,
      emergency_contacts: [
        { name: 'Trần Văn Nam (Ba)', phone: '0903456789', relation: 'Ba' },
        { name: 'Lê Thị Hoa (Mẹ)', phone: '0904567890', relation: 'Mẹ' },
      ],
    });

    // Add YELLOW entry for patient 2
    const yellowEntry1 = {
      patient_id: patient2.id,
      symptoms: ['vomiting_1_2', 'mild_fever', 'irritable_sleepy'],
      vital_signs: { glucose: 4.2, ketone: '+', heart_rate: 105, temperature: 38.2 },
      trigger_factors: ['fever_infection'],
      adherence_score: 60,
      computed_flag: 'YELLOW' as const,
      reasoning_codes: ['Triệu chứng vàng: vomiting_1_2', 'Triệu chứng vàng: mild_fever', 'Ketone niệu "+" (theo dõi)'],
      timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    };
    createSymptomEntry(yellowEntry1);
    createFlagEvent({
      patient_id: patient2.id,
      started_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      level: 'YELLOW',
      resolved_by_hcp: 0,
    });

    // Patient 3: OA (MMA) - RED Alert
    const patient3 = createPatient({
      name: 'Lê Hoàng Phúc',
      dob_iso: '2022-11-08',
      weight_kg: 9.2,
      diagnosis: 'OA',
      subtype: 'MMA (Methylmalonyl-CoA Mutase Deficiency)',
      prescribed_meds: ['L-Carnitine 100mg/kg/ngày', 'Hydroxocobalamin 1mg/tuần', 'Metronidazole 10mg/kg/ngày'],
      protein_allowance_g_per_kg: 0.9,
      formula_allowance_ml: 350,
      emergency_contacts: [
        { name: 'Lê Thị Mai (Mẹ)', phone: '0905678901', relation: 'Mẹ' },
        { name: 'PK Nhi - BS Hiếu Phúc', phone: '0282345678', relation: 'Bác sĩ điều trị' },
      ],
    });

    // Add RED entry for patient 3
    const redEntry = {
      patient_id: patient3.id,
      symptoms: ['vomiting_continuous_4h', 'kussmaul_breathing', 'altered_consciousness'],
      vital_signs: { glucose: 3.1, ketone: '+++', heart_rate: 130, temperature: 38.9 },
      trigger_factors: ['fever_infection', 'protein_mistake'],
      adherence_score: 30,
      computed_flag: 'RED' as const,
      reasoning_codes: ['Triệu chứng đỏ: vomiting_continuous_4h', 'Triệu chứng đỏ: kussmaul_breathing', 'Đường huyết thấp nguy hiểm (<3.3 mmol/L)', 'Ketone niệu >= "++" (nguy hiểm)'],
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    };
    createSymptomEntry(redEntry);
    createFlagEvent({
      patient_id: patient3.id,
      started_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      level: 'RED',
      resolved_by_hcp: 0,
    });

    // Patient 4: FAOD - VLCAD, Stable
    const patient4 = createPatient({
      name: 'Phạm Anh Thư',
      dob_iso: '2020-05-30',
      weight_kg: 15.3,
      diagnosis: 'FAOD',
      subtype: 'VLCAD (Very Long Chain Acyl-CoA Dehydrogenase Deficiency)',
      prescribed_meds: ['Công thức VLCAD (nghèo LCT, giàu MCT)', 'Theo dõi đường huyết 3 lần/ngày'],
      protein_allowance_g_per_kg: 1.5,
      formula_allowance_ml: 500,
      emergency_contacts: [
        { name: 'Phạm Thị Liên (Mẹ)', phone: '0906789012', relation: 'Mẹ' },
        { name: 'Phạm Văn Đức (Ba)', phone: '0907890123', relation: 'Ba' },
      ],
    });

    // Add a recent YELLOW for FAOD
    const faodYellowEntry = {
      patient_id: patient4.id,
      symptoms: ['fatigue', 'mild_muscle_pain', 'glucose_3_3_to_3_9'],
      vital_signs: { glucose: 3.6, ketone: 'âm tính', heart_rate: 95, temperature: 37.4 },
      trigger_factors: ['prolonged_exercise'],
      adherence_score: 80,
      computed_flag: 'YELLOW' as const,
      reasoning_codes: ['Triệu chứng vàng: fatigue', 'Đường huyết thấp nhẹ (3.3-3.9 mmol/L)'],
      timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    };
    createSymptomEntry(faodYellowEntry);
    createFlagEvent({
      patient_id: patient4.id,
      started_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      level: 'YELLOW',
      resolved_by_hcp: 0,
    });

    return NextResponse.json({
      message: 'Đã tạo dữ liệu mẫu thành công',
      patients: [patient1, patient2, patient3, patient4],
    });
  } catch (error) {
    console.error('POST /api/seed error:', error);
    return NextResponse.json({ error: 'Lỗi tạo dữ liệu mẫu: ' + String(error) }, { status: 500 });
  }
}
