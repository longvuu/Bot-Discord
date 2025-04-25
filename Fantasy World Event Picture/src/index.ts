import { Client, IntentsBitField, Message, MessageReaction, PartialMessageReaction, User, PartialUser, Partials, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import { config } from './config';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Create a new client instance
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User
    ],
});

// Command collection
const commands = new Map();

// Load all command files
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands'))
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
}

// Data structure to keep track of reactions
interface ReactionCount {
    userId: string;
    count: number;
}

// Store reaction counts
const reactionCounts: Map<string, ReactionCount[]> = new Map();

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    console.log(`Bot is ready to react to images in channel: ${config.targetChannelId}`);
    
    // Log all available guilds and channels for debugging
    console.log('Available guilds:');
    client.guilds.cache.forEach(guild => {
        console.log(`- ${guild.name} (${guild.id})`);
        console.log('  Channels:');
        guild.channels.cache.forEach(channel => {
            console.log(`  - ${channel.name} (${channel.id})`);
        });
    });

    // Load past messages and reactions
    try {
        await loadPastMessagesAndReactions();
        console.log('Successfully loaded past messages and reactions');
    } catch (error) {
        console.error('Error loading past messages and reactions:', error);
    }
});

/**
 * Load past messages and reactions from the target channel
 * This helps maintain reaction data across bot restarts
 */
async function loadPastMessagesAndReactions() {
    console.log(`Loading past messages from channel: ${config.targetChannelId}...`);
    
    // Get the target channel
    const channel = await client.channels.fetch(config.targetChannelId);
    if (!channel || !(channel instanceof TextChannel)) {
        console.error(`Failed to find target channel or channel is not a text channel`);
        return;
    }
    
    console.log(`Found target channel: ${channel.name}`);
    
    // Define how many past messages to load
    const messageLimit = 100; // Adjust this number as needed
    
    // Fetch past messages
    const messages = await channel.messages.fetch({ limit: messageLimit });
    console.log(`Loaded ${messages.size} past messages`);
    
    // Process each message
    for (const [messageId, message] of messages) {
        // Skip bot messages
        if (message.author.bot) continue;
        
        // Check if message has image attachments
        if (message.attachments.size > 0) {
            const hasImage = message.attachments.some(attachment => 
                isImageAttachment(attachment.url)
            );
            
            if (hasImage) {
                console.log(`Found past image message: ${messageId}`);
                
                // Get all reactions on this message
                const reactions = message.reactions.cache;
                
                // Add the message to our tracking map if it has reactions
                if (reactions.size > 0) {
                    const messageReactions: ReactionCount[] = [];
                    
                    // Process each reaction
                    for (const [reactionEmoji, reaction] of reactions) {
                        // Skip processing if the reaction is partial
                        if (reaction.partial) continue;
                        
                        try {
                            // Fetch users who reacted
                            const users = await reaction.users.fetch();
                            
                            // Process each user's reaction
                            for (const [userId, user] of users) {
                                // Skip bot reactions
                                if (user.bot) continue;
                                
                                // Add or update user's reaction count for this message
                                const existingIndex = messageReactions.findIndex(r => r.userId === userId);
                                if (existingIndex >= 0) {
                                    messageReactions[existingIndex].count++;
                                } else {
                                    messageReactions.push({ userId, count: 1 });
                                }
                            }
                        } catch (error) {
                            console.error(`Error fetching reaction users for ${reactionEmoji}:`, error);
                        }
                    }
                    
                    // Only add to our tracking if we found valid reactions
                    if (messageReactions.length > 0) {
                        reactionCounts.set(messageId, messageReactions);
                        console.log(`Added ${messageReactions.length} user reactions for message ${messageId}`);
                    }
                }
                
                // React with emojis if the bot hasn't already reacted
                for (const emoji of config.reactions) {
                    if (!message.reactions.cache.has(emoji)) {
                        try {
                            await message.react(emoji);
                            // Add delay to avoid rate limits
                            await new Promise(resolve => setTimeout(resolve, 300));
                        } catch (error) {
                            console.error(`Error reacting to past message with ${emoji}:`, error);
                        }
                    }
                }
            }
        }
    }
    
    // Log summary
    const totalMessages = reactionCounts.size;
    let totalReactions = 0;
    reactionCounts.forEach(reactions => {
        totalReactions += reactions.length;
    });
    
    console.log(`Finished loading past data - Tracking ${totalMessages} messages with ${totalReactions} user reactions`);
}

// Listen for new messages
client.on('messageCreate', async (message: Message) => {
    // Log all incoming messages for debugging
    console.log(`New message in channel ${message.channelId}: ${message.content.substring(0, 20)}${message.content.length > 20 ? '...' : ''}`);
    console.log(`Attachments: ${message.attachments.size}`);
    
    // Ignore bot messages
    if (message.author.bot) {
        console.log('Ignoring bot message');
        return;
    }

    // Check if message is in the target channel
    if (message.channelId === config.targetChannelId) {
        console.log(`Message is in target channel ${config.targetChannelId}`);
        
        // Check if the message contains an image
        if (message.attachments.size > 0) {
            console.log(`Message has ${message.attachments.size} attachments`);
            
            const attachment = message.attachments.first();
            console.log(`Attachment URL: ${attachment?.url}`);
            
            if (attachment && isImageAttachment(attachment.url)) {
                console.log(`Attachment is an image, will react with emojis`);
                
                // Add a small delay before reacting to ensure the message is fully processed by Discord
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if message still exists before reacting
                try {
                    // Try to fetch the message to ensure it exists
                    await message.fetch();
                    
                    // React with all configured emojis
                    for (const reaction of config.reactions) {
                        try {
                            console.log(`Reacting with ${reaction}`);
                            await message.react(reaction);
                            // Add a small delay between reactions to avoid rate limits
                            await new Promise(resolve => setTimeout(resolve, 300));
                            console.log(`Successfully reacted with ${reaction}`);
                        } catch (error: any) {
                            if (error.code === 10008) {
                                console.error(`Message no longer exists, stopping reactions`);
                                break; // Stop trying more reactions if message is gone
                            } else {
                                console.error(`Error reacting with ${reaction}:`, error);
                            }
                        }
                    }
                } catch (error: any) {
                    if (error.code === 10008) {
                        console.error(`Message no longer exists, cannot react`);
                    } else {
                        console.error(`Error fetching message:`, error);
                    }
                }
            } else {
                console.log('Attachment is not an image');
            }
        } else {
            console.log('Message has no attachments');
        }
    } else {
        console.log(`Message is NOT in target channel. Message channel: ${message.channelId}, Target channel: ${config.targetChannelId}`);
    }

    // Check for command prefix
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    // If no command is found, return
    if (!commandName) return;

    // Check if the command exists
    if (!commands.has(commandName)) return;

    try {
        // Execute the command
        commands.get(commandName).execute(message, args, { reactionCounts });
    } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!');
    }
});

// Listen for reactions
client.on('messageReactionAdd', async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
    // Ignore bot reactions
    if (user.bot) return;

    // If the reaction or message is partial, fetch the complete data
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the reaction:', error);
            return;
        }
    }

    // Now reaction should be a full MessageReaction
    // Check if the reaction is in the target channel (1364771923116163093)
    const channelId = reaction.message.channelId;
    console.log(`Reaction detected in channel: ${channelId}, target channel: ${config.targetChannelId}`);
    
    if (channelId === config.targetChannelId) {
        console.log(`Counting reaction in target channel: ${config.targetChannelId}`);
        
        // Track this reaction
        const messageId = reaction.message.id;
        if (!reactionCounts.has(messageId)) {
            reactionCounts.set(messageId, []);
        }

        const messageReactions = reactionCounts.get(messageId)!;
        const userIndex = messageReactions.findIndex(r => r.userId === user.id);

        if (userIndex >= 0) {
            messageReactions[userIndex].count++;
            console.log(`Incremented reaction count for user ${user.id} to ${messageReactions[userIndex].count}`);
        } else {
            messageReactions.push({ userId: user.id, count: 1 });
            console.log(`Added first reaction for user ${user.id}`);
        }
    } else {
        console.log(`Ignoring reaction in channel ${channelId} - not the target channel`);
    }
});

// Utility function to check if a URL is an image
function isImageAttachment(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    // Remove query parameters from URL for extension checking
    const urlWithoutParams = url.split('?')[0];
    
    const isImage = imageExtensions.some(ext => urlWithoutParams.toLowerCase().endsWith(ext));
    console.log(`Checking if ${url} is an image: ${isImage} (parsed as: ${urlWithoutParams})`);
    return isImage;
}

// Login to Discord with your client's token
client.login(config.token);