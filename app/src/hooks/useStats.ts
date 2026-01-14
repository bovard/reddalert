import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface SubredditCount {
  subreddit: string;
  count: number;
}

export interface ResponseStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  bySubreddit: SubredditCount[];
  dailyCounts: DailyCount[]; // Last 30 days
}

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday = 0
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLast30Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(getDateString(d));
  }
  return dates;
}

export function useResponseStats(userId: string | undefined) {
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    const postsRef = collection(db, 'users', userId, 'posts');
    const q = query(postsRef, where('status', '==', 'responded'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const startOfToday = getStartOfDay(now);
      const startOfWeek = getStartOfWeek(now);
      const startOfMonth = getStartOfMonth(now);
      const last30Days = getLast30Days();

      let total = 0;
      let today = 0;
      let thisWeek = 0;
      let thisMonth = 0;
      const subredditCounts: Record<string, number> = {};
      const dailyCountsMap: Record<string, number> = {};

      // Initialize daily counts for last 30 days
      last30Days.forEach(date => {
        dailyCountsMap[date] = 0;
      });

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        total++;

        const subreddit = data.subreddit as string;
        subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;

        // Get the responded date
        const respondedAt = data.respondedAt as Timestamp | undefined;
        if (respondedAt) {
          const respondedDate = respondedAt.toDate();
          const dateStr = getDateString(respondedDate);

          // Count for daily graph
          if (dailyCountsMap[dateStr] !== undefined) {
            dailyCountsMap[dateStr]++;
          }

          // Count for today/week/month
          if (respondedDate >= startOfToday) {
            today++;
          }
          if (respondedDate >= startOfWeek) {
            thisWeek++;
          }
          if (respondedDate >= startOfMonth) {
            thisMonth++;
          }
        }
      });

      // Convert to arrays and sort
      const bySubreddit: SubredditCount[] = Object.entries(subredditCounts)
        .map(([subreddit, count]) => ({ subreddit, count }))
        .sort((a, b) => b.count - a.count);

      const dailyCounts: DailyCount[] = last30Days.map(date => ({
        date,
        count: dailyCountsMap[date],
      }));

      setStats({
        total,
        today,
        thisWeek,
        thisMonth,
        bySubreddit,
        dailyCounts,
      });
      setLoading(false);
    }, (error) => {
      console.error('Error fetching response stats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { stats, loading };
}
