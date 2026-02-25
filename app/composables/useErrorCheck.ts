export const useErrorCheck = () => {
  const extractMessage = (err: unknown) => {
    if (err && typeof err === 'object' && 'statusMessage' in err) {
      return String(err.statusMessage)
    }
    if (err instanceof Error) {
      return err.message
    }
    return 'Unknown Error.'
  }

  const isAuthError = (err: unknown) => {
    // check for 401 status code
    if (
      err &&
      typeof err === 'object' &&
      'statusCode' in err &&
      err.statusCode === 401
    ) {
      return true
    }
    // check for auth-related error messages
    if (
      err instanceof Error &&
      err.message.toLowerCase().includes('no user authentication found')
    ) {
      return true
    }
    return false
  }

  return { extractMessage, isAuthError }
}
