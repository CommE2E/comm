// @flow

import * as React from 'react';

import { useFarcasterSync } from 'lib/shared/farcaster/farcaster-hooks.js';

import css from './farcaster-sync-loading-screen.css';
import LoadingIndicator from '../loading-indicator.react.js';

function FarcasterSyncLoadingScreen(): React.Node {
  useFarcasterSync();

  return (
    <div className={css.loadingContainer}>
      <div className={css.loading}>
        <div className={css.innerLoading}>
          <div className={css.content}>
            <h2 className={css.header}>Fetching Farcaster conversations</h2>
            <div className={css.separator} />
            <p className={css.description}>
              We’re fetching all your Farcaster conversations and messages.
            </p>
            <p className={css.description}>
              This could take a while depending on how many conversations you
              have.
            </p>
          </div>
          <div className={css.spinner}>
            <LoadingIndicator status="loading" size="x-large" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FarcasterSyncLoadingScreen;
