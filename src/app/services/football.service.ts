import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const PROXY_URL = 'http://localhost/4bito/4bito-api/football';

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

  getMatchesByLeague(code: string): Observable<FootballMatch[]> {
    const today = new Date().toISOString().split('T')[0];
    const url = `${PROXY_URL}/matches.php?competition=${code}&dateFrom=${today}&dateTo=${today}`;

    return this.http.get<{ matches: FootballMatch[] }>(url).pipe(
      map(res => res.matches ?? []),
      catchError(() => of([]))
    );
  }
}
