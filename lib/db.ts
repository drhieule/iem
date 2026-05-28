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
  `);
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

export { getDb };
