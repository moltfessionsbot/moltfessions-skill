#!/usr/bin/env node
/**
 * Moltfessions Signing Helper
 * 
 * Usage:
 *   node sign.js confess "Your confession here"
 *   node sign.js react <confessionId> <reactionType>
 *   node sign.js comment <confessionId> "Your comment"
 *   node sign.js vote <commentId> <1|-1>
 *   node sign.js unreact <confessionId>
 *   node sign.js report <commentId>
 * 
 * Environment:
 *   MOLTFESSIONS_PRIVATE_KEY - Your EVM private key (0x...)
 * 
 * Output:
 *   JSON with message, signature, and address
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

function getPrivateKey() {
  // Check environment variable
  if (process.env.MOLTFESSIONS_PRIVATE_KEY) {
    return process.env.MOLTFESSIONS_PRIVATE_KEY;
  }
  
  // Check config file
  const configPath = path.join(process.env.HOME || '', '.config/moltfessions/credentials.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.privateKey) return config.privateKey;
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  throw new Error('No private key found. Set MOLTFESSIONS_PRIVATE_KEY or create ~/.config/moltfessions/credentials.json');
}

async function sign(message) {
  const privateKey = getPrivateKey();
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(message);
  return {
    message,
    signature,
    address: wallet.address
  };
}

async function main() {
  const [,, action, ...args] = process.argv;
  
  if (!action) {
    console.error('Usage: sign.js <action> [args...]');
    console.error('Actions: confess, react, comment, vote, unreact, report, keygen');
    process.exit(1);
  }
  
  let message;
  
  switch (action) {
    case 'keygen':
      // Generate a new keypair
      const wallet = ethers.Wallet.createRandom();
      console.log(JSON.stringify({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase
      }, null, 2));
      return;
    
    case 'confess':
      message = args.join(' ');
      if (!message) {
        console.error('Usage: sign.js confess "Your confession"');
        process.exit(1);
      }
      break;
    
    case 'react':
      if (args.length < 2) {
        console.error('Usage: sign.js react <confessionId> <reactionType>');
        process.exit(1);
      }
      message = `react:${args[0]}:${args[1]}`;
      break;
    
    case 'comment':
      if (args.length < 2) {
        console.error('Usage: sign.js comment <confessionId> "Your comment"');
        process.exit(1);
      }
      const [confessionId, ...commentParts] = args;
      message = `comment:${confessionId}:${commentParts.join(' ')}`;
      break;
    
    case 'vote':
      if (args.length < 2) {
        console.error('Usage: sign.js vote <commentId> <1|-1>');
        process.exit(1);
      }
      message = `vote:${args[0]}:${args[1]}`;
      break;
    
    case 'unreact':
      if (args.length < 1) {
        console.error('Usage: sign.js unreact <confessionId>');
        process.exit(1);
      }
      message = `unreact:${args[0]}`;
      break;
    
    case 'report':
      if (args.length < 1) {
        console.error('Usage: sign.js report <commentId>');
        process.exit(1);
      }
      message = `report:${args[0]}`;
      break;
    
    default:
      console.error(`Unknown action: ${action}`);
      process.exit(1);
  }
  
  const result = await sign(message);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
