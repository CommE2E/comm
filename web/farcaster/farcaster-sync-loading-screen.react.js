// @flow

import * as React from 'react';

import { useFarcasterSync } from 'lib/shared/farcaster/farcaster-hooks.js';

import css from './farcaster-sync-loading-screen.css';
import LoadingIndicator from '../loading-indicator.react.js';

function FarcasterSyncLoadingScreen(): React.Node {
  const { progress } = useFarcasterSync();

  const progressComponent = React.useMemo(() => {
    if (!progress) {
      return null;
    }
    return (
      <>
        <p className={css.description}>
          {progress.completedConversations} of{' '}
          {progress.totalNumberOfConversations} (
          {progress.totalNumberOfConversations
            ? Math.round(
                (progress.completedConversations /
                  progress.totalNumberOfConversations) *
                  100,
              )
            : 0}
          %) conversations fetched
        </p>
        {progress.completedMessages ? (
          <p className={css.description}>
            {progress.completedMessages.toLocaleString()} messages fetched
          </p>
        ) : null}
      </>
    );
  }, [progress]);

  return (
    <div className={css.loadingContainer}>
      <div className={css.loading}>
        <div className={css.innerLoading}>
          <div className={css.content}>
            <h2 className={css.header}>Fetching Farcaster conversations</h2>
            <div className={css.separator} />
            <ol className={css.list}>
              <li className={css.listItem}>
                <strong>Fetching in progress</strong>: Comm is fetching all of
                your Farcaster messages so they can be backed up. This can take
                a while, depending on how many chats you have.
              </li>
              <li className={css.listItem}>
                <strong>No E2E encryption</strong>: Please note that Farcaster
                messages are not end-to-end encrypted, which means the Farcaster
                team can see them. For better security, consider using Comm DMs.
              </li>
              <li className={css.listItem}>
                <strong>Manual refresh</strong>: If you ever notice any missing
                messages, you can manually refresh all Farcaster chats from the
                settings page, or refresh an individual chat from its settings.
              </li>
            </ol>
            {progressComponent}
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
