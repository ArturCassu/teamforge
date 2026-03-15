import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

function getClient(): OpenAI | null {
  if (!OPENAI_KEY) return null;
  return new OpenAI({ apiKey: OPENAI_KEY });
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
      return NextResponse.json({ error: 'AI not configured' }, { status: 501 });
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
  client: OpenAI,
  rawText: string,
  skills: { id: string; name: string }[],
) {
  const skillList = skills.map((s) => `  - id: "${s.id}", name: "${s.name}"`).join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You extract structured data from OCR text of a filled skill assessment form.

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
- For name, look for patterns like "Nome:", "Name:", or the first proper name line`,
      },
      {
        role: 'user',
        content: `OCR text:\n\`\`\`\n${rawText.slice(0, 3000)}\n\`\`\`\n\nSkills to match:\n${skillList}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
  }

  const parsed = JSON.parse(content);
  return NextResponse.json(parsed);
}

// ─── Parse skill names from image text ─────────────────────────
async function parseSkillNames(client: OpenAI, rawText: string) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You extract skill/competency names from OCR text.

The text comes from a photo of a list, whiteboard, post-its, or document listing skills or competencies.
OCR may have typos, merged words, numbers mixed in.

Return JSON:
{
  "skills": ["Skill Name 1", "Skill Name 2", ...]
}

Rules:
- Extract only skill/competency names, NOT headers, titles, instructions, or noise
- Fix obvious OCR typos (e.g. "Comunlcação" → "Comunicação", "Llderança" → "Liderança")
- Capitalize properly (Title Case for Portuguese skills)
- Remove numbering, bullets, dashes from names
- Remove trailing scores/numbers
- Each skill should be concise (1-4 words typically)
- Deduplicate (same skill with different typos = keep one clean version)
- Keep the original language (usually Portuguese)
- Return empty array if no skills found`,
      },
      {
        role: 'user',
        content: `OCR text:\n\`\`\`\n${rawText.slice(0, 3000)}\n\`\`\``,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
  }

  const parsed = JSON.parse(content);
  return NextResponse.json(parsed);
}
