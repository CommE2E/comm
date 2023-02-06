// @flow

import { emojiAvatarForAddress, useAccountModal } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { useAccount } from 'wagmi';

import { useENSName } from 'lib/hooks/ens-cache.js';

import SWMansionIcon from '../SWMansionIcon.react.js';
import css from './connected-wallet-info.css';

type RainbowKitEmojiAvatar = {
  +color: string,
  +emoji: string,
};

function ConnectedWalletInfo(): React.Node {
  const { address } = useAccount();
  const { openAccountModal } = useAccountModal();
  const potentiallyENSName = useENSName(address);

  const emojiAvatar: RainbowKitEmojiAvatar = React.useMemo(
    () => emojiAvatarForAddress(address),
    [address],
  );

  const emojiAvatarStyle = React.useMemo(
    () => ({ backgroundColor: emojiAvatar.color }),
    [emojiAvatar.color],
  );

  const onClick = React.useCallback(() => {
    openAccountModal && openAccountModal();
  }, [openAccountModal]);

  return (
    <div className={css.container} onClick={onClick}>
      <div className={css.avatar} style={emojiAvatarStyle}>
        <p>{emojiAvatar.emoji}</p>
      </div>
      <div className={css.address}>
        <p>{potentiallyENSName}</p>
      </div>
      <div className={css.chevronDown}>
        <SWMansionIcon icon="chevron-down" size={18} />
      </div>
    </div>
  );
}

export default ConnectedWalletInfo;
