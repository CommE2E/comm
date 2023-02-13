// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  updateCalendarThreadFilter,
  calendarThreadFilterTypes,
} from 'lib/types/filter-types.js';
import type { ThreadInfo } from 'lib/types/thread-types';

import type { CommunityDrawerItemHandler } from './community-drawer-item-handler.react.js';
import { useOnClickThread } from '../selectors/thread-selectors.js';
import type { NavigationTab } from '../types/nav-types';

type HandlerProps = {
  +setHandler: (handler: CommunityDrawerItemHandler) => void,
  +threadInfo: ThreadInfo,
};

function ChatDrawerItemHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const onClick = useOnClickThread(threadInfo);
  const handler = React.useMemo(() => ({ onClick }), [onClick]);

  React.useEffect(() => {
    setHandler(handler);
  }, [handler, setHandler]);

  return null;
}

function CalendarDrawerItemHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const dispatch = useDispatch();

  const onClick = React.useCallback(
    () =>
      dispatch({
        type: updateCalendarThreadFilter,
        payload: {
          type: calendarThreadFilterTypes.THREAD_LIST,
          threadIDs: [threadInfo.id],
        },
      }),
    [dispatch, threadInfo.id],
  );
  const handler = React.useMemo(() => ({ onClick }), [onClick]);

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
