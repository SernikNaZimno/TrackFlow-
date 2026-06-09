"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleClickRecorded = handleClickRecorded;
const crypto = __importStar(require("crypto"));
const prisma_1 = require("../lib/prisma");
const ua_parser_service_1 = require("../services/ua-parser.service");
const geo_service_1 = require("../services/geo.service");
async function handleClickRecorded(msg, channel) {
    if (!msg)
        return;
    try {
        const content = JSON.parse(msg.content.toString());
        const { event_id, payload } = content;
        // Idempotency check: upewniamy się, czy już nie przetworzyliśmy tego zdarzenia
        const exists = await prisma_1.prisma.click.findUnique({ where: { eventId: event_id } });
        if (exists) {
            channel.ack(msg);
            return;
        }
        const { device_type, browser, os } = (0, ua_parser_service_1.parseUserAgent)(payload.browser);
        const { country, city } = (0, geo_service_1.geoLookup)(payload.ip_hash);
        // RODO: Hashowanie IP z użyciem stałego saltu
        const ipSalt = process.env.IP_SALT || 'default_dev_salt_123';
        const ipHash = crypto.createHash('sha256').update((payload.ip_hash || '') + ipSalt).digest('hex');
        await prisma_1.prisma.click.create({
            data: {
                linkId: payload.link_id,
                clickedAt: new Date(payload.clicked_at),
                country,
                city,
                deviceType: device_type,
                browser,
                os,
                referrer: payload.referrer,
                ipHash,
                eventId: event_id
            }
        });
        // Potwierdzenie przetworzenia DOPIERO po zapisie
        channel.ack(msg);
    }
    catch (error) {
        console.error('Błąd w click.consumer:', error);
        // Nack z requeue (true) aby spróbować ponownie
        channel.nack(msg, false, true);
    }
}
