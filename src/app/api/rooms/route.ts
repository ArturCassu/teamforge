import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique room code');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, teamSize, skills } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 },
      );
    }

    if (teamSize !== undefined && (typeof teamSize !== 'number' || teamSize < 2)) {
      return NextResponse.json(
        { error: 'Team size must be a number >= 2' },
        { status: 400 },
      );
    }

    // Validate skills
    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json(
        { error: 'At least one skill is required' },
        { status: 400 },
      );
    }

    const skillNames: string[] = skills
      .filter((s: unknown) => typeof s === 'string' && s.trim().length > 0)
      .map((s: string) => s.trim());

    if (skillNames.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid skill name is required' },
        { status: 400 },
      );
    }

    // Deduplicate
    const uniqueSkills = [...new Set(skillNames)];

    const code = await generateUniqueCode();

    const room = await prisma.room.create({
      data: {
        code,
        name: name.trim(),
        ...(teamSize !== undefined && { teamSize }),
        skills: {
          create: uniqueSkills.map((skillName, index) => ({
            name: skillName,
            order: index,
          })),
        },
      },
      include: {
        skills: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(
      {
        id: room.id,
        code: room.code,
        name: room.name,
        teamSize: room.teamSize,
        status: room.status,
        skills: room.skills.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
        })),
        createdAt: room.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/rooms error:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 },
    );
  }
}
