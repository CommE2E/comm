// @flow

import classnames from 'classnames';
import * as React from 'react';

import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import { getCommunityDrawerItemCommunityHandler } from './community-drawer-item-community-handlers.react.js';
import css from './community-drawer-item.css';
import type { DrawerItemProps } from './community-drawer-item.react.js';
import {
  getChildren,
  getExpandButton,
} from './community-drawer-utils.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import CommunityActionsMenu from '../components/community-actions-menu.react.js';

function CommunityDrawerItemCommunity(props: DrawerItemProps): React.Node {
  const {
    itemData: { threadInfo, itemChildren, hasSubchannelsButton, labelStyle },
    paddingLeft,
    expandable = true,
    handlerType,
  } = props;

  const Handler = getCommunityDrawerItemCommunityHandler(handlerType);

  const [handler, setHandler] = React.useState({
    onClick: () => {},
    isActive: false,
    expanded: false,
    toggleExpanded: () => {},
  });

  const children = React.useMemo(
    () =>
      getChildren({
        expanded: handler.expanded,
        hasSubchannelsButton,
        itemChildren,
        paddingLeft,
        threadInfo,
        expandable,
        handlerType,
      }),
    [
      handler.expanded,
      hasSubchannelsButton,
      itemChildren,
      paddingLeft,
      threadInfo,
      expandable,
      handlerType,
    ],
  );

  const itemExpandButton = React.useMemo(
    () =>
      getExpandButton({
        expandable,
        childrenLength: itemChildren?.length,
        hasSubchannelsButton,
        onExpandToggled: null,
        expanded: handler.expanded,
      }),
    [expandable, itemChildren?.length, hasSubchannelsButton, handler.expanded],
  );

  const classes = classnames({
    [css.communityBase]: true,
    [css.communityExpanded]: handler.expanded,
  });

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const titleLabel = classnames({
    [css[labelStyle]]: true,
    [css.activeTitle]: handler.isActive,
  });

  const style = React.useMemo(() => ({ paddingLeft }), [paddingLeft]);

  return (
    <div className={classes}>
      <Handler setHandler={setHandler} threadInfo={threadInfo} />
      <a onClick={handler.onClick} className={css.threadEntry} style={style}>
        {itemExpandButton}
        <div className={css.titleWrapper}>
          <ThreadAvatar size="micro" threadInfo={threadInfo} />
          <div className={titleLabel}>{uiName}</div>
        </div>
        <CommunityActionsMenu communityID={threadInfo.id} />
      </a>
      <div className={css.threadListContainer}>{children}</div>
    </div>
  );
}

const MemoizedCommunityDrawerItemCommunity: React.ComponentType<DrawerItemProps> =
  React.memo(CommunityDrawerItemCommunity);
export default MemoizedCommunityDrawerItemCommunity;
