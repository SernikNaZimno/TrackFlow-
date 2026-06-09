"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const rabbitmq_1 = require("./plugins/rabbitmq");
const server = (0, app_1.buildApp)();
async function start() {
    try {
        await (0, rabbitmq_1.initRabbitMQ)();
        await server.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Serwer API nasłuchuje na porcie 3000`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    await (0, rabbitmq_1.closeRabbitMQ)();
    process.exit(0);
});
start();
