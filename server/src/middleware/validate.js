import { validationResult } from 'express-validator';
import { HttpError } from '../utils/httpError.js';

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(422, 'Please check the highlighted fields.', errors.array().map(({ path, msg }) => ({ field: path, message: msg }))));
  }
  next();
}
