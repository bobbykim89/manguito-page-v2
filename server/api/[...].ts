// any /api path or method no route answers
export default defineApiRoute({
  handler: () => {
    throw apiError('NOT_FOUND', 'No such API route.')
  },
})
