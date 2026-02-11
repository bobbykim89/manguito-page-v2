import { postController } from '../../../controller'

export default defineEventHandler({
  onRequest: [defineRequestMiddleware(checkAuth)],
  handler: eventHandler(postController.updatePost),
})
