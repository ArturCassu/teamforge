import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = { params: Promise<{ code: string; personId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code, personId } = await params;

    // Verify room exists
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify person exists and belongs to this room
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person || person.roomId !== room.id) {
      return NextResponse.json(
        { error: 'Person not found in this room' },
        { status: 404 },
      );
    }

    // Delete person (scores cascade via onDelete: Cascade in schema)
    await prisma.person.delete({ where: { id: personId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/rooms/[code]/people/[personId] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete person' },
      { status: 500 },
    );
  }
}
