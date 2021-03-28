// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
} from 'react-feather';

import { type PendingMultimediaUpload } from '../input/input-state';
import css from './media.css';
import MultimediaModal from './multimedia-modal.react';

type Props = {|
  uri: string,
  pendingUpload?: ?PendingMultimediaUpload,
  remove?: (uploadID: string) => void,
  setModal?: (modal: ?React.Node) => void,
  multimediaCSSClass: string,
  multimediaImageCSSClass: string,
|};
class Multimedia extends React.PureComponent<Props> {
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

  render(): React.Node {
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
          <AlertCircleIcon className={css.uploadError} size={36} />
        );
      }

      if (remove) {
        removeButton = (
          <XCircleIcon onClick={this.remove} className={css.removeUpload} />
        );
      }
    }

    const imageContainerClasses = [
      css.multimediaImage,
      this.props.multimediaImageCSSClass,
    ];
    let onClick;
    if (setModal) {
      imageContainerClasses.push(css.clickable);
      onClick = this.onClick;
    }

    const containerClasses = [css.multimedia, this.props.multimediaCSSClass];
    return (
      <span className={classNames(containerClasses)}>
        <span className={classNames(imageContainerClasses)} onClick={onClick}>
          <img src={this.props.uri} />
          {removeButton}
        </span>
        {progressIndicator}
        {errorIndicator}
      </span>
    );
  }

  remove: () => void = () => {
    const { remove, pendingUpload } = this.props;
    invariant(
      remove && pendingUpload,
      'Multimedia cannot be removed as either remove or pendingUpload ' +
        'are unspecified',
    );
    remove(pendingUpload.localID);
  };

  onClick: (event: SyntheticEvent<HTMLSpanElement>) => void = event => {
    event.stopPropagation();

    const { setModal, uri } = this.props;
    invariant(setModal, 'should be set');
    setModal(<MultimediaModal uri={uri} setModal={setModal} />);
  };
}

export default Multimedia;
