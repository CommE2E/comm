// @flow

import * as React from 'react';

import DiscordLogo from './assets/discord-logo.react.js';
import KeybaseLogo from './assets/keybase-logo.react.js';
import MatrixLogo from './assets/matrix-logo.react.js';
import SignalLogo from './assets/signal-logo.react.js';
import SlackLogo from './assets/slack-logo.react.js';
import TelegramLogo from './assets/telegram-logo.react.js';
import { competitors, type Competitors } from './competitor-data.js';

type Props = {
  +name: Competitors,
  +size?: number,
};

function CompetitorLogo(props: Props): React.Node {
  const { name, size } = props;

  let competitorLogo = null;
  if (name === competitors.DISCORD) {
    competitorLogo = <DiscordLogo size={size} />;
  } else if (name === competitors.KEYBASE) {
    competitorLogo = <KeybaseLogo size={size} />;
  } else if (name === competitors.MATRIX) {
    competitorLogo = <MatrixLogo size={size} />;
  } else if (name === competitors.SIGNAL) {
    competitorLogo = <SignalLogo size={size} />;
  } else if (name === competitors.SLACK) {
    competitorLogo = <SlackLogo size={size} />;
  } else if (name === competitors.TELEGRAM) {
    competitorLogo = <TelegramLogo size={size} />;
  }

  return competitorLogo;
}

export default CompetitorLogo;
