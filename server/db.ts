import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { User, AppInfo, AuditLog } from '../src/types.js';

export interface UserWithPassword extends User {
  passwordHash: string;
}

const DB_CONFIG_FILE = path.join(process.cwd(), '.dbconfig.json');

function toBoolean(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
  if (Buffer.isBuffer(val)) return val.length > 0 && val[0] !== 0;
  return Boolean(val);
}

// Memory / File fallback storage
class DatabaseManager {
  private users: UserWithPassword[] = [];
  private apps: AppInfo[] = [];
  private auditLogs: AuditLog[] = [];
  private mysqlPool: mysql.Pool | null = null;
  private isUsingMysql: boolean = false;
  private currentMode: 'mysql' | 'development' = 'development';
  private connectionError: string | null = null;
  private customConfig: { host?: string; user?: string; password?: string; database?: string; port?: number } = {};

  constructor() {
    this.seedDefaultData();
    this.initMysqlIfAvailable();
  }

  public async setMode(mode: 'mysql' | 'development', creds?: { host?: string; user?: string; password?: string; database?: string; port?: number }) {
    if (creds) {
      this.customConfig = { ...this.customConfig, ...creds };
      try {
        fs.writeFileSync(DB_CONFIG_FILE, JSON.stringify(this.customConfig, null, 2));
      } catch (e) {
        // ignore write error
      }
    }

    if (mode === 'development') {
      this.currentMode = 'development';
      this.isUsingMysql = false;
      this.connectionError = null;
      return { success: true, mode: 'development', connected: false, message: 'Modo Desenvolvimento (Memória Local) ativado com sucesso.' };
    }

    this.currentMode = 'mysql';
    const host = this.customConfig.host || process.env.DB_HOST || 'localhost';
    const user = this.customConfig.user || process.env.DB_USER || 'mifireco_sso_user';
    const password = this.customConfig.password !== undefined ? this.customConfig.password : (process.env.DB_PASSWORD || '');
    const database = this.customConfig.database || process.env.DB_NAME || 'mifireco_sso_db';
    const port = Number(this.customConfig.port || process.env.DB_PORT) || 3306;

    try {
      if (this.mysqlPool) {
        await this.mysqlPool.end().catch(() => {});
      }

      this.mysqlPool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000,
      });

      const conn = await this.mysqlPool.getConnection();
      conn.release();

      this.isUsingMysql = true;
      this.connectionError = null;
      console.log(`✅ [cPanel MySQL] Conectado ao banco MySQL em ${host}:${port}/${database}`);

      // Auto-provision tables and default admin if empty
      await this.ensureMysqlSchemaAndAdmin();

      return { success: true, mode: 'mysql', connected: true, message: `Conectado com sucesso ao MySQL (${host})!` };
    } catch (err: any) {
      this.isUsingMysql = false;
      this.connectionError = err.message || 'Falha ao conectar no MySQL';
      console.warn('⚠️ [cPanel MySQL] Erro de conexão:', this.connectionError);
      return { success: false, mode: 'mysql', connected: false, error: this.connectionError };
    }
  }

  private async seedDefaultData() {
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('Admin@123', salt);
    const defaultPass = await bcrypt.hash('Senha@123', salt);
    const firstAccessPass = await bcrypt.hash('Mudar@123', salt);

    this.apps = [
      {
        id: 'app-1',
        appId: 'expedicao',
        name: 'Sistema de Expedição & Logística',
        description: 'Controle de romaneios, cargas e entregas corporativas.',
        callbackUrl: 'https://expedicao.mifireapp.com.br/callback',
        secretKey: 'sec_expedicao_mifire_9876543210',
        icon: 'Truck',
        active: true,
        category: 'Operacional',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'app-2',
        appId: 'vendas',
        name: 'Portal de Vendas & CRM',
        description: 'Gestão de orçamentos, pedidos de vendas e pipeline de clientes.',
        callbackUrl: 'https://vendas.mifireapp.com.br/callback',
        secretKey: 'sec_vendas_mifire_1234567890',
        icon: 'ShoppingCart',
        active: true,
        category: 'Comercial',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'app-3',
        appId: 'financeiro',
        name: 'Gestão Financeira & DRE',
        description: 'Contas a pagar, receber, fluxo de caixa e relatórios fiscais.',
        callbackUrl: 'https://financeiro.mifireapp.com.br/callback',
        secretKey: 'sec_financeiro_mifire_5544332211',
        icon: 'DollarSign',
        active: true,
        category: 'Gestão',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'app-4',
        appId: 'rh',
        name: 'Portal RH & Holerites',
        description: 'Ponto eletrônico, folha de pagamento e chamados internos.',
        callbackUrl: 'https://rh.mifireapp.com.br/callback',
        secretKey: 'sec_rh_mifire_9988776655',
        icon: 'Users',
        active: true,
        category: 'Recursos Humanos',
        createdAt: new Date().toISOString(),
      },
    ];

    this.users = [
      {
        id: 'usr-admin',
        name: 'Administrador SSO',
        email: 'admin@mifireapp.com.br',
        username: 'admin',
        passwordHash: adminPass,
        role: 'admin',
        active: true,
        mustChangePassword: false,
        allowedApps: ['expedicao', 'vendas', 'financeiro', 'rh'],
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        lastLogin: new Date().toISOString(),
      },
      {
        id: 'usr-carlos',
        name: 'Carlos Eduardo Silva',
        email: 'carlos.silva@mifireapp.com.br',
        username: 'carlos.expedicao',
        passwordHash: defaultPass,
        role: 'user',
        active: true,
        mustChangePassword: false,
        allowedApps: ['expedicao', 'financeiro'],
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        lastLogin: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: 'usr-fernanda',
        name: 'Fernanda Oliveira',
        email: 'fernanda.vendas@mifireapp.com.br',
        username: 'fernanda.vendas',
        passwordHash: defaultPass,
        role: 'manager',
        active: true,
        mustChangePassword: false,
        allowedApps: ['vendas', 'expedicao'],
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        lastLogin: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'usr-novo',
        name: 'Lucas Primeiro Acesso',
        email: 'lucas.novo@mifireapp.com.br',
        username: 'lucas.novo',
        passwordHash: firstAccessPass,
        role: 'user',
        active: true,
        mustChangePassword: true,
        allowedApps: ['expedicao'],
        createdAt: new Date().toISOString(),
      },
    ];

    this.auditLogs = [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        userId: 'usr-admin',
        username: 'admin',
        appId: 'expedicao',
        appName: 'Sistema de Expedição & Logística',
        ip: '189.40.122.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'SUCCESS',
        action: 'LOGIN',
        details: 'Login centralizado realizado via SSO com sucesso.',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        userId: 'usr-carlos',
        username: 'carlos.expedicao',
        appId: 'vendas',
        appName: 'Portal de Vendas & CRM',
        ip: '177.12.88.4',
        status: 'FAILURE',
        action: 'ACCESS_DENIED',
        details: 'Tentativa de acesso não autorizada: Usuário não tem permissão para a aplicação "vendas".',
      },
    ];
  }

  private async initMysqlIfAvailable() {
    try {
      if (fs.existsSync(DB_CONFIG_FILE)) {
        const raw = fs.readFileSync(DB_CONFIG_FILE, 'utf-8');
        const saved = JSON.parse(raw);
        if (saved && (saved.host || saved.user)) {
          this.customConfig = { ...this.customConfig, ...saved };
          console.log('📄 [Config] Configurações de banco MySQL salvas carregadas do disco.');
          await this.setMode('mysql');
          return;
        }
      }
    } catch (e) {
      console.warn('⚠️ [Config] Não foi possível carregar arquivo .dbconfig.json:', e);
    }

    const { DB_HOST, DB_USER, DB_NAME } = process.env;
    if (DB_HOST && DB_USER && DB_NAME) {
      await this.setMode('mysql');
    } else {
      this.currentMode = 'development';
      this.isUsingMysql = false;
    }
  }

  private async ensureMysqlSchemaAndAdmin() {
    if (!this.mysqlPool) return;
    try {
      // 1. Ensure tables exist
      await this.mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` VARCHAR(64) PRIMARY KEY,
          \`name\` VARCHAR(120) NOT NULL,
          \`email\` VARCHAR(120) NOT NULL UNIQUE,
          \`username\` VARCHAR(60) NOT NULL UNIQUE,
          \`password_hash\` VARCHAR(255) NOT NULL,
          \`role\` ENUM('admin', 'user', 'manager') DEFAULT 'user',
          \`active\` TINYINT(1) DEFAULT 1,
          \`must_change_password\` TINYINT(1) DEFAULT 0,
          \`allowed_apps\` JSON DEFAULT NULL,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`last_login\` DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS \`user_app_permissions\` (
          \`user_id\` VARCHAR(64) NOT NULL,
          \`app_id\` VARCHAR(64) NOT NULL,
          \`granted_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_user_perm\` (\`user_id\`),
          INDEX \`idx_app_perm\` (\`app_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS \`applications\` (
          \`id\` VARCHAR(64) PRIMARY KEY,
          \`app_id\` VARCHAR(60) NOT NULL UNIQUE,
          \`name\` VARCHAR(120) NOT NULL,
          \`description\` TEXT,
          \`callback_url\` VARCHAR(255) NOT NULL,
          \`secret_key\` VARCHAR(120) NOT NULL,
          \`icon\` VARCHAR(60) DEFAULT 'AppWindow',
          \`active\` TINYINT(1) DEFAULT 1,
          \`category\` VARCHAR(60) DEFAULT 'Geral',
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS \`audit_logs\` (
          \`id\` VARCHAR(64) PRIMARY KEY,
          \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`user_id\` VARCHAR(64) DEFAULT NULL,
          \`username\` VARCHAR(60) NOT NULL,
          \`app_id\` VARCHAR(60) DEFAULT NULL,
          \`app_name\` VARCHAR(120) DEFAULT NULL,
          \`ip\` VARCHAR(45) NOT NULL,
          \`user_agent\` TEXT DEFAULT NULL,
          \`status\` ENUM('SUCCESS', 'FAILURE', 'WARNING') DEFAULT 'SUCCESS',
          \`action\` VARCHAR(60) NOT NULL,
          \`details\` TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 1.5. Ensure columns exist on pre-existing users table
      try {
        const [cols] = await this.mysqlPool.query<any[]>('SHOW COLUMNS FROM `users`');
        const colNames = cols.map((c: any) => c.Field);

        if (!colNames.includes('active')) {
          try {
            await this.mysqlPool.query('ALTER TABLE `users` ADD COLUMN `active` TINYINT(1) DEFAULT 1');
            console.log('✅ [cPanel MySQL] Coluna active adicionada com sucesso!');
          } catch (e) {
            console.warn('⚠️ [cPanel MySQL] Aviso ao adicionar coluna active:', e);
          }
        }
        if (!colNames.includes('status')) {
          try {
            await this.mysqlPool.query("ALTER TABLE `users` ADD COLUMN `status` ENUM('active','inactive') DEFAULT 'active'");
            console.log('✅ [cPanel MySQL] Coluna status adicionada com sucesso!');
          } catch (e) {
            console.warn('⚠️ [cPanel MySQL] Aviso ao adicionar coluna status:', e);
          }
        }
        if (!colNames.includes('must_change_password')) {
          try {
            await this.mysqlPool.query('ALTER TABLE `users` ADD COLUMN `must_change_password` TINYINT(1) DEFAULT 0');
            console.log('✅ [cPanel MySQL] Coluna must_change_password adicionada com sucesso!');
          } catch (e) {
            console.warn('⚠️ [cPanel MySQL] Aviso ao adicionar coluna must_change_password:', e);
          }
        }
        if (!colNames.includes('allowed_apps')) {
          try {
            await this.mysqlPool.query('ALTER TABLE `users` ADD COLUMN `allowed_apps` JSON DEFAULT NULL');
            console.log('✅ [cPanel MySQL] Coluna allowed_apps adicionada com sucesso!');
          } catch (e) {
            console.warn('⚠️ [cPanel MySQL] Aviso ao adicionar coluna allowed_apps:', e);
          }
        }
        if (!colNames.includes('last_login')) {
          try {
            await this.mysqlPool.query('ALTER TABLE `users` ADD COLUMN `last_login` DATETIME DEFAULT NULL');
            console.log('✅ [cPanel MySQL] Coluna last_login adicionada com sucesso!');
          } catch (e) {
            console.warn('⚠️ [cPanel MySQL] Aviso ao adicionar coluna last_login:', e);
          }
        }
        if (!colNames.includes('last_login_at')) {
          try {
            await this.mysqlPool.query('ALTER TABLE `users` ADD COLUMN `last_login_at` DATETIME DEFAULT NULL');
            console.log('✅ [cPanel MySQL] Coluna last_login_at adicionada com sucesso!');
          } catch (e) {
            console.warn('⚠️ [cPanel MySQL] Aviso ao adicionar coluna last_login_at:', e);
          }
        }
      } catch (colErr) {
        console.warn('⚠️ [cPanel MySQL] Aviso na verificação de colunas:', colErr);
      }

      // 2. Check if admin user exists in MySQL
      const [userRows] = await this.mysqlPool.query<any[]>('SELECT * FROM users WHERE username = "admin" OR role = "admin"');
      if (userRows.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const adminPassHash = await bcrypt.hash('Admin@123', salt);
        await this.mysqlPool.query(
          `INSERT INTO users (id, name, email, username, password_hash, role, active, must_change_password, allowed_apps, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            'usr-admin',
            'Administrador SSO',
            'admin@mifireapp.com.br',
            'admin',
            adminPassHash,
            'admin',
            1,
            0,
            JSON.stringify(['expedicao', 'vendas', 'financeiro', 'rh']),
          ]
        );
        console.log('✅ [cPanel MySQL] Usuário Administrador padrão ("admin" / "Admin@123") autocriado no MySQL!');
      }

      // 3. Check if default applications exist in MySQL
      const [appRows] = await this.mysqlPool.query<any[]>('SELECT COUNT(*) as count FROM applications');
      if (appRows && appRows[0] && appRows[0].count === 0) {
        const cols = await this.getAppTableColumns();
        for (const app of this.apps) {
          try {
            await this.insertAppToMysql(app, cols);
          } catch (seedErr) {
            // ignore duplicate
          }
        }
        console.log('✅ [cPanel MySQL] Aplicações iniciais cadastradas no MySQL!');
      }
    } catch (err: any) {
      console.error('⚠️ [cPanel MySQL] Erro ao verificar/criar tabelas e admin inicial:', err?.message || err);
    }
  }

  // --- USERS ---
  private mapRowToUser(r: any): UserWithPassword {
    let parsedApps: string[] = [];
    const rawApps = r.allowed_apps !== undefined ? r.allowed_apps : (r.allowedApps !== undefined ? r.allowedApps : r.apps);
    if (typeof rawApps === 'string') {
      try {
        const parsed = JSON.parse(rawApps || '[]');
        if (Array.isArray(parsed)) {
          parsedApps = parsed.map((x) => String(x).toLowerCase().trim()).filter(Boolean);
        } else if (typeof parsed === 'string' && parsed.trim()) {
          parsedApps = [parsed.toLowerCase().trim()];
        }
      } catch (e) {
        parsedApps = rawApps
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean);
      }
    } else if (Array.isArray(rawApps)) {
      parsedApps = rawApps.map((x) => String(x).toLowerCase().trim()).filter(Boolean);
    }

    const cleanUsername = String(r.username || r.user || r.login || r.usuario || '').trim();
    const cleanEmail = String(r.email || r.mail || r.e_mail || '').trim();
    let userId = String(r.id || r.user_id || '').trim();

    if (!userId) {
      userId = 'usr-' + (cleanUsername || cleanEmail || 'gen').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    let isActive = true;
    if (r.active !== undefined && r.active !== null) {
      isActive = toBoolean(r.active);
    } else if (r.status !== undefined && r.status !== null) {
      isActive = String(r.status).toLowerCase() === 'active' || String(r.status) === '1';
    }

    const rawMustChange =
      r.must_change_password !== undefined
        ? r.must_change_password
        : r.mustChangePassword !== undefined
        ? r.mustChangePassword
        : r.must_change_pass !== undefined
        ? r.must_change_pass
        : r.trocar_senha;

    const mustChangeVal = toBoolean(rawMustChange);

    const lastLoginVal = r.last_login || r.last_login_at;

    return {
      id: userId,
      name: r.name || r.nome || r.nome_completo || cleanUsername || 'Usuário',
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: String(r.password_hash || r.password || r.senha || '').trim(),
      role: (r.role as any) || 'user',
      active: isActive,
      mustChangePassword: mustChangeVal,
      allowedApps: Array.isArray(parsedApps) ? parsedApps : [],
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      lastLogin: lastLoginVal ? new Date(lastLoginVal).toISOString() : undefined,
    };
  }

  private async loadPermissionsForUser(userId: string, username?: string, email?: string): Promise<string[]> {
    if (!this.isUsingMysql || !this.mysqlPool) return [];
    try {
      const cleanId = String(userId || '').trim();
      const cleanUser = String(username || '').toLowerCase().trim();
      const cleanEmail = String(email || '').toLowerCase().trim();

      const [rows] = await this.mysqlPool.query<any[]>(
        'SELECT app_id FROM user_app_permissions WHERE user_id = ? OR LOWER(user_id) = ? OR LOWER(user_id) = ?',
        [cleanId, cleanUser, cleanEmail]
      );
      if (rows && Array.isArray(rows) && rows.length > 0) {
        return rows.map((r: any) => String(r.app_id || '').toLowerCase().trim()).filter(Boolean);
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  private async syncUserPermissionsTable(userId: string, username: string | undefined, allowedApps: string[]) {
    if (!this.isUsingMysql || !this.mysqlPool) return;
    try {
      const cleanId = String(userId || '').trim();
      const cleanUser = String(username || '').toLowerCase().trim();

      // Remove old records
      await this.mysqlPool.query(
        'DELETE FROM user_app_permissions WHERE user_id = ? OR LOWER(user_id) = ?',
        [cleanId, cleanUser]
      );

      // Insert new permissions
      const cleanApps = Array.from(
        new Set(
          (allowedApps || [])
            .map((a) => String(a).toLowerCase().trim())
            .filter(Boolean)
        )
      );

      for (const appId of cleanApps) {
        await this.mysqlPool.query(
          'INSERT INTO user_app_permissions (user_id, app_id, granted_at) VALUES (?, ?, NOW())',
          [cleanId, appId]
        );
      }
      console.log(`✅ [user_app_permissions] Sincronizado ${cleanApps.length} permissão(ões) para usuário '${cleanUser || cleanId}'.`);
    } catch (err: any) {
      console.warn('⚠️ [user_app_permissions] Erro ao sincronizar permissões:', err?.message || err);
    }
  }

  async getAllUsers(): Promise<UserWithPassword[]> {
    if (this.isUsingMysql && this.mysqlPool) {
      try {
        let rows: any[] = [];
        try {
          const [res] = await this.mysqlPool.query<any[]>('SELECT * FROM users ORDER BY created_at DESC');
          rows = res;
        } catch (e1) {
          const [res] = await this.mysqlPool.query<any[]>('SELECT * FROM users');
          rows = res;
        }

        // Also query permissions from user_app_permissions
        let permMap: Record<string, string[]> = {};
        try {
          const [pRows] = await this.mysqlPool.query<any[]>('SELECT user_id, app_id FROM user_app_permissions');
          if (pRows && Array.isArray(pRows)) {
            pRows.forEach((pr: any) => {
              const uKey = String(pr.user_id || '').toLowerCase().trim();
              const aKey = String(pr.app_id || '').toLowerCase().trim();
              if (uKey && aKey) {
                if (!permMap[uKey]) permMap[uKey] = [];
                if (!permMap[uKey].includes(aKey)) permMap[uKey].push(aKey);
              }
            });
          }
        } catch (pErr) {
          // table might not exist yet or empty
        }

        const mysqlUsers = rows.map((r) => {
          const u = this.mapRowToUser(r);
          const fromTable = permMap[u.id.toLowerCase()] || permMap[u.username.toLowerCase()] || [];
          if (fromTable.length > 0) {
            const combined = Array.from(new Set([...u.allowedApps, ...fromTable]));
            u.allowedApps = combined;
          }
          if (u.role === 'admin' && (!u.allowedApps || u.allowedApps.length === 0)) {
            u.allowedApps = ['expedicao', 'vendas', 'financeiro', 'rh'];
          }
          return u;
        });

        this.users = mysqlUsers;
        return mysqlUsers;
      } catch (err) {
        console.error('⚠️ [cPanel MySQL] Erro ao consultar getAllUsers, utilizando cache em memória:', err);
      }
    }
    return this.users;
  }

  async getUserByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null> {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();

    // 1. Direct query in MySQL if available
    if (this.isUsingMysql && this.mysqlPool) {
      try {
        const [rows] = await this.mysqlPool.query<any[]>(
          'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
          [clean, clean]
        );
        if (rows && rows.length > 0) {
          const user = this.mapRowToUser(rows[0]);
          const tablePerms = await this.loadPermissionsForUser(user.id, user.username, user.email);
          if (tablePerms.length > 0) {
            user.allowedApps = Array.from(new Set([...user.allowedApps, ...tablePerms]));
          }
          if (user.role === 'admin' && (!user.allowedApps || user.allowedApps.length === 0)) {
            user.allowedApps = ['expedicao', 'vendas', 'financeiro', 'rh'];
          }

          // Sync with in-memory array
          const idx = this.users.findIndex((u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean);
          if (idx !== -1) {
            this.users[idx] = user;
          } else {
            this.users.unshift(user);
          }
          return user;
        }
      } catch (err) {
        console.warn('⚠️ [cPanel MySQL] Erro na consulta direta getUserByUsernameOrEmail:', err);
      }
    }

    // 2. Fallback to cached/all users
    const users = await this.getAllUsers();
    return (
      users.find(
        (u) =>
          (u.username && u.username.toLowerCase() === clean) ||
          (u.email && u.email.toLowerCase() === clean)
      ) || null
    );
  }

  async getUserById(id: string): Promise<UserWithPassword | null> {
    if (!id) return null;
    const cleanId = String(id).trim();

    if (this.isUsingMysql && this.mysqlPool) {
      try {
        const [rows] = await this.mysqlPool.query<any[]>(
          'SELECT * FROM users WHERE id = ? OR LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
          [cleanId, cleanId.toLowerCase(), cleanId.toLowerCase()]
        );
        if (rows && rows.length > 0) {
          const user = this.mapRowToUser(rows[0]);
          const tablePerms = await this.loadPermissionsForUser(user.id, user.username, user.email);
          if (tablePerms.length > 0) {
            user.allowedApps = Array.from(new Set([...user.allowedApps, ...tablePerms]));
          }
          if (user.role === 'admin' && (!user.allowedApps || user.allowedApps.length === 0)) {
            user.allowedApps = ['expedicao', 'vendas', 'financeiro', 'rh'];
          }
          return user;
        }
      } catch (err) {
        console.warn('⚠️ [cPanel MySQL] Erro em getUserById:', err);
      }
    }

    const users = await this.getAllUsers();
    return (
      users.find(
        (u) =>
          u.id === cleanId ||
          (u.username && u.username.toLowerCase() === cleanId.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
      ) || null
    );
  }

  async createUser(userData: {
    name: string;
    email: string;
    username: string;
    passwordRaw: string;
    role: 'admin' | 'user' | 'manager';
    allowedApps: string[];
    active?: boolean;
    mustChangePassword?: boolean;
  }): Promise<UserWithPassword> {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.passwordRaw, salt);
    const newUser: UserWithPassword = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: userData.name,
      email: userData.email,
      username: userData.username,
      passwordHash,
      role: userData.role || 'user',
      active: userData.active ?? true,
      mustChangePassword: userData.mustChangePassword ?? false,
      allowedApps: userData.allowedApps || [],
      createdAt: new Date().toISOString(),
    };

    if (this.isUsingMysql && this.mysqlPool) {
      const activeVal = newUser.active ? 1 : 0;
      const statusVal = newUser.active ? 'active' : 'inactive';
      const mustChangeVal = newUser.mustChangePassword ? 1 : 0;
      const allowedAppsJson = JSON.stringify(newUser.allowedApps || []);

      let inserted = false;

      // Tentativa 1: Inserir com ambas as colunas (active e status)
      try {
        await this.mysqlPool.query(
          `INSERT INTO users (id, name, email, username, password_hash, role, active, status, must_change_password, allowed_apps, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            newUser.id,
            newUser.name,
            newUser.email,
            newUser.username,
            newUser.passwordHash,
            newUser.role,
            activeVal,
            statusVal,
            mustChangeVal,
            allowedAppsJson,
          ]
        );
        inserted = true;
        console.log(`✅ [MySQL CreateUser] Usuário '${newUser.username}' criado com sucesso (Tentativa 1 - active + status).`);
      } catch (err1: any) {
        console.warn('⚠️ [MySQL CreateUser] Tentativa 1 falhou:', err1?.message || err1);

        // Tentativa 2: Coluna active apenas
        try {
          await this.mysqlPool.query(
            `INSERT INTO users (id, name, email, username, password_hash, role, active, must_change_password, allowed_apps, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              newUser.id,
              newUser.name,
              newUser.email,
              newUser.username,
              newUser.passwordHash,
              newUser.role,
              activeVal,
              mustChangeVal,
              allowedAppsJson,
            ]
          );
          inserted = true;
          console.log(`✅ [MySQL CreateUser] Usuário '${newUser.username}' criado com sucesso (Tentativa 2 - active apenas).`);
        } catch (err2: any) {
          console.warn('⚠️ [MySQL CreateUser] Tentativa 2 falhou:', err2?.message || err2);

          // Tentativa 3: Coluna status apenas
          try {
            await this.mysqlPool.query(
              `INSERT INTO users (id, name, email, username, password_hash, role, status, must_change_password, allowed_apps, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                newUser.id,
                newUser.name,
                newUser.email,
                newUser.username,
                newUser.passwordHash,
                newUser.role,
                statusVal,
                mustChangeVal,
                allowedAppsJson,
              ]
            );
            inserted = true;
            console.log(`✅ [MySQL CreateUser] Usuário '${newUser.username}' criado com sucesso (Tentativa 3 - status apenas).`);
          } catch (err3: any) {
            console.warn('⚠️ [MySQL CreateUser] Tentativa 3 falhou:', err3?.message || err3);

            // Tentativa 4: Mínimo obrigatório da tabela
            try {
              await this.mysqlPool.query(
                `INSERT INTO users (id, name, email, username, password_hash, role)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  newUser.id,
                  newUser.name,
                  newUser.email,
                  newUser.username,
                  newUser.passwordHash,
                  newUser.role,
                ]
              );
              inserted = true;
              console.log(`✅ [MySQL CreateUser] Usuário '${newUser.username}' criado com sucesso (Tentativa 4 - colunas mínimas).`);
            } catch (err4: any) {
              console.error('❌ [MySQL CreateUser] Todas as tentativas de inserção no MySQL falharam:', err4?.message || err4);
              throw new Error(`Erro de gravação no MySQL: ${err4?.message || 'Falha de inclusão'}`);
            }
          }
        }
      }

      // Sincroniza a tabela relacional user_app_permissions
      await this.syncUserPermissionsTable(newUser.id, newUser.username, newUser.allowedApps);
    }

    this.users.unshift(newUser);
    return newUser;
  }

  async updateUser(
    id: string,
    updates: Partial<Omit<UserWithPassword, 'id' | 'createdAt'>> & { passwordRaw?: string }
  ): Promise<UserWithPassword | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    const targetId = user.id;
    const oldUsername = user.username;
    const oldEmail = user.email;

    if (updates.passwordRaw) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(updates.passwordRaw, salt);
    }

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.username !== undefined) user.username = updates.username;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.active !== undefined) user.active = updates.active;
    if (updates.mustChangePassword !== undefined) user.mustChangePassword = updates.mustChangePassword;
    if (updates.allowedApps !== undefined) user.allowedApps = updates.allowedApps;
    if (updates.lastLogin !== undefined) user.lastLogin = updates.lastLogin;

    if (this.isUsingMysql && this.mysqlPool) {
      let formattedLastLogin: Date | null = null;
      if (user.lastLogin) {
        const d = new Date(user.lastLogin);
        if (!isNaN(d.getTime())) formattedLastLogin = d;
      }

      const activeVal = user.active ? 1 : 0;
      const statusVal = user.active ? 'active' : 'inactive';
      const mustChangeVal = user.mustChangePassword ? 1 : 0;
      const allowedAppsJson = JSON.stringify(user.allowedApps || []);

      let updatedInMysql = false;

      // Tentativa 1: Atualizar com active e status
      try {
        const [result]: any = await this.mysqlPool.query(
          `UPDATE users SET name=?, email=?, username=?, password_hash=?, role=?, active=?, status=?, must_change_password=?, allowed_apps=?, last_login=?
           WHERE id=? OR LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?)`,
          [
            user.name,
            user.email,
            user.username,
            user.passwordHash,
            user.role,
            activeVal,
            statusVal,
            mustChangeVal,
            allowedAppsJson,
            formattedLastLogin,
            targetId,
            oldUsername,
            oldEmail,
          ]
        );
        if (result?.affectedRows > 0) updatedInMysql = true;
      } catch (err1: any) {
        console.warn('⚠️ [MySQL Update Primary] Tentativa 1 falhou:', err1?.message || err1);
      }

      if (!updatedInMysql) {
        // Tentativa 2: Sem coluna status
        try {
          const [result]: any = await this.mysqlPool.query(
            `UPDATE users SET name=?, email=?, username=?, password_hash=?, role=?, active=?, must_change_password=?, allowed_apps=?
             WHERE id=? OR LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?)`,
            [
              user.name,
              user.email,
              user.username,
              user.passwordHash,
              user.role,
              activeVal,
              mustChangeVal,
              allowedAppsJson,
              targetId,
              oldUsername,
              oldEmail,
            ]
          );
          if (result?.affectedRows > 0) updatedInMysql = true;
        } catch (err2: any) {
          console.warn('⚠️ [MySQL Update Primary] Tentativa 2 falhou:', err2?.message || err2);
        }
      }

      if (!updatedInMysql) {
        // Tentativa 3: Sem coluna active
        try {
          const [result]: any = await this.mysqlPool.query(
            `UPDATE users SET name=?, email=?, username=?, password_hash=?, role=?, status=?, must_change_password=?, allowed_apps=?
             WHERE id=? OR LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?)`,
            [
              user.name,
              user.email,
              user.username,
              user.passwordHash,
              user.role,
              statusVal,
              mustChangeVal,
              allowedAppsJson,
              targetId,
              oldUsername,
              oldEmail,
            ]
          );
          if (result?.affectedRows > 0) updatedInMysql = true;
        } catch (err3: any) {
          console.warn('⚠️ [MySQL Update Primary] Tentativa 3 falhou:', err3?.message || err3);
        }
      }

      // Sincroniza a tabela user_app_permissions se allowedApps foi informado
      if (updates.allowedApps !== undefined) {
        await this.syncUserPermissionsTable(targetId, user.username, user.allowedApps);
      }
    }

    const memIdx = this.users.findIndex(
      (u) => u.id === targetId || (oldUsername && u.username === oldUsername) || (oldEmail && u.email === oldEmail)
    );
    if (memIdx !== -1) {
      this.users[memIdx] = { ...user };
    } else {
      this.users.unshift({ ...user });
    }

    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    if (this.isUsingMysql && this.mysqlPool) {
      try {
        await this.mysqlPool.query('DELETE FROM users WHERE id=?', [id]);
        await this.mysqlPool.query('DELETE FROM user_app_permissions WHERE user_id=?', [id]);
      } catch (err) {
        console.error('MySQL delete user error', err);
      }
    }
    const lenBefore = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    return this.users.length < lenBefore;
  }

  private appTableColumns: Set<string> | null = null;

  private async getAppTableColumns(): Promise<Set<string>> {
    if (this.appTableColumns && this.appTableColumns.size > 0) return this.appTableColumns;
    const cols = new Set<string>();
    if (this.isUsingMysql && this.mysqlPool) {
      try {
        const [rows] = await this.mysqlPool.query<any[]>('SHOW COLUMNS FROM applications');
        if (Array.isArray(rows)) {
          rows.forEach((r: any) => cols.add(String(r.Field).toLowerCase().trim()));
        }
        this.appTableColumns = cols;
        console.log(`📋 [cPanel MySQL] Colunas detectadas na tabela applications: [${Array.from(cols).join(', ')}]`);
      } catch (e: any) {
        console.warn('⚠️ [cPanel MySQL] Erro ao obter colunas de applications:', e?.message || e);
      }
    }
    return cols;
  }

  private async insertAppToMysql(app: AppInfo, cols: Set<string>) {
    if (!this.mysqlPool) return;
    const colNames: string[] = ['id', 'name', 'description', 'callback_url', 'secret_key', 'icon', 'active', 'category'];
    const values: any[] = [
      app.id,
      app.name,
      app.description || '',
      app.callbackUrl,
      app.secretKey,
      app.icon || 'AppWindow',
      app.active ? 1 : 0,
      app.category || 'Geral',
    ];

    if (cols.has('app_id')) {
      colNames.push('app_id');
      values.push(app.appId);
    }
    if (cols.has('badge_color')) {
      colNames.push('badge_color');
      values.push('blue');
    }
    if (cols.has('created_at')) {
      colNames.push('created_at');
      values.push(new Date());
    }

    const placeholders = colNames.map(() => '?').join(', ');
    const escapedCols = colNames.map((c) => `\`${c}\``).join(', ');

    await this.mysqlPool.query(
      `INSERT INTO applications (${escapedCols}) VALUES (${placeholders})`,
      values
    );
  }

  // --- APPS ---
  async getAllApps(): Promise<AppInfo[]> {
    if (this.isUsingMysql && this.mysqlPool) {
      try {
        let rows: any[] = [];
        try {
          const [res] = await this.mysqlPool.query<any[]>('SELECT * FROM applications ORDER BY name ASC');
          rows = res;
        } catch (queryErr) {
          console.warn('⚠️ [cPanel MySQL] Erro ao consultar tabela applications:', queryErr);
        }

        if (rows && rows.length > 0) {
          const mapped = rows.map((r) => {
            const rawId = String(r.id || r.app_id || r.appId || '').trim();
            const rawAppId = String(r.app_id || r.appId || r.id || '').toLowerCase().trim();
            return {
              id: rawId || rawAppId,
              appId: rawAppId || rawId,
              name: String(r.name || r.nome || 'Aplicação'),
              description: String(r.description || r.descricao || ''),
              callbackUrl: String(r.callback_url || r.callbackUrl || r.url || 'https://mifireapp.com.br'),
              secretKey: String(r.secret_key || r.secretKey || 'sec_key'),
              icon: String(r.icon || r.icone || 'AppWindow'),
              active: r.active !== undefined ? toBoolean(r.active) : true,
              category: String(r.category || r.categoria || 'Geral'),
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            };
          });
          this.apps = mapped;
          return mapped;
        } else {
          // If MySQL table applications is empty, seed with the 4 default applications
          console.log('🔄 [cPanel MySQL] Tabela applications está vazia. Cadastrando 4 aplicações padrão no MySQL...');
          const cols = await this.getAppTableColumns();
          for (const app of this.apps) {
            try {
              await this.insertAppToMysql(app, cols);
            } catch (insErr) {
              // ignore duplicate
            }
          }
          return this.apps;
        }
      } catch (err) {
        console.error('⚠️ [cPanel MySQL] Erro em getAllApps:', err);
      }
    }
    return this.apps;
  }

  async getAppByAppId(appId: string): Promise<AppInfo | null> {
    if (!appId) return null;
    const clean = String(appId).toLowerCase().trim();
    if (this.isUsingMysql && this.mysqlPool) {
      try {
        const cols = await this.getAppTableColumns();
        let rows: any[] = [];
        if (cols.has('app_id')) {
          const [res] = await this.mysqlPool.query<any[]>(
            'SELECT * FROM applications WHERE LOWER(id) = ? OR LOWER(app_id) = ? LIMIT 1',
            [clean, clean]
          );
          rows = res;
        } else {
          const [res] = await this.mysqlPool.query<any[]>(
            'SELECT * FROM applications WHERE LOWER(id) = ? LIMIT 1',
            [clean]
          );
          rows = res;
        }
        if (rows && rows.length > 0) {
          const r = rows[0];
          const rawId = String(r.id || r.app_id || r.appId || '').trim();
          const rawAppId = String(r.app_id || r.appId || r.id || '').toLowerCase().trim();
          return {
            id: rawId || rawAppId,
            appId: rawAppId || rawId,
            name: String(r.name || r.nome || 'Aplicação'),
            description: String(r.description || r.descricao || ''),
            callbackUrl: String(r.callback_url || r.callbackUrl || r.url || 'https://mifireapp.com.br'),
            secretKey: String(r.secret_key || r.secretKey || 'sec_key'),
            icon: String(r.icon || r.icone || 'AppWindow'),
            active: r.active !== undefined ? toBoolean(r.active) : true,
            category: String(r.category || r.categoria || 'Geral'),
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('⚠️ [cPanel MySQL] Erro em getAppByAppId:', err);
      }
    }

    const apps = await this.getAllApps();
    return apps.find((a) => a.appId.toLowerCase() === clean || a.id.toLowerCase() === clean) || null;
  }

  async createApp(appData: Omit<AppInfo, 'id' | 'createdAt'> & { id?: string }): Promise<AppInfo> {
    const cleanAppId = (appData.appId || appData.id || 'app-' + Date.now()).toLowerCase().trim();
    const newApp: AppInfo = {
      ...appData,
      id: cleanAppId,
      appId: cleanAppId,
      name: appData.name || 'Nova Aplicação',
      description: appData.description || '',
      callbackUrl: appData.callbackUrl || '',
      secretKey: appData.secretKey || `sec_${cleanAppId}_${Date.now().toString(36)}`,
      icon: appData.icon || 'AppWindow',
      active: appData.active !== undefined ? Boolean(appData.active) : true,
      category: appData.category || 'Geral',
      createdAt: new Date().toISOString(),
    };

    if (this.isUsingMysql && this.mysqlPool) {
      try {
        const cols = await this.getAppTableColumns();
        await this.insertAppToMysql(newApp, cols);
        console.log(`✅ [cPanel MySQL] Aplicação "${newApp.name}" (ID: ${newApp.id}) cadastrada com sucesso no MySQL.`);
      } catch (err: any) {
        console.error('❌ [cPanel MySQL] Erro ao cadastrar aplicação:', err?.message || err);
        throw new Error(`Erro ao salvar aplicação no banco de dados: ${err?.message || 'Falha no MySQL'}`);
      }
    }

    this.apps = this.apps.filter((a) => a.id.toLowerCase() !== newApp.id.toLowerCase() && a.appId.toLowerCase() !== newApp.appId.toLowerCase());
    this.apps.unshift(newApp);
    return newApp;
  }

  async updateApp(id: string, updates: Partial<Omit<AppInfo, 'id' | 'createdAt'>>): Promise<AppInfo | null> {
    const cleanId = String(id).trim();
    const apps = await this.getAllApps();
    const app = apps.find((a) => a.id.toLowerCase() === cleanId.toLowerCase() || a.appId.toLowerCase() === cleanId.toLowerCase());
    if (!app) return null;

    Object.assign(app, updates);
    if (updates.appId) {
      app.appId = updates.appId.toLowerCase().trim();
    }

    if (this.isUsingMysql && this.mysqlPool) {
      try {
        const cols = await this.getAppTableColumns();
        const setClauses: string[] = [
          '`name` = ?',
          '`description` = ?',
          '`callback_url` = ?',
          '`secret_key` = ?',
          '`icon` = ?',
          '`active` = ?',
          '`category` = ?',
        ];
        const values: any[] = [
          app.name,
          app.description || '',
          app.callbackUrl,
          app.secretKey,
          app.icon || 'AppWindow',
          app.active ? 1 : 0,
          app.category || 'Geral',
        ];

        if (cols.has('app_id')) {
          setClauses.push('`app_id` = ?');
          values.push(app.appId);
        }
        if (cols.has('badge_color')) {
          setClauses.push('`badge_color` = ?');
          values.push('blue');
        }

        if (cols.has('app_id')) {
          values.push(cleanId, cleanId);
          await this.mysqlPool.query(
            `UPDATE applications SET ${setClauses.join(', ')} WHERE id = ? OR app_id = ?`,
            values
          );
        } else {
          values.push(cleanId);
          await this.mysqlPool.query(
            `UPDATE applications SET ${setClauses.join(', ')} WHERE id = ?`,
            values
          );
        }

        console.log(`✅ [cPanel MySQL] Aplicação "${app.name}" (${cleanId}) atualizada com sucesso no MySQL.`);
      } catch (err: any) {
        console.error('❌ [cPanel MySQL] Erro ao atualizar aplicação:', err?.message || err);
        throw new Error(`Erro ao atualizar aplicação no banco de dados: ${err?.message || 'Falha no MySQL'}`);
      }
    }

    const idx = this.apps.findIndex((a) => a.id.toLowerCase() === cleanId.toLowerCase() || a.appId.toLowerCase() === cleanId.toLowerCase());
    if (idx !== -1) {
      this.apps[idx] = { ...app };
    }

    return app;
  }

  async deleteApp(id: string): Promise<boolean> {
    const cleanId = String(id).trim();
    if (this.isUsingMysql && this.mysqlPool) {
      try {
        const cols = await this.getAppTableColumns();
        if (cols.has('app_id')) {
          await this.mysqlPool.query('DELETE FROM applications WHERE id = ? OR app_id = ?', [cleanId, cleanId]);
        } else {
          await this.mysqlPool.query('DELETE FROM applications WHERE id = ?', [cleanId]);
        }
        await this.mysqlPool.query('DELETE FROM user_app_permissions WHERE app_id = ?', [cleanId]);
        console.log(`🗑️ [cPanel MySQL] Aplicação "${cleanId}" removida do banco.`);
      } catch (err) {
        console.error('MySQL delete app error', err);
      }
    }
    const len = this.apps.length;
    this.apps = this.apps.filter((a) => a.id.toLowerCase() !== cleanId.toLowerCase() && a.appId.toLowerCase() !== cleanId.toLowerCase());
    return this.apps.length < len;
  }

  // --- AUDIT LOGS ---
  async logAudit(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const newLog: AuditLog = {
      ...logData,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
    };

    if (this.isUsingMysql && this.mysqlPool) {
      try {
        await this.mysqlPool.query(
          `INSERT INTO audit_logs (id, timestamp, user_id, username, app_id, app_name, ip, user_agent, status, action, details)
           VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newLog.id,
            newLog.userId || null,
            newLog.username,
            newLog.appId || null,
            newLog.appName || null,
            newLog.ip,
            newLog.userAgent || null,
            newLog.status,
            newLog.action,
            newLog.details,
          ]
        );
      } catch (err) {
        console.error('MySQL insert log error', err);
      }
    }

    this.auditLogs.unshift(newLog);
    // Keep max 500 in memory
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    return newLog;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    if (this.isUsingMysql && this.mysqlPool) {
      try {
        const [rows] = await this.mysqlPool.query<any[]>('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?', [limit]);
        return rows.map((r) => ({
          id: String(r.id),
          timestamp: new Date(r.timestamp).toISOString(),
          userId: r.user_id || undefined,
          username: r.username,
          appId: r.app_id || undefined,
          appName: r.app_name || undefined,
          ip: r.ip,
          userAgent: r.user_agent || undefined,
          status: r.status,
          action: r.action,
          details: r.details,
        }));
      } catch (err) {
        console.error('MySQL query audit logs error', err);
      }
    }
    return this.auditLogs.slice(0, limit);
  }

  getMysqlStatus() {
    return {
      mode: this.currentMode,
      connected: this.isUsingMysql,
      host: this.customConfig.host || process.env.DB_HOST || 'localhost',
      user: this.customConfig.user || process.env.DB_USER || 'mifireco_sso_user',
      database: this.customConfig.database || process.env.DB_NAME || 'mifireco_sso_db',
      port: Number(this.customConfig.port || process.env.DB_PORT) || 3306,
      error: this.connectionError,
    };
  }

  async runMysqlDiagnosticAndResetAdmin(newAdminPassword?: string) {
    const host = this.customConfig.host || process.env.DB_HOST || 'localhost';
    const user = this.customConfig.user || process.env.DB_USER || 'mifireco_sso_user';
    const password = this.customConfig.password !== undefined ? this.customConfig.password : (process.env.DB_PASSWORD || '');
    const database = this.customConfig.database || process.env.DB_NAME || 'mifireco_sso_db';
    const port = Number(this.customConfig.port || process.env.DB_PORT) || 3306;

    const report: any = {
      timestamp: new Date().toISOString(),
      config: { host, user, database, port },
      connected: false,
      existingTables: [],
      tablesRequirement: {
        users: false,
        applications: false,
        audit_logs: false,
      },
      allRequiredTablesPresent: false,
      adminUsersFound: [],
      passwordUpdated: false,
      newPasswordApplied: newAdminPassword || 'Admin@123',
      message: '',
    };

    let tempPool: mysql.Pool | null = null;
    try {
      tempPool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 5000,
      });

      const conn = await tempPool.getConnection();
      conn.release();
      report.connected = true;

      // 1. Verify existing tables in DB
      const [tableRows] = await tempPool.query<any[]>('SHOW TABLES');
      const tableNames = tableRows.map((row: any) => Object.values(row)[0] as string);
      report.existingTables = tableNames;

      report.tablesRequirement.users = tableNames.includes('users');
      report.tablesRequirement.applications = tableNames.includes('applications');
      report.tablesRequirement.audit_logs = tableNames.includes('audit_logs');

      report.allRequiredTablesPresent =
        report.tablesRequirement.users &&
        report.tablesRequirement.applications &&
        report.tablesRequirement.audit_logs;

      // If missing tables, auto-provision
      if (!report.allRequiredTablesPresent) {
        await this.ensureMysqlSchemaAndAdmin();
        const [reCheckRows] = await tempPool.query<any[]>('SHOW TABLES');
        report.existingTablesAfterProvision = reCheckRows.map((row: any) => Object.values(row)[0] as string);
        report.tablesRequirement.users = report.existingTablesAfterProvision.includes('users');
        report.tablesRequirement.applications = report.existingTablesAfterProvision.includes('applications');
        report.tablesRequirement.audit_logs = report.existingTablesAfterProvision.includes('audit_logs');
        report.allRequiredTablesPresent = true;
      }

      // 2. Inspect 'users' table for admin account(s)
      const [users] = await tempPool.query<any[]>(
        'SELECT id, name, email, username, role, active, created_at FROM users'
      );
      report.totalUsersInMysql = users.length;
      report.usersList = users;

      const adminUsers = users.filter(
        (u: any) =>
          u.username === 'admin' ||
          u.role === 'admin' ||
          (u.email && u.email.toLowerCase().includes('admin'))
      );
      report.adminUsersFound = adminUsers;

      // 3. Reset/Update admin password
      const targetPass = newAdminPassword || 'Admin@123';
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(targetPass, salt);

      if (adminUsers.length > 0) {
        for (const admin of adminUsers) {
          await tempPool.query(
            'UPDATE users SET password_hash = ?, must_change_password = 0, active = 1 WHERE id = ?',
            [newHash, admin.id]
          );
        }
        report.passwordUpdated = true;
        report.updatedCount = adminUsers.length;
        report.message = `Conexão efetuada com SUCESSO! As 3 tabelas requeridas estão presentes no MySQL. Senha do usuário 'admin' atualizada para '${targetPass}'.`;
      } else {
        // Insert admin user if not found
        const adminId = 'usr-admin-' + Date.now();
        await tempPool.query(
          `INSERT INTO users (id, name, email, username, password_hash, role, active, must_change_password, allowed_apps, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, NOW())`,
          [
            adminId,
            'Administrador SSO',
            'admin@mifireapp.com.br',
            'admin',
            newHash,
            'admin',
            JSON.stringify(['expedicao', 'vendas', 'financeiro', 'rh']),
          ]
        );
        report.passwordUpdated = true;
        report.adminCreated = true;
        report.message = `Conexão efetuada com SUCESSO! Usuário 'admin' não existia no MySQL e foi autocriado com a senha '${targetPass}'.`;
      }

      // Also sync in-memory user admin if exists
      const memoryAdmin = this.users.find((u) => u.username === 'admin');
      if (memoryAdmin) {
        memoryAdmin.passwordHash = newHash;
        memoryAdmin.mustChangePassword = false;
      }

      // Activate MySQL mode in DatabaseManager so all subsequent operations use MySQL
      await this.setMode('mysql', { host, user, password, database, port });

      await tempPool.end().catch(() => {});
    } catch (err: any) {
      report.connected = false;
      report.error = err?.message || String(err);
      report.message = `Falha na conexão TCP/MySQL com ${host}:${port}: ${report.error}`;
      if (tempPool) {
        await tempPool.end().catch(() => {});
      }
    }

    return report;
  }
}

let cachedServerIp: string | null = null;
export async function getServerPublicIp(): Promise<string> {
  if (cachedServerIp) return cachedServerIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data?.ip) {
        cachedServerIp = data.ip;
        return data.ip;
      }
    }
  } catch (e) {
    // ignore
  }
  return '34.138.192.84';
}

export const db = new DatabaseManager();
