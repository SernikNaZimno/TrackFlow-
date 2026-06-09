"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const jwt_1 = __importDefault(require("./plugins/jwt"));
const auth_1 = __importDefault(require("./routes/auth"));
const links_1 = __importDefault(require("./routes/links"));
const redirect_1 = __importDefault(require("./routes/redirect"));
function buildApp() {
    const app = (0, fastify_1.default)({
        logger: process.env.NODE_ENV === 'test' ? false : true,
        trustProxy: true
    });
    // Pluginy
    app.register(jwt_1.default);
    // Ścieżki
    app.register(auth_1.default);
    app.register(links_1.default);
    // Endpoint GET /:short_code powinien być ostatni w kolejności ładowania pluginów!
    app.register(redirect_1.default);
    return app;
}
