// @flow

import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import css from './team-profile.css';

type Props = {
  +name: string,
  +role: string,
  +imageUrl: string,
  +githubHandle?: string,
  +twitterHandle?: string,
};

const iconProps = {
  size: 'm',
  color: '#ebedee',
};

function TeamProfile(props: Props): React.Node {
  const { name, role, imageUrl, githubHandle, twitterHandle } = props;
  let githubLink;
  let twitterLink;

  if (twitterHandle) {
    twitterLink = (
      <a
        href={`https://twitter.com/${twitterHandle}`}
        target="_blank"
        rel="noreferrer"
      >
        <FontAwesomeIcon icon={faTwitter} {...iconProps} />
      </a>
    );
  }

  if (githubHandle) {
    githubLink = (
      <a
        href={`https://github.com/${githubHandle}`}
        target="_blank"
        rel="noreferrer"
      >
        <FontAwesomeIcon icon={faGithub} {...iconProps} />
      </a>
    );
  }

  return (
    <article className={css.profile}>
      <img src={imageUrl} />
      <p>{name}</p>
      <small>{role}</small>
      <span>
        {githubLink} {twitterLink}
      </span>
    </article>
  );
}

export default TeamProfile;
