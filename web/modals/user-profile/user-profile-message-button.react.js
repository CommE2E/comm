// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';

import css from './user-profile.css';
import Button from '../../components/button.react.js';
import { useOnClickThread } from '../../selectors/thread-selectors.js';

type Props = {
  +threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
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

  const userProfileMessageButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        onClick={onClickMessageButton}
        className={css.actionButton}
      >
        <SWMansionIcon icon="send-2" size={22} />
        <div>Message</div>
      </Button>
    ),
    [onClickMessageButton],
  );

  return userProfileMessageButton;
}

export default UserProfileMessageButton;
