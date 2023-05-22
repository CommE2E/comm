// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import type { CommunityDrawerItemHandler } from './community-drawer-item-handler.react.js';
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

  const [expanded, setExpanded] = React.useState(false);
  const toggleExpanded = React.useCallback(() => {
    setExpanded(isExpanded => !isExpanded);
  }, []);

  const handler = React.useMemo(
    () => ({ onClick, isActive, expanded, toggleExpanded }),
    [expanded, isActive, onClick, toggleExpanded],
  );
  React.useEffect(() => {
    setHandler(handler);
  }, [handler, setHandler]);

  return null;
}

const onClick = () => {};
const expanded = false;
const toggleExpanded = () => {};

function CalendarDrawerItemHandler(props: HandlerProps): React.Node {
  const { setHandler, threadInfo } = props;

  const isActive = useCommunityIsPickedCalendar(threadInfo.id);

  const handler = React.useMemo(
    () => ({ onClick, isActive, expanded, toggleExpanded }),
    [isActive],
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
