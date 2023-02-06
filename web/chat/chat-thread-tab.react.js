// @flow

import * as React from 'react';

import SWMansionIcon, {
  type Icon,
} from 'lib/components/SWMansionIcon.react.js';

import css from './chat-tabs.css';

type Props = {
  +title: string,
  +icon: Icon,
};
function ChatThreadTab(props: Props): React.Node {
  const { title, icon } = props;

  return (
    <div className={css.tabItem}>
      <SWMansionIcon icon={icon} size={24} />
      {title}
    </div>
  );
}

export default ChatThreadTab;
