import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { getAuthenticatedHost, getHostSpaces } from './dal';

// We mock the server client to simulate DB responses without hitting Supabase
vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: vi.fn(),
  };
});
import { createClient } from '@/lib/supabase/server';

describe('dal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthenticatedHost', () => {
    it('returns user if authenticated', async () => {
      const mockUser = { id: 'user-123' };
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      } as never);

      const user = await getAuthenticatedHost();
      expect(user).toEqual(mockUser);
    });

    it('returns null if auth fails', async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Auth failed') }),
        },
      } as never);

      const user = await getAuthenticatedHost();
      expect(user).toBeNull();
    });
  });

  describe('getHostSpaces', () => {
    it('fetches spaces for specific hostId', async () => {
      const mockSpaces = [{ id: 'space-1' }];
      const eqMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockSpaces, error: null }) });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({ select: selectMock }),
      } as never);

      const spaces = await getHostSpaces('host-123');
      expect(spaces).toEqual(mockSpaces);
      expect(eqMock).toHaveBeenCalledWith('host_id', 'host-123');
    });

    it('fetches spaces for current user if no hostId provided', async () => {
      const mockSpaces = [{ id: 'space-2' }];
      const eqMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockSpaces, error: null }) });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'current-user-1' } }, error: null }),
        },
        from: vi.fn().mockReturnValue({ select: selectMock }),
      } as never);

      const spaces = await getHostSpaces();
      expect(spaces).toEqual(mockSpaces);
      expect(eqMock).toHaveBeenCalledWith('host_id', 'current-user-1');
    });

    it('returns empty array if DB returns error', async () => {
      const eqMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }) });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({ select: selectMock }),
      } as never);

      const spaces = await getHostSpaces('host-err');
      expect(spaces).toEqual([]);
    });

    it('returns empty array if no spaces found', async () => {
      const eqMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({ select: selectMock }),
      } as never);

      const spaces = await getHostSpaces('host-empty');
      expect(spaces).toEqual([]);
    });
  });
});
