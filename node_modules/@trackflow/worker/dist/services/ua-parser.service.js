"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUserAgent = parseUserAgent;
const ua_parser_js_1 = require("ua-parser-js");
function parseUserAgent(uaString) {
    if (!uaString)
        return { device_type: null, browser: null, os: null };
    try {
        const parser = new ua_parser_js_1.UAParser(uaString);
        const result = parser.getResult();
        let device_type = 'desktop';
        if (result.device.type === 'mobile')
            device_type = 'mobile';
        if (result.device.type === 'tablet')
            device_type = 'tablet';
        const browser = result.browser.name || null;
        const os = result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : null;
        return { device_type, browser, os };
    }
    catch (error) {
        return { device_type: null, browser: null, os: null };
    }
}
