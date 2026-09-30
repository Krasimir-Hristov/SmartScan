import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WifiCard } from './WifiCard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClipboard } from '../hooks/useClipboard';

// Mock translations
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      wifiTitle: 'Wi-Fi Details',
      wifiNetwork: 'Network',
      yourPasswordLabel: 'Password',
      copyPassword: 'Copy Password',
      passwordCopied: 'Copied!',
    };
    return messages[key] || key;
  }
}));

// Mock useClipboard and useHaptic
const mockCopy = vi.fn();
vi.mock('../hooks/useClipboard', () => ({
  useClipboard: vi.fn(),
}));

const mockTriggerHaptic = vi.fn();
vi.mock('../hooks/useHaptic', () => ({
  useHaptic: () => ({ triggerHaptic: mockTriggerHaptic }),
}));

describe('WifiCard Component', () => {
  const mockWifi = {
    ssid: 'SmartScan_Guest',
    password: 'supersecretpassword',
    encryption: 'WPA3',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useClipboard).mockReturnValue({ copied: false, copy: mockCopy } as never);
  });

  it('renders wifi details correctly', () => {
    render(<WifiCard wifi={mockWifi} />);
    
    expect(screen.getByText('SmartScan_Guest')).toBeInTheDocument();
    expect(screen.getByText('supersecretpassword')).toBeInTheDocument();
    expect(screen.getByText('WPA3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Password' })).toBeInTheDocument();
  });

  it('handles copy button click', async () => {
    render(<WifiCard wifi={mockWifi} />);
    
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Copy Password' });
    
    await user.click(button);
    
    expect(mockTriggerHaptic).toHaveBeenCalledWith(50);
    expect(mockCopy).toHaveBeenCalledWith('supersecretpassword');
  });

  it('shows Copied! state after successful copy', () => {
    vi.mocked(useClipboard).mockReturnValue({ copied: true, copy: mockCopy } as never);
    render(<WifiCard wifi={mockWifi} />);
    
    const button = screen.getByRole('button', { name: 'Copied!' });
    expect(button).toBeInTheDocument();
  });

  it('handles open network (missing or empty password)', () => {
    const openWifi = { ...mockWifi, password: '' };
    render(<WifiCard wifi={openWifi} />);
    
    // Test that the component handles empty password without crashing
    expect(screen.getByText('SmartScan_Guest')).toBeInTheDocument();
  });
});
