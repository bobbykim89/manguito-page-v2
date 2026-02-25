import { commentController } from '../../controller'

export default defineEventHandler({
  handler: eventHandler(commentController.getAllComment),
})
