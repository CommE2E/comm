// @flow

import type { BaseAppState } from 'lib/types/redux-types';

import { createSelector } from 'reselect';
import invariant from 'invariant';

function yearAssertingExtractor(startDate: string, endDate: string) {
  const regExp = /^([0-9]{4})-[0-9]{2}-[0-9]{2}$/;
  const startDateResults = regExp.exec(startDate);
  const endDateResults = regExp.exec(endDate);
  invariant(
    startDateResults && startDateResults[1] &&
      endDateResults && endDateResults[1] &&
      startDateResults[1] === endDateResults[1],
    `${startDate} and ${endDate} aren't in the same year`,
  );
  return parseInt(startDateResults[1]);
}

const yearAssertingSelector = createSelector(
  (state: BaseAppState) => state.navInfo.startDate,
  (state: BaseAppState) => state.navInfo.endDate,
  yearAssertingExtractor,
);

// 1-indexed
function monthAssertingExtractor(startDate: string, endDate: string) {
  const regExp = /^([0-9]{4})-([0-9]{2})-[0-9]{2}$/;
  const startDateResults = regExp.exec(startDate);
  const endDateResults = regExp.exec(endDate);
  invariant(
    startDateResults && startDateResults[1] && startDateResults[2] &&
      endDateResults && endDateResults[1] && endDateResults[2] &&
      startDateResults[1] === endDateResults[1] &&
      startDateResults[2] === endDateResults[2],
    `${startDate} and ${endDate} aren't in the same month`,
  );
  return parseInt(startDateResults[2]);
}

// 1-indexed
const monthAssertingSelector = createSelector(
  (state: BaseAppState) => state.navInfo.startDate,
  (state: BaseAppState) => state.navInfo.endDate,
  monthAssertingExtractor,
);

export {
  yearAssertingExtractor,
  yearAssertingSelector,
  monthAssertingExtractor,
  monthAssertingSelector,
};
