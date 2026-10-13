import { Router } from 'express';
import { InvitationController } from '../../controllers/invitation.controller';

const router: Router = Router();

// Public Invitation Acceptance Endpoints
router.get('/:token', InvitationController.getInvitation);
router.post('/:token/accept', InvitationController.acceptInvitation);

export default router;
