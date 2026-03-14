'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Person, Team } from './types';

interface AppState {
  people: Person[];
  teams: Team[];
  teamSize: number;
}

interface AppContextType extends AppState {
  addPerson: (person: Person) => void;
  removePerson: (id: string) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  setTeams: (teams: Team[]) => void;
  setTeamSize: (size: number) => void;
  clearAll: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    people: [],
    teams: [],
    teamSize: 5,
  });

  const addPerson = useCallback((person: Person) => {
    setState((prev) => ({ ...prev, people: [...prev.people, person], teams: [] }));
  }, []);

  const removePerson = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      people: prev.people.filter((p) => p.id !== id),
      teams: [],
    }));
  }, []);

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    setState((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      teams: [],
    }));
  }, []);

  const setTeams = useCallback((teams: Team[]) => {
    setState((prev) => ({ ...prev, teams }));
  }, []);

  const setTeamSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, teamSize: size, teams: [] }));
  }, []);

  const clearAll = useCallback(() => {
    setState({ people: [], teams: [], teamSize: 5 });
  }, []);

  return (
    <AppContext.Provider
      value={{ ...state, addPerson, removePerson, updatePerson, setTeams, setTeamSize, clearAll }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
