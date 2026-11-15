import { Router } from 'express';
import { getActivity, getTeam } from '../controllers/bugController.js';
import { authRequired } from '../middleware/auth.js';
const router = Router();
router.use(authRequired);
router.get('/activity', getActivity);
router.get('/team', getTeam);
export default router;
