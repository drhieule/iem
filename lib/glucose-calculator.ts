export interface GlucosePolymerDose {
  concentration_pct: number;
  total_ml: number;
  ml_per_dose: number;
  grams_per_dose: number;
  scoops_per_dose: number;
  doses_per_day: number;
  interval_hours: number;
  schedule: string[];
  age_group: string;
}

// 1 scoop (5ml) ≈ 7g glucose polymer
const GRAMS_PER_SCOOP = 7;
const SCOOP_ML = 5;

function generateSchedule(doses: number, intervalHours: number): string[] {
  const schedule: string[] = [];
  let hour = 0;
  for (let i = 0; i < doses; i++) {
    const h = hour % 24;
    const ampm = h < 12 ? 'SA' : 'CH';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    schedule.push(`${String(h).padStart(2, '0')}:00 (liều ${i + 1})`);
    hour += intervalHours;
  }
  return schedule;
}

export function computeGlucosePolymerRegimen(
  age_months: number,
  weight_kg: number
): GlucosePolymerDose {
  let concentration_pct: number;
  let total_ml: number;
  let doses_per_day: number;
  let age_group: string;

  if (age_months <= 12) {
    // 0-12m: 10%, 150-200ml/kg, 12 doses
    concentration_pct = 10;
    total_ml = Math.round(175 * weight_kg); // midpoint of 150-200
    total_ml = Math.max(300, Math.min(total_ml, 2000));
    doses_per_day = 12;
    age_group = '0-12 tháng';
  } else if (age_months <= 24) {
    // 12-24m: 15%, ~100ml/kg, 12 doses
    concentration_pct = 15;
    total_ml = Math.round(100 * weight_kg);
    total_ml = Math.max(400, Math.min(total_ml, 1500));
    doses_per_day = 12;
    age_group = '12-24 tháng';
  } else if (age_months <= 72) {
    // 24-72m: 20%, 1200-1500ml total, 100-125ml/dose
    concentration_pct = 20;
    total_ml = 1350; // midpoint of 1200-1500
    doses_per_day = 12;
    age_group = '2-6 tuổi';
  } else if (age_months <= 120) {
    // 72-120m: 20%, 1500-2000ml total, 125-165ml/dose
    concentration_pct = 20;
    total_ml = 1750; // midpoint of 1500-2000
    doses_per_day = 12;
    age_group = '6-10 tuổi';
  } else {
    // >120m: 25%, 2000ml total, 165ml/dose
    concentration_pct = 25;
    total_ml = 2000;
    doses_per_day = 12;
    age_group = '>10 tuổi';
  }

  const interval_hours = 24 / doses_per_day; // = 2 hours
  const ml_per_dose = Math.round(total_ml / doses_per_day);

  // Calculate grams of glucose polymer per dose
  // concentration % = g/100ml, so grams = (concentration/100) * ml
  const grams_per_dose = Math.round(((concentration_pct / 100) * ml_per_dose) * 10) / 10;

  // Number of scoops: 1 scoop = 7g glucose polymer in 5ml water...
  // but for dissolving: scoops are dissolved in water to make the total volume
  // scoops_per_dose = grams_per_dose / GRAMS_PER_SCOOP
  const scoops_per_dose = Math.round((grams_per_dose / GRAMS_PER_SCOOP) * 10) / 10;

  const schedule = generateSchedule(doses_per_day, interval_hours);

  return {
    concentration_pct,
    total_ml,
    ml_per_dose,
    grams_per_dose,
    scoops_per_dose,
    doses_per_day,
    interval_hours,
    schedule,
    age_group,
  };
}

export function getAgeMonths(dob_iso: string): number {
  const dob = new Date(dob_iso);
  const now = new Date();
  const years = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  return Math.max(0, years * 12 + months);
}
