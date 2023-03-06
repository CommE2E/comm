// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import type { HandlerProps } from './community-drawer-item-handlers.react.js';
import css from './community-drawer-item.css';
import {
  getChildren,
  getExpandButton,
} from './community-drawer-utils.react.js';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemData<string>,
  +toggleExpanded?: (threadID: string) => void,
  +expanded: boolean,
  +paddingLeft: number,
  +expandable?: boolean,
  +handler: React.ComponentType<HandlerProps>,
};

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: { threadInfo, itemChildren, hasSubchannelsButton, labelStyle },
    expanded,
    toggleExpanded,
    paddingLeft,
    expandable = true,
    handler: Handler,
  } = props;

  const children = React.useMemo(
    () =>
      getChildren(
        expanded,
        hasSubchannelsButton,
        itemChildren,
        paddingLeft,
        threadInfo,
        expandable,
        Handler,
      ),
    [
      expanded,
      hasSubchannelsButton,
      itemChildren,
      paddingLeft,
      threadInfo,
      expandable,
      Handler,
    ],
  );

  const onExpandToggled = React.useCallback(
    () => (toggleExpanded ? toggleExpanded(threadInfo.id) : null),
    [toggleExpanded, threadInfo.id],
  );

  const itemExpandButton = React.useMemo(
    () =>
      getExpandButton(
        expandable,
        itemChildren?.length,
        hasSubchannelsButton,
        onExpandToggled,
        expanded,
      ),
    [
      expandable,
      itemChildren?.length,
      hasSubchannelsButton,
      onExpandToggled,
      expanded,
    ],
  );

  const [handler, setHandler] = React.useState({
    // eslint-disable-next-line no-unused-vars
    onClick: event => {},
  });

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const titleLabel = classnames({
    [css[labelStyle]]: true,
    [css.activeTitle]: handler.isActive,
  });

  const style = React.useMemo(() => ({ paddingLeft }), [paddingLeft]);
  const threadEntry = classnames({
    [css.threadEntry]: true,
    [css.active]: handler.isActive,
  });

  return (
    <>
      <Handler setHandler={setHandler} threadInfo={threadInfo} />
      <div className={threadEntry} style={style}>
        {itemExpandButton}
        <a onClick={handler.onClick} className={css.titleWrapper}>
          <div className={titleLabel}>{uiName}</div>
        </a>
      </div>
      <div className={css.threadListContainer}>{children}</div>
    </>
  );
}

export type CommunityDrawerItemChatProps = {
  +itemData: CommunityDrawerItemData<string>,
  +paddingLeft: number,
  +expandable?: boolean,
  +handler: React.ComponentType<HandlerProps>,
};

function CommunityDrawerItemChat(
  props: CommunityDrawerItemChatProps,
): React.Node {
  const [expanded, setExpanded] = React.useState(false);

  const toggleExpanded = React.useCallback(() => {
    setExpanded(isExpanded => !isExpanded);
  }, []);

  return (
    <MemoizedCommunityDrawerItem
      {...props}
      expanded={expanded}
      toggleExpanded={toggleExpanded}
    />
  );
}

const MemoizedCommunityDrawerItemChat: React.ComponentType<CommunityDrawerItemChatProps> =
  React.memo(CommunityDrawerItemChat);

const MemoizedCommunityDrawerItem: React.ComponentType<DrawerItemProps> =
  React.memo(CommunityDrawerItem);

export default MemoizedCommunityDrawerItemChat;
