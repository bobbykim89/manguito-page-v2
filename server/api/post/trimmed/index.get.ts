import { postController } from '../../../controller'

export default defineEventHandler({
  handler: eventHandler(postController.getAllTrimmedPost),
})
