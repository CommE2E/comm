// @flow

import * as React from 'react';

import DiscordLogo from './assets/discord-logo.react.js';
import KeybaseLogo from './assets/keybase-logo.react.js';
import MatrixLogo from './assets/matrix-logo.react.js';
import SignalLogo from './assets/signal-logo.react.js';
import SlackLogo from './assets/slack-logo.react.js';
import TelegramLogo from './assets/telegram-logo.react.js';

type Props = {
  +name: 'discord' | 'keybase' | 'matrix' | 'signal' | 'slack' | 'telegram',
  +size?: number,
};

function CompetitorLogo(props: Props): React.Node {
  const { name, size } = props;

  let competitorLogo;
  if (name === 'discord') {
    competitorLogo = <DiscordLogo size={size} />;
  } else if (name === 'keybase') {
    competitorLogo = <KeybaseLogo size={size} />;
  } else if (name === 'matrix') {
    competitorLogo = <MatrixLogo size={size} />;
  } else if (name === 'signal') {
    competitorLogo = <SignalLogo size={size} />;
  } else if (name === 'slack') {
    competitorLogo = <SlackLogo size={size} />;
  } else {
    competitorLogo = <TelegramLogo size={size} />;
  }

  return competitorLogo;
}

export default CompetitorLogo;
