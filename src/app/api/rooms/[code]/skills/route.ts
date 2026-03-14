import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = { params: Promise<{ code: string }> };

// POST — Add a skill to the room
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Skill name is required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: { skills: true },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check duplicate
    const exists = room.skills.some(
      (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (exists) {
      return NextResponse.json(
        { error: 'Skill with this name already exists in the room' },
        { status: 409 },
      );
    }

    const maxOrder = room.skills.reduce((max, s) => Math.max(max, s.order), -1);

    const skill = await prisma.roomSkill.create({
      data: {
        name: name.trim(),
        order: maxOrder + 1,
        roomId: room.id,
      },
    });

    return NextResponse.json(
      { id: skill.id, name: skill.name, order: skill.order },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/rooms/[code]/skills error:', error);
    return NextResponse.json({ error: 'Failed to add skill' }, { status: 500 });
  }
}
