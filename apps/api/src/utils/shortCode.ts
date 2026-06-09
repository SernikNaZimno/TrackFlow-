import { randomBytes } from 'crypto'

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
const LENGTH = 6

export function generateShortCode(): string {
  let result = ''
  const bytes = randomBytes(LENGTH)
  for (let i = 0; i < LENGTH; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return result
}
