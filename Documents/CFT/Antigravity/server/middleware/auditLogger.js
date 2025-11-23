const { AuditLog, Aircraft, Pilot, User } = require('../models');

/**
 * Middleware to log user actions for audit purposes
 * @param {string} action - Action type: VIEW, CREATE, UPDATE, DELETE
 * @param {string} resource - Resource type: aircraft, pilot, user
 */
const auditLogger = (action, resource) => {
    return async (req, res, next) => {
        // Store original data for UPDATE actions
        let originalData = null;
        let resourceName = null;

        // Capture "before" state for UPDATE and DELETE actions
        if ((action === 'UPDATE' || action === 'DELETE') && req.params.id) {
            try {
                let model;
                switch (resource) {
                    case 'aircraft':
                        model = Aircraft;
                        break;
                    case 'pilot':
                        model = Pilot;
                        break;
                    case 'user':
                        model = User;
                        break;
                }

                if (model) {
                    const record = await model.findByPk(req.params.id);
                    if (record) {
                        originalData = record.toJSON();
                        // Extract resource name
                        if (resource === 'aircraft') {
                            resourceName = record.registration;
                        } else if (resource === 'pilot') {
                            resourceName = record.name;
                        } else if (resource === 'user') {
                            resourceName = record.username;
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching original data for audit:', err);
            }
        }

        // Store original send function
        const originalSend = res.send;

        // Override send function to capture response
        res.send = function (data) {
            // Log both successful requests (200-299) AND not found (404) for searches
            const shouldLog = (res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 404;

            if (shouldLog) {
                // Extract resource ID and name from different sources
                let resourceId = null;

                // Handle search routes specially
                if (req.params.registration) {
                    // Aircraft search by registration
                    resourceName = req.params.registration;
                } else if (req.params.query) {
                    // Pilot search by name/ID
                    resourceName = req.params.query;
                } else if (action === 'VIEW' || action === 'UPDATE' || action === 'DELETE') {
                    resourceId = req.params.id ? parseInt(req.params.id) : null;
                } else if (action === 'CREATE') {
                    try {
                        const responseData = JSON.parse(data);
                        if (responseData.success && responseData[resource]) {
                            resourceId = responseData[resource].id;
                            // Extract resource name for CREATE
                            if (resource === 'aircraft') {
                                resourceName = responseData[resource].registration;
                            } else if (resource === 'pilot') {
                                resourceName = responseData[resource].name;
                            } else if (resource === 'user') {
                                resourceName = responseData[resource].username;
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }

                // Extract details
                let details = null;
                if (action === 'UPDATE' && originalData) {
                    // Compare before/after for changes
                    const changes = {};
                    for (const key in req.body) {
                        if (originalData[key] !== undefined && originalData[key] !== req.body[key]) {
                            changes[key] = {
                                before: originalData[key],
                                after: req.body[key]
                            };
                        }
                    }
                    details = { changes };
                } else if (action === 'CREATE') {
                    details = {
                        data: req.body
                    };
                } else if (action === 'DELETE' && originalData) {
                    details = {
                        deletedData: originalData
                    };
                } else if (action === 'VIEW' && resourceName && (req.params.registration || req.params.query)) {
                    // Log search attempts (both successful and failed)
                    if (res.statusCode === 404) {
                        details = {
                            searchQuery: resourceName,
                            notFound: true
                        };
                    } else {
                        details = {
                            searchQuery: resourceName,
                            found: true
                        };
                    }
                }

                // Get IP address
                const ipAddress = req.ip || req.connection.remoteAddress;

                // Log asynchronously (don't wait for it)
                AuditLog.create({
                    userId: req.user.id,
                    username: req.user.username,
                    action,
                    resource,
                    resourceId,
                    resourceName,
                    details,
                    ipAddress
                }).catch(err => {
                    console.error('Error creating audit log:', err);
                });
            }

            // Call original send
            originalSend.call(this, data);
        };

        next();
    };
};

module.exports = auditLogger;
