// @flow

import * as React from 'react';

import {
  clearChatCommunityFilter,
  updateCalendarCommunityFilter,
  updateChatCommunityFilter,
} from 'lib/actions/community-actions.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { WebNavigationTab } from 'lib/types/nav-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import type { CommunityDrawerItemCommunityHandler } from './community-drawer-item-handler.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useCommunityIsPickedCalendar } from '../selectors/calendar-selectors.js';
import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/thread-selectors.js';

export type HandlerProps = {
  +setHandler: (handler: CommunityDrawerItemCommunityHandler) => void,
  +threadInfo: ThreadInfo,
};

function ChatDrawerItemCommunityHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const onClickThread = useOnClickThread(threadInfo);
  const isActive = useThreadIsActive(threadInfo.id);
  const dispatch = useDispatch();

  const openCommunityID = useSelector(state => state.communityPickerStore.chat);

  const expanded = openCommunityID === threadInfo.id;

  const onClick = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      if (!isActive) {
        onClickThread(event);
      }
      if (openCommunityID === threadInfo.id && isActive) {
        dispatch({
          type: clearChatCommunityFilter,
        });
        return;
      }
      const community = threadInfo.community ?? threadInfo.id;
      dispatch({
        type: updateChatCommunityFilter,
        payload: community,
      });
    },
    [
      dispatch,
      isActive,
      onClickThread,
      openCommunityID,
      threadInfo.community,
      threadInfo.id,
    ],
  );

  const handler = React.useMemo(
    () => ({ onClick, isActive, expanded }),
    [expanded, isActive, onClick],
  );
  React.useEffect(() => {
    setHandler(handler);
  }, [handler, setHandler]);

  return null;
}

function CalendarDrawerItemCommunityHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;
  const dispatch = useDispatch();

  const onClick = React.useCallback(() => {
    dispatch({
      type: updateCalendarCommunityFilter,
      payload: threadInfo.id,
    });
  }, [dispatch, threadInfo.id]);

  const isActive = useCommunityIsPickedCalendar(threadInfo.id);

  const expanded = false;

  const handler = React.useMemo(
    () => ({ onClick, isActive, expanded }),
    [onClick, isActive, expanded],
  );
  React.useEffect(() => {
    setHandler(handler);
  }, [handler, setHandler]);

  return null;
}

const communityDrawerItemCommunityHandlers: {
  +[tab: WebNavigationTab]: React.ComponentType<HandlerProps>,
} = Object.freeze({
  chat: ChatDrawerItemCommunityHandler,
  calendar: CalendarDrawerItemCommunityHandler,
});

function getCommunityDrawerItemCommunityHandler(
  tab: WebNavigationTab,
): React.ComponentType<HandlerProps> {
  return (
    communityDrawerItemCommunityHandlers[tab] ?? ChatDrawerItemCommunityHandler
  );
}

export { getCommunityDrawerItemCommunityHandler };
