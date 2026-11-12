import { Request, RequestHandler, Response, Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router: Router = Router();

// Express 4 does not automatically forward rejected async controller promises
// to the error middleware. Without this wrapper, expected auth failures (such as
// invalid credentials) are returned as plain-text 500 responses.
const asyncHandler = (
  handler: (req: Request, res: Response) => Promise<unknown>
): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res)).catch(next);
};

router.post('/register', asyncHandler(AuthController.register));
router.post('/login', asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));
// Logout must remain reachable with an expired/stale access cookie so the
// browser can always clear it instead of getting trapped in a redirect loop.
router.post('/logout', asyncHandler(AuthController.logout));
router.post('/logout-all', authenticate, asyncHandler(AuthController.logoutAll));
router.get('/me', authenticate, asyncHandler(AuthController.getMe));

export default router;
