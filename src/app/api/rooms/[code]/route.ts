import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RoomStatus } from '@prisma/client';

type RouteParams = { params: Promise<{ code: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        people: {
          include: { scores: true },
          orderBy: { createdAt: 'asc' },
        },
        teams: {
          include: {
            members: {
              include: { scores: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: room.id,
      code: room.code,
      name: room.name,
      teamSize: room.teamSize,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      people: room.people.map((p) => ({
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
      teams: room.teams.map((t) => ({
        id: t.id,
        name: t.name,
        order: t.order,
        members: t.members.map((m) => ({
          id: m.id,
          name: m.name,
          addedVia: m.addedVia,
          createdAt: m.createdAt,
          scores: m.scores.map((s) => ({
            skillId: s.skillId,
            score: s.score,
          })),
        })),
      })),
    });
  } catch (error) {
    console.error('GET /api/rooms/[code] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 },
    );
  }
}

const VALID_STATUSES: RoomStatus[] = ['OPEN', 'LOCKED', 'DONE'];

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { status, teamSize, name } = body;

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Validate inputs
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    if (teamSize !== undefined && (typeof teamSize !== 'number' || teamSize < 2)) {
      return NextResponse.json(
        { error: 'Team size must be a number >= 2' },
        { status: 400 },
      );
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Name must be a non-empty string' },
        { status: 400 },
      );
    }

    const updated = await prisma.room.update({
      where: { code },
      data: {
        ...(status !== undefined && { status }),
        ...(teamSize !== undefined && { teamSize }),
        ...(name !== undefined && { name: name.trim() }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      teamSize: updated.teamSize,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('PATCH /api/rooms/[code] error:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 },
    );
  }
}
