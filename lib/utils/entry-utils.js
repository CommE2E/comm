// @flow

import dateFormat from 'dateformat';

export type InnerEntryQuery = {
  nav: string,
  start_date: string,
  end_date: string,
};

function currentInnerEntryQuery(): InnerEntryQuery {
  const fifteenDaysEarlier = new Date();
  fifteenDaysEarlier.setDate(fifteenDaysEarlier.getDate() - 15);
  const fifteenDaysLater = new Date();
  fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
  return {
    'nav': 'home',
    'start_date': dateFormat(fifteenDaysEarlier, "yyyy-mm-dd"),
    'end_date': dateFormat(fifteenDaysLater, "yyyy-mm-dd"),
  };
}

export {
  currentInnerEntryQuery,
};
