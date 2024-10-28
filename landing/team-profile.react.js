// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import FarcasterLogo from './assets/farcaster-logo.react.js';
import css from './team-profile.css';
import typography from './typography.css';

type Props = {
  +name: string,
  +role: string,
  +imageURL: string,
  +githubHandle?: string,
  +twitterHandle?: string,
  +farcasterHandle?: string,
};

const fontAwesomeIconProps = {
  size: 'm',
};

function TeamProfile(props: Props): React.Node {
  const { name, role, imageURL, githubHandle, twitterHandle, farcasterHandle } =
    props;

  let twitterLink;
  if (twitterHandle) {
    twitterLink = (
      <a
        href={`https://twitter.com/${twitterHandle}`}
        target="_blank"
        rel="noreferrer"
      >
        <FontAwesomeIcon icon={faTwitter} {...fontAwesomeIconProps} />
      </a>
    );
  }

  let githubLink;
  if (githubHandle) {
    githubLink = (
      <a
        href={`https://github.com/${githubHandle}`}
        target="_blank"
        rel="noreferrer"
      >
        <FontAwesomeIcon icon={faGithub} {...fontAwesomeIconProps} />
      </a>
    );
  }

  let farcasterLink;
  if (farcasterHandle) {
    farcasterLink = (
      <a
        href={`https://warpcast.com/${farcasterHandle}`}
        target="_blank"
        rel="noreferrer"
      >
        <FarcasterLogo size={25} className={css.farcaster} />
      </a>
    );
  }

  return (
    <article className={css.profile}>
      <img alt={`portrait of Comm team member ${name}`} src={imageURL} />
      <p className={typography.paragraph1}>{name}</p>
      <small className={typography.paragraph2}>{role}</small>
      <span>
        {githubLink}
        {farcasterLink}
        {twitterLink}
      </span>
    </article>
  );
}

export default TeamProfile;
