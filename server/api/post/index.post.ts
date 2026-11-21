import type { H3Event } from 'h3'
import { postController } from '../../controller'

// reads the caption first, so a request without one never uploads an image
const uploadPostImage = async (e: H3Event) => {
  await readFormDataText(e)
  await uploadCloudinary(e)
}

export default defineApiRoute({
  middleware: [
    checkAuth,
    // before the upload, so a refused request never reaches Cloudinary
    requireRole('ADMIN', 'MANAGER'),
    uploadPostImage,
  ],
  handler: postController.createNewPost,
  status: 201,
})
