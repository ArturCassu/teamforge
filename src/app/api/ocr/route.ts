import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

function getClient(): GoogleGenAI | null {
  if (!GOOGLE_KEY) return null;
  return new GoogleGenAI({ apiKey: GOOGLE_KEY });
}

async function askGemini(client: GoogleGenAI, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      systemInstruction: systemPrompt,
    },
    contents: userPrompt,
  });

  const text = response.text;
  if (!text) throw new Error('Empty AI response');
  return text;
}

// POST /api/ocr — AI-enhanced OCR parsing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, rawText, skills } = body as {
      mode: 'scores' | 'skills';
      rawText: string;
      skills?: { id: string; name: string }[];
    };

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'rawText is required' }, { status: 400 });
    }

    const client = getClient();
    if (!client) {
      return NextResponse.json({ error: 'AI not configured (set GOOGLE_API_KEY)' }, { status: 501 });
    }

    if (mode === 'scores') {
      return await parseScores(client, rawText, skills ?? []);
    } else if (mode === 'skills') {
      return await parseSkillNames(client, rawText);
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/ocr error:', error);
    return NextResponse.json({ error: 'OCR parsing failed' }, { status: 500 });
  }
}

// ─── Parse scores from form image text ─────────────────────────
async function parseScores(
  client: GoogleGenAI,
  rawText: string,
  skills: { id: string; name: string }[],
) {
  const skillList = skills.map((s) => `  - id: "${s.id}", name: "${s.name}"`).join('\n');

  const systemPrompt = `You extract structured data from OCR text of a filled skill assessment form.

The form has a person's name and scores (0-10) for various skills.
OCR text may have typos, merged words, or formatting artifacts.

Return JSON:
{
  "name": "person's name or null",
  "scores": [{ "skillId": "...", "skillName": "matched skill", "score": 0-10 }],
  "unmatched": ["skill names you couldn't find scores for"]
}

Rules:
- Match skill names flexibly (ignore accents, typos, abbreviations)
- Score must be an integer 0-10
- If a skill appears with a number nearby, that's likely the score
- If you can't confidently match a skill, put it in "unmatched"
- For name, look for patterns like "Nome:", "Name:", or the first proper name line`;

  const userPrompt = `OCR text:\n\`\`\`\n${rawText.slice(0, 3000)}\n\`\`\`\n\nSkills to match:\n${skillList}`;

  const content = await askGemini(client, systemPrompt, userPrompt);
  const parsed = JSON.parse(content);
  return NextResponse.json(parsed);
}

// ─── Parse skill names from image text ─────────────────────────
async function parseSkillNames(client: GoogleGenAI, rawText: string) {
  const systemPrompt = `You extract skill/competency names from OCR text.

The text comes from a photo of a list, whiteboard, post-its, or document listing skills or competencies.
OCR may have typos, merged words, numbers mixed in.

Return JSON:
{
  "skills": ["Skill Name 1", "Skill Name 2", ...]
}

Rules:
- Extract only skill/competency names, NOT headers, titles, instructions, or noise
- Fix obvious OCR typos (e.g. "Comunlcação" → "Comunicação", "Confiaça" → "Confiança")
- Capitalize properly (Title Case for Portuguese skills)
- Remove numbering, bullets, dashes from names
- Remove trailing scores/numbers
- Each skill should be concise (1-4 words typically)
- Deduplicate (same skill with different typos = keep one clean version)
- Keep the original language (usually Portuguese)
- Return empty array if no skills found`;

  const userPrompt = `OCR text:\n\`\`\`\n${rawText.slice(0, 3000)}\n\`\`\``;

  const content = await askGemini(client, systemPrompt, userPrompt);
  const parsed = JSON.parse(content);
  return NextResponse.json(parsed);
}
