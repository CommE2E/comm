// @flow

import * as React from 'react';

import genesis from 'lib/facts/genesis';
import {
  threadInfoSelector,
  ancestorThreadInfos,
} from 'lib/selectors/thread-selectors';
import { threadIsPending } from 'lib/shared/thread-utils';
import { type ThreadInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import { useStyles } from '../themes/colors';
import { SingleLine } from './single-line.react';

type Props = {|
  +threadInfo: ThreadInfo,
|};
function ThreadAncestorsLabel(props: Props): React.Node {
  const { threadInfo } = props;
  const styles = useStyles(unboundStyles);
  const ancestorThreads: $ReadOnlyArray<ThreadInfo> = useSelector((state) => {
    if (!threadIsPending(threadInfo.id)) {
      return ancestorThreadInfos(threadInfo.id)(state).slice(0, -1);
    }
    const genesisThreadInfo = threadInfoSelector(state)[genesis.id];
    return genesisThreadInfo ? [genesisThreadInfo] : [];
  });

  const ancestorPath: string = React.useMemo(() => {
    const path = ancestorThreads.map((each) => each.uiName);
    return path.join(' > ');
  }, [ancestorThreads]);

  if (!ancestorPath) {
    return null;
  }

  return <SingleLine style={styles.pathText}>{ancestorPath}</SingleLine>;
}

const unboundStyles = {
  pathText: {
    opacity: 0.8,
    fontSize: 12,
    color: 'listForegroundTertiaryLabel',
  },
};

export default ThreadAncestorsLabel;
