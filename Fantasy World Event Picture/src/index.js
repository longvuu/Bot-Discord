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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv = __importStar(require("dotenv"));
const config_1 = require("./config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
dotenv.config();
// Create a new client instance
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.IntentsBitField.Flags.Guilds,
        discord_js_1.IntentsBitField.Flags.GuildMessages,
        discord_js_1.IntentsBitField.Flags.MessageContent,
        discord_js_1.IntentsBitField.Flags.GuildMessageReactions,
    ],
    partials: [
        discord_js_1.Partials.Message,
        discord_js_1.Partials.Channel,
        discord_js_1.Partials.Reaction,
        discord_js_1.Partials.User
    ],
});
// Command collection
const commands = new Map();
// Load all command files
const commandFiles = fs_1.default.readdirSync(path_1.default.join(__dirname, 'commands'))
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
}
// Store reaction counts
const reactionCounts = new Map();
// When the client is ready, run this code
client.once('ready', () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(`Logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}!`);
    console.log(`Bot is ready to react to images in channel: ${config_1.config.targetChannelId}`);
    // Chỉ log thông tin về kênh mục tiêu
    try {
        const targetChannel = yield client.channels.fetch(config_1.config.targetChannelId);
        if (targetChannel && targetChannel instanceof discord_js_1.TextChannel) {
            console.log(`Target channel: ${targetChannel.name} (${targetChannel.id})`);
            console.log(`Guild: ${targetChannel.guild.name} (${targetChannel.guild.id})`);
        }
        else {
            console.error(`Target channel not found or not a text channel!`);
        }
    }
    catch (error) {
        console.error(`Error fetching target channel:`, error);
    }
    // Load past messages and reactions
    try {
        yield loadPastMessagesAndReactions();
        console.log('Successfully loaded past messages and reactions');
    }
    catch (error) {
        console.error('Error loading past messages and reactions:', error);
    }
}));
/**
 * Load past messages and reactions from the target channel
 * This helps maintain reaction data across bot restarts
 */
function loadPastMessagesAndReactions() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Loading past messages from channel: ${config_1.config.targetChannelId}...`);
        // Get the target channel
        const channel = yield client.channels.fetch(config_1.config.targetChannelId);
        if (!channel || !(channel instanceof discord_js_1.TextChannel)) {
            console.error(`Failed to find target channel or channel is not a text channel`);
            return;
        }
        console.log(`Found target channel: ${channel.name}`);
        // Define how many past messages to load
        const messageLimit = 100; // Adjust this number as needed
        // Fetch past messages
        const messages = yield channel.messages.fetch({ limit: messageLimit });
        console.log(`Loaded ${messages.size} past messages`);
        // Process each message
        for (const [messageId, message] of messages) {
            // Skip bot messages
            if (message.author.bot)
                continue;
            // Check if message has image attachments
            if (message.attachments.size > 0) {
                const hasImage = message.attachments.some(attachment => isImageAttachment(attachment.url));
                if (hasImage) {
                    console.log(`Found past image message: ${messageId}`);
                    // Get all reactions on this message
                    const reactions = message.reactions.cache;
                    // Add the message to our tracking map if it has reactions
                    if (reactions.size > 0) {
                        const messageReactions = [];
                        // Process each reaction
                        for (const [reactionEmoji, reaction] of reactions) {
                            // Skip processing if the reaction is partial
                            if (reaction.partial)
                                continue;
                            try {
                                // Fetch users who reacted
                                const users = yield reaction.users.fetch();
                                // Process each user's reaction
                                for (const [userId, user] of users) {
                                    // Skip bot reactions
                                    if (user.bot)
                                        continue;
                                    // Add or update user's reaction count for this message
                                    const existingIndex = messageReactions.findIndex(r => r.userId === userId);
                                    if (existingIndex >= 0) {
                                        messageReactions[existingIndex].count++;
                                    }
                                    else {
                                        messageReactions.push({ userId, count: 1 });
                                    }
                                }
                            }
                            catch (error) {
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
                    for (const emoji of config_1.config.reactions) {
                        if (!message.reactions.cache.has(emoji)) {
                            try {
                                yield message.react(emoji);
                                // Add delay to avoid rate limits
                                yield new Promise(resolve => setTimeout(resolve, 300));
                            }
                            catch (error) {
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
    });
}
// Listen for new messages
client.on('messageCreate', (message) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Bỏ qua tất cả tin nhắn không thuộc kênh mục tiêu
    if (message.channelId !== config_1.config.targetChannelId) {
        // Chỉ xử lý lệnh nếu có prefix, bất kể kênh nào
        if (message.content.startsWith(config_1.config.prefix)) {
            const args = message.content.slice(config_1.config.prefix.length).trim().split(/ +/);
            const commandName = (_a = args.shift()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            // If no command is found, return
            if (!commandName)
                return;
            // Check if the command exists
            if (!commands.has(commandName))
                return;
            try {
                // Execute the command
                commands.get(commandName).execute(message, args, { reactionCounts });
            }
            catch (error) {
                console.error(error);
                message.reply('There was an error trying to execute that command!');
            }
        }
        return;
    }
    // Từ đây chỉ xử lý tin nhắn trong kênh mục tiêu
    console.log(`New message in target channel: ${message.content.substring(0, 20)}${message.content.length > 20 ? '...' : ''}`);
    console.log(`Attachments: ${message.attachments.size}`);
    // Ignore bot messages
    if (message.author.bot) {
        console.log('Ignoring bot message');
        return;
    }
    // Check if the message contains an image
    if (message.attachments.size > 0) {
        console.log(`Message has ${message.attachments.size} attachments`);
        const attachment = message.attachments.first();
        console.log(`Attachment URL: ${attachment === null || attachment === void 0 ? void 0 : attachment.url}`);
        if (attachment && isImageAttachment(attachment.url)) {
            console.log(`Attachment is an image, will react with emojis`);
            // Add a small delay before reacting to ensure the message is fully processed by Discord
            yield new Promise(resolve => setTimeout(resolve, 500));
            // Check if message still exists before reacting
            try {
                // Try to fetch the message to ensure it exists
                yield message.fetch();
                // React with all configured emojis
                for (const reaction of config_1.config.reactions) {
                    try {
                        console.log(`Reacting with ${reaction}`);
                        yield message.react(reaction);
                        // Add a small delay between reactions to avoid rate limits
                        yield new Promise(resolve => setTimeout(resolve, 300));
                        console.log(`Successfully reacted with ${reaction}`);
                    }
                    catch (error) {
                        if (error.code === 10008) {
                            console.error(`Message no longer exists, stopping reactions`);
                            break; // Stop trying more reactions if message is gone
                        }
                        else {
                            console.error(`Error reacting with ${reaction}:`, error);
                        }
                    }
                }
            }
            catch (error) {
                if (error.code === 10008) {
                    console.error(`Message no longer exists, cannot react`);
                }
                else {
                    console.error(`Error fetching message:`, error);
                }
            }
        }
        else {
            console.log('Attachment is not an image');
        }
    }
    else {
        console.log('Message has no attachments');
    }
    // Check for command prefix
    if (message.content.startsWith(config_1.config.prefix)) {
        const args = message.content.slice(config_1.config.prefix.length).trim().split(/ +/);
        const commandName = (_b = args.shift()) === null || _b === void 0 ? void 0 : _b.toLowerCase();
        // If no command is found, return
        if (!commandName)
            return;
        // Check if the command exists
        if (!commands.has(commandName))
            return;
        try {
            // Execute the command
            commands.get(commandName).execute(message, args, { reactionCounts });
        }
        catch (error) {
            console.error(error);
            message.reply('There was an error trying to execute that command!');
        }
    }
}));
// Listen for reactions
client.on('messageReactionAdd', (reaction, user) => __awaiter(void 0, void 0, void 0, function* () {
    // Ignore bot reactions
    if (user.bot)
        return;
    // If the reaction or message is partial, fetch the complete data
    if (reaction.partial) {
        try {
            yield reaction.fetch();
        }
        catch (error) {
            console.error('Something went wrong when fetching the reaction:', error);
            return;
        }
    }
    // Bỏ qua tất cả reaction không thuộc kênh mục tiêu
    const channelId = reaction.message.channelId;
    if (channelId !== config_1.config.targetChannelId) {
        return;
    }
    console.log(`Counting reaction in target channel: ${config_1.config.targetChannelId}`);
    // Track this reaction
    const messageId = reaction.message.id;
    if (!reactionCounts.has(messageId)) {
        reactionCounts.set(messageId, []);
    }
    const messageReactions = reactionCounts.get(messageId);
    const userIndex = messageReactions.findIndex(r => r.userId === user.id);
    if (userIndex >= 0) {
        messageReactions[userIndex].count++;
        console.log(`Incremented reaction count for user ${user.id} to ${messageReactions[userIndex].count}`);
    }
    else {
        messageReactions.push({ userId: user.id, count: 1 });
        console.log(`Added first reaction for user ${user.id}`);
    }
}));
// Utility function to check if a URL is an image
function isImageAttachment(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    // Remove query parameters from URL for extension checking
    const urlWithoutParams = url.split('?')[0];
    const isImage = imageExtensions.some(ext => urlWithoutParams.toLowerCase().endsWith(ext));
    console.log(`Checking if ${url} is an image: ${isImage} (parsed as: ${urlWithoutParams})`);
    return isImage;
}
// Login to Discord with your client's token
client.login(config_1.config.token);
