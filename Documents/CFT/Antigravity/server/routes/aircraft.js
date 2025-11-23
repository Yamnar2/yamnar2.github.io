const express = require('express');
const router = express.Router();
const { Aircraft } = require('../models');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../config/permissions');
const { Op } = require('sequelize');
const auditLogger = require('../middleware/auditLogger');

// Get all aircraft (requires VIEW_ALL)
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_ALL), async (req, res) => {
    try {
        const aircraft = await Aircraft.findAll({
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Get aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener aeronaves'
        });
    }
});

// Get aircraft statistics
router.get('/stats', authenticate, authorize(PERMISSIONS.VIEW_ALL), async (req, res) => {
    try {
        const total = await Aircraft.count();
        const withDebt = await Aircraft.count({
            where: {
                debt_status: { [Op.ne]: 'paid' }
            }
        });

        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const validAirworthiness = await Aircraft.count({
            where: {
                airworthiness_expiry: {
                    [Op.gt]: thirtyDaysFromNow
                }
            }
        });

        const validRadio = await Aircraft.count({
            where: {
                radio_station_expiry: {
                    [Op.gt]: thirtyDaysFromNow
                }
            }
        });

        const validInsurance = await Aircraft.count({
            where: {
                insurance_expiry: {
                    [Op.gt]: thirtyDaysFromNow
                }
            }
        });

        const alerts = total - Math.min(validAirworthiness, validRadio, validInsurance);

        res.json({
            success: true,
            stats: {
                total,
                withDebt,
                validAirworthiness,
                validRadio,
                validInsurance,
                alerts
            }
        });
    } catch (error) {
        console.error('Get aircraft stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

// Search aircraft by registration (with audit) - MUST BE BEFORE /:id
router.get('/search/:registration', authenticate, authorize(PERMISSIONS.VIEW_ALL), auditLogger('VIEW', 'aircraft'), async (req, res) => {
    try {
        const aircraft = await Aircraft.findOne({
            where: {
                registration: {
                    [Op.like]: `%${req.params.registration}%`
                }
            }
        });

        if (!aircraft) {
            return res.status(404).json({
                success: false,
                message: 'Aeronave no encontrada'
            });
        }

        res.json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Search aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar aeronave'
        });
    }
});

// Get single aircraft
router.get('/:id', authenticate, authorize(PERMISSIONS.VIEW_ALL), auditLogger('VIEW', 'aircraft'), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);

        if (!aircraft) {
            return res.status(404).json({
                success: false,
                message: 'Aeronave no encontrada'
            });
        }

        res.json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Get aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener aeronave'
        });
    }
});

// Create aircraft
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_AIRCRAFT), auditLogger('CREATE', 'aircraft'), async (req, res) => {
    try {
        const {
            registration,
            manufacturer,
            model,
            serial_number,
            debt_status,
            debt_details,
            debt_amount,
            debt_currency,
            airworthiness_cert,
            airworthiness_expiry,
            radio_station_cert,
            radio_station_expiry,
            insurance,
            insurance_expiry
        } = req.body;

        // Check if registration exists
        const existing = await Aircraft.findOne({ where: { registration } });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'La matrícula ya existe'
            });
        }

        const aircraft = await Aircraft.create({
            registration,
            manufacturer,
            model,
            serial_number,
            debt_status,
            debt_details,
            debt_amount,
            debt_currency,
            airworthiness_cert,
            airworthiness_expiry,
            radio_station_cert,
            radio_station_expiry,
            insurance,
            insurance_expiry
        });

        res.status(201).json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Create aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear aeronave'
        });
    }
});

// Update aircraft - Full update (requires multiple permissions)
router.put('/:id', authenticate, auditLogger('UPDATE', 'aircraft'), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);

        if (!aircraft) {
            return res.status(404).json({
                success: false,
                message: 'Aeronave no encontrada'
            });
        }

        const updates = {};

        // Check permissions for each field
        if (req.body.registration !== undefined || req.body.manufacturer !== undefined ||
            req.body.model !== undefined || req.body.serial_number !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_AIRCRAFT_BASIC)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar información básica'
                });
            }
            if (req.body.registration) updates.registration = req.body.registration;
            if (req.body.manufacturer) updates.manufacturer = req.body.manufacturer;
            if (req.body.model) updates.model = req.body.model;
            if (req.body.serial_number) updates.serial_number = req.body.serial_number;
        }

        if (req.body.debt_status !== undefined || req.body.debt_details !== undefined ||
            req.body.debt_amount !== undefined || req.body.debt_currency !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_DEBT)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el estatus de deuda'
                });
            }
            if (req.body.debt_status) updates.debt_status = req.body.debt_status;
            if (req.body.debt_details !== undefined) updates.debt_details = req.body.debt_details;
            if (req.body.debt_amount !== undefined) updates.debt_amount = req.body.debt_amount;
            if (req.body.debt_currency !== undefined) updates.debt_currency = req.body.debt_currency;
        }

        if (req.body.insurance !== undefined || req.body.insurance_expiry !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_INSURANCE)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el seguro'
                });
            }
            if (req.body.insurance) updates.insurance = req.body.insurance;
            if (req.body.insurance_expiry) updates.insurance_expiry = req.body.insurance_expiry;
        }

        if (req.body.airworthiness_cert !== undefined || req.body.airworthiness_expiry !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_AIRWORTHINESS)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el certificado de aeronavegabilidad'
                });
            }
            if (req.body.airworthiness_cert) updates.airworthiness_cert = req.body.airworthiness_cert;
            if (req.body.airworthiness_expiry) updates.airworthiness_expiry = req.body.airworthiness_expiry;
        }

        if (req.body.radio_station_cert !== undefined || req.body.radio_station_expiry !== undefined) {
            if (!req.user.hasPermission(PERMISSIONS.MANAGE_RADIO)) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para modificar el certificado de radio'
                });
            }
            if (req.body.radio_station_cert) updates.radio_station_cert = req.body.radio_station_cert;
            if (req.body.radio_station_expiry) updates.radio_station_expiry = req.body.radio_station_expiry;
        }

        // Check if new registration conflicts
        if (updates.registration && updates.registration !== aircraft.registration) {
            const existing = await Aircraft.findOne({ where: { registration: updates.registration } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'La matrícula ya existe'
                });
            }
        }

        await aircraft.update(updates);

        res.json({
            success: true,
            aircraft
        });
    } catch (error) {
        console.error('Update aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar aeronave'
        });
    }
});

// Update debt status only
router.patch('/:id/debt', authenticate, authorize(PERMISSIONS.MANAGE_DEBT), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        await aircraft.update({ debt_status: req.body.debt_status });
        res.json({ success: true, aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar deuda' });
    }
});

// Update insurance only
router.patch('/:id/insurance', authenticate, authorize(PERMISSIONS.MANAGE_INSURANCE), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        const updates = {};
        if (req.body.insurance) updates.insurance = req.body.insurance;
        if (req.body.insurance_expiry) updates.insurance_expiry = req.body.insurance_expiry;

        await aircraft.update(updates);
        res.json({ success: true, aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar seguro' });
    }
});

// Update airworthiness certificate only
router.patch('/:id/airworthiness', authenticate, authorize(PERMISSIONS.MANAGE_AIRWORTHINESS), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        const updates = {};
        if (req.body.airworthiness_cert) updates.airworthiness_cert = req.body.airworthiness_cert;
        if (req.body.airworthiness_expiry) updates.airworthiness_expiry = req.body.airworthiness_expiry;

        await aircraft.update(updates);
        res.json({ success: true, aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar certificado' });
    }
});

// Update radio certificate only
router.patch('/:id/radio', authenticate, authorize(PERMISSIONS.MANAGE_RADIO), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        const updates = {};
        if (req.body.radio_station_cert) updates.radio_station_cert = req.body.radio_station_cert;
        if (req.body.radio_station_expiry) updates.radio_station_expiry = req.body.radio_station_expiry;

        await aircraft.update(updates);
        res.json({ success: true, aircraft });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar certificado de radio' });
    }
});

// Delete aircraft
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_AIRCRAFT), auditLogger('DELETE', 'aircraft'), async (req, res) => {
    try {
        const aircraft = await Aircraft.findByPk(req.params.id);

        if (!aircraft) {
            return res.status(404).json({
                success: false,
                message: 'Aeronave no encontrada'
            });
        }

        await aircraft.destroy();

        res.json({
            success: true,
            message: 'Aeronave eliminada correctamente'
        });
    } catch (error) {
        console.error('Delete aircraft error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar aeronave'
        });
    }
});

module.exports = router;
