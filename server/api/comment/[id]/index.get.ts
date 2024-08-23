import { commentController } from '@/server/controller'

export default defineEventHandler({
  handler: eventHandler(commentController.getCommentsByPostId),
})
