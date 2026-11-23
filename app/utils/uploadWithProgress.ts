import { UPLOAD_MESSAGES } from '#shared/dto/limits'
import { ApiError, isApiFailure, toApiError } from './apiError'

export type UploadOptions = {
  /** The session token, sent verbatim as `Authorization` (like $api). */
  token?: string | null
  /** 0–100 as the request body goes up. */
  onProgress?: (percent: number) => void
}

const parse = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * POSTs a form to an /api route over XMLHttpRequest, which (unlike fetch)
 * reports upload progress. Resolves the envelope's `data`; throws ApiError
 * like $api does. A 413 with no envelope is Vercel refusing the body before
 * it reached our code.
 */
export const uploadWithProgress = <T>(
  url: string,
  body: FormData,
  { token, onProgress }: UploadOptions,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    if (token) xhr.setRequestHeader('Authorization', token)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0)
        onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      const envelope = parse(xhr.responseText)
      if (
        envelope &&
        typeof envelope === 'object' &&
        'ok' in envelope &&
        envelope.ok === true &&
        'data' in envelope
      ) {
        resolve(envelope.data as T)
        return
      }
      if (isApiFailure(envelope)) {
        const { code, message, details } = envelope.error
        reject(new ApiError(xhr.status, code, message, details))
        return
      }
      if (xhr.status === 413) {
        reject(new ApiError(413, 'PAYLOAD_TOO_LARGE', UPLOAD_MESSAGES.tooLarge))
        return
      }
      reject(toApiError({ status: xhr.status }))
    }
    xhr.onerror = () => reject(toApiError({ status: 0 }))
    xhr.send(body)
  })
