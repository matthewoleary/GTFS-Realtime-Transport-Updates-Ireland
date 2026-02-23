import Logger from '../logger.js';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('chalk', () => ({
  default: {
    red: (s) => `[red]${s}[/red]`,
    yellow: (s) => `[yellow]${s}[/yellow]`,
    green: (s) => `[green]${s}[/green]`,
    blue: (s) => `[blue]${s}[/blue]`,
    magenta: (s) => `[magenta]${s}[/magenta]`,
    cyan: (s) => `[cyan]${s}[/cyan]`,
  }
}));

vi.mock('../utils/timestampUtils.js', () => ({
  getCurrentTime: () => '12:34:56'
}));

describe('Logger', () => {
  let logger;
  let logSpy, warnSpy, errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger = new Logger({ client: 'TEST', infoMessage: 'info', successMessage: 'success', warnMessage: 'warn', errorMessage: 'error' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs info with provided message', () => {
    logger.info('hello');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[blue]INFO[/blue]'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[magenta]TEST[/magenta]'));
  });

  it('logs info with default message', () => {
    logger.info();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('info'));
  });

  it('logs success with provided message', () => {
    logger.success('yay');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[green]SUCCESS[/green]'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('yay'));
  });

  it('logs success with default message', () => {
    logger.success();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('success'));
  });

  it('logs warn with provided message', () => {
    logger.warn('be careful');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[yellow]WARN[/yellow]'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('be careful'));
  });

  it('logs warn with default message', () => {
    logger.warn();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('warn'));
  });

  it('logs error with provided error', () => {
    logger.error('fail');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[red]ERROR[/red]'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('fail'));
  });

  it('logs error with default message', () => {
    logger.error();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('error'));
  });
});
