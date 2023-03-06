// @flow

import classnames from 'classnames';
import * as React from 'react';

import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './community-drawer-item.css';
import type { DrawerItemProps } from './community-drawer-item.react.js';
import {
  getChildren,
  getExpandButton,
} from './community-drawer-utils.react.js';

function CommunityDrawerItemCommunity(props: DrawerItemProps): React.Node {
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

  const itemExpandButton = React.useMemo(
    () =>
      getExpandButton(
        expandable,
        itemChildren?.length,
        hasSubchannelsButton,
        null,
        expanded,
      ),
    [expandable, itemChildren?.length, hasSubchannelsButton, expanded],
  );

  const [handler, setHandler] = React.useState({
    // eslint-disable-next-line no-unused-vars
    onClick: event => {},
    isActive: false,
  });

  const onClick = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      if (toggleExpanded) {
        toggleExpanded(threadInfo.id);
      }
      handler.onClick(event);
    },
    [threadInfo.id, toggleExpanded, handler],
  );

  const classes = classnames({
    [css.communityBase]: true,
    [css.communityExpanded]: props.expanded,
  });

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const titleLabel = classnames({
    [css[labelStyle]]: true,
    [css.activeTitle]: handler.isActive,
  });

  const style = React.useMemo(
    () => ({ paddingLeft, width: '100%' }),
    [paddingLeft],
  );
  const threadEntry = classnames({
    [css.threadEntry]: true,
  });

  return (
    <div className={classes}>
      <Handler setHandler={setHandler} threadInfo={threadInfo} />
      <a onClick={onClick} className={threadEntry} style={style}>
        {itemExpandButton}
        <div className={css.titleWrapper}>
          <div className={titleLabel}>{uiName}</div>
        </div>
      </a>
      <div className={css.threadListContainer}>{children}</div>
    </div>
  );
}

const MemoizedCommunityDrawerItemCommunity: React.ComponentType<DrawerItemProps> =
  React.memo(CommunityDrawerItemCommunity);
export default MemoizedCommunityDrawerItemCommunity;
