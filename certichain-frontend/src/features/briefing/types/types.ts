export type BriefingState = 'UPDATES' | 'ALL_QUIET' | 'NONE';

export interface BriefingItem {
  kind: string;
  title: string;
  detail: string;
  count: number;
  at: string;
}

export interface Briefing {
  state: BriefingState;
  since: string;
  items: BriefingItem[];
  moreCount: number;
}
