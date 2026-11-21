import { type H3Event, readMultipartFormData } from 'h3'
import { apiError } from './apiError.util'

export const readFormDataText = async (
  e: H3Event,
  key: string = 'content',
): Promise<void> => {
  const body = await readMultipartFormData(e)
  if (!body) {
    throw apiError(
      'VALIDATION_FAILED',
      'Request body not found, please try again',
    )
  }
  const content = body.find((item) => item.name === key)
  if (!content) {
    throw apiError('VALIDATION_FAILED', 'Content field not found')
  }
  const decodedContent = Buffer.from(content.data).toString()
  e.context[key] = decodedContent
}
