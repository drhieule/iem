import { NextResponse } from 'next/server';
import { createPatient, createSymptomEntry, createFlagEvent, getDb, createLabResult, createAppointment, createDietaryPrescription, createMedication, createStaff, updatePatientLoginInfo } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { evaluateFlag } from '@/lib/flag-engine';

export async function POST() {
  try {
    // Clear existing data
    const db = getDb();
    db.exec('DELETE FROM medications; DELETE FROM dietary_prescriptions; DELETE FROM appointments; DELETE FROM lab_results; DELETE FROM flag_events; DELETE FROM symptom_entries; DELETE FROM patients; DELETE FROM staff;');

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
        { name: 'BV Nhi Đồng 1 - PK Chuyển hóa', phone: '0282345678', relation: 'Bác sĩ điều trị' },
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

    // ─── Seed lab results ───────────────────────────────────────────────────
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString().split('T')[0];

    // Patient 1 (UCD) labs
    createLabResult({ patient_id: patient1.id, tested_at: daysAgo(2), test_type: 'NH3', test_name: 'NH3 máu', value: 45, unit: 'µmol/L', reference_low: 10, reference_high: 80, interpretation: 'normal' });
    createLabResult({ patient_id: patient1.id, tested_at: daysAgo(7), test_type: 'LFT', test_name: 'ALT', value: 32, unit: 'U/L', reference_low: 7, reference_high: 40, interpretation: 'normal' });
    createLabResult({ patient_id: patient1.id, tested_at: daysAgo(14), test_type: 'NH3', test_name: 'NH3 máu', value: 150, unit: 'µmol/L', reference_low: 10, reference_high: 80, interpretation: 'high', notes: 'Đang sốt nhẹ' });
    createLabResult({ patient_id: patient1.id, tested_at: daysAgo(30), test_type: 'plasma_amino_acids', test_name: 'Amino acid huyết tương', value: 185, unit: 'µmol/L', reference_low: 100, reference_high: 350, interpretation: 'normal' });

    // Patient 2 (MSUD) labs
    createLabResult({ patient_id: patient2.id, tested_at: daysAgo(1), test_type: 'leucine', test_name: 'Leucine huyết tương', value: 380, unit: 'µmol/L', reference_low: 70, reference_high: 200, interpretation: 'high', notes: 'Trên mức mục tiêu điều trị' });
    createLabResult({ patient_id: patient2.id, tested_at: daysAgo(1), test_type: 'isoleucine', test_name: 'Isoleucine huyết tương', value: 38, unit: 'µmol/L', reference_low: 40, reference_high: 100, interpretation: 'low' });
    createLabResult({ patient_id: patient2.id, tested_at: daysAgo(1), test_type: 'valine', test_name: 'Valine huyết tương', value: 150, unit: 'µmol/L', reference_low: 100, reference_high: 300, interpretation: 'normal' });
    createLabResult({ patient_id: patient2.id, tested_at: daysAgo(8), test_type: 'leucine', test_name: 'Leucine huyết tương', value: 185, unit: 'µmol/L', reference_low: 70, reference_high: 200, interpretation: 'normal' });
    createLabResult({ patient_id: patient2.id, tested_at: daysAgo(8), test_type: 'glucose', test_name: 'Đường huyết', value: 4.2, unit: 'mmol/L', reference_low: 3.9, reference_high: 6.1, interpretation: 'low' });

    // Patient 3 (OA/MMA) labs
    createLabResult({ patient_id: patient3.id, tested_at: daysAgo(0), test_type: 'NH3', test_name: 'NH3 máu', value: 210, unit: 'µmol/L', reference_low: 10, reference_high: 80, interpretation: 'critical_high', notes: 'Cấp cứu - cần xử trí ngay' });
    createLabResult({ patient_id: patient3.id, tested_at: daysAgo(0), test_type: 'lactate', test_name: 'Lactate máu', value: 5.8, unit: 'mmol/L', reference_low: 0.5, reference_high: 2.2, interpretation: 'critical_high' });
    createLabResult({ patient_id: patient3.id, tested_at: daysAgo(0), test_type: 'glucose', test_name: 'Đường huyết', value: 3.0, unit: 'mmol/L', reference_low: 3.9, reference_high: 6.1, interpretation: 'critical_low' });
    createLabResult({ patient_id: patient3.id, tested_at: daysAgo(14), test_type: 'urine_organic_acids', test_name: 'Acid hữu cơ niệu', value: 450, unit: 'mmol/mol creatinine', reference_high: 20, interpretation: 'critical_high' });
    createLabResult({ patient_id: patient3.id, tested_at: daysAgo(14), test_type: 'acylcarnitine', test_name: 'Acylcarnitine huyết tương (C3)', value: 8.5, unit: 'µmol/L', reference_high: 2.5, interpretation: 'high' });

    // Patient 4 (FAOD) labs
    createLabResult({ patient_id: patient4.id, tested_at: daysAgo(3), test_type: 'glucose', test_name: 'Đường huyết', value: 3.6, unit: 'mmol/L', reference_low: 3.9, reference_high: 6.1, interpretation: 'low' });
    createLabResult({ patient_id: patient4.id, tested_at: daysAgo(3), test_type: 'CK', test_name: 'Creatine Kinase (CK)', value: 890, unit: 'U/L', reference_high: 170, interpretation: 'high', notes: 'Sau vận động nhiều' });
    createLabResult({ patient_id: patient4.id, tested_at: daysAgo(10), test_type: 'acylcarnitine', test_name: 'Acylcarnitine (C14:1)', value: 1.2, unit: 'µmol/L', reference_high: 0.3, interpretation: 'high' });
    createLabResult({ patient_id: patient4.id, tested_at: daysAgo(30), test_type: 'glucose', test_name: 'Đường huyết', value: 4.5, unit: 'mmol/L', reference_low: 3.9, reference_high: 6.1, interpretation: 'normal' });

    // ─── Seed appointments ──────────────────────────────────────────────────
    const dateTime = (daysOffset: number, hour: number) => {
      const d = new Date(now.getTime() + daysOffset * 86400000);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };

    // Patient 1 appointments
    createAppointment({ patient_id: patient1.id, scheduled_at: dateTime(3, 9), type: 'routine', doctor: 'BS. Hiếu Phúc', department: 'Phòng khám Chuyển hóa', status: 'scheduled', notes: 'Tái khám định kỳ 3 tháng' });
    createAppointment({ patient_id: patient1.id, scheduled_at: dateTime(-30, 9), type: 'routine', doctor: 'BS. Hiếu Phúc', department: 'Phòng khám Chuyển hóa', status: 'completed', notes: 'Đã khám, bệnh nhân ổn định' });
    createAppointment({ patient_id: patient1.id, scheduled_at: dateTime(-90, 9), type: 'annual', doctor: 'BS. Hiếu Phúc', department: 'Phòng khám Chuyển hóa', status: 'completed' });

    // Patient 2 appointments
    createAppointment({ patient_id: patient2.id, scheduled_at: dateTime(1, 10), type: 'urgent', doctor: 'BS. Hiếu Phúc', department: 'Phòng khám Chuyển hóa', status: 'scheduled', notes: 'Cần đánh giá leucine tăng cao' });
    createAppointment({ patient_id: patient2.id, scheduled_at: dateTime(-7, 14), type: 'followup', doctor: 'BS. Ngọc Lan', department: 'Phòng khám Chuyển hóa', status: 'completed' });
    createAppointment({ patient_id: patient2.id, scheduled_at: dateTime(-45, 9), type: 'routine', doctor: 'BS. Hiếu Phúc', department: 'Phòng khám Chuyển hóa', status: 'completed' });

    // Patient 3 appointments
    createAppointment({ patient_id: patient3.id, scheduled_at: dateTime(0, 8), type: 'urgent', doctor: 'BS. Hiếu Phúc', department: 'Cấp cứu — Khoa Chuyển hóa', status: 'scheduled', notes: 'CẤP CỨU: Lactate và NH3 tăng cao' });
    createAppointment({ patient_id: patient3.id, scheduled_at: dateTime(-14, 9), type: 'routine', doctor: 'BS. Hiếu Phúc', department: 'Phòng khám Chuyển hóa', status: 'completed' });
    createAppointment({ patient_id: patient3.id, scheduled_at: dateTime(-60, 10), type: 'newborn_screen', doctor: 'BS. Ngọc Lan', department: 'Phòng khám Chuyển hóa', status: 'completed', notes: 'Tầm soát sơ sinh dương tính - xác nhận MMA' });

    // Patient 4 appointments
    createAppointment({ patient_id: patient4.id, scheduled_at: dateTime(7, 9), type: 'followup', doctor: 'BS. Hiếu Phúc', department: 'Phòng khám Chuyển hóa', status: 'scheduled' });
    createAppointment({ patient_id: patient4.id, scheduled_at: dateTime(-3, 14), type: 'followup', doctor: 'BS. Hiếu Phúc', department: 'Phòng khám Chuyển hóa', status: 'completed', notes: 'CK tăng sau vận động' });
    createAppointment({ patient_id: patient4.id, scheduled_at: dateTime(-21, 9), type: 'routine', doctor: 'BS. Ngọc Lan', department: 'Phòng khám Chuyển hóa', status: 'no_show', notes: 'Phụ huynh không đến' });

    // ─── Seed dietary prescriptions ─────────────────────────────────────────
    createDietaryPrescription({
      patient_id: patient1.id,
      prescribed_at: daysAgo(30),
      prescribed_by: 'BS. Hiếu Phúc',
      protein_g_per_kg: 1.2,
      protein_g_total: Math.round(1.2 * patient1.weight_kg * 10) / 10,
      formula_name: 'UCD Anamix Junior',
      formula_ml_per_day: 400,
      special_formula: 'Công thức không chứa đạm tự nhiên, bổ sung arginine',
      additional_supplements: ['L-Arginine 100mg/kg/ngày', 'Sodium Benzoate 250mg/kg/ngày', 'Lactulose 5ml x 2'],
      restrictions: ['Thịt đỏ > 30g/ngày', 'Đậu nành', 'Hải sản đặc'],
      meal_schedule: { breakfast: 'Cháo gạo + rau luộc + 100ml công thức', lunch: 'Cơm mềm + thịt trắng ít + 100ml công thức', dinner: '100ml công thức + trái cây', snacks: '100ml công thức x 1 lần' },
      notes: 'Tăng thể tích công thức khi sốt hoặc bệnh kèm',
      active: 1,
    });

    createDietaryPrescription({
      patient_id: patient2.id,
      prescribed_at: daysAgo(14),
      prescribed_by: 'BS. Hiếu Phúc',
      protein_g_per_kg: 0.8,
      protein_g_total: Math.round(0.8 * patient2.weight_kg * 10) / 10,
      formula_name: 'MSUD Analog 1',
      formula_ml_per_day: 600,
      special_formula: 'Công thức không có BCAA (Leucine, Isoleucine, Valine)',
      additional_supplements: ['Isoleucine 50mg/ngày', 'Valine 50mg/ngày', 'Thiamine 10mg/ngày'],
      restrictions: ['Sữa bò', 'Thịt gia súc, gia cầm > 20g/ngày', 'Trứng > 1 quả/ngày', 'Đậu hạt'],
      meal_schedule: { breakfast: '150ml công thức MSUD', lunch: 'Cơm + rau củ + 150ml công thức', dinner: '150ml công thức', snacks: '150ml công thức + trái cây ít protein' },
      notes: 'Khi Leucine > 300: tạm ngưng đạm tự nhiên 24h, tăng công thức',
      active: 1,
    });

    createDietaryPrescription({
      patient_id: patient3.id,
      prescribed_at: daysAgo(7),
      prescribed_by: 'BS. Hiếu Phúc',
      protein_g_per_kg: 0.9,
      protein_g_total: Math.round(0.9 * patient3.weight_kg * 10) / 10,
      formula_name: 'OA Anamix Infant',
      formula_ml_per_day: 350,
      special_formula: 'Công thức OA nghèo Met/Thr/Val/Ile',
      additional_supplements: ['L-Carnitine 100mg/kg/ngày', 'Hydroxocobalamin 1mg/tuần (tiêm bắp)', 'Vitamin B12 uống hàng ngày'],
      restrictions: ['Hạn chế tất cả đạm động vật', 'Thịt đỏ tuyệt đối kiêng', 'Hải sản'],
      meal_schedule: { breakfast: '90ml công thức OA', lunch: 'Cháo rau + 90ml công thức', dinner: '90ml công thức', snacks: 'Trái cây + 80ml công thức' },
      notes: 'KHẨN: Khi bệnh kèm - ngưng đạm, vào viện ngay nếu không ăn được',
      active: 1,
    });

    createDietaryPrescription({
      patient_id: patient4.id,
      prescribed_at: daysAgo(21),
      prescribed_by: 'BS. Ngọc Lan',
      protein_g_per_kg: 1.5,
      protein_g_total: Math.round(1.5 * patient4.weight_kg * 10) / 10,
      formula_name: 'VLCAD MCT Formula',
      formula_ml_per_day: 500,
      special_formula: 'Công thức nghèo LCT, giàu MCT',
      additional_supplements: ['Dầu MCT 15ml x 3 lần/ngày', 'Theo dõi đường huyết 3 lần/ngày'],
      restrictions: ['Dầu mỡ LCT > 10g/ngày', 'Nhịn ăn > 3 giờ ban ngày', 'Nhịn ăn > 6 giờ ban đêm', 'Vận động nặng khi đói'],
      meal_schedule: { breakfast: '125ml công thức MCT + tinh bột', lunch: 'Cơm + thịt ít béo + rau + 125ml công thức', dinner: '125ml công thức + tinh bột', snacks: 'Bánh ngũ cốc + 125ml công thức — KHÔNG được nhịn snack' },
      notes: 'QUAN TRỌNG: Không được nhịn ăn. Mang theo glucose gel khẩn cấp khi ra ngoài.',
      active: 1,
    });

    // ─── Seed medications ───────────────────────────────────────────────────
    // Patient 1 (UCD) meds
    createMedication({ patient_id: patient1.id, drug_name: 'Sodium Benzoate', dose_mg_per_kg: 250, dose_total_mg: 250 * patient1.weight_kg, frequency: '2 lần/ngày', route: 'uống', indication: 'Thải NH3 dư thừa', start_date: '2023-01-10', active: 1 });
    createMedication({ patient_id: patient1.id, drug_name: 'L-Arginine', dose_mg_per_kg: 100, dose_total_mg: 100 * patient1.weight_kg, frequency: '3 lần/ngày', route: 'uống', indication: 'Bổ sung Arginine trong chu trình Urea', start_date: '2023-01-10', active: 1 });
    createMedication({ patient_id: patient1.id, drug_name: 'Lactulose', dose_mg_per_kg: undefined, dose_total_mg: undefined, frequency: '2 lần/ngày', route: 'uống', indication: 'Giảm hấp thu NH3 từ đại tràng', start_date: '2023-01-10', notes: '5ml x 2 lần/ngày', active: 1 });

    // Patient 2 (MSUD) meds
    createMedication({ patient_id: patient2.id, drug_name: 'Thiamine (Vitamin B1)', dose_mg_per_kg: undefined, dose_total_mg: 10, frequency: 'Hàng ngày', route: 'uống', indication: 'Điều trị MSUD đáp ứng thiamine', start_date: '2022-09-01', active: 1 });
    createMedication({ patient_id: patient2.id, drug_name: 'Isoleucine supplement', dose_mg_per_kg: undefined, dose_total_mg: 50, frequency: 'Hàng ngày', route: 'uống', indication: 'Bổ sung Isoleucine (bị thiếu khi dùng công thức MSUD)', start_date: '2022-09-01', active: 1 });
    createMedication({ patient_id: patient2.id, drug_name: 'Valine supplement', dose_mg_per_kg: undefined, dose_total_mg: 50, frequency: 'Hàng ngày', route: 'uống', indication: 'Bổ sung Valine (bị thiếu khi dùng công thức MSUD)', start_date: '2022-09-01', active: 1 });

    // Patient 3 (OA/MMA) meds
    createMedication({ patient_id: patient3.id, drug_name: 'L-Carnitine', dose_mg_per_kg: 100, dose_total_mg: 100 * patient3.weight_kg, frequency: '3 lần/ngày', route: 'uống', indication: 'Gắn kết methylmalonyl-carnitine, hỗ trợ tế bào', start_date: '2023-02-15', active: 1 });
    createMedication({ patient_id: patient3.id, drug_name: 'Hydroxocobalamin (B12)', dose_mg_per_kg: undefined, dose_total_mg: 1, frequency: 'Hàng tuần', route: 'tiêm bắp', indication: 'Điều trị MMA đáp ứng Cobalamin', start_date: '2023-02-15', notes: '1mg tiêm bắp mỗi tuần', active: 1 });
    createMedication({ patient_id: patient3.id, drug_name: 'Metronidazole', dose_mg_per_kg: 10, dose_total_mg: 10 * patient3.weight_kg, frequency: '3 lần/ngày', route: 'uống', indication: 'Giảm vi khuẩn ruột sản xuất propionate', start_date: '2023-06-01', end_date: '2023-06-14', active: 0, notes: 'Dùng theo đợt 2 tuần, nghỉ 2 tuần' });

    // Patient 4 (FAOD) meds
    createMedication({ patient_id: patient4.id, drug_name: 'Dầu MCT (Medium Chain Triglyceride)', dose_mg_per_kg: undefined, dose_total_mg: undefined, frequency: '3 lần/ngày', route: 'uống', indication: 'Nguồn năng lượng thay thế LCT', start_date: '2023-03-01', notes: '15ml x 3 lần/ngày pha vào thức ăn', active: 1 });
    createMedication({ patient_id: patient4.id, drug_name: 'Glucose Polymer (Maltodextrin)', dose_mg_per_kg: undefined, dose_total_mg: undefined, frequency: 'Khi cần', route: 'uống', indication: 'Dự phòng hạ đường huyết khi vận động hoặc bệnh cấp', start_date: '2023-03-01', notes: '5g pha trong 100ml nước — dùng ngay khi đường huyết < 3.9 hoặc trước vận động', active: 1 });

    // ─── Seed staff accounts ────────────────────────────────────────────────
    const allStaff = [
      { name: 'BS. Hồng Phúc', role: 'admin' as const, username: 'bshongphuc', password: 'bsphucdethuong', department: 'Quản trị hệ thống — Phòng khám Chuyển hóa Bẩm sinh' },
      { name: 'BS. Lê Hiếu Phúc', role: 'doctor' as const, username: 'bs.hieule', password: 'HieuPhuc@2026', department: 'Phòng khám Chuyển hóa Bẩm sinh' },
      { name: 'ĐD. Nguyễn Thị Lan', role: 'nurse' as const, username: 'dn.lan', password: 'NhiDong@2026', department: 'Phòng khám Chuyển hóa Bẩm sinh' },
      { name: 'ĐD. Trần Minh Tuấn', role: 'nurse' as const, username: 'dn.tuan', password: 'NhiDong@2026', department: 'Phòng khám Chuyển hóa Bẩm sinh' },
    ];

    for (const s of allStaff) {
      try {
        const password_hash = await hashPassword(s.password);
        const initials = s.name.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).join('');
        createStaff({ ...s, password_hash, avatar_initials: initials, active: 1 });
      } catch {
        // duplicate username on re-seed — skip
      }
    }

    // ─── Seed patient login credentials ────────────────────────────────────
    updatePatientLoginInfo(patient1.id, 'NĐ1-2024-0001', '0901234567');
    updatePatientLoginInfo(patient2.id, 'NĐ1-2024-0002', '0903456789');
    updatePatientLoginInfo(patient3.id, 'NĐ1-2024-0003', '0905678901');
    updatePatientLoginInfo(patient4.id, 'NĐ1-2024-0004', '0906789012');

    return NextResponse.json({
      message: 'Đã tạo dữ liệu mẫu thành công',
      patients: [patient1, patient2, patient3, patient4],
    });
  } catch (error) {
    console.error('POST /api/seed error:', error);
    return NextResponse.json({ error: 'Lỗi tạo dữ liệu mẫu: ' + String(error) }, { status: 500 });
  }
}
