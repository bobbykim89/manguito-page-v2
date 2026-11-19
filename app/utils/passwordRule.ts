/** The password rule for signup and reset; also the inputs' native `pattern`. */
export const passwordPattern =
  '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_])[A-Za-z\\d\\W_]{8,}$'

/** True once something is typed that doesn't meet the rule (empty is not flagged). */
export const breaksPasswordRule = (value: string): boolean =>
  value !== '' && !new RegExp(passwordPattern).test(value)
