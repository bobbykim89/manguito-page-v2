import { Types } from 'mongoose'
import { apiError } from './apiError.util'

/**
 * A route param or body id as an ObjectId. Throws a 400 for a missing or
 * malformed id, so a bad id never reaches a query.
 */
export const parseObjectId = (value: string | undefined): Types.ObjectId => {
  if (
    !value ||
    !/^[0-9a-f]{24}$/i.test(value) ||
    !Types.ObjectId.isValid(value)
  )
    throw apiError('VALIDATION_FAILED', 'That id is not valid.')
  return new Types.ObjectId(value)
}
