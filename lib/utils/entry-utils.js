// @flow

import { fifteenDaysEarlier, fifteenDaysLater } from './date-utils';

export type InnerEntryQuery = {
  nav: string,
  start_date: string,
  end_date: string,
};

function currentInnerEntryQuery(): InnerEntryQuery {
  return {
    'nav': 'home',
    'start_date': fifteenDaysEarlier(),
    'end_date': fifteenDaysLater(),
  };
}

export {
  currentInnerEntryQuery,
};
