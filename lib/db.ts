import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'iem.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','doctor','nurse')),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      department TEXT DEFAULT 'Phòng khám Chuyển hóa Bẩm sinh',
      phone TEXT,
      avatar_initials TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dob_iso TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      diagnosis TEXT NOT NULL CHECK(diagnosis IN ('UCD','MSUD','OA','FAOD')),
      subtype TEXT,
      prescribed_meds TEXT NOT NULL DEFAULT '[]',
      protein_allowance_g_per_kg REAL,
      formula_allowance_ml REAL,
      emergency_contacts TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS symptom_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      symptoms TEXT NOT NULL DEFAULT '[]',
      vital_signs TEXT NOT NULL DEFAULT '{}',
      trigger_factors TEXT NOT NULL DEFAULT '[]',
      adherence_score REAL,
      computed_flag TEXT NOT NULL DEFAULT 'GREEN',
      reasoning_codes TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS flag_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      level TEXT NOT NULL CHECK(level IN ('RED','YELLOW','GREEN')),
      escalated_from TEXT,
      resolved_by_hcp INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      tested_at TEXT NOT NULL,
      test_type TEXT NOT NULL,
      test_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      reference_low REAL,
      reference_high REAL,
      interpretation TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      scheduled_at TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'routine',
      doctor TEXT,
      department TEXT DEFAULT 'Phòng khám Chuyển hóa',
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dietary_prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      prescribed_at TEXT NOT NULL,
      prescribed_by TEXT,
      protein_g_per_kg REAL,
      protein_g_total REAL,
      formula_name TEXT,
      formula_ml_per_day REAL,
      special_formula TEXT,
      additional_supplements TEXT NOT NULL DEFAULT '[]',
      restrictions TEXT NOT NULL DEFAULT '[]',
      meal_schedule TEXT NOT NULL DEFAULT '{}',
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      drug_name TEXT NOT NULL,
      dose_mg_per_kg REAL,
      dose_total_mg REAL,
      frequency TEXT,
      route TEXT DEFAULT 'uống',
      indication TEXT,
      start_date TEXT,
      end_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clinic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_date TEXT NOT NULL UNIQUE,
      doctor_name TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES staff(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Safe migrations: add columns to patients if they don't exist
  const migrations = [
    `ALTER TABLE patients ADD COLUMN record_number TEXT`,
    `ALTER TABLE patients ADD COLUMN login_phone TEXT`,
    `ALTER TABLE patients ADD COLUMN password_hash TEXT`,
  ];
  for (const m of migrations) {
    try { database.exec(m); } catch { /* column already exists */ }
  }

  // Auto-create admin account if no staff exists yet (bootstrap)
  const staffCount = (database.prepare('SELECT COUNT(*) as c FROM staff').get() as { c: number }).c;
  if (staffCount === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('bsphucdethuong', 10);
    database.prepare(
      `INSERT INTO staff (name, role, username, password_hash, department, avatar_initials, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run('BS. Hồng Phúc', 'admin', 'bshongphuc', hash, 'Quản trị hệ thống — Phòng khám Chuyển hóa Bẩm sinh', 'BHP');
  }
}

export interface Patient {
  id: number;
  name: string;
  dob_iso: string;
  weight_kg: number;
  diagnosis: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
  subtype?: string;
  prescribed_meds: string[];
  protein_allowance_g_per_kg?: number;
  formula_allowance_ml?: number;
  emergency_contacts: Array<{ name: string; phone: string; relation: string }>;
  created_at: string;
}

export interface VitalSigns {
  glucose?: number;
  ketone?: string;
  heart_rate?: number;
  temperature?: number;
}

export interface SymptomEntry {
  id?: number;
  patient_id: number;
  timestamp?: string;
  symptoms: string[];
  vital_signs: VitalSigns;
  trigger_factors: string[];
  adherence_score?: number;
  computed_flag: 'RED' | 'YELLOW' | 'GREEN';
  reasoning_codes: string[];
}

export interface FlagEvent {
  id: number;
  patient_id: number;
  started_at: string;
  ended_at?: string;
  level: 'RED' | 'YELLOW' | 'GREEN';
  escalated_from?: string;
  resolved_by_hcp: number;
}

function parsePatientRow(row: Record<string, unknown>): Patient {
  return {
    ...row,
    prescribed_meds: JSON.parse((row.prescribed_meds as string) || '[]'),
    emergency_contacts: JSON.parse((row.emergency_contacts as string) || '[]'),
  } as Patient;
}

function parseEntryRow(row: Record<string, unknown>): SymptomEntry {
  return {
    ...row,
    symptoms: JSON.parse((row.symptoms as string) || '[]'),
    vital_signs: JSON.parse((row.vital_signs as string) || '{}'),
    trigger_factors: JSON.parse((row.trigger_factors as string) || '[]'),
    reasoning_codes: JSON.parse((row.reasoning_codes as string) || '[]'),
  } as SymptomEntry;
}

// Patient CRUD
export function getAllPatients(): Patient[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM patients ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(parsePatientRow);
}

export function getPatientById(id: number): Patient | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? parsePatientRow(row) : null;
}

export function createPatient(data: Omit<Patient, 'id' | 'created_at'>): Patient {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO patients (name, dob_iso, weight_kg, diagnosis, subtype, prescribed_meds, protein_allowance_g_per_kg, formula_allowance_ml, emergency_contacts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.name,
    data.dob_iso,
    data.weight_kg,
    data.diagnosis,
    data.subtype || null,
    JSON.stringify(data.prescribed_meds),
    data.protein_allowance_g_per_kg || null,
    data.formula_allowance_ml || null,
    JSON.stringify(data.emergency_contacts)
  );
  return getPatientById(result.lastInsertRowid as number)!;
}

export function updatePatient(id: number, data: Partial<Omit<Patient, 'id' | 'created_at'>>): Patient | null {
  const database = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.dob_iso !== undefined) { fields.push('dob_iso = ?'); values.push(data.dob_iso); }
  if (data.weight_kg !== undefined) { fields.push('weight_kg = ?'); values.push(data.weight_kg); }
  if (data.diagnosis !== undefined) { fields.push('diagnosis = ?'); values.push(data.diagnosis); }
  if (data.subtype !== undefined) { fields.push('subtype = ?'); values.push(data.subtype); }
  if (data.prescribed_meds !== undefined) { fields.push('prescribed_meds = ?'); values.push(JSON.stringify(data.prescribed_meds)); }
  if (data.protein_allowance_g_per_kg !== undefined) { fields.push('protein_allowance_g_per_kg = ?'); values.push(data.protein_allowance_g_per_kg); }
  if (data.formula_allowance_ml !== undefined) { fields.push('formula_allowance_ml = ?'); values.push(data.formula_allowance_ml); }
  if (data.emergency_contacts !== undefined) { fields.push('emergency_contacts = ?'); values.push(JSON.stringify(data.emergency_contacts)); }
  if (fields.length === 0) return getPatientById(id);
  values.push(id);
  database.prepare(`UPDATE patients SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getPatientById(id);
}

export function deletePatient(id: number): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM patients WHERE id = ?').run(id);
  return result.changes > 0;
}

// Symptom entries
export function createSymptomEntry(data: Omit<SymptomEntry, 'id'>): SymptomEntry {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO symptom_entries (patient_id, timestamp, symptoms, vital_signs, trigger_factors, adherence_score, computed_flag, reasoning_codes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const ts = data.timestamp || new Date().toISOString();
  const result = stmt.run(
    data.patient_id,
    ts,
    JSON.stringify(data.symptoms),
    JSON.stringify(data.vital_signs),
    JSON.stringify(data.trigger_factors),
    data.adherence_score ?? null,
    data.computed_flag,
    JSON.stringify(data.reasoning_codes)
  );
  const row = database.prepare('SELECT * FROM symptom_entries WHERE id = ?').get(result.lastInsertRowid as number) as Record<string, unknown>;
  return parseEntryRow(row);
}

export function getRecentEntries(patientId: number, hours: number = 48): SymptomEntry[] {
  const database = getDb();
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const rows = database.prepare(
    'SELECT * FROM symptom_entries WHERE patient_id = ? AND timestamp >= ? ORDER BY timestamp DESC'
  ).all(patientId, since) as Record<string, unknown>[];
  return rows.map(parseEntryRow);
}

export function getLastEntries(patientId: number, limit: number = 5): SymptomEntry[] {
  const database = getDb();
  const rows = database.prepare(
    'SELECT * FROM symptom_entries WHERE patient_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(patientId, limit) as Record<string, unknown>[];
  return rows.map(parseEntryRow);
}

// Flag events
export function createFlagEvent(data: Omit<FlagEvent, 'id'>): FlagEvent {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO flag_events (patient_id, started_at, ended_at, level, escalated_from, resolved_by_hcp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.patient_id,
    data.started_at || new Date().toISOString(),
    data.ended_at || null,
    data.level,
    data.escalated_from || null,
    data.resolved_by_hcp ? 1 : 0
  );
  return database.prepare('SELECT * FROM flag_events WHERE id = ?').get(result.lastInsertRowid as number) as FlagEvent;
}

export function getActiveFlagEvents(): Array<FlagEvent & { patient: Patient }> {
  const database = getDb();
  const rows = database.prepare(`
    SELECT fe.*, p.name as patient_name, p.diagnosis as patient_diagnosis, p.subtype as patient_subtype
    FROM flag_events fe
    JOIN patients p ON p.id = fe.patient_id
    WHERE fe.ended_at IS NULL
    ORDER BY fe.started_at ASC
  `).all() as Record<string, unknown>[];
  return rows.map(row => ({
    id: row.id as number,
    patient_id: row.patient_id as number,
    started_at: row.started_at as string,
    ended_at: row.ended_at as string | undefined,
    level: row.level as 'RED' | 'YELLOW' | 'GREEN',
    escalated_from: row.escalated_from as string | undefined,
    resolved_by_hcp: row.resolved_by_hcp as number,
    patient: {
      id: row.patient_id as number,
      name: row.patient_name as string,
      diagnosis: row.patient_diagnosis as 'UCD' | 'MSUD' | 'OA' | 'FAOD',
      subtype: row.patient_subtype as string | undefined,
    } as Patient,
  }));
}

export function resolveFlagEvent(id: number): boolean {
  const database = getDb();
  const result = database.prepare(
    'UPDATE flag_events SET ended_at = ?, resolved_by_hcp = 1 WHERE id = ? AND ended_at IS NULL'
  ).run(new Date().toISOString(), id);
  return result.changes > 0;
}

export function getActiveFlagForPatient(patientId: number): FlagEvent | null {
  const database = getDb();
  const row = database.prepare(
    'SELECT * FROM flag_events WHERE patient_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1'
  ).get(patientId) as FlagEvent | undefined;
  return row || null;
}

// ─── Lab Results ────────────────────────────────────────────────────────────

export interface LabResult {
  id: number;
  patient_id: number;
  tested_at: string;
  test_type: string;
  test_name: string;
  value: number;
  unit: string;
  reference_low?: number;
  reference_high?: number;
  interpretation?: string;
  notes?: string;
  created_at: string;
}

export function getAllLabResults(patientId?: number): LabResult[] {
  const database = getDb();
  if (patientId) {
    return database.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY tested_at DESC').all(patientId) as LabResult[];
  }
  return database.prepare('SELECT * FROM lab_results ORDER BY tested_at DESC').all() as LabResult[];
}

export function getLabResultById(id: number): LabResult | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM lab_results WHERE id = ?').get(id) as LabResult | undefined;
  return row || null;
}

export function createLabResult(data: Omit<LabResult, 'id' | 'created_at'>): LabResult {
  const database = getDb();
  const result = database.prepare(`
    INSERT INTO lab_results (patient_id, tested_at, test_type, test_name, value, unit, reference_low, reference_high, interpretation, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.patient_id, data.tested_at, data.test_type, data.test_name,
    data.value, data.unit, data.reference_low ?? null, data.reference_high ?? null,
    data.interpretation ?? null, data.notes ?? null
  );
  return getLabResultById(result.lastInsertRowid as number)!;
}

export function updateLabResult(id: number, data: Partial<Omit<LabResult, 'id' | 'created_at'>>): LabResult | null {
  const database = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  const keys = ['patient_id','tested_at','test_type','test_name','value','unit','reference_low','reference_high','interpretation','notes'] as const;
  for (const k of keys) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (fields.length === 0) return getLabResultById(id);
  values.push(id);
  database.prepare(`UPDATE lab_results SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getLabResultById(id);
}

export function deleteLabResult(id: number): boolean {
  const database = getDb();
  return database.prepare('DELETE FROM lab_results WHERE id = ?').run(id).changes > 0;
}

// ─── Appointments ────────────────────────────────────────────────────────────

export interface Appointment {
  id: number;
  patient_id: number;
  scheduled_at: string;
  type: string;
  doctor?: string;
  department?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export function getAllAppointments(status?: string): Appointment[] {
  const database = getDb();
  if (status === 'upcoming') {
    return database.prepare(
      "SELECT * FROM appointments WHERE scheduled_at >= datetime('now') AND status = 'scheduled' ORDER BY scheduled_at ASC"
    ).all() as Appointment[];
  }
  if (status === 'past') {
    return database.prepare(
      "SELECT * FROM appointments WHERE scheduled_at < datetime('now') ORDER BY scheduled_at DESC"
    ).all() as Appointment[];
  }
  return database.prepare('SELECT * FROM appointments ORDER BY scheduled_at DESC').all() as Appointment[];
}

export function getAppointmentsByPatient(patientId: number): Appointment[] {
  const database = getDb();
  return database.prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY scheduled_at DESC').all(patientId) as Appointment[];
}

export function getAppointmentById(id: number): Appointment | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment | undefined;
  return row || null;
}

export function createAppointment(data: Omit<Appointment, 'id' | 'created_at'>): Appointment {
  const database = getDb();
  const result = database.prepare(`
    INSERT INTO appointments (patient_id, scheduled_at, type, doctor, department, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.patient_id, data.scheduled_at, data.type,
    data.doctor ?? null, data.department ?? 'Phòng khám Chuyển hóa',
    data.status ?? 'scheduled', data.notes ?? null
  );
  return getAppointmentById(result.lastInsertRowid as number)!;
}

export function updateAppointment(id: number, data: Partial<Omit<Appointment, 'id' | 'created_at'>>): Appointment | null {
  const database = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  const keys = ['patient_id','scheduled_at','type','doctor','department','status','notes'] as const;
  for (const k of keys) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (fields.length === 0) return getAppointmentById(id);
  values.push(id);
  database.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getAppointmentById(id);
}

export function getTodayAppointments(): Appointment[] {
  const database = getDb();
  return database.prepare(
    "SELECT * FROM appointments WHERE date(scheduled_at) = date('now') ORDER BY scheduled_at ASC"
  ).all() as Appointment[];
}

// ─── Dietary Prescriptions ───────────────────────────────────────────────────

export interface DietaryPrescription {
  id: number;
  patient_id: number;
  prescribed_at: string;
  prescribed_by?: string;
  protein_g_per_kg?: number;
  protein_g_total?: number;
  formula_name?: string;
  formula_ml_per_day?: number;
  special_formula?: string;
  additional_supplements: string[];
  restrictions: string[];
  meal_schedule: Record<string, string>;
  notes?: string;
  active: number;
  created_at: string;
}

function parseDietRow(row: Record<string, unknown>): DietaryPrescription {
  return {
    ...row,
    additional_supplements: JSON.parse((row.additional_supplements as string) || '[]'),
    restrictions: JSON.parse((row.restrictions as string) || '[]'),
    meal_schedule: JSON.parse((row.meal_schedule as string) || '{}'),
  } as DietaryPrescription;
}

export function getAllDietaryPrescriptions(activeOnly = true): DietaryPrescription[] {
  const database = getDb();
  const rows = activeOnly
    ? database.prepare('SELECT * FROM dietary_prescriptions WHERE active = 1 ORDER BY prescribed_at DESC').all()
    : database.prepare('SELECT * FROM dietary_prescriptions ORDER BY prescribed_at DESC').all();
  return (rows as Record<string, unknown>[]).map(parseDietRow);
}

export function getDietaryByPatient(patientId: number): DietaryPrescription[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM dietary_prescriptions WHERE patient_id = ? ORDER BY prescribed_at DESC').all(patientId) as Record<string, unknown>[];
  return rows.map(parseDietRow);
}

export function getDietaryById(id: number): DietaryPrescription | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM dietary_prescriptions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? parseDietRow(row) : null;
}

export function createDietaryPrescription(data: Omit<DietaryPrescription, 'id' | 'created_at'>): DietaryPrescription {
  const database = getDb();
  const result = database.prepare(`
    INSERT INTO dietary_prescriptions (patient_id, prescribed_at, prescribed_by, protein_g_per_kg, protein_g_total, formula_name, formula_ml_per_day, special_formula, additional_supplements, restrictions, meal_schedule, notes, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.patient_id, data.prescribed_at, data.prescribed_by ?? null,
    data.protein_g_per_kg ?? null, data.protein_g_total ?? null,
    data.formula_name ?? null, data.formula_ml_per_day ?? null,
    data.special_formula ?? null,
    JSON.stringify(data.additional_supplements || []),
    JSON.stringify(data.restrictions || []),
    JSON.stringify(data.meal_schedule || {}),
    data.notes ?? null, data.active ?? 1
  );
  return getDietaryById(result.lastInsertRowid as number)!;
}

export function updateDietaryPrescription(id: number, data: Partial<Omit<DietaryPrescription, 'id' | 'created_at'>>): DietaryPrescription | null {
  const database = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.patient_id !== undefined) { fields.push('patient_id = ?'); values.push(data.patient_id); }
  if (data.prescribed_at !== undefined) { fields.push('prescribed_at = ?'); values.push(data.prescribed_at); }
  if (data.prescribed_by !== undefined) { fields.push('prescribed_by = ?'); values.push(data.prescribed_by); }
  if (data.protein_g_per_kg !== undefined) { fields.push('protein_g_per_kg = ?'); values.push(data.protein_g_per_kg); }
  if (data.protein_g_total !== undefined) { fields.push('protein_g_total = ?'); values.push(data.protein_g_total); }
  if (data.formula_name !== undefined) { fields.push('formula_name = ?'); values.push(data.formula_name); }
  if (data.formula_ml_per_day !== undefined) { fields.push('formula_ml_per_day = ?'); values.push(data.formula_ml_per_day); }
  if (data.special_formula !== undefined) { fields.push('special_formula = ?'); values.push(data.special_formula); }
  if (data.additional_supplements !== undefined) { fields.push('additional_supplements = ?'); values.push(JSON.stringify(data.additional_supplements)); }
  if (data.restrictions !== undefined) { fields.push('restrictions = ?'); values.push(JSON.stringify(data.restrictions)); }
  if (data.meal_schedule !== undefined) { fields.push('meal_schedule = ?'); values.push(JSON.stringify(data.meal_schedule)); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }
  if (fields.length === 0) return getDietaryById(id);
  values.push(id);
  database.prepare(`UPDATE dietary_prescriptions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getDietaryById(id);
}

// ─── Medications ─────────────────────────────────────────────────────────────

export interface Medication {
  id: number;
  patient_id: number;
  drug_name: string;
  dose_mg_per_kg?: number;
  dose_total_mg?: number;
  frequency?: string;
  route?: string;
  indication?: string;
  start_date?: string;
  end_date?: string;
  active: number;
  notes?: string;
  created_at: string;
}

export function getAllMedications(activeOnly = true): Medication[] {
  const database = getDb();
  if (activeOnly) {
    return database.prepare('SELECT * FROM medications WHERE active = 1 ORDER BY created_at DESC').all() as Medication[];
  }
  return database.prepare('SELECT * FROM medications ORDER BY created_at DESC').all() as Medication[];
}

export function getMedicationsByPatient(patientId: number): Medication[] {
  const database = getDb();
  return database.prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC').all(patientId) as Medication[];
}

export function getMedicationById(id: number): Medication | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM medications WHERE id = ?').get(id) as Medication | undefined;
  return row || null;
}

export function createMedication(data: Omit<Medication, 'id' | 'created_at'>): Medication {
  const database = getDb();
  const result = database.prepare(`
    INSERT INTO medications (patient_id, drug_name, dose_mg_per_kg, dose_total_mg, frequency, route, indication, start_date, end_date, active, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.patient_id, data.drug_name,
    data.dose_mg_per_kg ?? null, data.dose_total_mg ?? null,
    data.frequency ?? null, data.route ?? 'uống',
    data.indication ?? null, data.start_date ?? null,
    data.end_date ?? null, data.active ?? 1, data.notes ?? null
  );
  return getMedicationById(result.lastInsertRowid as number)!;
}

export function updateMedication(id: number, data: Partial<Omit<Medication, 'id' | 'created_at'>>): Medication | null {
  const database = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  const keys = ['patient_id','drug_name','dose_mg_per_kg','dose_total_mg','frequency','route','indication','start_date','end_date','active','notes'] as const;
  for (const k of keys) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (fields.length === 0) return getMedicationById(id);
  values.push(id);
  database.prepare(`UPDATE medications SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getMedicationById(id);
}

export { getDb };

// ─── Staff ───────────────────────────────────────────────────────────────────

export interface Staff {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'nurse';
  username: string;
  department: string;
  phone?: string;
  avatar_initials?: string;
  active: number;
  created_at: string;
}

export function createStaff(data: Omit<Staff, 'id' | 'created_at'> & { password_hash: string }): Staff {
  const database = getDb();
  const result = database.prepare(`
    INSERT INTO staff (name, role, username, password_hash, department, phone, avatar_initials, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name, data.role, data.username, data.password_hash,
    data.department || 'Phòng khám Chuyển hóa Bẩm sinh',
    data.phone ?? null, data.avatar_initials ?? null, data.active ?? 1
  );
  const row = database.prepare('SELECT * FROM staff WHERE id = ?').get(result.lastInsertRowid as number) as Staff;
  return row;
}

export function getStaffByUsername(username: string): (Staff & { password_hash: string }) | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM staff WHERE username = ? AND active = 1').get(username) as (Staff & { password_hash: string }) | undefined;
  return row || null;
}

export function getAllStaff(): Staff[] {
  const database = getDb();
  return database.prepare('SELECT id, name, role, username, department, phone, avatar_initials, active, created_at FROM staff ORDER BY created_at DESC').all() as Staff[];
}

export function updateStaffPassword(id: number, password_hash: string): void {
  const database = getDb();
  database.prepare('UPDATE staff SET password_hash = ? WHERE id = ?').run(password_hash, id);
}

export function deactivateStaff(id: number): void {
  const database = getDb();
  database.prepare('UPDATE staff SET active = 0 WHERE id = ?').run(id);
}

export function updateStaff(id: number, data: Partial<Pick<Staff, 'name' | 'department' | 'phone'>>): Staff | null {
  const database = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.department !== undefined) { fields.push('department = ?'); values.push(data.department); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (fields.length === 0) return database.prepare('SELECT id, name, role, username, department, phone, avatar_initials, active, created_at FROM staff WHERE id = ?').get(id) as Staff | null;
  values.push(id);
  database.prepare(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return database.prepare('SELECT id, name, role, username, department, phone, avatar_initials, active, created_at FROM staff WHERE id = ?').get(id) as Staff | null;
}

// ─── Patient Auth Helpers ─────────────────────────────────────────────────────

export function updatePatientLoginInfo(id: number, record_number: string, login_phone: string, password_hash?: string): void {
  const database = getDb();
  if (password_hash) {
    database.prepare('UPDATE patients SET record_number = ?, login_phone = ?, password_hash = ? WHERE id = ?').run(record_number, login_phone, password_hash, id);
  } else {
    database.prepare('UPDATE patients SET record_number = ?, login_phone = ? WHERE id = ?').run(record_number, login_phone, id);
  }
}

export function getPatientByLoginPhone(phone: string): { id: number; name: string; login_phone: string; record_number: string; password_hash: string | null } | null {
  const database = getDb();
  const row = database.prepare(
    'SELECT id, name, login_phone, record_number, password_hash FROM patients WHERE login_phone = ?'
  ).get(phone) as { id: number; name: string; login_phone: string; record_number: string; password_hash: string | null } | undefined;
  return row || null;
}

// ─── Clinic Sessions ──────────────────────────────────────────────────────────

export interface ClinicSession {
  id: number;
  session_date: string;
  doctor_name: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export function getClinicSessionsByMonth(year: number, month: number): ClinicSession[] {
  const database = getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return database.prepare(
    "SELECT * FROM clinic_sessions WHERE session_date LIKE ? ORDER BY session_date ASC"
  ).all(`${prefix}-%`) as ClinicSession[];
}

export function upsertClinicSession(
  session_date: string,
  doctor_name: string | null,
  notes: string | null,
  created_by: number | null
): ClinicSession {
  const database = getDb();
  database.prepare(`
    INSERT INTO clinic_sessions (session_date, doctor_name, notes, created_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_date) DO UPDATE SET
      doctor_name = excluded.doctor_name,
      notes = excluded.notes,
      created_by = excluded.created_by
  `).run(session_date, doctor_name, notes, created_by);
  return database.prepare('SELECT * FROM clinic_sessions WHERE session_date = ?').get(session_date) as ClinicSession;
}

export function deleteClinicSession(session_date: string): boolean {
  const database = getDb();
  return database.prepare('DELETE FROM clinic_sessions WHERE session_date = ?').run(session_date).changes > 0;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const database = getDb();
  const row = database.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const database = getDb();
  database.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime(\'now\')').run(key, value);
}
