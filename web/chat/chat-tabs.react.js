// @flow

import invariant from 'invariant';
import * as React from 'react';

import { unreadBackgroundCount } from 'lib/selectors/thread-selectors';

import { useSelector } from '../redux/redux-utils';
import css from './chat-tabs.css';
import ChatThreadList from './chat-thread-list.react';
import ChatThreadTab from './chat-thread-tab.react';
import { ThreadListContext } from './thread-list-provider';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
|};
function ChatTabs(props: Props): React.Node {
  let backgroundTitle = 'BACKGROUND';
  const unreadBackgroundCountVal = useSelector(unreadBackgroundCount);
  if (unreadBackgroundCountVal) {
    backgroundTitle += ` (${unreadBackgroundCountVal})`;
  }
  const threadListContext = React.useContext(ThreadListContext);
  invariant(
    threadListContext,
    'threadListContext should be set in ChatThreadList',
  );
  const { activeTab, setActiveTab } = threadListContext;

  const onClickHome = React.useCallback(() => setActiveTab('HOME'), [
    setActiveTab,
  ]);
  const onClickBackground = React.useCallback(
    () => setActiveTab('BACKGROUND'),
    [setActiveTab],
  );

  return (
    <div className={css.container}>
      <div className={css.tabs}>
        <ChatThreadTab
          title="HOME"
          tabIsActive={activeTab === 'HOME'}
          onClick={onClickHome}
        />
        <ChatThreadTab
          title={backgroundTitle}
          tabIsActive={activeTab === 'BACKGROUND'}
          onClick={onClickBackground}
        />
      </div>
      <div className={css.threadList}>
        <ChatThreadList setModal={props.setModal} />
      </div>
    </div>
  );
}

export default ChatTabs;
