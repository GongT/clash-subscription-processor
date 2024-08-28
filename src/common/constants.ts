import { resolve } from 'path';

export const APP_ROOT = resolve(__dirname, '..');
export const PROJECT_ROOT = resolve(APP_ROOT, '..');
export const CACHE_DIR = process.env.CACHE_DIRECTORY ?? APP_ROOT;
export const DNS_SERVER = '223.5.5.5';
