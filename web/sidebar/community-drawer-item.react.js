// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import type { HandlerProps } from './community-drawer-item-handlers.react.js';
import { getCommunityDrawerItemHandler } from './community-drawer-item-handlers.react.js';
import css from './community-drawer-item.css';
import {
  getChildren,
  getExpandButton,
} from './community-drawer-utils.react.js';
import ThreadAvatar from '../components/thread-avatar.react.js';
import type { NavigationTab } from '../types/nav-types.js';
import { shouldRenderAvatars } from '../utils/avatar-utils.js';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemData<string>,
  +paddingLeft: number,
  +expandable?: boolean,
  +handlerType: NavigationTab,
};

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: { threadInfo, itemChildren, hasSubchannelsButton, labelStyle },
    paddingLeft,
    expandable = true,
    handlerType,
  } = props;

  const [handler, setHandler] = React.useState({
    // eslint-disable-next-line no-unused-vars
    onClick: event => {},
    expanded: false,
    toggleExpanded: () => {},
  });

  const Handler = getCommunityDrawerItemHandler(handlerType);

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
        childrenLength: itemChildren.length,
        hasSubchannelsButton,
        onExpandToggled: handler.toggleExpanded,
        expanded: handler.expanded,
      }),
    [
      expandable,
      itemChildren.length,
      hasSubchannelsButton,
      handler.toggleExpanded,
      handler.expanded,
    ],
  );

  const { uiName } = useResolvedThreadInfo(threadInfo);

  const titleLabel = classnames({
    [css[labelStyle]]: true,
    [css.activeTitle]: handler.isActive,
  });

  const style = React.useMemo(() => ({ paddingLeft }), [paddingLeft]);

  const titleStyle = React.useMemo(
    () => ({
      marginLeft: shouldRenderAvatars ? 8 : 0,
    }),
    [],
  );

  return (
    <>
      <Handler setHandler={setHandler} threadInfo={threadInfo} />
      <div className={css.threadEntry} style={style}>
        {itemExpandButton}
        <a onClick={handler.onClick} className={css.titleWrapper}>
          <ThreadAvatar size="micro" threadInfo={threadInfo} />
          <div className={titleLabel} style={titleStyle}>
            {uiName}
          </div>
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

const MemoizedCommunityDrawerItem: React.ComponentType<DrawerItemProps> =
  React.memo(CommunityDrawerItem);

export default MemoizedCommunityDrawerItem;
