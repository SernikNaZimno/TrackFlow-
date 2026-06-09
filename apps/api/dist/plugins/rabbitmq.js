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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRabbitMQ = initRabbitMQ;
exports.publishEvent = publishEvent;
exports.closeRabbitMQ = closeRabbitMQ;
const amqplib_1 = __importDefault(require("amqplib"));
const crypto = __importStar(require("crypto"));
let channel = null;
let connection = null;
async function initRabbitMQ() {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://trackflow:trackflow@localhost:5672';
        connection = await amqplib_1.default.connect(rabbitUrl);
        channel = await connection.createChannel();
        // Assert exchange i kolejki
        await channel.assertExchange('trackflow.events', 'topic', { durable: true });
        await channel.assertQueue('trackflow.clicks', { durable: true });
        await channel.bindQueue('trackflow.clicks', 'trackflow.events', 'click.recorded');
        console.log('RabbitMQ Publisher gotowy.');
    }
    catch (error) {
        console.error('Błąd połączenia z RabbitMQ Publisher:', error);
    }
}
function publishEvent(routingKey, payload) {
    if (!channel) {
        console.error('Błąd: Próba publikacji bez aktywnego kanału RabbitMQ');
        return;
    }
    const eventId = crypto.randomUUID();
    const message = {
        event_id: eventId,
        event_type: routingKey,
        version: '1.0',
        timestamp: new Date().toISOString(),
        payload
    };
    // Używamy setImmediate, aby nie blokować pętli zdarzeń/ścieżki response
    setImmediate(() => {
        try {
            if (channel) {
                channel.publish('trackflow.events', routingKey, Buffer.from(JSON.stringify(message)), {
                    persistent: true,
                    messageId: eventId,
                    contentType: 'application/json'
                });
            }
        }
        catch (err) {
            console.error('Błąd asynchronicznej publikacji do RabbitMQ:', err);
        }
    });
}
async function closeRabbitMQ() {
    if (channel)
        await channel.close();
    if (connection)
        await connection.close();
}
