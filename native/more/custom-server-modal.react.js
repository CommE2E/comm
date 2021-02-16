// @flow

import PropTypes from 'prop-types';
import * as React from 'react';
import { Text, TextInput } from 'react-native';

import type { DispatchActionPayload } from 'lib/utils/action-utils';
import { connect } from 'lib/utils/redux-utils';
import { setURLPrefix } from 'lib/utils/url-utils';

import Button from '../components/button.react';
import Modal from '../components/modal.react';
import type { RootNavigationProp } from '../navigation/root-navigator.react';
import type { AppState } from '../redux/redux-setup';
import { styleSelector } from '../themes/colors';
import { setCustomServer } from '../utils/url-utils';

export type CustomServerModalParams = {|
  presentedFrom: string,
|};

type Props = {|
  navigation: RootNavigationProp<'CustomServerModal'>,
  // Redux state
  urlPrefix: string,
  customServer: ?string,
  styles: typeof styles,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
type State = {|
  customServer: string,
|};
class CustomServerModal extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      goBackOnce: PropTypes.func.isRequired,
    }).isRequired,
    urlPrefix: PropTypes.string.isRequired,
    customServer: PropTypes.string,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    const { customServer } = props;
    this.state = {
      customServer: customServer ? customServer : '',
    };
  }

  render() {
    return (
      <Modal
        containerStyle={this.props.styles.container}
        modalStyle={this.props.styles.modal}
      >
        <TextInput
          style={this.props.styles.textInput}
          value={this.state.customServer}
          onChangeText={this.onChangeCustomServer}
          autoFocus={true}
        />
        <Button onPress={this.onPressGo} style={this.props.styles.button}>
          <Text style={this.props.styles.buttonText}>Go</Text>
        </Button>
      </Modal>
    );
  }

  onChangeCustomServer = (newCustomServer: string) => {
    this.setState({ customServer: newCustomServer });
  };

  onPressGo = () => {
    const { customServer } = this.state;
    if (customServer !== this.props.urlPrefix) {
      this.props.dispatchActionPayload(setURLPrefix, customServer);
    }
    if (customServer && customServer !== this.props.customServer) {
      this.props.dispatchActionPayload(setCustomServer, customServer);
    }
    this.props.navigation.goBackOnce();
  };
}

const styles = {
  button: {
    backgroundColor: 'greenButton',
    borderRadius: 5,
    marginHorizontal: 2,
    marginVertical: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  container: {
    justifyContent: 'flex-end',
  },
  modal: {
    flex: 0,
    flexDirection: 'row',
  },
  textInput: {
    color: 'modalBackgroundLabel',
    flex: 1,
    fontSize: 16,
    margin: 0,
    padding: 0,
    borderBottomColor: 'transparent',
  },
};
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState) => ({
    urlPrefix: state.urlPrefix,
    customServer: state.customServer,
    styles: stylesSelector(state),
  }),
  null,
  true,
)(CustomServerModal);
