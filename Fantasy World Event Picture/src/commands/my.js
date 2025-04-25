"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    name: 'my',
    description: 'Shows how many reactions you have received',
    execute(message_1, args_1, _a) {
        return __awaiter(this, arguments, void 0, function* (message, args, { reactionCounts }) {
            // Create variable to track user's total reactions
            let totalReactions = 0;
            // Aggregate all reactions for the requesting user
            for (const messageReactions of reactionCounts.values()) {
                for (const reaction of messageReactions) {
                    if (reaction.userId === message.author.id) {
                        totalReactions += reaction.count;
                    }
                }
            }
            // Create a beautiful embed for the user
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#FF69B4') // Hot pink color
                .setTitle('🌟 Thống kê reaction của bạn 🌟')
                .setDescription(`<@${message.author.id}>, dưới đây là thông tin reaction của bạn:`)
                .addFields({
                name: '📊 Tổng số reaction',
                value: `**${totalReactions}** reaction`,
                inline: false
            })
                .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
                .setFooter({
                text: `Requested by ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            })
                .setTimestamp();
            // Send the embed
            message.reply({ embeds: [embed] });
        });
    },
};
