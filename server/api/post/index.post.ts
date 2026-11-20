import { H3Event } from 'h3'
import { postController } from '../../controller'

export default defineEventHandler({
  onRequest: [
    defineRequestMiddleware(checkAuth),
    // before the upload, so a refused request never reaches Cloudinary
    defineRequestMiddleware(requireRole('ADMIN', 'MANAGER')),
    defineRequestMiddleware(async (e: H3Event) => {
      await uploadCloudinary(e)
      await readFormDataText(e)
    }),
  ],
  handler: eventHandler(postController.createNewPost),
})
