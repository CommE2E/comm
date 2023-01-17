// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  updateCalendarThreadFilter,
  calendarThreadFilterTypes,
} from 'lib/types/filter-types';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/thread-selectors';
import type { CommunityDrawerItemHandlerSpec } from './community-drawer-item-spec.react';

type HandlerProps = {
  +setHandler: (handler: CommunityDrawerItemHandlerSpec) => void,
  +threadInfo: ThreadInfo,
};

function ChatDrawerItemHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const onClick = useOnClickThread(threadInfo);
  const handler = React.useMemo(() => ({ onClick }), [onClick]);

  React.useEffect(() => {
    setHandler(handler);
  }, [handler, onClick, setHandler]);

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
  }, [dispatch, handler, onClick, setHandler, threadInfo.id]);

  return null;
}

const communityDrawerItemHandlers: {
  [tab: string]: React.ComponentType<HandlerProps>,
} = Object.freeze({
  default: ChatDrawerItemHandler,
  chat: ChatDrawerItemHandler,
  calendar: CalendarDrawerItemHandler,
});

function getCommunityDrawerItemHandlers(
  tab: string,
): React.ComponentType<HandlerProps> {
  return (
    communityDrawerItemHandlers[tab] ?? communityDrawerItemHandlers['default']
  );
}

export { getCommunityDrawerItemHandlers };
