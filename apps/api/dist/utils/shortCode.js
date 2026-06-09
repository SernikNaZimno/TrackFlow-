"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShortCode = generateShortCode;
const crypto_1 = require("crypto");
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 6;
function generateShortCode() {
    let result = '';
    const bytes = (0, crypto_1.randomBytes)(LENGTH);
    for (let i = 0; i < LENGTH; i++) {
        result += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return result;
}
