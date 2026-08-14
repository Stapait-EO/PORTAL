import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db, getServerPublicIp } from './server/db.js';
import { User } from './src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sso_mifire_super_secret_key_change_in_production';
const COOKIE_NAME = 'mifire_sso_token';
const PORT = 3000;

interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'password'>;
  jwtToken?: string;
}

async function startServer() {
  const app = express();

  // Middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // CORS configuration to support cPanel subdomains (.mifireapp.com.br)
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        if (
          origin.includes('mifireapp.com.br') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('run.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive for preview/testing
      },
      credentials: true,
    })
  );

  // Helper to extract IP
  const getClientIp = (req: Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  };

  // Helper to set HttpOnly Cookie
  const setSsoCookie = (res: Response, token: string, rememberMe: boolean = false) => {
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
    const isProd = process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN;

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      domain: domain && domain.startsWith('.') ? domain : undefined,
      maxAge,
      path: '/',
    });
  };

  // Middleware to authenticate JWT from Cookie, Authorization header, or Query Param
  const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token = req.cookies[COOKIE_NAME];

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token && req.query.sso_token) {
      token = String(req.query.sso_token);
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const freshUser = await db.getUserById(decoded.id);

      if (freshUser && freshUser.active) {
        const { passwordHash, ...userWithoutPass } = freshUser;
        req.user = userWithoutPass;
        req.jwtToken = token;
      }
    } catch (err) {
      // Invalid/expired token - ignore silently for public routes or handled by requiredAuth
    }
    next();
  };

  app.use(authenticateToken);

  // Require Auth Middleware
  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        valid: false,
        message: 'Não autenticado. Por favor, faça login no Portal Central SSO.',
      });
    }
    next();
  };

  // Require Admin Middleware
  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Acesso não autenticado.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado: Requer perfil de Administrador.' });
    }
    next();
  };

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  // POST /api/auth/login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password, rememberMe, redirect_url, app_id } = req.body;
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'];

      if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
      }

      const targetApp = app_id ? await db.getAppByAppId(app_id) : null;

      const userWithPass = await db.getUserByUsernameOrEmail(username);

      if (!userWithPass) {
        await db.logAudit({
          username,
          appId: app_id,
          appName: targetApp?.name,
          ip,
          userAgent,
          status: 'FAILURE',
          action: 'LOGIN',
          details: 'Tentativa de login com usuário inexistente.',
        });
        return res.status(401).json({ message: 'Credenciais inválidas. Verifique o usuário ou e-mail.' });
      }

      if (!userWithPass.active) {
        await db.logAudit({
          userId: userWithPass.id,
          username: userWithPass.username,
          appId: app_id,
          appName: targetApp?.name,
          ip,
          userAgent,
          status: 'FAILURE',
          action: 'LOGIN',
          details: 'Tentativa de login de usuário inativo/bloqueado.',
        });
        return res.status(403).json({ message: 'Esta conta de usuário está desativada no Portal SSO.' });
      }

      if (!userWithPass.passwordHash) {
        return res.status(401).json({ message: 'Senha não configurada para este usuário. Redefina a senha no link "Esqueceu a senha?".' });
      }

      let passwordMatches = false;
      try {
        passwordMatches = await bcrypt.compare(password, userWithPass.passwordHash);
      } catch (bcryptErr) {
        console.error('Erro ao comparar senha no bcrypt:', bcryptErr);
        passwordMatches = false;
      }

      if (!passwordMatches) {
        await db.logAudit({
          userId: userWithPass.id,
          username: userWithPass.username,
          appId: app_id,
          appName: targetApp?.name,
          ip,
          userAgent,
          status: 'FAILURE',
          action: 'LOGIN',
          details: 'Senha incorreta.',
        });
        return res.status(401).json({ message: 'Credenciais inválidas. Verifique sua senha.' });
      }

      // Permission check for target application if app_id is passed
      let isAuthorized = true;
      const allowedApps = Array.isArray(userWithPass.allowedApps) ? userWithPass.allowedApps : [];
      if (app_id && userWithPass.role !== 'admin') {
        const allowed = allowedApps.map((a) => String(a).toLowerCase()).includes(app_id.toLowerCase());
        if (!allowed) {
          isAuthorized = false;
          await db.logAudit({
            userId: userWithPass.id,
            username: userWithPass.username,
            appId: app_id,
            appName: targetApp?.name || app_id,
            ip,
            userAgent,
            status: 'FAILURE',
            action: 'ACCESS_DENIED',
            details: `Acesso negado: Usuário não tem permissão atribuída para a aplicação "${targetApp?.name || app_id}".`,
          });
          return res.status(403).json({
            message: `Você não possui permissão para acessar a aplicação "${targetApp?.name || app_id}". Entre em contato com o administrador.`,
            unauthorizedApp: app_id,
          });
        }
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: userWithPass.id,
          username: userWithPass.username,
          email: userWithPass.email,
          role: userWithPass.role,
          allowedApps,
          mustChangePassword: userWithPass.mustChangePassword,
        },
        JWT_SECRET,
        { expiresIn: rememberMe ? '7d' : '8h' }
      );

      // Set HttpOnly Cookie
      setSsoCookie(res, token, rememberMe);

      // Update last login
      await db.updateUser(userWithPass.id, { lastLogin: new Date().toISOString() });

      // Audit log success
      await db.logAudit({
        userId: userWithPass.id,
        username: userWithPass.username,
        appId: app_id,
        appName: targetApp?.name || (app_id ? app_id : 'Portal Central SSO'),
        ip,
        userAgent,
        status: 'SUCCESS',
        action: 'LOGIN',
        details: app_id
          ? `Login SSO com sucesso e redirecionamento para "${targetApp?.name || app_id}".`
          : 'Login realizado com sucesso no Portal Central.',
      });

      // Compute redirect URL with appended SSO token if requested
      let finalRedirectUrl = redirect_url || null;
      if (finalRedirectUrl) {
        try {
          const urlObj = new URL(finalRedirectUrl);
          urlObj.searchParams.set('sso_token', token);
          urlObj.searchParams.set('user', userWithPass.username);
          finalRedirectUrl = urlObj.toString();
        } catch (e) {
          // If relative or invalid URL format, append query string manually
          const sep = finalRedirectUrl.includes('?') ? '&' : '?';
          finalRedirectUrl = `${finalRedirectUrl}${sep}sso_token=${encodeURIComponent(token)}&user=${encodeURIComponent(userWithPass.username)}`;
        }
      }

      const { passwordHash, ...userClean } = userWithPass;

      return res.json({
        success: true,
        message: 'Login realizado com sucesso.',
        token,
        user: userClean,
        redirectUrl: finalRedirectUrl,
        targetApp: targetApp || null,
      });
    } catch (err: any) {
      console.error('⚠️ [SSO Server] Erro ao processar login:', err);
      return res.status(500).json({
        message: `Erro interno no servidor ao realizar login: ${err?.message || 'Falha de execução'}`,
      });
    }
  });

  // GET /api/auth/validate
  // Used by third-party apps & internal services to validate current session & app permissions
  app.get('/api/auth/validate', async (req: AuthenticatedRequest, res: Response) => {
    const { app_id } = req.query;
    const ip = getClientIp(req);

    if (!req.user) {
      return res.status(401).json({
        valid: false,
        message: 'Token SSO inválido, ausente ou expirado.',
      });
    }

    let authorizedForApp = true;
    let targetApp: any = null;

    if (app_id) {
      const appIdStr = String(app_id).toLowerCase();
      targetApp = await db.getAppByAppId(appIdStr);

      if (req.user.role !== 'admin') {
        authorizedForApp = req.user.allowedApps.includes(appIdStr);
      }

      await db.logAudit({
        userId: req.user.id,
        username: req.user.username,
        appId: appIdStr,
        appName: targetApp?.name || appIdStr,
        ip,
        status: authorizedForApp ? 'SUCCESS' : 'FAILURE',
        action: 'VALIDATE_TOKEN',
        details: authorizedForApp
          ? `Validação de token SSO bem-sucedida para a app "${targetApp?.name || appIdStr}".`
          : `Token válido mas usuário não possui permissão para "${targetApp?.name || appIdStr}".`,
      });
    }

    return res.json({
      valid: true,
      user: req.user,
      authorizedForApp,
      app: targetApp,
    });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      user: req.user,
      token: req.jwtToken,
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', async (req: AuthenticatedRequest, res: Response) => {
    const ip = getClientIp(req);
    const domain = process.env.COOKIE_DOMAIN;

    if (req.user) {
      await db.logAudit({
        userId: req.user.id,
        username: req.user.username,
        ip,
        status: 'SUCCESS',
        action: 'LOGOUT',
        details: 'Sessão encerrada no Portal Central SSO.',
      });
    }

    res.clearCookie(COOKIE_NAME, {
      path: '/',
      domain: domain && domain.startsWith('.') ? domain : undefined,
    });

    return res.json({
      success: true,
      message: 'Logout do SSO realizado com sucesso.',
    });
  });

  // POST /api/auth/change-password
  app.post('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const userWithPass = await db.getUserById(userId);
    if (!userWithPass) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const match = await bcrypt.compare(currentPassword, userWithPass.passwordHash);
    if (!match) {
      return res.status(400).json({ message: 'Senha atual incorreta.' });
    }

    await db.updateUser(userId, {
      passwordRaw: newPassword,
      mustChangePassword: false,
    });

    await db.logAudit({
      userId,
      username: userWithPass.username,
      ip: getClientIp(req),
      status: 'SUCCESS',
      action: 'PASSWORD_CHANGE',
      details: 'Senha alterada pelo próprio usuário com sucesso.',
    });

    return res.json({
      success: true,
      message: 'Senha alterada com sucesso!',
    });
  });

  // POST /api/auth/forgot-password
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { emailOrUsername } = req.body || {};
      if (!emailOrUsername || typeof emailOrUsername !== 'string' || !emailOrUsername.trim()) {
        return res.status(200).json({ success: false, allowed: false, message: 'Informe o usuário ou e-mail.' });
      }

      const cleanInput = emailOrUsername.trim();
      const user = await db.getUserByUsernameOrEmail(cleanInput);

      const isMustChange = user ? Boolean(user.mustChangePassword) : false;

      try {
        await db.logAudit({
          username: cleanInput,
          ip: getClientIp(req),
          status: user && isMustChange ? 'SUCCESS' : 'FAILURE',
          action: 'ADMIN_ACTION',
          details: user
            ? `Solicitação de redefinição de senha para '${cleanInput}'. Campo must_change_password = ${isMustChange ? 1 : 0}.`
            : `Solicitação de redefinição para usuário não cadastrado (${cleanInput}).`,
        });
      } catch (logErr) {
        // Ignore audit log write failure
      }

      if (!user) {
        return res.status(200).json({
          success: false,
          allowed: false,
          message: 'Usuário não localizado no sistema.',
          demoToken: null,
          mustChangePassword: false,
        });
      }

      // Se must_change_password for 0 (não liberado)
      if (!isMustChange) {
        return res.status(200).json({
          success: false,
          allowed: false,
          message: 'Usuário não liberado para reconfigurar sua senha',
          demoToken: null,
          mustChangePassword: false,
        });
      }

      // Se must_change_password for 1 (liberado)
      const safeId = String(user.id || user.username || 'USR').toUpperCase();
      return res.status(200).json({
        success: true,
        allowed: true,
        message: 'Usuário liberado para reconfigurar a senha (must_change_password = 1).',
        demoToken: `RESET-${safeId}-${Date.now().toString().slice(-4)}`,
        mustChangePassword: true,
        username: user.username,
        email: user.email,
      });
    } catch (err: any) {
      console.error('⚠️ [ForgotPassword] Erro na rota:', err);
      return res.status(200).json({
        success: false,
        allowed: false,
        message: 'Erro interno ao consultar o usuário.',
        error: err?.message || String(err),
      });
    }
  });

  // POST /api/auth/reset-password
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { username, resetCode, newPassword } = req.body;
      if (!username || !resetCode || !newPassword) {
        return res.status(400).json({ message: 'Dados incompletos para redefinição.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      }

      const user = await db.getUserByUsernameOrEmail(username);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não localizado no banco de dados.' });
      }

      const wasMustChange = Boolean(user.mustChangePassword);

      // Update password AND set mustChangePassword to false (0) in MySQL table users & memory
      await db.updateUser(user.id, {
        passwordRaw: newPassword,
        mustChangePassword: false,
      });

      // Re-fetch user to confirm state in memory/db
      const updatedUser = await db.getUserByUsernameOrEmail(username);

      await db.logAudit({
        userId: user.id,
        username: user.username,
        ip: getClientIp(req),
        status: 'SUCCESS',
        action: 'PASSWORD_CHANGE',
        details: `Senha redefinida via 'Esqueceu a Senha'. Tabela MySQL atualizada e campo 'must_change_password' definido para 0 (status verificado: ${updatedUser?.mustChangePassword ? 1 : 0}).`,
      });

      return res.json({
        success: true,
        wasMustChange,
        mustChangePassword: updatedUser?.mustChangePassword ?? false,
        message: 'Senha redefinida com sucesso no MySQL! O parâmetro must_change_password foi atualizado para 0. Você já pode realizar o login com a nova senha.',
      });
    } catch (err: any) {
      console.error('⚠️ [Reset Password Error]', err);
      return res.status(500).json({ message: `Erro ao redefinir senha: ${err?.message || 'Falha de execução'}` });
    }
  });

  // ==========================================
  // ADMIN MANAGEMENT ENDPOINTS
  // ==========================================

  // GET /api/admin/users
  app.get('/api/admin/users', requireAdmin, async (req: Request, res: Response) => {
    const users = await db.getAllUsers();
    // Strip passwordHash before sending
    const safeUsers = users.map(({ passwordHash, ...u }) => u);
    return res.json(safeUsers);
  });

  // POST /api/admin/users
  app.post('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { name, email, username, password, role, active, mustChangePassword, allowedApps } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: 'Preencha Nome, E-mail, Usuário e Senha.' });
    }

    try {
      const existing = await db.getUserByUsernameOrEmail(username);
      if (existing) {
        return res.status(400).json({ message: 'Já existe um usuário cadastrado com este e-mail ou nome de usuário.' });
      }

      const newUser = await db.createUser({
        name,
        email,
        username,
        passwordRaw: password,
        role: role || 'user',
        active: active ?? true,
        mustChangePassword: mustChangePassword ?? false,
        allowedApps: allowedApps || [],
      });

      await db.logAudit({
        userId: req.user?.id,
        username: req.user?.username || 'admin',
        ip: getClientIp(req),
        status: 'SUCCESS',
        action: 'ADMIN_ACTION',
        details: `Novo usuário criado: "${username}" (${name}).`,
      });

      const { passwordHash, ...safeUser } = newUser;
      return res.status(201).json(safeUser);
    } catch (err: any) {
      console.error('❌ Error creating user:', err);
      return res.status(500).json({ message: 'Erro ao cadastrar usuário no banco de dados: ' + (err?.message || 'Erro interno') });
    }
  });

  // PUT /api/admin/users/:id
  app.put('/api/admin/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, email, username, password, role, active, mustChangePassword, allowedApps } = req.body;

    try {
      const updated = await db.updateUser(id, {
        name,
        email,
        username,
        passwordRaw: password ? password : undefined,
        role,
        active,
        mustChangePassword,
        allowedApps,
      });

      if (!updated) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      await db.logAudit({
        userId: req.user?.id,
        username: req.user?.username || 'admin',
        ip: getClientIp(req),
        status: 'SUCCESS',
        action: 'ADMIN_ACTION',
        details: `Dados do usuário "${updated.username}" foram atualizados pelo administrador.`,
      });

      const { passwordHash, ...safeUser } = updated;
      return res.json(safeUser);
    } catch (err: any) {
      console.error('❌ Error updating user:', err);
      return res.status(500).json({ message: 'Erro ao atualizar usuário no banco de dados: ' + (err?.message || 'Erro interno') });
    }
  });

  // DELETE /api/admin/users/:id
  app.delete('/api/admin/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const target = await db.getUserById(id);
    if (!target) return res.status(404).json({ message: 'Usuário não encontrado.' });

    if (target.username === 'admin') {
      return res.status(400).json({ message: 'Não é possível excluir o usuário administrador principal.' });
    }

    await db.deleteUser(id);

    await db.logAudit({
      userId: req.user?.id,
      username: req.user?.username || 'admin',
      ip: getClientIp(req),
      status: 'SUCCESS',
      action: 'ADMIN_ACTION',
      details: `Usuário "${target.username}" foi removido do sistema.`,
    });

    return res.json({ success: true, message: 'Usuário removido com sucesso.' });
  });

  // GET /api/admin/apps
  app.get('/api/admin/apps', async (req: Request, res: Response) => {
    const apps = await db.getAllApps();
    return res.json(apps);
  });

  // POST /api/admin/apps
  app.post('/api/admin/apps', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { appId, name, description, callbackUrl, secretKey, icon, active, category } = req.body;

    if (!appId || !name || !callbackUrl) {
      return res.status(400).json({ message: 'Preencha os campos obrigatórios: ID da App, Nome e URL de Callback.' });
    }

    try {
      const existing = await db.getAppByAppId(appId);
      if (existing) {
        return res.status(400).json({ message: 'Já existe uma aplicação cadastrada com este App ID.' });
      }

      const newApp = await db.createApp({
        appId: appId.toLowerCase().trim(),
        name,
        description: description || '',
        callbackUrl,
        secretKey: secretKey || `sec_${appId}_${Date.now()}`,
        icon: icon || 'AppWindow',
        active: active ?? true,
        category: category || 'Geral',
      });

      await db.logAudit({
        userId: req.user?.id,
        username: req.user?.username || 'admin',
        ip: getClientIp(req),
        status: 'SUCCESS',
        action: 'ADMIN_ACTION',
        details: `Nova aplicação registrada: "${name}" (ID: ${appId}).`,
      });

      return res.status(201).json(newApp);
    } catch (err: any) {
      console.error('❌ Error in POST /api/admin/apps:', err);
      return res.status(500).json({ message: err?.message || 'Erro ao cadastrar aplicação no banco de dados.' });
    }
  });

  // PUT /api/admin/apps/:id
  app.put('/api/admin/apps/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { appId, name, description, callbackUrl, secretKey, icon, active, category } = req.body;

    try {
      const updated = await db.updateApp(id, {
        appId,
        name,
        description,
        callbackUrl,
        secretKey,
        icon,
        active,
        category,
      });

      if (!updated) {
        return res.status(404).json({ message: 'Aplicação não encontrada.' });
      }

      await db.logAudit({
        userId: req.user?.id,
        username: req.user?.username || 'admin',
        ip: getClientIp(req),
        status: 'SUCCESS',
        action: 'ADMIN_ACTION',
        details: `Configurações da aplicação "${updated.name}" foram atualizadas.`,
      });

      return res.json(updated);
    } catch (err: any) {
      console.error('❌ Error in PUT /api/admin/apps/:id:', err);
      return res.status(500).json({ message: err?.message || 'Erro ao atualizar aplicação no banco de dados.' });
    }
  });

  // DELETE /api/admin/apps/:id
  app.delete('/api/admin/apps/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
      const apps = await db.getAllApps();
      const target = apps.find((a) => a.id === id || a.appId === id);

      if (!target) return res.status(404).json({ message: 'Aplicação não encontrada.' });

      await db.deleteApp(id);

      await db.logAudit({
        userId: req.user?.id,
        username: req.user?.username || 'admin',
        ip: getClientIp(req),
        status: 'SUCCESS',
        action: 'ADMIN_ACTION',
        details: `Aplicação "${target.name}" (${target.appId}) foi excluída.`,
      });

      return res.json({ success: true, message: 'Aplicação removida.' });
    } catch (err: any) {
      console.error('❌ Error in DELETE /api/admin/apps/:id:', err);
      return res.status(500).json({ message: err?.message || 'Erro ao remover aplicação no banco de dados.' });
    }
  });

  // GET /api/admin/audit-logs
  app.get('/api/admin/audit-logs', requireAdmin, async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 200;
    const logs = await db.getAuditLogs(limit);
    return res.json(logs);
  });

  // POST /api/admin/seed
  app.post('/api/admin/seed', requireAdmin, async (req: Request, res: Response) => {
    // Allows resetting demo state if needed
    return res.json({ message: 'Dados padrão inicializados com sucesso.' });
  });

  // GET /api/system/info
  app.get('/api/system/info', async (req: Request, res: Response) => {
    const publicIp = await getServerPublicIp();
    const clientIp = getClientIp(req);
    res.json({
      status: 'online',
      app: 'Portal Central de Autenticação (SSO / Identity Provider)',
      version: '1.0.0-cpanel',
      installPath: '/home/mifireco/portal',
      domain: '.mifireapp.com.br',
      serverPublicIp: publicIp,
      clientIp: clientIp,
      database: db.getMysqlStatus(),
    });
  });

  // POST /api/system/mode
  app.post('/api/system/mode', async (req: Request, res: Response) => {
    const { mode, host, user, password, database, port } = req.body;
    if (mode !== 'mysql' && mode !== 'development') {
      return res.status(400).json({ message: 'Modo inválido. Escolha "mysql" ou "development".' });
    }

    const result = await db.setMode(mode, { host, user, password, database, port });
    const publicIp = await getServerPublicIp();

    return res.json({
      ...result,
      serverPublicIp: publicIp,
      status: db.getMysqlStatus(),
    });
  });

  // POST /api/system/test-mysql
  app.post('/api/system/test-mysql', async (req: Request, res: Response) => {
    const { newAdminPassword } = req.body;
    const diagnostic = await db.runMysqlDiagnosticAndResetAdmin(newAdminPassword);
    const publicIp = await getServerPublicIp();

    return res.json({
      ...diagnostic,
      serverPublicIp: publicIp,
    });
  });


  // Vite middleware for development or static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Portal SSO] Servidor de Autenticação rodando em http://localhost:${PORT}`);
  });
}

startServer();
