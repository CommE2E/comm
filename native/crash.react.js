// @flow

import {
  type ClientReportCreationRequest,
  type ReportCreationResponse,
  reportTypes,
} from 'lib/types/report-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from './redux/redux-setup';
import type { ErrorData } from 'lib/types/report-types';
import type { LogOutResult } from 'lib/types/account-types';
import {
  type PreRequestUserState,
  preRequestUserStatePropType,
} from 'lib/types/session-types';

import * as React from 'react';
import {
  View,
  Text,
  Platform,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import _shuffle from 'lodash/fp/shuffle';
import ExitApp from 'react-native-exit-app';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import Clipboard from '@react-native-community/clipboard';

import { connect } from 'lib/utils/redux-utils';
import { sendReportActionTypes, sendReport } from 'lib/actions/report-actions';
import sleep from 'lib/utils/sleep';
import { actionLogger } from 'lib/utils/action-logger';
import { logOutActionTypes, logOut } from 'lib/actions/user-actions';
import { sanitizeAction, sanitizeState } from 'lib/utils/sanitization';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';

import Button from './components/button.react';
import { persistConfig, codeVersion } from './redux/persist';
import { wipeAndExit } from './utils/crash-utils';
import ConnectedStatusBar from './connected-status-bar.react';

const errorTitles = ['Oh no!!', 'Womp womp womp...'];

type Props = {
  errorData: $ReadOnlyArray<ErrorData>,
  // Redux state
  preRequestUserState: PreRequestUserState,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendReport: (
    request: ClientReportCreationRequest,
  ) => Promise<ReportCreationResponse>,
  logOut: (preRequestUserState: PreRequestUserState) => Promise<LogOutResult>,
};
type State = {|
  errorReportID: ?string,
  doneWaiting: boolean,
|};
class Crash extends React.PureComponent<Props, State> {
  static propTypes = {
    errorData: PropTypes.arrayOf(
      PropTypes.shape({
        error: PropTypes.object.isRequired,
        info: PropTypes.shape({
          componentStack: PropTypes.string.isRequired,
        }),
      }),
    ).isRequired,
    preRequestUserState: preRequestUserStatePropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendReport: PropTypes.func.isRequired,
    logOut: PropTypes.func.isRequired,
  };
  errorTitle = _shuffle(errorTitles)[0];
  state: State = {
    errorReportID: null,
    doneWaiting: false,
  };

  componentDidMount() {
    this.props.dispatchActionPromise(sendReportActionTypes, this.sendReport());
    this.timeOut();
  }

  async timeOut() {
    // If it takes more than 10s, give up and let the user exit
    await sleep(10000);
    this.setState({ doneWaiting: true });
  }

  render() {
    const errorText = [...this.props.errorData]
      .reverse()
      .map((errorData) => errorData.error.message)
      .join('\n');

    let crashID;
    if (this.state.errorReportID) {
      crashID = (
        <React.Fragment>
          <Text style={styles.errorReportIDText}>
            {this.state.errorReportID}
          </Text>
          <Button onPress={this.onCopyCrashReportID}>
            <Text style={styles.copyCrashReportIDButtonText}>(Copy)</Text>
          </Button>
        </React.Fragment>
      );
    } else {
      crashID = <ActivityIndicator size="small" color="black" />;
    }

    const buttonStyle = { opacity: Number(this.state.doneWaiting) };

    return (
      <View style={styles.container}>
        <ConnectedStatusBar barStyle="dark-content" />
        <Icon name="bug" size={32} color="red" />
        <Text style={styles.header}>{this.errorTitle}</Text>
        <Text style={styles.text}>I&apos;m sorry, but the app crashed.</Text>
        <View style={styles.crashID}>
          <Text style={styles.crashIDText}>Crash report ID:</Text>
          <View style={styles.errorReportID}>{crashID}</View>
        </View>
        <Text style={styles.text}>
          Here&apos;s some text that&apos;s probably not helpful:
        </Text>
        <ScrollView style={styles.scrollView}>
          <Text style={styles.errorText}>{errorText}</Text>
        </ScrollView>
        <View style={[styles.buttons, buttonStyle]}>
          <Button onPress={this.onPressKill} style={styles.button}>
            <Text style={styles.buttonText}>Kill the app</Text>
          </Button>
          <Button onPress={this.onPressWipe} style={styles.button}>
            <Text style={styles.buttonText}>Wipe state and kill app</Text>
          </Button>
        </View>
      </View>
    );
  }

  async sendReport() {
    const result = await this.props.sendReport({
      type: reportTypes.ERROR,
      platformDetails: {
        platform: Platform.OS,
        codeVersion,
        stateVersion: persistConfig.version,
      },
      errors: this.props.errorData.map((data) => ({
        errorMessage: data.error.message,
        stack: data.error.stack,
        componentStack: data.info && data.info.componentStack,
      })),
      preloadedState: sanitizeState(actionLogger.preloadedState),
      currentState: sanitizeState(actionLogger.currentState),
      actions: actionLogger.actions.map(sanitizeAction),
    });
    this.setState({
      errorReportID: result.id,
      doneWaiting: true,
    });
  }

  onPressKill = () => {
    if (!this.state.doneWaiting) {
      return;
    }
    ExitApp.exitApp();
  };

  onPressWipe = async () => {
    if (!this.state.doneWaiting) {
      return;
    }
    this.props.dispatchActionPromise(logOutActionTypes, this.logOutAndExit());
  };

  async logOutAndExit() {
    try {
      await this.props.logOut(this.props.preRequestUserState);
    } catch (e) {}
    await wipeAndExit();
  }

  onCopyCrashReportID = () => {
    invariant(this.state.errorReportID, 'should be set');
    Clipboard.setString(this.state.errorReportID);
  };
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF0000',
    borderRadius: 5,
    marginHorizontal: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
  },
  container: {
    alignItems: 'center',
    backgroundColor: 'white',
    flex: 1,
    justifyContent: 'center',
  },
  copyCrashReportIDButtonText: {
    color: '#036AFF',
  },
  crashID: {
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 2,
  },
  crashIDText: {
    color: 'black',
    paddingRight: 8,
  },
  errorReportID: {
    flexDirection: 'row',
    height: 20,
  },
  errorReportIDText: {
    color: 'black',
    paddingRight: 8,
  },
  errorText: {
    color: 'black',
    fontFamily: Platform.select({
      ios: 'Menlo',
      default: 'monospace',
    }),
  },
  header: {
    color: 'black',
    fontSize: 24,
    paddingBottom: 24,
  },
  scrollView: {
    flex: 1,
    marginBottom: 24,
    marginTop: 12,
    maxHeight: 200,
    paddingHorizontal: 50,
  },
  text: {
    color: 'black',
    paddingBottom: 12,
  },
});

export default connect(
  (state: AppState) => ({
    preRequestUserState: preRequestUserStateSelector(state),
  }),
  { sendReport, logOut },
)(Crash);
