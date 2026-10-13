import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { RegisterSchema, LoginSchema } from '@edtech/validation';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<Response> {
    const validated = RegisterSchema.parse(req.body);
    const result = await AuthService.register(validated);
    return ApiResponse.success(res, result, 'Registration successful. Verification email issued.', 201);
  }

  public static async login(req: Request, res: Response): Promise<Response> {
    const validated = LoginSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    const { user, tokens } = await AuthService.login({
      email: validated.email,
      password: validated.password,
      ipAddress,
      userAgent
    });

    const isProd = process.env.NODE_ENV === 'production';

    // Set Refresh Token as Secure HttpOnly Cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
    });

    // Set Access Token in Cookie (as well as returning in payload for client flexibility)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 Minutes
    });

    return ApiResponse.success(res, { user, tokens }, 'Authentication successful');
  }

  public static async refresh(req: Request, res: Response): Promise<Response> {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return ApiResponse.error(res, 'Refresh token missing', 401, 'ERR_UNAUTHORIZED');
    }

    const tokens = await AuthService.refreshTokens(refreshToken);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    return ApiResponse.success(res, { tokens }, 'Tokens rotated successfully');
  }

  public static async logout(req: AuthenticatedRequest, res: Response): Promise<Response> {
    if (req.sessionId && req.user) {
      await AuthService.logout(req.sessionId, req.user.userId);
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, { loggedOut: true }, 'Logged out successfully');
  }

  public static async logoutAll(req: AuthenticatedRequest, res: Response): Promise<Response> {
    if (req.user) {
      await AuthService.logoutAll(req.user.userId, req.user.userId);
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, { loggedOutAll: true }, 'Logged out of all active sessions');
  }

  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<Response> {
    return ApiResponse.success(res, { user: req.user }, 'Current user auth payload');
  }
}
