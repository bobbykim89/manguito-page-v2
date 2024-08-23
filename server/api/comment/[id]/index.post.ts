import { commentController } from '@/server/controller'

export default defineEventHandler({
  onRequest: [defineRequestMiddleware(checkAuth)],
  handler: eventHandler(commentController.createNewComment),
})
