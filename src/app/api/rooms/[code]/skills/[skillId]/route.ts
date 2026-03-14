import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = { params: Promise<{ code: string; skillId: string }> };

// DELETE — Remove a skill from the room
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code, skillId } = await params;

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const skill = await prisma.roomSkill.findUnique({ where: { id: skillId } });
    if (!skill || skill.roomId !== room.id) {
      return NextResponse.json({ error: 'Skill not found in this room' }, { status: 404 });
    }

    // Delete the skill and associated scores
    await prisma.$transaction(async (tx) => {
      await tx.score.deleteMany({ where: { skillId } });
      await tx.roomSkill.delete({ where: { id: skillId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/rooms/[code]/skills/[skillId] error:', error);
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 });
  }
}
