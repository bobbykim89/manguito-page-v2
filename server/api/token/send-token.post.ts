import { tokenController } from '../../controller'

export default defineApiRoute({
  handler: tokenController.sentToken,
})
