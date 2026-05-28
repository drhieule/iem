import type { Patient, SymptomEntry, VitalSigns } from '@/lib/db';

export type FlagLevel = 'RED' | 'YELLOW' | 'GREEN';

export interface FlagResult {
  flag: FlagLevel;
  reasoning: string[];
}

// Per-disease RED symptom codes
const UCD_RED_SYMPTOMS = new Set([
  'vomiting_continuous_4h',
  'altered_consciousness',
  'seizure',
  'abnormal_breathing',
  'severe_dehydration',
  'fever_high_with_symptoms',
  'nh3_elevated',
  'newborn_poor_feeding',
]);

const UCD_YELLOW_SYMPTOMS = new Set([
  'vomiting_1_2',
  'poor_intake_70pct_24h',
  'mild_fever',
  'mild_diarrhea',
  'uri_uncomplicated',
  'missed_med_dose',
  'irritable_sleepy',
  'mild_headache',
  'slow_weight_gain',
  'protein_mistake',
]);

const MSUD_RED_SYMPTOMS = new Set([
  'altered_consciousness',
  'seizure',
  'apnea',
  'opisthotonus_cycling_fencing',
  'vomiting_continuous_4h',
  'poor_feeding_newborn',
  'strong_maple_smell',
  'unequal_pupils',
  'fever_with_symptoms',
  'post_trauma',
]);

const MSUD_YELLOW_SYMPTOMS = new Set([
  'vomiting_1_2',
  'poor_intake_70pct',
  'mild_fever',
  'mild_diarrhea',
  'faint_maple_smell',
  'irritable_sleepy',
  'mild_hypertonia',
  'bcaa_mistake',
  'missed_formula',
  'weight_loss',
]);

const OA_RED_SYMPTOMS = new Set([
  'kussmaul_breathing',
  'altered_consciousness',
  'vomiting_continuous_4h',
  'seizure',
  'severe_dehydration',
  'fever_with_symptoms',
  'pallor_cold_extremities',
  'arrhythmia',
  'abnormal_bleeding',
  'severe_infection_signs',
  'ketone_strong_positive',
]);

const OA_YELLOW_SYMPTOMS = new Set([
  'vomiting_1_2',
  'poor_intake_70pct',
  'mild_fever',
  'mild_diarrhea',
  'ketone_mild_positive',
  'irritable_sleepy',
  'unusual_smell_iva',
  'protein_mistake',
  'missed_carnitine',
  'abdominal_pain',
  'weight_loss',
]);

const FAOD_RED_SYMPTOMS = new Set([
  'hypoglycemia_symptomatic',
  'glucose_below_3_3',
  'altered_consciousness',
  'vomiting_continuous_4h',
  'respiratory_distress',
  'arrhythmia_chest_pain',
  'dark_urine_myoglobinuria',
  'severe_muscle_pain',
  'generalized_weakness',
  'fever_with_symptoms',
  'edema_dyspnea',
]);

const FAOD_YELLOW_SYMPTOMS = new Set([
  'missed_meal_unsafe_fasting',
  'vomiting_1_2',
  'mild_fever',
  'mild_diarrhea',
  'mild_muscle_pain',
  'fatigue',
  'glucose_3_3_to_3_9',
  'missed_carnitine_mct',
  'prolonged_exercise',
  'lc_fat_mistake',
]);

function getDiseaseSets(diagnosis: Patient['diagnosis']): { red: Set<string>; yellow: Set<string> } {
  switch (diagnosis) {
    case 'UCD': return { red: UCD_RED_SYMPTOMS, yellow: UCD_YELLOW_SYMPTOMS };
    case 'MSUD': return { red: MSUD_RED_SYMPTOMS, yellow: MSUD_YELLOW_SYMPTOMS };
    case 'OA': return { red: OA_RED_SYMPTOMS, yellow: OA_YELLOW_SYMPTOMS };
    case 'FAOD': return { red: FAOD_RED_SYMPTOMS, yellow: FAOD_YELLOW_SYMPTOMS };
  }
}

function ketoneNumeric(ketone?: string): number {
  if (!ketone) return 0;
  if (ketone === '+++') return 3;
  if (ketone === '++') return 2;
  if (ketone === '+') return 1;
  return 0;
}

function checkVitalRedFlags(vitals: VitalSigns, reasoning: string[]): boolean {
  let triggered = false;
  if (vitals.glucose !== undefined && vitals.glucose < 3.3) {
    reasoning.push('Đường huyết thấp nguy hiểm (<3.3 mmol/L)');
    triggered = true;
  }
  if (ketoneNumeric(vitals.ketone) >= 2) {
    reasoning.push('Ketone niệu >= "++" (nguy hiểm)');
    triggered = true;
  }
  return triggered;
}

function checkTempAndPoorEating(vitals: VitalSigns, symptoms: string[], reasoning: string[]): boolean {
  const poorEating = symptoms.some(s => s.includes('poor_intake') || s.includes('poor_feeding') || s === 'vomiting_continuous_4h');
  if (vitals.temperature !== undefined && vitals.temperature > 38.5 && poorEating) {
    reasoning.push('Sốt cao (>38.5°C) + ăn uống kém');
    return true;
  }
  return false;
}

export function evaluateFlag(
  patient: Patient,
  entry: SymptomEntry,
  history: SymptomEntry[]
): FlagResult {
  const reasoning: string[] = [];
  const { red: redSet, yellow: yellowSet } = getDiseaseSets(patient.diagnosis);
  const symptoms = entry.symptoms || [];
  const vitals = entry.vital_signs || {};
  const triggers = entry.trigger_factors || [];

  // Check RED symptoms directly
  const redSymptoms = symptoms.filter(s => redSet.has(s));
  if (redSymptoms.length > 0) {
    redSymptoms.forEach(s => reasoning.push(`Triệu chứng đỏ: ${s}`));
    return { flag: 'RED', reasoning };
  }

  // Check vital RED flags
  const vitalRed = checkVitalRedFlags(vitals, reasoning);
  if (vitalRed) {
    return { flag: 'RED', reasoning };
  }

  // Temp + poor eating => RED
  const tempPoorEating = checkTempAndPoorEating(vitals, symptoms, reasoning);
  if (tempPoorEating) {
    return { flag: 'RED', reasoning };
  }

  // Check YELLOW symptoms
  const yellowSymptoms = symptoms.filter(s => yellowSet.has(s));

  // Missing >1 med dose + trigger factor => YELLOW
  const missedMeds = triggers.includes('missed_medication');
  const hasTrigger = triggers.length > 0 && triggers.some(t => t !== 'missed_medication');
  if (missedMeds && hasTrigger) {
    reasoning.push('Quên >1 liều thuốc + có yếu tố thúc đẩy');
    yellowSymptoms.push('missed_med_with_trigger');
  }

  // Check mild glucose
  if (vitals.glucose !== undefined && vitals.glucose >= 3.3 && vitals.glucose < 3.9) {
    reasoning.push('Đường huyết thấp nhẹ (3.3-3.9 mmol/L)');
    yellowSymptoms.push('glucose_mild_low');
  }

  // Ketone + => YELLOW (not ++, already caught above)
  if (ketoneNumeric(vitals.ketone) === 1) {
    reasoning.push('Ketone niệu "+" (theo dõi)');
    yellowSymptoms.push('ketone_mild');
  }

  if (yellowSymptoms.length > 0) {
    yellowSymptoms.filter(s => yellowSet.has(s)).forEach(s => reasoning.push(`Triệu chứng vàng: ${s}`));

    // Escalation: 2 YELLOW in last 24h => RED
    const now = new Date(entry.timestamp || new Date().toISOString()).getTime();
    const last24h = history.filter(h => {
      const hTime = new Date(h.timestamp || 0).getTime();
      return now - hTime <= 24 * 3600 * 1000 && h.computed_flag === 'YELLOW';
    });

    if (last24h.length >= 2) {
      reasoning.push('Leo thang: >= 2 lần VÀNG trong 24h -> ĐỎ');
      return { flag: 'RED', reasoning };
    }

    // Escalation: YELLOW lasting > 12h without improvement => RED
    const yellowHistory = history
      .filter(h => h.computed_flag === 'YELLOW')
      .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

    if (yellowHistory.length > 0) {
      const firstYellow = new Date(yellowHistory[0].timestamp || 0).getTime();
      const hoursSinceFirstYellow = (now - firstYellow) / 3600000;
      if (hoursSinceFirstYellow > 12) {
        // Check if any GREEN in between
        const hasGreenAfterFirstYellow = history.some(h => {
          const hTime = new Date(h.timestamp || 0).getTime();
          return hTime > firstYellow && h.computed_flag === 'GREEN';
        });
        if (!hasGreenAfterFirstYellow) {
          reasoning.push('Leo thang: VÀNG kéo dài >12h không cải thiện -> ĐỎ');
          return { flag: 'RED', reasoning };
        }
      }
    }

    if (reasoning.length === 0) {
      reasoning.push('Có triệu chứng cần theo dõi');
    }
    return { flag: 'YELLOW', reasoning };
  }

  // YELLOW -> GREEN: requires 24h symptom-free + normal vitals + adequate intake
  const now = new Date(entry.timestamp || new Date().toISOString()).getTime();
  const hasRecentYellowOrRed = history.some(h => {
    const hTime = new Date(h.timestamp || 0).getTime();
    return now - hTime <= 24 * 3600 * 1000 && (h.computed_flag === 'YELLOW' || h.computed_flag === 'RED');
  });

  const normalVitals =
    (vitals.glucose === undefined || vitals.glucose >= 3.9) &&
    (vitals.ketone === undefined || ketoneNumeric(vitals.ketone) === 0) &&
    (vitals.temperature === undefined || vitals.temperature <= 37.5);

  const adequateIntake = entry.adherence_score === undefined || entry.adherence_score >= 70;

  if (hasRecentYellowOrRed && (!normalVitals || !adequateIntake)) {
    reasoning.push('Đang hồi phục - chưa đủ điều kiện xanh (cần 24h bình thường)');
    return { flag: 'YELLOW', reasoning };
  }

  reasoning.push('Không có triệu chứng đáng lo, sinh hiệu bình thường');
  return { flag: 'GREEN', reasoning };
}

export {
  UCD_RED_SYMPTOMS,
  UCD_YELLOW_SYMPTOMS,
  MSUD_RED_SYMPTOMS,
  MSUD_YELLOW_SYMPTOMS,
  OA_RED_SYMPTOMS,
  OA_YELLOW_SYMPTOMS,
  FAOD_RED_SYMPTOMS,
  FAOD_YELLOW_SYMPTOMS,
};
