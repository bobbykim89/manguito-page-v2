import { userController } from '../../controller'

export default defineApiRoute({
  handler: userController.signupUser,
  status: 201,
})
