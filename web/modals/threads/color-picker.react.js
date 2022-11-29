// @flow

import * as React from 'react';
import { type ColorResult, ChromePicker } from 'react-color';

import css from '../../style.css';

type Props = {
  +id: string,
  +value: string,
  +disabled: boolean,
  +onChange: (hex: string) => void,
};
type State = {
  +pickerOpen: boolean,
};

class ColorPicker extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      pickerOpen: false,
    };
  }

  render(): React.Node {
    let picker = null;
    if (this.state.pickerOpen && !this.props.disabled) {
      picker = (
        <div className={css['color-picker-selector']}>
          <ChromePicker
            color={this.props.value}
            onChangeComplete={this.onChangeColor}
            disableAlpha={true}
          />
        </div>
      );
    }
    const style = { backgroundColor: `#${this.props.value}` };
    return (
      <div
        className={css['color-picker-container']}
        tabIndex="0"
        onClick={this.onClick}
        onBlur={this.onBlur}
        onKeyDown={this.onPickerKeyDown}
      >
        <div className={css['color-picker-button']}>
          <div className={css['color-picker-preview']} style={style} />
          <div className={css['color-picker-down-symbol']}>▼</div>
        </div>
        {picker}
      </div>
    );
  }

  onPickerKeyDown: (
    event: SyntheticKeyboardEvent<HTMLTextAreaElement>,
  ) => void = event => {
    if (event.key === 'Escape') {
      this.setState({ pickerOpen: false });
    }
  };

  onChangeColor: (color: ColorResult) => void = color => {
    this.props.onChange(color.hex.substring(1, 7));
  };

  onClick: () => void = () => {
    this.setState({ pickerOpen: true });
  };

  onBlur: () => void = () => {
    this.setState({ pickerOpen: false });
  };
}

export default ColorPicker;
