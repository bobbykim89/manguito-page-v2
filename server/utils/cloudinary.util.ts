import { useRuntimeConfig } from '#imports'
import { v2 as cloudinary } from 'cloudinary'
import { createError, type H3Event, readMultipartFormData } from 'h3'
import { apiError } from './apiError.util'

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
  const file = body.find((item) => {
    return item.name === key
  })
  if (!file) {
    throw apiError('VALIDATION_FAILED', 'File not found')
  }
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    throw apiError(
      'UNSUPPORTED_MEDIA_TYPE',
      'Unsupported media type please check if file has png or jpeg format',
    )
  }
  const base64EncodedImage = Buffer.from(file.data).toString('base64')
  const dataUrl = `data:${file.type};base64,${base64EncodedImage}`

  const { public_id } = await cloudinary.uploader.upload(
    dataUrl,
    {
      folder: config.cloudinaryFolderName,
    },
    (err) => {
      if (err) {
        throw createError({
          status: err.http_code,
          message: err.message,
          statusMessage: err.message,
        })
      }
    },
  )

  e.context.file = { imageId: public_id }
}

export const deleteCloudinaryImage = async (id: string): Promise<void> => {
  await cloudinary.uploader.destroy(id)
}
