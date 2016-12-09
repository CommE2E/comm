// @flow

import type { Store } from 'redux';
import type { NavInfo } from './redux-reducer';

import invariant from 'invariant';

import { thisNavURLFragment, urlForHomeAndCalendarID } from './nav-utils';

type PartialNavInfo = {
  year?: number,
  month?: number, // 1-indexed
  home?: bool,
  calendarID?: string,
  verify?: string,
};

function partialNavInfoFromURL(url: string): PartialNavInfo {
  const yearMatches = new RegExp('(/|^)year/([0-9]+)(/|$)', 'i').exec(url);
  const monthMatches = new RegExp('(/|^)month/([0-9]+)(/|$)', 'i').exec(url);
  const calendarMatches = new RegExp('(/|^)calendar/([0-9]+)(/|$)', 'i')
    .exec(url);
  const verifyMatches = new RegExp('(/|^)verify/([a-f0-9]+)(/|$)', 'i')
    .exec(url);
  const homeTest = new RegExp('(/|^)home(/|$)', 'i').test(url);
  invariant(
    !homeTest || !calendarMatches,
    'home and calendar should never be set at the same time',
  );
  const returnObj = {};
  if (yearMatches) {
    returnObj.year = parseInt(yearMatches[2]);
  }
  if (monthMatches) {
    returnObj.month = parseInt(monthMatches[2]);
  }
  if (calendarMatches) {
    returnObj.calendarID = calendarMatches[2];
  }
  if (verifyMatches) {
    returnObj.verify = verifyMatches[2];
  }
  if (homeTest) {
    returnObj.home = true;
  }
  return returnObj;
}

function canonicalURLFromReduxState(navInfo: NavInfo, currentURL: string) {
  const partialNavInfo = partialNavInfoFromURL(currentURL);
  let newURL = urlForHomeAndCalendarID(navInfo.home, navInfo.calendarID);
  if (partialNavInfo.year !== undefined) {
    newURL += `year/${navInfo.year}/`;
  }
  if (partialNavInfo.month !== undefined) {
    newURL += `month/${navInfo.month}/`;
  }
  if (navInfo.verify) {
    newURL += `verify/${navInfo.verify}/`;
  }
  return newURL;
}

// This function returns an "onEnter" handler for our single react-router Route.
// We use it to redirect the URL to be consistent with the initial Redux state
// determined on the server side. However, for the rest of the application URL
// changes propagate to Redux, so we turn this off after the initial run.
let urlRedirectedFromInitialReduxState = false;
function redirectURLFromInitialReduxState(store: Store) {
  return (nextState: Object, replace: Function) => {
    if (urlRedirectedFromInitialReduxState) {
      return;
    }
    urlRedirectedFromInitialReduxState = true;
    const newURL = canonicalURLFromReduxState(
      store.getState().navInfo,
      nextState.location.pathname,
    );
    if (nextState.location.pathname !== newURL) {
      replace(newURL);
    }
  };
}

// This function returns an "onChange" handler for our single react-router
// Route. Since we only have a single wildcard route, this handler will be run
// whenever the URL is changed programmatically on the client side.
function redirectURLFromAppTransition(store: Store) {
  return (prevState: Object, nextState: Object, replace: Function) => {
    const partialNavInfo = partialNavInfoFromURL(nextState.location.pathname);
    if (!partialNavInfo.home && !partialNavInfo.calendarID) {
      replace(
        thisNavURLFragment(store.getState()) + nextState.location.pathname,
      );
    }
  };
}

// Given a URL, this function parses out a navInfo object, leaving values as
// default if they are unspecified. 
function navInfoFromURL(url: string): NavInfo {
  const partialNavInfo = partialNavInfoFromURL(url);
  const today = new Date();
  return {
    year: partialNavInfo.year ? partialNavInfo.year : today.getFullYear(),
    month: partialNavInfo.month ? partialNavInfo.month : (today.getMonth() + 1),
    home: !!partialNavInfo.home,
    calendarID: partialNavInfo.calendarID ? partialNavInfo.calendarID : null,
    verify: partialNavInfo.verify ? partialNavInfo.verify : null,
  };
}

export {
  canonicalURLFromReduxState,
  redirectURLFromInitialReduxState,
  redirectURLFromAppTransition,
  navInfoFromURL,
};
