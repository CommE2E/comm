// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux/redux-setup';
import type { Navigate } from '../../navigation/route-names';

import * as React from 'react';
import { Text, View, Platform } from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import Button from '../../components/button.react';
import { MessageListRouteName } from '../../navigation/route-names';
import { styleSelector } from '../../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: Navigate,
  // Redux state
  parentThreadInfo?: ?ThreadInfo,
  styles: typeof styles,
|};
class ThreadSettingsParent extends React.PureComponent<Props> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    parentThreadInfo: threadInfoPropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    let parent;
    if (this.props.parentThreadInfo) {
      parent = (
        <Button
          onPress={this.onPressParentThread}
          style={this.props.styles.currentValue}
        >
          <Text
            style={[
              this.props.styles.currentValueText,
              this.props.styles.parentThreadLink,
            ]}
            numberOfLines={1}
          >
            {this.props.parentThreadInfo.uiName}
          </Text>
        </Button>
      );
    } else if (this.props.threadInfo.parentThreadID) {
      parent = (
        <Text
          style={[
            this.props.styles.currentValue,
            this.props.styles.currentValueText,
            this.props.styles.noParent,
          ]}
        >
          Secret parent
        </Text>
      );
    } else {
      parent = (
        <Text
          style={[
            this.props.styles.currentValue,
            this.props.styles.currentValueText,
            this.props.styles.noParent,
          ]}
        >
          No parent
        </Text>
      );
    }
    return (
      <View style={this.props.styles.row}>
        <Text style={this.props.styles.label}>Parent</Text>
        {parent}
      </View>
    );
  }

  onPressParentThread = () => {
    const threadInfo = this.props.parentThreadInfo;
    invariant(threadInfo, 'should be set');
    this.props.navigate({
      routeName: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  };
}

const styles = {
  currentValue: {
    flex: 1,
    paddingLeft: 4,
    paddingTop: Platform.OS === 'ios' ? 5 : 4,
  },
  currentValueText: {
    color: 'panelForegroundSecondaryLabel',
    fontFamily: 'Arial',
    fontSize: 16,
    margin: 0,
    paddingRight: 0,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    paddingVertical: 4,
    width: 96,
  },
  noParent: {
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  parentThreadLink: {
    color: 'link',
  },
  row: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
  },
};
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const parsedThreadInfos = threadInfoSelector(state);
    const parentThreadInfo: ?ThreadInfo = ownProps.threadInfo.parentThreadID
      ? parsedThreadInfos[ownProps.threadInfo.parentThreadID]
      : null;
    return {
      parentThreadInfo,
      styles: stylesSelector(state),
    };
  },
)(ThreadSettingsParent);
