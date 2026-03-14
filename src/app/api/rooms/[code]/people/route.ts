import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SKILLS } from '@/lib/skills';

type RouteParams = { params: Promise<{ code: string }> };

const validSkillIds = new Set(SKILLS.map((s) => s.id));

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const people = await prisma.person.findMany({
      where: { roomId: room.id },
      include: { scores: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      people.map((p) => ({
        id: p.id,
        name: p.name,
        addedVia: p.addedVia,
        createdAt: p.createdAt,
        teamId: p.teamId,
        scores: p.scores.map((s) => ({
          skillId: s.skillId,
          score: s.score,
        })),
      })),
    );
  } catch (error) {
    console.error('GET /api/rooms/[code]/people error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch people' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { name, scores, addedVia } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 },
      );
    }

    // Validate scores
    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: 'Scores array is required and must not be empty' },
        { status: 400 },
      );
    }

    for (const s of scores) {
      if (!s.skillId || !validSkillIds.has(s.skillId)) {
        return NextResponse.json(
          { error: `Invalid skillId: ${s.skillId}` },
          { status: 400 },
        );
      }
      if (typeof s.score !== 'number' || s.score < 1 || s.score > 10) {
        return NextResponse.json(
          { error: `Score must be a number between 1 and 10 (got ${s.score} for ${s.skillId})` },
          { status: 400 },
        );
      }
    }

    // Validate addedVia
    const via = addedVia ?? 'manual';
    if (!['manual', 'ocr'].includes(via)) {
      return NextResponse.json(
        { error: 'addedVia must be "manual" or "ocr"' },
        { status: 400 },
      );
    }

    // Find room
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Create person + scores in a transaction
    const person = await prisma.$transaction(async (tx) => {
      const created = await tx.person.create({
        data: {
          name: name.trim(),
          addedVia: via,
          roomId: room.id,
          scores: {
            create: scores.map((s: { skillId: string; score: number }) => ({
              skillId: s.skillId,
              score: Math.round(s.score),
            })),
          },
        },
        include: { scores: true },
      });
      return created;
    });

    return NextResponse.json(
      {
        id: person.id,
        name: person.name,
        addedVia: person.addedVia,
        createdAt: person.createdAt,
        teamId: person.teamId,
        scores: person.scores.map((s) => ({
          skillId: s.skillId,
          score: s.score,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/rooms/[code]/people error:', error);
    return NextResponse.json(
      { error: 'Failed to add person' },
      { status: 500 },
    );
  }
}
