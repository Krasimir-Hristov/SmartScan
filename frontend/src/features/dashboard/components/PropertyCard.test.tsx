import React from 'react';
import { render, screen } from '@testing-library/react';
import { PropertyCard } from './PropertyCard';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: any) => {
    const messages: Record<string, string> = {
      statusActive: 'Active',
      statusPaused: 'Paused',
      statusDraft: 'Draft',
      openGuestGuide: 'Open Guest Guide',
      guestView: 'Guest View',
      wifiNetwork: 'Wi-Fi Network',
      aiPolyglot: 'AI Polyglot',
      languagesActive: values?.count ? `${values.count}+ Languages` : 'Languages',
      acrylicPlaque: 'Acrylic Plaque',
      printReady: 'Print Ready',
    };
    return messages[key] || key;
  }
}));

describe('PropertyCard Component', () => {
  it('renders property details', () => {
    const mockProperty: any = {
      id: 'prop-2',
      name: 'Seaside Villa',
      location: 'Varna, Bulgaria',
      slug: 'seaside-varna',
      status: 'active',
      languagesCount: 50,
      wifiName: 'Seaside_Guest',
      todayScans: 10,
    };

    render(<PropertyCard property={mockProperty} />);
    
    expect(screen.getByText('Seaside Villa')).toBeInTheDocument();
    expect(screen.getByText(/Varna, Bulgaria/i)).toBeInTheDocument();
    expect(screen.getByText('/stay/seaside-varna')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Seaside_Guest')).toBeInTheDocument();
    expect(screen.getByText('50+ Languages')).toBeInTheDocument();
  });

  it('renders different statuses including fallback for unknown status', () => {
    const mockPropertyPaused: any = {
      id: 'prop-2', name: 'A', location: 'B', slug: 'c', status: 'paused', languagesCount: 50, wifiName: 'D', todayScans: 0
    };
    const { rerender } = render(<PropertyCard property={mockPropertyPaused} />);
    expect(screen.getByText('Paused')).toBeInTheDocument();

    const mockPropertyDraft: any = {
      id: 'prop-2', name: 'A', location: 'B', slug: 'c', status: 'draft', languagesCount: 50, wifiName: 'D', todayScans: 0
    };
    rerender(<PropertyCard property={mockPropertyDraft} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
    
    const mockPropertyUnknown: any = {
      id: 'prop-2', name: 'A', location: 'B', slug: 'c', status: 'unknown_status_abc', languagesCount: 50, wifiName: 'D', todayScans: 0
    };
    rerender(<PropertyCard property={mockPropertyUnknown} />);
    expect(screen.getByText('Draft')).toBeInTheDocument(); // Falls back to draft styling
  });

  it('handles missing optional fields (wifiName)', () => {
    const mockPropertyMissingWifi: any = {
      id: 'prop-2', name: 'A', location: 'B', slug: 'c', status: 'active', languagesCount: 50, todayScans: 0,
      wifiName: null // or undefined
    };
    render(<PropertyCard property={mockPropertyMissingWifi} />);
    
    // We expect the wifi component to either render empty text or not crash
    expect(screen.getByText('Wi-Fi Network')).toBeInTheDocument();
  });

  it('handles guest view click', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    
    const mockProperty: any = {
      id: 'prop-3', name: 'Test', location: 'Test', slug: 'test-slug', status: 'active', languagesCount: 1, wifiName: 'A', todayScans: 0
    };
    render(<PropertyCard property={mockProperty} />);
    
    const button = screen.getByRole('button', { name: 'Open Guest Guide' });
    const user = userEvent.setup();
    await user.click(button);
    
    expect(windowOpenSpy).toHaveBeenCalledWith('/stay/test-slug', '_blank');
    windowOpenSpy.mockRestore();
  });
});
