"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoLookup = geoLookup;
const geoip_lite_1 = __importDefault(require("geoip-lite"));
function geoLookup(ip) {
    if (!ip)
        return { country: null, city: null };
    const geo = geoip_lite_1.default.lookup(ip);
    if (!geo)
        return { country: null, city: null };
    return {
        country: geo.country || null,
        city: geo.city || null
    };
}
