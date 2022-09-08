// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';

import { nonThreadCalendarFiltersSelector } from 'lib/selectors/calendar-filter-selectors';
import { currentCalendarQuery } from 'lib/selectors/nav-selectors';
import { createPendingSidebar } from 'lib/shared/thread-utils';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { CalendarFilter } from 'lib/types/filter-types';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';

import { getDefaultTextMessageRules } from '../markdown/rules.react';
import { updateNavInfoActionType } from '../redux/action-types';
import type { AppState } from '../redux/redux-setup';
import { useSelector } from '../redux/redux-utils';
import {
  type NavigationTab,
  type NavigationSettingsSection,
} from '../types/nav-types';

const dateExtractionRegex = /^([0-9]{4})-([0-9]{2})-[0-9]{2}$/;

function yearExtractor(startDate: string, endDate: string): ?number {
  const startDateResults = dateExtractionRegex.exec(startDate);
  const endDateResults = dateExtractionRegex.exec(endDate);
  if (
    !startDateResults ||
    !startDateResults[1] ||
    !endDateResults ||
    !endDateResults[1] ||
    startDateResults[1] !== endDateResults[1]
  ) {
    return null;
  }
  return parseInt(startDateResults[1], 10);
}

function yearAssertingExtractor(startDate: string, endDate: string): number {
  const result = yearExtractor(startDate, endDate);
  invariant(
    result !== null && result !== undefined,
    `${startDate} and ${endDate} aren't in the same year`,
  );
  return result;
}

const yearAssertingSelector: (state: AppState) => number = createSelector(
  (state: AppState) => state.navInfo.startDate,
  (state: AppState) => state.navInfo.endDate,
  yearAssertingExtractor,
);

// 1-indexed
function monthExtractor(startDate: string, endDate: string): ?number {
  const startDateResults = dateExtractionRegex.exec(startDate);
  const endDateResults = dateExtractionRegex.exec(endDate);
  if (
    !startDateResults ||
    !startDateResults[1] ||
    !startDateResults[2] ||
    !endDateResults ||
    !endDateResults[1] ||
    !endDateResults[2] ||
    startDateResults[1] !== endDateResults[1] ||
    startDateResults[2] !== endDateResults[2]
  ) {
    return null;
  }
  return parseInt(startDateResults[2], 10);
}

// 1-indexed
function monthAssertingExtractor(startDate: string, endDate: string): number {
  const result = monthExtractor(startDate, endDate);
  invariant(
    result !== null && result !== undefined,
    `${startDate} and ${endDate} aren't in the same month`,
  );
  return result;
}

// 1-indexed
const monthAssertingSelector: (state: AppState) => number = createSelector(
  (state: AppState) => state.navInfo.startDate,
  (state: AppState) => state.navInfo.endDate,
  monthAssertingExtractor,
);

function activeThreadSelector(state: AppState): ?string {
  return state.navInfo.tab === 'chat' ? state.navInfo.activeChatThreadID : null;
}

const webCalendarQuery: (
  state: AppState,
) => () => CalendarQuery = createSelector(
  currentCalendarQuery,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
    calendarActive: boolean,
  ) => () => calendarQuery(calendarActive),
);

const nonThreadCalendarQuery: (
  state: AppState,
) => () => CalendarQuery = createSelector(
  webCalendarQuery,
  nonThreadCalendarFiltersSelector,
  (
    calendarQuery: () => CalendarQuery,
    filters: $ReadOnlyArray<CalendarFilter>,
  ) => {
    return (): CalendarQuery => {
      const query = calendarQuery();
      return {
        startDate: query.startDate,
        endDate: query.endDate,
        filters,
      };
    };
  },
);

function useOnClickThread(
  thread: ?ThreadInfo,
): (event: SyntheticEvent<HTMLElement>) => void {
  const dispatch = useDispatch();
  return React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      invariant(
        thread?.id,
        'useOnClickThread should be called with threadID set',
      );
      event.preventDefault();
      const { id: threadID } = thread;

      let payload;
      if (threadID.includes('pending')) {
        payload = {
          chatMode: 'view',
          activeChatThreadID: threadID,
          pendingThread: thread,
        };
      } else {
        payload = {
          chatMode: 'view',
          activeChatThreadID: threadID,
        };
      }

      dispatch({ type: updateNavInfoActionType, payload });
    },
    [dispatch, thread],
  );
}

function useThreadIsActive(threadID: string): boolean {
  return useSelector(state => threadID === state.navInfo.activeChatThreadID);
}

function useOnClickPendingSidebar(
  messageInfo: ComposableMessageInfo | RobotextMessageInfo,
  threadInfo: ThreadInfo,
): (event: SyntheticEvent<HTMLElement>) => void {
  const dispatch = useDispatch();
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  return React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      if (!viewerID) {
        return;
      }
      const pendingSidebarInfo = createPendingSidebar(
        messageInfo,
        threadInfo,
        viewerID,
        getDefaultTextMessageRules().simpleMarkdownRules,
      );
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          activeChatThreadID: pendingSidebarInfo.id,
          pendingThread: pendingSidebarInfo,
        },
      });
    },
    [viewerID, messageInfo, threadInfo, dispatch],
  );
}

function useOnClickNewThread(): (event: SyntheticEvent<HTMLElement>) => void {
  const dispatch = useDispatch();
  return React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          chatMode: 'create',
          selectedUserList: [],
        },
      });
    },
    [dispatch],
  );
}

function navTabSelector(state: AppState): NavigationTab {
  return state.navInfo.tab;
}

function navSettingsSectionSelector(
  state: AppState,
): ?NavigationSettingsSection {
  return state.navInfo.settingsSection;
}

export {
  yearExtractor,
  yearAssertingSelector,
  monthExtractor,
  monthAssertingSelector,
  activeThreadSelector,
  webCalendarQuery,
  nonThreadCalendarQuery,
  useOnClickThread,
  useThreadIsActive,
  useOnClickPendingSidebar,
  useOnClickNewThread,
  navTabSelector,
  navSettingsSectionSelector,
};
