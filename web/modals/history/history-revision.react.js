// @flow

import classNames from 'classnames';
import dateFormat from 'dateformat';
import * as React from 'react';
import TimeAgo from 'react-timeago';

import { useENSNames } from 'lib/hooks/ens-cache.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { colorIsDark } from 'lib/shared/color-utils.js';
import type { HistoryRevisionInfo } from 'lib/types/history-types.js';

import css from './history.css';
import { useSelector } from '../../redux/redux-utils.js';

type Props = {
  +revisionInfo: HistoryRevisionInfo,
  +isDeletionOrRestoration: boolean,
};

export default function HistoryRevision(props: Props): React.Node {
  const threadInfo = useSelector(
    state => threadInfoSelector(state)[props.revisionInfo.threadID],
  );
  let change;
  if (props.isDeletionOrRestoration && props.revisionInfo.deleted) {
    change = <div className={css.deleted}>Deleted</div>;
  } else if (props.isDeletionOrRestoration) {
    change = <div className={css.restored}>Restored</div>;
  } else {
    const textClasses = classNames({
      [css.entry]: true,
      [css.darkEntry]: colorIsDark(threadInfo.color),
    });
    const textStyle = { backgroundColor: '#' + threadInfo.color };
    change = (
      <div className={textClasses} style={textStyle}>
        {props.revisionInfo.text}
      </div>
    );
  }

  const { authorID } = props.revisionInfo;
  const authorUserInfo = useSelector(
    state => state.userStore.userInfos[authorID],
  );
  const [authorWithENSName] = useENSNames([authorUserInfo]);

  const author = authorWithENSName?.username ? (
    <span className={css.entryUsername}>{authorWithENSName.username}</span>
  ) : (
    'anonymous'
  );

  const date = new Date(props.revisionInfo.lastUpdate);
  const hovertext = dateFormat(date, "dddd, mmmm dS, yyyy 'at' h:MM TT");

  return (
    <li>
      {change}
      <span className={css.entryAuthor}>
        {'updated by '}
        {author}
      </span>
      <TimeAgo
        date={date.toISOString()}
        title={hovertext}
        className={css.entryTime}
      />
      <div className={css.clear} />
    </li>
  );
}
