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
    name: 'bxh',
    description: 'Displays the leaderboard of users with the most reactions',
    execute(message_1, args_1, _a) {
        return __awaiter(this, arguments, void 0, function* (message, args, { reactionCounts }) {
            var _b, _c;
            // Create a map to track total reactions per user
            const userReactions = new Map();
            // Aggregate all reactions across all messages
            for (const messageReactions of reactionCounts.values()) {
                for (const reaction of messageReactions) {
                    // Skip bot reactions
                    if (reaction.userId === ((_b = message.client.user) === null || _b === void 0 ? void 0 : _b.id))
                        continue;
                    const { userId, count } = reaction;
                    const currentCount = userReactions.get(userId) || 0;
                    userReactions.set(userId, currentCount + count);
                }
            }
            // Convert to array for sorting
            const leaderboard = Array.from(userReactions.entries())
                .map(([userId, count]) => ({ userId, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // Get top 10
            // If no data available yet
            if (leaderboard.length === 0) {
                return message.reply('Chưa có dữ liệu để hiển thị bảng xếp hạng.');
            }
            // Create the leaderboard embed
            const embed = new discord_js_1.EmbedBuilder()
                .setColor('#00BFFF') // Deep Sky Blue
                .setTitle('🏆 Bảng Xếp Hạng Reaction 🏆')
                .setDescription('Top 10 người dùng có nhiều reaction nhất')
                .setThumbnail(((_c = message.guild) === null || _c === void 0 ? void 0 : _c.iconURL({ size: 256 })) || '')
                .setTimestamp();
            // Fetch all users at once to avoid rate limiting
            const userIds = leaderboard.map(entry => entry.userId);
            const usersMap = new Map();
            try {
                const users = yield Promise.all(userIds.map(id => message.client.users.fetch(id).catch(() => null)));
                users.forEach(user => {
                    if (user)
                        usersMap.set(user.id, user);
                });
            }
            catch (error) {
                console.error("Error fetching users:", error);
            }
            // Emoji medals for top 3
            const medals = ['🥇', '🥈', '🥉'];
            // Format the leaderboard entries
            let leaderboardText = '';
            leaderboard.forEach((entry, index) => {
                const rank = index + 1;
                const medal = rank <= 3 ? medals[index] : `${rank}.`;
                const user = usersMap.get(entry.userId);
                if (user) {
                    leaderboardText += `${medal} **${user.username}** - ${entry.count} reaction${entry.count !== 1 ? 's' : ''}\n`;
                }
                else {
                    leaderboardText += `${medal} User ID: ${entry.userId} - ${entry.count} reaction${entry.count !== 1 ? 's' : ''}\n`;
                }
            });
            embed.setDescription(leaderboardText);
            // Add the requester's position if they're not in top 10
            const requesterId = message.author.id;
            if (!leaderboard.some(entry => entry.userId === requesterId) && userReactions.has(requesterId)) {
                const requesterCount = userReactions.get(requesterId) || 0;
                // Find requester's position
                const position = Array.from(userReactions.entries())
                    .map(([userId, count]) => ({ userId, count }))
                    .sort((a, b) => b.count - a.count)
                    .findIndex(entry => entry.userId === requesterId) + 1;
                embed.addFields({
                    name: 'Vị trí của bạn',
                    value: `#${position} với ${requesterCount} reaction${requesterCount !== 1 ? 's' : ''}`,
                    inline: false
                });
            }
            embed.setFooter({
                text: `Requested by ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            });
            // Send the embed
            message.reply({ embeds: [embed] });
        });
    },
};
