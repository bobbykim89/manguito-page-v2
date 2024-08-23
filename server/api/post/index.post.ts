import { H3Event } from 'h3'
import { postController } from '@/server/controller'

export default defineEventHandler({
  onRequest: [
    defineRequestMiddleware(checkAuth),
    defineRequestMiddleware(async (e: H3Event) => {
      await uploadCloudinary(e)
      await readFormDataText(e)
    }),
  ],
  handler: eventHandler(postController.createNewPost),
})
