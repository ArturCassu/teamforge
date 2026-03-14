import type { SkillScore } from './types';

// ---------------------------------------------------------------------------
// API response types (match what the routes actually return)
// ---------------------------------------------------------------------------

export interface RoomBasic {
  id: string;
  code: string;
  name: string;
  teamSize: number;
  status: 'OPEN' | 'LOCKED' | 'DONE';
  createdAt: string;
  updatedAt?: string;
}

export interface PersonData {
  id: string;
  name: string;
  addedVia: 'manual' | 'ocr';
  createdAt: string;
  teamId?: string | null;
  scores: SkillScore[];
}

export interface TeamData {
  id: string;
  name: string;
  order: number;
  members: PersonData[];
}

export interface RoomData extends RoomBasic {
  people: PersonData[];
  teams: TeamData[];
}

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? 'Request failed', res.status);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API client functions
// ---------------------------------------------------------------------------

export async function createRoom(
  name: string,
  teamSize?: number,
): Promise<RoomBasic> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, teamSize }),
  });
  return handleResponse<RoomBasic>(res);
}

export async function getRoom(code: string): Promise<RoomData> {
  const res = await fetch(`/api/rooms/${code}`);
  return handleResponse<RoomData>(res);
}

export async function addPerson(
  code: string,
  data: { name: string; scores: SkillScore[]; addedVia?: 'manual' | 'ocr' },
): Promise<PersonData> {
  const res = await fetch(`/api/rooms/${code}/people`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<PersonData>(res);
}

export async function removePerson(
  code: string,
  personId: string,
): Promise<void> {
  const res = await fetch(`/api/rooms/${code}/people/${personId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? 'Failed to remove person', res.status);
  }
}

export async function buildTeams(code: string): Promise<TeamData[]> {
  const res = await fetch(`/api/rooms/${code}/teams`, {
    method: 'POST',
  });
  return handleResponse<TeamData[]>(res);
}

export async function movePerson(
  code: string,
  personId: string,
  targetTeamId: string,
): Promise<TeamData[]> {
  const res = await fetch(`/api/rooms/${code}/teams`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, targetTeamId }),
  });
  return handleResponse<TeamData[]>(res);
}

export async function clearTeams(code: string): Promise<void> {
  const res = await fetch(`/api/rooms/${code}/teams`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? 'Failed to clear teams', res.status);
  }
}

export async function updateRoom(
  code: string,
  updates: Partial<Pick<RoomBasic, 'status' | 'teamSize' | 'name'>>,
): Promise<RoomBasic> {
  const res = await fetch(`/api/rooms/${code}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<RoomBasic>(res);
}
