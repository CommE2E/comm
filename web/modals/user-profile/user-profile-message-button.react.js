// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import css from './user-profile.css';
import Button from '../../components/button.react.js';
import { useOnClickThread } from '../../selectors/thread-selectors.js';

type Props = {
  +threadInfo: ThreadInfo,
};

function UserProfileMessageButton(props: Props): React.Node {
  const { threadInfo } = props;

  const { clearModals } = useModalContext();
  const onClickThread = useOnClickThread(threadInfo);

  const onClickMessageButton = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      clearModals();
      onClickThread(event);
    },
    [clearModals, onClickThread],
  );

  return (
    <Button
      variant="filled"
      onClick={onClickMessageButton}
      className={css.actionButton}
    >
      <SWMansionIcon icon="send-2" size={22} />
      <div>Message</div>
    </Button>
  );
}

export default UserProfileMessageButton;
