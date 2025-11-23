// ===================================
// PERMISSIONS CONSTANTS (Frontend)
// ===================================

const PERMISSIONS = {
    // Lectura
    VIEW_ALL: 'view_all',

    // Aeronaves - Gestión
    VIEW_AIRCRAFT_MODULE: 'view_aircraft_module',
    CREATE_AIRCRAFT: 'create_aircraft',
    DELETE_AIRCRAFT: 'delete_aircraft',
    MANAGE_AIRCRAFT_BASIC: 'manage_aircraft_basic',

    // Aeronaves - Campos específicos
    MANAGE_DEBT: 'manage_debt',
    MANAGE_INSURANCE: 'manage_insurance',
    MANAGE_AIRWORTHINESS: 'manage_airworthiness',
    MANAGE_RADIO: 'manage_radio',

    // Pilotos - Gestión
    VIEW_PILOTS_MODULE: 'view_pilots_module',
    CREATE_PILOT: 'create_pilot',
    DELETE_PILOT: 'delete_pilot',
    MANAGE_PILOT_BASIC: 'manage_pilot_basic',

    // Pilotos - Campos específicos
    MANAGE_PILOT_LICENSE: 'manage_pilot_license',
    MANAGE_PILOT_MEDICAL: 'manage_pilot_medical',

    // Administración
    MANAGE_USERS: 'manage_users'
};

// Grupos de permisos para UI
const PERMISSION_GROUPS = {
    aircraft: {
        label: 'Aeronaves',
        icon: '✈️',
        permissions: [
            { key: PERMISSIONS.VIEW_AIRCRAFT_MODULE, label: 'Ver módulo de aeronaves', description: 'Permite acceder al módulo de aeronaves' },
            { key: PERMISSIONS.CREATE_AIRCRAFT, label: 'Crear aeronaves', description: 'Permite crear nuevas aeronaves en el sistema' },
            { key: PERMISSIONS.DELETE_AIRCRAFT, label: 'Eliminar aeronaves', description: 'Permite eliminar aeronaves del sistema' },
            { key: PERMISSIONS.MANAGE_AIRCRAFT_BASIC, label: 'Modificar información básica', description: 'Matrícula, fabricante, modelo, número de serie' },
            { key: PERMISSIONS.MANAGE_DEBT, label: 'Modificar estatus de deuda', description: 'Cambiar entre pagado/pendiente' },
            { key: PERMISSIONS.MANAGE_INSURANCE, label: 'Modificar seguro', description: 'Actualizar póliza y fecha de vencimiento' },
            { key: PERMISSIONS.MANAGE_AIRWORTHINESS, label: 'Modificar certificado de aeronavegabilidad', description: 'Actualizar certificado y fecha de vencimiento' },
            { key: PERMISSIONS.MANAGE_RADIO, label: 'Modificar certificado de radio', description: 'Actualizar certificado de estación de radio y fecha' }
        ]
    },
    pilots: {
        label: 'Pilotos',
        icon: '👨‍✈️',
        permissions: [
            { key: PERMISSIONS.VIEW_PILOTS_MODULE, label: 'Ver módulo de pilotos', description: 'Permite acceder al módulo de pilotos' },
            { key: PERMISSIONS.CREATE_PILOT, label: 'Crear pilotos', description: 'Permite agregar nuevos pilotos al sistema' },
            { key: PERMISSIONS.DELETE_PILOT, label: 'Eliminar pilotos', description: 'Permite eliminar pilotos del sistema' },
            { key: PERMISSIONS.MANAGE_PILOT_BASIC, label: 'Modificar información básica', description: 'Nombre, identificación, email, teléfono' },
            { key: PERMISSIONS.MANAGE_PILOT_LICENSE, label: 'Modificar licencia', description: 'Actualizar licencia, tipo y fecha de vencimiento' },
            { key: PERMISSIONS.MANAGE_PILOT_MEDICAL, label: 'Modificar certificado médico', description: 'Actualizar certificado médico y fecha' }
        ]
    },
    system: {
        label: 'Sistema',
        icon: '⚙️',
        permissions: [
            { key: PERMISSIONS.VIEW_ALL, label: 'Ver toda la información', description: 'Acceso de lectura a todo el sistema' },
            { key: PERMISSIONS.MANAGE_USERS, label: 'Gestionar usuarios y permisos', description: 'Crear, editar y eliminar usuarios' }
        ]
    }
};

// Permisos de admin (todos)
const ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

// Permisos de viewer (solo lectura)
const VIEWER_PERMISSIONS = [PERMISSIONS.VIEW_ALL];
