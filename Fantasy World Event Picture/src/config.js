"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
exports.config = {
    token: process.env.TOKEN,
    prefix: 'fw',
    targetChannelId: '1364771923116163093',
    reactions: ['<:flatvn:1364955431671169124>']
};
