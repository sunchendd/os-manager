import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(__dirname, '../../data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const DEFAULT_PASSWORD = '123456';

interface AuthData {
  passwordHash: string;
  salt: string;
  createdAt: number;
  updatedAt: number;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(32).toString('hex');
}

function loadAuth(): AuthData | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveAuth(data: AuthData) {
  ensureDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
}

export class AuthManager {
  private auth: AuthData;

  constructor() {
    const existing = loadAuth();
    if (existing) {
      this.auth = existing;
    } else {
      // 首次运行，创建默认密码
      const salt = generateSalt();
      this.auth = {
        passwordHash: hashPassword(DEFAULT_PASSWORD, salt),
        salt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveAuth(this.auth);
      console.log('🔐 首次运行，已创建默认密码: 123456');
    }
  }

  verifyPassword(password: string): boolean {
    const hash = hashPassword(password, this.auth.salt);
    return hash === this.auth.passwordHash;
  }

  changePassword(oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    if (!this.verifyPassword(oldPassword)) {
      return { success: false, error: '原密码错误' };
    }
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: '新密码长度不能少于4位' };
    }

    const salt = generateSalt();
    this.auth = {
      passwordHash: hashPassword(newPassword, salt),
      salt,
      createdAt: this.auth.createdAt,
      updatedAt: Date.now(),
    };
    saveAuth(this.auth);
    return { success: true };
  }

  resetToDefault(): void {
    const salt = generateSalt();
    this.auth = {
      passwordHash: hashPassword(DEFAULT_PASSWORD, salt),
      salt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveAuth(this.auth);
  }
}

// 简单的 session token 生成
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyToken(token: string, validTokens: Set<string>): boolean {
  return validTokens.has(token);
}
