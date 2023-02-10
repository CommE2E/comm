// @flow

import { queryWarnTime } from './consts.js';
import type { Pool } from './types.js';

function countDecimals(num: number) {
  return 1 + (num === 0 ? 0 : Math.floor(Math.log10(num)));
}

class DatabaseMonitor {
  pool: Pool;
  activeQueries: number = 0;
  lastDecimalCount: number = 1;

  constructor(pool: Pool) {
    this.pool = pool;
    pool.on('acquire', this.onAcquire);
    pool.on('release', this.onRelease);
    pool.on('enqueue', this.onEnqueue);
  }

  get queuedQueries(): number {
    return this.pool.pool._connectionQueue.length;
  }

  get outstandingQueries(): number {
    return this.activeQueries + this.queuedQueries;
  }

  countOutstandingQueries(): number {
    const count = this.outstandingQueries;
    const decimalCount = countDecimals(count);
    if (decimalCount > this.lastDecimalCount) {
      const lowerBound = Math.pow(10, this.lastDecimalCount);
      console.log(`more than ${lowerBound - 1} queries outstanding`);
    } else if (decimalCount < this.lastDecimalCount) {
      const upperBound = Math.pow(10, decimalCount);
      console.log(`fewer than ${upperBound} queries outstanding`);
    }
    this.lastDecimalCount = decimalCount;
    return count;
  }

  onAcquire: () => void = () => {
    this.activeQueries += 1;
    this.countOutstandingQueries();
  };

  onRelease: () => void = () => {
    this.activeQueries -= 1;
    this.countOutstandingQueries();
  };

  onEnqueue: () => void = () => {
    this.countOutstandingQueries();
  };

  reportLaggingQuery: (query: string) => void = query => {
    const count = this.countOutstandingQueries();
    console.log(
      `a query is taking more than ${queryWarnTime}ms to execute. ` +
        `there are currently ${count} queries outstanding. query: ${query}`,
    );
  };
}

export default DatabaseMonitor;
