const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection, syncDatabase } = require('./models');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const aircraftRoutes = require('./routes/aircraft');
const pilotRoutes = require('./routes/pilots');
const auditLogRoutes = require('./routes/auditLogs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Serve static files from root directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../../')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/aircraft', aircraftRoutes);
app.use('/api/pilots', pilotRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        // Test database connection
        await testConnection();

        // Sync database (create tables)
        // Set force: true to drop and recreate tables (only for development)
        await syncDatabase(false);

        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log('='.repeat(50));
            console.log('✈️  VPFS - Sistema de Verificación Prevuelo - API');
            console.log('='.repeat(50));
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 API URL: http://localhost:${PORT}/api`);
            console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
            console.log('');
            console.log('Available endpoints:');
            console.log('  POST   /api/auth/login');
            console.log('  GET    /api/auth/me');
            console.log('  GET    /api/users');
            console.log('  POST   /api/users');
            console.log('  GET    /api/aircraft');
            console.log('  GET    /api/aircraft/stats');
            console.log('  GET    /api/pilots');
            console.log('  GET    /api/pilots/stats');
            console.log('='.repeat(50));
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
