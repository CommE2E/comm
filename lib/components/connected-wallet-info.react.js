// @flow

import { emojiAvatarForAddress, useAccountModal } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { useAccount, useEnsAvatar } from 'wagmi';

import css from './connected-wallet-info.css';
import SWMansionIcon from './SWMansionIcon.react.js';
import { useENSName } from '../hooks/ens-cache.js';

function shortenAddressToFitWidth(address: string): string {
  if (address.length < 22) {
    return address;
  }
  return `${address.slice(0, 10)}…${address.slice(-10)}`;
}

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

  const emojiAvatarView = React.useMemo(
    () => <p>{emojiAvatar.emoji}</p>,
    [emojiAvatar.emoji],
  );

  const { data: ensAvatarURI } = useEnsAvatar({
    addressOrName: potentiallyENSName,
  });
  const potentiallyENSAvatar = React.useMemo(
    () => <img src={ensAvatarURI} height="34px" width="34px" />,
    [ensAvatarURI],
  );

  const onClick = React.useCallback(() => {
    openAccountModal && openAccountModal();
  }, [openAccountModal]);

  return (
    <div className={css.container} onClick={onClick} title={potentiallyENSName}>
      <div className={css.avatar} style={emojiAvatarStyle}>
        {ensAvatarURI ? potentiallyENSAvatar : emojiAvatarView}
      </div>
      <div className={css.address}>
        <p>{shortenAddressToFitWidth(potentiallyENSName)}</p>
      </div>
      <div className={css.chevronDown}>
        <SWMansionIcon icon="chevron-down" size={18} />
      </div>
    </div>
  );
}

export default ConnectedWalletInfo;
