// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadTypes,
} from 'lib/types/thread-types';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { AppState } from '../../redux/redux-setup';
import { type Colors, colorsPropType } from '../../themes/colors';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

import { threadTypeDescriptions } from 'lib/shared/thread-utils';
import { connect } from 'lib/utils/redux-utils';

import Button from '../../components/button.react';
import {
  ComposeSubthreadModalRouteName,
  ComposeThreadRouteName,
} from '../../navigation/route-names';
import { createModal } from '../../components/modal.react';
import { colorsSelector, styleSelector } from '../../themes/colors';

const Modal = createModal(ComposeSubthreadModalRouteName);
type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    threadInfo: ThreadInfo,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  // Redux state
  colors: Colors,
  styles: Styles,
|};
class ComposeSubthreadModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    return (
      <Modal
        navigation={this.props.navigation}
        modalStyle={this.props.styles.modal}
      >
        <Text style={this.props.styles.visibility}>Thread type</Text>
        <Button style={this.props.styles.option} onPress={this.onPressOpen}>
          <Icon
            name="public"
            size={32}
            style={this.props.styles.visibilityIcon}
          />
          <Text style={this.props.styles.optionText}>Open</Text>
          <Text style={this.props.styles.optionExplanation}>
            {threadTypeDescriptions[threadTypes.CHAT_NESTED_OPEN]}
          </Text>
          <IonIcon
            name="ios-arrow-forward"
            size={20}
            style={this.props.styles.forwardIcon}
          />
        </Button>
        <Button style={this.props.styles.option} onPress={this.onPressSecret}>
          <Icon
            name="lock-outline"
            size={32}
            style={this.props.styles.visibilityIcon}
          />
          <Text style={this.props.styles.optionText}>Secret</Text>
          <Text style={this.props.styles.optionExplanation}>
            {threadTypeDescriptions[threadTypes.CHAT_SECRET]}
          </Text>
          <IonIcon
            name="ios-arrow-forward"
            size={20}
            style={this.props.styles.forwardIcon}
          />
        </Button>
      </Modal>
    );
  }

  onPressOpen = () => {
    const threadID = this.props.navigation.state.params.threadInfo.id;
    this.props.navigation.navigate({
      routeName: ComposeThreadRouteName,
      params: {
        threadType: threadTypes.CHAT_NESTED_OPEN,
        parentThreadID: threadID,
      },
      key:
        `${ComposeThreadRouteName}|${threadID}|${threadTypes.CHAT_NESTED_OPEN}`,
    });
  }

  onPressSecret = () => {
    const threadID = this.props.navigation.state.params.threadInfo.id;
    this.props.navigation.navigate({
      routeName: ComposeThreadRouteName,
      params: {
        threadType: threadTypes.CHAT_SECRET,
        parentThreadID: threadID,
      },
      key: `${ComposeThreadRouteName}|${threadID}|${threadTypes.CHAT_SECRET}`,
    });
  }

}

const styles = {
  modal: {
    flex: 0,
  },
  visibility: {
    fontSize: 24,
    textAlign: 'center',
    color: 'modalBackgroundLabel',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  optionText: {
    fontSize: 20,
    paddingLeft: 5,
    color: 'modalBackgroundLabel',
  },
  optionExplanation: {
    flex: 1,
    fontSize: 14,
    paddingLeft: 20,
    textAlign: 'center',
    color: 'modalBackgroundLabel',
  },
  forwardIcon: {
    paddingLeft: 10,
    color: 'link',
  },
  visibilityIcon: {
    color: 'modalBackgroundLabel',
    paddingRight: 3,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(ComposeSubthreadModal);
