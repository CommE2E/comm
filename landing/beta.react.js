// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './beta.css';
import typography from './typography.css';

type BetaReleaseBlocker = {
  +title: string,
  +description: React.Node,
};

const betaReleaseBlockers: $ReadOnlyArray<BetaReleaseBlocker> = [
  {
    title: 'Client verification of device lists and social proofs',
    description: (
      <>
        <span>
          Comm clients track their peer users&apos; device lists, and for
          Ethereum users their social proof (read our{' '}
        </span>
        <a
          href="https://dh9fld3hutpxf.cloudfront.net/whitepaper.pdf"
          target="_blank"
          rel="noreferrer"
          className={css.link}
        >
          whitepaper
        </a>
        <span>
          {' '}
          for more details). However, today Comm clients don&apos;t
          cryptographically verify that updates to these device lists come from
          the prior primary device.
        </span>
      </>
    ),
  },
  {
    title: 'Use QR code for keyserver login instead of user credentials',
    description:
      "Today, setting up a keyserver requires storing your password in a file. Besides the obvious data hygiene concern, the fact that the primary device isn't involved means that we can't update the device list to include the newly authenticated keyserver.",
  },
  {
    title: 'Avatars and relationships shared via E2EE',
    description:
      "Comm clients are currently hardcoded to trust Ashoat's keyserver as authoritative for users' avatar and their relationships (friendship and blocks). This needs to be moved to a peer-to-peer model for privacy reasons.",
  },
  {
    title: 'Auto-updating harness for keyserver',
    description:
      "We want to make sure that updates to the keyserver code are automatically pulled down, without requiring any active involvement from the keyserver's administrator.",
  },
];

function Beta(): React.Node {
  const headingClassName = classNames([typography.heading1, css.heading]);
  const listItemTextClassName = classNames([
    typography.paragraph1,
    css.listItemText,
  ]);
  const betaReleaseBlockerNodes = betaReleaseBlockers.map(blocker => (
    <li key={blocker.title} className={css.listItem}>
      <div className={css.listItemContent}>
        <p className={listItemTextClassName}>
          <strong>{blocker.title}</strong>
        </p>
        <p className={listItemTextClassName}>{blocker.description}</p>
      </div>
    </li>
  ));

  return (
    <main className={css.container}>
      <div className={css.content}>
        <h1 className={headingClassName}>Blockers for beta release</h1>
        <ol className={css.list}>{betaReleaseBlockerNodes}</ol>
      </div>
    </main>
  );
}

export default Beta;
