import { BadRequestError } from '../../errors/appError';
import { AnalyticsGranularity, MetricValueChange, AnalyticsTimeSeriesPoint } from '@edtech/types';

export class AnalyticsTimezoneService {
  private static formatter(zone: string) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      });
    } catch {
      throw new BadRequestError(`Invalid analytics timezone: ${zone}`);
    }
  }

  public static validate(zone?: string): string {
    const tz = zone?.trim() || 'Asia/Kolkata';
    try {
      this.formatter(tz).format(new Date());
      return tz;
    } catch {
      throw new BadRequestError(`Invalid analytics timezone: ${tz}`);
    }
  }

  public static resolvePeriod(
    rawFrom?: string | Date,
    rawTo?: string | Date,
    rawTimezone?: string
  ): {
    from: Date;
    to: Date;
    timezone: string;
    previousFrom: Date;
    previousTo: Date;
    durationDays: number;
  } {
    const timezone = this.validate(rawTimezone);
    const now = new Date();

    let toDate: Date;
    let fromDate: Date;

    if (rawTo) {
      toDate = new Date(rawTo);
      if (isNaN(toDate.getTime())) throw new BadRequestError('Invalid "to" date format');
    } else {
      toDate = now;
    }

    if (rawFrom) {
      fromDate = new Date(rawFrom);
      if (isNaN(fromDate.getTime())) throw new BadRequestError('Invalid "from" date format');
    } else {
      // Default: Last 30 days
      fromDate = new Date(toDate.getTime() - 30 * 86400000);
    }

    if (fromDate > toDate) {
      throw new BadRequestError('"from" date must be earlier than or equal to "to" date');
    }

    const durationMs = toDate.getTime() - fromDate.getTime();
    const durationDays = Math.ceil(durationMs / 86400000);

    if (durationDays > 366) {
      throw new BadRequestError('Analytics date range cannot exceed 366 days');
    }

    // Previous equivalent period
    const previousTo = new Date(fromDate.getTime());
    const previousFrom = new Date(fromDate.getTime() - durationMs);

    return {
      from: fromDate,
      to: toDate,
      timezone,
      previousFrom,
      previousTo,
      durationDays
    };
  }

  public static calculateMetricChange(current: number, previous?: number): MetricValueChange {
    if (previous === undefined || previous === null) {
      return { current, delta: undefined, percentageChange: undefined };
    }

    const delta = current - previous;
    let percentageChange: number | null = null;

    if (previous === 0) {
      if (current === 0) {
        percentageChange = 0;
      } else {
        // Safe representation: 100% growth from 0 baseline
        percentageChange = 100;
      }
    } else {
      percentageChange = Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
    }

    return {
      current,
      previous,
      delta,
      percentageChange
    };
  }

  public static generateBuckets(
    from: Date,
    to: Date,
    granularity: AnalyticsGranularity,
    timezone: string
  ): string[] {
    const buckets: string[] = [];
    const fmt = this.formatter(timezone);
    const cursor = new Date(from.getTime());

    while (cursor <= to) {
      const parts = Object.fromEntries(
        fmt.formatToParts(cursor).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
      );
      const dayKey = `${parts.year}-${parts.month}-${parts.day}`;

      if (granularity === 'DAILY') {
        if (!buckets.includes(dayKey)) buckets.push(dayKey);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      } else if (granularity === 'WEEKLY') {
        // Weekly bucket key: start of week ISO date
        if (!buckets.includes(dayKey)) buckets.push(dayKey);
        cursor.setUTCDate(cursor.getUTCDate() + 7);
      } else {
        // Monthly bucket: YYYY-MM
        const monthKey = `${parts.year}-${parts.month}`;
        if (!buckets.includes(monthKey)) buckets.push(monthKey);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    return buckets;
  }

  public static zeroFillSeries(
    rawPoints: Array<{ bucket: string; value: number; count?: number }>,
    from: Date,
    to: Date,
    granularity: AnalyticsGranularity,
    timezone: string
  ): AnalyticsTimeSeriesPoint[] {
    const buckets = this.generateBuckets(from, to, granularity, timezone);
    const map = new Map<string, { value: number; count?: number }>();
    for (const p of rawPoints) {
      map.set(p.bucket, { value: p.value, count: p.count });
    }

    return buckets.map((bucket) => {
      const entry = map.get(bucket);
      return {
        bucket,
        label: bucket,
        value: entry ? entry.value : 0,
        count: entry ? entry.count : 0
      };
    });
  }
}
