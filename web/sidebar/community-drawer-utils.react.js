// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';
import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react';

import type { HandlerProps } from './community-drawer-item-handlers.react';
import css from './community-drawer-item.css';
import CommunityDrawerItemChat from './community-drawer-item.react.js';
import { ExpandButton } from './expand-buttons.react.js';
import SubchannelsButton from './subchannels-button.react.js';

const indentation = 14;
const subchannelsButtonIndentation = 24;

function getChildren({
  expanded,
  hasSubchannelsButton,
  itemChildren,
  paddingLeft,
  threadInfo,
  expandable,
  handler,
}: {
  expanded: boolean,
  hasSubchannelsButton: boolean,
  itemChildren: $ReadOnlyArray<CommunityDrawerItemData<string>>,
  paddingLeft: number,
  threadInfo: ThreadInfo,
  expandable: boolean,
  handler: React.ComponentType<HandlerProps>,
}): React.Node {
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
  return itemChildren.map(item => (
    <CommunityDrawerItemChat
      itemData={item}
      key={item.threadInfo.id}
      paddingLeft={paddingLeft + indentation}
      expandable={expandable}
      handler={handler}
    />
  ));
}

function getExpandButton({
  expandable,
  childrenLength,
  hasSubchannelsButton,
  onExpandToggled,
  expanded,
}: {
  +expandable: boolean,
  +childrenLength: ?number,
  +hasSubchannelsButton: boolean,
  +onExpandToggled?: ?() => ?void,
  +expanded: boolean,
}): React.Node {
  if (!expandable) {
    return null;
  }
  if (childrenLength === 0 && !hasSubchannelsButton) {
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
}

export { getChildren, getExpandButton };
