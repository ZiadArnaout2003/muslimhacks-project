import i18n from '../i18n'

interface AuthErrorLike {
  message?: string
  status?: number
}

export function getAuthErrorMessage(error: AuthErrorLike): string {
  const message = error.message ?? ''
  if (error.status === 429 || /rate limit|too many requests/i.test(message)) {
    return i18n.t('auth.errors.emailRateLimit')
  }
  return message || i18n.t('auth.errors.generic')
}