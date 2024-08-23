import { postController } from '@/server/controller'

export default defineEventHandler({
  onRequest: [defineRequestMiddleware(checkAuth)],
  handler: eventHandler(postController.updatePost),
})
