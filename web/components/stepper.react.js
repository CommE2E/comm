// @flow

import classnames from 'classnames';
import * as React from 'react';

import LoadingIndicator from '../loading-indicator.react';
import Button from './button.react';
import css from './stepper.css';

export type ButtonProps = {
  +content: React.Node,
  +disabled?: boolean,
  +loading?: boolean,
  +onClick: () => void,
};

type ButtonType = 'prev' | 'next';

type ActionButtonProps = {
  +buttonProps: ButtonProps,
  +type: ButtonType,
};

function ActionButton(props: ActionButtonProps) {
  const { buttonProps, type } = props;
  const { content, loading, disabled, onClick } = buttonProps;

  const buttonContent = loading ? (
    <>
      <div className={css.hide}>{content}</div>
      <LoadingIndicator status="loading" />
    </>
  ) : (
    content
  );

  return (
    <Button
      className={css.button}
      variant={type === 'prev' ? 'outline' : 'filled'}
      disabled={disabled || loading}
      onClick={onClick}
    >
      <div className={css.buttonContainer}>{buttonContent}</div>
    </Button>
  );
}

type ItemProps = {
  +content: React.Node,
  +name: string,
  +errorMessage?: string,
  +prevProps?: ButtonProps,
  +nextProps?: ButtonProps,
};

function StepperItem(props: ItemProps): React.Node {
  const { content, errorMessage, prevProps, nextProps } = props;

  const prevButton = React.useMemo(
    () =>
      prevProps ? <ActionButton buttonProps={prevProps} type="prev" /> : null,
    [prevProps],
  );

  const nextButton = React.useMemo(
    () =>
      nextProps ? <ActionButton buttonProps={nextProps} type="next" /> : null,
    [nextProps],
  );

  return (
    <>
      <div className={css.stepperItem}>{content}</div>
      <div className={css.errorMessage}>{errorMessage}</div>
      <div className={css.stepperFooter}>
        {prevButton}
        {nextButton}
      </div>
    </>
  );
}

type ContainerProps = {
  +activeStep: string,
  +className?: string,
  +children: React.ChildrenArray<React.Element<typeof StepperItem>>,
};

function StepperContainer(props: ContainerProps): React.Node {
  const { children, activeStep, className = '' } = props;

  const index = new Map(
    React.Children.toArray(children).map(child => [child.props.name, child]),
  );

  const activeComponent = index.get(activeStep);
  const styles = classnames(css.stepperContainer, className);

  return <div className={styles}>{activeComponent}</div>;
}

const Stepper = {
  Container: StepperContainer,
  Item: StepperItem,
};

export default Stepper;
