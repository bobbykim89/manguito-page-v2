import { useRuntimeConfig } from '#imports'
import { v2 as cloudinary } from 'cloudinary'
import { type H3Event, readMultipartFormData } from 'h3'
import { UPLOAD_BUDGET, UPLOAD_MESSAGES } from '#shared/dto/limits'
import { apiError } from './apiError.util'
import { detectImageType } from './imageType.util'

const config = useRuntimeConfig()

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
})

export const uploadCloudinary = async (
  e: H3Event,
  key: string = 'image',
): Promise<void> => {
  const body = await readMultipartFormData(e)
  if (!body) {
    throw apiError(
      'VALIDATION_FAILED',
      'Request body not found, please try again',
    )
  }
  const file = body.find((item) => item.name === key)
  if (!file || file.data.length === 0) {
    throw apiError('VALIDATION_FAILED', UPLOAD_MESSAGES.noFile)
  }
  if (file.data.length > UPLOAD_BUDGET) {
    throw apiError('PAYLOAD_TOO_LARGE', UPLOAD_MESSAGES.tooLarge)
  }
  // judged by the bytes; the declared type is only the client's word
  const type = detectImageType(file.data)
  if (!type) {
    throw apiError('UNSUPPORTED_MEDIA_TYPE', UPLOAD_MESSAGES.badType)
  }
  const base64EncodedImage = Buffer.from(file.data).toString('base64')
  const dataUrl = `data:${type};base64,${base64EncodedImage}`

  let public_id: string
  try {
    ;({ public_id } = await cloudinary.uploader.upload(dataUrl, {
      folder: config.cloudinaryFolderName,
    }))
  } catch (err) {
    console.error(err)
    throw apiError(
      'UPSTREAM_FAILED',
      'Could not upload the image, please try again.',
    )
  }

  e.context.file = { imageId: public_id }
}

/** Deletes an image. One that's already gone (`result: 'not found'`) is fine. */
export const deleteCloudinaryImage = async (id: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(id)
  } catch (err) {
    console.error(err)
    throw apiError(
      'UPSTREAM_FAILED',
      'Could not delete the image, please try again.',
    )
  }
}
