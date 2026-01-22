/**
 * useClickOutside Hook Tests
 *
 * Tests for the click outside detection hook
 */

import React, { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useClickOutside } from '../useClickOutside';

// Test component that uses the hook
const TestComponent: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [clickedOutside, setClickedOutside] = useState(false);

  useClickOutside(ref, () => setClickedOutside(true), enabled);

  return (
    <div>
      <div data-testid="outside-area">Outside Area</div>
      <div ref={ref} data-testid="inside-area">
        Inside Area
        <button data-testid="inside-button">Inside Button</button>
      </div>
      <span data-testid="clicked-outside">{clickedOutside ? 'yes' : 'no'}</span>
    </div>
  );
};

// Test component with toggle for enabled state
const ToggleTestComponent: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [clickCount, setClickCount] = useState(0);

  useClickOutside(ref, () => setClickCount((c) => c + 1), enabled);

  return (
    <div>
      <div data-testid="outside-area">Outside</div>
      <div ref={ref} data-testid="inside-area">Inside</div>
      <span data-testid="click-count">{clickCount}</span>
      <button data-testid="toggle-btn" onClick={() => setEnabled(!enabled)}>
        Toggle (currently: {enabled ? 'enabled' : 'disabled'})
      </button>
    </div>
  );
};

describe('useClickOutside', () => {
  it('should call callback when clicking outside the referenced element', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('clicked-outside')).toHaveTextContent('no');

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-area'));

    expect(screen.getByTestId('clicked-outside')).toHaveTextContent('yes');
  });

  it('should NOT call callback when clicking inside the referenced element', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('clicked-outside')).toHaveTextContent('no');

    // Click inside
    fireEvent.mouseDown(screen.getByTestId('inside-area'));

    expect(screen.getByTestId('clicked-outside')).toHaveTextContent('no');
  });

  it('should NOT call callback when clicking on a child element inside', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('clicked-outside')).toHaveTextContent('no');

    // Click on button inside
    fireEvent.mouseDown(screen.getByTestId('inside-button'));

    expect(screen.getByTestId('clicked-outside')).toHaveTextContent('no');
  });

  it('should NOT call callback when disabled', () => {
    render(<TestComponent enabled={false} />);

    expect(screen.getByTestId('clicked-outside')).toHaveTextContent('no');

    // Click outside - should NOT trigger because disabled
    fireEvent.mouseDown(screen.getByTestId('outside-area'));

    expect(screen.getByTestId('clicked-outside')).toHaveTextContent('no');
  });

  it('should respect enabled toggle', () => {
    render(<ToggleTestComponent />);

    expect(screen.getByTestId('click-count')).toHaveTextContent('0');

    // Click outside while enabled
    fireEvent.mouseDown(screen.getByTestId('outside-area'));
    expect(screen.getByTestId('click-count')).toHaveTextContent('1');

    // Disable the hook
    fireEvent.click(screen.getByTestId('toggle-btn'));

    // Click outside while disabled - count should not increase
    fireEvent.mouseDown(screen.getByTestId('outside-area'));
    expect(screen.getByTestId('click-count')).toHaveTextContent('1');

    // Re-enable the hook
    fireEvent.click(screen.getByTestId('toggle-btn'));

    // Click outside while enabled again
    fireEvent.mouseDown(screen.getByTestId('outside-area'));
    expect(screen.getByTestId('click-count')).toHaveTextContent('2');
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = render(<TestComponent />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('should add event listener on mount', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

    render(<TestComponent />);

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  it('should handle multiple rapid clicks outside', () => {
    const callbackMock = jest.fn();

    const MultiClickComponent: React.FC = () => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, callbackMock);
      return (
        <div>
          <div data-testid="outside">Outside</div>
          <div ref={ref} data-testid="inside">Inside</div>
        </div>
      );
    };

    render(<MultiClickComponent />);

    // Multiple clicks outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    fireEvent.mouseDown(screen.getByTestId('outside'));
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(callbackMock).toHaveBeenCalledTimes(3);
  });
});
