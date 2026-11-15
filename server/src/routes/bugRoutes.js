import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { addComment, createBug, deleteBug, exportBugs, getBug, getBugStats, listBugs, updateBug } from '../controllers/bugController.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const requiredTitle = body('title').trim().isLength({ min: 3, max: 150 });
const optionalTitle = body('title').optional().trim().isLength({ min: 3, max: 150 });
const longText = (field) => body(field).trim().isLength({ min: 1, max: 30000 });
const status = body('status').optional().isIn(['Open', 'In Progress', 'Resolved', 'Archived']);
const severity = body('severity').optional().isIn(['Low', 'Medium', 'High', 'Critical']);
const tags = body('techTags').optional().isArray({ max: 20 });
const tagValues = body('techTags.*').optional().isString().trim().isLength({ min: 1, max: 40 });
const time = body('timeSpentMinutes').optional().isFloat({ min: 0, max: 100000 }).toFloat();
const commit = body('gitCommitRef').optional({ nullable: true }).isLength({ max: 500 }).trim();

router.use(authRequired);
router.get('/stats', getBugStats);
router.get('/', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), validate], listBugs);
router.post('/', [requiredTitle, longText('description'), longText('rootCause'), longText('fix'), status, severity, tags, tagValues, time, commit, validate], createBug);
router.post('/export', [body('format').optional().isIn(['json', 'csv', 'markdown']), validate], exportBugs);
router.get('/:id', [param('id').isMongoId(), validate], getBug);
router.put('/:id', [param('id').isMongoId(), optionalTitle, longText('description').optional(), longText('rootCause').optional(), longText('fix').optional(), status, severity, tags, tagValues, time, commit, validate], updateBug);
router.delete('/:id', [param('id').isMongoId(), validate], deleteBug);
router.post('/:id/comments', [param('id').isMongoId(), body('text').trim().isLength({ min: 1, max: 5000 }), validate], addComment);
export default router;
