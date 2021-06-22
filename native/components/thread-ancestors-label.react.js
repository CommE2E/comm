// @flow

import * as React from 'react';

import { ancestorThreadInfos } from 'lib/selectors/thread-selectors';
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
  const ancestorThreads: $ReadOnlyArray<ThreadInfo> = useSelector(
    ancestorThreadInfos(threadInfo.id),
  );

  const ancestorPath: string = React.useMemo(() => {
    const path = ancestorThreads.map((each) => each.uiName);
    return path.slice(0, -1).join(' > ').concat(' > ');
  }, [ancestorThreads]);

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
