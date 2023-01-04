// @flow

import classnames from 'classnames';
import * as React from 'react';
import { useSelector } from 'react-redux';

import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react';

import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/thread-selectors';
import css from './community-drawer-item.css';
import { ExpandButton, ExpandButtonDisabled } from './expand-buttons.react';
import SubchannelsButton from './subchannels-button.react';

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
    return itemChildren.map(item => {
      return (
        <MemoizedCommunityDrawerItemChat
          itemData={item}
          key={item.threadInfo.id}
        />
      );
    });
  }, [expanded, hasSubchannelsButton, itemChildren, threadInfo]);

  const onExpandToggled = React.useCallback(() => {
    toggleExpanded(threadInfo.id);
  }, [toggleExpanded, threadInfo.id]);

  const itemExpandButton = React.useMemo(() => {
    if (!itemChildren?.length && !hasSubchannelsButton) {
      return (
        <div className={css.buttonContainer}>
          <ExpandButtonDisabled />
        </div>
      );
    }
    return (
      <div className={css.buttonContainer}>
        <ExpandButton onClick={onExpandToggled} expanded={expanded} />
      </div>
    );
  }, [itemChildren?.length, hasSubchannelsButton, onExpandToggled, expanded]);

  const active = useThreadIsActive(threadInfo.id);
  const isCreateMode = useSelector(
    state => state.navInfo.chatMode === 'create',
  );
  const onClick = useOnClickThread(threadInfo);
  const selectItemIfNotActiveCreation = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      if (!isCreateMode || !active) {
        onClick(event);
      }
    },
    [isCreateMode, active, onClick],
  );

  const titleLabel = classnames({
    [css.title]: true,
    [css[labelStyle]]: labelStyle,
  });

  return (
    <>
      <div className={css.threadEntry}>
        {itemExpandButton}
        <a onClick={selectItemIfNotActiveCreation} className={css.titleWrapper}>
          <div className={titleLabel}>{threadInfo.uiName}</div>
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
      <CommunityDrawerItem
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
