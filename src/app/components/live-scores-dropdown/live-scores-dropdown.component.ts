import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FootballService,
  LeagueMatches,
  FootballMatch,
  LEAGUES,
} from '../../services/football.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-live-scores-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-scores-dropdown.component.html',
  styleUrl: './live-scores-dropdown.component.css',
})
export class LiveScoresDropdownComponent implements OnInit, OnDestroy {
  private footballService = inject(FootballService);
  private elementRef      = inject(ElementRef);
  private cdr             = inject(ChangeDetectorRef);

  open           = false;
  activeLeague: string | null = null;
  leagues: LeagueMatches[] = LEAGUES.map(l => ({
    ...l,
    matches: [],
    loading: true,
    error: false,
  }));

  private pollSubs: Subscription[] = [];

  get anyLive(): boolean {
    return this.leagues.some(l => l.matches.some(m => this.isLive(m)));
  }

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollSubs.forEach(s => s.unsubscribe());
  }

  toggle(): void {
    this.open = !this.open;
  }

  toggleLeague(code: string): void {
    this.activeLeague = this.activeLeague === code ? null : code;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  // ── Estado del partido ─────────────────────────────────────────────────
  isLive(m: FootballMatch): boolean {
    return m.status === 'IN_PLAY' || m.status === 'PAUSED';
  }

  statusLabel(m: FootballMatch): string {
    switch (m.status) {
      case 'IN_PLAY': return 'LIVE';
      case 'PAUSED':  return 'HT';
      case 'FINISHED': return 'FT';
      default:         return 'PRE';
    }
  }

  scoreDisplay(m: FootballMatch): string {
    const home = m.score.fullTime.home;
    const away = m.score.fullTime.away;
    if (home === null || away === null) return '- : -';
    return `${home} : ${away}`;
  }

  liveCount(league: LeagueMatches): number {
    return league.matches.filter(m => this.isLive(m)).length;
  }

  shortName(team: { shortName: string; tla: string; name: string }): string {
    return team.shortName || team.tla || team.name;
  }

  // ── Polling ────────────────────────────────────────────────────────────
  private startPolling(): void {
    this.leagues.forEach((league, idx) => {
      const sub = interval(60_000).pipe(
        startWith(0),
        switchMap(() => this.footballService.getMatchesByLeague(league.code))
      ).subscribe({
        next: matches => {
          this.leagues[idx].matches = matches;
          this.leagues[idx].loading = false;
          this.leagues[idx].error   = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.leagues[idx].loading = false;
          this.leagues[idx].error   = true;
          this.cdr.detectChanges();
        },
      });
      this.pollSubs.push(sub);
    });
  }
}
