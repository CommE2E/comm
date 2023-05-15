// @flow

import { faWrench } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import CommLogo from './assets/comm-logo.react.js';
import DiscordLogo from './assets/discord-logo.react.js';
import KeybaseLogo from './assets/keybase-logo.react.js';
import MatrixLogo from './assets/matrix-logo.react.js';
import SignalLogo from './assets/signal-logo.react.js';
import SlackLogo from './assets/slack-logo.react.js';
import TelegramLogo from './assets/telegram-logo.react.js';
import css from './competitor-feature-card.css';
import typography from './typography.css';

type Props = {
  +competitorName: string,
  +title: string,
  +comingSoon: boolean,
  +competitorDescription: string,
  +commDescription: string,
  +onClick: () => mixed,
};

function CompetitorFeatureCard(props: Props): React.Node {
  const {
    competitorName,
    title,
    comingSoon,
    competitorDescription,
    commDescription,
    onClick,
  } = props;

  const headingClassName = classNames([typography.heading3, css.headingText]);
  const comingSoonClassName = classNames([
    typography.paragraph3,
    css.comingSoonText,
  ]);
  const descriptionClassName = classNames([
    typography.paragraph1,
    css.descriptionText,
  ]);
  const readMoreClassName = classNames([
    typography.paragraph2,
    css.readMoreText,
  ]);

  let comingSoonBadge;
  if (comingSoon) {
    comingSoonBadge = (
      <div className={css.comingSoonBadge}>
        <FontAwesomeIcon
          size="sm"
          className={css.comingSoonIcon}
          icon={faWrench}
        />
        <span className={comingSoonClassName}>Coming Soon</span>
      </div>
    );
  }

  let competitorLogo;
  if (competitorName === 'Discord') {
    competitorLogo = <DiscordLogo size={30} />;
  } else if (competitorName === 'Keybase') {
    competitorLogo = <KeybaseLogo size={30} />;
  } else if (competitorName === 'Matrix') {
    competitorLogo = <MatrixLogo size={30} />;
  } else if (competitorName === 'Signal') {
    competitorLogo = <SignalLogo size={30} />;
  } else if (competitorName === 'Slack') {
    competitorLogo = <SlackLogo size={30} />;
  } else if (competitorName === 'Telegram') {
    competitorLogo = <TelegramLogo size={30} />;
  }

  return (
    <a className={css.container} onClick={onClick}>
      <div className={css.headingContainer}>
        <h1 className={headingClassName}>{title}</h1>
        {comingSoonBadge}
      </div>
      {competitorLogo}
      <p className={descriptionClassName}>{competitorDescription}</p>
      <hr />
      <CommLogo size={30} />
      <p className={descriptionClassName}>{commDescription}</p>
      <p className={readMoreClassName}>Read more</p>
    </a>
  );
}

export default CompetitorFeatureCard;
