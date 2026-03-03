import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// ── Obtén tu API key gratuita en https://www.football-data.org/client/register ──
const API_KEY = 'TU_API_KEY_AQUI';
const BASE_URL = 'https://api.football-data.org/v4';

export interface MatchTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
}

export interface FootballMatch {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
  minute?: number;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

export interface LeagueMatches {
  code: string;
  name: string;
  flag: string;
  matches: FootballMatch[];
  loading: boolean;
  error: boolean;
}

export const LEAGUES: { code: string; name: string; flag: string }[] = [
  { code: 'PD',  name: 'La Liga',        flag: 'es' },
  { code: 'PL',  name: 'Premier League', flag: 'gb-eng' },
  { code: 'BL1', name: 'Bundesliga',     flag: 'de' },
  { code: 'SA',  name: 'Serie A',        flag: 'it' },
  { code: 'FL1', name: 'Ligue 1',        flag: 'fr' },
];

@Injectable({ providedIn: 'root' })
export class FootballService {
  private http = inject(HttpClient);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'X-Auth-Token': API_KEY });
  }

  getMatchesByLeague(code: string): Observable<FootballMatch[]> {
    const today = new Date().toISOString().split('T')[0];
    const url = `${BASE_URL}/competitions/${code}/matches?dateFrom=${today}&dateTo=${today}`;

    return this.http.get<{ matches: FootballMatch[] }>(url, { headers: this.headers }).pipe(
      map(res => res.matches ?? []),
      catchError(() => of([]))
    );
  }
}
