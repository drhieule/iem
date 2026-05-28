import { NextRequest, NextResponse } from 'next/server';
import { getPatientById, createSymptomEntry, getRecentEntries, createFlagEvent, getActiveFlagForPatient, resolveFlagEvent } from '@/lib/db';
import { evaluateFlag } from '@/lib/flag-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, symptoms, vital_signs, trigger_factors, adherence_score } = body;

    if (!patient_id) {
      return NextResponse.json({ error: 'Thiếu patient_id' }, { status: 400 });
    }

    const patient = getPatientById(Number(patient_id));
    if (!patient) {
      return NextResponse.json({ error: 'Không tìm thấy bệnh nhân' }, { status: 404 });
    }

    // Get recent history for escalation logic
    const history = getRecentEntries(Number(patient_id), 48);

    // Build entry without flag yet (for evaluation)
    const tempEntry = {
      patient_id: Number(patient_id),
      symptoms: symptoms || [],
      vital_signs: vital_signs || {},
      trigger_factors: trigger_factors || [],
      adherence_score: adherence_score !== undefined ? Number(adherence_score) : undefined,
      computed_flag: 'GREEN' as 'RED' | 'YELLOW' | 'GREEN',
      reasoning_codes: [] as string[],
      timestamp: new Date().toISOString(),
    };

    // Run flag engine
    const flagResult = evaluateFlag(patient, tempEntry, history);

    const entryData = {
      ...tempEntry,
      computed_flag: flagResult.flag as 'RED' | 'YELLOW' | 'GREEN',
      reasoning_codes: flagResult.reasoning,
    };

    // Save entry
    const savedEntry = createSymptomEntry(entryData);

    // Handle flag events
    const activeFlag = getActiveFlagForPatient(Number(patient_id));

    if (flagResult.flag === 'RED') {
      // If no active RED flag, create one
      if (!activeFlag || activeFlag.level !== 'RED') {
        if (activeFlag) {
          // Resolve existing YELLOW before creating RED
          resolveFlagEvent(activeFlag.id);
        }
        createFlagEvent({
          patient_id: Number(patient_id),
          started_at: new Date().toISOString(),
          level: 'RED',
          escalated_from: activeFlag?.level,
          resolved_by_hcp: 0,
        });
      }
    } else if (flagResult.flag === 'YELLOW') {
      // If no active flag or active flag is GREEN, create YELLOW
      if (!activeFlag) {
        createFlagEvent({
          patient_id: Number(patient_id),
          started_at: new Date().toISOString(),
          level: 'YELLOW',
          resolved_by_hcp: 0,
        });
      }
      // If active is RED, don't auto-downgrade (only NVYT can)
    } else if (flagResult.flag === 'GREEN') {
      // Only auto-resolve YELLOW flags, not RED (RED requires NVYT)
      if (activeFlag && activeFlag.level === 'YELLOW') {
        resolveFlagEvent(activeFlag.id);
      }
      // RED flag is never auto-resolved
    }

    return NextResponse.json({
      entry: savedEntry,
      flag: flagResult.flag,
      reasoning: flagResult.reasoning,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/checkin error:', error);
    return NextResponse.json({ error: 'Lỗi lưu thông tin triệu chứng' }, { status: 500 });
  }
}
