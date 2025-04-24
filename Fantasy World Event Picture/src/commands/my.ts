import { Message, EmbedBuilder } from 'discord.js';

module.exports = {
    name: 'my',
    description: 'Shows how many reactions you have received',
    async execute(message: Message, args: string[], { reactionCounts }: any) {
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
        const embed = new EmbedBuilder()
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
    },
};