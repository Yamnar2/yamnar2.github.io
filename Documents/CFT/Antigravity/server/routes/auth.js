const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authenticate = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        // Find user
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username
            },
            process.env.JWT_SECRET || 'your-secret-key-change-this',
            { expiresIn: '24h' }
        );

        // Return user with permissions
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                permissions: user.permissions, // ✅ Include permissions
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
        });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                name: req.user.name,
                permissions: req.user.permissions, // ✅ Include permissions
                created_at: req.user.created_at
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuario actual'
        });
    }
});

// Logout (client-side only, token invalidation would require a blacklist)
router.post('/logout', authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'Sesión cerrada correctamente'
    });
});

module.exports = router;
