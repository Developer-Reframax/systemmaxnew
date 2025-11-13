/**
 * User authentication API routes
 * Handle user registration, login, token management, etc.
 */
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
const router = Router();
// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validação dos campos obrigatórios
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email e senha são obrigatórios'
            });
            return;
        }
        // Buscar usuário no banco usando service_role_key
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('status', 'ativo')
            .single();
        if (error || !user) {
            res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
            return;
        }
        // Verificar senha com bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
            return;
        }
        // Gerar JWT token
        const token = jwt.sign({
            matricula: user.matricula,
            email: user.email,
            role: user.role,
            nome: user.nome
        }, JWT_SECRET, { expiresIn: '24h' });
        // Retornar dados do usuário (sem senha) e token
        const { password_hash, ...userWithoutPassword } = user;
        res.status(200).json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: userWithoutPassword,
                token
            }
        });
    }
    catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});
/**
 * User Registration
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    // TODO: Implement register logic
    res.status(501).json({ success: false, message: 'Not implemented' });
});
/**
 * User Verification
 * POST /api/auth/verify
 */
router.post('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token de acesso requerido' });
        }
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        const { matricula } = req.body;
        if (decoded.matricula !== matricula) {
            return res.status(403).json({ success: false, message: 'Token inválido para este usuário' });
        }
        // Check if user still exists and is active
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('matricula, nome, email, role, funcao, contrato_raiz, status')
            .eq('matricula', matricula)
            .eq('status', 'ativo')
            .single();
        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado ou inativo'
            });
        }
        res.json({
            success: true,
            user: {
                matricula: user.matricula,
                nome: user.nome,
                email: user.email,
                role: user.role,
                funcao: user.funcao,
                contrato_raiz: user.contrato_raiz
            }
        });
    }
    catch (error) {
        console.error('Verify user error:', error);
        res.status(403).json({
            success: false,
            message: 'Token inválido'
        });
    }
});
/**
 * Create Session
 * POST /api/auth/session
 */
router.post('/session', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token de acesso requerido' });
        }
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        const { matricula_usuario, inicio_sessao, paginas_acessadas, modulos_acessados } = req.body;
        if (decoded.matricula !== matricula_usuario) {
            return res.status(403).json({ success: false, message: 'Token inválido para este usuário' });
        }
        // Create session record
        const { data: session, error } = await supabase
            .from('sessoes')
            .insert({
            matricula_usuario,
            inicio_sessao,
            paginas_acessadas: paginas_acessadas || 1,
            modulos_acessados: modulos_acessados || ['Login']
        })
            .select()
            .single();
        if (error) {
            console.error('Session creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar sessão'
            });
        }
        res.json({
            success: true,
            message: 'Sessão criada com sucesso',
            session
        });
    }
    catch (error) {
        console.error('Session creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});
/**
 * User Logout
 * POST /api/auth/logout
 */
// Logout route
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token de acesso requerido' });
        }
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        const { matricula_usuario, fim_sessao } = req.body;
        if (decoded.matricula !== matricula_usuario) {
            return res.status(403).json({ success: false, message: 'Token inválido para este usuário' });
        }
        // Find and update the active session
        const { data: sessions, error: selectError } = await supabase
            .from('sessoes')
            .select('id, inicio_sessao')
            .eq('matricula_usuario', matricula_usuario)
            .is('fim_sessao', null)
            .order('inicio_sessao', { ascending: false })
            .limit(1);
        if (selectError) {
            console.error('Session select error:', selectError);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar sessão'
            });
        }
        if (sessions && sessions.length > 0) {
            const session = sessions[0];
            const startTime = new Date(session.inicio_sessao).getTime();
            const endTime = new Date(fim_sessao).getTime();
            const tempo_total_segundos = Math.floor((endTime - startTime) / 1000);
            const { error: updateError } = await supabase
                .from('sessoes')
                .update({
                fim_sessao,
                tempo_total_segundos
            })
                .eq('id', session.id);
            if (updateError) {
                console.error('Session update error:', updateError);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao finalizar sessão'
                });
            }
        }
        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});
export default router;
