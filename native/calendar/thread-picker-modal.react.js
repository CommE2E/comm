// @flow

import invariant from 'invariant';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';

import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions.js';
import { useGlobalThreadSearchIndex } from 'lib/selectors/nav-selectors.js';
import { onScreenEntryEditableThreadInfos } from 'lib/selectors/thread-selectors.js';

import Modal from '../components/modal.react.js';
import ThreadList from '../components/thread-list.react.js';
import { RootNavigatorContext } from '../navigation/root-navigator-context.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { waitForInteractions } from '../utils/timers.js';

export type ThreadPickerModalParams = {
  +presentedFrom: string,
  +dateString: string,
};

type Props = {
  +navigation: RootNavigationProp<'ThreadPickerModal'>,
  +route: NavigationRoute<'ThreadPickerModal'>,
};
function ThreadPickerModal(props: Props): React.Node {
  const {
    navigation,
    route: {
      params: { dateString },
    },
  } = props;

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const nextLocalID = useSelector(state => state.nextLocalID);
  const dispatch = useDispatch();

  const rootNavigatorContext = React.useContext(RootNavigatorContext);
  const threadPicked = React.useCallback(
    (threadID: string) => {
      invariant(
        dateString && viewerID && rootNavigatorContext,
        'inputs to threadPicked should be set',
      );
      rootNavigatorContext.setKeyboardHandlingEnabled(false);
      dispatch({
        type: createLocalEntryActionType,
        payload: createLocalEntry(threadID, nextLocalID, dateString, viewerID),
      });
    },
    [rootNavigatorContext, dispatch, viewerID, nextLocalID, dateString],
  );

  React.useEffect(
    () =>
      navigation.addListener('blur', async () => {
        await waitForInteractions();
        invariant(
          rootNavigatorContext,
          'RootNavigatorContext should be set in onScreenBlur',
        );
        rootNavigatorContext.setKeyboardHandlingEnabled(true);
      }),
    [navigation, rootNavigatorContext],
  );

  const index = useGlobalThreadSearchIndex();
  const onScreenThreadInfos = useSelector(state =>
    onScreenEntryEditableThreadInfos(state),
  );
  return (
    <Modal>
      <ThreadList
        threadInfos={onScreenThreadInfos}
        onSelect={threadPicked}
        itemStyle={styles.threadListItem}
        searchIndex={index}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  threadListItem: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 2,
  },
});

export default ThreadPickerModal;
