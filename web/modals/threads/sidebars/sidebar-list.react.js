// @flow

import * as React from 'react';

import type { ChatThreadItem } from 'lib/selectors/chat-selectors.js';

import Sidebar from './sidebar.react.js';
import css from './sidebars-modal.css';

type Props = {
  +sidebars: $ReadOnlyArray<ChatThreadItem>,
};

function SidebarList(props: Props): React.Node {
  const { sidebars } = props;

  const sidebarItems = React.useMemo(
    () =>
      sidebars.map((sidebarChatItem, idx, sidebarArray) => (
        <Sidebar
          sidebar={sidebarChatItem}
          key={sidebarChatItem.threadInfo.id}
          isLastItem={idx === sidebarArray.length - 1}
        />
      )),
    [sidebars],
  );

  if (sidebars.length === 0) {
    return (
      <div className={css.noSidebars}>
        No matching threads were found in the chat.
      </div>
    );
  }
  return <div className={css.sidebarList}>{sidebarItems}</div>;
}

export default SidebarList;
