import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ─── Prompt ────────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `Bạn là AI chuyên đọc phiếu xét nghiệm y tế. Hãy trích xuất TẤT CẢ các chỉ số xét nghiệm từ hình ảnh này.

Trả về JSON theo đúng format sau (không có text ngoài JSON):
{
  "lab_date": "YYYY-MM-DD hoặc null nếu không rõ",
  "lab_name": "tên phòng xét nghiệm hoặc bệnh viện nếu có",
  "patient_name": "tên bệnh nhân nếu có trên phiếu",
  "results": [
    {
      "test_name": "tên chỉ số tiếng Việt",
      "test_name_en": "tên chỉ số tiếng Anh/viết tắt",
      "value": số (float),
      "unit": "đơn vị đo",
      "ref_low": số hoặc null,
      "ref_high": số hoặc null,
      "ref_text": "khoảng tham chiếu gốc trên phiếu nếu có, ví dụ '3.9-6.1' hoặc '< 40'",
      "flag": "H" hoặc "L" hoặc null (H=cao, L=thấp, dựa theo phiếu gốc nếu có đánh dấu)
    }
  ]
}

Quy tắc quan trọng:
- Trích xuất TẤT CẢ chỉ số có trên phiếu, không bỏ sót
- value phải là số thực, không phải chuỗi
- Nếu giá trị là ">50" hoặc "<0.1", hãy ước tính số gần nhất (51 hoặc 0.05)
- unit phải chính xác từ phiếu (mmol/L, µmol/L, U/L, g/dL, %, 10^9/L, etc.)
- Nếu không đọc được phiếu xét nghiệm, trả về {"error": "Không thể đọc phiếu xét nghiệm"}`;

// ─── Reference ranges ─────────────────────────────────────────────────────────

const REFERENCE_RANGES: Record<string, { low: number; high: number; criticalLow?: number; criticalHigh?: number }> = {
  glucose: { low: 3.9, high: 6.1, criticalLow: 2.5, criticalHigh: 25 },
  NH3: { low: 10, high: 80, criticalHigh: 200 },
  leucine: { low: 70, high: 200 },
  isoleucine: { low: 40, high: 100 },
  valine: { low: 100, high: 300 },
  lactate: { low: 0.5, high: 2.2, criticalHigh: 5 },
  CK: { low: 30, high: 170, criticalHigh: 1000 },
};

// ─── Type mapping ─────────────────────────────────────────────────────────────

const typeMap: Record<string, string> = {
  glucose: 'glucose',
  'đường huyết': 'glucose',
  'duong huyet': 'glucose',
  nh3: 'NH3',
  ammonia: 'NH3',
  amoniac: 'NH3',
  leucine: 'leucine',
  isoleucine: 'isoleucine',
  valine: 'valine',
  ast: 'LFT',
  alt: 'LFT',
  sgot: 'LFT',
  sgpt: 'LFT',
  creatinine: 'kidney',
  urea: 'kidney',
  ure: 'kidney',
  lactate: 'lactate',
  lactat: 'lactate',
  ck: 'CK',
  'creatine kinase': 'CK',
  hemoglobin: 'CBC',
  hematocrit: 'CBC',
  wbc: 'CBC',
  plt: 'CBC',
  sodium: 'plasma_amino_acids',
  potassium: 'plasma_amino_acids',
  calcium: 'plasma_amino_acids',
  phosphorus: 'plasma_amino_acids',
};

function getSuggestedType(testName: string, testNameEn: string): string {
  const name = `${testName} ${testNameEn}`.toLowerCase();
  for (const [key, val] of Object.entries(typeMap)) {
    if (name.includes(key)) return val;
  }
  return 'other';
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY chưa được cấu hình' }, { status: 500 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'Không tìm thấy file ảnh' }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
    type AllowedMime = typeof allowedTypes[number];
    const mimeType = imageFile.type as AllowedMime;
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Định dạng file không hỗ trợ: ${imageFile.type}. Chỉ chấp nhận JPEG, PNG, WebP, GIF.` },
        { status: 400 },
      );
    }

    // Convert to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Call Claude Vision
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Data,
              },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON – strip markdown fences if any
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawText.trim();

    let parsed: {
      error?: string;
      lab_date?: string | null;
      lab_name?: string;
      patient_name?: string;
      results?: Array<{
        test_name: string;
        test_name_en: string;
        value: number;
        unit: string;
        ref_low: number | null;
        ref_high: number | null;
        ref_text: string;
        flag: 'H' | 'L' | null;
      }>;
    };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'Claude không trả về JSON hợp lệ', raw: rawText }, { status: 502 });
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    // Enrich results with suggested_type
    const results = (parsed.results || []).map(r => ({
      ...r,
      value: Number(r.value),
      ref_low: r.ref_low !== null && r.ref_low !== undefined ? Number(r.ref_low) : null,
      ref_high: r.ref_high !== null && r.ref_high !== undefined ? Number(r.ref_high) : null,
      flag: r.flag ?? null,
      suggested_type: getSuggestedType(r.test_name, r.test_name_en),
    }));

    return NextResponse.json({
      success: true,
      lab_date: parsed.lab_date ?? null,
      lab_name: parsed.lab_name ?? null,
      patient_name: parsed.patient_name ?? null,
      results,
    });
  } catch (err) {
    console.error('POST /api/lab-extract error:', err);
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: `Lỗi phân tích phiếu xét nghiệm: ${message}` }, { status: 500 });
  }
}
