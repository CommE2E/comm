// @flow

import * as React from 'react';
import { CornerDownRight } from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import SubchannelsModal from '../modals/threads/subchannels/subchannels-modal.react';
import css from './subchannels-button.css';

type Props = {
  +threadInfo: ThreadInfo,
};

function SubchannelsButton(props: Props): React.Node {
  const { threadInfo } = props;
  const { pushModal, popModal } = useModalContext();

  const onClick = React.useCallback(
    () =>
      pushModal(
        <SubchannelsModal threadID={threadInfo.id} onClose={popModal} />,
      ),
    [popModal, pushModal, threadInfo.id],
  );

  return (
    <div className={css.wrapper}>
      <Button onClick={onClick}>
        <div className={css.iconWrapper}>
          <CornerDownRight size={12} className={css.icon} />
        </div>
        <div className={css.text}>Subchannels</div>
      </Button>
    </div>
  );
}

export default SubchannelsButton;
