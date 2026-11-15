import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cancelTeamRequest, getConnections, getTeamDirectory, getTeamRequests, removeConnection, respondToTeamRequest, sendTeamRequest } from '../controllers/teamController.js';

const router = Router();
router.use(authRequired);
router.get('/directory', [query('search').optional().isString().trim().isLength({ max: 80 }), validate], getTeamDirectory);
router.get('/connections', getConnections);
router.delete('/connections/:userId', [param('userId').isMongoId(), validate], removeConnection);
router.get('/requests', getTeamRequests);
router.post('/requests', [body('email').isEmail().normalizeEmail(), body('message').optional().isString().trim().isLength({ max: 500 }), validate], sendTeamRequest);
router.patch('/requests/:id/:action', [param('id').isMongoId(), param('action').isIn(['accept', 'decline']), validate], respondToTeamRequest);
router.delete('/requests/:id', [param('id').isMongoId(), validate], cancelTeamRequest);
export default router;
