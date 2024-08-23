import { createError, type H3Event, readMultipartFormData } from 'h3'

export const readFormDataText = async (
  e: H3Event,
  key: string = 'content'
): Promise<void> => {
  const body = await readMultipartFormData(e)
  if (!body) {
    throw createError({
      status: 404,
      message: 'Not found',
      statusMessage: 'Request body not found, please try again',
    })
  }
  const content = body.find((item) => item.name === key)
  if (!content) {
    throw createError({
      status: 404,
      message: 'Not found',
      statusMessage: 'Content field not found',
    })
  }
  const decodedContent = Buffer.from(content.data).toString()
  e.context[key] = decodedContent
}
