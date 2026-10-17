import { describe, expect, it } from 'vitest';
import { MAX_SHARE_FOLDER_NAME_LENGTH, shareFolderName } from './folderName';

describe('shareFolderName', () => {
  it('keeps an ordinary name', () => {
    expect(shareFolderName('My Pack (v2)')).toBe('My Pack (v2)');
  });

  it('replaces invalid and control characters', () => {
    expect(shareFolderName('a<b>c:d"e/f\\g|h?i*j\u0001k')).toBe('a_b_c_d_e_f_g_h_i_j_k');
  });

  it('removes surrounding spaces and trailing dots', () => {
    expect(shareFolderName('  Pack...  ')).toBe('Pack');
    expect(shareFolderName('. .')).toBe('');
  });

  it('removes a trailing dot or space that shortening leaves', () => {
    const name = `${'a'.repeat(MAX_SHARE_FOLDER_NAME_LENGTH - 2)}. b`;
    expect(shareFolderName(name)).toBe('a'.repeat(MAX_SHARE_FOLDER_NAME_LENGTH - 2));
    expect(shareFolderName('x'.repeat(200))).toHaveLength(MAX_SHARE_FOLDER_NAME_LENGTH);
  });

  it.each([
    ['CON', 'CON_'],
    ['con', 'con_'],
    ['Prn', 'Prn_'],
    ['AUX', 'AUX_'],
    ['nul', 'nul_'],
    ['COM1', 'COM1_'],
    ['lpt9', 'lpt9_'],
    ['com¹', 'com¹_'],
    // Windows reserves the stem with any extension, so the mark goes before it
    ['con.txt', 'con_.txt'],
    ['NUL.tar.gz', 'NUL_.tar.gz'],
  ])('changes the reserved name %s', (name, expected) => {
    expect(shareFolderName(name)).toBe(expected);
  });

  it.each(['CONsole', 'com10', 'auxiliary', 'lpt', 'my con'])('keeps %s', (name) => {
    expect(shareFolderName(name)).toBe(name);
  });
});
