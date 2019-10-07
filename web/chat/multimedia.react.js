// @flow

import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from './chat-input-state';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import XCircleIcon from 'react-feather/dist/icons/x-circle';
import AlertCircleIcon from 'react-feather/dist/icons/alert-circle';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import classNames from 'classnames';

import css from './chat-message-list.css';
import MultimediaModal from './multimedia-modal.react';

type Props = {|
  uri: string,
  pendingUpload?: ?PendingMultimediaUpload,
  remove?: (uploadID: string) => void,
  setModal?: (modal: ?React.Node) => void,
|};
class Multimedia extends React.PureComponent<Props> {

  static propTypes = {
    uri: PropTypes.string.isRequired,
    pendingUpload: pendingMultimediaUploadPropType,
    remove: PropTypes.func,
    setModal: PropTypes.func,
  };

  componentDidUpdate(prevProps: Props) {
    const { uri, pendingUpload } = this.props;
    if (uri === prevProps.uri) {
      return;
    }
    if (
      (!pendingUpload || pendingUpload.uriIsReal) &&
      (!prevProps.pendingUpload || !prevProps.pendingUpload.uriIsReal)
    ) {
      URL.revokeObjectURL(prevProps.uri);
    }
  }

  render() {
    let progressIndicator, errorIndicator, removeButton;

    const { pendingUpload, remove, setModal } = this.props;
    if (pendingUpload) {
      const { progressPercent, failed } = pendingUpload;

      if (progressPercent !== 0 && progressPercent !== 1) {
        const outOfHundred = Math.floor(progressPercent * 100);
        const text = `${outOfHundred}%`;
        progressIndicator = (
          <CircularProgressbar
            value={outOfHundred}
            text={text}
            background
            backgroundPadding={6}
            className={css.progressIndicator}
          />
        );
      }

      if (failed) {
        errorIndicator = (
          <AlertCircleIcon
            className={css.uploadError}
            size={36}
          />
        );
      }

      if (remove) {
        removeButton = (
          <XCircleIcon onClick={this.remove} className={css.removeUpload} />
        );
      }
    }

    const imageContainerClasses = [ css.multimediaImage ];
    let onClick;
    if (setModal) {
      imageContainerClasses.push(css.clickable);
      onClick = this.onClick;
    }

    return (
      <span className={css.multimedia}>
        <span className={classNames(imageContainerClasses)} onClick={onClick}>
          <img src={this.props.uri} />
          {removeButton}
        </span>
        {progressIndicator}
        {errorIndicator}
      </span>
    );
  }

  remove = () => {
    const { remove, pendingUpload } = this.props;
    invariant(
      remove && pendingUpload,
      "Multimedia cannot be removed as either remove or pendingUpload " +
        "are unspecified",
    );
    remove(pendingUpload.localID);
  }

  onClick = (event: SyntheticEvent<HTMLSpanElement>) => {
    event.stopPropagation();

    const { setModal, uri } = this.props;
    invariant(setModal, "should be set");
    setModal(<MultimediaModal uri={uri} setModal={setModal} />);
  }

}

export default Multimedia;
