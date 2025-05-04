import { Message, EmbedBuilder, User, MessageReaction, TextChannel, Collection } from 'discord.js';
import { config } from '../config';

// Danh sách emoji hợp lệ (IDs)
const VALID_EMOJI_IDS = [
    '1364955431671169124'
];

// Emoji cơ bản hợp lệ

// Số lượng tin nhắn tối đa để lấy (có thể điều chỉnh theo nhu cầu)
const MAX_MESSAGES_TO_FETCH = 500;
// Số lượng tin nhắn trong mỗi batch
const MESSAGES_PER_BATCH = 100;
// Số lượng reactions trong mỗi batch
const REACTIONS_PER_BATCH = 100;

module.exports = {
    name: 'bxh',
    description: 'Displays the leaderboard of reactions on images in the target channel',
    async execute(message: Message, args: string[]) {
        try {
            // Get the target channel - using the specific ID for the channel
            const targetChannelId = '1364771923116163093';
            const targetChannel = message.client.channels.cache.get(targetChannelId) as TextChannel;
            
            if (!targetChannel) {
                console.log(`Không tìm thấy kênh với ID: ${targetChannelId}`);
                return message.reply(`Không tìm thấy kênh với ID: ${targetChannelId}`);
            }
            
            // Notify user that we're fetching messages
            const loadingMsg = await message.reply('Đang tải dữ liệu từ kênh... (Quá trình này có thể mất vài phút)');
            console.log(`Đang tải dữ liệu từ kênh ${targetChannelId}...`);
            
            // Fetch messages in batches to get more than 100 messages
            let allMessages = new Collection<string, Message>();
            let lastMessageId: string | undefined = undefined;
            let messagesLoaded = 0;
            
            // Loop until we've fetched the maximum number of messages or there are no more messages
            while (messagesLoaded < MAX_MESSAGES_TO_FETCH) {
                // Fetch the next batch of messages
                const options: { limit: number; before?: string } = { limit: MESSAGES_PER_BATCH };
                if (lastMessageId) {
                    options.before = lastMessageId;
                }
                
                const messages = await targetChannel.messages.fetch(options);
                
                // If we didn't get any messages in this batch, break the loop
                if (messages.size === 0) break;
                
                // Add this batch to our collection
                messages.forEach((msg, id) => {
                    allMessages.set(id, msg);
                });
                
                // Update the ID for the next pagination
                const lastMsg = messages.last();
                if (lastMsg) {
                    lastMessageId = lastMsg.id;
                }
                
                messagesLoaded += messages.size;
                
                // Update loading message every 200 messages
                if (messagesLoaded % 200 === 0) {
                    await loadingMsg.edit(`Đang tải dữ liệu... Đã tải ${messagesLoaded} tin nhắn.`);
                }
                
                // If we didn't get a full batch, we've reached the end of the channel history
                if (messages.size < MESSAGES_PER_BATCH) break;
                
                // Add a short delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(`Đã tải tổng cộng ${allMessages.size} tin nhắn từ kênh.`);
            await loadingMsg.edit(`Đã tải ${allMessages.size} tin nhắn. Đang xử lý...`);
            
            // Filter messages with attachments (images)
            const messagesWithImages = allMessages.filter(msg => msg.attachments.size > 0);
            console.log(`Tìm thấy ${messagesWithImages.size} tin nhắn có ảnh.`);
            
            if (messagesWithImages.size === 0) {
                return loadingMsg.edit('Không tìm thấy bức ảnh nào trong kênh.');
            }
            
            // Structure to store image reaction data
            interface ImageData {
                messageId: string;
                authorId: string;
                authorName: string;
                url: string;
                reactionCount: number;
            }
            
            const imagesData: ImageData[] = [];
            let processedImages = 0;
            
            // Để theo dõi các promises
            const processPromises: Promise<void>[] = [];
            
            // Iterate through messages with images
            for (const [_, msg] of messagesWithImages) {
                // Tạo một promise cho mỗi tin nhắn và thêm vào danh sách
                const processPromise = (async () => {
                    let totalReactions = 0;
                    
                    // Increment processed counter and update loading message periodically
                    processedImages++;
                    if (processedImages % 20 === 0) {
                        await loadingMsg.edit(`Đã xử lý ${processedImages}/${messagesWithImages.size} ảnh...`);
                    }
                    
                    // Danh sách promises cho việc xử lý reaction
                    const reactionPromises: Promise<void>[] = [];
                    
                    // Check each reaction on the message
                    for (const [emojiId, reaction] of msg.reactions.cache) {
                        // Tạo promise cho mỗi reaction và thêm vào danh sách
                        const reactionPromise = (async () => {
                            let isValidEmoji = false;
                            
                            // Kiểm tra nếu emoji là custom emoji dạng <:name:id>
                            if (emojiId.includes(':')) {
                                const match = emojiId.match(/<:.+:(\d+)>/);
                                const emojiIdPart = match ? match[1] : null;
                                
                                if (emojiIdPart && VALID_EMOJI_IDS.includes(emojiIdPart)) {
                                    isValidEmoji = true;
                                }
                            }
                            // Kiểm tra nếu emoji ID trực tiếp
                            else if (VALID_EMOJI_IDS.includes(emojiId)) {
                                isValidEmoji = true;
                            }
                            // Kiểm tra nếu là emoji cơ bản
                            
                            if (isValidEmoji) {
                                // Lấy tất cả người dùng đã react với phân trang
                                let allUsers = new Collection<string, User>();
                                let afterId: string | undefined = undefined;
                                
                                // Lặp cho đến khi lấy hết tất cả người dùng đã react
                                while (true) {
                                    // Cấu hình tùy chọn phân trang
                                    const options: { limit: number; after?: string } = { limit: REACTIONS_PER_BATCH };
                                    if (afterId) {
                                        options.after = afterId;
                                    }
                                    
                                    // Lấy một batch người dùng đã react
                                    const users = await reaction.users.fetch(options);
                                    
                                    // Nếu không có người dùng nào, thoát vòng lặp
                                    if (users.size === 0) break;
                                    
                                    // Thêm vào collection người dùng
                                    users.forEach((user, userId) => {
                                        allUsers.set(userId, user);
                                    });
                                    
                                    // Cập nhật ID cho lần phân trang tiếp theo
                                    const lastUser = users.last();
                                    if (lastUser) {
                                        afterId = lastUser.id;
                                    } else {
                                        break;
                                    }
                                    
                                    // Nếu không lấy đủ một batch đầy đủ, có nghĩa là đã hết
                                    if (users.size < REACTIONS_PER_BATCH) break;
                                    
                                    // Thêm độ trễ nhỏ để tránh rate limits
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                }
                                
                                // Lọc ra những người dùng hợp lệ (không phải tác giả của tin nhắn)
                                const validReactions = allUsers.filter(user => user.id !== msg.author.id).size;
                                totalReactions += validReactions;
                                
                                console.log(`Tin nhắn ${msg.id}: emoji ${emojiId} có ${validReactions} reaction hợp lệ (Tổng người dùng: ${allUsers.size})`);
                            }
                        })();
                        
                        // Thêm promise vào danh sách
                        reactionPromises.push(reactionPromise);
                    }
                    
                    // Đợi tất cả promises xử lý reaction hoàn thành
                    await Promise.all(reactionPromises);
                    
                    // If there are valid reactions, add to our data
                    if (totalReactions > 0) {
                        const attachment = msg.attachments.first();
                        imagesData.push({
                            messageId: msg.id,
                            authorId: msg.author.id,
                            authorName: msg.author.username,
                            url: attachment ? attachment.url : 'Không có URL',
                            reactionCount: totalReactions
                        });
                        console.log(`Đã thêm tin nhắn từ ${msg.author.username} vào danh sách với ${totalReactions} reaction`);
                    }
                })();
                
                // Thêm promise vào danh sách
                processPromises.push(processPromise);
            }
            
            // Đợi tất cả promises xử lý message hoàn thành
            await Promise.all(processPromises);
            
            // Sort images by reaction count (highest first)
            imagesData.sort((a, b) => b.reactionCount - a.reactionCount);
            
            // Take top 10 images
            const topImages = imagesData.slice(0, 10);
            
            // If no data available yet
            if (topImages.length === 0) {
                return loadingMsg.edit('Chưa có ảnh nào nhận được reaction.');
            }
            
            // Create the leaderboard embed
            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('🏆 Bảng Xếp Hạng Ảnh Được React Nhiều Nhất 🏆')
                .setDescription(`Top 10 ảnh có nhiều lượt react nhất trong kênh <#${targetChannelId}>`)
                .setThumbnail(message.guild?.iconURL({ size: 256 }) || '')
                .setTimestamp();
            
            // Emoji medals for top 3
            const medals = ['🥇', '🥈', '🥉'];
            
            // Format the leaderboard entries
            let leaderboardText = '';
            
            topImages.forEach((image, index) => {
                const rank = index + 1;
                const medal = rank <= 3 ? medals[index] : `${rank}.`;
                
                leaderboardText += `${medal} **${image.authorName}**: ${image.reactionCount} reaction${image.reactionCount !== 1 ? 's' : ''}\n`;
                leaderboardText += `[Xem ảnh](https://discord.com/channels/${message.guild?.id}/${targetChannelId}/${image.messageId})\n\n`;
            });
            
            embed.setDescription(leaderboardText);
            
            // Thêm thông tin thống kê
            embed.addFields({
                name: 'Thống kê',
                value: `Đã quét: ${allMessages.size} tin nhắn\nTìm thấy: ${messagesWithImages.size} ảnh\nCó reaction: ${imagesData.length} ảnh`,
                inline: false
            });
            
            embed.setFooter({ 
                text: `Requested by ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });
            
            // Send the embed
            loadingMsg.edit({ content: null, embeds: [embed] });
            console.log('Đã gửi bảng xếp hạng thành công');
            
        } catch (error) {
            console.error("Error processing reactions:", error);
            message.reply('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
        }
    },
};