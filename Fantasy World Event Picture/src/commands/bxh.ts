import { Message, EmbedBuilder, User } from 'discord.js';

module.exports = {
    name: 'bxh',
    description: 'Displays the leaderboard of users with the most reactions',
    async execute(message: Message, args: string[], { reactionCounts }: any) {
        // Create a map to track total reactions per user
        const userReactions = new Map<string, number>();

        // Aggregate all reactions across all messages
        for (const messageReactions of reactionCounts.values()) {
            for (const reaction of messageReactions) {
                // Skip bot reactions
                if (reaction.userId === message.client.user?.id) continue;
                
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
        const embed = new EmbedBuilder()
            .setColor('#00BFFF') // Deep Sky Blue
            .setTitle('🏆 Bảng Xếp Hạng Reaction 🏆')
            .setDescription('Top 10 người dùng có nhiều reaction nhất')
            .setThumbnail(message.guild?.iconURL({ size: 256 }) || '')
            .setTimestamp();

        // Fetch all users at once to avoid rate limiting
        const userIds = leaderboard.map(entry => entry.userId);
        const usersMap = new Map<string, User>();
        
        try {
            const users = await Promise.all(
                userIds.map(id => message.client.users.fetch(id).catch(() => null))
            );
            
            users.forEach(user => {
                if (user) usersMap.set(user.id, user);
            });
        } catch (error) {
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
            } else {
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
    },
};