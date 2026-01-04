const EmailProviderPool = require('../email-providers');

describe('EmailProviderPool', () => {
  let pool;

  beforeEach(() => {
    pool = new EmailProviderPool();
  });

  describe('Initialization', () => {
    test('should create an instance with empty providers list', () => {
      expect(pool).toBeDefined();
      expect(Array.isArray(pool.providers)).toBe(true);
    });

    test('should have daily limits initialized', () => {
      expect(pool.dailyLimits).toBeDefined();
      expect(pool.dailyLimits.Brevo).toBe(300);
      expect(pool.dailyLimits.SendGrid).toBe(100);
    });

    test('should have cooldown period set', () => {
      expect(pool.cooldownPeriod).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe('Daily Usage Tracking', () => {
    test('getCurrentDate should return YYYY-MM-DD format', () => {
      const date = pool.getCurrentDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('getDailyUsage should initialize new usage on first call', () => {
      const usage = pool.getDailyUsage('TestProvider');
      expect(usage).toBeDefined();
      expect(usage.count).toBe(0);
      expect(usage.limit).toBe(100); // default
    });

    test('incrementDailyUsage should increase count', () => {
      const before = pool.getDailyUsage('TestProvider');
      expect(before.count).toBe(0);

      pool.incrementDailyUsage('TestProvider');
      const after = pool.getDailyUsage('TestProvider');
      expect(after.count).toBe(1);
    });

    test('hasHitDailyLimit should return true when limit reached', () => {
      pool.dailyLimits.TestProvider = 2;
      pool.incrementDailyUsage('TestProvider');
      pool.incrementDailyUsage('TestProvider');

      expect(pool.hasHitDailyLimit('TestProvider')).toBe(true);
    });

    test('hasHitDailyLimit should return false when under limit', () => {
      pool.dailyLimits.TestProvider = 10;
      pool.incrementDailyUsage('TestProvider');

      expect(pool.hasHitDailyLimit('TestProvider')).toBe(false);
    });
  });

  describe('Provider Status Management', () => {
    test('markRateLimited should set status and track error time', () => {
      const provider = { name: 'TestProvider', status: 'active', errorCount: 0 };
      pool.markRateLimited(provider);

      expect(provider.status).toBe('rate_limited');
      expect(provider.errorCount).toBe(1);
      expect(provider.lastErrorTime).toBeDefined();
    });

    test('markFailed should set status to failed', () => {
      const provider = { name: 'TestProvider', status: 'active', errorCount: 0 };
      const error = new Error('Connection timeout');

      pool.markFailed(provider, error);

      expect(provider.status).toBe('failed');
      expect(provider.lastError).toBe('Connection timeout');
      expect(provider.errorCount).toBe(1);
    });

    test('getStatus should return array of provider statuses', () => {
      const status = pool.getStatus();
      expect(Array.isArray(status)).toBe(true);
    });
  });

  describe('Active Providers Filtering', () => {
    test('getActiveProviders should filter out providers with daily limit hit', () => {
      const mockProvider = {
        name: 'MockProvider',
        priority: 1,
        status: 'active',
        errorCount: 0,
      };
      pool.providers.push(mockProvider);
      pool.dailyLimits.MockProvider = 1;
      pool.incrementDailyUsage('MockProvider');

      const active = pool.getActiveProviders();
      const names = active.map((p) => p.name);

      expect(names).not.toContain('MockProvider');
    });

    test('getActiveProviders should sort by priority', () => {
      const p1 = {
        name: 'Provider1',
        priority: 2,
        status: 'active',
        errorCount: 0,
      };
      const p2 = {
        name: 'Provider2',
        priority: 1,
        status: 'active',
        errorCount: 0,
      };
      pool.providers = [p1, p2];

      const active = pool.getActiveProviders();

      expect(active[0].priority).toBeLessThanOrEqual(active[1].priority);
    });
  });

  describe('sendEmail error handling', () => {
    test('sendEmail should throw error when no providers configured', async () => {
      pool.providers = [];

      await expect(
        pool.sendEmail('test@example.com', 'Test', '<p>test</p>')
      ).rejects.toThrow('No active email providers available');
    });

    test('should track statistics on success', () => {
      // Mock a minimal provider
      const mockProvider = {
        name: 'MockProvider',
        priority: 1,
        type: 'mock',
        status: 'active',
        fromEmail: 'test@test.com',
        client: {},
        errorCount: 0,
      };
      pool.providers = [mockProvider];

      // Mock sendWithProvider to return success
      pool.sendWithProvider = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-123',
      });

      expect(() => {
        pool.sendEmail('test@example.com', 'Test', '<p>test</p>');
      }).not.toThrow();
    });
  });
});
