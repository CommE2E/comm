// @flow

import { queryWarnTime } from './consts';
import type { Pool } from './types';

function countDecimals(num: number) {
  return 1 + (num === 0 ? 0 : Math.floor(Math.log10(num)));
}

class DatabaseMonitor {
  pool: Pool;
  activeQueries = 0;
  lastDecimalCount = 1;

  constructor(pool: Pool) {
    this.pool = pool;
    pool.on('acquire', this.onAcquire);
    pool.on('release', this.onRelease);
    pool.on('enqueue', this.onEnqueue);
  }

  get queuedQueries() {
    return this.pool.pool._connectionQueue.length;
  }

  get outstandingQueries() {
    return this.activeQueries + this.queuedQueries;
  }

  countOutstandingQueries() {
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

  onAcquire = () => {
    this.activeQueries += 1;
    this.countOutstandingQueries();
  };

  onRelease = () => {
    this.activeQueries -= 1;
    this.countOutstandingQueries();
  };

  onEnqueue = () => {
    this.countOutstandingQueries();
  };

  reportLaggingQuery = (query: string) => {
    const count = this.countOutstandingQueries();
    console.log(
      `a query is taking more than ${queryWarnTime}ms to execute. ` +
        `there are currently ${count} queries outstanding. query: ${query}`,
    );
  };
}

export default DatabaseMonitor;
