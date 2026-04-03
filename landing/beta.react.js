// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './beta.css';
import typography from './typography.css';

type BetaReleaseBlocker = {
  +title: string,
  +description: string,
};

const betaReleaseBlockers: $ReadOnlyArray<BetaReleaseBlocker> = [
  {
    title: 'Client verification of device lists and social proofs',
    description:
      "Comm clients track their peer users' device lists, and for Ethereum users their social proof (read our whitepaper for more details). However, today Comm clients don't cryptographically verify that updates to these device lists come from the prior primary device.",
  },
  {
    title: 'Keyserver using QR code for login instead of user_credentials.json',
    description:
      "Today, setting up a keyserver requires putting your password in a JSON file. Besides the obvious data hygiene concern, the fact that the primary device isn't involved means that we can't update the device list to include the newly authenticated keyserver.",
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

  return (
    <main className={css.container}>
      <div className={css.content}>
        <h1 className={headingClassName}>Blockers for beta release</h1>
        <ol className={css.list}>
          {betaReleaseBlockers.map(blocker => (
            <li key={blocker.title} className={css.listItem}>
              <div className={css.listItemContent}>
                <p className={listItemTextClassName}>
                  <strong>{blocker.title}</strong>
                </p>
                <p className={listItemTextClassName}>{blocker.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

export default Beta;
