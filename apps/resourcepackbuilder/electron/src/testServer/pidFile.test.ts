import { describe, expect, it } from 'vitest';
import { formatPidFile, isServerProcess, parsePidFile } from './pidFile';

const JAR = 'C:\\Users\\Alex\\AppData\\Roaming\\ResourcepackBuilder\\testserver\\downloads\\paper-1.21.4-200.jar';
const PID_FILE = { pid: 4242, jar: JAR };

describe('PID file', () => {
  it('round-trips', () => {
    expect(parsePidFile(formatPidFile(PID_FILE))).toEqual(PID_FILE);
  });

  it.each(['', 'nonsense', '42', '{"pid":"4242","jar":"x.jar"}', '{"pid":-1,"jar":"x.jar"}', '{"pid":1.5,"jar":"x.jar"}', '{"pid":42}'])(
    'refuses %j',
    (text) => {
      expect(parsePidFile(text)).toBeNull();
    },
  );
});

describe('isServerProcess', () => {
  const commandLine = `"C:\\java\\21\\jdk\\bin\\java.exe" -Xms512M -Xmx2G -Dfile.encoding=UTF-8 -jar ${JAR} --nogui`;

  it('recognises the server it started', () => {
    expect(isServerProcess({ name: 'java.exe', commandLine }, PID_FILE)).toBe(true);
    expect(isServerProcess({ name: '/usr/lib/jvm/bin/java', commandLine: `java -jar ${JAR} --nogui` }, PID_FILE)).toBe(true);
  });

  it('never matches another program that got the same PID', () => {
    expect(isServerProcess({ name: 'chrome.exe', commandLine: `chrome.exe ${JAR} --nogui` }, PID_FILE)).toBe(false);
    expect(isServerProcess({ name: 'javascript-runner.exe', commandLine }, PID_FILE)).toBe(false);
  });

  it('never matches another Java program', () => {
    expect(isServerProcess({ name: 'java.exe', commandLine: 'java.exe -jar C:\\tools\\other.jar --nogui' }, PID_FILE)).toBe(false);
    expect(isServerProcess({ name: 'java.exe', commandLine: `java.exe -jar ${JAR}` }, PID_FILE)).toBe(false);
    expect(isServerProcess({ name: 'java.exe', commandLine: `java.exe -jar ${JAR} --noguiX` }, PID_FILE)).toBe(false);
  });
});
