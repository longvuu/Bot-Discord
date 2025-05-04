import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
    token: process.env.TOKEN,
    prefix: 'fw',
    targetChannelId: '1364771923116163093',
    reactions: ['<:flatvn:1364955431671169124>']
};