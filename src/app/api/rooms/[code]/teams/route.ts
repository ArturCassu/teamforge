import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildTeams } from '@/lib/team-builder';
import type { Person as InMemoryPerson, RoomSkill } from '@/lib/types';

type RouteParams = { params: Promise<{ code: string }> };

async function findRoomByCode(code: string) {
  return prisma.room.findUnique({
    where: { code },
    include: { skills: { orderBy: { order: 'asc' } } },
  });
}

async function fetchTeamsForRoom(roomId: string) {
  const teams = await prisma.team.findMany({
    where: { roomId },
    include: {
      members: {
        include: { scores: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  return teams.map((t) => ({
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
  }));
}

// POST — Build teams
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    const room = await findRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const dbPeople = await prisma.person.findMany({
      where: { roomId: room.id },
      include: { scores: true },
      orderBy: { createdAt: 'asc' },
    });

    if (dbPeople.length === 0) {
      return NextResponse.json(
        { error: 'No people in room to form teams' },
        { status: 400 },
      );
    }

    const inMemoryPeople: InMemoryPerson[] = dbPeople.map((p) => ({
      id: p.id,
      name: p.name,
      scores: p.scores.map((s) => ({
        skillId: s.skillId,
        score: s.score,
      })),
      addedVia: p.addedVia as 'manual' | 'ocr',
      createdAt: p.createdAt.getTime(),
    }));

    // Pass room skills to the builder
    const roomSkills: RoomSkill[] = room.skills.map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
    }));

    const builtTeams = buildTeams(inMemoryPeople, room.teamSize, roomSkills);

    await prisma.$transaction(async (tx) => {
      await tx.person.updateMany({
        where: { roomId: room.id },
        data: { teamId: null },
      });
      await tx.team.deleteMany({ where: { roomId: room.id } });

      for (let i = 0; i < builtTeams.length; i++) {
        const bt = builtTeams[i];
        const team = await tx.team.create({
          data: {
            name: `Time ${i + 1}`,
            order: i,
            roomId: room.id,
          },
        });

        const memberIds = bt.members.map((m) => m.id);
        if (memberIds.length > 0) {
          await tx.person.updateMany({
            where: { id: { in: memberIds } },
            data: { teamId: team.id },
          });
        }
      }
    });

    const teams = await fetchTeamsForRoom(room.id);
    return NextResponse.json(teams, { status: 201 });
  } catch (error) {
    console.error('POST /api/rooms/[code]/teams error:', error);
    return NextResponse.json(
      { error: 'Failed to build teams' },
      { status: 500 },
    );
  }
}

// PATCH — Move person between teams
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { personId, targetTeamId } = body;

    if (!personId || typeof personId !== 'string') {
      return NextResponse.json({ error: 'personId is required' }, { status: 400 });
    }
    if (!targetTeamId || typeof targetTeamId !== 'string') {
      return NextResponse.json({ error: 'targetTeamId is required' }, { status: 400 });
    }

    const room = await findRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.roomId !== room.id) {
      return NextResponse.json({ error: 'Person not found in this room' }, { status: 404 });
    }

    const targetTeam = await prisma.team.findUnique({ where: { id: targetTeamId } });
    if (!targetTeam || targetTeam.roomId !== room.id) {
      return NextResponse.json({ error: 'Target team not found in this room' }, { status: 404 });
    }

    await prisma.person.update({
      where: { id: personId },
      data: { teamId: targetTeamId },
    });

    const teams = await fetchTeamsForRoom(room.id);
    return NextResponse.json(teams);
  } catch (error) {
    console.error('PATCH /api/rooms/[code]/teams error:', error);
    return NextResponse.json({ error: 'Failed to move person' }, { status: 500 });
  }
}

// DELETE — Clear all teams
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    const room = await findRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.person.updateMany({
        where: { roomId: room.id },
        data: { teamId: null },
      });
      await tx.team.deleteMany({ where: { roomId: room.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/rooms/[code]/teams error:', error);
    return NextResponse.json({ error: 'Failed to clear teams' }, { status: 500 });
  }
}
