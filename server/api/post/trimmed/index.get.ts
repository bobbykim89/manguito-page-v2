import { postController } from '@/server/controller'

export default defineEventHandler({
  handler: eventHandler(postController.getAllTrimmedPost),
})
