import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { User, IUser } from '../models/User';
import { AppError } from '../middleware/error.middleware';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: IUser;
  tokens: TokenPair;
}

const signAccessToken = (userId: string, role: string): string =>
  jwt.sign({ id: userId, role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'] });

const signRefreshToken = (userId: string): string =>
  jwt.sign({ id: userId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] });

export class AuthService {
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await User.findOne({ email, isActive: true }).select('+password +refreshToken');

    if (!user) throw new AppError('Invalid email or password', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    const tokens = this.generateTokens(user.id as string, user.role);

    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return { user, tokens };
  }

  async register(data: { name: string; email: string; password: string; role?: IUser['role'] }): Promise<IUser> {
    const exists = await User.findOne({ email: data.email });
    if (exists) throw new AppError('Email already registered', 409);

    const user = await User.create(data);
    return user;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let decoded: { id: string };
    try {
      decoded = jwt.verify(refreshToken, env.jwt.refreshSecret) as { id: string };
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Refresh token mismatch', 401);
    }

    const tokens = this.generateTokens(user.id as string, user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: '' } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    user.password = newPassword;
    await user.save();
  }

  async getProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  private generateTokens(userId: string, role: string): TokenPair {
    return {
      accessToken: signAccessToken(userId, role),
      refreshToken: signRefreshToken(userId),
    };
  }
}

export const authService = new AuthService();
