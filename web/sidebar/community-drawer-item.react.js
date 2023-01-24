// @flow

import classnames from 'classnames';
import * as React from 'react';
import { useSelector } from 'react-redux';

import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react';

import { getCommunityDrawerItemHandler } from './community-drawer-item-handlers.react';
import css from './community-drawer-item.css';
import { ExpandButton } from './expand-buttons.react';
import SubchannelsButton from './subchannels-button.react';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemData<string>,
  +toggleExpanded: (threadID: string) => void,
  +expanded: boolean,
  +paddingLeft: number,
  +allowExpanding?: boolean,
};

const indentation = 14;
const subchannelsButtonIndentation = 24;

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: { threadInfo, itemChildren, hasSubchannelsButton, labelStyle },
    expanded,
    toggleExpanded,
    paddingLeft,
    allowExpanding = true,
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
        allowExpanding={allowExpanding}
      />
    ));
  }, [
    expanded,
    hasSubchannelsButton,
    itemChildren,
    paddingLeft,
    allowExpanding,
    threadInfo,
  ]);

  const onExpandToggled = React.useCallback(() => {
    toggleExpanded(threadInfo.id);
  }, [toggleExpanded, threadInfo.id]);

  const itemExpandButton = React.useMemo(() => {
    if (!allowExpanding) {
      return null;
    }
    if (!itemChildren?.length && !hasSubchannelsButton) {
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
    allowExpanding,
    itemChildren?.length,
    hasSubchannelsButton,
    onExpandToggled,
    expanded,
  ]);

  const Handler = useSelector(state =>
    getCommunityDrawerItemHandler(state.navInfo.tab),
  );

  const [handler, setHandler] = React.useState({
    // eslint-disable-next-line no-unused-vars
    onClick: event => {},
  });

  const onClick = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      handler.onClick(event);
    },
    [handler],
  );

  const titleLabel = classnames(css.title, css[labelStyle]);

  const style = React.useMemo(() => ({ paddingLeft }), [paddingLeft]);

  return (
    <>
      <Handler setHandler={setHandler} threadInfo={threadInfo} />
      <div className={css.threadEntry} style={style}>
        {itemExpandButton}
        <a onClick={onClick} className={css.titleWrapper}>
          <div className={titleLabel}>{threadInfo.uiName}</div>
        </a>
      </div>
      <div className={css.threadListContainer}>{children}</div>
    </>
  );
}

export type CommunityDrawerItemChatProps = {
  +itemData: CommunityDrawerItemData<string>,
  +paddingLeft: number,
  +allowExpanding?: boolean,
};

function CommunityDrawerItemChat(
  props: CommunityDrawerItemChatProps,
): React.Node {
  const [expanded, setExpanded] = React.useState(false);

  const toggleExpanded = React.useCallback(() => {
    setExpanded(isExpanded => !isExpanded);
  }, []);

  return (
    <CommunityDrawerItem
      {...props}
      expanded={expanded}
      toggleExpanded={toggleExpanded}
    />
  );
}

const MemoizedCommunityDrawerItemChat: React.ComponentType<CommunityDrawerItemChatProps> = React.memo(
  CommunityDrawerItemChat,
);

const MemoizedCommunityDrawerItem: React.ComponentType<DrawerItemProps> = React.memo(
  CommunityDrawerItem,
);

export default MemoizedCommunityDrawerItem;
