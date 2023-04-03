// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import type { HandlerProps } from './community-drawer-item-handlers.react.js';
import css from './community-drawer-item.css';
import { ExpandButton } from './expand-buttons.react.js';
import SubchannelsButton from './subchannels-button.react.js';
import ThreadAvatar from '../components/thread-avatar.react.js';
import { shouldRenderAvatars } from '../utils/avatar-utils.js';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemData<string>,
  +toggleExpanded?: (threadID: string) => void,
  +expanded: boolean,
  +paddingLeft: number,
  +expandable?: boolean,
  +handler: React.ComponentType<HandlerProps>,
};

const indentation = 14;
const subchannelsButtonIndentation = 24;

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: { threadInfo, itemChildren, hasSubchannelsButton, labelStyle },
    expanded,
    toggleExpanded,
    paddingLeft,
    expandable = true,
    handler: Handler,
  } = props;

  const children = React.useMemo(() => {
    if (!expanded) {
      return null;
    }
    if (hasSubchannelsButton) {
      const buttonPaddingLeft = paddingLeft + subchannelsButtonIndentation;
      return (
        <div
          className={css.subchannelsButton}
          style={{ paddingLeft: buttonPaddingLeft }}
        >
          <SubchannelsButton threadInfo={threadInfo} />
        </div>
      );
    }
    if (!itemChildren) {
      return null;
    }
    return itemChildren.map(item => (
      <MemoizedCommunityDrawerItemChat
        itemData={item}
        key={item.threadInfo.id}
        paddingLeft={paddingLeft + indentation}
        expandable={expandable}
        handler={Handler}
      />
    ));
  }, [
    expanded,
    hasSubchannelsButton,
    itemChildren,
    paddingLeft,
    threadInfo,
    expandable,
    Handler,
  ]);

  const onExpandToggled = React.useCallback(
    () => (toggleExpanded ? toggleExpanded(threadInfo.id) : null),
    [toggleExpanded, threadInfo.id],
  );

  const itemExpandButton = React.useMemo(() => {
    if (!expandable) {
      return null;
    }
    if (itemChildren?.length === 0 && !hasSubchannelsButton) {
      return (
        <div className={css.buttonContainer}>
          <ExpandButton disabled={true} />
        </div>
      );
    }
    return (
      <div className={css.buttonContainer}>
        <ExpandButton onClick={onExpandToggled} expanded={expanded} />
      </div>
    );
  }, [
    expandable,
    itemChildren?.length,
    hasSubchannelsButton,
    onExpandToggled,
    expanded,
  ]);

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

  const titleStyle = React.useMemo(
    () => ({
      marginLeft: shouldRenderAvatars ? 8 : 0,
    }),
    [],
  );

  return (
    <>
      <Handler setHandler={setHandler} threadInfo={threadInfo} />
      <div className={threadEntry} style={style}>
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

export default MemoizedCommunityDrawerItem;
