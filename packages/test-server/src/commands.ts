/**
 * Console commands for the test server. Arguments end up in a server console that runs as operator, so every
 * builder checks them: no spaces, line breaks or target selectors (`@a`) can sneak in.
 */
import { PLAYER_NAME_PATTERN } from './config';

/** A Nexo reload typed by the user ("nexo reload …", "/n rl" …). */
const RELOAD_COMMAND_PATTERN = /^\/?(nexo|n)\s+(reload|rl)\b/i;

/** A single command argument such as an item id: no whitespace, selectors or control characters. */
const COMMAND_ARG_PATTERN = /^[A-Za-z0-9_.:/-]{1,128}$/;

export function isPlayerName(value: string): boolean {
  return PLAYER_NAME_PATTERN.test(value);
}

/** Throws unless `player` is a valid Minecraft player name. */
export function assertPlayerName(player: string): void {
  if (!isPlayerName(player)) throw new RangeError(`Invalid player name: ${JSON.stringify(player)}`);
}

/** Throws unless `arg` is a single, harmless command argument. */
export function assertCommandArg(arg: string): void {
  if (!COMMAND_ARG_PATTERN.test(arg)) throw new RangeError(`Invalid command argument: ${JSON.stringify(arg)}`);
}

/** "op <player>": makes the player an operator. */
export function opCommand(player: string): string {
  assertPlayerName(player);
  return `op ${player}`;
}

/** A console command as typed (with or without "/") as the console takes it: one line without the slash; '' if empty. */
export function consoleCommandText(command: string): string {
  return command
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .replace(/^\//, '');
}

/** Whether a command typed by the user reloads Nexo (and so rebuilds the resource pack). */
export function isNexoReloadCommand(command: string): boolean {
  return RELOAD_COMMAND_PATTERN.test(command.trim());
}
