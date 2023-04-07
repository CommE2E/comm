// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import type { CommunityDrawerItemHandler } from './community-drawer-item-handler.react.js';
import { updateCalendarCommunityFilter } from '../redux/action-types.js';
import { useCommunityIsPickedCalendar } from '../selectors/calendar-selectors.js';
import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/thread-selectors.js';
import type { NavigationTab } from '../types/nav-types.js';

export type HandlerProps = {
  +setHandler: (handler: CommunityDrawerItemHandler) => void,
  +threadInfo: ThreadInfo,
};

function ChatDrawerItemHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const onClick = useOnClickThread(threadInfo);
  const isActive = useThreadIsActive(threadInfo.id);

  const handler = React.useMemo(
    () => ({ onClick, isActive }),
    [isActive, onClick],
  );
  React.useEffect(() => {
    setHandler(handler);
  }, [handler, setHandler]);

  return null;
}

function CalendarDrawerItemHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const dispatch = useDispatch();

  const onClick = React.useCallback(() => {
    dispatch({
      type: updateCalendarCommunityFilter,
      payload: threadInfo.id,
    });
  }, [dispatch, threadInfo.id]);
  const isActive = useCommunityIsPickedCalendar(threadInfo.id);

  const handler = React.useMemo(
    () => ({ onClick, isActive }),
    [onClick, isActive],
  );
  React.useEffect(() => {
    setHandler(handler);
  }, [handler, setHandler]);

  return null;
}

const communityDrawerItemHandlers: {
  +[tab: NavigationTab]: React.ComponentType<HandlerProps>,
} = Object.freeze({
  chat: ChatDrawerItemHandler,
  calendar: CalendarDrawerItemHandler,
});

function getCommunityDrawerItemHandler(
  tab: NavigationTab,
): React.ComponentType<HandlerProps> {
  return communityDrawerItemHandlers[tab] ?? ChatDrawerItemHandler;
}

export { getCommunityDrawerItemHandler };
