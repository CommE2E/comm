// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import { getCommunityDrawerItemHandler } from './community-drawer-item-handlers.react.js';
import css from './community-drawer-item.css';
import { ExpandButton } from './expand-buttons.react.js';
import SubchannelsButton from './subchannels-button.react.js';
import { useSelector } from '../redux/redux-utils.js';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemData<string>,
  +toggleExpanded: (threadID: string) => void,
  +expanded: boolean,
};

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: { threadInfo, itemChildren, hasSubchannelsButton, labelStyle },
    expanded,
    toggleExpanded,
  } = props;

  const children = React.useMemo(() => {
    if (!expanded) {
      return null;
    }
    if (hasSubchannelsButton) {
      return (
        <div className={css.subchannelsButton}>
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
      />
    ));
  }, [expanded, hasSubchannelsButton, itemChildren, threadInfo]);

  const onExpandToggled = React.useCallback(
    () => toggleExpanded(threadInfo.id),
    [toggleExpanded, threadInfo.id],
  );

  const itemExpandButton = React.useMemo(() => {
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
  }, [itemChildren?.length, hasSubchannelsButton, onExpandToggled, expanded]);

  const Handler = useSelector(state =>
    getCommunityDrawerItemHandler(state.navInfo.tab),
  );

  const [handler, setHandler] = React.useState({
    // eslint-disable-next-line no-unused-vars
    onClick: event => {},
  });

  const { uiName } = useResolvedThreadInfo(threadInfo);
  const titleLabel = classnames(css.title, css[labelStyle]);

  return (
    <>
      <Handler setHandler={setHandler} threadInfo={threadInfo} />
      <div className={css.threadEntry}>
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
};

function CommunityDrawerItemChat(
  props: CommunityDrawerItemChatProps,
): React.Node {
  const [expanded, setExpanded] = React.useState(false);

  const toggleExpanded = React.useCallback(() => {
    setExpanded(isExpanded => !isExpanded);
  }, []);

  return (
    <div className={css.chatItem}>
      <MemoizedCommunityDrawerItem
        {...props}
        expanded={expanded}
        toggleExpanded={toggleExpanded}
      />
    </div>
  );
}

const MemoizedCommunityDrawerItemChat: React.ComponentType<CommunityDrawerItemChatProps> = React.memo(
  CommunityDrawerItemChat,
);

const MemoizedCommunityDrawerItem: React.ComponentType<DrawerItemProps> = React.memo(
  CommunityDrawerItem,
);

export default MemoizedCommunityDrawerItem;
