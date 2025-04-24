# Fantasy World Event Picture Bot

Discord bot using TypeScript that automatically reacts to images in a specific channel and provides a leaderboard command.

## Features

- Automatically reacts with multiple emojis to any image posted in the target channel (ID: 1364771923116163093)
- Provides a "bxh" (ranking) command with the prefix "fw" to display a leaderboard of users with the most reactions

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure your bot token:
   - Either set the `TOKEN` environment variable
   - Or directly edit the token in `src/config.ts`

3. Run the bot:
   ```
   npm start      # Run with ts-node
   ```
   
   For development with auto-restart:
   ```
   npm run dev    # Run with ts-node-dev
   ```

## Commands

- `fw bxh` - Display a leaderboard of users with the most reactions

## Build for Production

To compile TypeScript to JavaScript for production:

```
npm run build   # Compile TypeScript to JS
npm run prod    # Run the compiled JS
```