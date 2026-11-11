const User = require('../../models/User');
const db = require('../../utils/db');

// Mock the database module
jest.mock('../../utils/db');

describe('User Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create User instance with correct properties', () => {
      const userData = {
        id: 1,
        email: 'test@example.com',
        account_type: 'band',
        created_at: new Date(),
        last_login: new Date(),
        is_active: true
      };

      const user = new User(userData);

      expect(user.id).toBe(1);
      expect(user.email).toBe('test@example.com');
      expect(user.accountType).toBe('band');
      expect(user.createdAt).toEqual(userData.created_at);
      expect(user.lastLogin).toEqual(userData.last_login);
      expect(user.isActive).toBe(true);
    });
  });

  describe('findByEmail', () => {
    it('should return User instance when email exists', async () => {
      const mockUserData = {
        id: 1,
        email: 'band@example.com',
        account_type: 'band',
        created_at: new Date(),
        last_login: new Date(),
        is_active: true
      };

      db.query.mockResolvedValue({
        rows: [mockUserData]
      });

      const user = await User.findByEmail('band@example.com');

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['band@example.com']
      );
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe('band@example.com');
      expect(user.accountType).toBe('band');
    });

    it('should return null when email does not exist', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      const user = await User.findByEmail('nonexistent@example.com');

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['nonexistent@example.com']
      );
      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user and return User instance', async () => {
      const mockUserData = {
        id: 1,
        email: 'newband@example.com',
        account_type: 'band',
        created_at: new Date(),
        last_login: null,
        is_active: true
      };

      db.query.mockResolvedValue({
        rows: [mockUserData]
      });

      const user = await User.create(
        'newband@example.com',
        'hashedPassword123',
        'band'
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['newband@example.com', 'hashedPassword123', 'band']
      );
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe('newband@example.com');
      expect(user.accountType).toBe('band');
    });

    it('should create an organizer account', async () => {
      const mockUserData = {
        id: 2,
        email: 'organizer@example.com',
        account_type: 'organizer',
        created_at: new Date(),
        last_login: null,
        is_active: true
      };

      db.query.mockResolvedValue({
        rows: [mockUserData]
      });

      const user = await User.create(
        'organizer@example.com',
        'hashedPassword456',
        'organizer'
      );

      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe('organizer@example.com');
      expect(user.accountType).toBe('organizer');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const userData = {
        id: 1,
        email: 'test@example.com',
        account_type: 'band',
        created_at: new Date(),
        last_login: null,
        is_active: true
      };

      db.query.mockResolvedValue({ rows: [] });

      const user = new User(userData);
      await user.updateLastLogin();

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [1]
      );
    });
  });

  describe('isBand', () => {
    it('should return true for band account type', () => {
      const userData = {
        id: 1,
        email: 'band@example.com',
        account_type: 'band',
        created_at: new Date(),
        last_login: null,
        is_active: true
      };

      const user = new User(userData);
      expect(user.isBand()).toBe(true);
    });

    it('should return false for organizer account type', () => {
      const userData = {
        id: 2,
        email: 'organizer@example.com',
        account_type: 'organizer',
        created_at: new Date(),
        last_login: null,
        is_active: true
      };

      const user = new User(userData);
      expect(user.isBand()).toBe(false);
    });
  });

  describe('isOrganizer', () => {
    it('should return true for organizer account type', () => {
      const userData = {
        id: 2,
        email: 'organizer@example.com',
        account_type: 'organizer',
        created_at: new Date(),
        last_login: null,
        is_active: true
      };

      const user = new User(userData);
      expect(user.isOrganizer()).toBe(true);
    });

    it('should return false for band account type', () => {
      const userData = {
        id: 1,
        email: 'band@example.com',
        account_type: 'band',
        created_at: new Date(),
        last_login: null,
        is_active: true
      };

      const user = new User(userData);
      expect(user.isOrganizer()).toBe(false);
    });
  });
});
