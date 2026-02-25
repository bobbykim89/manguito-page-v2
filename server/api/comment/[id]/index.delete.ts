import { commentController } from '../../../controller'

export default defineEventHandler({
  onRequest: [defineRequestMiddleware(checkAuth)],
  handler: eventHandler(commentController.deleteCommentById),
})
