// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import type { ThreadInfo } from 'lib/types/thread-types';

import { updateCalendarCommunityFilter } from '../redux/action-types';
import { useFilterThreadInfos } from '../selectors/calendar-selectors';
import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/thread-selectors';
import type { NavigationTab } from '../types/nav-types';
import type { CommunityDrawerItemHandler } from './community-drawer-item-handler.react';

type HandlerProps = {
  +setHandler: (handler: CommunityDrawerItemHandler) => void,
  +threadInfo: ThreadInfo,
};

function ChatDrawerItemHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const onClick = useOnClickThread(threadInfo);
  const isActive = useThreadIsActive(threadInfo.id);

  const handler = React.useMemo(() => ({ onClick, isActive }), [
    isActive,
    onClick,
  ]);
  React.useEffect(() => {
    setHandler(handler);
  }, [handler, setHandler]);

  return null;
}

function CalendarDrawerItemHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const dispatch = useDispatch();
  const filterThreadInfos = useFilterThreadInfos();
  const threadIDs = React.useMemo(
    () =>
      filterThreadInfos
        .filter(
          thread =>
            thread.threadInfo.community === threadInfo.id ||
            thread.threadInfo.id === threadInfo.id,
        )
        .map(item => item.threadInfo.id),
    [filterThreadInfos, threadInfo.id],
  );

  const onClick = React.useCallback(() => {
    dispatch({
      type: updateCalendarCommunityFilter,
      payload: {
        threadIDs,
      },
    });
  }, [dispatch, threadIDs]);
  const isActive = false;

  const handler = React.useMemo(() => ({ onClick, isActive }), [
    onClick,
    isActive,
  ]);
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
