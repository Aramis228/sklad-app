// Глобальные переменные для хранения данных
let categories = JSON.parse(localStorage.getItem('categories')) || [];
let products = JSON.parse(localStorage.getItem('products')) || [];
let clients = JSON.parse(localStorage.getItem('clients')) || [];
let invoices = JSON.parse(localStorage.getItem('invoices')) || [];
let archivedInvoices = JSON.parse(localStorage.getItem('archivedInvoices')) || [];
let debts = JSON.parse(localStorage.getItem('debts')) || [];
let movements = JSON.parse(localStorage.getItem('movements')) || [];
let reports = JSON.parse(localStorage.getItem('reports')) || [];
let personalPrices = JSON.parse(localStorage.getItem('personalPrices')) || [];
let shiftSessions = JSON.parse(localStorage.getItem('shiftSessions')) || [];
let activityLog = JSON.parse(localStorage.getItem('activityLog')) || [];
let debtPayments = JSON.parse(localStorage.getItem('debtPayments')) || [];
let moneyTransactions = JSON.parse(localStorage.getItem('moneyTransactions')) || [];
let incomingReceipts = JSON.parse(localStorage.getItem('incomingReceipts')) || [];
let archivedIncomingReceipts = JSON.parse(localStorage.getItem('archivedIncomingReceipts')) || [];
let initialStockEntries = JSON.parse(localStorage.getItem('initialStockEntries')) || [];
let supplierReturns = JSON.parse(localStorage.getItem('supplierReturns')) || [];
let packageProductions = JSON.parse(localStorage.getItem('packageProductions')) || [];
let openedStockEvents = JSON.parse(localStorage.getItem('openedStockEvents')) || [];
let cloudPresence = JSON.parse(localStorage.getItem('cloudPresence') || '{}') || {};
let securitySettings = JSON.parse(localStorage.getItem('securitySettings')) || { managerPinHash: '', sellerPinHash: '' };
let sessionAccess = JSON.parse(localStorage.getItem('sessionAccess')) || { currentRole: '', isAuthenticated: false, userName: '', sellerSimpleMode: true };
let shiftHistoryPage = 1;
let moneyHistoryPage = 1;
let auditLogPage = 1;
let movementsPage = 1;

const SHIFT_START_CASH = 7000;
const SELLER_ALLOWED_TABS = ['clients', 'warehouse', 'shift', 'incoming', 'invoices', 'debts', 'reports', 'backup'];
const SELLER_EDIT_WINDOW_MINUTES = 15;
const LOCAL_ONLY_KEYS = new Set(['securitySettings', 'sessionAccess', 'cloudSyncConfig']);
const FULL_EXPORT_SCHEMA_VERSION = 3;
const FULL_EXPORT_TYPE = 'warehouse-full-snapshot';
const INDEXED_DB_NAME = 'warehouse-offline-db';
const INDEXED_DB_VERSION = 1;
const INDEXED_DB_STORE = 'appState';
const APP_STATE_FIELDS = [
    'categories',
    'products',
    'clients',
    'invoices',
    'archivedInvoices',
    'debts',
    'movements',
    'reports',
    'personalPrices',
    'shiftSessions',
    'debtPayments',
    'moneyTransactions',
    'activityLog',
    'incomingReceipts',
    'archivedIncomingReceipts',
    'initialStockEntries',
    'supplierReturns',
    'packageProductions',
    'openedStockEvents'
];
const EXTRA_STORAGE_FIELDS = [
    'archivedDebts',
    'earningsMargins',
    'roastCostSettings',
    'tobaccoCostSettings',
    'shiftCashSettings',
    'cashControlSettings',
    'backupHistory',
    'debts_backup',
    'cloudSyncConfig',
    'securitySettings',
    'certificateDebtSettings'
];
const INDEXED_DB_STORAGE_KEYS = new Set(APP_STATE_FIELDS);
const TOBACCO_PACK_SIZE = 10;
const MONEY_WALLETS = [
    { id: 'worker_cash', label: 'Касса работника', icon: 'cash-register' },
    { id: 'sasha_cash', label: 'У Сашика', icon: 'hand-holding-dollar' },
    { id: 'bank', label: 'Карта / банк', icon: 'credit-card' },
    { id: 'owner_cash', label: 'У меня', icon: 'user-tie' },
    { id: 'other_cash', label: 'Другое место', icon: 'wallet' }
];
const MONEY_CONTROL_EXCLUDED_WALLET_IDS = new Set(['owner_cash']);
const DEFAULT_MONEY_WALLET_ID = 'sasha_cash';
const DEFAULT_SHIFT_CASH_TO_LEAVE = 5000;
const MONEY_EXPENSE_CATEGORIES = [
    'Пополнение',
    'Перемещение',
    'Оплата поставщику',
    'Зарплата',
    'Аренда',
    'Расходники',
    'Доставка',
    'Личное снятие',
    'Другое'
];
const DEFAULT_SUPABASE_PROJECT_URL = 'https://zrbwkgjbparbeddpaymc.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_O9rA0lWG2r2MZqhCnnRzfA_e3vuvEGd';
const DEFAULT_SUPABASE_SYNC_TABLE = 'warehouse_sync_state';
const CLOUD_SYNC_CONFIG_BACKUP_KEY = 'warehouseCloudSyncConfigBackup';
const CLOUD_SYNC_META_KEY = 'warehouseCloudSyncMeta';
const CLOUD_DEVICE_ID_KEY = 'warehouseCloudDeviceId';
const CLOUD_SYNC_POLL_INTERVAL_MS = 2500;
const CLOUD_SYNC_PUSH_DEBOUNCE_MS = 250;
const CLOUD_PRESENCE_INTERVAL_MS = 30000;
const CLOUD_PRESENCE_ONLINE_TTL_MS = 90000;
const MOVEMENTS_PAGE_SIZE = 40;
const DEFAULT_CLOUD_SYNC_CONFIG = {
    enabled: false,
    provider: 'supabase',
    supabase: {
        url: DEFAULT_SUPABASE_PROJECT_URL,
        publishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
        tableName: DEFAULT_SUPABASE_SYNC_TABLE,
        workspaceId: 'main',
        syncKey: '',
        syncKeyHash: ''
    },
    firebaseConfig: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    },
    collectionName: 'warehouse_state',
    documentId: 'main'
};

let cloudSyncState = {
    ready: false,
    syncing: false,
    initializing: false,
    pulling: false,
    presenceSyncing: false,
    pendingTimer: null,
    pollTimer: null,
    presenceTimer: null,
    db: null,
    docRef: null,
    client: null,
    unsubscribe: null,
    applyingRemote: false,
    lastRemoteUpdatedAt: '',
    lastAppliedRemoteUpdatedAt: '',
    lastDataUpdatedAt: '',
    lastError: ''
};

const TOBACCO_TYPE_CONFIGS = [
    { type: '10-0', label: '10/0', good: 10, defect: 0, description: 'все хорошие' },
    { type: '8-2', label: '8/2', good: 8, defect: 2, description: '8 хороших, 2 брака' },
    { type: '7-3', label: '7/3', good: 7, defect: 3, description: '7 хороших, 3 брака' },
    { type: '6-4', label: '6/4', good: 6, defect: 4, description: '6 хороших, 4 брака' }
];

const ROAST_TYPE_CONFIGS = [
    { type: '5-0', label: '5/0', good: 5, defect: 0, description: 'все хорошие', packField: 'packs50', kgField: 'kg50', countColor: '#10b981', textColor: '#059669' },
    { type: '4-1', label: '4/1', good: 4, defect: 1, description: '4 хороших, 1 брак', packField: 'packs41', kgField: 'kg41', countColor: '#f59e0b', textColor: '#92400e' },
    { type: '3-2', label: '3/2', good: 3, defect: 2, description: '3 хороших, 2 брака', packField: 'packs32', kgField: 'kg32', countColor: '#ef4444', textColor: '#991b1b' },
    { type: '2-3', label: '2/3', good: 2, defect: 3, description: '2 хороших, 3 брака', packField: 'packs23', kgField: 'kg23', countColor: '#8b5cf6', textColor: '#6d28d9' }
];

const TOBACCO_TYPE_CONFIG_MAP = Object.fromEntries(TOBACCO_TYPE_CONFIGS.map(config => [config.type, config]));
const ROAST_TYPE_CONFIG_MAP = Object.fromEntries(ROAST_TYPE_CONFIGS.map(config => [config.type, config]));

const INCOMING_RAW_FIELDS = [
    { key: 'goodQty', label: 'Табак' },
    { key: 'bigDefectQty', label: 'Большой брак' },
    { key: 'smallDefectQty', label: 'Маленький брак' }
];

const INCOMING_RECEIPT_ITEM_CONFIGS = [
    {
        key: 'tobacco',
        label: 'Табак',
        icon: 'fas fa-leaf',
        pricingSource: 'tobacco-good',
        pricingUnit: 'pieces',
        allowKgInput: false,
        aliases: ['табак']
    },
    {
        key: 'smallDefect',
        label: 'Маленький брак',
        icon: 'fas fa-seedling',
        pricingSource: 'tobacco-defect',
        pricingUnit: 'pieces',
        allowKgInput: false,
        aliases: ['маленький брак', 'малый брак']
    },
    {
        key: 'roast',
        label: 'Жарка',
        icon: 'fas fa-fire',
        pricingSource: 'roast-good',
        pricingUnit: 'kg',
        allowKgInput: true,
        aliases: ['жарка']
    },
    {
        key: 'bigDefect',
        label: 'Большой брак',
        icon: 'fas fa-triangle-exclamation',
        pricingSource: 'roast-defect',
        pricingUnit: 'kg',
        allowKgInput: true,
        aliases: ['большой брак']
    },
    {
        key: 'soup',
        label: 'Суповой',
        icon: 'fas fa-drumstick-bite',
        pricingSource: 'product',
        pricingUnit: 'product-unit',
        allowKgInput: true,
        aliases: ['суповой', 'суповый', 'суп']
    },
    {
        key: 'offal',
        label: 'Потраха',
        icon: 'fas fa-bone',
        pricingSource: 'product',
        pricingUnit: 'product-unit',
        allowKgInput: true,
        aliases: ['потраха', 'потроха', 'потрах', 'потрох']
    }
];

const INCOMING_RECEIPT_ITEM_CONFIG_MAP = Object.fromEntries(
    INCOMING_RECEIPT_ITEM_CONFIGS.map(config => [config.key, config])
);
const INCOMING_PRODUCT_ITEM_KEY_PREFIX = 'product:';

const INCOMING_TOBACCO_MIXED_TYPES = ['7-3', '8-2'];
const AUTO_TOBACCO_MIXED_TYPE = '7-3';
const AUTO_TOBACCO_PURE_TYPE = '10-0';
const AUTO_ROAST_MIXED_TYPE = '3-2';
const AUTO_ROAST_PURE_TYPE = '5-0';

function getTobaccoTypeConfig(type) {
    return TOBACCO_TYPE_CONFIG_MAP[type] || null;
}

function getRoastTypeConfig(type) {
    return ROAST_TYPE_CONFIG_MAP[type] || null;
}

function getTobaccoTypeLabel(type) {
    const config = getTobaccoTypeConfig(type);
    return config ? config.label : (type || '');
}

function getTobaccoTypeSummary(type) {
    const config = getTobaccoTypeConfig(type);
    if (!config) return type || '';
    return `${config.label} (${config.description})`;
}

function getTobaccoTypeAnnotation(type) {
    const config = getTobaccoTypeConfig(type);
    if (!config) return type || '';
    return `${config.label} - ${config.description}`;
}

function getRoastTypeLabel(type) {
    if (type === 'mixed') return 'мешаный';
    if (type === 'pure') return 'не мешаный';
    const config = getRoastTypeConfig(type);
    return config ? config.label : (type || '');
}

function getRoastTypeSummary(type) {
    if (type === 'mixed') return 'мешаный';
    if (type === 'pure') return 'не мешаный';
    const config = getRoastTypeConfig(type);
    if (!config) return type || '';
    return `${config.label} (${config.description})`;
}

function getProductCategoryName(product = {}) {
    if (!product) return '';
    if (product.category) return product.category;
    const category = categories.find(item => String(item.id) === String(product.categoryId));
    return category?.name || '';
}

function getProductLookupText(product = {}) {
    return normalizeIncomingLookupName([
        product?.name || '',
        product?.category || '',
        getProductCategoryName(product)
    ].join(' '));
}

function isTobaccoProduct(product) {
    if (!product) return false;
    const lookupText = getProductLookupText(product);
    return lookupText.includes('табак') || lookupText.includes('tobacco');
}

function isRoastProduct(product) {
    if (!product) return false;
    const lookupText = getProductLookupText(product);
    return lookupText.includes('жарка') || lookupText.includes('обжар') || lookupText.includes('roast');
}

function renderTobaccoTypeInputs(selectedType = null) {
    const packCounts = selectedType && typeof selectedType === 'object' && !Array.isArray(selectedType)
        ? selectedType
        : null;
    const rows = packCounts
        ? TOBACCO_TYPE_CONFIGS
            .filter(config => (Number(packCounts[config.type]) || 0) > 0)
            .map(config => ({ type: config.type, count: packCounts[config.type] }))
        : [{ type: selectedType || AUTO_TOBACCO_PURE_TYPE, count: selectedType ? 1 : '' }];

    return renderPackageTypePickerList('tobacco', rows);
}

function renderRoastTypeInputs(roast = {}) {
    const orderedConfigs = Array.isArray(roast?._typeOrder) && roast._typeOrder.length
        ? [
            ...roast._typeOrder
                .map(type => ROAST_TYPE_CONFIGS.find(config => config.type === type))
                .filter(Boolean),
            ...ROAST_TYPE_CONFIGS.filter(config => !roast._typeOrder.includes(config.type))
        ]
        : ROAST_TYPE_CONFIGS;
    const rows = orderedConfigs
        .filter(config => (Number(roast?.[config.packField]) || 0) > 0)
        .map(config => ({ type: config.type, count: roast[config.packField] }));

    return renderPackageTypePickerList('roast', rows.length ? rows : [{ type: AUTO_ROAST_PURE_TYPE, count: '' }]);
}

function renderPackageTypePickerList(kind, rows = []) {
    const safeKind = kind === 'roast' ? 'roast' : 'tobacco';
    const safeRows = rows.length ? rows : [{ type: safeKind === 'roast' ? AUTO_ROAST_PURE_TYPE : AUTO_TOBACCO_PURE_TYPE, count: '' }];

    return `
        <div class="package-type-picker-list" data-package-kind="${safeKind}">
            ${safeRows.map(row => renderPackageTypePicker(safeKind, row.type, row.count)).join('')}
        </div>
        <button type="button" class="btn btn-secondary btn-sm package-type-add" onclick="addPackageTypePicker(this)">
            <i class="fas fa-plus"></i> тип
        </button>
    `;
}

function renderPackageTypePicker(kind, selectedType = '', count = '') {
    const safeKind = kind === 'roast' ? 'roast' : 'tobacco';
    const typeConfigs = safeKind === 'roast' ? ROAST_TYPE_CONFIGS : TOBACCO_TYPE_CONFIGS;
    const defaultType = selectedType || (safeKind === 'roast' ? AUTO_ROAST_PURE_TYPE : AUTO_TOBACCO_PURE_TYPE);
    const inputClass = safeKind === 'roast' ? 'roast-pack-input' : 'tobacco-pack-count';
    const dataAttr = safeKind === 'roast' ? 'data-roast' : 'data-tobacco-type';

    return `
        <div class="package-type-picker" data-package-kind="${safeKind}">
            <label class="package-type-select-field">
                <span>Тип</span>
                <select class="form-control package-type-select" onchange="handlePackageTypePickerChange(this)">
                    ${typeConfigs.map(config => `
                        <option value="${config.type}" ${config.type === defaultType ? 'selected' : ''}>${config.label}</option>
                    `).join('')}
                </select>
            </label>
            <label class="package-type-count-field">
                <span>Пак.</span>
                <input type="number" min="0" step="1" class="form-control ${inputClass} package-type-count" ${dataAttr}="${defaultType}" value="${count || ''}" placeholder="0" oninput="handlePackageTypePickerInput(this)">
            </label>
            <button type="button" class="btn btn-danger btn-sm package-type-remove" onclick="removePackageTypePicker(this)" title="Убрать тип">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

function renderPackageSaleModeControls(kind, selectedMode = 'whole', selectedType = '') {
    const safeKind = kind === 'roast' ? 'roast' : 'tobacco';
    const typeConfigs = safeKind === 'roast' ? ROAST_TYPE_CONFIGS : TOBACCO_TYPE_CONFIGS;
    const defaultType = selectedType || (safeKind === 'roast' ? AUTO_ROAST_PURE_TYPE : AUTO_TOBACCO_PURE_TYPE);

    return `
        <div class="package-sale-mode-controls" data-package-kind="${safeKind}" style="display: none;">
            <label class="invoice-quantity-field package-sale-mode-field">
                <span>Продажа</span>
                <select class="form-control package-sale-mode-select" onchange="updatePackageSaleModeForRow(this.closest('.invoice-item-row'))">
                    <option value="whole" ${selectedMode !== 'partial' && selectedMode !== 'mixed' ? 'selected' : ''}>Целый пакет</option>
                    <option value="partial" ${selectedMode === 'partial' ? 'selected' : ''}>Не целый пакет</option>
                    <option value="mixed" ${selectedMode === 'mixed' ? 'selected' : ''}>Целые + открытый</option>
                </select>
            </label>
            <label class="invoice-quantity-field partial-package-type-field" style="display: none;">
                <span>Тип</span>
                <select class="form-control partial-package-type-select" onchange="updatePackageSaleModeForRow(this.closest('.invoice-item-row'))">
                    ${typeConfigs.map(config => `
                        <option value="${config.type}" ${config.type === defaultType ? 'selected' : ''}>${config.label}</option>
                    `).join('')}
                </select>
            </label>
            <label class="invoice-quantity-field partial-package-pieces-field" style="display: none;">
                <span>Откр. шт</span>
                <input type="number" min="1" step="1" class="form-control partial-package-pieces-input" placeholder="авто" oninput="updatePackageSaleModeForRow(this.closest('.invoice-item-row'))">
            </label>
        </div>
    `;
}

function renderSimplePackageSaleModeControls(selectedMode = 'whole') {
    return `
        <div class="package-sale-mode-controls simple-package-sale-mode-controls" data-package-kind="simple" style="display: none;">
            <label class="invoice-quantity-field package-sale-mode-field">
                <span>Продажа</span>
                <select class="form-control package-sale-mode-select" onchange="updatePackageSaleModeForRow(this.closest('.invoice-item-row'))">
                    <option value="whole" ${selectedMode !== 'partial' && selectedMode !== 'mixed' ? 'selected' : ''}>Целый пакет</option>
                    <option value="partial" ${selectedMode === 'partial' ? 'selected' : ''}>Не целый пакет</option>
                    <option value="mixed" ${selectedMode === 'mixed' ? 'selected' : ''}>Целые + открытый</option>
                </select>
            </label>
        </div>
    `;
}

function updatePackageSaleModeForRow(row) {
    if (!row) return;

    const packageControls = getActivePackageSaleControls(row);
    const mode = packageControls?.querySelector('.package-sale-mode-select')?.value || 'whole';
    const partialTypeField = packageControls?.querySelector('.partial-package-type-field');
    const partialPiecesField = packageControls?.querySelector('.partial-package-pieces-field');
    const tobaccoSelection = row.querySelector('.tobacco-type-selection');
    const roastSelection = row.querySelector('.roast-type-selection');
    const kind = packageControls?.dataset.packageKind || '';
    const partialTypeLabel = partialTypeField?.querySelector('span');
    const partialPiecesLabel = partialPiecesField?.querySelector('span');
    const typeSelection = kind === 'roast' ? roastSelection : tobaccoSelection;
    const typeSelectionLabel = typeSelection?.querySelector('label');

    if (partialTypeField) {
        partialTypeField.style.display = mode === 'partial' || mode === 'mixed' ? '' : 'none';
    }
    if (partialPiecesField) {
        partialPiecesField.style.display = mode === 'mixed' ? '' : 'none';
    }
    if (partialTypeLabel) {
        partialTypeLabel.textContent = mode === 'mixed' ? 'Откр. тип' : 'Тип';
    }
    if (partialPiecesLabel) {
        partialPiecesLabel.textContent = 'Откр. шт';
    }
    if (typeSelectionLabel) {
        typeSelectionLabel.textContent = mode === 'mixed' ? 'Закрытые пакеты' : 'Пакеты';
    }

    if (tobaccoSelection && kind === 'tobacco') {
        tobaccoSelection.style.display = mode === 'whole' || mode === 'mixed' ? 'flex' : 'none';
    }

    if (roastSelection && kind === 'roast') {
        roastSelection.style.display = mode === 'whole' || mode === 'mixed' ? 'flex' : 'none';
    }

    if (kind !== 'simple') {
        syncMixedSaleQuantities(row);
    }

    const itemId = row.getAttribute('data-item-id');
    if (itemId) {
        updateItemTotal(itemId);
        if (document.getElementById('edit-invoice-items-list')?.contains(row)) {
            updateEditItemTotal(itemId);
        }
    }
}

function getPackageSaleModeFromRow(row) {
    const value = getActivePackageSaleControls(row)?.querySelector('.package-sale-mode-select')?.value || 'whole';
    return ['partial', 'mixed'].includes(value) ? value : 'whole';
}

function getPartialPackageTypeFromRow(row, fallbackType) {
    return getActivePackageSaleControls(row)?.querySelector('.partial-package-type-select')?.value || fallbackType;
}

function getMixedPackageOpenPiecesFromRow(row) {
    const input = getActivePackageSaleControls(row)?.querySelector('.partial-package-pieces-input');
    const value = parseFloat(input?.value || '0');
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getMixedPackageCalculatedOpenPieces(row, kind) {
    const safeKind = kind === 'roast' ? 'roast' : 'tobacco';
    const fullPieces = safeKind === 'roast'
        ? getFullPackagePiecesFromPackValues('roast', getRoastPackValuesFromRow(row))
        : getFullPackagePiecesFromPackValues('tobacco', getTobaccoPackValuesFromRow(row));
    const totalPieces = safeKind === 'roast'
        ? getKgItemCountFromRow(row)
        : (parseFloat(row?.querySelector('.quantity-input')?.value || '0') || 0);
    const manualOpenPieces = getMixedPackageOpenPiecesFromRow(row);

    if (fullPieces > 0 && totalPieces > fullPieces) {
        return Math.max(0, totalPieces - fullPieces);
    }

    return manualOpenPieces;
}

function getActivePackageSaleControls(row) {
    const controls = Array.from(row?.querySelectorAll('.package-sale-mode-controls') || []);
    return controls.find(control => control.style.display !== 'none') || controls[0] || null;
}

function handlePackageTypePickerChange(select) {
    const picker = select?.closest('.package-type-picker');
    if (!picker) return;

    const kind = picker.dataset.packageKind === 'roast' ? 'roast' : 'tobacco';
    const input = picker.querySelector('.package-type-count');
    if (input) {
        if (kind === 'roast') {
            input.dataset.roast = select.value;
        } else {
            input.dataset.tobaccoType = select.value;
        }
    }

    handlePackageTypePickerInput(input || select);
}

function handlePackageTypePickerInput(element) {
    const row = element?.closest('.invoice-item-row');
    const itemId = row?.getAttribute('data-item-id');
    if (!row || !itemId) return;

    syncMixedSaleQuantities(row);

    if (document.getElementById('edit-invoice-items-list')?.contains(row)) {
        distributeEditRoastWeight(row);
        updateEditItemTotal(itemId);
        return;
    }

    distributeRoastWeight(row);
    updateItemTotal(itemId);
}

function addPackageTypePicker(button) {
    const selection = button?.closest('.tobacco-type-selection, .roast-type-selection');
    const list = selection?.querySelector('.package-type-picker-list');
    if (!list) return;

    const kind = list.dataset.packageKind === 'roast' ? 'roast' : 'tobacco';
    list.insertAdjacentHTML('beforeend', renderPackageTypePicker(kind));
    handlePackageTypePickerInput(list.lastElementChild?.querySelector('.package-type-count'));
}

function removePackageTypePicker(button) {
    const picker = button?.closest('.package-type-picker');
    const list = picker?.closest('.package-type-picker-list');
    if (!picker || !list) return;

    if (list.querySelectorAll('.package-type-picker').length <= 1) {
        const input = picker.querySelector('.package-type-count');
        if (input) input.value = '';
        handlePackageTypePickerInput(input);
        return;
    }

    const row = picker.closest('.invoice-item-row');
    picker.remove();
    handlePackageTypePickerInput(row);
}

function getRoastParts(roast) {
    if (!roast) return [];

    return ROAST_TYPE_CONFIGS.map(config => ({
        ...config,
        packs: parseInt(roast[config.packField] || 0, 10) || 0,
        kg: Number(roast[config.kgField]) || 0
    })).filter(part => part.packs > 0 || part.kg > 0);
}

function getRoastPackValuesFromRow(row) {
    const values = Object.fromEntries(ROAST_TYPE_CONFIGS.map(config => [config.type, 0]));
    row.querySelectorAll('.roast-pack-input[data-roast]').forEach(input => {
        const type = input.dataset.roast;
        if (!values.hasOwnProperty(type)) return;
        values[type] += parseInt(input.value || '0', 10) || 0;
    });
    return values;
}

function getTobaccoPackValuesFromRow(row) {
    const values = Object.fromEntries(TOBACCO_TYPE_CONFIGS.map(config => [config.type, 0]));
    row.querySelectorAll('.tobacco-pack-count[data-tobacco-type]').forEach(input => {
        const type = input.dataset.tobaccoType;
        if (!values.hasOwnProperty(type)) return;
        values[type] += parseInt(input.value || '0', 10) || 0;
    });
    return values;
}

function getTotalTobaccoPackCount(packValues) {
    return Object.values(packValues || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function getFullPackagePiecesFromPackValues(kind, packValues = {}) {
    const configs = kind === 'roast' ? ROAST_TYPE_CONFIGS : TOBACCO_TYPE_CONFIGS;
    return configs.reduce((sum, config) => {
        const packSize = (Number(config.good) || 0) + (Number(config.defect) || 0);
        return sum + ((Number(packValues[config.type]) || 0) * packSize);
    }, 0);
}

function createPackageTypeUsageTracker() {
    return {};
}

function getPackageTypeUsageKey(kind, type) {
    return `${kind}:${type || ''}`;
}

function getPackageTypeUsage(usage, kind, type) {
    const key = getPackageTypeUsageKey(kind, type);
    if (!usage[key]) {
        usage[key] = {
            closedPacks: 0,
            openedPieces: 0
        };
    }
    return usage[key];
}

function getInvoicePackageTypeCredit(invoice, kind, type) {
    return (invoice?.items || []).reduce((credit, item) => {
        const isMatchingKind = kind === 'roast' ? isRoastInvoiceItem(item) : isTobaccoInvoiceItem(item);
        if (!isMatchingKind) return credit;

        const parts = kind === 'roast' ? getRoastSalePartsFromItem(item) : getTobaccoSalePartsFromItem(item);
        parts
            .filter(part => part.type === type)
            .forEach(part => {
                const packCount = Math.max(0, Number(part.packCount) || 0);
                const pieces = Math.max(0, Number(part.pieces) || 0);
                if (packCount > 0 && part.mode !== 'partial') {
                    credit.closedPacks += packCount;
                } else {
                    credit.openedPieces += pieces;
                }
            });

        return credit;
    }, { closedPacks: 0, openedPieces: 0 });
}

function getPackageTypeAvailability(kind, type, options = {}) {
    const safeKind = kind === 'roast' ? 'roast' : 'tobacco';
    const state = calculateIncomingInventoryState(options.dateKey || getTodayDateKey());
    const categoryState = safeKind === 'roast' ? state.categories?.roast : state.categories?.tobacco;
    const packSize = getPackSizeByKind(safeKind, type);
    const openedType = safeKind === 'tobacco' ? AUTO_TOBACCO_PURE_TYPE : type;
    const baseClosedPacks = Math.max(0, Number(categoryState?.finishedRemaining?.byType?.[type]) || 0);
    const baseOpenedPieces = openedType === type
        ? Math.max(0, Number(categoryState?.openedRemaining?.byType?.[type]) || 0)
        : 0;
    const invoiceCredit = getInvoicePackageTypeCredit(options.existingInvoice, safeKind, type);

    return {
        closedPacks: baseClosedPacks + invoiceCredit.closedPacks,
        openedPieces: baseOpenedPieces + invoiceCredit.openedPieces,
        packSize
    };
}

function reservePackageTypeUsage(usage, kind, type, reservation) {
    const used = getPackageTypeUsage(usage, kind, type);
    used.closedPacks += Math.max(0, Number(reservation.closedPacks) || 0);
    used.openedPieces += Math.max(0, Number(reservation.openedPieces) || 0);
}

function validateAndReservePackageTypeStock(kind, type, request, product, usage, options = {}) {
    const safeKind = kind === 'roast' ? 'roast' : 'tobacco';
    const typeLabel = safeKind === 'roast' ? getRoastTypeLabel(type) : getTobaccoTypeLabel(type);
    const packSize = getPackSizeByKind(safeKind, type);
    const requestedPacks = Math.max(0, Number(request.packCount) || 0);
    const requestedPieces = Math.max(0, Number(request.pieces) || 0);
    const availability = getPackageTypeAvailability(safeKind, type, options);
    const used = getPackageTypeUsage(usage, safeKind, type);
    const usedPartialPieces = Math.max(0, Number(used.openedPieces) || 0);
    const partialPiecesFromClosedPacks = Math.max(0, usedPartialPieces - availability.openedPieces);
    const closedPacksUsedByPartialSales = partialPiecesFromClosedPacks > 0 && packSize > 0
        ? Math.ceil(partialPiecesFromClosedPacks / packSize)
        : 0;
    const availableClosedPacks = Math.max(0, availability.closedPacks - used.closedPacks - closedPacksUsedByPartialSales);
    const remainingOpenedPieceCapacity = Math.max(
        0,
        availability.openedPieces + (closedPacksUsedByPartialSales * packSize) - usedPartialPieces
    );

    if (requestedPacks > 0) {
        if (requestedPacks > availableClosedPacks + 0.0001) {
            alert(`Недостаточно пакетов типа "${typeLabel}" для товара "${product.name}". Доступно: ${formatQuantity(availableClosedPacks, 'шт')} пак.`);
            return false;
        }
        reservePackageTypeUsage(usage, safeKind, type, {
            closedPacks: requestedPacks,
            openedPieces: 0
        });
        return true;
    }

    if (requestedPieces > 0) {
        const availablePieces = remainingOpenedPieceCapacity + (availableClosedPacks * packSize);

        if (requestedPieces > availablePieces + 0.0001) {
            alert(`Недостаточно остатков типа "${typeLabel}" для товара "${product.name}". Доступно: ${formatQuantity(availablePieces, 'шт')} шт`);
            return false;
        }

        reservePackageTypeUsage(usage, safeKind, type, {
            closedPacks: 0,
            openedPieces: requestedPieces
        });
    }

    return true;
}

function validateInvoiceRowPackageTypeStock(row, product, usage, options = {}) {
    if (!row || !product) return true;

    const isTobacco = isTobaccoProduct(product);
    const isRoast = isRoastProduct(product);
    if (!isTobacco && !isRoast) return true;

    const kind = isRoast ? 'roast' : 'tobacco';
    const mode = getPackageSaleModeFromRow(row);
    const packValues = isRoast ? getRoastPackValuesFromRow(row) : getTobaccoPackValuesFromRow(row);
    const quantityPieces = isRoast
        ? getKgItemCountFromRow(row)
        : (parseFloat(row.querySelector('.quantity-input')?.value || '0') || 0);

    if (mode === 'partial') {
        const type = getPartialPackageTypeFromRow(row, isRoast ? AUTO_ROAST_PURE_TYPE : AUTO_TOBACCO_PURE_TYPE);
        return validateAndReservePackageTypeStock(kind, type, { pieces: quantityPieces }, product, usage, options);
    }

    for (const [type, count] of Object.entries(packValues)) {
        const packCount = Math.max(0, Number(count) || 0);
        if (packCount <= 0) continue;
        if (!validateAndReservePackageTypeStock(kind, type, { packCount }, product, usage, options)) {
            return false;
        }
    }

    if (mode === 'mixed') {
        const openPieces = getMixedPackageCalculatedOpenPieces(row, kind);
        if (openPieces > 0) {
            const openType = getPartialPackageTypeFromRow(row, isRoast ? AUTO_ROAST_PURE_TYPE : AUTO_TOBACCO_PURE_TYPE);
            return validateAndReservePackageTypeStock(kind, openType, { pieces: openPieces }, product, usage, options);
        }
    }

    return true;
}

function syncMixedSaleQuantities(row) {
    if (!row || getPackageSaleModeFromRow(row) !== 'mixed') return;

    const packageControls = getActivePackageSaleControls(row);
    const kind = packageControls?.dataset.packageKind || '';
    if (kind === 'simple') return;
    const openPiecesInput = packageControls?.querySelector('.partial-package-pieces-input');
    const fullPieces = kind === 'roast'
        ? getFullPackagePiecesFromPackValues('roast', getRoastPackValuesFromRow(row))
        : getFullPackagePiecesFromPackValues('tobacco', getTobaccoPackValuesFromRow(row));
    const totalPieces = kind === 'roast'
        ? getKgItemCountFromRow(row)
        : (parseFloat(row.querySelector('.quantity-input')?.value || '0') || 0);

    if (!openPiecesInput) return;

    if (fullPieces > 0 && totalPieces > fullPieces) {
        openPiecesInput.value = String(Math.max(0, totalPieces - fullPieces));
        return;
    }

    if (fullPieces <= 0 || totalPieces <= fullPieces) {
        openPiecesInput.value = '';
    }
}

function validateMixedOpenPackage(row, kind, product) {
    const openPieces = getMixedPackageCalculatedOpenPieces(row, kind);
    const openType = getPartialPackageTypeFromRow(row, kind === 'roast' ? AUTO_ROAST_PURE_TYPE : AUTO_TOBACCO_PURE_TYPE);
    const packSize = getPackSizeByKind(kind, openType);

    if (!(openPieces > 0)) {
        alert(`Для товара "${product.name}" общее количество должно быть больше, чем закрытые пакеты. Тогда программа сама посчитает открытый пакет.`);
        return false;
    }

    if (openPieces >= packSize) {
        alert(`Открытый пакет ${kind === 'roast' ? getRoastTypeLabel(openType) : getTobaccoTypeLabel(openType)} должен быть меньше ${packSize} шт. Полный пакет укажите в блоке пакетов.`);
        return false;
    }

    return true;
}

function buildMixedTobaccoInvoiceItems(row, product, productId, actualPrice, unit) {
    const packValues = getTobaccoPackValuesFromRow(row);
    const fullPieces = getFullPackagePiecesFromPackValues('tobacco', packValues);

    if (!(fullPieces > 0)) {
        alert(`Для товара "${product.name}" укажите хотя бы один целый пакет`);
        return null;
    }

    if (!validateMixedOpenPackage(row, 'tobacco', product)) return null;

    const openPieces = getMixedPackageCalculatedOpenPieces(row, 'tobacco');
    const openType = getPartialPackageTypeFromRow(row, AUTO_TOBACCO_PURE_TYPE);

    const builtItems = [];
    TOBACCO_TYPE_CONFIGS.forEach(config => {
        const packs = Number(packValues[config.type]) || 0;
        if (!(packs > 0)) return;
        const quantity = packs * getPackSizeByKind('tobacco', config.type);
        builtItems.push({
            productId,
            productName: product.name,
            quantity,
            price: actualPrice,
            standardPrice: product.salePrice,
            total: actualPrice * quantity,
            unit,
            packageSaleMode: 'whole',
            tobaccoType: config.type,
            tobaccoPackCount: packs
        });
    });

    builtItems.push({
        productId,
        productName: product.name,
        quantity: openPieces,
        price: actualPrice,
        standardPrice: product.salePrice,
        total: actualPrice * openPieces,
        unit,
        packageSaleMode: 'partial',
        tobaccoType: openType,
        tobaccoPackCount: 0
    });

    return builtItems;
}

function buildMixedRoastInvoiceItems(row, product, productId, actualPrice, unit) {
    const packValues = getRoastPackValuesFromRow(row);
    const fullPieces = getFullPackagePiecesFromPackValues('roast', packValues);
    const totalKg = parseFloat(row.querySelector('.quantity-input')?.value || '0') || 0;

    if (!(fullPieces > 0)) {
        alert(`Для товара "${product.name}" укажите хотя бы один целый пакет`);
        return null;
    }
    if (!(totalKg > 0)) {
        alert(`Для товара "${product.name}" укажите общий вес в кг`);
        return null;
    }

    if (!validateMixedOpenPackage(row, 'roast', product)) return null;

    const openPieces = getMixedPackageCalculatedOpenPieces(row, 'roast');
    const totalPieces = fullPieces + openPieces;
    const openType = getPartialPackageTypeFromRow(row, AUTO_ROAST_PURE_TYPE);

    const fullKg = totalKg * (fullPieces / totalPieces);
    const openKg = Math.max(0, totalKg - fullKg);
    const builtItems = [];
    const roast = {};
    const totalFullPacks = getTotalRoastPackCount(packValues);
    const kgPerFullPack = totalFullPacks > 0 ? fullKg / totalFullPacks : 0;

    ROAST_TYPE_CONFIGS.forEach(config => {
        const packs = Number(packValues[config.type]) || 0;
        roast[config.packField] = packs;
        roast[config.kgField] = packs > 0 ? kgPerFullPack * packs : 0;
    });
    const singleType = ROAST_TYPE_CONFIGS.find(config => (Number(packValues[config.type]) || 0) > 0 && (Number(packValues[config.type]) || 0) === totalFullPacks);

    builtItems.push({
        productId,
        productName: product.name,
        quantity: fullKg,
        price: actualPrice,
        standardPrice: product.salePrice,
        total: actualPrice * fullKg,
        unit,
        kgItemCount: fullPieces,
        packageSaleMode: 'whole',
        roastType: singleType ? singleType.type : 'mixed',
        roastTypeOrder: getRoastPackOrderFromRow(row),
        roast
    });

    builtItems.push({
        productId,
        productName: product.name,
        quantity: openKg,
        price: actualPrice,
        standardPrice: product.salePrice,
        total: actualPrice * openKg,
        unit,
        kgItemCount: openPieces,
        packageSaleMode: 'partial',
        roastType: openType
    });

    return builtItems;
}

function getRoastPackOrderFromRow(row) {
    const order = [];
    row.querySelectorAll('.roast-pack-input[data-roast]').forEach(input => {
        const type = input.dataset.roast;
        const count = parseInt(input.value || '0', 10) || 0;
        if (count > 0 && ROAST_TYPE_CONFIGS.some(config => config.type === type) && !order.includes(type)) {
            order.push(type);
        }
    });
    return order;
}

function getTotalRoastPackCount(packValues) {
    return Object.values(packValues).reduce((sum, value) => sum + value, 0);
}

function applyRoastKgDistribution(row, totalKg, packValues) {
    const totalPacks = getTotalRoastPackCount(packValues);

    if (!(totalKg > 0) || totalPacks <= 0) {
        ROAST_TYPE_CONFIGS.forEach(config => {
            row.dataset[config.kgField] = '0';
        });
        return totalPacks;
    }

    const kgPerPack = totalKg / totalPacks;
    ROAST_TYPE_CONFIGS.forEach(config => {
        row.dataset[config.kgField] = (kgPerPack * (packValues[config.type] || 0)).toFixed(3);
    });

    return totalPacks;
}

function mergeRoastData(target = {}, source = {}) {
    ROAST_TYPE_CONFIGS.forEach(config => {
        target[config.packField] = (Number(target[config.packField]) || 0) + (Number(source[config.packField]) || 0);
        target[config.kgField] = (Number(target[config.kgField]) || 0) + (Number(source[config.kgField]) || 0);
    });

    if ('mixedPacks' in source || 'purePacks' in source || 'mixedKg' in source || 'pureKg' in source) {
        target.mixedPacks = (Number(target.mixedPacks) || 0) + (Number(source.mixedPacks) || 0);
        target.purePacks = (Number(target.purePacks) || 0) + (Number(source.purePacks) || 0);
        target.mixedKg = (Number(target.mixedKg) || 0) + (Number(source.mixedKg) || 0);
        target.pureKg = (Number(target.pureKg) || 0) + (Number(source.pureKg) || 0);
    }

    return target;
}

function buildEditInvoiceGroupKey(item, mode) {
    return [
        mode,
        item.productId || '',
        item.price || '',
        item.standardPrice || '',
        item.unit || ''
    ].join('|');
}

function groupInvoiceItemsForEdit(items) {
    const groupedItems = [];
    const groupedMap = new Map();

    items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const isTobacco = isTobaccoProduct(product) || item.tobaccoType != null;
        const isRoast = isRoastProduct(product) || item.roast != null || item.roastType != null;

        if (item.packageSaleMode === 'partial') {
            groupedItems.push(item);
            return;
        }

        if (!isTobacco && !isRoast) {
            groupedItems.push(item);
            return;
        }

        if (isTobacco && !item.tobaccoType) {
            groupedItems.push(item);
            return;
        }

        const mode = isTobacco ? 'tobacco' : 'roast';
        const key = buildEditInvoiceGroupKey(item, mode);
        let grouped = groupedMap.get(key);

        if (!grouped) {
            grouped = {
                ...item,
                quantity: 0,
                total: 0
            };

            if (isTobacco) {
                grouped.tobaccoPackCounts = {};
                grouped.tobaccoType = null;
            }

            if (isRoast) {
                grouped.roast = {};
                grouped.roastType = null;
                grouped.roastTypeOrder = [];
            }

            groupedMap.set(key, grouped);
            groupedItems.push(grouped);
        }

        grouped.quantity += Number(item.quantity) || 0;
        grouped.total += Number(item.total) || 0;

        if (isTobacco) {
            if (item.tobaccoType) {
                const packCount = Number(item.tobaccoPackCount);
                grouped.tobaccoPackCounts[item.tobaccoType] = (grouped.tobaccoPackCounts[item.tobaccoType] || 0) + (packCount > 0 ? packCount : 1);
            }
        }

        if (isRoast && item.roast) {
            mergeRoastData(grouped.roast, item.roast);
            (item.roastTypeOrder || getRoastParts(item.roast).map(part => part.type)).forEach(type => {
                if (type && !grouped.roastTypeOrder.includes(type)) {
                    grouped.roastTypeOrder.push(type);
                }
            });
        }

        if (isRoast && !item.roast && item.roastType && getRoastTypeConfig(item.roastType)) {
            const config = getRoastTypeConfig(item.roastType);
            grouped.roast[config.packField] = (Number(grouped.roast[config.packField]) || 0) + 1;
            const itemQty = Number(item.quantity) || 0;
            grouped.roast[config.kgField] = (Number(grouped.roast[config.kgField]) || 0) + itemQty;
            if (!grouped.roastTypeOrder.includes(item.roastType)) {
                grouped.roastTypeOrder.push(item.roastType);
            }
        }
    });

    return groupedItems.map(item => {
        if (item.tobaccoPackCounts && Object.keys(item.tobaccoPackCounts).length === 1) {
            item.tobaccoType = Object.keys(item.tobaccoPackCounts)[0];
        }
        return item;
    });
}

function padDatePart(value) {
    return String(value).padStart(2, '0');
}

function isDateKey(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function createDateFromDateKey(dateKey, hour = 12) {
    if (!isDateKey(dateKey)) {
        return new Date();
    }

    const [year, month, day] = String(dateKey).split('-').map(Number);
    return new Date(year, month - 1, day, hour, 0, 0, 0);
}

function resolveDateInput(dateInput, fallback = Date.now()) {
    if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
        return new Date(dateInput);
    }

    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (isDateKey(trimmed)) {
            return createDateFromDateKey(trimmed, 12);
        }

        const russianDateMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (russianDateMatch) {
            const [, day, month, year] = russianDateMatch;
            return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
        }

        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    const fallbackDate = fallback instanceof Date ? new Date(fallback) : new Date(fallback || Date.now());
    return Number.isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate;
}

function buildStorageDateFromDateKey(dateKey, fallback = null) {
    if (isDateKey(dateKey)) {
        return `${dateKey}T12:00:00`;
    }
    if (fallback) {
        return fallback;
    }
    return `${getTodayDateKey()}T12:00:00`;
}

function toDateKey(dateInput) {
    const date = resolveDateInput(dateInput);
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function toDateKeyStrict(dateInput) {
    if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
        return `${dateInput.getFullYear()}-${padDatePart(dateInput.getMonth() + 1)}-${padDatePart(dateInput.getDate())}`;
    }

    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (!trimmed) return '';
        if (isDateKey(trimmed)) return trimmed;

        const russianDateMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (russianDateMatch) {
            const [, day, month, year] = russianDateMatch;
            return `${year}-${month}-${day}`;
        }

        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            return `${parsed.getFullYear()}-${padDatePart(parsed.getMonth() + 1)}-${padDatePart(parsed.getDate())}`;
        }
    }

    return '';
}

function getRecordDateKey(record = {}) {
    return toDateKeyStrict(record.dateKey)
        || toDateKeyStrict(record.date)
        || toDateKeyStrict(record.createdAt)
        || '';
}

function isActiveInvoiceRecord(invoice = {}) {
    return Boolean(invoice) && invoice.isArchived !== true;
}

function isRecordOnOrBeforeDateKey(record = {}, dateKey = getTodayDateKey()) {
    const recordDateKey = getRecordDateKey(record);
    return Boolean(recordDateKey) && isDateKeyOnOrBefore(recordDateKey, dateKey);
}

function getTodayDateKey() {
    return toDateKey(new Date());
}

function getPreviousDateKey(dateKey) {
    const base = createDateFromDateKey(dateKey, 12);
    base.setDate(base.getDate() - 1);
    return toDateKey(base);
}

function compareDateKeys(left, right) {
    return String(left || '').localeCompare(String(right || ''));
}

function isDateKeyOnOrBefore(left, right) {
    return compareDateKeys(left, right) <= 0;
}

function isDateKeyOnOrAfter(left, right) {
    return compareDateKeys(left, right) >= 0;
}

function isRecordOnOrAfterDateKey(record = {}, dateKey = '') {
    if (!dateKey) return true;
    const recordDateKey = getRecordDateKey(record);
    return Boolean(recordDateKey) && isDateKeyOnOrAfter(recordDateKey, dateKey);
}

function normalizeIncomingLookupName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();
}

function sanitizeIncomingTobaccoMixedType(type) {
    return INCOMING_TOBACCO_MIXED_TYPES.includes(type) ? type : AUTO_TOBACCO_MIXED_TYPE;
}

function buildIncomingProductItemKey(productId) {
    return `${INCOMING_PRODUCT_ITEM_KEY_PREFIX}${String(productId || '')}`;
}

function isIncomingProductItemKey(key) {
    return String(key || '').startsWith(INCOMING_PRODUCT_ITEM_KEY_PREFIX);
}

function getIncomingProductIdFromItemKey(key) {
    return isIncomingProductItemKey(key)
        ? String(key || '').slice(INCOMING_PRODUCT_ITEM_KEY_PREFIX.length)
        : '';
}

function getIncomingProductByItemKey(key) {
    const productId = getIncomingProductIdFromItemKey(key);
    if (!productId) return null;
    return products.find(product => String(product.id) === productId) || null;
}

function createIncomingProductItemConfig(product = {}) {
    if (!product?.id) return null;
    const isKgProduct = isKgUnit(product.unit);

    return {
        key: buildIncomingProductItemKey(product.id),
        label: product.name || 'Товар',
        icon: isKgProduct ? 'fas fa-weight-hanging' : 'fas fa-box',
        pricingSource: 'product-by-id',
        pricingUnit: isKgProduct ? 'kg' : 'pieces',
        allowKgInput: isKgProduct,
        aliases: [],
        productId: product.id,
        dynamicProduct: true
    };
}

function getIncomingReceiptItemConfig(key) {
    const staticConfig = INCOMING_RECEIPT_ITEM_CONFIG_MAP[key];
    if (staticConfig) return staticConfig;

    const product = getIncomingProductByItemKey(key);
    return product ? createIncomingProductItemConfig(product) : null;
}

function findIncomingProductByAliases(aliases = []) {
    const normalizedAliases = aliases.map(normalizeIncomingLookupName).filter(Boolean);
    if (!normalizedAliases.length) return null;

    const exactMatch = products.find(product => normalizedAliases.includes(normalizeIncomingLookupName(product.name)));
    if (exactMatch) return exactMatch;

    const nameMatch = products.find(product => {
        const normalizedName = normalizeIncomingLookupName(product.name);
        if (!normalizedName) return false;
        return normalizedAliases.some(alias =>
            normalizedName.includes(alias)
            || alias.includes(normalizedName)
        );
    });
    if (nameMatch) return nameMatch;

    const categoryMatches = products.filter(product => {
        const categoryName = normalizeIncomingLookupName(getProductCategoryName(product));
        return categoryName && normalizedAliases.some(alias => categoryName.includes(alias));
    });

    return categoryMatches.length === 1 ? categoryMatches[0] : null;
}

function isProductBlockedFromInvoices(product = {}) {
    const combined = getProductLookupText(product);

    return combined.includes('маленький брак')
        || combined.includes('малый брак')
        || combined.includes('большой брак')
        || combined.includes('сырье');
}

function getInvoiceSelectableProducts() {
    return products.filter(product => !isProductBlockedFromInvoices(product));
}

function getIncomingReceiptPriceInfo(key) {
    const config = getIncomingReceiptItemConfig(key);
    if (!config) {
        return {
            key,
            label: key,
            unitPrice: 0,
            pricingUnit: 'pieces',
            sourceLabel: 'Источник цены не найден',
            displayPrice: '0 ₽',
            isReady: false,
            productId: null
        };
    }

    if (config.pricingSource === 'tobacco-good') {
        const unitPrice = roundIncomingUnitPrice(getTobaccoCostGood());
        return {
            key,
            label: config.label,
            unitPrice,
            pricingUnit: 'pieces',
            sourceLabel: 'Цена из настроек табака',
            displayPrice: `${formatCurrency(unitPrice)} / шт`,
            isReady: unitPrice >= 0,
            productId: null
        };
    }

    if (config.pricingSource === 'tobacco-defect') {
        const unitPrice = roundIncomingUnitPrice(getTobaccoCostDefect());
        return {
            key,
            label: config.label,
            unitPrice,
            pricingUnit: 'pieces',
            sourceLabel: 'Цена из настроек табака',
            displayPrice: `${formatCurrency(unitPrice)} / шт`,
            isReady: unitPrice >= 0,
            productId: null
        };
    }

    if (config.pricingSource === 'roast-good') {
        const unitPrice = roundIncomingUnitPrice(getCostGood());
        return {
            key,
            label: config.label,
            unitPrice,
            pricingUnit: 'kg',
            sourceLabel: 'Цена из настроек жарки',
            displayPrice: `${formatCurrency(unitPrice)} / кг`,
            isReady: unitPrice >= 0,
            productId: null
        };
    }

    if (config.pricingSource === 'roast-defect') {
        const unitPrice = roundIncomingUnitPrice(getCostDefect());
        return {
            key,
            label: config.label,
            unitPrice,
            pricingUnit: 'kg',
            sourceLabel: 'Цена из настроек жарки',
            displayPrice: `${formatCurrency(unitPrice)} / кг`,
            isReady: unitPrice >= 0,
            productId: null
        };
    }

    const linkedProduct = config.pricingSource === 'product-by-id'
        ? products.find(product => product.id === config.productId)
        : findIncomingProductByAliases(config.aliases);
    const unit = isKgUnit(linkedProduct?.unit) ? 'kg' : 'pieces';
    const unitLabel = isKgUnit(linkedProduct?.unit) ? 'кг' : 'шт';
    const unitPrice = roundIncomingUnitPrice(linkedProduct?.purchasePrice);

    return {
        key,
        label: linkedProduct?.name || config.label,
        unitPrice,
        pricingUnit: unit,
        sourceLabel: linkedProduct
            ? `Цена закупки из товара "${linkedProduct.name}"`
            : 'Товар не найден в разделе "Товары"',
        displayPrice: linkedProduct
            ? `${formatCurrency(unitPrice)} / ${unitLabel}`
            : 'Цена не найдена',
        isReady: Boolean(linkedProduct),
        productId: linkedProduct?.id || null
    };
}

function roundIncomingUnitPrice(value) {
    return Math.round(Number(value) || 0);
}

function calculateIncomingReceiptLineTotal(item) {
    const pricingUnit = item?.pricingUnit === 'kg' ? 'kg' : 'pieces';
    const baseAmount = pricingUnit === 'kg'
        ? (Number(item?.kgQty) || 0)
        : (Number(item?.piecesQty) || 0);
    return Math.max(0, baseAmount * (Number(item?.unitPrice) || 0));
}

function createEmptyIncomingReceiptItemTotals() {
    return INCOMING_RECEIPT_ITEM_CONFIGS.reduce((totals, config) => {
        totals[config.key] = {
            key: config.key,
            label: config.label,
            pieces: 0,
            kg: 0,
            total: 0
        };
        return totals;
    }, {});
}

function createPackCounter(configs = []) {
    return {
        mixed: 0,
        pure: 0,
        total: 0,
        byType: Object.fromEntries(configs.map(config => [config.type, 0]))
    };
}

function createCombinedPackSalesSummary() {
    return {
        mixed: 0,
        pure: 0,
        total: 0,
        tobacco: createPackCounter(TOBACCO_TYPE_CONFIGS),
        roast: createPackCounter(ROAST_TYPE_CONFIGS)
    };
}

function addPackTypeCount(counter, type, count, pureType) {
    const safeCount = Math.max(0, Number(count) || 0);
    if (!counter || !type || safeCount <= 0) return;

    if (!(type in counter.byType)) {
        counter.byType[type] = 0;
    }

    counter.byType[type] += safeCount;
    counter.total += safeCount;
    if (type === pureType) {
        counter.pure += safeCount;
    } else {
        counter.mixed += safeCount;
    }
}

function mergePackCounters(target, source) {
    if (!target || !source) return;
    Object.keys(source.byType || {}).forEach(type => {
        if (!(type in target.byType)) {
            target.byType[type] = 0;
        }
        target.byType[type] += Number(source.byType[type]) || 0;
    });
    target.mixed += Number(source.mixed) || 0;
    target.pure += Number(source.pure) || 0;
    target.total += Number(source.total) || 0;
}

function mergePackSalesSummaries(target, source) {
    if (!target || !source) return;
    target.mixed += Number(source.mixed) || 0;
    target.pure += Number(source.pure) || 0;
    target.total += Number(source.total) || 0;
    mergePackCounters(target.tobacco, source.tobacco);
    mergePackCounters(target.roast, source.roast);
}

function calculateAutoPackageFormation(goodCount, defectCount, mixedType, pureType, label) {
    const mixedConfig = getTobaccoTypeConfig(mixedType) || getRoastTypeConfig(mixedType);
    const pureConfig = getTobaccoTypeConfig(pureType) || getRoastTypeConfig(pureType);
    const good = Math.max(0, Number(goodCount) || 0);
    const defect = Math.max(0, Number(defectCount) || 0);

    if (!mixedConfig || !pureConfig) {
        return {
            label,
            mixedType,
            pureType,
            produced: { mixed: 0, pure: 0, total: 0 },
            used: { good: 0, defect: 0 },
            remaining: { good, defect }
        };
    }

    const mixedByGood = mixedConfig.good > 0 ? Math.floor(good / mixedConfig.good) : Number.POSITIVE_INFINITY;
    const mixedByDefect = mixedConfig.defect > 0 ? Math.floor(defect / mixedConfig.defect) : Number.POSITIVE_INFINITY;
    const mixedProduced = Math.max(0, Math.min(mixedByGood, mixedByDefect));

    const remainingGoodAfterMixed = Math.max(0, good - (mixedProduced * mixedConfig.good));
    const remainingDefectAfterMixed = Math.max(0, defect - (mixedProduced * mixedConfig.defect));
    const pureProduced = pureConfig.good > 0 ? Math.floor(remainingGoodAfterMixed / pureConfig.good) : 0;

    const usedGood = (mixedProduced * mixedConfig.good) + (pureProduced * pureConfig.good);
    const usedDefect = (mixedProduced * mixedConfig.defect) + (pureProduced * pureConfig.defect);

    return {
        label,
        mixedType,
        pureType,
        produced: {
            mixed: mixedProduced,
            pure: pureProduced,
            total: mixedProduced + pureProduced
        },
        used: {
            good: usedGood,
            defect: usedDefect
        },
        remaining: {
            good: Math.max(0, good - usedGood),
            defect: Math.max(0, defect - usedDefect)
        }
    };
}

function createTobaccoMixedTypeCounter() {
    return Object.fromEntries(INCOMING_TOBACCO_MIXED_TYPES.map(type => [type, 0]));
}

function createGroupedFormationResult(pureType) {
    return {
        produced: {
            mixed: 0,
            pure: 0,
            total: 0,
            byType: {
                ...createTobaccoMixedTypeCounter(),
                [pureType]: 0
            }
        },
        used: {
            good: 0,
            defect: 0
        },
        remaining: {
            good: 0,
            defect: 0
        },
        groups: []
    };
}

function calculateGroupedTobaccoPackageFormation(groupedRaw = {}, pureType = AUTO_TOBACCO_PURE_TYPE) {
    const result = createGroupedFormationResult(pureType);
    const pureConfig = getTobaccoTypeConfig(pureType);
    let pooledGoodAfterMixed = 0;
    let pooledDefectAfterMixed = 0;

    INCOMING_TOBACCO_MIXED_TYPES.forEach(mixedType => {
        const group = groupedRaw[mixedType] || { good: 0, defect: 0 };
        const mixedConfig = getTobaccoTypeConfig(mixedType);
        const safeGood = Math.max(0, Number(group.good) || 0);
        const safeDefect = Math.max(0, Number(group.defect) || 0);
        const mixedByGood = mixedConfig?.good ? Math.floor(safeGood / mixedConfig.good) : 0;
        const mixedByDefect = mixedConfig?.defect ? Math.floor(safeDefect / mixedConfig.defect) : 0;
        const mixedProduced = Math.max(0, Math.min(mixedByGood, mixedByDefect));
        const usedGoodByMixed = mixedProduced * (mixedConfig?.good || 0);
        const usedDefectByMixed = mixedProduced * (mixedConfig?.defect || 0);
        const remainingGood = Math.max(0, safeGood - usedGoodByMixed);
        const remainingDefect = Math.max(0, safeDefect - usedDefectByMixed);

        result.groups.push({
            mixedType,
            receivedGood: safeGood,
            receivedDefect: safeDefect,
            producedMixed: mixedProduced,
            producedPure: 0
        });

        result.produced.mixed += mixedProduced;
        result.produced.byType[mixedType] = (result.produced.byType[mixedType] || 0) + mixedProduced;
        result.used.good += usedGoodByMixed;
        result.used.defect += usedDefectByMixed;
        pooledGoodAfterMixed += remainingGood;
        pooledDefectAfterMixed += remainingDefect;
    });

    const pureProduced = pureConfig?.good ? Math.floor(pooledGoodAfterMixed / pureConfig.good) : 0;
    result.produced.pure = pureProduced;
    result.produced.total = result.produced.mixed + pureProduced;
    result.produced.byType[pureType] = pureProduced;
    result.used.good += pureProduced * (pureConfig?.good || 0);
    result.remaining.good = Math.max(0, pooledGoodAfterMixed - (pureProduced * (pureConfig?.good || 0)));
    result.remaining.defect = pooledDefectAfterMixed;

    return result;
}

function getIncomingReceiptTobaccoMixedType(receipt) {
    const fromItems = getIncomingReceiptItems(receipt).find(item => item.key === 'tobacco')?.tobaccoMixedType;
    return sanitizeIncomingTobaccoMixedType(fromItems || receipt?.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE);
}

function buildLegacyIncomingReceiptItems(receipt = {}) {
    const items = [];
    const goodQty = Math.max(0, Number(receipt.goodQty) || 0);
    const bigDefectQty = Math.max(0, Number(receipt.bigDefectQty) || 0);
    const smallDefectQty = Math.max(0, Number(receipt.smallDefectQty) || 0);

    if (goodQty > 0) {
        items.push({
            key: 'tobacco',
            piecesQty: goodQty,
            kgQty: 0,
            unitPrice: 0,
            pricingUnit: 'pieces',
            lineTotal: 0,
            sourceLabel: 'Перенесено из старой версии'
        });
    }

    if (bigDefectQty > 0) {
        items.push({
            key: 'bigDefect',
            piecesQty: bigDefectQty,
            kgQty: 0,
            unitPrice: 0,
            pricingUnit: 'kg',
            lineTotal: 0,
            sourceLabel: 'Перенесено из старой версии'
        });
    }

    if (smallDefectQty > 0) {
        items.push({
            key: 'smallDefect',
            piecesQty: smallDefectQty,
            kgQty: 0,
            unitPrice: 0,
            pricingUnit: 'pieces',
            lineTotal: 0,
            sourceLabel: 'Перенесено из старой версии'
        });
    }

    return items;
}

function normalizeIncomingReceiptItem(item = {}, fallbackKey = '') {
    const key = item.key || fallbackKey;
    const config = getIncomingReceiptItemConfig(key);
    const livePriceInfo = getIncomingReceiptPriceInfo(key);
    const piecesQty = Math.max(0, Number(item.piecesQty ?? item.pieces ?? item.qtyPieces) || 0);
    const kgQty = Math.max(0, Number(item.kgQty ?? item.kg ?? item.qtyKg) || 0);
    const pricingUnit = item.pricingUnit || livePriceInfo.pricingUnit || 'pieces';
    const unitPrice = item.unitPrice != null
        ? Math.max(0, Number(item.unitPrice) || 0)
        : (Number(livePriceInfo.unitPrice) || 0);
    const lineTotal = item.lineTotal != null
        ? Math.max(0, Number(item.lineTotal) || 0)
        : calculateIncomingReceiptLineTotal({ pricingUnit, unitPrice, piecesQty, kgQty });
    const tobaccoMixedType = key === 'tobacco'
        ? sanitizeIncomingTobaccoMixedType(item.tobaccoMixedType || item.mixedType || item.tobaccoType)
        : '';

    return {
        key,
        label: config?.label || item.label || key,
        piecesQty,
        kgQty,
        pricingUnit,
        unitPrice,
        lineTotal,
        sourceLabel: item.sourceLabel || livePriceInfo.sourceLabel || '',
        productId: item.productId || livePriceInfo.productId || null,
        tobaccoMixedType
    };
}

function getIncomingReceiptItemsSummary(items = []) {
    const totals = createEmptyIncomingReceiptItemTotals();
    const tobaccoMixedTypes = {};

    items.forEach(item => {
        const key = item.key;
        if (!totals[key]) {
            const config = getIncomingReceiptItemConfig(key);
            totals[key] = {
                key,
                label: config?.label || item.label || key,
                pieces: 0,
                kg: 0,
                total: 0
            };
        }
        totals[key].pieces += Number(item.piecesQty) || 0;
        totals[key].kg += Number(item.kgQty) || 0;
        totals[key].total += Number(item.lineTotal) || 0;
        if (key === 'tobacco') {
            const mixedType = sanitizeIncomingTobaccoMixedType(item.tobaccoMixedType);
            tobaccoMixedTypes[mixedType] = (tobaccoMixedTypes[mixedType] || 0) + (Number(item.piecesQty) || 0);
        }
    });

    const tobacco = totals.tobacco || { pieces: 0, kg: 0 };
    const roast = totals.roast || { pieces: 0, kg: 0 };
    const smallDefect = totals.smallDefect || { pieces: 0, kg: 0 };
    const bigDefect = totals.bigDefect || { pieces: 0, kg: 0 };

    return {
        totals,
        tobaccoPieces: tobacco.pieces,
        tobaccoKg: tobacco.kg,
        roastPieces: roast.pieces,
        roastKg: roast.kg,
        smallDefectPieces: smallDefect.pieces,
        smallDefectKg: smallDefect.kg,
        bigDefectPieces: bigDefect.pieces,
        bigDefectKg: bigDefect.kg,
        soupPieces: (totals.soup || {}).pieces || 0,
        soupKg: (totals.soup || {}).kg || 0,
        offalPieces: (totals.offal || {}).pieces || 0,
        offalKg: (totals.offal || {}).kg || 0,
        goodQty: tobacco.pieces + roast.pieces,
        bigDefectQty: bigDefect.pieces,
        smallDefectQty: smallDefect.pieces,
        totalAmount: Object.values(totals).reduce((sum, entry) => sum + (Number(entry.total) || 0), 0),
        tobaccoMixedTypes
    };
}

function getIncomingReceiptItems(receipt = {}) {
    const sourceItems = Array.isArray(receipt.items) && receipt.items.length
        ? receipt.items
        : buildLegacyIncomingReceiptItems(receipt);
    return sourceItems.map(item => normalizeIncomingReceiptItem(item, item.key));
}

function getIncomingTobaccoMixedTypeSummary(counts = {}) {
    return INCOMING_TOBACCO_MIXED_TYPES
        .map(type => {
            const count = Number(counts[type]) || 0;
            return count > 0 ? `${getTobaccoTypeLabel(type)}: ${formatQuantity(count, 'шт')} шт` : '';
        })
        .filter(Boolean);
}

function formatPackTypeBreakdown(byType = {}, getLabel = type => type) {
    const lines = Object.entries(byType || {})
        .filter(([, count]) => (Number(count) || 0) > 0)
        .map(([type, count]) => `${getLabel(type)}: ${formatQuantity(count, 'шт')} пак.`);

    return lines.length ? lines.join('<br>') : 'По типам: 0 пак.';
}

function getTobaccoPackBreakdownText(packState = {}) {
    return formatPackTypeBreakdown(packState.byType || {}, getTobaccoTypeLabel);
}

function getRoastPackBreakdownText(packState = {}) {
    return formatPackTypeBreakdown(packState.byType || {}, getRoastTypeLabel);
}

function getPackBreakdownInline(byType = {}, getLabel = type => type) {
    const parts = Object.entries(byType || {})
        .filter(([, count]) => (Number(count) || 0) > 0)
        .map(([type, count]) => `${getLabel(type)}: ${formatQuantity(count, 'шт')}`);
    return parts.length ? parts.join('  ') : '';
}

function getItemPackBreakdownInline(item) {
    const parts = [];
    if (item?.tobaccoPackCounts && typeof item.tobaccoPackCounts === 'object') {
        TOBACCO_TYPE_CONFIGS.forEach(config => {
            const count = Number(item.tobaccoPackCounts[config.type]) || 0;
            if (count > 0) parts.push(`${config.label}: ${formatQuantity(count, 'шт')}`);
        });
        return parts.join('  ');
    }

    if (item?.tobaccoType) {
        const count = Number(item.tobaccoPackCount) > 0
            ? Number(item.tobaccoPackCount)
            : 1;
        if (count > 0) parts.push(`${getTobaccoTypeLabel(item.tobaccoType)}: ${formatQuantity(count, 'шт')}`);
    }

    if (item?.roast) {
        getRoastParts(item.roast).forEach(part => {
            if (part.packs > 0) parts.push(`${part.label}: ${formatQuantity(part.packs, 'шт')}`);
        });
    } else if (item?.roastType) {
        const count = Number(item.kgItemCount) > 0 ? Number(item.kgItemCount) : 1;
        parts.push(`${getRoastTypeLabel(item.roastType)}: ${formatQuantity(count, 'шт')}`);
    }

    return parts.join('  ');
}

function formatInvoiceItemsSummary(items = []) {
    const grouped = new Map();

    items.forEach(item => {
        const key = [item.productId || item.productName || '', item.unit || 'шт', item.price || ''].join('|');
        if (!grouped.has(key)) {
            grouped.set(key, {
                productName: item.productName,
                unit: item.unit || 'шт',
                quantity: 0,
                packParts: []
            });
        }
        const group = grouped.get(key);
        group.quantity += Number(item.quantity) || 0;
        const breakdown = getItemPackBreakdownInline(item);
        if (breakdown) group.packParts.push(breakdown);
    });

    return [...grouped.values()].map(group => {
        const packText = group.packParts.length ? ` [${group.packParts.join('  ')}]` : '';
        return `${group.productName} (${formatQuantity(group.quantity, group.unit)} ${group.unit})${packText}`;
    }).join(', ');
}

function roundCurrencyAmount(amount) {
    return Math.round((Number(amount) || 0) * 100) / 100;
}

function getDebtPaymentMethodLabel(paymentMethod) {
    return paymentMethod === 'card' ? 'картой' : 'наличными';
}

function getDebtPaymentMethod() {
    const answer = prompt('Как погасил долг? Напишите: наличка или карта', 'наличка');
    if (answer === null) return null;

    const normalized = answer.trim().toLowerCase();
    if (['наличка', 'наличные', 'нал', 'cash'].includes(normalized)) {
        return 'cash';
    }
    if (['карта', 'картой', 'безнал', 'card'].includes(normalized)) {
        return 'card';
    }

    alert('Напишите "наличка" или "карта"');
    return getDebtPaymentMethod();
}

function recordDebtPayment(debtSnapshot, paymentMethod, amount = null, note = '', meta = {}) {
    if (!debtSnapshot) return null;

    const currentShift = getCurrentShift();
    const paymentAmount = roundCurrencyAmount(amount == null ? debtSnapshot.amount : amount);
    if (paymentAmount <= 0) return null;

    const payment = {
        id: generateId(),
        debtId: debtSnapshot.id,
        clientName: debtSnapshot.clientName || 'Клиент',
        amount: paymentAmount,
        paymentMethod,
        note: note || '',
        beforeAmount: roundCurrencyAmount(meta.beforeAmount ?? debtSnapshot.amount),
        afterAmount: roundCurrencyAmount(meta.afterAmount ?? Math.max(0, (Number(debtSnapshot.amount) || 0) - paymentAmount)),
        date: new Date().toISOString(),
        shiftId: currentShift ? currentShift.id : null,
        sellerName: currentShift ? currentShift.sellerName : ''
    };

    const moneyTransaction = recordMoneyTransaction({
        type: 'debt_payment',
        amount: payment.amount,
        toWallet: paymentMethod === 'card' ? 'bank' : 'worker_cash',
        category: 'Погашение долга клиента',
        counterparty: payment.clientName,
        note: note || `Оплата долга ${getDebtPaymentMethodLabel(paymentMethod)}`,
        debtId: payment.debtId,
        sourceId: payment.id,
        shiftId: payment.shiftId,
        date: payment.date
    });

    if (moneyTransaction) {
        payment.moneyTransactionId = moneyTransaction.id;
    }

    debtPayments.push(payment);
    saveData('debtPayments', debtPayments);

    return payment;
}

function calculatePackPiecesByRole(packState = {}, getConfig) {
    return Object.entries(packState.byType || {}).reduce((totals, [type, packCount]) => {
        const config = getConfig(type);
        const count = Math.max(0, Number(packCount) || 0);
        totals.good += count * (Number(config?.good) || 0);
        totals.defect += count * (Number(config?.defect) || 0);
        return totals;
    }, { good: 0, defect: 0 });
}

function getTobaccoStockPiecesFromState(tobaccoState = {}) {
    const packed = calculatePackPiecesByRole(tobaccoState.finishedRemaining || {}, getTobaccoTypeConfig);
    const opened = Number(tobaccoState.openedRemaining?.total) || 0;
    return {
        good: packed.good + (Number(tobaccoState.rawRemaining?.good) || 0) + opened,
        defect: packed.defect + (Number(tobaccoState.rawRemaining?.defect) || 0),
        total: packed.good + packed.defect + (Number(tobaccoState.rawRemaining?.good) || 0) + (Number(tobaccoState.rawRemaining?.defect) || 0) + opened
    };
}

function getRoastStockPiecesFromState(roastState = {}) {
    const packed = calculatePackPiecesByRole(roastState.finishedRemaining || {}, getRoastTypeConfig);
    const opened = Number(roastState.openedRemaining?.total) || 0;
    return {
        good: packed.good + (Number(roastState.rawRemaining?.good) || 0) + opened,
        defect: packed.defect + (Number(roastState.rawRemaining?.defect) || 0),
        total: packed.good + packed.defect + (Number(roastState.rawRemaining?.good) || 0) + (Number(roastState.rawRemaining?.defect) || 0) + opened
    };
}

function getRoastStockKgFromState(roastState = {}) {
    return Math.max(0, Number(roastState.kg?.remaining) || 0);
}

function getCurrentInventoryCategoryStates() {
    const state = calculateIncomingInventoryState(getTodayDateKey());
    return {
        tobacco: state.categories?.tobacco || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { byType: {}, total: 0 } },
        roast: state.categories?.roast || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { byType: {}, total: 0 } }
    };
}

function isSmallDefectProduct(product) {
    const lookupText = getProductLookupText(product);
    return ((lookupText.includes('малень') || lookupText.includes('малый')) && lookupText.includes('брак'))
        || lookupText.includes('маленький брак')
        || lookupText.includes('малый брак');
}

function isBigDefectProduct(product) {
    const lookupText = getProductLookupText(product);
    return (lookupText.includes('больш') && lookupText.includes('брак'))
        || lookupText.includes('большой брак');
}

function getAvailableInvoiceQuantityForProduct(product) {
    const states = getCurrentInventoryCategoryStates();
    if (isSmallDefectProduct(product)) {
        return getTobaccoStockPiecesFromState(states.tobacco).defect;
    }
    if (isBigDefectProduct(product)) {
        return getRoastStockPiecesFromState(states.roast).defect;
    }
    if (isTobaccoProduct(product)) {
        return getTobaccoStockPiecesFromState(states.tobacco).total;
    }
    if (isRoastProduct(product)) {
        return getRoastStockPiecesFromState(states.roast).total;
    }

    return Number(product?.quantity) || 0;
}

function getInvoiceProductOptionQuantity(product) {
    return getAvailableInvoiceQuantityForProduct(product);
}

function getProductStockDisplay(product, inventoryState = null) {
    const state = inventoryState || calculateIncomingInventoryState(getTodayDateKey());
    const tobaccoState = state.categories?.tobacco || {};
    const roastState = state.categories?.roast || {};
    const tobaccoStock = getTobaccoStockPiecesFromState(tobaccoState);
    const roastStock = getRoastStockPiecesFromState(roastState);
    const roastKg = getRoastStockKgFromState(roastState);

    if (isSmallDefectProduct(product)) {
        return {
            quantity: tobaccoStock.defect,
            unit: 'шт',
            details: 'Входит в табачные пакеты'
        };
    }
    if (isBigDefectProduct(product)) {
        return {
            quantity: roastStock.defect,
            unit: 'шт',
            details: `Входит в пакеты жарки. Общий вес жарки: ${formatQuantity(roastKg, 'кг')} кг`
        };
    }
    if (isTobaccoProduct(product)) {
        return {
            quantity: tobaccoStock.total,
            unit: 'шт',
            details: getPackBreakdownWithOpenedText(tobaccoState.finishedRemaining || {}, tobaccoState.openedRemaining || {}, getTobaccoTypeLabel)
        };
    }
    if (isRoastProduct(product)) {
        return {
            quantity: roastStock.total,
            unit: 'шт',
            details: `Вес: ${formatQuantity(roastKg, 'кг')} кг<br>${getPackBreakdownWithOpenedText(roastState.finishedRemaining || {}, roastState.openedRemaining || {}, getRoastTypeLabel)}`
        };
    }

    const kgPieceText = getKgProductPieceText(product);
    return {
        quantity: Number(product?.quantity) || 0,
        unit: product?.unit || 'шт',
        pieces: getProductPieceQuantity(product),
        details: kgPieceText ? `Штук: ${kgPieceText}` : ''
    };
}

function getInvoiceProductStockText(product) {
    const stock = getProductStockDisplay(product);
    if (isRoastProduct(product)) {
        const roastState = calculateIncomingInventoryState(getTodayDateKey()).categories?.roast || {};
        return `${formatQuantity(stock.quantity, stock.unit)} ${stock.unit} / ${formatQuantity(getRoastStockKgFromState(roastState), 'кг')} кг`;
    }
    const piecesText = !isTobaccoProduct(product) && !isRoastProduct(product) && shouldTrackProductPieces(product)
        ? ` / ${getKgProductPieceText(product)}`
        : '';
    return `${formatQuantity(stock.quantity, stock.unit)} ${stock.unit}${piecesText}`;
}

function isCoreIncomingProduct(product = {}) {
    return isTobaccoProduct(product)
        || isRoastProduct(product)
        || isSmallDefectProduct(product)
        || isBigDefectProduct(product);
}

function isSimplePackagedProduct(product = {}) {
    if (!product || isCoreIncomingProduct(product)) return false;
    const combined = getProductLookupText(product);
    return shouldTrackProductPieces(product)
        || combined.includes('суп')
        || combined.includes('потрах')
        || combined.includes('потрох');
}

function calculateOtherProductSalesForDate(dateKey = getTodayDateKey()) {
    return getInvoicesForDateKey(dateKey).reduce((totals, invoice) => {
        (invoice.items || []).forEach(item => {
            const product = products.find(productEntry => productEntry.id === item.productId);
            if (!product || isCoreIncomingProduct(product)) return;

            if (!totals[product.id]) {
                totals[product.id] = { quantity: 0, pieces: 0, amount: 0 };
            }

            totals[product.id].quantity += Number(item.quantity) || 0;
            totals[product.id].pieces += Number(item.kgItemCount) || 0;
            totals[product.id].amount += Number(item.total) || 0;
        });
        return totals;
    }, {});
}

function getIncomingEntryQuantitiesForProduct(entry, product) {
    return getIncomingReceiptItems(entry).reduce((totals, item) => {
        const config = getIncomingReceiptItemConfig(item.key);
        const itemProduct = item.productId
            ? products.find(productEntry => String(productEntry.id) === String(item.productId))
            : findIncomingProductByAliases(config?.aliases || []);

        if (!itemProduct || String(itemProduct.id) !== String(product?.id)) {
            return totals;
        }

        totals.quantity += getIncomingProductQuantityForItem(item, product);
        totals.pieces += getIncomingProductPieceQuantityForItem(item, product);
        return totals;
    }, { quantity: 0, pieces: 0 });
}

function getInvoiceItemQuantitiesForProduct(item, product) {
    if (!item || !product || String(item.productId) !== String(product.id)) {
        return { quantity: 0, pieces: 0 };
    }

    return {
        quantity: isRoastProduct(product) ? getInvoiceItemControlPieces(item) : (Number(item.quantity) || 0),
        pieces: shouldTrackProductPieces(product) ? (Number(item.kgItemCount) || 0) : 0
    };
}

function calculateProductActivityOnOrAfter(product, dateKey) {
    const sinceDateKey = dateKey || getTodayDateKey();
    const totals = {
        received: { quantity: 0, pieces: 0 },
        returned: { quantity: 0, pieces: 0 },
        sold: { quantity: 0, pieces: 0 }
    };

    getInventoryActiveStockSourceEntries(getTodayDateKey())
        .filter(entry => isRecordOnOrAfterDateKey(entry, sinceDateKey))
        .forEach(entry => {
            const quantities = getIncomingEntryQuantitiesForProduct(entry, product);
            totals.received.quantity += quantities.quantity;
            totals.received.pieces += quantities.pieces;
        });

    getInventoryActiveSupplierReturnEntries(getTodayDateKey())
        .filter(entry => isRecordOnOrAfterDateKey(entry, sinceDateKey))
        .forEach(entry => {
            const quantities = getIncomingEntryQuantitiesForProduct(entry, product);
            totals.returned.quantity += quantities.quantity;
            totals.returned.pieces += quantities.pieces;
        });

    invoices
        .filter(invoice => isActiveInvoiceRecord(invoice) && isRecordOnOrAfterDateKey(invoice, sinceDateKey))
        .forEach(invoice => {
            (invoice.items || []).forEach(item => {
                const quantities = getInvoiceItemQuantitiesForProduct(item, product);
                totals.sold.quantity += quantities.quantity;
                totals.sold.pieces += quantities.pieces;
            });
        });

    return totals;
}

function getProductOpeningStockDisplay(product, dateKey, openingInventoryState) {
    if (isCoreIncomingProduct(product)) {
        return getProductStockDisplay(product, openingInventoryState);
    }

    const activity = calculateProductActivityOnOrAfter(product, dateKey);
    const quantity = Math.max(
        0,
        (Number(product?.quantity) || 0)
            + activity.sold.quantity
            - activity.received.quantity
            + activity.returned.quantity
    );
    const pieces = Math.max(
        0,
        getProductPieceQuantity(product)
            + activity.sold.pieces
            - activity.received.pieces
            + activity.returned.pieces
    );
    const unit = product?.unit || 'шт';

    return {
        quantity,
        unit,
        pieces,
        details: shouldTrackProductPieces(product) ? `Штук: ${formatQuantity(pieces, 'шт')}` : ''
    };
}

function renderIncomingMorningWarehouseLines(dateKey, openingInventoryState) {
    if (!products.length) {
        return '<div class="incoming-stock-empty">Товары ещё не добавлены</div>';
    }

    const rows = products
        .map(product => ({
            product,
            stock: getProductOpeningStockDisplay(product, dateKey, openingInventoryState)
        }))
        .sort((left, right) => {
            const categoryCompare = String(getProductCategoryName(left.product) || '').localeCompare(String(getProductCategoryName(right.product) || ''), 'ru');
            if (categoryCompare !== 0) return categoryCompare;
            return String(left.product.name || '').localeCompare(String(right.product.name || ''), 'ru');
        });

    return `
        <div class="incoming-stock-list">
            ${rows.map(row => `
                <div class="incoming-stock-row">
                    <span>
                        ${escapeHtml(row.product.name || 'Товар')}
                        <small>${escapeHtml(getProductCategoryName(row.product) || row.product.category || 'Без категории')}</small>
                    </span>
                    <strong>
                        ${formatQuantity(row.stock.quantity, row.stock.unit)} ${escapeHtml(row.stock.unit)}
                        ${row.stock.details ? `<small>${row.stock.details}</small>` : ''}
                    </strong>
                </div>
            `).join('')}
        </div>
    `;
}

function getInvoiceExistingInventoryQuantity(invoice, productId, product) {
    return (invoice?.items || [])
        .filter(item => item.productId === productId)
        .reduce((sum, item) => {
            if (isRoastProduct(product)) {
                return sum + getInvoiceItemControlPieces(item);
            }
            return sum + (Number(item.quantity) || 0);
        }, 0);
}

function getInvoiceExistingPieceQuantity(invoice, productId) {
    return (invoice?.items || [])
        .filter(item => item.productId === productId)
        .reduce((sum, item) => sum + (Number(item.kgItemCount) || 0), 0);
}

function validateKgProductSalePieces(product, kgItemCount, options = {}) {
    if (!shouldTrackProductPieces(product) || isTobaccoProduct(product) || isRoastProduct(product)) {
        return true;
    }

    const availablePieces = getProductPieceQuantity(product) + (Number(options.extraPieces) || 0);
    if (kgItemCount > availablePieces) {
        alert(`Недостаточно штук для товара "${product.name}". Доступно: ${formatQuantity(availablePieces, 'шт')} шт`);
        return false;
    }

    return true;
}

function adjustProductStockByInvoiceItem(product, item, direction) {
    if (!product || !item) return;
    const multiplier = direction >= 0 ? 1 : -1;
    product.quantity = Math.max(0, (Number(product.quantity) || 0) + (multiplier * (Number(item.quantity) || 0)));

    if (shouldTrackProductPieces(product) && Number(item.kgItemCount) > 0) {
        product.pieceQuantity = Math.max(0, getProductPieceQuantity(product) + (multiplier * Number(item.kgItemCount)));
    }
}

function getRoastAverageKgCostFromState(roastState = {}) {
    const roastKg = roastState.kg || {};
    const roastReceivedKg = Math.max(0, Number(roastKg.received) || 0);
    const roastReceivedValue = (Math.max(0, Number(roastKg.receivedGood) || 0) * getCostGood())
        + (Math.max(0, Number(roastKg.receivedDefect) || 0) * getCostDefect());

    return roastReceivedKg > 0 ? roastReceivedValue / roastReceivedKg : 0;
}

function getRoastCurrentKgCostFromState(roastState = {}) {
    const roastStock = getRoastStockPiecesFromState(roastState);
    const goodPieces = Math.max(0, Number(roastStock.good) || 0);
    const defectPieces = Math.max(0, Number(roastStock.defect) || 0);
    const totalPieces = goodPieces + defectPieces;

    if (totalPieces > 0) {
        return ((goodPieces * getCostGood()) + (defectPieces * getCostDefect())) / totalPieces;
    }

    return getRoastAverageKgCostFromState(roastState);
}

function getRegularProductStockValue(product, inventoryState = null) {
    if (!product || isCoreIncomingProduct(product)) {
        return 0;
    }

    const stock = getProductStockDisplay(product, inventoryState);
    const quantity = Math.max(0, Number(stock.quantity) || 0);
    const purchasePrice = Math.max(0, Number(product.purchasePrice) || 0);

    return quantity * purchasePrice;
}

function getWarehouseValueBreakdownByUnifiedStock(inventoryState = null) {
    const state = inventoryState || calculateIncomingInventoryState(getTodayDateKey());
    const tobaccoStock = getTobaccoStockPiecesFromState(state.categories?.tobacco || {});
    const roastState = state.categories?.roast || {};
    const roastKg = roastState.kg || {};
    const roastKgCost = getRoastCurrentKgCostFromState(roastState);
    const tobaccoValue = (Math.max(0, Number(tobaccoStock.good) || 0) * getTobaccoCostGood())
        + (Math.max(0, Number(tobaccoStock.defect) || 0) * getTobaccoCostDefect());
    const roastValue = Math.max(0, Number(roastKg.remaining) || 0) * roastKgCost;
    const regularProducts = products
        .filter(product => !isCoreIncomingProduct(product))
        .map(product => {
            const stock = getProductStockDisplay(product, state);
            const value = getRegularProductStockValue(product, state);

            return {
                id: product.id,
                name: product.name || 'Товар',
                unit: stock.unit || product.unit || 'шт',
                quantity: Math.max(0, Number(stock.quantity) || 0),
                pieces: getProductPieceQuantity(product),
                purchasePrice: Math.max(0, Number(product.purchasePrice) || 0),
                value
            };
        });
    const regularProductsValue = regularProducts.reduce((sum, product) => sum + product.value, 0);

    return {
        total: tobaccoValue + roastValue + regularProductsValue,
        tobacco: {
            goodPieces: Math.max(0, Number(tobaccoStock.good) || 0),
            defectPieces: Math.max(0, Number(tobaccoStock.defect) || 0),
            value: tobaccoValue
        },
        roast: {
            kg: Math.max(0, Number(roastKg.remaining) || 0),
            averageKgCost: roastKgCost,
            value: roastValue
        },
        regular: {
            products: regularProducts,
            value: regularProductsValue
        }
    };
}

function getWarehouseValueByUnifiedStock() {
    return getWarehouseValueBreakdownByUnifiedStock().total;
}

function getWarehouseValueSummaryText(breakdown = getWarehouseValueBreakdownByUnifiedStock()) {
    return [
        `Табак ${formatCurrency(breakdown.tobacco?.value || 0)}`,
        `Жарка ${formatCurrency(breakdown.roast?.value || 0)}`,
        `Остальные ${formatCurrency(breakdown.regular?.value || 0)}`
    ].join(' • ');
}

function isKgUnit(unit) {
    return String(unit || '').trim().toLowerCase() === 'кг';
}

function getProductPieceQuantity(product) {
    return Math.max(0, Number(product?.pieceQuantity) || 0);
}

function shouldTrackProductPieces(productOrUnit) {
    const unit = typeof productOrUnit === 'string' ? productOrUnit : productOrUnit?.unit;
    return isKgUnit(unit);
}

function getKgProductPieceText(product) {
    if (!shouldTrackProductPieces(product)) return '';
    return `${formatQuantity(getProductPieceQuantity(product), 'шт')} шт`;
}

function formatWarehouseProductQuantity(quantity, unit = 'шт', pieces = 0) {
    const safeUnit = unit || 'шт';
    const mainText = `${formatQuantity(quantity, safeUnit)} ${safeUnit}`;
    const pieceCount = Math.max(0, Number(pieces) || 0);

    if (shouldTrackProductPieces(safeUnit) && pieceCount > 0) {
        return `${mainText} / ${formatQuantity(pieceCount, 'шт')} шт`;
    }

    return mainText;
}

function validateProductPieceQuantity(unit, quantity, pieceQuantity, label = 'товара') {
    if (!isKgUnit(unit)) return true;
    if (!Number.isFinite(pieceQuantity) || pieceQuantity < 0) {
        alert(`Для ${label} в кг укажите количество штук`);
        return false;
    }
    if ((Number(quantity) || 0) > 0 && pieceQuantity <= 0) {
        alert(`Для ${label} в кг количество штук должно быть больше 0`);
        return false;
    }
    return true;
}

function syncProductKgPieceFields(mode = 'add') {
    const isEdit = mode === 'edit';
    const unitSelect = document.getElementById(isEdit ? 'editUnit' : 'unit');
    const pieceField = document.getElementById(isEdit ? 'editKgPieceQuantityField' : 'kgPieceQuantityField');
    const pieceInput = document.getElementById(isEdit ? 'editKgPieceQuantity' : 'kgPieceQuantity');
    const addPieceField = isEdit ? document.getElementById('addKgPieceQuantityField') : null;
    const addPieceInput = isEdit ? document.getElementById('addKgPieceQuantity') : null;
    const show = isKgUnit(unitSelect?.value || '');

    if (pieceField) pieceField.style.display = show ? 'block' : 'none';
    if (pieceInput) {
        pieceInput.disabled = !show;
        pieceInput.required = show;
        if (!show) pieceInput.value = '';
    }
    if (addPieceField) addPieceField.style.display = show ? 'block' : 'none';
    if (addPieceInput) {
        addPieceInput.disabled = !show;
        if (!show) addPieceInput.value = '';
    }
}

function getKgCountInput(row) {
    return row?.querySelector('.kg-count-input') || null;
}

function getKgItemCountFromRow(row) {
    const input = getKgCountInput(row);
    const value = parseFloat(input?.value || '0');
    return Number.isFinite(value) ? value : 0;
}

function getKgItemCountFromItem(item) {
    if (Number(item?.kgItemCount) > 0) {
        return Number(item.kgItemCount);
    }

    if (item?.roast) {
        return getRoastParts(item.roast).reduce((sum, part) => sum + (Number(part.packs) || 0), 0);
    }

    return '';
}

function syncKgCountVisibility(row, unit) {
    const input = getKgCountInput(row);
    if (!input) return;
    const field = input.closest('.kg-count-field');
    const quantityField = Array.from(row?.children || [])
        .find(child => child.classList?.contains('invoice-quantity-field') && !child.classList.contains('kg-count-field'));
    const quantityLabel = quantityField?.querySelector('span') || null;

    const show = isKgUnit(unit);
    if (quantityLabel) {
        quantityLabel.textContent = show ? 'КГ' : 'КОЛ';
    }
    if (field) {
        field.style.display = show ? 'flex' : 'none';
    } else {
        input.style.display = show ? 'block' : 'none';
    }
    input.disabled = !show;
    input.required = show;
    if (!show) {
        input.value = '';
    } else if (!input.value) {
        input.value = '1';
    }
}

function validateKgItemCount(row, product, unit) {
    if (!isKgUnit(unit)) {
        return true;
    }

    const kgCount = getKgItemCountFromRow(row);
    if (!(kgCount > 0)) {
        alert(`Для товара "${product.name}" укажите количество штук/пакетов`);
        return false;
    }

    if (isRoastProduct(product) && getPackageSaleModeFromRow(row) !== 'partial') {
        const roastPackValues = getRoastPackValuesFromRow(row);
        const totalPacks = getTotalRoastPackCount(roastPackValues);
        if (totalPacks <= 0) {
            alert(`Для товара "${product.name}" укажите тип жарки`);
            return false;
        }
    }

    return true;
}

function renderIncomingReceiptItemBreakdown(receipt) {
    const items = getIncomingReceiptItems(receipt).filter(item => (item.piecesQty > 0) || (item.kgQty > 0));

    if (!items.length) {
        return '<div class="incoming-receipt-breakdown-empty">По позициям данных нет</div>';
    }

    return `
        <div class="incoming-receipt-breakdown">
            ${items.map(item => `
                ${(() => {
                    const config = getIncomingReceiptItemConfig(item.key);
                    const allowKgInput = config?.allowKgInput !== false;
                    return `
                <div class="incoming-receipt-breakdown-item">
                    <strong>${escapeHtml(item.label)}${item.key === 'tobacco' ? ` • ${escapeHtml(getTobaccoTypeLabel(item.tobaccoMixedType || receipt?.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE))}` : ''}</strong>
                    <span>${formatQuantity(item.piecesQty, 'шт')} шт</span>
                    <span>${allowKgInput ? `${formatQuantity(item.kgQty, 'кг')} кг` : 'Поштучно'}</span>
                    <span>${formatCurrency(item.lineTotal)}</span>
                </div>
                    `;
                })()}
            `).join('')}
        </div>
    `;
}

function normalizeIncomingPayment(payment = {}) {
    const date = payment.date || new Date().toISOString();
    return {
        id: payment.id || generateId(),
        amount: Math.max(0, Number(payment.amount) || 0),
        note: payment.note || '',
        date,
        dateKey: toDateKey(payment.date || payment.dateKey || date),
        paidBy: payment.paidBy || ''
    };
}

function hasStructuredIncomingItems(record = {}) {
    return Array.isArray(record.items) && record.items.length > 0;
}

function getInventoryAggregateQty(record = {}, summary = {}, fieldName = '') {
    const summaryQty = Math.max(0, Number(summary[fieldName]) || 0);
    if (hasStructuredIncomingItems(record)) {
        return summaryQty;
    }
    return Math.max(0, Number(record[fieldName]) || summaryQty);
}

function getInventoryAggregateTotalAmount(record = {}, summary = {}) {
    const summaryTotal = Math.max(0, Number(summary.totalAmount) || 0);
    if (hasStructuredIncomingItems(record)) {
        return summaryTotal;
    }
    return Math.max(0, Number(record.totalAmount) || summaryTotal);
}

function normalizeIncomingReceipt(receipt = {}) {
    const createdAt = receipt.createdAt || receipt.date || new Date().toISOString();
    const dateKey = toDateKey(receipt.date || receipt.dateKey || createdAt);
    const storageDate = receipt.date || buildStorageDateFromDateKey(dateKey, createdAt);
    const paymentHistory = Array.isArray(receipt.paymentHistory)
        ? receipt.paymentHistory.map(normalizeIncomingPayment)
        : [];
    const paidFromHistory = paymentHistory.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const paidAmount = Math.max(Number(receipt.paidAmount || 0), paidFromHistory);
    const items = getIncomingReceiptItems(receipt);
    const summary = getIncomingReceiptItemsSummary(items);
    const totalAmount = getInventoryAggregateTotalAmount(receipt, summary);
    const tobaccoMixedTypes = { ...summary.tobaccoMixedTypes };
    if (!Object.keys(tobaccoMixedTypes).length && receipt.tobaccoMixedType) {
        tobaccoMixedTypes[sanitizeIncomingTobaccoMixedType(receipt.tobaccoMixedType)] = Math.max(0, Number(receipt.tobaccoPieces) || 0);
    }

    return {
        id: receipt.id || generateId(),
        supplierName: receipt.supplierName || 'Поставщик',
        invoiceNumber: receipt.invoiceNumber || '',
        note: receipt.note || '',
        createdAt,
        date: storageDate,
        dateKey,
        acceptedBy: receipt.acceptedBy || '',
        shiftId: receipt.shiftId || null,
        totalAmount,
        paidAmount,
        items,
        tobaccoMixedType: sanitizeIncomingTobaccoMixedType(
            receipt.tobaccoMixedType
            || items.find(item => item.key === 'tobacco')?.tobaccoMixedType
            || AUTO_TOBACCO_MIXED_TYPE
        ),
        tobaccoMixedTypes,
        goodQty: getInventoryAggregateQty(receipt, summary, 'goodQty'),
        bigDefectQty: getInventoryAggregateQty(receipt, summary, 'bigDefectQty'),
        smallDefectQty: getInventoryAggregateQty(receipt, summary, 'smallDefectQty'),
        tobaccoPieces: getInventoryAggregateQty(receipt, summary, 'tobaccoPieces'),
        tobaccoKg: getInventoryAggregateQty(receipt, summary, 'tobaccoKg'),
        roastPieces: getInventoryAggregateQty(receipt, summary, 'roastPieces'),
        roastKg: getInventoryAggregateQty(receipt, summary, 'roastKg'),
        smallDefectPieces: getInventoryAggregateQty(receipt, summary, 'smallDefectPieces'),
        smallDefectKg: getInventoryAggregateQty(receipt, summary, 'smallDefectKg'),
        bigDefectPieces: getInventoryAggregateQty(receipt, summary, 'bigDefectPieces'),
        bigDefectKg: getInventoryAggregateQty(receipt, summary, 'bigDefectKg'),
        soupPieces: getInventoryAggregateQty(receipt, summary, 'soupPieces'),
        soupKg: getInventoryAggregateQty(receipt, summary, 'soupKg'),
        offalPieces: getInventoryAggregateQty(receipt, summary, 'offalPieces'),
        offalKg: getInventoryAggregateQty(receipt, summary, 'offalKg'),
        paymentHistory
    };
}

function normalizeInitialStockEntry(entry = {}) {
    const createdAt = entry.createdAt || entry.date || new Date().toISOString();
    const dateKey = toDateKey(entry.date || entry.dateKey || createdAt);
    const storageDate = entry.date || buildStorageDateFromDateKey(dateKey, createdAt);
    const items = getIncomingReceiptItems(entry);
    const summary = getIncomingReceiptItemsSummary(items);
    const totalAmount = getInventoryAggregateTotalAmount(entry, summary);
    const tobaccoMixedTypes = { ...summary.tobaccoMixedTypes };
    if (!Object.keys(tobaccoMixedTypes).length && entry.tobaccoMixedType) {
        tobaccoMixedTypes[sanitizeIncomingTobaccoMixedType(entry.tobaccoMixedType)] = Math.max(0, Number(entry.tobaccoPieces) || 0);
    }

    return {
        id: entry.id || generateId(),
        note: entry.note || '',
        createdAt,
        date: storageDate,
        dateKey,
        createdBy: entry.createdBy || entry.acceptedBy || getActorLabel(),
        totalAmount,
        items,
        tobaccoMixedType: sanitizeIncomingTobaccoMixedType(
            entry.tobaccoMixedType
            || items.find(item => item.key === 'tobacco')?.tobaccoMixedType
            || AUTO_TOBACCO_MIXED_TYPE
        ),
        tobaccoMixedTypes,
        goodQty: getInventoryAggregateQty(entry, summary, 'goodQty'),
        bigDefectQty: getInventoryAggregateQty(entry, summary, 'bigDefectQty'),
        smallDefectQty: getInventoryAggregateQty(entry, summary, 'smallDefectQty'),
        tobaccoPieces: getInventoryAggregateQty(entry, summary, 'tobaccoPieces'),
        tobaccoKg: getInventoryAggregateQty(entry, summary, 'tobaccoKg'),
        roastPieces: getInventoryAggregateQty(entry, summary, 'roastPieces'),
        roastKg: getInventoryAggregateQty(entry, summary, 'roastKg'),
        smallDefectPieces: getInventoryAggregateQty(entry, summary, 'smallDefectPieces'),
        smallDefectKg: getInventoryAggregateQty(entry, summary, 'smallDefectKg'),
        bigDefectPieces: getInventoryAggregateQty(entry, summary, 'bigDefectPieces'),
        bigDefectKg: getInventoryAggregateQty(entry, summary, 'bigDefectKg'),
        soupPieces: getInventoryAggregateQty(entry, summary, 'soupPieces'),
        soupKg: getInventoryAggregateQty(entry, summary, 'soupKg'),
        offalPieces: getInventoryAggregateQty(entry, summary, 'offalPieces'),
        offalKg: getInventoryAggregateQty(entry, summary, 'offalKg')
    };
}

function normalizeSupplierReturn(entry = {}) {
    const createdAt = entry.createdAt || entry.date || new Date().toISOString();
    const dateKey = toDateKey(entry.date || entry.dateKey || createdAt);
    const storageDate = entry.date || buildStorageDateFromDateKey(dateKey, createdAt);
    const items = getIncomingReceiptItems(entry);
    const summary = getIncomingReceiptItemsSummary(items);
    const totalAmount = getInventoryAggregateTotalAmount(entry, summary);
    const tobaccoMixedTypes = { ...summary.tobaccoMixedTypes };

    if (!Object.keys(tobaccoMixedTypes).length && entry.tobaccoMixedType) {
        tobaccoMixedTypes[sanitizeIncomingTobaccoMixedType(entry.tobaccoMixedType)] = Math.max(0, Number(entry.tobaccoPieces) || 0);
    }

    return {
        id: entry.id || generateId(),
        supplierName: entry.supplierName || 'Поставщик',
        note: entry.note || '',
        createdAt,
        date: storageDate,
        dateKey,
        createdBy: entry.createdBy || entry.acceptedBy || getActorLabel(),
        shiftId: entry.shiftId || null,
        totalAmount,
        items,
        tobaccoMixedType: sanitizeIncomingTobaccoMixedType(
            entry.tobaccoMixedType
            || items.find(item => item.key === 'tobacco')?.tobaccoMixedType
            || AUTO_TOBACCO_MIXED_TYPE
        ),
        tobaccoMixedTypes,
        goodQty: getInventoryAggregateQty(entry, summary, 'goodQty'),
        bigDefectQty: getInventoryAggregateQty(entry, summary, 'bigDefectQty'),
        smallDefectQty: getInventoryAggregateQty(entry, summary, 'smallDefectQty'),
        tobaccoPieces: getInventoryAggregateQty(entry, summary, 'tobaccoPieces'),
        tobaccoKg: getInventoryAggregateQty(entry, summary, 'tobaccoKg'),
        roastPieces: getInventoryAggregateQty(entry, summary, 'roastPieces'),
        roastKg: getInventoryAggregateQty(entry, summary, 'roastKg'),
        smallDefectPieces: getInventoryAggregateQty(entry, summary, 'smallDefectPieces'),
        smallDefectKg: getInventoryAggregateQty(entry, summary, 'smallDefectKg'),
        bigDefectPieces: getInventoryAggregateQty(entry, summary, 'bigDefectPieces'),
        bigDefectKg: getInventoryAggregateQty(entry, summary, 'bigDefectKg'),
        soupPieces: getInventoryAggregateQty(entry, summary, 'soupPieces'),
        soupKg: getInventoryAggregateQty(entry, summary, 'soupKg'),
        offalPieces: getInventoryAggregateQty(entry, summary, 'offalPieces'),
        offalKg: getInventoryAggregateQty(entry, summary, 'offalKg')
    };
}

function normalizeArchivedIncomingReceipt(receipt = {}) {
    return {
        ...normalizeIncomingReceipt(receipt),
        archivedAt: receipt.archivedAt || new Date().toISOString(),
        archivedBy: receipt.archivedBy || '',
        archiveReason: receipt.archiveReason || ''
    };
}

function normalizeArchivedInvoice(invoice = {}) {
    const archivedAt = invoice.archivedAt || new Date().toISOString();
    return {
        ...invoice,
        items: Array.isArray(invoice.items) ? invoice.items : [],
        isArchived: true,
        archivedAt,
        archivedBy: invoice.archivedBy || '',
        archiveReason: invoice.archiveReason || '',
        invoiceNumberAtArchive: Number(invoice.invoiceNumberAtArchive) || Number(invoice.archivedNumber) || 0
    };
}

function moveInvoiceToArchive(invoiceId, reason = 'Перенесена в архив', options = {}) {
    const invoiceIndex = invoices.findIndex(item => item.id === invoiceId);
    if (invoiceIndex === -1) return null;

    const invoice = invoices[invoiceIndex];
    const invoiceNumberAtArchive = Number(invoice.invoiceNumberAtArchive)
        || Number(options.invoiceNumberAtArchive)
        || invoiceIndex + 1;
    const archivedSnapshot = normalizeArchivedInvoice({
        ...invoice,
        archivedAt: options.archivedAt || new Date().toISOString(),
        archivedBy: options.archivedBy || sessionAccess.userName || (isSellerMode() ? 'Продавец' : 'Руководитель'),
        archiveReason: reason,
        invoiceNumberAtArchive
    });

    invoices[invoiceIndex] = {
        ...invoice,
        isArchived: true,
        archivedAt: archivedSnapshot.archivedAt,
        archivedBy: archivedSnapshot.archivedBy,
        archiveReason: archivedSnapshot.archiveReason,
        invoiceNumberAtArchive: archivedSnapshot.invoiceNumberAtArchive
    };
    archivedInvoices = archivedInvoices.filter(item => item.id !== invoiceId);
    archivedInvoices.unshift(archivedSnapshot);

    return archivedSnapshot;
}

function saveInvoiceArchiveState() {
    saveData('invoices', invoices);
    saveData('archivedInvoices', archivedInvoices);
}

function autoArchiveOldInvoices() {
    const todayKey = getTodayDateKey();
    const oldActiveInvoices = invoices.filter(invoice => isActiveInvoiceRecord(invoice) && getRecordDateKey(invoice) !== todayKey);

    if (!oldActiveInvoices.length) {
        return 0;
    }

    const archivedAt = new Date().toISOString();
    oldActiveInvoices.forEach(invoice => {
        moveInvoiceToArchive(invoice.id, 'Автоматический перенос прошлого дня', {
            archivedAt,
            archivedBy: 'Система'
        });
    });

    saveInvoiceArchiveState();
    return oldActiveInvoices.length;
}

function normalizePackageProduction(entry = {}) {
    const createdAt = entry.createdAt || entry.date || new Date().toISOString();
    const dateKey = toDateKey(entry.date || entry.dateKey || createdAt);
    return {
        id: entry.id || generateId(),
        createdAt,
        date: entry.date || buildStorageDateFromDateKey(dateKey, createdAt),
        dateKey,
        createdBy: entry.createdBy || '',
        shiftId: entry.shiftId || null,
        note: entry.note || '',
        goodUsedQty: Math.max(0, Number(entry.goodUsedQty) || 0),
        bigDefectUsedQty: Math.max(0, Number(entry.bigDefectUsedQty) || 0),
        smallDefectUsedQty: Math.max(0, Number(entry.smallDefectUsedQty) || 0),
        mixedPacksProduced: Math.max(0, Number(entry.mixedPacksProduced) || 0),
        purePacksProduced: Math.max(0, Number(entry.purePacksProduced) || 0)
    };
}

function sanitizeMoneyWalletId(walletId, fallback = DEFAULT_MONEY_WALLET_ID) {
    const id = String(walletId || '').trim();
    return MONEY_WALLETS.some(wallet => wallet.id === id) ? id : fallback;
}

function normalizeMoneyTransaction(entry = {}) {
    const createdAt = entry.createdAt || entry.date || new Date().toISOString();
    const date = entry.date || createdAt;
    const type = ['income', 'expense', 'transfer', 'shift_transfer', 'supplier_payment', 'debt_payment'].includes(entry.type)
        ? entry.type
        : 'expense';

    return {
        id: entry.id || generateId(),
        type,
        amount: Math.max(0, Number(entry.amount) || 0),
        fromWallet: entry.fromWallet ? sanitizeMoneyWalletId(entry.fromWallet, '') : '',
        toWallet: entry.toWallet ? sanitizeMoneyWalletId(entry.toWallet, '') : '',
        category: entry.category || '',
        counterparty: entry.counterparty || '',
        note: entry.note || '',
        date,
        dateKey: toDateKey(entry.dateKey || date),
        createdAt,
        createdBy: entry.createdBy || entry.actor || '',
        shiftId: entry.shiftId || null,
        receiptId: entry.receiptId || null,
        debtId: entry.debtId || null,
        sourceId: entry.sourceId || null,
        status: entry.status === 'cancelled' ? 'cancelled' : 'active',
        cancelledAt: entry.cancelledAt || '',
        cancelledBy: entry.cancelledBy || '',
        cancelReason: entry.cancelReason || ''
    };
}

function normalizeOpenedStockEvent(entry = {}) {
    const createdAt = entry.createdAt || entry.date || new Date().toISOString();
    const date = entry.date || createdAt;
    const tobaccoPacks = entry.tobaccoPacks && typeof entry.tobaccoPacks === 'object' ? entry.tobaccoPacks : {};
    const roastPacks = entry.roastPacks && typeof entry.roastPacks === 'object' ? entry.roastPacks : {};

    return {
        id: entry.id || generateId(),
        type: entry.type || 'manual',
        date,
        dateKey: toDateKey(entry.dateKey || date),
        createdAt,
        createdBy: entry.createdBy || getActorLabel(),
        shiftId: entry.shiftId || null,
        invoiceId: entry.invoiceId || null,
        itemId: entry.itemId || null,
        productKind: entry.productKind || '',
        packType: entry.packType || '',
        tobaccoDelta: Number(entry.tobaccoDelta) || 0,
        roastDelta: Number(entry.roastDelta) || 0,
        tobaccoPacks: Object.fromEntries(TOBACCO_TYPE_CONFIGS.map(config => [config.type, Math.max(0, Number(tobaccoPacks[config.type]) || 0)])),
        roastPacks: Object.fromEntries(ROAST_TYPE_CONFIGS.map(config => [config.type, Math.max(0, Number(roastPacks[config.type]) || 0)])),
        note: entry.note || ''
    };
}

function migrateIncomingInventoryData() {
    let changed = false;

    archivedInvoices = (Array.isArray(archivedInvoices) ? archivedInvoices : []).map(invoice => {
        const normalized = normalizeArchivedInvoice(invoice);
        if (JSON.stringify(invoice) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    invoices = (Array.isArray(invoices) ? invoices : []).map(invoice => {
        const archivedSnapshot = archivedInvoices.find(item => item.id === invoice.id);
        if (!invoice.isArchived && !archivedSnapshot) {
            return invoice;
        }

        const normalized = {
            ...invoice,
            isArchived: true,
            archivedAt: invoice.archivedAt || archivedSnapshot?.archivedAt || new Date().toISOString(),
            archivedBy: invoice.archivedBy || archivedSnapshot?.archivedBy || '',
            archiveReason: invoice.archiveReason || archivedSnapshot?.archiveReason || '',
            invoiceNumberAtArchive: Number(invoice.invoiceNumberAtArchive) || Number(archivedSnapshot?.invoiceNumberAtArchive) || 0
        };

        if (JSON.stringify(invoice) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    archivedInvoices.forEach(archivedInvoice => {
        const exists = invoices.some(invoice => invoice.id === archivedInvoice.id);
        if (!exists) {
            invoices.push({
                ...archivedInvoice,
                isArchived: true
            });
            changed = true;
        }
    });

    incomingReceipts = (Array.isArray(incomingReceipts) ? incomingReceipts : []).map(receipt => {
        const normalized = normalizeIncomingReceipt(receipt);
        if (JSON.stringify(receipt) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    archivedIncomingReceipts = (Array.isArray(archivedIncomingReceipts) ? archivedIncomingReceipts : []).map(receipt => {
        const normalized = normalizeArchivedIncomingReceipt(receipt);
        if (JSON.stringify(receipt) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    initialStockEntries = (Array.isArray(initialStockEntries) ? initialStockEntries : []).map(entry => {
        const normalized = normalizeInitialStockEntry(entry);
        if (JSON.stringify(entry) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    supplierReturns = (Array.isArray(supplierReturns) ? supplierReturns : []).map(entry => {
        const normalized = normalizeSupplierReturn(entry);
        if (JSON.stringify(entry) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    packageProductions = (Array.isArray(packageProductions) ? packageProductions : []).map(entry => {
        const normalized = normalizePackageProduction(entry);
        if (JSON.stringify(entry) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    moneyTransactions = (Array.isArray(moneyTransactions) ? moneyTransactions : []).map(entry => {
        const normalized = normalizeMoneyTransaction(entry);
        if (JSON.stringify(entry) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    openedStockEvents = (Array.isArray(openedStockEvents) ? openedStockEvents : []).map(entry => {
        const normalized = normalizeOpenedStockEvent(entry);
        if (JSON.stringify(entry) !== JSON.stringify(normalized)) {
            changed = true;
        }
        return normalized;
    });

    if (changed) {
        saveData('invoices', invoices);
        saveData('archivedInvoices', archivedInvoices);
        saveData('incomingReceipts', incomingReceipts);
        saveData('archivedIncomingReceipts', archivedIncomingReceipts);
        saveData('initialStockEntries', initialStockEntries);
        saveData('supplierReturns', supplierReturns);
        saveData('packageProductions', packageProductions);
        saveData('moneyTransactions', moneyTransactions);
        saveData('openedStockEvents', openedStockEvents);
    }

    syncIncomingProductsStock(changed);
}

function getReceiptOutstandingAmount(receipt) {
    return Math.max(0, (Number(receipt.totalAmount) || 0) - (Number(receipt.paidAmount) || 0));
}

function compareIncomingReceiptByAge(left, right) {
    const dateCompare = compareDateKeys(left?.dateKey || '', right?.dateKey || '');
    if (dateCompare !== 0) return dateCompare;
    return String(left?.createdAt || '').localeCompare(String(right?.createdAt || ''));
}

function getIncomingProductQuantityForItem(item, product) {
    const normalizedUnit = normalizeIncomingLookupName(product?.unit || '');
    if (normalizedUnit.includes('кг')) {
        return Math.max(0, Number(item?.kgQty) || 0);
    }

    const piecesQty = Math.max(0, Number(item?.piecesQty) || 0);
    if (piecesQty > 0) {
        return piecesQty;
    }

    return Math.max(0, Number(item?.kgQty) || 0);
}

function getIncomingProductPieceQuantityForItem(item, product) {
    if (!shouldTrackProductPieces(product)) return 0;
    return Math.max(0, Number(item?.piecesQty) || 0);
}

function calculateIncomingReceiptProductTotals() {
    const totals = {};
    const pieceTotals = {};

    const applyEntry = (stockEntry, direction = 1) => {
        getIncomingReceiptItems(stockEntry).forEach(item => {
            const config = getIncomingReceiptItemConfig(item.key);
            const product = item.productId
                ? products.find(productEntry => productEntry.id === item.productId)
                : findIncomingProductByAliases(config?.aliases || []);

            if (!product) return;

            const quantity = getIncomingProductQuantityForItem(item, product);
            const pieceQuantity = getIncomingProductPieceQuantityForItem(item, product);
            totals[product.id] = (totals[product.id] || 0) + (direction * quantity);
            pieceTotals[product.id] = (pieceTotals[product.id] || 0) + (direction * pieceQuantity);
        });
    };

    getInventoryActiveStockSourceEntries(getTodayDateKey()).forEach(stockEntry => applyEntry(stockEntry, 1));
    getInventoryActiveSupplierReturnEntries(getTodayDateKey()).forEach(returnEntry => applyEntry(returnEntry, -1));

    return { quantityTotals: totals, pieceTotals };
}

function getIncomingProductSyncTargets(quantityTotals = {}, pieceTotals = {}) {
    const targetIds = new Set([
        ...Object.keys(quantityTotals || {}),
        ...Object.keys(pieceTotals || {})
    ]);

    INCOMING_RECEIPT_ITEM_CONFIGS.forEach(config => {
        const product = findIncomingProductByAliases(config.aliases || []);
        if (product?.id) {
            targetIds.add(product.id);
        }
    });

    products.forEach(product => {
        if (isCoreIncomingProduct(product) || (Number(product.incomingSyncedQty) || 0) !== 0 || (Number(product.incomingSyncedPieces) || 0) !== 0) {
            targetIds.add(product.id);
        }
    });

    return Array.from(targetIds)
        .map(productId => products.find(product => String(product.id) === String(productId)))
        .filter(Boolean);
}

function syncIncomingProductsStock(forceSave = false, options = {}) {
    const { quantityTotals, pieceTotals } = calculateIncomingReceiptProductTotals();
    const applyMissingAsDelta = Boolean(options.applyMissingAsDelta);
    const inventoryState = calculateIncomingInventoryState(getTodayDateKey());
    let changed = false;

    getIncomingProductSyncTargets(quantityTotals, pieceTotals).forEach(product => {
        const nextSynced = Number(quantityTotals[product.id]) || 0;
        const hasPrevSynced = product.incomingSyncedQty !== undefined
            && product.incomingSyncedQty !== null
            && Number.isFinite(Number(product.incomingSyncedQty));

        if (isCoreIncomingProduct(product)) {
            const stock = getProductStockDisplay(product, inventoryState);
            const nextQuantity = Math.max(0, Number(stock.quantity) || 0);
            if (Math.abs((Number(product.quantity) || 0) - nextQuantity) > 0.0001) {
                product.quantity = nextQuantity;
                changed = true;
            }
            if (Math.abs((Number(product.incomingSyncedQty) || 0) - nextSynced) > 0.0001 || !hasPrevSynced) {
                product.incomingSyncedQty = nextSynced;
                changed = true;
            }
            return;
        }

        const prevSynced = hasPrevSynced ? (Number(product.incomingSyncedQty) || 0) : 0;
        const delta = hasPrevSynced || applyMissingAsDelta ? nextSynced - prevSynced : 0;

        if (Math.abs(delta) > 0.0001) {
            product.quantity = Math.max(0, (Number(product.quantity) || 0) + delta);
            changed = true;
        }

        if (Math.abs((Number(product.incomingSyncedQty) || 0) - nextSynced) > 0.0001 || !hasPrevSynced) {
            product.incomingSyncedQty = nextSynced;
            changed = true;
        }


        if (shouldTrackProductPieces(product)) {
            const nextSyncedPieces = Number(pieceTotals[product.id]) || 0;
            const hasPrevSyncedPieces = product.incomingSyncedPieces !== undefined
                && product.incomingSyncedPieces !== null
                && Number.isFinite(Number(product.incomingSyncedPieces));
            const prevSyncedPieces = hasPrevSyncedPieces ? (Number(product.incomingSyncedPieces) || 0) : 0;
            const pieceDelta = hasPrevSyncedPieces || applyMissingAsDelta ? nextSyncedPieces - prevSyncedPieces : 0;

            if (Math.abs(pieceDelta) > 0.0001) {
                product.pieceQuantity = Math.max(0, getProductPieceQuantity(product) + pieceDelta);
                changed = true;
            }

            if (Math.abs((Number(product.incomingSyncedPieces) || 0) - nextSyncedPieces) > 0.0001 || !hasPrevSyncedPieces) {
                product.incomingSyncedPieces = nextSyncedPieces;
                changed = true;
            }
        }
    });

    if (changed || forceSave) {
        saveData('products', products);
    }

    return changed;
}

function getCashControlSettings() {
    const saved = readStorageJson('cashControlSettings', null);
    const shiftCashToLeave = Number(saved?.shiftCashToLeave);
    return {
        shiftCashToLeave: shiftCashToLeave >= 0 ? shiftCashToLeave : DEFAULT_SHIFT_CASH_TO_LEAVE,
        defaultReceiverWallet: sanitizeMoneyWalletId(saved?.defaultReceiverWallet || DEFAULT_MONEY_WALLET_ID)
    };
}

function saveCashControlSettings(settings) {
    saveData('cashControlSettings', settings);
}

function getConfiguredShiftCashToLeave() {
    return Number(getCashControlSettings().shiftCashToLeave || 0);
}

function getMoneyWalletLabel(walletId) {
    return MONEY_WALLETS.find(wallet => wallet.id === walletId)?.label || walletId || 'Не указано';
}

function getMoneyOperationTypeLabel(type) {
    switch (type) {
        case 'income': return 'Поступление';
        case 'expense': return 'Расход';
        case 'transfer': return 'Перемещение';
        case 'shift_transfer': return 'Передача смены';
        case 'supplier_payment': return 'Оплата поставщику';
        case 'debt_payment': return 'Погашение долга';
        default: return 'Операция';
    }
}

function getMoneyWalletOptionsHtml(selectedWallet = DEFAULT_MONEY_WALLET_ID, options = {}) {
    const includeEmpty = options.includeEmpty === true;
    const emptyLabel = options.emptyLabel || 'Не выбрано';
    return `${includeEmpty ? `<option value="">${escapeHtml(emptyLabel)}</option>` : ''}${MONEY_WALLETS.map(wallet => `
        <option value="${wallet.id}" ${wallet.id === selectedWallet ? 'selected' : ''}>${escapeHtml(wallet.label)}</option>
    `).join('')}`;
}

function populateMoneyWalletSelects() {
    document.querySelectorAll('[data-money-wallet-select]').forEach(select => {
        const selected = select.value || select.getAttribute('data-default-wallet') || DEFAULT_MONEY_WALLET_ID;
        const includeEmpty = select.getAttribute('data-include-empty') === 'true';
        select.innerHTML = getMoneyWalletOptionsHtml(selected, { includeEmpty });
    });
}

function recordMoneyTransaction(entry = {}) {
    const transaction = normalizeMoneyTransaction({
        id: generateId(),
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: getActorLabel(),
        ...entry
    });

    if (transaction.amount <= 0) return null;

    moneyTransactions.unshift(transaction);
    saveData('moneyTransactions', moneyTransactions);
    return transaction;
}

function getSupplierOutstandingTotal() {
    return incomingReceipts.reduce((sum, receipt) => sum + getReceiptOutstandingAmount(receipt), 0);
}

function getInventoryStockSourceEntries() {
    return [
        ...(Array.isArray(initialStockEntries) ? initialStockEntries : []).map(normalizeInitialStockEntry),
        ...(Array.isArray(incomingReceipts) ? incomingReceipts : []).map(normalizeIncomingReceipt)
    ];
}

function getInventoryBaselineDateKey(dateKey = getTodayDateKey()) {
    const safeDateKey = dateKey || getTodayDateKey();
    const initialBaselines = (Array.isArray(initialStockEntries) ? initialStockEntries : [])
        .map(normalizeInitialStockEntry)
        .filter(entry => isDateKeyOnOrBefore(entry.dateKey, safeDateKey))
        .map(entry => entry.dateKey)
        .filter(Boolean)
        .sort(compareDateKeys);

    if (initialBaselines.length) {
        return initialBaselines[initialBaselines.length - 1];
    }

    const sourceDates = getInventoryStockSourceEntries()
        .filter(entry => isDateKeyOnOrBefore(entry.dateKey, safeDateKey))
        .map(entry => entry.dateKey)
        .filter(Boolean)
        .sort(compareDateKeys);

    return sourceDates[0] || '';
}

function isInventoryRecordInActivePeriod(record = {}, safeDateKey = getTodayDateKey(), baselineDateKey = '') {
    return isRecordOnOrBeforeDateKey(record, safeDateKey)
        && (!baselineDateKey || isRecordOnOrAfterDateKey(record, baselineDateKey));
}

function getInventoryActiveStockSourceEntries(dateKey = getTodayDateKey()) {
    const safeDateKey = dateKey || getTodayDateKey();
    const baselineDateKey = getInventoryBaselineDateKey(safeDateKey);
    return getInventoryStockSourceEntries()
        .filter(entry => isInventoryRecordInActivePeriod(entry, safeDateKey, baselineDateKey));
}

function getInventoryActiveSupplierReturnEntries(dateKey = getTodayDateKey()) {
    const safeDateKey = dateKey || getTodayDateKey();
    const baselineDateKey = getInventoryBaselineDateKey(safeDateKey);
    return getSupplierReturnEntries()
        .filter(entry => isInventoryRecordInActivePeriod(entry, safeDateKey, baselineDateKey));
}

function getInventoryActiveInvoices(dateKey = getTodayDateKey()) {
    const safeDateKey = dateKey || getTodayDateKey();
    const baselineDateKey = getInventoryBaselineDateKey(safeDateKey);
    return invoices.filter(invoice => isInventoryRecordInActivePeriod(invoice, safeDateKey, baselineDateKey));
}

function getSupplierReturnEntries() {
    return (Array.isArray(supplierReturns) ? supplierReturns : []).map(normalizeSupplierReturn);
}

function getWarehousePurchaseValue() {
    return getWarehouseValueByUnifiedStock();
}

function getCurrentWorkerCashBalance() {
    const currentShift = getCurrentShift();
    if (currentShift) {
        return calculateShiftSummary(currentShift).expectedCash;
    }

    const lastClosedShift = [...shiftSessions]
        .filter(shift => shift.status === 'closed')
        .sort((left, right) => new Date(right.closedAt || right.openedAt || 0) - new Date(left.closedAt || left.openedAt || 0))[0];

    if (lastClosedShift) {
        return Math.max(0, Number(lastClosedShift.cashLeftInRegister ?? lastClosedShift.cashToLeaveTarget ?? lastClosedShift.startCash) || 0);
    }

    return getConfiguredShiftCashToLeave();
}

function calculateMoneyWalletBalances() {
    const balances = Object.fromEntries(MONEY_WALLETS.map(wallet => [wallet.id, 0]));
    let workerAdjustment = 0;

    moneyTransactions.forEach(rawTransaction => {
        const transaction = normalizeMoneyTransaction(rawTransaction);
        if (transaction.status === 'cancelled') return;

        const amount = Number(transaction.amount) || 0;
        if (amount <= 0) return;

        const fromWallet = transaction.fromWallet;
        const toWallet = transaction.toWallet;

        if (['expense', 'supplier_payment'].includes(transaction.type)) {
            if (fromWallet === 'worker_cash') {
                workerAdjustment -= amount;
            } else if (fromWallet && balances[fromWallet] != null) {
                balances[fromWallet] -= amount;
            }
            return;
        }

        if (['income', 'debt_payment'].includes(transaction.type)) {
            if (toWallet === 'worker_cash') {
                if (!(transaction.type === 'debt_payment' && transaction.shiftId)) {
                    workerAdjustment += amount;
                }
            } else if (toWallet && balances[toWallet] != null) {
                balances[toWallet] += amount;
            }
            return;
        }

        if (['transfer', 'shift_transfer'].includes(transaction.type)) {
            if (fromWallet === 'worker_cash') {
                if (transaction.type !== 'shift_transfer') {
                    workerAdjustment -= amount;
                }
            } else if (fromWallet && balances[fromWallet] != null) {
                balances[fromWallet] -= amount;
            }

            if (toWallet === 'worker_cash') {
                if (transaction.type !== 'shift_transfer') {
                    workerAdjustment += amount;
                }
            } else if (toWallet && balances[toWallet] != null) {
                balances[toWallet] += amount;
            }
        }
    });

    balances.worker_cash = Math.max(0, getCurrentWorkerCashBalance() + workerAdjustment);
    return balances;
}

function getMoneyControlSummary() {
    const walletBalances = calculateMoneyWalletBalances();
    const walletTotal = Object.entries(walletBalances).reduce((sum, [walletId, amount]) => {
        if (MONEY_CONTROL_EXCLUDED_WALLET_IDS.has(walletId)) return sum;
        return sum + (Number(amount) || 0);
    }, 0);
    const excludedWalletTotal = Object.entries(walletBalances).reduce((sum, [walletId, amount]) => {
        if (!MONEY_CONTROL_EXCLUDED_WALLET_IDS.has(walletId)) return sum;
        return sum + (Number(amount) || 0);
    }, 0);
    const clientDebt = debts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0);
    const warehouseValue = getWarehousePurchaseValue();
    const supplierDebt = getSupplierOutstandingTotal();

    return {
        walletBalances,
        walletTotal,
        excludedWalletTotal,
        clientDebt,
        warehouseValue,
        supplierDebt,
        controlledTotal: walletTotal + clientDebt + warehouseValue - supplierDebt
    };
}

function saveMoneySettings() {
    const shiftCashToLeave = Number(document.getElementById('money-shift-cash-to-leave')?.value || 0);
    if (!(shiftCashToLeave >= 0)) {
        alert('Введите корректную сумму, которую оставлять в кассе');
        return;
    }

    const defaultReceiverWallet = sanitizeMoneyWalletId(document.getElementById('money-default-receiver')?.value || DEFAULT_MONEY_WALLET_ID);
    saveCashControlSettings({ shiftCashToLeave, defaultReceiverWallet });
    syncShiftCashToLeaveInput();
    loadMoneyData();
    alert('Настройки денег сохранены');
}

function syncShiftCashToLeaveInput() {
    const input = document.getElementById('shift-cash-to-leave');
    if (input) {
        input.value = getConfiguredShiftCashToLeave();
    }
}

function updateMoneyOperationForm() {
    const type = document.getElementById('money-operation-type')?.value || 'expense';
    const fromWrap = document.getElementById('money-operation-from-wrap');
    const toWrap = document.getElementById('money-operation-to-wrap');
    const categoryInput = document.getElementById('money-operation-category');

    if (fromWrap) fromWrap.style.display = ['expense', 'transfer'].includes(type) ? '' : 'none';
    if (toWrap) toWrap.style.display = ['income', 'transfer'].includes(type) ? '' : 'none';
    if (categoryInput) {
        const defaultCategory = type === 'expense' ? 'Другое' : type === 'income' ? 'Пополнение' : 'Перемещение';
        if (categoryInput.dataset.lastMoneyType !== type || !categoryInput.value) {
            categoryInput.value = defaultCategory;
        }
        categoryInput.dataset.lastMoneyType = type;
    }
}

function resetMoneyOperationForm() {
    const form = document.getElementById('money-operation-form');
    if (form) form.reset();
    populateMoneyWalletSelects();
    populateMoneyHistoryWalletFilter();
    updateMoneyOperationForm();
}

function saveMoneyOperation() {
    const type = document.getElementById('money-operation-type')?.value || 'expense';
    const amount = Number(document.getElementById('money-operation-amount')?.value || 0);
    const fromWallet = sanitizeMoneyWalletId(document.getElementById('money-operation-from')?.value || DEFAULT_MONEY_WALLET_ID, '');
    const toWallet = sanitizeMoneyWalletId(document.getElementById('money-operation-to')?.value || DEFAULT_MONEY_WALLET_ID, '');
    const category = document.getElementById('money-operation-category')?.value?.trim() || '';
    const counterparty = document.getElementById('money-operation-counterparty')?.value?.trim() || '';
    const note = document.getElementById('money-operation-note')?.value?.trim() || '';

    if (!(amount > 0)) {
        alert('Введите сумму операции');
        return;
    }

    if (type === 'expense' && !fromWallet) {
        alert('Выберите, откуда ушли деньги');
        return;
    }

    if (type === 'income' && !toWallet) {
        alert('Выберите, куда пришли деньги');
        return;
    }

    if (type === 'transfer') {
        if (!fromWallet || !toWallet) {
            alert('Выберите оба кошелька для перемещения');
            return;
        }
        if (fromWallet === toWallet) {
            alert('Нельзя переместить деньги в тот же кошелёк');
            return;
        }
    }

    const transaction = recordMoneyTransaction({
        type,
        amount,
        fromWallet: ['expense', 'transfer'].includes(type) ? fromWallet : '',
        toWallet: ['income', 'transfer'].includes(type) ? toWallet : '',
        category,
        counterparty,
        note
    });

    if (transaction) {
        logActivity('money_operation', {
            moneyTransactionId: transaction.id,
            moneyType: transaction.type,
            amount: transaction.amount,
            fromWallet: transaction.fromWallet,
            toWallet: transaction.toWallet,
            category: transaction.category,
            counterparty: transaction.counterparty
        });
    }

    resetMoneyOperationForm();
    loadMoneyData();
    updateStats();
}

function normalizeMoneyHistorySearch(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();
}

function getMoneyHistoryFiltersFromDom() {
    return {
        search: document.getElementById('money-history-search')?.value || '',
        type: document.getElementById('money-history-type-filter')?.value || 'all',
        wallet: document.getElementById('money-history-wallet-filter')?.value || 'all',
        dateMode: document.getElementById('money-history-date-mode')?.value || 'all',
        dateExact: document.getElementById('money-history-date-exact')?.value || '',
        dateFrom: document.getElementById('money-history-date-from')?.value || '',
        dateTo: document.getElementById('money-history-date-to')?.value || '',
        pageSize: document.getElementById('money-history-page-size')?.value || '20'
    };
}

function doesMoneyTransactionMatchFilters(transaction = {}, filters = {}) {
    const normalized = normalizeMoneyTransaction(transaction);
    const search = normalizeMoneyHistorySearch(filters.search);
    const type = filters.type || 'all';
    const wallet = filters.wallet || 'all';
    const dateMode = filters.dateMode || 'all';
    const dateKey = getRecordDateKey({ dateKey: normalized.dateKey, date: normalized.date });

    if (type !== 'all' && normalized.type !== type) return false;
    if (wallet !== 'all' && normalized.fromWallet !== wallet && normalized.toWallet !== wallet) return false;
    if (dateMode === 'day' && filters.dateExact && dateKey !== filters.dateExact) return false;
    if (dateMode === 'range') {
        if (filters.dateFrom && compareDateKeys(dateKey, filters.dateFrom) < 0) return false;
        if (filters.dateTo && compareDateKeys(dateKey, filters.dateTo) > 0) return false;
    }
    if (dateMode === 'after' && filters.dateFrom && compareDateKeys(dateKey, filters.dateFrom) < 0) return false;
    if (dateMode === 'all') {
        if (filters.dateFrom && compareDateKeys(dateKey, filters.dateFrom) < 0) return false;
        if (filters.dateTo && compareDateKeys(dateKey, filters.dateTo) > 0) return false;
    }

    if (!search) return true;

    const haystack = normalizeMoneyHistorySearch([
        normalized.id,
        getMoneyOperationTypeLabel(normalized.type),
        getMoneyWalletLabel(normalized.fromWallet),
        getMoneyWalletLabel(normalized.toWallet),
        normalized.category,
        normalized.counterparty,
        normalized.note,
        normalized.cancelReason,
        normalized.amount
    ].filter(Boolean).join(' '));

    return haystack.includes(search);
}

function getMoneyHistoryPageData(transactions = [], filters = {}, requestedPage = 1) {
    const pageSize = filters.pageSize || '20';
    const filtered = (Array.isArray(transactions) ? transactions : [])
        .map(normalizeMoneyTransaction)
        .filter(transaction => doesMoneyTransactionMatchFilters(transaction, filters))
        .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

    if (pageSize === 'all') {
        return {
            items: filtered,
            total: filtered.length,
            page: 1,
            totalPages: 1,
            pageSize,
            startIndex: filtered.length ? 0 : -1,
            endIndex: filtered.length
        };
    }

    const numericPageSize = Math.max(1, Number(pageSize) || 20);
    const totalPages = Math.max(1, Math.ceil(filtered.length / numericPageSize));
    const page = Math.min(Math.max(1, Number(requestedPage) || 1), totalPages);
    const startIndex = (page - 1) * numericPageSize;
    const endIndex = Math.min(startIndex + numericPageSize, filtered.length);

    return {
        items: filtered.slice(startIndex, endIndex),
        total: filtered.length,
        page,
        totalPages,
        pageSize: numericPageSize,
        startIndex: filtered.length ? startIndex : -1,
        endIndex
    };
}

function populateMoneyHistoryWalletFilter() {
    const walletFilter = document.getElementById('money-history-wallet-filter');
    if (!walletFilter) return;

    const selected = walletFilter.value || 'all';
    walletFilter.innerHTML = `
        <option value="all">Все кошельки</option>
        ${MONEY_WALLETS.map(wallet => `
            <option value="${wallet.id}">${escapeHtml(wallet.label)}</option>
        `).join('')}
    `;
    walletFilter.value = MONEY_WALLETS.some(wallet => wallet.id === selected) ? selected : 'all';
}

function renderMoneyHistory() {
    const history = document.getElementById('money-history');
    const countLabel = document.getElementById('money-history-count');
    const pagination = document.getElementById('money-history-pagination');
    if (!history) return;

    const filters = getMoneyHistoryFiltersFromDom();
    const pageData = getMoneyHistoryPageData(moneyTransactions, filters, moneyHistoryPage);
    moneyHistoryPage = pageData.page;

    if (countLabel) {
        const shownText = pageData.total
            ? `${pageData.startIndex + 1}-${pageData.endIndex} из ${pageData.total}`
            : '0 операций';
        countLabel.textContent = `${shownText} • всего ${moneyTransactions.length}`;
    }

    history.innerHTML = pageData.items.length ? `
        <div class="table-responsive">
            <table class="invoice-items-table money-history-table">
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Операция</th>
                        <th>Откуда</th>
                        <th>Куда</th>
                        <th>Сумма</th>
                        <th>Категория</th>
                        <th>Комментарий</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageData.items.map(transaction => {
                        const cancelled = transaction.status === 'cancelled';
                        const commentText = [
                            transaction.counterparty,
                            transaction.note,
                            cancelled ? `Отменена${transaction.cancelReason ? `: ${transaction.cancelReason}` : ''}` : ''
                        ].filter(Boolean).join(' • ') || '-';

                        return `
                        <tr class="${cancelled ? 'is-cancelled' : ''}">
                            <td>${formatShortDateTime(transaction.date)}</td>
                            <td>${escapeHtml(getMoneyOperationTypeLabel(transaction.type))}${cancelled ? '<br><small>Отменена</small>' : ''}</td>
                            <td>${transaction.fromWallet ? escapeHtml(getMoneyWalletLabel(transaction.fromWallet)) : '-'}</td>
                            <td>${transaction.toWallet ? escapeHtml(getMoneyWalletLabel(transaction.toWallet)) : '-'}</td>
                            <td><strong>${cancelled ? `<s>${formatCurrency(transaction.amount)}</s>` : formatCurrency(transaction.amount)}</strong></td>
                            <td>${escapeHtml(transaction.category || '-')}</td>
                            <td>${escapeHtml(commentText)}</td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    ` : '<p class="text-center">Под выбранные фильтры денежных операций не найдено</p>';

    if (!pagination) return;
    if (filters.pageSize === 'all' || pageData.totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    pagination.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="changeMoneyHistoryPage(-1)" ${pageData.page <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Назад
        </button>
        <span>Страница ${pageData.page} из ${pageData.totalPages}</span>
        <button class="btn btn-secondary btn-sm" onclick="changeMoneyHistoryPage(1)" ${pageData.page >= pageData.totalPages ? 'disabled' : ''}>
            Вперед <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

function handleMoneyHistoryFilterChange() {
    moneyHistoryPage = 1;
    renderMoneyHistory();
}

function syncMoneyHistoryDateFields() {
    const mode = document.getElementById('money-history-date-mode')?.value || 'all';
    const exactWrap = document.getElementById('money-history-date-exact-wrap');
    const fromWrap = document.getElementById('money-history-date-from-wrap');
    const toWrap = document.getElementById('money-history-date-to-wrap');

    if (exactWrap) exactWrap.style.display = mode === 'day' ? 'grid' : 'none';
    if (fromWrap) fromWrap.style.display = (mode === 'range' || mode === 'after') ? 'grid' : 'none';
    if (toWrap) toWrap.style.display = mode === 'range' ? 'grid' : 'none';
}

function handleMoneyHistoryDateModeChange() {
    syncMoneyHistoryDateFields();
    handleMoneyHistoryFilterChange();
}

function changeMoneyHistoryPage(delta) {
    moneyHistoryPage += Number(delta) || 0;
    renderMoneyHistory();
}

function resetMoneyHistoryFilters() {
    const defaults = {
        'money-history-search': '',
        'money-history-type-filter': 'all',
        'money-history-wallet-filter': 'all',
        'money-history-date-mode': 'all',
        'money-history-date-exact': '',
        'money-history-date-from': '',
        'money-history-date-to': '',
        'money-history-page-size': '20'
    };

    Object.entries(defaults).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    });

    syncMoneyHistoryDateFields();
    handleMoneyHistoryFilterChange();
}

function loadMoneyData() {
    const overview = document.getElementById('money-overview');
    const history = document.getElementById('money-history');
    const settingsInput = document.getElementById('money-shift-cash-to-leave');
    const receiverSelect = document.getElementById('money-default-receiver');
    const categorySelect = document.getElementById('money-operation-category');

    populateMoneyWalletSelects();
    populateMoneyHistoryWalletFilter();
    syncMoneyHistoryDateFields();

    if (settingsInput) settingsInput.value = getConfiguredShiftCashToLeave();
    if (receiverSelect) receiverSelect.value = getCashControlSettings().defaultReceiverWallet;
    if (categorySelect && !categorySelect.options.length) {
        categorySelect.innerHTML = MONEY_EXPENSE_CATEGORIES
            .map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
            .join('');
    }
    updateMoneyOperationForm();

    if (!overview || !history) return;

    const summary = getMoneyControlSummary();
    const walletCards = MONEY_WALLETS.map(wallet => {
        const amount = Number(summary.walletBalances[wallet.id]) || 0;
        const excludedNote = MONEY_CONTROL_EXCLUDED_WALLET_IDS.has(wallet.id)
            ? '<small>Не входит в общий контроль</small>'
            : '';
        return `
            <div class="money-card ${MONEY_CONTROL_EXCLUDED_WALLET_IDS.has(wallet.id) ? 'money-card-muted' : ''}">
                <span><i class="fas fa-${wallet.icon}"></i> ${escapeHtml(wallet.label)}</span>
                <strong>${formatCurrency(amount)}</strong>
                ${excludedNote}
            </div>
        `;
    }).join('');

    overview.innerHTML = `
        <div class="money-overview-grid">
            ${walletCards}
            <div class="money-card money-card-info">
                <span>Клиенты должны</span>
                <strong>${formatCurrency(summary.clientDebt)}</strong>
            </div>
            <div class="money-card money-card-info">
                <span>Товар по закупке</span>
                <strong>${formatCurrency(summary.warehouseValue)}</strong>
            </div>
            <div class="money-card money-card-warning">
                <span>Долг поставщику</span>
                <strong>-${formatCurrency(summary.supplierDebt)}</strong>
            </div>
            <div class="money-card money-card-total">
                <span>Итого под контролем</span>
                <strong>${formatCurrency(summary.controlledTotal)}</strong>
            </div>
        </div>
    `;

    renderMoneyHistory();
}

function getOpenIncomingReceiptsOldestFirst() {
    return [...incomingReceipts]
        .filter(receipt => getReceiptOutstandingAmount(receipt) > 0)
        .sort(compareIncomingReceiptByAge);
}

function applyIncomingReceiptPayment(receipt, amount, note, meta = {}) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (!receipt || safeAmount <= 0) return null;

    const payment = normalizeIncomingPayment({
        amount: safeAmount,
        note,
        date: new Date().toISOString(),
        paidBy: sessionAccess.userName || 'Руководитель',
        ...meta
    });

    receipt.paidAmount = Math.max(0, Number(receipt.paidAmount) || 0) + safeAmount;
    if (!Array.isArray(receipt.paymentHistory)) {
        receipt.paymentHistory = [];
    }
    receipt.paymentHistory.push(payment);
    return payment;
}

function distributeSupplierPaymentAcrossReceipts(amount, note) {
    let remaining = Math.max(0, Number(amount) || 0);
    const allocations = [];

    getOpenIncomingReceiptsOldestFirst().forEach(receipt => {
        if (remaining <= 0) return;
        const outstanding = getReceiptOutstandingAmount(receipt);
        if (outstanding <= 0) return;

        const appliedAmount = Math.min(remaining, outstanding);
        const allocationNote = note
            ? `Общая оплата поставщику. ${note}`
            : 'Общая оплата поставщику';
        applyIncomingReceiptPayment(receipt, appliedAmount, allocationNote, {
            allocationType: 'aggregate',
            sourceReceiptId: receipt.id
        });
        allocations.push({
            receiptId: receipt.id,
            invoiceNumber: receipt.invoiceNumber || '',
            supplierName: receipt.supplierName || 'Поставщик',
            amount: appliedAmount
        });
        remaining -= appliedAmount;
    });

    return {
        allocations,
        appliedAmount: (Number(amount) || 0) - remaining,
        remaining
    };
}

function getIncomingRawLabel(key) {
    const config = INCOMING_RAW_FIELDS.find(field => field.key === key);
    return config ? config.label : key;
}

function getCurrentSellerNameForIncoming() {
    const currentShift = getCurrentShift();
    if (isSellerMode() && currentShift?.sellerName) return currentShift.sellerName;
    return sessionAccess.userName || (isSellerMode() ? 'Продавец' : 'Руководитель');
}

function isTobaccoInvoiceItem(item = {}) {
    const product = products.find(productEntry => productEntry.id === item.productId);
    return isTobaccoProduct(product) || isTobaccoProduct({ name: item.productName, category: '' }) || Boolean(item.tobaccoType);
}

function isRoastInvoiceItem(item = {}) {
    const product = products.find(productEntry => productEntry.id === item.productId);
    return isRoastProduct(product) || isRoastProduct({ name: item.productName, category: '' }) || Boolean(item.roastType || item.roast);
}

function getInvoiceItemControlPieces(item = {}) {
    if (isRoastInvoiceItem(item)) {
        const kgCount = Number(item.kgItemCount) || 0;
        if (kgCount > 0) return kgCount;

        const roastParts = getRoastParts(item.roast);
        const packCount = roastParts.reduce((sum, part) => sum + (Number(part.packs) || 0), 0);
        if (packCount > 0) return packCount * 5;
    }

    return Math.max(0, Number(item.quantity) || 0);
}

function createOpenedStockState() {
    return {
        tobacco: 0,
        roast: 0,
        assembledTobaccoPacks: Object.fromEntries(TOBACCO_TYPE_CONFIGS.map(config => [config.type, 0])),
        assembledRoastPacks: Object.fromEntries(ROAST_TYPE_CONFIGS.map(config => [config.type, 0]))
    };
}

function calculateOpenedStockState(dateKey = getTodayDateKey(), options = {}) {
    const safeDateKey = dateKey || getTodayDateKey();
    const excludedInvoiceId = options.excludeInvoiceId || null;
    const state = createOpenedStockState();

    openedStockEvents
        .map(normalizeOpenedStockEvent)
        .filter(event => isDateKeyOnOrBefore(event.dateKey, safeDateKey))
        .filter(event => !excludedInvoiceId || event.invoiceId !== excludedInvoiceId)
        .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')))
        .forEach(event => {
            state.tobacco += Number(event.tobaccoDelta) || 0;
            state.roast += Number(event.roastDelta) || 0;

            if (event.type === 'assemble_tobacco') {
                Object.entries(event.tobaccoPacks || {}).forEach(([type, count]) => {
                    state.assembledTobaccoPacks[type] = (Number(state.assembledTobaccoPacks[type]) || 0) + (Number(count) || 0);
                });
            }
            if (event.type === 'assemble_roast') {
                Object.entries(event.roastPacks || {}).forEach(([type, count]) => {
                    state.assembledRoastPacks[type] = (Number(state.assembledRoastPacks[type]) || 0) + (Number(count) || 0);
                });
            }
        });

    state.tobacco = Math.max(0, state.tobacco);
    state.roast = Math.max(0, state.roast);
    return state;
}

function applyOpenedStockEventToState(state, event) {
    if (!state || !event) return state;

    state.tobacco = Math.max(0, (Number(state.tobacco) || 0) + (Number(event.tobaccoDelta) || 0));
    state.roast = Math.max(0, (Number(state.roast) || 0) + (Number(event.roastDelta) || 0));

    if (event.type === 'assemble_tobacco') {
        Object.entries(event.tobaccoPacks || {}).forEach(([type, count]) => {
            state.assembledTobaccoPacks[type] = (Number(state.assembledTobaccoPacks[type]) || 0) + (Number(count) || 0);
        });
    }
    if (event.type === 'assemble_roast') {
        Object.entries(event.roastPacks || {}).forEach(([type, count]) => {
            state.assembledRoastPacks[type] = (Number(state.assembledRoastPacks[type]) || 0) + (Number(count) || 0);
        });
    }

    return state;
}

function buildPartialOpenedStockEvent(item, invoice, runningState, index) {
    if (!item || item.packageSaleMode !== 'partial') return null;

    const soldPieces = getInvoiceItemControlPieces(item);
    if (!(soldPieces > 0)) return null;

    const date = invoice.date || new Date().toISOString();
    const common = {
        id: generateId(),
        type: 'partial_sale',
        date,
        dateKey: toDateKey(date),
        createdAt: new Date().toISOString(),
        createdBy: getActorLabel(),
        shiftId: invoice.shiftId || null,
        invoiceId: invoice.id,
        itemId: `${invoice.id}-${index}`,
        note: `Продажа не целого пакета: ${item.productName || 'товар'}`
    };

    if (isTobaccoInvoiceItem(item)) {
        const packSize = TOBACCO_PACK_SIZE;
        const openedPackCount = Math.ceil(soldPieces / packSize);
        const tobaccoDelta = (openedPackCount * packSize) - soldPieces;
        runningState.tobacco = Math.max(0, (Number(runningState.tobacco) || 0) + tobaccoDelta);
        item.openedTobaccoPackCount = openedPackCount;
        item.openedStockDelta = tobaccoDelta;

        return normalizeOpenedStockEvent({
            ...common,
            productKind: 'tobacco',
            packType: item.tobaccoType || AUTO_TOBACCO_PURE_TYPE,
            tobaccoDelta,
            tobaccoPacks: openedPackCount > 0 ? { [item.tobaccoType || AUTO_TOBACCO_PURE_TYPE]: openedPackCount } : {}
        });
    }

    if (isRoastInvoiceItem(item)) {
        const packSize = 5;
        const openedPackCount = Math.ceil(soldPieces / packSize);
        const roastDelta = (openedPackCount * packSize) - soldPieces;
        const openedType = AUTO_ROAST_PURE_TYPE;
        runningState.roast = Math.max(0, (Number(runningState.roast) || 0) + roastDelta);
        item.openedRoastPackCount = openedPackCount;
        item.openedStockDelta = roastDelta;

        return normalizeOpenedStockEvent({
            ...common,
            productKind: 'roast',
            packType: openedType,
            roastDelta,
            roastPacks: openedPackCount > 0 ? { [openedType]: openedPackCount } : {}
        });
    }

    return null;
}

function rebuildPartialSaleOpenedStockEvents() {
    const manualEvents = (Array.isArray(openedStockEvents) ? openedStockEvents : [])
        .map(normalizeOpenedStockEvent)
        .filter(event => event.type !== 'partial_sale' || !event.invoiceId);
    const timeline = [
        ...manualEvents.map(event => ({ kind: 'event', date: event.date, event })),
        ...invoices.map((invoice, index) => ({
            kind: 'invoice',
            date: invoice.date || invoice.createdAt || new Date().toISOString(),
            invoice,
            index
        }))
    ].sort((left, right) => {
        const dateCompare = String(left.date || '').localeCompare(String(right.date || ''));
        if (dateCompare !== 0) return dateCompare;
        return (left.index || 0) - (right.index || 0);
    });

    const runningState = createOpenedStockState();
    const rebuiltEvents = [];

    timeline.forEach(entry => {
        if (entry.kind === 'event') {
            rebuiltEvents.push(entry.event);
            applyOpenedStockEventToState(runningState, entry.event);
            return;
        }

        (entry.invoice.items || []).forEach((item, itemIndex) => {
            delete item.openedTobaccoPackCount;
            delete item.openedRoastPackCount;
            delete item.openedStockDelta;

            const event = buildPartialOpenedStockEvent(item, entry.invoice, runningState, itemIndex);
            if (event) {
                rebuiltEvents.push(event);
            }
        });
    });

    openedStockEvents = rebuiltEvents;
    saveData('openedStockEvents', openedStockEvents);
    return rebuiltEvents;
}

function applyOpenedStockEventsForInvoice(invoice) {
    if (!invoice) return [];

    openedStockEvents = openedStockEvents.filter(event => event.invoiceId !== invoice.id);
    const runningState = calculateOpenedStockState(toDateKey(invoice.date || new Date()), { excludeInvoiceId: invoice.id });
    const events = [];

    (invoice.items || []).forEach((item, index) => {
        delete item.openedTobaccoPackCount;
        delete item.openedRoastPackCount;
        delete item.openedStockDelta;

        const event = buildPartialOpenedStockEvent(item, invoice, runningState, index);
        if (event) events.push(event);
    });

    openedStockEvents.push(...events);
    saveData('openedStockEvents', openedStockEvents);
    return events;
}

function removeOpenedStockEventsForInvoice(invoiceId) {
    const before = openedStockEvents.length;
    openedStockEvents = openedStockEvents.filter(event => event.invoiceId !== invoiceId);
    if (openedStockEvents.length !== before) {
        saveData('openedStockEvents', openedStockEvents);
    }
}

function getPackSalesFromInvoiceItem(item) {
    const result = createCombinedPackSalesSummary();
    if (!item) return result;

    if (isTobaccoInvoiceItem(item)) {
        getTobaccoSalePartsFromItem(item).forEach(part => {
            const packSize = getPackSizeByKind('tobacco', part.type);
            const packCount = Math.max(Number(part.packCount) || 0, Math.ceil((Number(part.pieces) || 0) / packSize));
            addPackTypeCount(result.tobacco, part.type, packCount, AUTO_TOBACCO_PURE_TYPE);
        });
        result.mixed += result.tobacco.mixed;
        result.pure += result.tobacco.pure;
        result.total += result.tobacco.total;
        return result;
    }

    if (isRoastInvoiceItem(item)) {
        getRoastSalePartsFromItem(item).forEach(part => {
            const packSize = getPackSizeByKind('roast', part.type);
            const packCount = Math.max(Number(part.packCount) || 0, Math.ceil((Number(part.pieces) || 0) / packSize));
            addPackTypeCount(result.roast, part.type, packCount, AUTO_ROAST_PURE_TYPE);
        });
        result.mixed += result.roast.mixed;
        result.pure += result.roast.pure;
        result.total += result.roast.total;
        return result;
    }

    const productName = String(item.productName || '').toLowerCase();
    if (productName.includes('не мешан') || productName.includes('немешан')) {
        result.pure += Number(item.quantity) || 0;
    } else if (productName.includes('мешан')) {
        result.mixed += Number(item.quantity) || 0;
    }
    result.total = result.mixed + result.pure;

    return result;
}

function getPackSalesFromInvoice(invoice) {
    return (invoice?.items || []).reduce((totals, item) => {
        const itemSales = getPackSalesFromInvoiceItem(item);
        mergePackSalesSummaries(totals, itemSales);
        return totals;
    }, createCombinedPackSalesSummary());
}

function calculateRemainingPackBreakdown(producedByType = {}, soldCounter = {}, pureType = '', mixedTypes = []) {
    const byType = {};
    const allTypes = new Set([
        ...Object.keys(producedByType || {}),
        ...Object.keys(soldCounter?.byType || {}),
        pureType,
        ...mixedTypes
    ].filter(Boolean));

    allTypes.forEach(type => {
        byType[type] = Math.max(0, (Number(producedByType[type]) || 0) - (Number(soldCounter?.byType?.[type]) || 0));
    });

    const producedTotal = Object.values(producedByType || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
    const soldTotal = Number(soldCounter?.total) || Object.values(soldCounter?.byType || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
    const targetRemainingTotal = Math.max(0, producedTotal - soldTotal);
    let currentRemainingTotal = Object.values(byType).reduce((sum, count) => sum + (Number(count) || 0), 0);

    if (currentRemainingTotal > targetRemainingTotal) {
        let excess = currentRemainingTotal - targetRemainingTotal;
        const reductionOrder = [
            pureType,
            ...[...allTypes].filter(type => type !== pureType)
        ].filter(Boolean);

        reductionOrder.forEach(type => {
            if (excess <= 0) return;
            const current = Number(byType[type]) || 0;
            const reduction = Math.min(current, excess);
            byType[type] = Math.max(0, current - reduction);
            excess -= reduction;
        });
    }

    const pure = Math.max(0, Number(byType[pureType]) || 0);
    const mixed = [...allTypes]
        .filter(type => type !== pureType)
        .reduce((sum, type) => sum + (Number(byType[type]) || 0), 0);

    return {
        byType,
        mixed,
        pure,
        total: mixed + pure
    };
}

function createPackTypeMap(configs = []) {
    return Object.fromEntries(configs.map(config => [config.type, 0]));
}

function cleanPackTypeMap(byType = {}, configs = []) {
    const result = createPackTypeMap(configs);
    Object.entries(byType || {}).forEach(([type, count]) => {
        result[type] = Math.max(0, Number(count) || 0);
    });
    return result;
}

function summarizePackTypeMap(byType = {}, configs = [], pureType = '') {
    const cleanByType = cleanPackTypeMap(byType, configs);
    const summary = {
        mixed: 0,
        pure: 0,
        total: 0,
        byType: cleanByType
    };

    Object.entries(cleanByType).forEach(([type, count]) => {
        const safeCount = Math.max(0, Number(count) || 0);
        summary.total += safeCount;
        if (type === pureType) {
            summary.pure += safeCount;
        } else {
            summary.mixed += safeCount;
        }
    });

    return summary;
}

function getPackSizeByKind(kind, type) {
    const config = kind === 'roast' ? getRoastTypeConfig(type) : getTobaccoTypeConfig(type);
    const size = (Number(config?.good) || 0) + (Number(config?.defect) || 0);
    return size > 0 ? size : (kind === 'roast' ? 5 : TOBACCO_PACK_SIZE);
}

function moveRawRemainderToOpened(categoryState, kind = 'tobacco') {
    if (!categoryState) return;

    const openedType = kind === 'roast' ? AUTO_ROAST_PURE_TYPE : AUTO_TOBACCO_PURE_TYPE;
    const rawGood = Math.max(0, Number(categoryState.rawRemaining?.good) || 0);
    const rawDefect = Math.max(0, Number(categoryState.rawRemaining?.defect) || 0);
    const openPieces = rawGood + rawDefect;

    if (!(openPieces > 0)) return;

    if (!categoryState.openedRemaining) {
        const configs = kind === 'roast' ? ROAST_TYPE_CONFIGS : TOBACCO_TYPE_CONFIGS;
        categoryState.openedRemaining = { total: 0, byType: createPackTypeMap(configs) };
    }
    if (!categoryState.openedRemaining.byType) {
        categoryState.openedRemaining.byType = {};
    }

    addNumberToTypeMap(categoryState.openedRemaining.byType, openedType, openPieces);
    categoryState.openedRemaining.total = (Number(categoryState.openedRemaining.total) || 0) + openPieces;
    categoryState.rawUsed.good = (Number(categoryState.rawUsed?.good) || 0) + rawGood;
    categoryState.rawUsed.defect = (Number(categoryState.rawUsed?.defect) || 0) + rawDefect;
    categoryState.rawRemaining.good = 0;
    categoryState.rawRemaining.defect = 0;
}

function addNumberToTypeMap(byType, type, value) {
    if (!byType || !type) return;
    byType[type] = Math.max(0, (Number(byType[type]) || 0) + (Number(value) || 0));
}

function allocateSoldPiecesAcrossPackTypes(totalPieces, packCounts = {}, kind = 'tobacco') {
    const configs = kind === 'roast' ? ROAST_TYPE_CONFIGS : TOBACCO_TYPE_CONFIGS;
    const orderedTypes = [
        ...Object.keys(packCounts || {}),
        ...configs.map(config => config.type)
    ].filter((type, index, list) => type && list.indexOf(type) === index);
    const entries = orderedTypes
        .map(type => ({
            type,
            packs: Math.max(0, Number(packCounts[type]) || 0),
            packSize: getPackSizeByKind(kind, type)
        }))
        .filter(entry => entry.packs > 0);
    const safeTotal = Math.max(0, Number(totalPieces) || 0);

    if (!entries.length) {
        return [];
    }

    const allocations = entries.map(entry => ({
        type: entry.type,
        packCount: entry.packs,
        pieces: entry.packs * entry.packSize
    }));
    let allocated = allocations.reduce((sum, entry) => sum + entry.pieces, 0);

    if (safeTotal > allocated) {
        allocations[0].pieces += safeTotal - allocated;
    } else if (safeTotal < allocated) {
        let shortage = allocated - safeTotal;
        for (let index = allocations.length - 1; index >= 0 && shortage > 0; index -= 1) {
            const reduction = Math.min(allocations[index].pieces, shortage);
            allocations[index].pieces -= reduction;
            shortage -= reduction;
        }
    }

    return allocations.filter(entry => entry.pieces > 0 || entry.packCount > 0);
}

function getTobaccoSalePartsFromItem(item = {}) {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    if (!(quantity > 0)) return [];

    if (item.tobaccoPackCounts && typeof item.tobaccoPackCounts === 'object') {
        return allocateSoldPiecesAcrossPackTypes(quantity, item.tobaccoPackCounts, 'tobacco')
            .map(part => ({ ...part, mode: item.packageSaleMode || 'whole' }));
    }

    const type = item.tobaccoType || AUTO_TOBACCO_PURE_TYPE;
    return [{
        type,
        pieces: quantity,
        packCount: Math.max(0, Number(item.tobaccoPackCount) || 0),
        mode: item.packageSaleMode || 'whole'
    }];
}

function getRoastSalePartsFromItem(item = {}) {
    const quantity = getInvoiceItemControlPieces(item);
    if (!(quantity > 0)) return [];

    const roastParts = getRoastParts(item.roast);
    if (roastParts.length) {
        const orderedTypes = Array.isArray(item.roastTypeOrder) && item.roastTypeOrder.length
            ? item.roastTypeOrder.filter(type => ROAST_TYPE_CONFIGS.some(config => config.type === type))
            : roastParts.map(part => part.type);
        const packCounts = {};
        orderedTypes.forEach(type => {
            packCounts[type] = 0;
        });
        roastParts.forEach(part => {
            packCounts[part.type] = (Number(packCounts[part.type]) || 0) + (Number(part.packs) || 0);
        });
        return allocateSoldPiecesAcrossPackTypes(quantity, packCounts, 'roast')
            .map(part => ({ ...part, mode: item.packageSaleMode || 'whole' }));
    }

    const type = ROAST_TYPE_CONFIGS.some(config => config.type === item.roastType)
        ? item.roastType
        : AUTO_ROAST_PURE_TYPE;
    const packCount = Math.max(0, Number(item.openedRoastPackCount) || 0);
    return [{
        type,
        pieces: quantity,
        packCount,
        mode: item.packageSaleMode || 'whole'
    }];
}

function applyPackSaleToInventory(categoryState, salePart, options = {}) {
    if (!categoryState || !salePart) return;

    const kind = options.kind === 'roast' ? 'roast' : 'tobacco';
    const configs = kind === 'roast' ? ROAST_TYPE_CONFIGS : TOBACCO_TYPE_CONFIGS;
    const pureType = kind === 'roast' ? AUTO_ROAST_PURE_TYPE : AUTO_TOBACCO_PURE_TYPE;
    const selectedType = configs.some(config => config.type === salePart.type) ? salePart.type : pureType;
    const openedType = pureType;
    const packSize = getPackSizeByKind(kind, selectedType);
    let remainingPieces = Math.max(0, Number(salePart.pieces) || 0);
    const hintedPacks = Math.max(0, Number(salePart.packCount) || 0);
    const canUseOpenedFirst = salePart.mode === 'partial' || hintedPacks <= 0;

    if (canUseOpenedFirst && (kind === 'roast' || selectedType === openedType)) {
        const openedAvailable = Math.max(0, Number(categoryState.openedRemaining.byType[openedType]) || 0);
        const openedUsed = Math.min(openedAvailable, remainingPieces);
        if (openedUsed > 0) {
            categoryState.openedRemaining.byType[openedType] = openedAvailable - openedUsed;
            categoryState.openedRemaining.total = Math.max(0, (Number(categoryState.openedRemaining.total) || 0) - openedUsed);
            remainingPieces -= openedUsed;
        }
    }

    if (!(remainingPieces > 0)) {
        return;
    }

    const requiredPacksByPieces = Math.ceil(remainingPieces / packSize);
    const packsToOpen = Math.max(hintedPacks, requiredPacksByPieces);
    const availableClosed = Math.max(0, Number(categoryState.finishedRemaining.byType[selectedType]) || 0);
    const closedUsed = Math.min(availableClosed, packsToOpen);

    if (closedUsed > 0) {
        categoryState.finishedRemaining.byType[selectedType] = availableClosed - closedUsed;
        addNumberToTypeMap(categoryState.finishedSold.byType, selectedType, closedUsed);
    }

    const coveredPieces = closedUsed * packSize;
    if (coveredPieces >= remainingPieces) {
        const leftoverPieces = coveredPieces - remainingPieces;
        if (leftoverPieces > 0) {
            addNumberToTypeMap(categoryState.openedRemaining.byType, openedType, leftoverPieces);
            categoryState.openedRemaining.total = (Number(categoryState.openedRemaining.total) || 0) + leftoverPieces;
        }
    } else {
        const shortage = remainingPieces - coveredPieces;
        categoryState.oversoldPieces = (Number(categoryState.oversoldPieces) || 0) + shortage;
    }
}

function applyAssemblyEventsToInventory(tobaccoState, roastState, dateKey) {
    (Array.isArray(openedStockEvents) ? openedStockEvents : [])
        .map(normalizeOpenedStockEvent)
        .filter(event => isDateKeyOnOrBefore(event.dateKey, dateKey))
        .filter(event => event.type === 'assemble_tobacco' || event.type === 'assemble_roast')
        .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')))
        .forEach(event => {
            if (event.type === 'assemble_tobacco') {
                Object.entries(event.tobaccoPacks || {}).forEach(([type, count]) => {
                    const packCount = Math.max(0, Number(count) || 0);
                    const pieces = packCount * getPackSizeByKind('tobacco', type);
                    const openedType = AUTO_TOBACCO_PURE_TYPE;
                    const openedAvailable = Math.max(0, Number(tobaccoState.openedRemaining.byType[openedType]) || 0);
                    const usedOpened = Math.min(openedAvailable, pieces);
                    tobaccoState.openedRemaining.byType[openedType] = openedAvailable - usedOpened;
                    tobaccoState.openedRemaining.total = Math.max(0, (Number(tobaccoState.openedRemaining.total) || 0) - usedOpened);
                    addNumberToTypeMap(tobaccoState.finishedRemaining.byType, type, packCount);
                });
            }

            if (event.type === 'assemble_roast') {
                Object.entries(event.roastPacks || {}).forEach(([type, count]) => {
                    const packCount = Math.max(0, Number(count) || 0);
                    const pieces = packCount * getPackSizeByKind('roast', type);
                    const openedType = AUTO_ROAST_PURE_TYPE;
                    const openedAvailable = Math.max(0, Number(roastState.openedRemaining.byType[openedType]) || 0);
                    const usedOpened = Math.min(openedAvailable, pieces);
                    roastState.openedRemaining.byType[openedType] = openedAvailable - usedOpened;
                    roastState.openedRemaining.total = Math.max(0, (Number(roastState.openedRemaining.total) || 0) - usedOpened);
                    addNumberToTypeMap(roastState.finishedRemaining.byType, type, packCount);
                });
            }
        });
}

function formatOpenedTypeBreakdown(openedState = {}, getLabel = type => type) {
    const parts = Object.entries(openedState.byType || {})
        .filter(([, count]) => (Number(count) || 0) > 0)
        .map(([type, count]) => `${getLabel(type)}: ${formatQuantity(count, 'шт')} шт открыто`);
    return parts.length ? parts.join('<br>') : '';
}

function getPackBreakdownWithOpenedText(packState = {}, openedState = {}, getLabel = type => type) {
    const closedText = formatPackTypeBreakdown(packState.byType || {}, getLabel);
    const openedText = formatOpenedTypeBreakdown(openedState || {}, getLabel);
    if (!openedText) return closedText;
    return `${closedText}<br>${openedText}`;
}

function clampIncomingRawStock(rawByCategory) {
    rawByCategory.tobacco.good = Math.max(0, Number(rawByCategory.tobacco.good) || 0);
    rawByCategory.tobacco.defect = Math.max(0, Number(rawByCategory.tobacco.defect) || 0);
    Object.keys(rawByCategory.tobacco.byMixedType || {}).forEach(type => {
        rawByCategory.tobacco.byMixedType[type].good = Math.max(0, Number(rawByCategory.tobacco.byMixedType[type].good) || 0);
        rawByCategory.tobacco.byMixedType[type].defect = Math.max(0, Number(rawByCategory.tobacco.byMixedType[type].defect) || 0);
    });
    rawByCategory.roast.good = Math.max(0, Number(rawByCategory.roast.good) || 0);
    rawByCategory.roast.defect = Math.max(0, Number(rawByCategory.roast.defect) || 0);
    rawByCategory.roast.goodKg = Math.max(0, Number(rawByCategory.roast.goodKg) || 0);
    rawByCategory.roast.defectKg = Math.max(0, Number(rawByCategory.roast.defectKg) || 0);
}

function applySupplierReturnToRawStock(rawByCategory, returnEntry = {}) {
    getIncomingReceiptItems(returnEntry).forEach(item => {
        const pieces = Math.max(0, Number(item.piecesQty) || 0);
        const kg = Math.max(0, Number(item.kgQty) || 0);

        if (item.key === 'tobacco') {
            const mixedType = sanitizeIncomingTobaccoMixedType(item.tobaccoMixedType || returnEntry.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE);
            if (!rawByCategory.tobacco.byMixedType[mixedType]) {
                rawByCategory.tobacco.byMixedType[mixedType] = { good: 0, defect: 0 };
            }
            rawByCategory.tobacco.good -= pieces;
            rawByCategory.tobacco.byMixedType[mixedType].good -= pieces;
        } else if (item.key === 'smallDefect') {
            const mixedType = sanitizeIncomingTobaccoMixedType(returnEntry.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE);
            if (!rawByCategory.tobacco.byMixedType[mixedType]) {
                rawByCategory.tobacco.byMixedType[mixedType] = { good: 0, defect: 0 };
            }
            rawByCategory.tobacco.defect -= pieces;
            rawByCategory.tobacco.byMixedType[mixedType].defect -= pieces;
        } else if (item.key === 'roast') {
            rawByCategory.roast.good -= pieces;
            rawByCategory.roast.goodKg -= kg;
        } else if (item.key === 'bigDefect') {
            rawByCategory.roast.defect -= pieces;
            rawByCategory.roast.defectKg -= kg;
        }
    });

    clampIncomingRawStock(rawByCategory);
}

function calculateUnifiedIncomingInventoryState(dateKey = getTodayDateKey()) {
    const safeDateKey = dateKey || getTodayDateKey();
    const baselineDateKey = getInventoryBaselineDateKey(safeDateKey);
    const receipts = getInventoryActiveStockSourceEntries(safeDateKey);
    const returns = getInventoryActiveSupplierReturnEntries(safeDateKey);

    const rawByCategory = {
        tobacco: {
            good: 0,
            defect: 0,
            byMixedType: Object.fromEntries(INCOMING_TOBACCO_MIXED_TYPES.map(type => [type, { good: 0, defect: 0 }]))
        },
        roast: { good: 0, defect: 0, goodKg: 0, defectKg: 0 }
    };

    receipts.forEach(receipt => {
        const tobaccoMixedType = getIncomingReceiptTobaccoMixedType(receipt);
        const receiptSummary = getIncomingReceiptItemsSummary(getIncomingReceiptItems(receipt));
        const tobaccoPieces = Math.max(0, Number(receiptSummary.tobaccoPieces) || 0);
        const smallDefectPieces = Math.max(0, Number(receiptSummary.smallDefectPieces) || 0);
        rawByCategory.tobacco.good += tobaccoPieces;
        rawByCategory.tobacco.defect += smallDefectPieces;
        if (!rawByCategory.tobacco.byMixedType[tobaccoMixedType]) {
            rawByCategory.tobacco.byMixedType[tobaccoMixedType] = { good: 0, defect: 0 };
        }
        rawByCategory.tobacco.byMixedType[tobaccoMixedType].good += tobaccoPieces;
        rawByCategory.tobacco.byMixedType[tobaccoMixedType].defect += smallDefectPieces;
        rawByCategory.roast.good += Math.max(0, Number(receiptSummary.roastPieces) || 0);
        rawByCategory.roast.defect += Math.max(0, Number(receiptSummary.bigDefectPieces) || 0);
        rawByCategory.roast.goodKg += Math.max(0, Number(receiptSummary.roastKg) || 0);
        rawByCategory.roast.defectKg += Math.max(0, Number(receiptSummary.bigDefectKg) || 0);
    });
    returns.forEach(returnEntry => applySupplierReturnToRawStock(rawByCategory, returnEntry));

    const tobaccoFormation = calculateGroupedTobaccoPackageFormation(
        rawByCategory.tobacco.byMixedType,
        AUTO_TOBACCO_PURE_TYPE
    );
    const roastFormation = calculateAutoPackageFormation(
        rawByCategory.roast.good,
        rawByCategory.roast.defect,
        AUTO_ROAST_MIXED_TYPE,
        AUTO_ROAST_PURE_TYPE,
        'Жарка'
    );

    const tobaccoState = {
        rawReceived: { good: rawByCategory.tobacco.good, defect: rawByCategory.tobacco.defect },
        rawUsed: { ...tobaccoFormation.used },
        rawRemaining: { ...tobaccoFormation.remaining },
        finishedProduced: summarizePackTypeMap(tobaccoFormation.produced.byType, TOBACCO_TYPE_CONFIGS, AUTO_TOBACCO_PURE_TYPE),
        finishedSold: summarizePackTypeMap({}, TOBACCO_TYPE_CONFIGS, AUTO_TOBACCO_PURE_TYPE),
        finishedRemaining: summarizePackTypeMap(tobaccoFormation.produced.byType, TOBACCO_TYPE_CONFIGS, AUTO_TOBACCO_PURE_TYPE),
        openedRemaining: { total: 0, byType: createPackTypeMap(TOBACCO_TYPE_CONFIGS) },
        receiptsByMixedType: Object.fromEntries(
            INCOMING_TOBACCO_MIXED_TYPES.map(type => [type, Number(rawByCategory.tobacco.byMixedType[type]?.good) || 0])
        ),
        rules: { mixedTypes: INCOMING_TOBACCO_MIXED_TYPES, pureType: AUTO_TOBACCO_PURE_TYPE },
        oversoldPieces: 0
    };
    const roastProducedByType = {
        [AUTO_ROAST_MIXED_TYPE]: roastFormation.produced.mixed,
        [AUTO_ROAST_PURE_TYPE]: roastFormation.produced.pure
    };
    const roastState = {
        rawReceived: { good: rawByCategory.roast.good, defect: rawByCategory.roast.defect },
        rawUsed: { ...roastFormation.used },
        rawRemaining: { ...roastFormation.remaining },
        finishedProduced: summarizePackTypeMap(roastProducedByType, ROAST_TYPE_CONFIGS, AUTO_ROAST_PURE_TYPE),
        finishedSold: summarizePackTypeMap({}, ROAST_TYPE_CONFIGS, AUTO_ROAST_PURE_TYPE),
        finishedRemaining: summarizePackTypeMap(roastProducedByType, ROAST_TYPE_CONFIGS, AUTO_ROAST_PURE_TYPE),
        openedRemaining: { total: 0, byType: createPackTypeMap(ROAST_TYPE_CONFIGS) },
        kg: {
            receivedGood: rawByCategory.roast.goodKg,
            receivedDefect: rawByCategory.roast.defectKg,
            received: rawByCategory.roast.goodKg + rawByCategory.roast.defectKg,
            sold: 0,
            remaining: rawByCategory.roast.goodKg + rawByCategory.roast.defectKg
        },
        rules: { mixedType: AUTO_ROAST_MIXED_TYPE, pureType: AUTO_ROAST_PURE_TYPE },
        oversoldPieces: 0
    };

    moveRawRemainderToOpened(tobaccoState, 'tobacco');
    moveRawRemainderToOpened(roastState, 'roast');

    invoices
        .filter(invoice => isInventoryRecordInActivePeriod(invoice, safeDateKey, baselineDateKey))
        .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')))
        .forEach(invoice => {
            (invoice.items || []).forEach(item => {
                if (isTobaccoInvoiceItem(item)) {
                    getTobaccoSalePartsFromItem(item).forEach(part => {
                        applyPackSaleToInventory(tobaccoState, part, { kind: 'tobacco' });
                    });
                } else if (isRoastInvoiceItem(item)) {
                    if (isKgUnit(item.unit)) {
                        roastState.kg.sold += Math.max(0, Number(item.quantity) || 0);
                    }
                    getRoastSalePartsFromItem(item).forEach(part => {
                        applyPackSaleToInventory(roastState, part, { kind: 'roast' });
                    });
                }
            });
        });

    roastState.kg.remaining = Math.max(0, (Number(roastState.kg.received) || 0) - (Number(roastState.kg.sold) || 0));

    applyAssemblyEventsToInventory(tobaccoState, roastState, safeDateKey);

    tobaccoState.finishedSold = summarizePackTypeMap(tobaccoState.finishedSold.byType, TOBACCO_TYPE_CONFIGS, AUTO_TOBACCO_PURE_TYPE);
    tobaccoState.finishedRemaining = summarizePackTypeMap(tobaccoState.finishedRemaining.byType, TOBACCO_TYPE_CONFIGS, AUTO_TOBACCO_PURE_TYPE);
    roastState.finishedSold = summarizePackTypeMap(roastState.finishedSold.byType, ROAST_TYPE_CONFIGS, AUTO_ROAST_PURE_TYPE);
    roastState.finishedRemaining = summarizePackTypeMap(roastState.finishedRemaining.byType, ROAST_TYPE_CONFIGS, AUTO_ROAST_PURE_TYPE);

    const state = {
        rawReceived: {
            good: rawByCategory.tobacco.good + rawByCategory.roast.good,
            bigDefect: rawByCategory.roast.defect,
            smallDefect: rawByCategory.tobacco.defect
        },
        rawUsed: {
            good: tobaccoState.rawUsed.good + roastState.rawUsed.good,
            bigDefect: roastState.rawUsed.defect,
            smallDefect: tobaccoState.rawUsed.defect
        },
        rawRemaining: {
            good: tobaccoState.rawRemaining.good + roastState.rawRemaining.good,
            bigDefect: roastState.rawRemaining.defect,
            smallDefect: tobaccoState.rawRemaining.defect,
            defectTotal: tobaccoState.rawRemaining.defect + roastState.rawRemaining.defect
        },
        finishedProduced: {
            mixed: tobaccoState.finishedProduced.mixed + roastState.finishedProduced.mixed,
            pure: tobaccoState.finishedProduced.pure + roastState.finishedProduced.pure
        },
        finishedSold: {
            mixed: tobaccoState.finishedSold.mixed + roastState.finishedSold.mixed,
            pure: tobaccoState.finishedSold.pure + roastState.finishedSold.pure
        },
        finishedRemaining: {
            mixed: tobaccoState.finishedRemaining.mixed + roastState.finishedRemaining.mixed,
            pure: tobaccoState.finishedRemaining.pure + roastState.finishedRemaining.pure
        },
        categories: {
            tobacco: tobaccoState,
            roast: roastState
        },
        openedRemaining: {
            tobacco: tobaccoState.openedRemaining.total,
            roast: roastState.openedRemaining.total
        }
    };
    state.finishedProduced.total = state.finishedProduced.mixed + state.finishedProduced.pure;
    state.finishedSold.total = state.finishedSold.mixed + state.finishedSold.pure;
    state.finishedRemaining.total = state.finishedRemaining.mixed + state.finishedRemaining.pure;

    return state;
}

function getInvoicesForDateKey(dateKey) {
    return invoices.filter(invoice => getRecordDateKey(invoice) === dateKey);
}

function calculateFinishedPackSalesForDate(dateKey) {
    return getInvoicesForDateKey(dateKey).reduce((totals, invoice) => {
        const invoiceSales = getPackSalesFromInvoice(invoice);
        mergePackSalesSummaries(totals, invoiceSales);
        return totals;
    }, createCombinedPackSalesSummary());
}

function calculateIncomingInventoryState(dateKey = getTodayDateKey()) {
    return calculateUnifiedIncomingInventoryState(dateKey);

    const safeDateKey = dateKey || getTodayDateKey();
    const openedState = calculateOpenedStockState(safeDateKey);
    const receipts = incomingReceipts.filter(receipt => isDateKeyOnOrBefore(receipt.dateKey, safeDateKey));
    const soldPacks = invoices
        .filter(invoice => isRecordOnOrBeforeDateKey(invoice, safeDateKey))
        .reduce((totals, invoice) => {
            const invoiceSales = getPackSalesFromInvoice(invoice);
            mergePackSalesSummaries(totals, invoiceSales);
            return totals;
        }, createCombinedPackSalesSummary());

    const rawByCategory = {
        tobacco: {
            good: 0,
            defect: 0,
            byMixedType: Object.fromEntries(INCOMING_TOBACCO_MIXED_TYPES.map(type => [type, { good: 0, defect: 0 }]))
        },
        roast: { good: 0, defect: 0 }
    };

    const state = {
        rawReceived: {
            good: 0,
            bigDefect: 0,
            smallDefect: 0
        },
        rawUsed: {
            good: 0,
            bigDefect: 0,
            smallDefect: 0
        },
        rawRemaining: {
            good: 0,
            bigDefect: 0,
            smallDefect: 0,
            defectTotal: 0
        },
        finishedProduced: {
            mixed: 0,
            pure: 0
        },
        finishedSold: {
            mixed: soldPacks.mixed,
            pure: soldPacks.pure
        },
        finishedRemaining: {
            mixed: 0,
            pure: 0
        },
        categories: {
            tobacco: {
                rawReceived: { good: 0, defect: 0 },
                rawUsed: { good: 0, defect: 0 },
                rawRemaining: { good: 0, defect: 0 },
                finishedProduced: { mixed: 0, pure: 0, total: 0, byType: {} },
                finishedSold: { mixed: 0, pure: 0, total: 0, byType: {} },
                finishedRemaining: { mixed: 0, pure: 0, total: 0, byType: {} },
                openedRemaining: { total: 0 },
                receiptsByMixedType: createTobaccoMixedTypeCounter(),
                rules: { mixedTypes: INCOMING_TOBACCO_MIXED_TYPES, pureType: AUTO_TOBACCO_PURE_TYPE }
            },
            roast: {
                rawReceived: { good: 0, defect: 0 },
                rawUsed: { good: 0, defect: 0 },
                rawRemaining: { good: 0, defect: 0 },
                finishedProduced: { mixed: 0, pure: 0, total: 0, byType: {} },
                finishedSold: { mixed: 0, pure: 0, total: 0, byType: {} },
                finishedRemaining: { mixed: 0, pure: 0, total: 0, byType: {} },
                openedRemaining: { total: 0 },
                rules: { mixedType: AUTO_ROAST_MIXED_TYPE, pureType: AUTO_ROAST_PURE_TYPE }
            }
        }
    };

    receipts.forEach(receipt => {
        const tobaccoMixedType = getIncomingReceiptTobaccoMixedType(receipt);
        rawByCategory.tobacco.good += Number(receipt.tobaccoPieces) || 0;
        rawByCategory.tobacco.defect += Number(receipt.smallDefectPieces) || 0;
        rawByCategory.tobacco.byMixedType[tobaccoMixedType].good += Number(receipt.tobaccoPieces) || 0;
        rawByCategory.tobacco.byMixedType[tobaccoMixedType].defect += Number(receipt.smallDefectPieces) || 0;
        rawByCategory.roast.good += Number(receipt.roastPieces) || 0;
        rawByCategory.roast.defect += Number(receipt.bigDefectPieces) || 0;
    });

    const tobaccoFormation = calculateGroupedTobaccoPackageFormation(
        rawByCategory.tobacco.byMixedType,
        AUTO_TOBACCO_PURE_TYPE
    );
    const roastFormation = calculateAutoPackageFormation(
        rawByCategory.roast.good,
        rawByCategory.roast.defect,
        AUTO_ROAST_MIXED_TYPE,
        AUTO_ROAST_PURE_TYPE,
        'Жарка'
    );
    const tobaccoProducedByType = { ...tobaccoFormation.produced.byType };
    Object.entries(openedState.assembledTobaccoPacks || {}).forEach(([type, count]) => {
        tobaccoProducedByType[type] = (Number(tobaccoProducedByType[type]) || 0) + (Number(count) || 0);
    });
    const tobaccoProducedSummary = {
        pure: Number(tobaccoProducedByType[AUTO_TOBACCO_PURE_TYPE]) || 0,
        mixed: Object.entries(tobaccoProducedByType)
            .filter(([type]) => type !== AUTO_TOBACCO_PURE_TYPE)
            .reduce((sum, [, count]) => sum + (Number(count) || 0), 0)
    };
    tobaccoProducedSummary.total = tobaccoProducedSummary.pure + tobaccoProducedSummary.mixed;

    const tobaccoRemainingPacks = calculateRemainingPackBreakdown(
        tobaccoProducedByType,
        soldPacks.tobacco,
        AUTO_TOBACCO_PURE_TYPE,
        INCOMING_TOBACCO_MIXED_TYPES
    );
    const roastProducedByType = {
        [AUTO_ROAST_MIXED_TYPE]: roastFormation.produced.mixed,
        [AUTO_ROAST_PURE_TYPE]: roastFormation.produced.pure
    };
    Object.entries(openedState.assembledRoastPacks || {}).forEach(([type, count]) => {
        roastProducedByType[type] = (Number(roastProducedByType[type]) || 0) + (Number(count) || 0);
    });
    const roastProducedSummary = {
        pure: Number(roastProducedByType[AUTO_ROAST_PURE_TYPE]) || 0,
        mixed: Object.entries(roastProducedByType)
            .filter(([type]) => type !== AUTO_ROAST_PURE_TYPE)
            .reduce((sum, [, count]) => sum + (Number(count) || 0), 0)
    };
    roastProducedSummary.total = roastProducedSummary.pure + roastProducedSummary.mixed;

    const roastRemainingPacks = calculateRemainingPackBreakdown(
        roastProducedByType,
        soldPacks.roast,
        AUTO_ROAST_PURE_TYPE,
        ROAST_TYPE_CONFIGS.map(config => config.type).filter(type => type !== AUTO_ROAST_PURE_TYPE)
    );
    const actualSoldPieces = invoices
        .filter(invoice => isRecordOnOrBeforeDateKey(invoice, safeDateKey))
        .reduce((totals, invoice) => {
            const invoiceTotals = getInvoiceInventoryControlSales(invoice);
            totals.tobacco += invoiceTotals.tobacco;
            totals.roast += invoiceTotals.roast;
            return totals;
        }, { tobacco: 0, roast: 0 });
    const tobaccoPackedPieces = calculatePackPiecesByRole(tobaccoRemainingPacks, getTobaccoTypeConfig);
    const roastPackedPieces = calculatePackPiecesByRole(roastRemainingPacks, getRoastTypeConfig);
    const expectedTobaccoPieces = Math.max(0, rawByCategory.tobacco.good + rawByCategory.tobacco.defect - actualSoldPieces.tobacco);
    const expectedRoastPieces = Math.max(0, rawByCategory.roast.good + rawByCategory.roast.defect - actualSoldPieces.roast);
    const cappedOpenedTobacco = Math.min(
        Math.max(0, Number(openedState.tobacco) || 0),
        Math.max(0, expectedTobaccoPieces - tobaccoPackedPieces.good - tobaccoPackedPieces.defect - tobaccoFormation.remaining.good - tobaccoFormation.remaining.defect)
    );
    const cappedOpenedRoast = Math.min(
        Math.max(0, Number(openedState.roast) || 0),
        Math.max(0, expectedRoastPieces - roastPackedPieces.good - roastPackedPieces.defect - roastFormation.remaining.good - roastFormation.remaining.defect)
    );

    state.categories.tobacco.rawReceived.good = rawByCategory.tobacco.good;
    state.categories.tobacco.rawReceived.defect = rawByCategory.tobacco.defect;
    state.categories.tobacco.rawUsed.good = tobaccoFormation.used.good;
    state.categories.tobacco.rawUsed.defect = tobaccoFormation.used.defect;
    state.categories.tobacco.rawRemaining.good = tobaccoFormation.remaining.good;
    state.categories.tobacco.rawRemaining.defect = tobaccoFormation.remaining.defect;
    state.categories.tobacco.finishedProduced = {
        mixed: tobaccoProducedSummary.mixed,
        pure: tobaccoProducedSummary.pure,
        total: tobaccoProducedSummary.total,
        byType: tobaccoProducedByType
    };
    state.categories.tobacco.finishedSold = { ...soldPacks.tobacco };
    state.categories.tobacco.finishedRemaining = tobaccoRemainingPacks;
    state.categories.tobacco.openedRemaining = { total: cappedOpenedTobacco };
    state.categories.tobacco.receiptsByMixedType = Object.fromEntries(
        INCOMING_TOBACCO_MIXED_TYPES.map(type => [type, Number(rawByCategory.tobacco.byMixedType[type]?.good) || 0])
    );

    state.categories.roast.rawReceived.good = rawByCategory.roast.good;
    state.categories.roast.rawReceived.defect = rawByCategory.roast.defect;
    state.categories.roast.rawUsed.good = roastFormation.used.good;
    state.categories.roast.rawUsed.defect = roastFormation.used.defect;
    state.categories.roast.rawRemaining.good = roastFormation.remaining.good;
    state.categories.roast.rawRemaining.defect = roastFormation.remaining.defect;
    state.categories.roast.finishedProduced = {
        mixed: roastProducedSummary.mixed,
        pure: roastProducedSummary.pure,
        total: roastProducedSummary.total,
        byType: roastProducedByType
    };
    state.categories.roast.finishedSold = { ...soldPacks.roast };
    state.categories.roast.finishedRemaining = roastRemainingPacks;
    state.categories.roast.openedRemaining = { total: cappedOpenedRoast };

    state.rawReceived.good = rawByCategory.tobacco.good + rawByCategory.roast.good;
    state.rawReceived.bigDefect = rawByCategory.roast.defect;
    state.rawReceived.smallDefect = rawByCategory.tobacco.defect;
    state.rawUsed.good = tobaccoFormation.used.good + roastFormation.used.good;
    state.rawUsed.bigDefect = roastFormation.used.defect;
    state.rawUsed.smallDefect = tobaccoFormation.used.defect;
    state.finishedProduced.mixed = tobaccoProducedSummary.mixed + roastProducedSummary.mixed;
    state.finishedProduced.pure = tobaccoProducedSummary.pure + roastProducedSummary.pure;
    state.finishedSold.mixed = soldPacks.mixed;
    state.finishedSold.pure = soldPacks.pure;
    state.rawRemaining.good = tobaccoFormation.remaining.good + roastFormation.remaining.good;
    state.rawRemaining.bigDefect = roastFormation.remaining.defect;
    state.rawRemaining.smallDefect = tobaccoFormation.remaining.defect;
    state.rawRemaining.defectTotal = state.rawRemaining.bigDefect + state.rawRemaining.smallDefect;
    state.finishedRemaining.mixed = Math.max(0, state.finishedProduced.mixed - soldPacks.mixed);
    state.finishedRemaining.pure = Math.max(0, state.finishedProduced.pure - soldPacks.pure);
    state.openedRemaining = {
        tobacco: cappedOpenedTobacco,
        roast: cappedOpenedRoast
    };

    return state;
}

function getInvoiceInventoryControlSales(invoice = {}) {
    return (invoice.items || []).reduce((totals, item) => {
        if (isTobaccoInvoiceItem(item)) {
            totals.tobacco += Math.max(0, Number(item.quantity) || 0);
            return totals;
        }

        if (isRoastInvoiceItem(item)) {
            totals.roast += getInvoiceItemControlPieces(item);
        }

        return totals;
    }, { tobacco: 0, roast: 0 });
}

function getReceiptInventoryControlReceived(receipt = {}) {
    const receiptSummary = getIncomingReceiptItemsSummary(getIncomingReceiptItems(receipt));
    return {
        tobacco: (Number(receiptSummary.tobaccoPieces) || 0) + (Number(receiptSummary.smallDefectPieces) || 0),
        roast: (Number(receiptSummary.roastPieces) || 0) + (Number(receiptSummary.bigDefectPieces) || 0)
    };
}

function getSupplierReturnInventoryControlReturned(returnEntry = {}) {
    return getReceiptInventoryControlReceived(returnEntry);
}

function getReceiptInventoryControlRoastKg(entry = {}) {
    const receiptSummary = getIncomingReceiptItemsSummary(getIncomingReceiptItems(entry));
    return (Number(receiptSummary.roastKg) || 0) + (Number(receiptSummary.bigDefectKg) || 0);
}

function getInvoiceInventoryControlRoastKgSales(invoice = {}) {
    return (invoice.items || []).reduce((sum, item) => {
        if (!isRoastInvoiceItem(item) || !isKgUnit(item.unit)) return sum;
        return sum + (Math.max(0, Number(item.quantity) || 0));
    }, 0);
}

function calculateInventoryControlExpected(dateKey = getTodayDateKey()) {
    const safeDateKey = dateKey || getTodayDateKey();
    const baselineDateKey = getInventoryBaselineDateKey(safeDateKey);
    const received = getInventoryActiveStockSourceEntries(safeDateKey)
        .reduce((totals, receipt) => {
            const receiptTotals = getReceiptInventoryControlReceived(receipt);
            totals.tobacco += receiptTotals.tobacco;
            totals.roast += receiptTotals.roast;
            return totals;
        }, { tobacco: 0, roast: 0 });
    const returned = getInventoryActiveSupplierReturnEntries(safeDateKey)
        .reduce((totals, returnEntry) => {
            const returnTotals = getSupplierReturnInventoryControlReturned(returnEntry);
            totals.tobacco += returnTotals.tobacco;
            totals.roast += returnTotals.roast;
            return totals;
        }, { tobacco: 0, roast: 0 });

    const sold = invoices
        .filter(invoice => isInventoryRecordInActivePeriod(invoice, safeDateKey, baselineDateKey))
        .reduce((totals, invoice) => {
            const invoiceTotals = getInvoiceInventoryControlSales(invoice);
            totals.tobacco += invoiceTotals.tobacco;
            totals.roast += invoiceTotals.roast;
            return totals;
        }, { tobacco: 0, roast: 0 });

    return {
        dateKey: safeDateKey,
        received,
        returned,
        sold,
        expected: {
            tobacco: Math.max(0, received.tobacco - returned.tobacco - sold.tobacco),
            roast: Math.max(0, received.roast - returned.roast - sold.roast)
        }
    };
}

function calculateInventoryControlReport(dateKey = getTodayDateKey()) {
    const safeDateKey = dateKey || getTodayDateKey();
    const previousExpected = calculateInventoryControlExpected(getPreviousDateKey(safeDateKey)).expected;
    const receivedToday = getInventoryStockSourceEntries()
        .filter(receipt => receipt.dateKey === safeDateKey)
        .reduce((totals, receipt) => {
            const receiptTotals = getReceiptInventoryControlReceived(receipt);
            totals.tobacco += receiptTotals.tobacco;
            totals.roast += receiptTotals.roast;
            return totals;
        }, { tobacco: 0, roast: 0 });
    const returnedToday = getSupplierReturnEntries()
        .filter(returnEntry => returnEntry.dateKey === safeDateKey)
        .reduce((totals, returnEntry) => {
            const returnTotals = getSupplierReturnInventoryControlReturned(returnEntry);
            totals.tobacco += returnTotals.tobacco;
            totals.roast += returnTotals.roast;
            return totals;
        }, { tobacco: 0, roast: 0 });
    const soldToday = getInvoicesForDateKey(safeDateKey)
        .reduce((totals, invoice) => {
            const invoiceTotals = getInvoiceInventoryControlSales(invoice);
            totals.tobacco += invoiceTotals.tobacco;
            totals.roast += invoiceTotals.roast;
            return totals;
        }, { tobacco: 0, roast: 0 });
    const expected = calculateInventoryControlExpected(safeDateKey).expected;

    return {
        dateKey: safeDateKey,
        opening: previousExpected,
        receivedToday,
        returnedToday,
        soldToday,
        expected
    };
}

function sumIncomingEntriesForProduct(entries = [], product = {}) {
    return entries.reduce((totals, entry) => {
        const quantities = getIncomingEntryQuantitiesForProduct(entry, product);
        totals.quantity += quantities.quantity;
        totals.pieces += quantities.pieces;
        return totals;
    }, { quantity: 0, pieces: 0 });
}

function sumInvoiceSalesForProduct(invoicesList = [], product = {}) {
    return invoicesList.reduce((totals, invoice) => {
        (invoice.items || []).forEach(item => {
            const quantities = getInvoiceItemQuantitiesForProduct(item, product);
            totals.quantity += quantities.quantity;
            totals.pieces += quantities.pieces;
        });
        return totals;
    }, { quantity: 0, pieces: 0 });
}

function getProductControlPieceSnapshot(product, safeDateKey, openingStock = null) {
    if (!shouldTrackProductPieces(product)) {
        return {
            openingPieces: 0,
            receivedTodayPieces: 0,
            returnedTodayPieces: 0,
            soldTodayPieces: 0,
            expectedPieces: 0,
            factPieces: 0,
            differencePieces: 0
        };
    }

    const receiptsToday = getInventoryStockSourceEntries().filter(entry => getRecordDateKey(entry) === safeDateKey);
    const returnsToday = getSupplierReturnEntries().filter(entry => getRecordDateKey(entry) === safeDateKey);
    const invoicesToday = getInvoicesForDateKey(safeDateKey);
    const received = sumIncomingEntriesForProduct(receiptsToday, product);
    const returned = sumIncomingEntriesForProduct(returnsToday, product);
    const sold = sumInvoiceSalesForProduct(invoicesToday, product);
    const factPieces = getProductPieceQuantity(product);
    const openingStockPieces = Number(openingStock?.pieces);
    const openingPieces = Number.isFinite(openingStockPieces)
        ? Math.max(0, openingStockPieces)
        : Math.max(
            0,
            factPieces
                - (Number(received.pieces) || 0)
                + (Number(returned.pieces) || 0)
                + (Number(sold.pieces) || 0)
        );
    const expectedPieces = Math.max(
        0,
        openingPieces
            + (Number(received.pieces) || 0)
            - (Number(returned.pieces) || 0)
            - (Number(sold.pieces) || 0)
    );

    return {
        openingPieces,
        receivedTodayPieces: received.pieces || 0,
        returnedTodayPieces: returned.pieces || 0,
        soldTodayPieces: sold.pieces || 0,
        expectedPieces,
        factPieces,
        differencePieces: factPieces - expectedPieces
    };
}

function getWarehouseControlRows(dateKey = getTodayDateKey(), inventoryReport = null, inventoryCheck = null, inventoryState = null) {
    const safeDateKey = dateKey || getTodayDateKey();
    const report = inventoryReport || calculateInventoryControlReport(safeDateKey);
    const state = inventoryState || calculateIncomingInventoryState(safeDateKey);
    const openingState = calculateIncomingInventoryState(getPreviousDateKey(safeDateKey));
    const tobaccoState = state.categories?.tobacco || {};
    const roastState = state.categories?.roast || {};
    const tobaccoStockPieces = getTobaccoStockPiecesFromState(tobaccoState);
    const roastStockPieces = getRoastStockPiecesFromState(roastState);
    const roastStockKg = getRoastStockKgFromState(roastState);
    const openingRoastKg = getRoastStockKgFromState(openingState.categories?.roast || {});
    const receiptsToday = getInventoryStockSourceEntries().filter(entry => getRecordDateKey(entry) === safeDateKey);
    const returnsToday = getSupplierReturnEntries().filter(entry => getRecordDateKey(entry) === safeDateKey);
    const invoicesToday = getInvoicesForDateKey(safeDateKey);
    const roastReceivedKg = receiptsToday.reduce((sum, entry) => sum + getReceiptInventoryControlRoastKg(entry), 0);
    const roastReturnedKg = returnsToday.reduce((sum, entry) => sum + getReceiptInventoryControlRoastKg(entry), 0);
    const roastSoldKg = invoicesToday.reduce((sum, invoice) => sum + getInvoiceInventoryControlRoastKgSales(invoice), 0);
    const roastExpectedKg = Math.max(0, openingRoastKg + roastReceivedKg - roastReturnedKg - roastSoldKg);

    const coreRows = [
        {
            key: 'tobacco',
            label: 'Табак',
            unit: 'шт',
            opening: report.opening?.tobacco || 0,
            receivedToday: report.receivedToday?.tobacco || 0,
            returnedToday: report.returnedToday?.tobacco || 0,
            soldToday: report.soldToday?.tobacco || 0,
            expected: report.expected?.tobacco || 0,
            fact: inventoryCheck ? (inventoryCheck.fact?.tobacco || 0) : tobaccoStockPieces.total,
            difference: inventoryCheck
                ? (inventoryCheck.difference?.tobacco || 0)
                : tobaccoStockPieces.total - (report.expected?.tobacco || 0),
            note: 'Табак вместе с маленьким браком'
        },
        {
            key: 'roast',
            label: 'Жарка',
            unit: 'шт',
            opening: report.opening?.roast || 0,
            receivedToday: report.receivedToday?.roast || 0,
            returnedToday: report.returnedToday?.roast || 0,
            soldToday: report.soldToday?.roast || 0,
            expected: report.expected?.roast || 0,
            fact: inventoryCheck ? (inventoryCheck.fact?.roast || 0) : roastStockPieces.total,
            difference: inventoryCheck
                ? (inventoryCheck.difference?.roast || 0)
                : roastStockPieces.total - (report.expected?.roast || 0),
            showKg: true,
            openingKg: openingRoastKg,
            receivedTodayKg: roastReceivedKg,
            returnedTodayKg: roastReturnedKg,
            soldTodayKg: roastSoldKg,
            expectedKg: roastExpectedKg,
            factKg: roastStockKg,
            differenceKg: roastStockKg - roastExpectedKg,
            note: 'Жарка вместе с большим браком'
        }
    ];

    const soupProduct = findIncomingProductByAliases(['суповой', 'суповый', 'суп']);
    const otherRows = products
        .filter(product => !isCoreIncomingProduct(product))
        .map(product => {
            const openingStock = getProductOpeningStockDisplay(product, safeDateKey, openingState);
            const currentStock = getProductStockDisplay(product, state);
            const received = sumIncomingEntriesForProduct(receiptsToday, product);
            const returned = sumIncomingEntriesForProduct(returnsToday, product);
            const sold = sumInvoiceSalesForProduct(invoicesToday, product);
            const unit = currentStock.unit || openingStock.unit || product.unit || 'шт';
            const expected = Math.max(
                0,
                (Number(openingStock.quantity) || 0)
                    + (Number(received.quantity) || 0)
                    - (Number(returned.quantity) || 0)
                    - (Number(sold.quantity) || 0)
            );
            const fact = Number(currentStock.quantity) || 0;
            const pieceSnapshot = getProductControlPieceSnapshot(product, safeDateKey, openingStock);
            const isSoupProduct = Boolean(soupProduct?.id && product.id === soupProduct.id);
            if (inventoryCheck && isSoupProduct && isInventoryCheckSoupStoredInPieces(inventoryCheck)) {
                const soupCheck = getInventoryCheckSoupSummary(inventoryCheck, pieceSnapshot);
                pieceSnapshot.factPieces = soupCheck.fact;
                pieceSnapshot.expectedPieces = soupCheck.expected;
                pieceSnapshot.differencePieces = soupCheck.difference;
            }

            return {
                key: `product:${product.id}`,
                label: product.name || 'Товар',
                unit,
                opening: openingStock.quantity || 0,
                receivedToday: received.quantity || 0,
                returnedToday: returned.quantity || 0,
                soldToday: sold.quantity || 0,
                expected,
                fact,
                difference: fact - expected,
                showPieces: shouldTrackProductPieces(product),
                preferPieces: isSoupProduct,
                ...pieceSnapshot,
                note: [getProductCategoryName(product) || product.category || ''].filter(Boolean).join(' • '),
                hasActivity: [
                    openingStock.quantity,
                    received.quantity,
                    returned.quantity,
                    sold.quantity,
                    expected,
                    fact,
                    pieceSnapshot.openingPieces,
                    pieceSnapshot.receivedTodayPieces,
                    pieceSnapshot.returnedTodayPieces,
                    pieceSnapshot.soldTodayPieces,
                    pieceSnapshot.expectedPieces,
                    pieceSnapshot.factPieces
                ]
                    .some(value => (Number(value) || 0) > 0)
            };
        })
        .filter(row => row.hasActivity)
        .sort((left, right) => String(left.label || '').localeCompare(String(right.label || ''), 'ru'));

    return [...coreRows, ...otherRows];
}

function getSoupInventoryControlSnapshot(dateKey = getTodayDateKey(), inventoryState = null) {
    const safeDateKey = dateKey || getTodayDateKey();
    const soupProduct = findIncomingProductByAliases(['суповой', 'суповый', 'суп']);
    if (!soupProduct) {
        return {
            product: null,
            label: 'Суп',
            unit: 'кг',
            pieceUnit: 'шт',
            opening: 0,
            receivedToday: 0,
            returnedToday: 0,
            soldToday: 0,
            expected: 0,
            fact: 0,
            difference: 0,
            openingPieces: 0,
            receivedTodayPieces: 0,
            returnedTodayPieces: 0,
            soldTodayPieces: 0,
            expectedPieces: 0,
            factPieces: 0,
            differencePieces: 0
        };
    }

    const state = inventoryState || calculateIncomingInventoryState(safeDateKey);
    const openingState = calculateIncomingInventoryState(getPreviousDateKey(safeDateKey));
    const openingStock = getProductOpeningStockDisplay(soupProduct, safeDateKey, openingState);
    const currentStock = getProductStockDisplay(soupProduct, state);
    const receiptsToday = getInventoryStockSourceEntries().filter(entry => getRecordDateKey(entry) === safeDateKey);
    const returnsToday = getSupplierReturnEntries().filter(entry => getRecordDateKey(entry) === safeDateKey);
    const invoicesToday = getInvoicesForDateKey(safeDateKey);
    const received = sumIncomingEntriesForProduct(receiptsToday, soupProduct);
    const returned = sumIncomingEntriesForProduct(returnsToday, soupProduct);
    const sold = sumInvoiceSalesForProduct(invoicesToday, soupProduct);
    const unit = currentStock.unit || openingStock.unit || soupProduct.unit || 'шт';
    const expected = Math.max(
        0,
        (Number(openingStock.quantity) || 0)
            + (Number(received.quantity) || 0)
            - (Number(returned.quantity) || 0)
            - (Number(sold.quantity) || 0)
    );
    const fact = Number(currentStock.quantity) || 0;
    const pieceSnapshot = getProductControlPieceSnapshot(soupProduct, safeDateKey, openingStock);

    return {
        product: soupProduct,
        label: soupProduct.name || 'Суп',
        unit,
        pieceUnit: 'шт',
        opening: openingStock.quantity || 0,
        receivedToday: received.quantity || 0,
        returnedToday: returned.quantity || 0,
        soldToday: sold.quantity || 0,
        expected,
        fact,
        difference: fact - expected,
        ...pieceSnapshot
    };
}

function isInventoryCheckSoupStoredInPieces(inventoryCheck = null) {
    if (!inventoryCheck) return false;
    if (inventoryCheck.units?.soup === 'шт') return true;

    return ['openingPieces', 'receivedTodayPieces', 'returnedTodayPieces', 'soldTodayPieces', 'expectedPieces', 'factPieces', 'differencePieces']
        .some(key => inventoryCheck[key]?.soup != null);
}

function getInventoryCheckSoupMetric(inventoryCheck = null, metricKey = 'expected', fallbackValue = 0) {
    const piecesKey = `${metricKey}Pieces`;
    const explicitPieces = Number(inventoryCheck?.[piecesKey]?.soup);
    if (Number.isFinite(explicitPieces)) {
        return explicitPieces;
    }

    if (isInventoryCheckSoupStoredInPieces(inventoryCheck)) {
        const storedValue = Number(inventoryCheck?.[metricKey]?.soup);
        if (Number.isFinite(storedValue)) return storedValue;
    }

    const fallbackNumber = Number(fallbackValue);
    return Number.isFinite(fallbackNumber) ? fallbackNumber : NaN;
}

function getInventoryCheckSoupSummary(inventoryCheck = null, soupSnapshot = {}) {
    const expected = getInventoryCheckSoupMetric(inventoryCheck, 'expected', soupSnapshot.expectedPieces);
    const fact = getInventoryCheckSoupMetric(inventoryCheck, 'fact', soupSnapshot.factPieces);
    const explicitDifference = getInventoryCheckSoupMetric(inventoryCheck, 'difference', NaN);
    const difference = Number.isFinite(explicitDifference) ? explicitDifference : fact - expected;

    return {
        expected,
        fact,
        difference,
        storedInPieces: isInventoryCheckSoupStoredInPieces(inventoryCheck)
    };
}

function getLastInventoryCheckForDate(dateKey = getTodayDateKey()) {
    return [...shiftSessions]
        .filter(shift => shift.inventoryCheck?.dateKey === dateKey)
        .sort((left, right) => String(right.closedAt || right.openedAt || '').localeCompare(String(left.closedAt || left.openedAt || '')))[0]?.inventoryCheck || null;
}

function formatWarehouseControlAmount(row = {}, key = 'fact') {
    const unit = row.unit || 'шт';
    const primary = `${formatQuantity(row[key] || 0, unit)} ${unit}`;

    if (row.showPieces) {
        const piecesValue = Number(row[`${key}Pieces`]) || 0;
        if (row.preferPieces) {
            return `${formatQuantity(piecesValue, 'шт')} шт / ${primary}`;
        }
        return `${primary} / ${formatQuantity(piecesValue, 'шт')} шт`;
    }

    if (row.showKg) {
        const kgValue = Number(row[`${key}Kg`]) || 0;
        return `${primary} / ${formatQuantity(kgValue, 'кг')} кг`;
    }

    return primary;
}

function formatWarehouseControlDifference(row = {}) {
    const unit = row.unit || 'шт';
    const primary = formatInventoryDifferenceForUnit(row.difference || 0, unit);

    if (row.showPieces) {
        const piecesDiff = formatInventoryDifferenceForUnit(row.differencePieces || 0, 'шт');
        return row.preferPieces ? `${piecesDiff} / ${primary}` : `${primary} / ${piecesDiff}`;
    }

    if (row.showKg) {
        return `${primary} / ${formatInventoryDifferenceForUnit(row.differenceKg || 0, 'кг')}`;
    }

    return primary;
}

function saveOpenedStockEvent(entry) {
    const event = normalizeOpenedStockEvent({
        id: generateId(),
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: getActorLabel(),
        shiftId: getCurrentShift()?.id || null,
        ...entry
    });
    openedStockEvents.push(event);
    saveData('openedStockEvents', openedStockEvents);
    loadDashboardData();
    renderControlCenter();
    return event;
}

function assembleOpenedTobaccoPacks() {
    const inventoryState = calculateIncomingInventoryState(getTodayDateKey());
    const openedPieces = Number(inventoryState.categories?.tobacco?.openedRemaining?.total) || 0;
    const availablePacks = Math.floor(openedPieces / TOBACCO_PACK_SIZE);

    if (availablePacks <= 0) {
        alert('Открытого табака меньше 10 шт — собрать полный пакет пока нельзя');
        return;
    }

    const answer = prompt(`Сколько пакетов табака собрать в 10/0? Доступно: ${availablePacks}`, String(availablePacks));
    if (answer === null) return;

    const packCount = Math.floor(Number(answer) || 0);
    if (packCount <= 0 || packCount > availablePacks) {
        alert('Введите корректное количество пакетов');
        return;
    }

    saveOpenedStockEvent({
        type: 'assemble_tobacco',
        productKind: 'tobacco',
        packType: AUTO_TOBACCO_PURE_TYPE,
        tobaccoDelta: -(packCount * TOBACCO_PACK_SIZE),
        tobaccoPacks: { [AUTO_TOBACCO_PURE_TYPE]: packCount },
        note: `Собрано открытого табака в ${getTobaccoTypeLabel(AUTO_TOBACCO_PURE_TYPE)}`
    });
    logActivity('assemble_opened_stock', {
        productKind: 'tobacco',
        packType: AUTO_TOBACCO_PURE_TYPE,
        packCount
    });
    alert(`Собрано пакетов табака 10/0: ${packCount}`);
}

function assembleOpenedRoastPacks() {
    const inventoryState = calculateIncomingInventoryState(getTodayDateKey());
    const openedPieces = Number(inventoryState.categories?.roast?.openedRemaining?.total) || 0;
    const availablePacks = Math.floor(openedPieces / 5);

    if (availablePacks <= 0) {
        alert('Открытой жарки меньше 5 шт — собрать полный пакет пока нельзя');
        return;
    }

    const typeAnswer = prompt(`В какой тип собрать жарку? Доступные типы: ${ROAST_TYPE_CONFIGS.map(config => config.label).join(', ')}`, getRoastTypeLabel(AUTO_ROAST_PURE_TYPE));
    if (typeAnswer === null) return;

    const normalized = String(typeAnswer || '').trim().replace('/', '-');
    const typeConfig = ROAST_TYPE_CONFIGS.find(config => config.type === normalized || config.label === typeAnswer.trim());
    if (!typeConfig) {
        alert('Введите тип жарки в формате 5/0, 4/1, 3/2 или 2/3');
        return;
    }

    const countAnswer = prompt(`Сколько пакетов ${typeConfig.label} собрать? Доступно: ${availablePacks}`, String(availablePacks));
    if (countAnswer === null) return;

    const packCount = Math.floor(Number(countAnswer) || 0);
    if (packCount <= 0 || packCount > availablePacks) {
        alert('Введите корректное количество пакетов');
        return;
    }

    saveOpenedStockEvent({
        type: 'assemble_roast',
        productKind: 'roast',
        packType: typeConfig.type,
        roastDelta: -(packCount * 5),
        roastPacks: { [typeConfig.type]: packCount },
        note: `Собрана открытая жарка в ${typeConfig.label}`
    });
    logActivity('assemble_opened_stock', {
        productKind: 'roast',
        packType: typeConfig.type,
        packCount
    });
    alert(`Собрано пакетов жарки ${typeConfig.label}: ${packCount}`);
}

function calculateIncomingDailyReport(dateKey = getTodayDateKey()) {
    const safeDateKey = dateKey || getTodayDateKey();
    const receiptsToday = incomingReceipts.filter(receipt => receipt.dateKey === safeDateKey);
    const returnsToday = getSupplierReturnEntries().filter(returnEntry => returnEntry.dateKey === safeDateKey);
    const invoicesToday = getInvoicesForDateKey(safeDateKey);
    const salesToday = calculateFinishedPackSalesForDate(safeDateKey);
    const openingState = calculateIncomingInventoryState(getPreviousDateKey(safeDateKey));
    const closingState = calculateIncomingInventoryState(safeDateKey);

    const receiptTotals = receiptsToday.reduce((totals, receipt) => {
        const receiptSummary = getIncomingReceiptItemsSummary(getIncomingReceiptItems(receipt));
        totals.good += Number(receiptSummary.goodQty) || 0;
        totals.bigDefect += Number(receiptSummary.bigDefectQty) || 0;
        totals.smallDefect += Number(receiptSummary.smallDefectQty) || 0;
        totals.totalAmount += Number(receiptSummary.totalAmount) || 0;
        Object.keys(totals.byItems).forEach(key => {
            const itemTotals = receiptSummary.totals[key];
            if (!itemTotals) return;
            totals.byItems[key].pieces += Number(itemTotals.pieces) || 0;
            totals.byItems[key].kg += Number(itemTotals.kg) || 0;
            totals.byItems[key].total += Number(itemTotals.total) || 0;
        });
        Object.entries(receiptSummary.tobaccoMixedTypes || {}).forEach(([type, count]) => {
            totals.tobaccoMixedTypes[type] = (totals.tobaccoMixedTypes[type] || 0) + (Number(count) || 0);
        });
        return totals;
    }, {
        good: 0,
        bigDefect: 0,
        smallDefect: 0,
        totalAmount: 0,
        paidToday: 0,
        byItems: createEmptyIncomingReceiptItemTotals(),
        tobaccoMixedTypes: {}
    });

    receiptTotals.paidToday = incomingReceipts.reduce((sum, receipt) => {
        return sum + (receipt.paymentHistory || [])
            .filter(payment => payment.dateKey === safeDateKey)
            .reduce((paymentSum, payment) => paymentSum + (Number(payment.amount) || 0), 0);
    }, 0);

    const returnTotals = returnsToday.reduce((totals, returnEntry) => {
        const summary = getIncomingReceiptItemsSummary(getIncomingReceiptItems(returnEntry));
        totals.totalAmount += Number(returnEntry.totalAmount) || 0;
        Object.keys(totals.byItems).forEach(key => {
            const itemTotals = summary.totals[key];
            if (!itemTotals) return;
            totals.byItems[key].pieces += Number(itemTotals.pieces) || 0;
            totals.byItems[key].kg += Number(itemTotals.kg) || 0;
            totals.byItems[key].total += Number(itemTotals.total) || 0;
        });
        return totals;
    }, {
        totalAmount: 0,
        byItems: createEmptyIncomingReceiptItemTotals()
    });

    const productionTotals = {
        goodUsed: Math.max(0, (Number(closingState.rawUsed.good) || 0) - (Number(openingState.rawUsed.good) || 0)),
        tobaccoGoodUsed: Math.max(0, (Number(closingState.categories?.tobacco?.rawUsed?.good) || 0) - (Number(openingState.categories?.tobacco?.rawUsed?.good) || 0)),
        roastGoodUsed: Math.max(0, (Number(closingState.categories?.roast?.rawUsed?.good) || 0) - (Number(openingState.categories?.roast?.rawUsed?.good) || 0)),
        bigDefectUsed: Math.max(0, (Number(closingState.rawUsed.bigDefect) || 0) - (Number(openingState.rawUsed.bigDefect) || 0)),
        smallDefectUsed: Math.max(0, (Number(closingState.rawUsed.smallDefect) || 0) - (Number(openingState.rawUsed.smallDefect) || 0)),
        mixedProduced: Math.max(0, (Number(closingState.finishedProduced.mixed) || 0) - (Number(openingState.finishedProduced.mixed) || 0)),
        pureProduced: Math.max(0, (Number(closingState.finishedProduced.pure) || 0) - (Number(openingState.finishedProduced.pure) || 0)),
        tobaccoMixedProduced: Math.max(0, (Number(closingState.categories?.tobacco?.finishedProduced?.mixed) || 0) - (Number(openingState.categories?.tobacco?.finishedProduced?.mixed) || 0)),
        tobaccoPureProduced: Math.max(0, (Number(closingState.categories?.tobacco?.finishedProduced?.pure) || 0) - (Number(openingState.categories?.tobacco?.finishedProduced?.pure) || 0)),
        roastMixedProduced: Math.max(0, (Number(closingState.categories?.roast?.finishedProduced?.mixed) || 0) - (Number(openingState.categories?.roast?.finishedProduced?.mixed) || 0)),
        roastPureProduced: Math.max(0, (Number(closingState.categories?.roast?.finishedProduced?.pure) || 0) - (Number(openingState.categories?.roast?.finishedProduced?.pure) || 0))
    };

    const supplierTotals = incomingReceipts.reduce((totals, receipt) => {
        totals.totalAmount += Number(receipt.totalAmount) || 0;
        totals.paidAmount += Number(receipt.paidAmount) || 0;
        totals.outstanding += getReceiptOutstandingAmount(receipt);
        return totals;
    }, {
        totalAmount: 0,
        paidAmount: 0,
        outstanding: 0
    });

    return {
        dateKey: safeDateKey,
        openingState,
        closingState,
        receiptsToday,
        returnsToday,
        invoicesToday,
        salesToday: {
            ...salesToday,
            total: (Number(salesToday.mixed) || 0) + (Number(salesToday.pure) || 0)
        },
        receiptTotals,
        returnTotals,
        productionTotals,
        supplierDebtTotal: supplierTotals.outstanding,
        supplierTotals
    };
}

function renderIncomingPaymentHistory(receipt) {
    const paymentHistory = Array.isArray(receipt?.paymentHistory)
        ? [...receipt.paymentHistory]
            .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
        : [];

    if (!paymentHistory.length) {
        return '<div class="incoming-payment-history empty">Оплат по этой накладной пока не было</div>';
    }

    return `
        <div class="incoming-payment-history">
            <div class="incoming-payment-history-title">История оплат</div>
            <div class="incoming-payment-history-list">
                ${paymentHistory.map(payment => `
                    <div class="incoming-payment-chip">
                        <strong>${formatCurrency(payment.amount)}</strong>
                        <span>${formatShortDateTime(payment.date)}</span>
                        ${payment.paidBy ? `<small>Кто оплатил: ${escapeHtml(payment.paidBy)}</small>` : ''}
                        ${payment.note ? `<small>Комментарий: ${escapeHtml(payment.note)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function preventNumberInputWheelChanges() {
    document.addEventListener('wheel', event => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.type === 'number' && document.activeElement === target) {
            event.preventDefault();
        }
    }, { passive: false });
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    registerServiceWorker();
    await initializePersistentStorage();
    preventNumberInputWheelChanges();

    // Мигрируем старые отчеты (конвертируем ID клиентов в имена)
    migrateOldReports();
    
    // Мигрируем старые долги (добавляем поле invoices)
    migrateOldDebts();
    migrateIncomingInventoryData();
    autoCloseStaleOpenShift();
    autoArchiveOldInvoices();
    
    initializeApp();
    updateStats();
    loadDashboardData();
    addBackupButtons();
    initializeAuth();
    initializeAccessControl();
    renderControlCenter();
    initializeCloudSyncAutoRefresh();
    initializeCloudSync();
    
    // Инициализируем поиск клиентов
    initializeClientSearch();
    
    // Инициализируем кастомный выпадающий список способов оплаты
    initializePaymentTypeSelect();
    
    // Загружаем настройки себестоимости жарки при инициализации
    loadShiftCashSettings();
    populateMoneyWalletSelects();
    syncShiftCashToLeaveInput();
    updateRoastCostDisplay();
    // Инициализируем настройки табака (загружаем значения по умолчанию)
    // Настройки табака будут загружены при открытии вкладки настроек
});

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('service-worker.js')
        .catch(error => console.warn('Service worker не удалось зарегистрировать:', error));
}

// Функция для показа вкладки отчетов (кнопка уже есть в HTML)

// Показать вкладку отчетов
function showReportsTab() {
    // Удаляем активный класс со всех вкладок
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // Добавляем активный класс к вкладке отчетов
    document.querySelector('[data-tab="reports"]').classList.add('active');
    
    // Показываем вкладку отчетов
    document.getElementById('reports').classList.add('active');
    
    // Устанавливаем дату по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-date').value = today;
    
    // Генерируем отчет по умолчанию
    generateReport();

    if (isSellerSimpleMode()) {
        switchReportTab('summary');
    }
    
    // Принудительно обновляем персональные цены
    setTimeout(() => {
        console.log('Принудительное обновление персональных цен при загрузке');
        const filteredReports = reports.filter(report => {
            const reportDate = new Date(report.date);
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            return reportDate >= startDate && reportDate <= endDate;
        });
        displayPersonalPricesAnalysis(filteredReports);
    }, 1000);
}

// Генерация отчета
function generateReport() {
    const selectedDate = document.getElementById('report-date').value;
    const period = document.getElementById('report-period').value;
    
    console.log('=== ГЕНЕРАЦИЯ ОТЧЕТА ===');
    console.log('Выбранная дата:', selectedDate);
    console.log('Период:', period);
    console.log('Всего отчетов в системе:', reports.length);
    console.log('Всего накладных в системе:', invoices.length);
    
    let startDate, endDate;
    
    // Устанавливаем дату по умолчанию если не выбрана
    const reportDate = selectedDate || new Date().toISOString().split('T')[0];
    document.getElementById('report-date').value = reportDate;
    
    if (period === 'today') {
        startDate = new Date(reportDate);
        endDate = new Date(reportDate);
        endDate.setHours(23, 59, 59, 999);
    } else if (period === 'yesterday') {
        startDate = new Date(reportDate);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
        startDate = new Date(reportDate);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(reportDate);
        endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
        startDate = new Date(reportDate);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(reportDate);
        endDate.setHours(23, 59, 59, 999);
    } else { // all
        startDate = new Date(0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }
    
    // Фильтруем отчеты по периоду
    const filteredReports = reports.filter(report => {
        const reportDate = new Date(report.date);
        return reportDate >= startDate && reportDate <= endDate;
    });
    
    console.log('Отфильтрованные отчеты:', filteredReports.length);
    console.log('Период фильтрации:', startDate, 'до', endDate);
    
    // Если нет отчетов за период, показываем сообщение
    if (filteredReports.length === 0) {
        console.log('Нет отчетов за выбранный период');
        updateReportSummary(0, 0, 0, 0);
        displaySalesDetails([]);
        displayPersonalPricesAnalysis([]);
        return;
    }
    
    // Собираем статистику по товарам
    const salesByProduct = {};
    let totalSales = 0;
    let totalAmount = 0;
    let totalItems = 0;
    
    filteredReports.forEach(report => {
        totalSales++;
        totalAmount += report.total;
        
        report.items.forEach(item => {
            if (!salesByProduct[item.productId]) {
                salesByProduct[item.productId] = {
                    name: item.productName,
                    quantity: 0,
                    amount: 0,
                    price: item.price
                };
            }
            
            salesByProduct[item.productId].quantity += item.quantity;
            salesByProduct[item.productId].amount += item.total;
            totalItems += item.quantity;
        });
    });
    
    // Вычисляем средний чек
    const avgOrder = totalSales > 0 ? totalAmount / totalSales : 0;
    
    // Обновляем сводку
    updateReportSummary(totalAmount, totalSales, totalItems, avgOrder);
    
    // Отображаем детализацию
    displaySalesDetails(filteredReports);
    
    // Обновляем анализ персональных цен
    console.log('Вызываем displayPersonalPricesAnalysis с отчетами:', filteredReports.length);
    displayPersonalPricesAnalysis(filteredReports);
}

// Переключение вкладок отчетов
function switchReportTab(tabName) {
    if (isSellerSimpleMode()) {
        tabName = 'summary';
    }

    // Убираем активный класс со всех вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.report-tab-content').forEach(content => content.classList.remove('active'));
    
    // Активируем выбранную вкладку
    const targetTabButton = document.getElementById(tabName + '-tab');
    const targetTabContent = document.getElementById(tabName + '-tab-content');
    if (!targetTabButton || !targetTabContent) {
        return;
    }

    targetTabButton.classList.add('active');
    targetTabContent.classList.add('active');
    
    // Если переключаемся на персональные цены, обновляем данные
    if (tabName === 'personal-prices') {
        const selectedDate = document.getElementById('report-date').value;
        const period = document.getElementById('report-period').value;
        
        let startDate, endDate;
        const reportDate = selectedDate || new Date().toISOString().split('T')[0];
        
        if (period === 'today') {
            startDate = new Date(reportDate);
            endDate = new Date(reportDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'yesterday') {
            startDate = new Date(reportDate);
            startDate.setDate(startDate.getDate() - 1);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'week') {
            startDate = new Date(reportDate);
            startDate.setDate(startDate.getDate() - 7);
            endDate = new Date(reportDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'month') {
            startDate = new Date(reportDate);
            startDate.setMonth(startDate.getMonth() - 1);
            endDate = new Date(reportDate);
            endDate.setHours(23, 59, 59, 999);
        } else { // all
            startDate = new Date(0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        }
        
        const filteredReports = reports.filter(report => {
            const reportDate = new Date(report.date);
            return reportDate >= startDate && reportDate <= endDate;
        });
        
        console.log('Переключение на персональные цены, вызываем displayPersonalPricesAnalysis с отчетами:', filteredReports.length);
        displayPersonalPricesAnalysis(filteredReports);
    }
}

// Обновление сводки отчета
function updateReportSummary(totalAmount, totalSales, totalItems, avgOrder) {
    document.getElementById('total-sales-report').textContent = formatCurrency(totalAmount);
    document.getElementById('total-orders-report').textContent = totalSales;
    document.getElementById('total-items-report').textContent = totalItems;
    document.getElementById('avg-order-report').textContent = formatCurrency(avgOrder);
}

// Отображение деталей продаж
function displaySalesDetails(reports) {
    const container = document.getElementById('sales-details');
    
    if (reports.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p style="font-size: 18px; margin-bottom: 8px;">Нет продаж за выбранный период</p>
                <p style="font-size: 14px; opacity: 0.7;">Попробуйте изменить период или дату</p>
            </div>
        `;
        return;
    }
    
    // Собираем статистику по товарам
    const productStats = {};
    let totalMixedPacks = 0; // Для обратной совместимости
    let totalPurePacks = 0; // Для обратной совместимости
    let totalRoastPacks = 0;
    let totalPacks50 = 0;
    let totalPacks41 = 0;
    let totalPacks32 = 0;
    let totalPacks23 = 0;
    
    reports.forEach(report => {
        report.items.forEach(item => {
            if (!productStats[item.productId]) {
                // Получаем стандартную цену товара
                const product = products.find(p => p.id === item.productId);
                const standardPrice = product ? product.salePrice : item.price;
                
                productStats[item.productId] = {
                    name: item.productName,
                    totalQuantity: 0,
                    totalAmount: 0,
                    price: standardPrice, // Используем стандартную цену
                    unit: item.unit,
                    hasPersonalPrices: false,
                    packs50: 0,
                    packs41: 0,
                    packs32: 0,
                    packs23: 0,
                    // Для обратной совместимости
                    mixedPacks: 0,
                    purePacks: 0,
                    totalRoastPacks: 0
                };
            }
            productStats[item.productId].totalQuantity += item.quantity;
            productStats[item.productId].totalAmount += item.total;
            
            // Подсчитываем пакеты жарки (новая версия с типами 5/0, 4/1, 3/2, 2/3)
            if (item.roast) {
                const roastParts = getRoastParts(item.roast);
                if (roastParts.length > 0) {
                    roastParts.forEach(part => {
                        productStats[item.productId][part.packField] += part.packs;
                        productStats[item.productId].totalRoastPacks += part.packs;

                        if (part.type === '5-0') totalPacks50 += part.packs;
                        if (part.type === '4-1') totalPacks41 += part.packs;
                        if (part.type === '3-2') totalPacks32 += part.packs;
                        if (part.type === '2-3') totalPacks23 += part.packs;

                        totalRoastPacks += part.packs;
                    });
                } else {
                    // Старая версия (обратная совместимость)
                    const mixedPacks = parseInt(item.roast.mixedPacks || 0);
                    const purePacks = parseInt(item.roast.purePacks || 0);
                    const totalPacks = mixedPacks + purePacks;
                    
                    productStats[item.productId].mixedPacks += mixedPacks;
                    productStats[item.productId].purePacks += purePacks;
                    productStats[item.productId].totalRoastPacks += totalPacks;
                    
                    totalMixedPacks += mixedPacks;
                    totalPurePacks += purePacks;
                    totalRoastPacks += totalPacks;
                }
            }
            
            // Проверяем, были ли персональные цены
            if (item.price !== productStats[item.productId].price) {
                productStats[item.productId].hasPersonalPrices = true;
            }
        });
    });
    
    // Сортируем товары по количеству продаж
    const sortedProducts = Object.values(productStats).sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    container.innerHTML = `
        <div class="sales-table-container">
            <h4 style="margin-bottom: 20px; color: #374151; font-weight: 600;">
                <i class="fas fa-box" style="margin-right: 8px; color: #3b82f6;"></i>
                Детализация продаж по товарам
            </h4>
            
            ${totalRoastPacks > 0 ? `
                <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; border: 1px solid #f59e0b;">
                    <h5 style="margin-bottom: 15px; color: #92400e; font-weight: 600;">
                        <i class="fas fa-fire" style="margin-right: 8px; color: #f59e0b;"></i>
                        Статистика по пакетам жарки
                    </h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        ${totalPacks50 > 0 || totalPacks41 > 0 || totalPacks32 > 0 || totalPacks23 > 0 ? `
                            ${ROAST_TYPE_CONFIGS.map(config => {
                                const countByType = {
                                    '5-0': totalPacks50,
                                    '4-1': totalPacks41,
                                    '3-2': totalPacks32,
                                    '2-3': totalPacks23
                                };
                                const count = countByType[config.type] || 0;
                                if (count <= 0) return '';
                                return `
                                    <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                        <div style="font-size: 24px; font-weight: 700; color: ${config.countColor}; margin-bottom: 5px;">
                                            ${count}
                                        </div>
                                        <div style="font-size: 14px; color: ${config.textColor}; font-weight: 500;">
                                            ${config.label} пакетов
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        ` : `
                            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 24px; font-weight: 700; color: #f59e0b; margin-bottom: 5px;">
                                    ${totalMixedPacks}
                                </div>
                                <div style="font-size: 14px; color: #92400e; font-weight: 500;">
                                    Мешаных пакетов
                                </div>
                            </div>
                            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-size: 24px; font-weight: 700; color: #10b981; margin-bottom: 5px;">
                                    ${totalPurePacks}
                                </div>
                                <div style="font-size: 14px; color: #059669; font-weight: 500;">
                                    Не мешаных пакетов
                                </div>
                            </div>
                        `}
                        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="font-size: 24px; font-weight: 700; color: #3b82f6; margin-bottom: 5px;">
                                ${totalRoastPacks}
                            </div>
                            <div style="font-size: 14px; color: #1d4ed8; font-weight: 500;">
                                Всего пакетов
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            <table class="sales-table">
                <thead>
                    <tr>
                        <th>Товар</th>
                        <th>Количество продано</th>
                        <th>Пакеты жарки</th>
                        <th>Стандартная цена</th>
                        <th>Общая сумма</th>
                        <th>% от общих продаж</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedProducts.map(product => {
                        const totalSalesAmount = reports.reduce((sum, report) => sum + report.total, 0);
                        const percentage = totalSalesAmount > 0 ? ((product.totalAmount / totalSalesAmount) * 100).toFixed(1) : 0;
                        
                        // Рассчитываем потенциальную выручку по стандартным ценам
                        const potentialRevenue = product.totalQuantity * product.price;
                        const actualRevenue = product.totalAmount;
                        const revenueDifference = potentialRevenue - actualRevenue;
                        
                        // Формируем информацию о пакетах жарки
                        let roastInfo = '';
                        const totalPacks = product.totalRoastPacks || (product.packs50 + product.packs41 + product.packs32 + product.packs23);
                        if (totalPacks > 0) {
                            if (product.packs50 !== undefined || product.packs41 !== undefined || product.packs32 !== undefined || product.packs23 !== undefined) {
                                roastInfo = `
                                    <div style="font-size: 13px; line-height: 1.4;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; flex-wrap: wrap; gap: 8px;">
                                            ${ROAST_TYPE_CONFIGS.map(config => {
                                                const count = product[config.packField] || 0;
                                                return count > 0 ? `<span style="color: ${config.countColor}; font-weight: 600;">${config.label}: ${count}</span>` : '';
                                            }).join('')}
                                        </div>
                                        <div style="text-align: center; padding: 4px 8px; background: #f3f4f6; border-radius: 4px; font-weight: 600; color: #374151;">
                                            Всего: ${totalPacks} пакетов
                                        </div>
                                    </div>
                                `;
                            } else {
                                // Старая версия (обратная совместимость)
                                roastInfo = `
                                    <div style="font-size: 13px; line-height: 1.4;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            <span style="color: #f59e0b; font-weight: 600;">
                                                <i class="fas fa-fire" style="margin-right: 4px;"></i>
                                                Мешаные: ${product.mixedPacks}
                                            </span>
                                            <span style="color: #10b981; font-weight: 600;">
                                                <i class="fas fa-leaf" style="margin-right: 4px;"></i>
                                                Не мешаные: ${product.purePacks}
                                            </span>
                                        </div>
                                        <div style="text-align: center; padding: 4px 8px; background: #f3f4f6; border-radius: 4px; font-weight: 600; color: #374151;">
                                            Всего: ${product.totalRoastPacks} пакетов
                                        </div>
                                    </div>
                                `;
                            }
                        } else {
                            roastInfo = '<span style="color: #9ca3af; font-style: italic;">Нет данных о жарке</span>';
                        }

                        return `
                            <tr>
                                <td>
                                    <div style="font-weight: 600; color: #1f2937;">
                                        ${product.name}
                                        ${product.hasPersonalPrices ? '<span style="color: #e74c3c; font-size: 12px; margin-left: 8px;">(есть персональные цены)</span>' : ''}
                                    </div>
                                </td>
                                <td>
                                    <span style="font-weight: 600; color: #059669;">
                                        ${formatQuantity(product.totalQuantity, product.unit)} ${product.unit || 'шт.'}
                                    </span>
                                </td>
                                <td>
                                    ${roastInfo}
                                </td>
                                <td>${formatCurrency(product.price)}</td>
                                <td>
                                    <span style="font-weight: 600; color: #1d4ed8;">
                                        ${formatCurrency(actualRevenue)}
                                    </span>
                                    ${product.hasPersonalPrices ? `
                                        <br><small style="color: #e74c3c;">
                                            Потенциально: ${formatCurrency(potentialRevenue)}
                                            ${revenueDifference !== 0 ? `(${revenueDifference > 0 ? '-' : '+'}${formatCurrency(Math.abs(revenueDifference))})` : ''}
                                        </small>
                                    ` : ''}
                                </td>
                                <td>
                                    <span class="percentage-badge">
                                        ${percentage}%
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 12px; border: 1px solid #e2e8f0;">
                <h5 style="margin-bottom: 15px; color: #374151; font-weight: 600;">
                    <i class="fas fa-info-circle" style="margin-right: 8px; color: #3b82f6;"></i>
                    Сводка по накладным
                </h5>
                <table class="sales-table" style="margin-bottom: 0;">
                    <thead>
                        <tr>
                            <th style="width: 40px;">
                                <input type="checkbox" id="selectAllInvoices" onchange="toggleAllInvoices(this)">
                            </th>
                            <th>Дата</th>
                            <th>Клиент</th>
                            <th>Товары</th>
                            <th>Сумма</th>
                            <th>Тип оплаты</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.sort((a, b) => new Date(b.date) - new Date(a.date)).map(report => {
                            const sourceInvoice = invoices.find(invoice => invoice.id === report.invoiceId);
                            const itemsList = formatInvoiceItemsSummary(sourceInvoice?.items || report.items || []);
                            
                            // Проверяем, является ли client ID или именем
                            let clientName = getDisplayClientName(report.client);
                            
                            return `
                                <tr>
                                    <td>
                                        <input type="checkbox" class="invoice-checkbox" value="${report.id}" onchange="updateDeleteButton()">
                                    </td>
                                    <td>${formatDate(report.date)}</td>
                                    <td>${clientName}</td>
                                    <td>
                                        <div style="max-width: 500px; word-wrap: break-word; line-height: 1.4;" title="${itemsList}">
                                            ${itemsList}
                                        </div>
                                    </td>
                                    <td>${formatCurrency(report.total)}</td>
                                    <td>
                                        <span class="payment-badge ${report.paymentType === 'cash' ? 'cash' : 'debt'}">
                                            ${report.paymentType === 'cash' ? 'Наличные' : 'В долг'}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}





// Создать отчет о продаже
function createSalesReport(invoice) {
    // Находим имя клиента по ID
    const client = clients.find(c => c.id === invoice.client);
    const clientName = getDisplayClientName(invoice.client);
    
    console.log('=== СОЗДАНИЕ ОТЧЕТА ПРОДАЖ ===');
    console.log('Накладная:', invoice.id);
    console.log('Клиент:', clientName);
    console.log('Дата:', invoice.date);
    console.log('Товары:', invoice.items.length);
    
    const report = {
        id: generateId(),
        invoiceId: invoice.id,
        date: invoice.date,
        client: clientName,
        clientId: invoice.client, // Сохраняем и ID для совместимости
        paymentType: invoice.paymentType,
        total: invoice.total,
        items: invoice.items.map(item => {
            console.log(`Создание отчета для товара: ${item.productName}, tobaccoType: ${item.tobaccoType}`);
            return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                unit: item.unit,
                packageSaleMode: item.packageSaleMode || 'whole',
                tobaccoType: item.tobaccoType, // Добавляем тип табака
                tobaccoPackCount: item.tobaccoPackCount,
                openedTobaccoPackCount: item.openedTobaccoPackCount,
                kgItemCount: item.kgItemCount,
                roastType: item.roastType, // Добавляем тип жарки (одиночный)
                openedRoastPackCount: item.openedRoastPackCount,
                roastTypeOrder: item.roastTypeOrder || [],
                roast: item.roast // Детальная разбивка по жарке (пакеты и кг)
            };
        }),
        createdAt: new Date().toISOString()
    };
    
    reports.push(report);
    saveData('reports', reports);
    
    console.log('Отчет создан и сохранен. Всего отчетов:', reports.length);
}

// Функция для миграции старых долгов (добавление поля invoices)
function migrateOldDebts() {
    let hasChanges = false;
    
    debts.forEach(debt => {
        if (!debt.invoices) {
            debt.invoices = [];
            hasChanges = true;
        }
        if (!Array.isArray(debt.history)) {
            debt.history = [];
            hasChanges = true;
        }
        if (!debt.createdAt) {
            debt.createdAt = new Date().toISOString();
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        saveData('debts', debts);
        console.log('Мигрированы старые долги: добавлено поле invoices');
    }
}

function ensureDebtRecordShape(debt) {
    if (!debt) return null;

    debt.amount = Number(debt.amount) || 0;
    debt.paidAmount = Math.max(0, Number(debt.paidAmount) || 0);
    debt.clientName = debt.clientName || 'Без имени';

    if (!Array.isArray(debt.invoices)) {
        debt.invoices = [];
    }

    if (!Array.isArray(debt.history)) {
        debt.history = [];
    }

    if (!debt.createdAt) {
        debt.createdAt = new Date().toISOString();
    }

    return debt;
}

function getDebtClientName(clientIdOrName) {
    const name = getDisplayClientName(clientIdOrName);
    if (!name || name === 'Без клиента') {
        return null;
    }
    return name;
}

function getDebtInvoiceTotal(debt) {
    return (debt?.invoices || []).reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
}

function isDebtPaymentCancelled(payment) {
    return payment?.status === 'cancelled' || Boolean(payment?.cancelledAt);
}

function getDebtPaymentsForDebt(debtId, { includeCancelled = true } = {}) {
    return (Array.isArray(debtPayments) ? debtPayments : [])
        .filter(payment => payment.debtId === debtId)
        .filter(payment => includeCancelled || !isDebtPaymentCancelled(payment))
        .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
}

function getDebtRecordedPaymentTotal(debtId) {
    return getDebtPaymentsForDebt(debtId, { includeCancelled: false })
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
}

function getDebtPaidAmount(debt) {
    return Math.max(Number(debt?.paidAmount) || 0, getDebtRecordedPaymentTotal(debt?.id));
}

function hasManualDebtAmountAdjustment(debt) {
    return (debt?.history || []).some(entry => ['add', 'subtract'].includes(entry.type) && !entry.invoiceId);
}

function getDebtExpectedOutstandingAmount(debt) {
    const invoiceTotal = getDebtInvoiceTotal(debt);
    return roundCurrencyAmount(Math.max(0, invoiceTotal - getDebtPaidAmount(debt)));
}

function syncDebtsFromInvoices() {
    let hasChanges = false;
    const paidOffInvoiceIds = new Set(
        getArchivedDebts()
            .flatMap(debt => Array.isArray(debt.invoices) ? debt.invoices : [])
            .map(invoice => invoice.id)
            .filter(Boolean)
    );

    invoices.forEach(invoice => {
        if (!isActiveInvoiceRecord(invoice)) return;
        if (invoice.paymentType !== 'debt') return;
        if (paidOffInvoiceIds.has(invoice.id)) return;

        const clientName = getDebtClientName(invoice.client);
        if (!clientName) return;

        let debt = ensureDebtRecordShape(debts.find(item => item.clientName === clientName));
        if (!debt) {
            const invoiceNumber = invoices.findIndex(inv => inv.id === invoice.id) + 1;
            debt = {
                id: generateId(),
                clientName,
                amount: Number(invoice.total) || 0,
                description: `Долг по накладной №${invoiceNumber > 0 ? invoiceNumber : '?'}`,
                createdAt: invoice.date || new Date().toISOString(),
                invoices: [{
                    id: invoice.id,
                    number: invoiceNumber > 0 ? invoiceNumber : '?',
                    amount: Number(invoice.total) || 0,
                    date: invoice.date,
                    items: invoice.items || []
                }],
                history: [{
                    type: 'auto_sync',
                    amount: Number(invoice.total) || 0,
                    date: new Date().toISOString(),
                    invoiceId: invoice.id,
                    description: `🔄 Автоматически восстановлен долг из накладной`
                }]
            };
            debts.push(debt);
            hasChanges = true;
            return;
        }

        const exists = debt.invoices.some(item => item.id === invoice.id);
        if (!exists) {
            const invoiceNumber = invoices.findIndex(inv => inv.id === invoice.id) + 1;
            debt.invoices.push({
                id: invoice.id,
                number: invoiceNumber > 0 ? invoiceNumber : '?',
                amount: Number(invoice.total) || 0,
                date: invoice.date,
                items: invoice.items || []
            });
            debt.amount += Number(invoice.total) || 0;
            debt.history.push({
                type: 'auto_sync',
                amount: Number(invoice.total) || 0,
                date: new Date().toISOString(),
                invoiceId: invoice.id,
                description: `🔄 Автоматически восстановлен пропущенный долг из накладной`
            });
            hasChanges = true;
        }
    });

    if (hasChanges) {
        saveData('debts', debts);
    }
}

// Функция для миграции старых отчетов (конвертация ID клиентов в имена)
function migrateOldReports() {
    let hasChanges = false;
    
    reports.forEach(report => {
        // Проверяем, является ли client ID (длинная строка)
        if (report.client && report.client.length > 20) {
            const client = clients.find(c => c.id === report.client);
            if (client) {
                report.client = client.name;
                hasChanges = true;
            }
        }
    });
    
    if (hasChanges) {
        saveData('reports', reports);
        console.log('Старые отчеты успешно мигрированы');
    }
}

// Очистить все отчеты (улучшенная версия)
function clearAllReports() {
    if (confirm('ВНИМАНИЕ! Это действие удалит ВСЕ отчеты за все время. Это действие нельзя отменить.\n\nВы уверены, что хотите удалить все отчеты?')) {
        if (confirm('Последнее предупреждение: Вы собираетесь удалить все отчеты. Это действие необратимо.\n\nНажмите OK для подтверждения.')) {
            // Полностью удаляем все отчеты из массива
            reports = [];
            
            // Сохраняем изменения в localStorage
            saveData('reports', reports);

            // Обновляем отчет
            generateReport();
            
            alert('Все отчеты успешно удалены! Место в памяти освобождено.');
        }
    }
}

// Экспорт отчета
function exportSalesReport() {
    const selectedDate = document.getElementById('report-date').value;
    const period = document.getElementById('report-period').value;
    
    let startDate, endDate;
    
    if (period === 'day') {
        startDate = new Date(selectedDate);
        endDate = new Date(selectedDate);
    } else if (period === 'week') {
        startDate = new Date(selectedDate);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(selectedDate);
    } else if (period === 'month') {
        startDate = new Date(selectedDate);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(selectedDate);
    } else {
        startDate = new Date(0);
        endDate = new Date();
    }
    
    const filteredReports = reports.filter(report => {
        const reportDate = new Date(report.date);
        return reportDate >= startDate && reportDate <= endDate;
    });
    
    const salesByProduct = {};
    let totalAmount = 0;
    
    filteredReports.forEach(report => {
        totalAmount += report.total;
        report.items.forEach(item => {
            if (!salesByProduct[item.productId]) {
                salesByProduct[item.productId] = {
                    name: item.productName,
                    quantity: 0,
                    amount: 0,
                    price: item.price
                };
            }
            salesByProduct[item.productId].quantity += item.quantity;
            salesByProduct[item.productId].amount += item.total;
        });
    });
    
    const reportData = {
        period: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalReports: filteredReports.length,
        totalAmount: totalAmount,
        products: Object.values(salesByProduct)
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `sales-report-${selectedDate}-${period}.json`;
    link.click();
    
    alert('Отчет экспортирован!');
}

// Добавление кнопок резервного копирования
function addBackupButtons() {
    const sidebar = document.querySelector('.nav-menu');
    const backupItem = document.createElement('li');
    backupItem.className = 'nav-item';
    backupItem.setAttribute('data-tab', 'backup');
    backupItem.innerHTML = `
        <i class="fas fa-download"></i>
        <span>Резервная копия</span>
    `;
    backupItem.addEventListener('click', showBackupTab);
    sidebar.appendChild(backupItem);
}

// Показать вкладку резервного копирования
function showBackupTab() {
    // Создаем вкладку если её нет
    if (!document.getElementById('backup')) {
        const tabContent = document.querySelector('.tab-content');
        const backupPane = document.createElement('div');
        backupPane.id = 'backup';
        backupPane.className = 'tab-pane';
        backupPane.innerHTML = `
            <div class="section-header">
                <h2><i class="fas fa-download"></i> Резервная копия данных</h2>
            </div>
            <div class="backup-section">
                <div class="backup-card">
                    <h3><i class="fas fa-download"></i> Экспорт данных</h3>
                    <p>Создайте полный снимок программы: товары, клиенты, накладные, смены, журнал действий, приход, долги и настройки</p>
                    <button class="btn btn-primary" onclick="exportData()">
                        <i class="fas fa-download"></i> Экспортировать данные
                    </button>
                </div>
                <div class="backup-card">
                    <h3><i class="fas fa-cash-register"></i> Экспорт смены</h3>
                    <p>Скачайте полный файл после закрытия смены, чтобы отправить его руководителю</p>
                    <button class="btn btn-success" onclick="exportShiftData()">
                        <i class="fas fa-file-export"></i> Экспортировать смену
                    </button>
                </div>
                <div class="backup-card">
                    <h3><i class="fas fa-upload"></i> Импорт данных</h3>
                    <p>Загрузите файл от руководителя. Полный файл заменит данные, файл смены добавит смену</p>
                    <input type="file" id="importFile" accept=".json" style="display: none;" onchange="importData(this)">
                    <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">
                        <i class="fas fa-upload"></i> Выбрать файл
                    </button>
                </div>
                <div class="backup-card">
                    <h3><i class="fas fa-mobile-screen-button"></i> Телефон и облако</h3>
                    <p>Настройте Supabase-синхронизацию и перенесите эти настройки на телефон одним файлом</p>
                    <input type="file" id="cloudSyncImportFile" accept=".json" style="display: none;" onchange="importCloudSyncSettings(this)">
                    <div class="backup-buttons">
                        <button class="btn btn-primary" onclick="configureCloudSync()" style="margin: 5px;">
                            <i class="fas fa-cloud"></i> Настроить
                        </button>
                        <button class="btn btn-success" onclick="syncCloudNow()" style="margin: 5px;">
                            <i class="fas fa-arrows-rotate"></i> Синхронизировать
                        </button>
                        <button class="btn btn-secondary" onclick="exportCloudSyncSettings()" style="margin: 5px;">
                            <i class="fas fa-file-export"></i> Файл для телефона
                        </button>
                        <button class="btn btn-info" onclick="document.getElementById('cloudSyncImportFile').click()" style="margin: 5px;">
                            <i class="fas fa-file-import"></i> Импорт настроек
                        </button>
                    </div>
                </div>
                <div class="backup-card">
                    <h3><i class="fas fa-info-circle"></i> Информация о данных</h3>
                    <div class="data-info">
                        <p><strong>Категории:</strong> ${categories.length}</p>
                        <p><strong>Товары:</strong> ${products.length}</p>
                        <p><strong>Клиенты:</strong> ${clients.length}</p>
                        <p><strong>Накладные:</strong> ${invoices.length}</p>
                        <p><strong>Долги:</strong> ${debts.length}</p>
                        <p><strong>Движения:</strong> ${movements.length}</p>
                        <p><strong>Персональные цены:</strong> ${personalPrices.length}</p>
                        <p><strong>Смены:</strong> ${shiftSessions.length}</p>
                        <p><strong>Деньги:</strong> ${moneyTransactions.length}</p>
                        <p><strong>Журнал действий:</strong> ${activityLog.length}</p>
                        <p><strong>Приход:</strong> ${incomingReceipts.length}</p>
                        <p><strong>Архив прихода:</strong> ${archivedIncomingReceipts.length}</p>
                        <p><strong>Стартовые остатки:</strong> ${initialStockEntries.length}</p>
                        <p><strong>Возвраты поставщику:</strong> ${supplierReturns.length}</p>
                        <p><strong>Фасовка:</strong> ${packageProductions.length}</p>
                    </div>
                </div>
                <div class="backup-card manager-only-card">
                    <h3><i class="fas fa-database"></i> Управление localStorage</h3>
                    <p>Проверка и очистка данных в браузере</p>
                    <div class="backup-buttons">
                        <button class="btn btn-info manager-only-action" onclick="checkLocalStorageSize()" style="margin: 5px;">
                            <i class="fas fa-chart-pie"></i> Размер данных
                        </button>
                        <button class="btn btn-primary manager-only-action" onclick="checkIndexedDBStorageSize()" style="margin: 5px;">
                            <i class="fas fa-database"></i> Размер IndexedDB
                        </button>
                        <button class="btn btn-warning manager-only-action" onclick="cleanupLocalStorage()" style="margin: 5px;">
                            <i class="fas fa-broom"></i> Очистить мусор
                        </button>
                        <button class="btn btn-danger manager-only-action" onclick="clearAllLocalStorage()" style="margin: 5px;">
                            <i class="fas fa-trash-alt"></i> Очистить ВСЕ
                        </button>
                    </div>
                </div>
                <div class="backup-card manager-only-card">
                    <h3><i class="fas fa-tools"></i> Дополнительные инструменты</h3>
                    <p>Полезные функции для работы с данными</p>
                    <div class="backup-buttons">
                        <button class="btn btn-success manager-only-action" onclick="exportSelectedData()" style="margin: 5px;">
                            <i class="fas fa-file-export"></i> Экспорт выборочно
                        </button>
                        <button class="btn btn-primary manager-only-action" onclick="showDataAnalytics()" style="margin: 5px;">
                            <i class="fas fa-chart-bar"></i> Аналитика данных
                        </button>
                        <button class="btn btn-secondary manager-only-action" onclick="showDataIntegrity()" style="margin: 5px;">
                            <i class="fas fa-shield-alt"></i> Проверка целостности
                        </button>
                        <button class="btn btn-info manager-only-action" onclick="showBackupHistory()" style="margin: 5px;">
                            <i class="fas fa-history"></i> История резервных копий
                        </button>
                    </div>
                </div>
            </div>
        `;
        tabContent.appendChild(backupPane);
    }

    // Переключаемся на вкладку
    switchTab('backup');
    applyAccessControl();
}

// Экспорт данных
function exportData() {
    const data = collectFullExportData();
    downloadJsonFile(data, buildExportFileName('warehouse-full-backup'));
    alert('Полная резервная копия создана. Этот файл можно отправить руководителю и импортировать на другом компьютере.');
}

const persistentStorageState = {
    db: null,
    ready: false,
    available: false,
    pendingWrites: new Map(),
    flushTimer: null
};

function shouldUseIndexedDBStorage(key) {
    return INDEXED_DB_STORAGE_KEYS.has(key) && !LOCAL_ONLY_KEYS.has(key);
}

function openPersistentDatabase() {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB недоступен'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
                db.createObjectStore(INDEXED_DB_STORE, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Не удалось открыть IndexedDB'));
    });
}

function persistentDbRequest(storeName, mode, callback) {
    const db = persistentStorageState.db;
    if (!db) {
        return Promise.reject(new Error('IndexedDB не подключен'));
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = callback(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || transaction.error || new Error('Ошибка IndexedDB'));
    });
}

function persistentDbGet(key) {
    return persistentDbRequest(INDEXED_DB_STORE, 'readonly', store => store.get(key));
}

function persistentDbPut(key, value) {
    return persistentDbRequest(INDEXED_DB_STORE, 'readwrite', store => store.put({
        key,
        value,
        updatedAt: new Date().toISOString()
    }));
}

function persistentDbClear() {
    return persistentDbRequest(INDEXED_DB_STORE, 'readwrite', store => store.clear());
}

async function readIndexedDbStateSnapshot() {
    if (!persistentStorageState.available) return {};

    const snapshot = {};
    for (const key of INDEXED_DB_STORAGE_KEYS) {
        try {
            const record = await persistentDbGet(key);
            if (record && record.value !== undefined) {
                snapshot[key] = record.value;
            }
        } catch (error) {
            console.warn(`Не удалось прочитать IndexedDB ключ ${key}:`, error);
        }
    }

    return snapshot;
}

function readLocalStorageStateSnapshot() {
    return [...INDEXED_DB_STORAGE_KEYS].reduce((snapshot, key) => {
        const value = readStorageJson(key, undefined);
        if (value !== undefined) {
            snapshot[key] = value;
        }
        return snapshot;
    }, {});
}

function applyPersistentStateSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') return;

    if (Array.isArray(snapshot.categories)) categories = snapshot.categories;
    if (Array.isArray(snapshot.products)) products = snapshot.products;
    if (Array.isArray(snapshot.clients)) clients = snapshot.clients;
    if (Array.isArray(snapshot.invoices)) invoices = snapshot.invoices;
    if (Array.isArray(snapshot.archivedInvoices)) archivedInvoices = snapshot.archivedInvoices.map(normalizeArchivedInvoice);
    if (Array.isArray(snapshot.debts)) debts = snapshot.debts;
    if (Array.isArray(snapshot.movements)) movements = snapshot.movements;
    if (Array.isArray(snapshot.reports)) reports = snapshot.reports;
    if (Array.isArray(snapshot.personalPrices)) personalPrices = snapshot.personalPrices;
    if (Array.isArray(snapshot.shiftSessions)) shiftSessions = snapshot.shiftSessions;
    if (Array.isArray(snapshot.activityLog)) activityLog = snapshot.activityLog;
    if (Array.isArray(snapshot.debtPayments)) debtPayments = snapshot.debtPayments;
    if (Array.isArray(snapshot.moneyTransactions)) moneyTransactions = snapshot.moneyTransactions.map(normalizeMoneyTransaction);
    if (Array.isArray(snapshot.incomingReceipts)) incomingReceipts = snapshot.incomingReceipts.map(normalizeIncomingReceipt);
    if (Array.isArray(snapshot.archivedIncomingReceipts)) archivedIncomingReceipts = snapshot.archivedIncomingReceipts.map(normalizeArchivedIncomingReceipt);
    if (Array.isArray(snapshot.initialStockEntries)) initialStockEntries = snapshot.initialStockEntries.map(normalizeInitialStockEntry);
    if (Array.isArray(snapshot.supplierReturns)) supplierReturns = snapshot.supplierReturns.map(normalizeSupplierReturn);
    if (Array.isArray(snapshot.packageProductions)) packageProductions = snapshot.packageProductions.map(normalizePackageProduction);
    if (Array.isArray(snapshot.openedStockEvents)) openedStockEvents = snapshot.openedStockEvents.map(normalizeOpenedStockEvent);

    EXTRA_STORAGE_FIELDS.forEach(key => {
        if (LOCAL_ONLY_KEYS.has(key)) return;
        if (snapshot[key] !== undefined) {
            localStorage.setItem(key, JSON.stringify(snapshot[key]));
        }
    });
}

async function migrateLocalStorageToIndexedDB() {
    if (!persistentStorageState.available) return;

    const localSnapshot = readLocalStorageStateSnapshot();
    const keys = Object.keys(localSnapshot).filter(key => shouldUseIndexedDBStorage(key));
    if (!keys.length) return;

    for (const key of keys) {
        const existingRecord = await persistentDbGet(key);
        if (!existingRecord || existingRecord.value === undefined) {
            await persistentDbPut(key, localSnapshot[key]);
        }
        localStorage.removeItem(key);
    }
}

async function initializePersistentStorage() {
    try {
        persistentStorageState.db = await openPersistentDatabase();
        persistentStorageState.available = true;
        persistentStorageState.ready = true;
        if (navigator.storage && typeof navigator.storage.persist === 'function') {
            navigator.storage.persist().catch(error => console.warn('Не удалось запросить постоянное хранилище:', error));
        }
        await migrateLocalStorageToIndexedDB();
        const indexedSnapshot = await readIndexedDbStateSnapshot();
        applyPersistentStateSnapshot(indexedSnapshot);
    } catch (error) {
        persistentStorageState.available = false;
        persistentStorageState.ready = false;
        console.warn('IndexedDB недоступен, используется localStorage:', error);
        applyPersistentStateSnapshot(readLocalStorageStateSnapshot());
    }
}

function schedulePersistentWrite(key, value) {
    if (!shouldUseIndexedDBStorage(key) || !persistentStorageState.available) {
        localStorage.setItem(key, JSON.stringify(value));
        return;
    }

    persistentStorageState.pendingWrites.set(key, value);
    if (persistentStorageState.flushTimer) return;

    persistentStorageState.flushTimer = setTimeout(flushPersistentWrites, 0);
}

async function flushPersistentWrites() {
    const writes = Array.from(persistentStorageState.pendingWrites.entries());
    persistentStorageState.pendingWrites.clear();
    persistentStorageState.flushTimer = null;

    for (const [key, value] of writes) {
        try {
            await persistentDbPut(key, value);
            if (shouldUseIndexedDBStorage(key)) {
                localStorage.removeItem(key);
            }
        } catch (error) {
            console.warn(`Не удалось записать ${key} в IndexedDB, сохраняю в localStorage:`, error);
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (storageError) {
                console.error(`Не удалось сохранить ${key}:`, storageError);
            }
        }
    }
}

function readStorageJson(key, fallback = null) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;

    try {
        return JSON.parse(raw);
    } catch (error) {
        return fallback;
    }
}

function getCurrentAppState() {
    return {
        categories,
        products,
        clients,
        invoices,
        archivedInvoices,
        debts,
        movements,
        reports,
        personalPrices,
        shiftSessions,
        debtPayments,
        moneyTransactions,
        activityLog,
        incomingReceipts,
        archivedIncomingReceipts,
        initialStockEntries,
        supplierReturns,
        packageProductions,
        openedStockEvents,
        archivedDebts: readStorageJson('archivedDebts', []),
        earningsMargins: readStorageJson('earningsMargins', {}),
        roastCostSettings: readStorageJson('roastCostSettings', null),
        tobaccoCostSettings: readStorageJson('tobaccoCostSettings', null),
        shiftCashSettings: readStorageJson('shiftCashSettings', null),
        cashControlSettings: readStorageJson('cashControlSettings', null),
        backupHistory: readStorageJson('backupHistory', []),
        debts_backup: readStorageJson('debts_backup', null),
        cloudSyncConfig: readStorageJson('cloudSyncConfig', null),
        securitySettings: readStorageJson('securitySettings', securitySettings),
        certificateDebtSettings: readStorageJson('certificateDebtSettings', null)
    };
}

function getActivityLogForShiftExport(shiftId) {
    const shift = shiftSessions.find(item => item.id === shiftId);
    if (!shift) return [];

    const shiftStart = shift.openedAt ? new Date(shift.openedAt) : null;
    const shiftEnd = new Date(shift.closedAt || Date.now());

    return (Array.isArray(activityLog) ? activityLog : []).filter(entry => {
        if (entry.shiftId && entry.shiftId === shiftId) return true;
        if (entry.shiftId && entry.shiftId !== shiftId) return false;
        if (!entry.createdAt || !shiftStart || Number.isNaN(shiftStart.getTime())) return false;

        const entryDate = new Date(entry.createdAt);
        return entryDate >= shiftStart && entryDate <= shiftEnd;
    });
}

function getExportCounts(state) {
    return {
        categories: state.categories?.length || 0,
        products: state.products?.length || 0,
        clients: state.clients?.length || 0,
        invoices: state.invoices?.length || 0,
        archivedInvoices: state.archivedInvoices?.length || 0,
        debts: state.debts?.length || 0,
        movements: state.movements?.length || 0,
        reports: state.reports?.length || 0,
        personalPrices: state.personalPrices?.length || 0,
        shiftSessions: state.shiftSessions?.length || 0,
        moneyTransactions: state.moneyTransactions?.length || 0,
        activityLog: state.activityLog?.length || 0,
        incomingReceipts: state.incomingReceipts?.length || 0,
        archivedIncomingReceipts: state.archivedIncomingReceipts?.length || 0,
        initialStockEntries: state.initialStockEntries?.length || 0,
        supplierReturns: state.supplierReturns?.length || 0,
        packageProductions: state.packageProductions?.length || 0,
        openedStockEvents: state.openedStockEvents?.length || 0,
        archivedDebts: state.archivedDebts?.length || 0
    };
}

function collectFullExportData(options = {}) {
    const shiftActivityLog = options.shiftId ? getActivityLogForShiftExport(options.shiftId) : [];
    const appState = {
        ...getCurrentAppState(),
        ...(options.shiftId ? { shiftActivityLog } : {})
    };
    const exportedAt = new Date().toISOString();

    return {
        exportType: FULL_EXPORT_TYPE,
        schemaVersion: FULL_EXPORT_SCHEMA_VERSION,
        version: String(FULL_EXPORT_SCHEMA_VERSION),
        exportDate: exportedAt,
        exportedAt,
        exportedBy: getActorLabel(),
        sourceShiftId: options.shiftId || null,
        shiftActivityLog,
        note: options.note || 'Полный офлайн-снимок состояния программы',
        counts: getExportCounts(appState),
        appState,
        ...APP_STATE_FIELDS.reduce((acc, field) => {
            acc[field] = appState[field];
            return acc;
        }, {})
    };
}

function buildExportFileName(prefix, shift = null) {
    const datePart = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const sellerPart = shift?.sellerName ? `-${sanitizeFileName(shift.sellerName)}` : '';
    return `${prefix}${sellerPart}-${datePart}.json`;
}

function sanitizeFileName(value) {
    return String(value || '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .slice(0, 40);
}

function downloadJsonFile(data, fileName) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportShiftData(shiftId = null) {
    const shift = shiftId
        ? shiftSessions.find(item => item.id === shiftId)
        : (getCurrentShift() || getRecentShifts(1)[0]);

    if (!shift) {
        alert('Сначала откройте или закройте смену, чтобы экспортировать данные.');
        return;
    }

    const data = collectFullExportData({
        shiftId: shift.id,
        note: `Полный снимок программы после смены ${shift.sellerName || ''}`.trim()
    });
    downloadJsonFile(data, buildExportFileName('warehouse-shift', shift));
    alert('Файл смены создан. Его можно отправить руководителю в Telegram.');
}

function restoreOptionalStorageField(state, key) {
    if (state[key] === undefined || state[key] === null) {
        localStorage.removeItem(key);
        return;
    }

    saveData(key, state[key]);
}

function applyImportedAppState(rawState, options = {}) {
    const state = rawState || {};
    const strictReplace = options.strictReplace === true;
    const getArr = (key, fallback = []) => {
        if (Array.isArray(state[key])) return state[key];
        return strictReplace ? [] : fallback;
    };

    categories = getArr('categories', categories);
    products = getArr('products', products);
    clients = getArr('clients', clients);
    invoices = getArr('invoices', invoices);
    archivedInvoices = getArr('archivedInvoices', archivedInvoices).map(normalizeArchivedInvoice);
    debts = getArr('debts', debts);
    movements = getArr('movements', movements);
    reports = getArr('reports', reports);
    personalPrices = getArr('personalPrices', personalPrices);
    shiftSessions = getArr('shiftSessions', shiftSessions);
    debtPayments = getArr('debtPayments', debtPayments);
    moneyTransactions = getArr('moneyTransactions', moneyTransactions).map(normalizeMoneyTransaction);
    activityLog = getArr('activityLog', activityLog);
    incomingReceipts = getArr('incomingReceipts', incomingReceipts).map(normalizeIncomingReceipt);
    archivedIncomingReceipts = getArr('archivedIncomingReceipts', archivedIncomingReceipts).map(normalizeArchivedIncomingReceipt);
    initialStockEntries = getArr('initialStockEntries', initialStockEntries).map(normalizeInitialStockEntry);
    supplierReturns = getArr('supplierReturns', supplierReturns).map(normalizeSupplierReturn);
    packageProductions = getArr('packageProductions', packageProductions).map(normalizePackageProduction);
    openedStockEvents = getArr('openedStockEvents', openedStockEvents).map(normalizeOpenedStockEvent);
    rebuildPartialSaleOpenedStockEvents();
    autoCloseStaleOpenShift();

    saveData('categories', categories);
    saveData('products', products);
    saveData('clients', clients);
    saveData('invoices', invoices);
    saveData('archivedInvoices', archivedInvoices);
    saveData('debts', debts);
    saveData('movements', movements);
    saveData('reports', reports);
    saveData('personalPrices', personalPrices);
    saveData('shiftSessions', shiftSessions);
    saveData('debtPayments', debtPayments);
    saveData('moneyTransactions', moneyTransactions);
    saveData('activityLog', activityLog);
    saveData('incomingReceipts', incomingReceipts);
    saveData('archivedIncomingReceipts', archivedIncomingReceipts);
    saveData('initialStockEntries', initialStockEntries);
    saveData('supplierReturns', supplierReturns);
    saveData('packageProductions', packageProductions);
    saveData('openedStockEvents', openedStockEvents);

    EXTRA_STORAGE_FIELDS.forEach(key => {
        if (LOCAL_ONLY_KEYS.has(key) && state[key] === undefined) {
            return;
        }
        if (key === 'cloudSyncConfig' && (state[key] === undefined || state[key] === null)) {
            return;
        }
        if (state[key] !== undefined || strictReplace) {
            restoreOptionalStorageField(state, key);
        }
    });

    securitySettings = readStorageJson('securitySettings', securitySettings) || { managerPinHash: '', sellerPinHash: '' };
    syncIncomingProductsStock(true);
}

function getMergeIdentity(item, index) {
    if (!item || typeof item !== 'object') {
        return `index:${index}`;
    }

    return item.id
        || item.invoiceId
        || item.receiptId
        || item.clientId
        || item.productId
        || item.createdAt
        || item.date
        || `index:${index}`;
}

function mergeRecordsByIdentity(currentItems, importedItems, normalizer = item => item) {
    const merged = Array.isArray(currentItems) ? [...currentItems] : [];
    const indexById = new Map();

    merged.forEach((item, index) => {
        indexById.set(getMergeIdentity(item, index), index);
    });

    (Array.isArray(importedItems) ? importedItems : []).forEach((item, importedIndex) => {
        const normalizedItem = normalizer(item);
        const identity = getMergeIdentity(normalizedItem, importedIndex);

        if (indexById.has(identity)) {
            merged[indexById.get(identity)] = normalizedItem;
        } else {
            indexById.set(identity, merged.length);
            merged.push(normalizedItem);
        }
    });

    return merged;
}

const SHIFT_IMPORT_MONEY_TRANSACTION_TYPES = new Set(['shift_transfer', 'debt_payment']);

function mergeShiftMoneyTransactions(currentItems, importedItems) {
    const shiftMoneyItems = (Array.isArray(importedItems) ? importedItems : [])
        .map(normalizeMoneyTransaction)
        .filter(item => SHIFT_IMPORT_MONEY_TRANSACTION_TYPES.has(item.type));

    return mergeRecordsByIdentity(currentItems, shiftMoneyItems, normalizeMoneyTransaction);
}

function mergeIncomingReceiptPaymentsForShiftImport(currentReceipt, importedReceipt) {
    const current = normalizeIncomingReceipt(currentReceipt || {});
    const imported = normalizeIncomingReceipt(importedReceipt || {});
    const paymentHistory = mergeRecordsByIdentity(
        imported.paymentHistory || [],
        current.paymentHistory || [],
        normalizeIncomingPayment
    );
    const paidFromHistory = paymentHistory.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const paidAmount = Math.max(
        Number(imported.paidAmount) || 0,
        Number(current.paidAmount) || 0,
        paidFromHistory
    );

    return normalizeIncomingReceipt({
        ...imported,
        paymentHistory,
        paidAmount
    });
}

function mergeIncomingReceiptsForShiftImport(currentItems, importedItems) {
    const merged = (Array.isArray(currentItems) ? currentItems : []).map(normalizeIncomingReceipt);
    const indexById = new Map();

    merged.forEach((item, index) => {
        indexById.set(getMergeIdentity(item, index), index);
    });

    (Array.isArray(importedItems) ? importedItems : []).forEach((item, importedIndex) => {
        const normalizedItem = normalizeIncomingReceipt(item);
        const identity = getMergeIdentity(normalizedItem, importedIndex);

        if (indexById.has(identity)) {
            const currentIndex = indexById.get(identity);
            merged[currentIndex] = mergeIncomingReceiptPaymentsForShiftImport(merged[currentIndex], normalizedItem);
        } else {
            indexById.set(identity, merged.length);
            merged.push(normalizedItem);
        }
    });

    return merged;
}

function mergeArchivedDebtsForShiftImport(importedArchivedDebts) {
    const currentArchivedDebts = getArchivedDebts();
    const mergedArchivedDebts = mergeRecordsByIdentity(currentArchivedDebts, importedArchivedDebts || []);
    saveArchivedDebts(mergedArchivedDebts);
    return mergedArchivedDebts;
}

function mergeDebtsForShiftImport(currentDebts, importedDebts, importedArchivedDebts) {
    const archivedDebtIds = new Set((Array.isArray(importedArchivedDebts) ? importedArchivedDebts : [])
        .map((debt, index) => getMergeIdentity(debt, index)));
    const mergedDebts = mergeRecordsByIdentity(currentDebts, importedDebts || []);

    return mergedDebts.filter((debt, index) => !archivedDebtIds.has(getMergeIdentity(debt, index)));
}

function applyImportedShiftSnapshot(rawState) {
    const state = rawState || {};
    const importedArchivedDebts = Array.isArray(state.archivedDebts) ? state.archivedDebts : [];
    const importedActivityLog = mergeRecordsByIdentity(state.activityLog || [], state.shiftActivityLog || []);

    categories = mergeRecordsByIdentity(categories, state.categories);
    products = mergeRecordsByIdentity(products, state.products);
    clients = mergeRecordsByIdentity(clients, state.clients);
    invoices = mergeRecordsByIdentity(invoices, state.invoices);
    archivedInvoices = mergeRecordsByIdentity(archivedInvoices, state.archivedInvoices, normalizeArchivedInvoice);
    mergeArchivedDebtsForShiftImport(importedArchivedDebts);
    debts = mergeDebtsForShiftImport(debts, state.debts, importedArchivedDebts);
    movements = mergeRecordsByIdentity(movements, state.movements);
    reports = mergeRecordsByIdentity(reports, state.reports);
    personalPrices = mergeRecordsByIdentity(personalPrices, state.personalPrices);
    shiftSessions = mergeRecordsByIdentity(shiftSessions, state.shiftSessions);
    debtPayments = mergeRecordsByIdentity(debtPayments, state.debtPayments);
    moneyTransactions = mergeShiftMoneyTransactions(moneyTransactions, state.moneyTransactions);
    activityLog = mergeRecordsByIdentity(activityLog, importedActivityLog)
        .sort((left, right) => String(right.createdAt || right.date || '').localeCompare(String(left.createdAt || left.date || '')));
    incomingReceipts = mergeIncomingReceiptsForShiftImport(incomingReceipts, state.incomingReceipts);
    archivedIncomingReceipts = mergeRecordsByIdentity(archivedIncomingReceipts, state.archivedIncomingReceipts, normalizeArchivedIncomingReceipt);
    initialStockEntries = mergeRecordsByIdentity(initialStockEntries, state.initialStockEntries, normalizeInitialStockEntry);
    supplierReturns = mergeRecordsByIdentity(supplierReturns, state.supplierReturns, normalizeSupplierReturn);
    packageProductions = mergeRecordsByIdentity(packageProductions, state.packageProductions, normalizePackageProduction);
    openedStockEvents = mergeRecordsByIdentity(openedStockEvents, state.openedStockEvents, normalizeOpenedStockEvent);
    rebuildPartialSaleOpenedStockEvents();
    autoCloseStaleOpenShift();

    saveData('categories', categories);
    saveData('products', products);
    saveData('clients', clients);
    saveData('invoices', invoices);
    saveData('archivedInvoices', archivedInvoices);
    saveData('debts', debts);
    saveData('movements', movements);
    saveData('reports', reports);
    saveData('personalPrices', personalPrices);
    saveData('shiftSessions', shiftSessions);
    saveData('debtPayments', debtPayments);
    saveData('moneyTransactions', moneyTransactions);
    saveData('activityLog', activityLog);
    saveData('incomingReceipts', incomingReceipts);
    saveData('archivedIncomingReceipts', archivedIncomingReceipts);
    saveData('initialStockEntries', initialStockEntries);
    saveData('supplierReturns', supplierReturns);
    saveData('packageProductions', packageProductions);
    saveData('openedStockEvents', openedStockEvents);

    syncIncomingProductsStock(true);
}

function refreshAfterImport() {
    updateStats();
    loadDashboardData();
    loadCategoriesToSelects();
    loadClientsToSelects();
    loadProductsToSelects();
    applyAccessControl();
    renderControlCenter();

    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab) {
        switchTab(activeTab.getAttribute('data-tab'));
    }
}

function getImportConfirmMessage(data = {}) {
    const isShiftSnapshot = data.exportType === FULL_EXPORT_TYPE && Boolean(data.sourceShiftId);
    if (isShiftSnapshot) {
        return 'Импортировать смену? Новые данные будут добавлены, существующие записи с теми же ID будут обновлены. Остальные ваши данные сохранятся.';
    }

    if (data.exportType === FULL_EXPORT_TYPE) {
        return 'Заменить данные этим файлом от руководителя? Текущие данные на этом устройстве будут полностью заменены данными из файла.';
    }

    return 'Восстановить данные? Текущие данные будут заменены.';
}

function getImportPayloadState(data = {}) {
    return data.appState && typeof data.appState === 'object' ? data.appState : data;
}

function getShiftSnapshotImportState(data = {}) {
    const importedState = getImportPayloadState(data);
    const stateActivity = Array.isArray(importedState.shiftActivityLog) ? importedState.shiftActivityLog : [];
    const topLevelActivity = Array.isArray(data.shiftActivityLog) ? data.shiftActivityLog : [];

    return {
        ...importedState,
        shiftActivityLog: mergeRecordsByIdentity(stateActivity, topLevelActivity)
    };
}

// Импорт данных
function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            const isShiftSnapshot = data.exportType === FULL_EXPORT_TYPE && Boolean(data.sourceShiftId);
            const importedState = isShiftSnapshot ? getShiftSnapshotImportState(data) : getImportPayloadState(data);
            const confirmMessage = getImportConfirmMessage(data);

            if (confirm(confirmMessage)) {

                // Если это выборочный экспорт (есть selectedTypes) — применяем те, что присутствуют
                if (Array.isArray(data.selectedTypes)) {
                    const getArr = (key, fallback=[]) => Array.isArray(importedState[key]) ? importedState[key] : fallback;
                    data.selectedTypes.forEach(key => {
                        switch (key) {
                            case 'categories': categories = getArr('categories'); break;
                            case 'products': products = getArr('products'); break;
                            case 'clients': clients = getArr('clients'); break;
                            case 'invoices': invoices = getArr('invoices'); break;
                            case 'archivedInvoices': archivedInvoices = getArr('archivedInvoices', archivedInvoices).map(normalizeArchivedInvoice); break;
                            case 'debts': debts = getArr('debts'); break;
                            case 'movements': movements = getArr('movements'); break;
                            case 'reports': reports = getArr('reports'); break;
                            case 'personalPrices': personalPrices = getArr('personalPrices'); break;
                            case 'moneyTransactions': moneyTransactions = getArr('moneyTransactions', moneyTransactions).map(normalizeMoneyTransaction); break;
                            case 'incomingReceipts': incomingReceipts = getArr('incomingReceipts', incomingReceipts).map(normalizeIncomingReceipt); break;
                            case 'archivedIncomingReceipts': archivedIncomingReceipts = getArr('archivedIncomingReceipts', archivedIncomingReceipts).map(normalizeArchivedIncomingReceipt); break;
                            case 'initialStockEntries': initialStockEntries = getArr('initialStockEntries', initialStockEntries).map(normalizeInitialStockEntry); break;
                            case 'supplierReturns': supplierReturns = getArr('supplierReturns', supplierReturns).map(normalizeSupplierReturn); break;
                            case 'packageProductions': packageProductions = getArr('packageProductions', packageProductions).map(normalizePackageProduction); break;
                            case 'openedStockEvents': openedStockEvents = getArr('openedStockEvents', openedStockEvents).map(normalizeOpenedStockEvent); break;
                        }
                    });

                    applyImportedAppState({
                        categories,
                        products,
                        clients,
                        invoices,
                        archivedInvoices,
                        debts,
                        movements,
                        reports,
                        personalPrices,
                        moneyTransactions,
                        incomingReceipts,
                        archivedIncomingReceipts,
                        initialStockEntries,
                        supplierReturns,
                        packageProductions,
                        openedStockEvents
                    }, { strictReplace: false });
                } else if (isShiftSnapshot) {
                    applyImportedShiftSnapshot(importedState);
                } else {
                    applyImportedAppState(importedState, { strictReplace: data.exportType === FULL_EXPORT_TYPE });
                }

                refreshAfterImport();
                alert(isShiftSnapshot ? 'Смена успешно добавлена!' : 'Данные успешно восстановлены!');
            }
        } catch (error) {
            alert('Ошибка при импорте данных. Проверьте файл.');
        }
    };
    reader.readAsText(file);
    input.value = ''; // Очищаем input
}

// Инициализация приложения
function initializeApp() {
    // Навигация по вкладкам
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Поиск товаров
    document.getElementById('product-search').addEventListener('input', filterProducts);
    document.getElementById('category-filter').addEventListener('change', filterProducts);

    // Загрузка данных в селекты
    loadCategoriesToSelects();
    loadClientsToSelects();
    loadProductsToSelects();
    syncIncomingProductsStock();

    // Функция обновления цен для всех товаров в накладной при смене клиента
    window.updateInvoicePricesForClient = function(clientId) {
        // Пересчитываем отображение цен у всех строк при смене клиента (только в форме создания)
        const itemsContainer = document.getElementById('invoice-items-list');
        if (!itemsContainer) return;
        
        itemsContainer.querySelectorAll('.invoice-item-row').forEach(row => {
            const productSelect = row.querySelector('.product-select');
            const priceDisplay = row.querySelector('.price-display');
            const totalDisplay = row.querySelector('.total-display');
            const quantityInput = row.querySelector('.quantity-input');
            
            if (!productSelect || !productSelect.value || !priceDisplay) {
                return;
            }
            
            const productId = productSelect.value;
            const option = productSelect.selectedOptions[0];
            
            if (!option) {
                return;
            }
            
            // Получаем актуальную цену (персональную или стандартную)
            const actualPrice = getActualPrice(clientId, productId);
            const standardPrice = parseFloat(option.dataset.price || actualPrice);
            
            // Обновляем отображение цены с индикатором персональной цены
            if (actualPrice !== standardPrice) {
                priceDisplay.innerHTML = `
                    <span style="color: #e74c3c; font-weight: 600; text-decoration: underline; text-decoration-style: wavy; text-underline-offset: 3px;" title="Персональная цена">${formatCurrency(actualPrice)}</span>
                    <br><small style="color: #7f8c8d; text-decoration: line-through; font-size: 11px;">${formatCurrency(standardPrice)}</small>
                `;
            } else {
                priceDisplay.textContent = formatCurrency(actualPrice);
            }
            
            // Обновляем итог для этого товара
            if (quantityInput && quantityInput.value) {
                const quantity = parseFloat(quantityInput.value) || 0;
                const total = actualPrice * quantity;
                if (totalDisplay) {
                    totalDisplay.textContent = formatCurrency(total);
                }
            }
        });
        
        // Обновляем общий итог накладной
        updateInvoiceTotal();
    };
    
    // Пересчет цен при смене клиента в форме накладной (для обратной совместимости со старым select)
    const invoiceClientSelect = document.getElementById('invoiceClient');
    if (invoiceClientSelect) {
        invoiceClientSelect.addEventListener('change', function() {
            const clientId = this.value;
            updateInvoicePricesForClient(clientId);
        });
    }
    
    // Загрузка сохраненных цен для раздела расчет
    loadCalculationPrices();
    
    // Инициализация счетчика фильтров накладных
    updateInvoiceFilterCount(invoices.length);

    const incomingDateInput = document.getElementById('incoming-report-date');
    if (incomingDateInput && !incomingDateInput.value) {
        incomingDateInput.value = getTodayDateKey();
    }
    
    // Показываем быстрые действия на главной странице по умолчанию
    const quickActions = document.getElementById('quick-actions');
    if (quickActions) {
        quickActions.style.display = 'block';
    }

    // Инициализация раздела расчёта жарки (подпишем обработчики один раз)
    initRoastCalcOnce();
}

function showTabRenderError(targetPane, error) {
    if (!targetPane) return;
    const message = error?.message || 'Неизвестная ошибка';
    const existing = targetPane.querySelector('.tab-render-error');
    const html = `
        <div class="tab-render-error">
            <strong>Раздел не смог загрузиться</strong>
            <span>${escapeHtml(message)}</span>
            <button class="btn btn-secondary btn-sm" onclick="refreshCurrentVisibleTab()">
                <i class="fas fa-rotate"></i> Повторить
            </button>
        </div>
    `;
    if (existing) {
        existing.outerHTML = html;
    } else {
        targetPane.insertAdjacentHTML('afterbegin', html);
    }
}

function renderTabContent(tabName, targetPane = document.getElementById(tabName)) {
    try {
        switch(tabName) {
            case 'accounting':
                setTimeout(() => {
                    refreshAccountingData();
                }, 100);
                break;
            case 'categories':
                loadCategories();
                break;
            case 'products':
                loadProducts();
                break;
            case 'clients':
                loadClients();
                break;
            case 'incoming':
                loadIncomingData();
                break;
            case 'warehouse':
                renderDashboardInventoryOverview();
                break;
            case 'invoices':
                loadInvoices();
                break;
            case 'debts':
                loadDebts();
                break;
            case 'money':
                loadMoneyData();
                break;
            case 'movements':
                loadMovements();
                break;
            case 'reports':
                showReportsTab();
                if (isSellerSimpleMode()) {
                    switchReportTab('summary');
                }
                break;
            case 'earnings':
                loadEarnings();
                break;
            case 'calculation':
                setTimeout(() => {
                    updateTobaccoCostDisplay();
                }, 100);
                break;
            case 'roast-calculation':
                initRoastCalc();
                break;
            case 'settings':
                loadShiftCashSettings();
                loadRoastCostSettings();
                loadTobaccoCostSettings();
                break;
        }
    } catch (error) {
        console.error(`Ошибка загрузки раздела ${tabName}:`, error);
        showTabRenderError(targetPane, error);
    }
}

// Переключение вкладок
function switchTab(tabName) {
    if (!isAuthenticatedUser()) {
        return;
    }

    if (!isTabAllowedForCurrentRole(tabName)) {
        const fallbackTab = getDefaultTabForCurrentRole();
        if (tabName !== fallbackTab && !window.__suppressTabAccessAlert) {
            alert('Этот раздел доступен только руководителю');
        }
        tabName = fallbackTab;
    }

    const targetNavItem = document.querySelector(`[data-tab="${tabName}"]`);
    const targetPane = document.getElementById(tabName);
    if (!targetNavItem || !targetPane) return;

    // Убираем активный класс у всех вкладок
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    // Добавляем активный класс к выбранной вкладке
    targetNavItem.classList.add('active');
    targetPane.classList.add('active');

    // Управляем видимостью быстрых действий
    const quickActions = document.getElementById('quick-actions');
    if (quickActions) {
        if (tabName === 'dashboard') {
            quickActions.style.display = 'block';
        } else {
            quickActions.style.display = 'none';
        }
    }

    renderTabContent(tabName, targetPane);

    renderControlCenter();
}

// Обновление статистики
function updateStats() {
    const totalProducts = products.length;
    const totalSales = getInvoicesForDateKey(getTodayDateKey()).reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
    const warehouseValue = getWarehouseValueByUnifiedStock();
    const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);

    document.getElementById('total-products').textContent = totalProducts;
    document.getElementById('total-sales').textContent = formatCurrency(totalSales);
    document.getElementById('warehouse-value').textContent = formatCurrency(warehouseValue);
    document.getElementById('total-debt').textContent = formatCurrency(totalDebt);

    if (typeof renderControlCenter === 'function') {
        renderControlCenter();
    }
    if (document.getElementById('money')?.classList.contains('active')) {
        loadMoneyData();
    }
}

// Загрузка данных для главной панели
function loadDashboardData() {
    renderDashboardInventoryOverview();
    loadRecentOperations();
    loadRecentInvoices();
}

function renderDashboardInventoryOverview() {
    const container = document.getElementById('warehouse-inventory-overview');
    if (!container) return;

    const state = calculateIncomingInventoryState(getTodayDateKey());
    const salesToday = calculateFinishedPackSalesForDate(getTodayDateKey());
    const tobaccoState = state.categories?.tobacco || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { mixed: 0, pure: 0, total: 0 } };
    const roastState = state.categories?.roast || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { mixed: 0, pure: 0, total: 0 } };
    const tobaccoStockPieces = getTobaccoStockPiecesFromState(tobaccoState);
    const roastStockPieces = getRoastStockPiecesFromState(roastState);
    const roastStockKg = getRoastStockKgFromState(roastState);
    const inventoryReport = calculateInventoryControlReport(getTodayDateKey());
    const inventoryCheck = getLastInventoryCheckForDate(getTodayDateKey());
    const openedState = {
        tobacco: Number(tobaccoState.openedRemaining?.total) || 0,
        roast: Number(roastState.openedRemaining?.total) || 0
    };
    const warehouseValueBreakdown = getWarehouseValueBreakdownByUnifiedStock(state);
    const warehouseValue = warehouseValueBreakdown.total;
    const tobaccoPackBreakdown = getPackBreakdownWithOpenedText(tobaccoState.finishedRemaining || {}, tobaccoState.openedRemaining || {}, getTobaccoTypeLabel);
    const roastPackBreakdown = getPackBreakdownWithOpenedText(roastState.finishedRemaining || {}, roastState.openedRemaining || {}, getRoastTypeLabel);
    const tobaccoSoldBreakdown = getTobaccoPackBreakdownText(salesToday.tobacco || {});
    const roastSoldBreakdown = getRoastPackBreakdownText(salesToday.roast || {});
    const inventoryStatusOk = inventoryCheck && (inventoryCheck.difference?.tobacco || 0) === 0 && (inventoryCheck.difference?.roast || 0) === 0;
    const inventoryStatusClass = inventoryCheck ? (inventoryStatusOk ? 'status-chip-success' : 'status-chip-danger') : 'status-chip-muted';
    const inventoryStatusText = inventoryCheck ? (inventoryStatusOk ? 'Склад сходится' : 'Есть расхождение') : 'Факт не внесён';
    const stockCards = [
        {
            kind: 'tobacco',
            label: 'Табак',
            icon: 'fas fa-leaf',
            amount: `${formatQuantity(tobaccoStockPieces.total, 'шт')} шт`,
            subtitle: 'Табак + маленький брак в пакетах',
            packsTotal: `${formatQuantity(tobaccoState.finishedRemaining?.total || 0, 'шт')} пак.`,
            breakdown: tobaccoPackBreakdown,
            soldToday: `${formatQuantity(salesToday.tobacco?.total || 0, 'шт')} пак.`,
            soldBreakdown: tobaccoSoldBreakdown,
            defectLabel: 'Маленький брак',
            defectAmount: `${formatQuantity(tobaccoStockPieces.defect, 'шт')} шт`,
            openedAmount: `${formatQuantity(openedState.tobacco, 'шт')} шт`
        },
        {
            kind: 'roast',
            label: 'Жарка',
            icon: 'fas fa-fire',
            amount: `${formatQuantity(roastStockPieces.total, 'шт')} шт`,
            subtitle: `${formatQuantity(roastStockKg, 'кг')} кг на складе`,
            packsTotal: `${formatQuantity(roastState.finishedRemaining?.total || 0, 'шт')} пак.`,
            breakdown: roastPackBreakdown,
            soldToday: `${formatQuantity(salesToday.roast?.total || 0, 'шт')} пак.`,
            soldBreakdown: roastSoldBreakdown,
            defectLabel: 'Большой брак',
            defectAmount: `${formatQuantity(roastStockPieces.defect, 'шт')} шт`,
            openedAmount: `${formatQuantity(openedState.roast, 'шт')} шт`
        }
    ];
    const rawRows = [
        {
            label: 'Маленький брак',
            amount: `${formatQuantity(tobaccoStockPieces.defect, 'шт')} шт`,
            icon: 'fas fa-seedling',
            note: 'Входит в табачные пакеты 7/3 и 8/2'
        },
        {
            label: 'Большой брак',
            amount: `${formatQuantity(roastStockPieces.defect, 'шт')} шт`,
            icon: 'fas fa-triangle-exclamation',
            note: 'Входит в пакеты жарки 4/1, 3/2 и 2/3'
        }
    ];
    const otherSalesToday = calculateOtherProductSalesForDate(getTodayDateKey());
    const warehouseControlRows = getWarehouseControlRows(getTodayDateKey(), inventoryReport, inventoryCheck, state);
    const otherStockRows = products
        .filter(product => !isCoreIncomingProduct(product))
        .map(product => {
            const stock = getProductStockDisplay(product, state);
            const sales = otherSalesToday[product.id] || { quantity: 0, pieces: 0, amount: 0 };
            const piecesQty = getProductPieceQuantity(product);
            const hasActivity = (Number(stock.quantity) || 0) > 0
                || piecesQty > 0
                || (Number(sales.quantity) || 0) > 0
                || (Number(sales.pieces) || 0) > 0;
            return {
                product,
                stock,
                sales,
                piecesQty,
                hasActivity
            };
        })
        .sort((left, right) => {
            if (left.hasActivity !== right.hasActivity) return left.hasActivity ? -1 : 1;
            const categoryCompare = String(left.product.category || '').localeCompare(String(right.product.category || ''), 'ru');
            if (categoryCompare !== 0) return categoryCompare;
            return String(left.product.name || '').localeCompare(String(right.product.name || ''), 'ru');
        });

    container.innerHTML = `
        <div class="warehouse-workspace">
            <div class="warehouse-hero">
                <div>
                    <span>Склад на ${formatDateShort(getTodayDateKey())}</span>
                    <strong>${formatCurrency(warehouseValue)}</strong>
                    <small>${escapeHtml(getWarehouseValueSummaryText(warehouseValueBreakdown))}. Долг поставщику здесь не прибавляется.</small>
                </div>
                <div class="warehouse-hero-actions">
                    <span class="status-chip ${inventoryStatusClass}">${inventoryStatusText}</span>
                    ${!isSellerMode() ? `
                    <button class="btn btn-primary btn-sm" onclick="showInitialStockModal()">
                        <i class="fas fa-boxes-stacked"></i> Стартовые остатки
                    </button>
                    ` : ''}
                    <button class="btn btn-warning btn-sm" onclick="showSupplierReturnModal()">
                        <i class="fas fa-rotate-left"></i> Возврат поставщику
                    </button>
                </div>
            </div>

            <div class="warehouse-kpi-grid">
                <div class="warehouse-kpi">
                    <span>Табак сейчас</span>
                    <strong>${formatQuantity(tobaccoStockPieces.total, 'шт')} шт</strong>
                    <small>${formatQuantity(tobaccoState.finishedRemaining?.total || 0, 'шт')} пак. • открыто ${formatQuantity(openedState.tobacco, 'шт')} шт</small>
                </div>
                <div class="warehouse-kpi">
                    <span>Жарка сейчас</span>
                    <strong>${formatQuantity(roastStockPieces.total, 'шт')} шт</strong>
                    <small>${formatQuantity(roastStockKg, 'кг')} кг • ${formatQuantity(roastState.finishedRemaining?.total || 0, 'шт')} пак.</small>
                </div>
                <div class="warehouse-kpi">
                    <span>Продано сегодня</span>
                    <strong>${formatQuantity(salesToday.tobacco?.total || 0, 'шт')} / ${formatQuantity(salesToday.roast?.total || 0, 'шт')}</strong>
                    <small>табак / жарка, пакеты</small>
                </div>
                <div class="warehouse-kpi">
                    <span>Открытые остатки</span>
                    <strong>${formatQuantity(openedState.tobacco + openedState.roast, 'шт')} шт</strong>
                    <small>табак ${formatQuantity(openedState.tobacco, 'шт')} • жарка ${formatQuantity(openedState.roast, 'шт')}</small>
                </div>
            </div>

            <div class="warehouse-stock-main-grid">
                ${stockCards.map(card => `
                    <article class="warehouse-stock-panel warehouse-stock-panel-${card.kind}">
                        <div class="warehouse-stock-panel-head">
                            <div>
                                <span><i class="${card.icon}"></i> ${card.label}</span>
                                <strong>${card.amount}</strong>
                                <small>${card.subtitle}</small>
                            </div>
                            <div class="warehouse-pack-count">
                                <span>Пакетов</span>
                                <strong>${card.packsTotal}</strong>
                            </div>
                        </div>
                        <div class="warehouse-stock-panel-body">
                            <div class="warehouse-info-box">
                                <span>Типы пакетов</span>
                                <strong>${card.breakdown}</strong>
                            </div>
                            <div class="warehouse-info-box">
                                <span>Продано сегодня</span>
                                <strong>${card.soldToday}</strong>
                                <small>${card.soldBreakdown}</small>
                            </div>
                            <div class="warehouse-info-box">
                                <span>${card.defectLabel}</span>
                                <strong>${card.defectAmount}</strong>
                                <small>учитывается внутри пакетов</small>
                            </div>
                            <div class="warehouse-info-box">
                                <span>Открыто</span>
                                <strong>${card.openedAmount}</strong>
                                <small>можно собрать в полный пакет</small>
                            </div>
                        </div>
                    </article>
                `).join('')}
            </div>

            <div class="warehouse-raw-grid">
                ${rawRows.map(row => `
                    <div class="warehouse-raw-row">
                        <span><i class="${row.icon}"></i> ${row.label}</span>
                        <strong>${row.amount}</strong>
                        <small>${row.note}</small>
                    </div>
                `).join('')}
            </div>

            <section class="warehouse-products-section">
                <div class="warehouse-section-head">
                    <div>
                        <strong>Остальные товары</strong>
                        <small>Суповой, потраха и любые товары из раздела «Товары» считаются здесь отдельно от табака и жарки.</small>
                    </div>
                    <span class="status-chip status-chip-info">${otherStockRows.length} поз.</span>
                </div>
                ${otherStockRows.length ? `
                    <div class="warehouse-products-table">
                        <div class="warehouse-products-table-head">
                            <span>Товар</span>
                            <span>Остаток</span>
                            <span>Продано сегодня</span>
                            <span>Примечание</span>
                        </div>
                        ${otherStockRows.map(row => {
                            const product = row.product;
                            const stock = row.stock;
                            const sales = row.sales;
                            const categoryName = getProductCategoryName(product) || product.category || 'Товар';
                            const soldPiecesText = (Number(sales.pieces) || 0) > 0 ? `${formatQuantity(sales.pieces, 'шт')} шт` : '';
                            const stockValue = getRegularProductStockValue(product, state);
                            const noteParts = [
                                `Себестоимость: ${formatCurrency(stockValue)}`,
                                soldPiecesText ? `Продано штук: ${soldPiecesText}` : ''
                            ].filter(Boolean);
                            return `
                                <div class="warehouse-product-row">
                                    <div class="warehouse-product-name-cell">
                                        <span>${escapeHtml(categoryName)}</span>
                                        <strong>${escapeHtml(product.name)}</strong>
                                    </div>
                                    <div class="warehouse-product-metric">
                                        <span>Остаток</span>
                                        <strong>${escapeHtml(formatWarehouseProductQuantity(stock.quantity, stock.unit, row.piecesQty))}</strong>
                                    </div>
                                    <div class="warehouse-product-metric">
                                        <span>Продано сегодня</span>
                                        <strong>${formatQuantity(sales.quantity || 0, stock.unit)} ${escapeHtml(stock.unit)}</strong>
                                    </div>
                                    <div class="warehouse-product-note">
                                        ${noteParts.length ? noteParts.map(part => `<small>${part}</small>`).join('') : '<small>По сегодняшним накладным</small>'}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : '<p class="text-center">Других товаров на складе сейчас нет</p>'}
            </section>

            <section class="warehouse-control-section">
                <div class="warehouse-section-head">
                    <div>
                        <strong>Контроль остатков смены</strong>
                        <small>Проверка по формуле: было утром + приход/старт - продажи</small>
                    </div>
                    <span class="status-chip ${inventoryStatusClass}">${inventoryStatusText}</span>
                </div>
                <div class="warehouse-control-grid">
                    ${warehouseControlRows.map(row => `
                        <div class="warehouse-control-card">
                            <div class="warehouse-control-title">
                                <strong>${escapeHtml(row.label)}</strong>
                                <span>Факт: ${escapeHtml(formatWarehouseControlAmount(row, 'fact'))}</span>
                            </div>
                            <div class="warehouse-control-flow">
                                <div><span>Было</span><strong>${escapeHtml(formatWarehouseControlAmount(row, 'opening'))}</strong></div>
                                <div><span>Приход</span><strong>${escapeHtml(formatWarehouseControlAmount(row, 'receivedToday'))}</strong></div>
                                <div><span>Возврат</span><strong>${escapeHtml(formatWarehouseControlAmount(row, 'returnedToday'))}</strong></div>
                                <div><span>Продали</span><strong>${escapeHtml(formatWarehouseControlAmount(row, 'soldToday'))}</strong></div>
                                <div class="warehouse-control-expected"><span>Должно</span><strong>${escapeHtml(formatWarehouseControlAmount(row, 'expected'))}</strong></div>
                            </div>
                            <small>${row.note ? `${escapeHtml(row.note)}<br>` : ''}Разница: ${escapeHtml(formatWarehouseControlDifference(row))}</small>
                        </div>
                    `).join('')}
                </div>
            </section>

            <section class="warehouse-opened-section">
                <div class="warehouse-section-head">
                    <div>
                        <strong>Открытые остатки</strong>
                        <small>Табак: ${formatQuantity(openedState.tobacco, 'шт')} шт • Жарка: ${formatQuantity(openedState.roast, 'шт')} шт</small>
                    </div>
                    <div class="warehouse-opened-actions">
                    <button class="btn btn-secondary btn-sm" onclick="assembleOpenedTobaccoPacks()" ${openedState.tobacco < TOBACCO_PACK_SIZE ? 'disabled' : ''}>
                        <i class="fas fa-box"></i> Собрать табак 10/0
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="assembleOpenedRoastPacks()" ${openedState.roast < 5 ? 'disabled' : ''}>
                        <i class="fas fa-box-open"></i> Собрать жарку
                    </button>
                    </div>
                </div>
            </section>

            ${renderSupplierReturnsHistoryHtml()}
            ${!isSellerMode() ? renderInitialStockHistoryHtml() : ''}
        </div>
    `;
}

function renderDashboardSupplierOverview() {
    const container = document.getElementById('dashboard-supplier-overview');
    if (!container) return;

    const openReceipts = getOpenIncomingReceiptsOldestFirst();
    const totalOutstanding = openReceipts.reduce((sum, receipt) => sum + getReceiptOutstandingAmount(receipt), 0);
    const totalAmount = incomingReceipts.reduce((sum, receipt) => sum + (Number(receipt.totalAmount) || 0), 0);
    const totalPaid = incomingReceipts.reduce((sum, receipt) => sum + (Number(receipt.paidAmount) || 0), 0);
    const oldestReceipt = openReceipts[0] || null;

    container.innerHTML = `
        <div class="dashboard-supplier-card">
            <div class="dashboard-supplier-metric">
                <span>Общий долг поставщику</span>
                <strong>${formatCurrency(totalOutstanding)}</strong>
            </div>
            <div class="dashboard-supplier-metric">
                <span>Открытых накладных</span>
                <strong>${openReceipts.length}</strong>
            </div>
            <div class="dashboard-supplier-metric">
                <span>Сумма всех приходов</span>
                <strong>${formatCurrency(totalAmount)}</strong>
            </div>
            <div class="dashboard-supplier-metric">
                <span>Уже оплачено</span>
                <strong>${formatCurrency(totalPaid)}</strong>
            </div>
            <div class="dashboard-supplier-note">
                ${oldestReceipt
                    ? `Сначала закроется самая старая накладная: ${oldestReceipt.invoiceNumber ? `№${escapeHtml(oldestReceipt.invoiceNumber)}` : 'без номера'} от ${formatDateShort(oldestReceipt.date)}.`
                    : 'Все приходные накладные поставщику уже закрыты.'}
            </div>
            <div class="dashboard-supplier-actions">
                <button class="btn btn-secondary" onclick="switchTab('incoming')">
                    <i class="fas fa-truck-loading"></i> Открыть приход
                </button>
                <button class="btn btn-primary" onclick="showSupplierTotalPaymentModal()" ${totalOutstanding <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-wallet"></i> Закрыть общий долг
                </button>
            </div>
        </div>
    `;
}

// Загрузка последних операций
function loadRecentOperations() {
    const container = document.getElementById('recent-operations-list');
    
    // Собираем все операции из разных источников
    const operations = [];
    
    // Добавляем все накладные
    invoices.filter(invoice => !invoice.isArchived).forEach(invoice => {
        const client = clients.find(c => c.id === invoice.client);
        const originalIndex = invoices.findIndex(inv => inv.id === invoice.id);
        const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
        
        operations.push({
            type: 'invoice',
            id: invoice.id,
            date: invoice.date,
            description: `Накладная #${invoiceNumber} - ${client ? client.name : 'Без клиента'} - ${formatCurrency(invoice.total)}`,
            amount: invoice.total
        });
    });
    
    // Добавляем все движения склада
    movements.forEach(movement => {
        operations.push({
            type: 'movement',
            id: movement.id,
            date: movement.date,
            description: `${movement.type} - ${movement.description}`,
            quantity: movement.quantity
        });
    });
    
    // Сортируем все операции по дате
    operations.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Берем последние 10 операций
    const recentOperations = operations.slice(0, 10);
    
    // НЕ УДАЛЯЕМ данные из базы - только отображаем последние операции
    // const recentInvoiceIds = recentOperations
    //     .filter(op => op.type === 'invoice')
    //     .map(op => op.id);
    
    // const recentMovementIds = recentOperations
    //     .filter(op => op.type === 'movement')
    //     .map(op => op.id);
    
    // // Оставляем только последние накладные
    // invoices = invoices.filter(invoice => recentInvoiceIds.includes(invoice.id));
    // saveData('invoices', invoices);
    
    // // Оставляем только последние движения
    // movements = movements.filter(movement => recentMovementIds.includes(movement.id));
    // saveData('movements', movements);
    
    // Дополнительная проверка - убеждаемся, что накладные не удаляются
    console.log('loadRecentOperations: Всего накладных в системе:', invoices.length);
    
    if (recentOperations.length === 0) {
        container.innerHTML = '<p class="text-center">Нет операций</p>';
        return;
    }

    container.innerHTML = recentOperations.map(operation => `
        <div class="operation-item">
            <div class="movement-header">
                <span class="movement-type">${operation.type === 'invoice' ? 'Накладная' : 'Движение'}</span>
                <span class="movement-date">${formatDate(operation.date)}</span>
            </div>
            <div class="movement-details">
                ${operation.description}
            </div>
        </div>
    `).join('');
}

// Загрузка последних накладных с детальной информацией
function loadRecentInvoices() {
    const container = document.getElementById('recent-invoices-list');
    
    // Получаем последние 5 накладных (все накладные сохраняются)
    const recentInvoices = [...invoices]
        .filter(invoice => !invoice.isArchived)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    if (recentInvoices.length === 0) {
        container.innerHTML = '<p class="text-center">Нет накладных</p>';
        return;
    }

    container.innerHTML = recentInvoices.map(invoice => {
        const client = clients.find(c => c.id === invoice.client);
        // Находим правильный номер накладной
        const originalIndex = invoices.findIndex(inv => inv.id === invoice.id);
        const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
        
        // Создаем детальный список товаров
        const itemsList = invoice.items.map(item => 
            `<div class="invoice-item-detail">
                <span class="item-name">${item.productName}</span>
                <span class="item-quantity">${formatQuantity(item.quantity, item.unit)} ${item.unit}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                <span class="item-total">${formatCurrency(item.total)}</span>
            </div>`
        ).join('');
        
        // Определяем тип оплаты
        const paymentType = invoice.paymentType === 'cash' ? 'Наличными' : 'В долг';
        const paymentIcon = invoice.paymentType === 'cash' ? '💵' : '📝';
        
        return `
            <div class="invoice-item">
                <div class="movement-header">
                    <span class="movement-type">Накладная #${invoiceNumber}</span>
                    <span class="movement-date">${formatDate(invoice.date)}</span>
                    <button class="btn btn-primary btn-sm print-btn" onclick="printInvoice('${invoice.id}')" title="Печатать накладную">
                        <i class="fas fa-print"></i> Печатать
                    </button>
                </div>
                <div class="movement-details">
                    <div class="invoice-main-info">
                        <div class="client-info">
                            <i class="fas fa-user"></i>
                            <span>${getDisplayClientName(invoice.client)}</span>
                        </div>
                        <div class="payment-info">
                            ${paymentIcon} ${paymentType}
                        </div>
                        <div class="total-info">
                            <strong>Итого: ${formatCurrency(invoice.total)}</strong>
                        </div>
                    </div>
                    <div class="invoice-items-section">
                        <div class="items-header">
                            <i class="fas fa-box"></i>
                            <span>Товары в накладной (${invoice.items.length} шт.):</span>
                        </div>
                        <div class="items-list">
                            ${itemsList}
                        </div>
                    </div>
                    ${invoice.notes ? `
                        <div class="invoice-notes">
                            <i class="fas fa-sticky-note"></i>
                            <span>Примечания: ${invoice.notes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Функции для работы с выбором накладных в отчетах
function toggleAllInvoices(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateDeleteButton();
}

function updateDeleteButton() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (isSellerMode()) {
        deleteBtn.style.display = 'none';
        return;
    }
    
    if (checkedBoxes.length > 0) {
        deleteBtn.style.display = 'inline-block';
    } else {
        deleteBtn.style.display = 'none';
    }
}

function deleteSelectedInvoices() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Выберите накладные для удаления');
        return;
    }
    
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (confirm(`Вы уверены, что хотите удалить ${selectedIds.length} накладную(ых)? Это действие нельзя отменить.`)) {
        // Удаляем накладные из массива reports
        const originalLength = reports.length;
        reports = reports.filter(report => !selectedIds.includes(report.id));
        
        // Сохраняем изменения
        saveData('reports', reports);
        
        // Обновляем отчет
        generateReport();
        
        alert(`Успешно удалено ${originalLength - reports.length} накладных`);
    }
}

// ==================== КАТЕГОРИИ ====================

// Загрузка категорий
function loadCategories() {
    const container = document.getElementById('categories-list');
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="text-center">Нет категорий</p>';
        return;
    }

    container.innerHTML = categories.map(category => `
        <div class="card">
            <div class="card-header">
                <div class="card-title">${category.name}</div>
                <div class="card-actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory('${category.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-content">
                <div class="card-info">
                    <span>Описание:</span>
                    <span>${category.description || 'Нет описания'}</span>
                </div>
                <div class="card-info">
                    <span>Товаров в категории:</span>
                    <span>${products.filter(p => p.categoryId === category.id).length}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Показать модальное окно добавления категории
function showAddCategoryModal() {
    openModal('addCategoryModal');
    document.getElementById('categoryName').focus();
}

// Добавить категорию
function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();
    
    if (!name) {
        alert('Введите название категории');
        return;
    }

    const category = {
        id: generateId(),
        name: name,
        description: description,
        createdAt: new Date().toISOString()
    };

    categories.push(category);
    saveData('categories', categories);
    
    closeModal('addCategoryModal');
    document.getElementById('addCategoryForm').reset();
    loadCategories();
    loadCategoriesToSelects();
}

// Удалить категорию (улучшенная версия)
function deleteCategory(categoryId) {
    if (confirm('Удалить категорию? Все товары в этой категории будут перемещены в "Без категории"')) {
        // Перемещаем товары в "Без категории"
        products.forEach(product => {
            if (product.categoryId === categoryId) {
                product.categoryId = '';
            }
        });
        saveData('products', products);

        // Удаляем категорию из массива
        categories = categories.filter(c => c.id !== categoryId);
        saveData('categories', categories);

        loadCategories();
        loadCategoriesToSelects();
        loadProducts();
    }
}

// ==================== ТОВАРЫ ====================

// Загрузка товаров
function loadProducts() {
    const container = document.getElementById('products-list');
    
    if (products.length === 0) {
        container.innerHTML = '<p class="text-center">Нет товаров</p>';
        return;
    }

    const inventoryState = calculateIncomingInventoryState(getTodayDateKey());
    container.innerHTML = products.map(product => {
        const category = categories.find(c => c.id === product.categoryId);
        const stock = getProductStockDisplay(product, inventoryState);
        const statusClass = stock.quantity <= product.minQuantity ? 'status-low' :
                           stock.quantity <= product.minQuantity * 2 ? 'status-warning' : 'status-normal';
        
        return `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${product.name}</div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="card-info">
                        <span>Категория:</span>
                        <span>${category ? category.name : 'Без категории'}</span>
                    </div>
                    <div class="card-info">
                        <span>Цена закупки:</span>
                        <span>${formatCurrency(product.purchasePrice)}</span>
                    </div>
                    <div class="card-info">
                        <span>Цена продажи:</span>
                        <span>${formatCurrency(product.salePrice)}</span>
                    </div>
                    <div class="card-info">
                        <span>Количество:</span>
                        <span class="${statusClass}">${formatQuantity(stock.quantity, stock.unit)} ${stock.unit}</span>
                    </div>
                    ${stock.details ? `
                    <div class="card-info">
                        <span>Детали:</span>
                        <span>${stock.details}</span>
                    </div>
                    ` : ''}
                    <div class="card-info">
                        <span>Минимальный остаток:</span>
                        <span>${formatQuantity(product.minQuantity, product.unit || 'шт')} ${product.unit || 'шт'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Функции для работы с выбором накладных в отчетах
function toggleAllInvoices(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateDeleteButton();
}

function updateDeleteButton() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    
    if (checkedBoxes.length > 0) {
        deleteBtn.style.display = 'inline-block';
    } else {
        deleteBtn.style.display = 'none';
    }
}

function deleteSelectedInvoices() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Выберите накладные для удаления');
        return;
    }
    
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (confirm(`Вы уверены, что хотите удалить ${selectedIds.length} накладную(ых)? Это действие нельзя отменить.`)) {
        // Удаляем накладные из массива reports
        const originalLength = reports.length;
        reports = reports.filter(report => !selectedIds.includes(report.id));
        
        // Сохраняем изменения
        saveData('reports', reports);
        
        // Обновляем отчет
        generateReport();
        
        alert(`Успешно удалено ${originalLength - reports.length} накладных`);
    }
}

// Фильтрация товаров
function filterProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const container = document.getElementById('products-list');
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<p class="text-center">Товары не найдены</p>';
        return;
    }

    const inventoryState = calculateIncomingInventoryState(getTodayDateKey());
    container.innerHTML = filteredProducts.map(product => {
        const category = categories.find(c => c.id === product.categoryId);
        const stock = getProductStockDisplay(product, inventoryState);
        const statusClass = stock.quantity <= product.minQuantity ? 'status-low' :
                           stock.quantity <= product.minQuantity * 2 ? 'status-warning' : 'status-normal';
        
        return `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${product.name}</div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="card-info">
                        <span>Категория:</span>
                        <span>${category ? category.name : 'Без категории'}</span>
                    </div>
                    <div class="card-info">
                        <span>Цена закупки:</span>
                        <span>${formatCurrency(product.purchasePrice)}</span>
                    </div>
                    <div class="card-info">
                        <span>Цена продажи:</span>
                        <span>${formatCurrency(product.salePrice)}</span>
                    </div>
                    <div class="card-info">
                        <span>Количество:</span>
                        <span class="${statusClass}">${formatQuantity(stock.quantity, stock.unit)} ${stock.unit}</span>
                    </div>
                    ${stock.details ? `
                    <div class="card-info">
                        <span>Детали:</span>
                        <span>${stock.details}</span>
                    </div>
                    ` : ''}
                    <div class="card-info">
                        <span>Минимальный остаток:</span>
                        <span>${formatQuantity(product.minQuantity, product.unit || 'шт')} ${product.unit || 'шт'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Функции для работы с выбором накладных в отчетах
function toggleAllInvoices(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateDeleteButton();
}

function updateDeleteButton() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    
    if (checkedBoxes.length > 0) {
        deleteBtn.style.display = 'inline-block';
    } else {
        deleteBtn.style.display = 'none';
    }
}

function deleteSelectedInvoices() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Выберите накладные для удаления');
        return;
    }
    
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (confirm(`Вы уверены, что хотите удалить ${selectedIds.length} накладную(ых)? Это действие нельзя отменить.`)) {
        // Удаляем накладные из массива reports
        const originalLength = reports.length;
        reports = reports.filter(report => !selectedIds.includes(report.id));
        
        // Сохраняем изменения
        saveData('reports', reports);
        
        // Обновляем отчет
        generateReport();
        
        alert(`Успешно удалено ${originalLength - reports.length} накладных`);
    }
}

// Показать модальное окно добавления товара
function showAddProductModal() {
    syncProductKgPieceFields();
    openModal('addProductModal');
    document.getElementById('productName').focus();
}

// Добавить товар
function addProduct() {
    const name = document.getElementById('productName').value.trim();
    const categoryId = document.getElementById('productCategory').value;
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
    const salePrice = parseFloat(document.getElementById('salePrice').value);
    const quantity = parseFloat(document.getElementById('quantity').value);
    const minQuantity = parseFloat(document.getElementById('minQuantity').value);
    const unit = document.getElementById('unit').value;
    const pieceQuantity = isKgUnit(unit)
        ? parseFloat(document.getElementById('kgPieceQuantity')?.value || '0')
        : 0;
    
    if (!name || !Number.isFinite(purchasePrice) || !Number.isFinite(salePrice) || !Number.isFinite(quantity) || !Number.isFinite(minQuantity) || !unit) {
        alert('Заполните все обязательные поля');
        return;
    }

    if (purchasePrice < 0 || salePrice < 0 || quantity < 0 || minQuantity < 0) {
        alert('Цена, количество и минимальный остаток не могут быть отрицательными');
        return;
    }

    if (!validateProductPieceQuantity(unit, quantity, pieceQuantity, 'товара')) {
        return;
    }

    const product = {
        id: generateId(),
        name: name,
        categoryId: categoryId,
        purchasePrice: purchasePrice,
        salePrice: salePrice,
        quantity: quantity,
        pieceQuantity: isKgUnit(unit) ? pieceQuantity : 0,
        minQuantity: minQuantity,
        unit: unit,
        createdAt: new Date().toISOString()
    };

    products.push(product);
    saveData('products', products);
    
    // Добавляем движение по складу
    if (quantity > 0) {
        const pieceText = isKgUnit(unit) ? ` / ${formatQuantity(pieceQuantity, 'шт')} шт` : '';
        addMovement('Поступление', `Поступило ${formatQuantity(quantity, unit)} ${unit}${pieceText} товара "${name}"`, quantity);
    }
    
    closeModal('addProductModal');
    document.getElementById('addProductForm').reset();
    syncProductKgPieceFields();
    loadProducts();
    updateStats();
}

// Редактировать товар
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const stock = getProductStockDisplay(product);

    document.getElementById('editProductId').value = productId;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.categoryId;
    document.getElementById('editPurchasePrice').value = product.purchasePrice;
    document.getElementById('editSalePrice').value = product.salePrice;
    document.getElementById('editQuantity').value = isCoreIncomingProduct(product) ? stock.quantity : product.quantity;
    document.getElementById('editMinQuantity').value = product.minQuantity;
    document.getElementById('editUnit').value = product.unit || 'шт';
    document.getElementById('editKgPieceQuantity').value = getProductPieceQuantity(product);
    document.getElementById('addQuantity').value = '';
    document.getElementById('addKgPieceQuantity').value = '';
    syncProductKgPieceFields('edit');

    openModal('editProductModal');
}

// Обновить товар
function updateProduct() {
    const productId = document.getElementById('editProductId').value;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const name = document.getElementById('editProductName').value.trim();
    const categoryId = document.getElementById('editProductCategory').value;
    const purchasePrice = parseFloat(document.getElementById('editPurchasePrice').value);
    const salePrice = parseFloat(document.getElementById('editSalePrice').value);
    const quantity = parseFloat(document.getElementById('editQuantity').value);
    const minQuantity = parseFloat(document.getElementById('editMinQuantity').value);
    const addQuantity = parseFloat(document.getElementById('addQuantity').value) || 0;
    const unit = document.getElementById('editUnit').value;
    const pieceQuantity = isKgUnit(unit)
        ? parseFloat(document.getElementById('editKgPieceQuantity')?.value || '0')
        : 0;
    const addPieceQuantity = isKgUnit(unit)
        ? (parseFloat(document.getElementById('addKgPieceQuantity')?.value || '0') || 0)
        : 0;
    
    if (!name || !Number.isFinite(purchasePrice) || !Number.isFinite(salePrice) || !Number.isFinite(quantity) || !Number.isFinite(minQuantity) || !unit) {
        alert('Заполните все обязательные поля');
        return;
    }

    if (purchasePrice < 0 || salePrice < 0 || quantity < 0 || minQuantity < 0 || addQuantity < 0 || addPieceQuantity < 0) {
        alert('Цена, количество и минимальный остаток не могут быть отрицательными');
        return;
    }

    const oldQuantity = product.quantity;
    const newQuantity = quantity + addQuantity;
    const newPieceQuantity = isKgUnit(unit) ? pieceQuantity + addPieceQuantity : 0;

    if (newQuantity < 0) {
        alert('Итоговое количество не может быть отрицательным');
        return;
    }

    if (isKgUnit(unit) && addQuantity > 0 && addPieceQuantity <= 0) {
        alert('Если добавляете товар в кг, укажите сколько штук добавили');
        return;
    }

    if (!validateProductPieceQuantity(unit, newQuantity, newPieceQuantity, 'товара')) {
        return;
    }

    // Обновляем товар
    product.name = name;
    product.categoryId = categoryId;
    product.purchasePrice = purchasePrice;
    product.salePrice = salePrice;
    product.quantity = newQuantity;
    product.pieceQuantity = newPieceQuantity;
    product.minQuantity = minQuantity;
    product.unit = unit;

    saveData('products', products);

    // Добавляем движение по складу если изменилось количество
    if (addQuantity > 0) {
        const pieceText = isKgUnit(unit) && addPieceQuantity > 0 ? ` / ${formatQuantity(addPieceQuantity, 'шт')} шт` : '';
        addMovement('Поступление', `Добавлено ${formatQuantity(addQuantity, unit)} ${unit}${pieceText} товара "${name}"`, addQuantity);
    }

    closeModal('editProductModal');
    loadProducts();
    updateStats();
}

// Удалить товар (улучшенная версия)
function deleteProduct(productId) {
    if (confirm('Удалить товар?')) {
        const product = products.find(p => p.id === productId);
        if (product) {
            const pieceText = shouldTrackProductPieces(product) ? ` / ${formatQuantity(getProductPieceQuantity(product), 'шт')} шт` : '';
            addMovement('Списание', `Удален товар "${product.name}" (${formatQuantity(product.quantity, product.unit || 'шт')} ${product.unit || 'шт'}${pieceText})`, -product.quantity);
        }

        // Удаляем товар из массива
        products = products.filter(p => p.id !== productId);
        saveData('products', products);

        loadProducts();
        updateStats();
    }
}

// ==================== КЛИЕНТЫ ====================

function getActionButtonContent(iconClass, label, withText = false) {
    return withText
        ? `<i class="${iconClass}"></i><span>${label}</span>`
        : `<i class="${iconClass}"></i>`;
}

function getDebtHistoryTypeLabel(type) {
    const labels = {
        create: 'Создали долг',
        add: 'Добавили к долгу',
        subtract: 'Уменьшили долг',
        comment: 'Оставили комментарий',
        payment: 'Приняли оплату',
        cancel_payment: 'Отменили оплату',
        payoff: 'Долг погашен'
    };
    return labels[type] || 'Изменение';
}

function formatHistoryTextForSimpleView(description) {
    if (!description) return 'Без подробностей';

    return escapeHtml(
        String(description)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, ' ')
            .replace(/[🆕➕➖💬✅💵↩]/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim()
    ).replace(/\n/g, '<br>');
}

function getLastDebtHistoryEntry(debt) {
    return debt?.history?.length ? debt.history[debt.history.length - 1] : null;
}

function getAllClientInvoices(client) {
    if (!client) return [];

    const clientName = String(client.name || '').trim();
    const clientId = String(client.id || '');
    const seen = new Set();

    return [...(Array.isArray(invoices) ? invoices : []), ...(Array.isArray(archivedInvoices) ? archivedInvoices : [])]
        .filter(invoice => {
            if (!invoice || !invoice.id || seen.has(invoice.id)) return false;
            const invoiceClientId = String(invoice.client || invoice.clientId || '');
            const invoiceClientName = getDisplayClientName(invoice.client || invoice.clientName || invoice.clientId || '');
            const matches = invoiceClientId === clientId || String(invoiceClientName || '').trim() === clientName;
            if (matches) seen.add(invoice.id);
            return matches;
        })
        .sort((left, right) => String(right.date || right.createdAt || '').localeCompare(String(left.date || left.createdAt || '')));
}

function getClientActiveDebt(client) {
    if (!client) return null;
    const clientName = String(client.name || '').trim();
    return ensureDebtRecordShape(debts.find(debt => String(debt.clientName || '').trim() === clientName));
}

function getInvoiceDisplayNumber(invoice) {
    if (!invoice) return '?';
    const index = invoices.findIndex(item => item.id === invoice.id);
    if (index !== -1) return index + 1;
    return invoice.invoiceNumberAtArchive || invoice.invoiceNumber || invoice.number || '?';
}

function openClientInvoiceFromCard(invoiceId) {
    if (invoices.some(invoice => invoice.id === invoiceId)) {
        previewInvoice(invoiceId);
        return;
    }

    if (archivedInvoices.some(invoice => invoice.id === invoiceId)) {
        previewArchivedInvoice(invoiceId);
        return;
    }

    showInvoiceDetails(invoiceId);
}

function renderClientRecentInvoices(client) {
    const recentInvoices = getAllClientInvoices(client).slice(0, 5);

    if (!recentInvoices.length) {
        return '<div class="client-card-empty">Накладных пока нет</div>';
    }

    return `
        <div class="client-recent-invoices">
            ${recentInvoices.map(invoice => `
                <button type="button" class="client-recent-invoice" onclick="openClientInvoiceFromCard('${invoice.id}')">
                    <span>№${getInvoiceDisplayNumber(invoice)} • ${formatDateShort(invoice.date || invoice.createdAt)}</span>
                    <strong>${formatCurrency(invoice.total || invoice.amount || 0)}</strong>
                    <small>${invoice.paymentType === 'debt' ? 'В долг' : 'Наличными'}</small>
                </button>
            `).join('')}
        </div>
    `;
}

function renderClientDebtSummary(client) {
    const debt = getClientActiveDebt(client);
    if (!debt || (Number(debt.amount) || 0) <= 0) {
        return '<span class="client-debt-pill client-debt-pill-clear">Долга нет</span>';
    }

    return `
        <button type="button" class="client-debt-pill client-debt-pill-active" onclick="switchTab('debts'); manageDebt('${debt.id}')">
            Долг ${formatCurrency(debt.amount)}
        </button>
    `;
}

// Загрузка клиентов
function loadClients() {
    const container = document.getElementById('clients-list');
	const queryInput = document.getElementById('client-search');
	const q = (queryInput ? queryInput.value : '').trim().toLowerCase();
    const simpleSellerMode = isSellerSimpleMode();
	const list = q
		? clients.filter(c => (c.name || '').toLowerCase().includes(q))
		: clients.slice();
	
	if (list.length === 0) {
		container.innerHTML = '<p class="text-center">Клиенты не найдены</p>';
		return;
	}

	container.innerHTML = list.map(client => {
        const clientInvoices = getAllClientInvoices(client);
        const totalAmount = clientInvoices.reduce((sum, invoice) => sum + (Number(invoice.total || invoice.amount) || 0), 0);

        return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">${escapeHtml(client.name)}</div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="showEditClientModal('${client.id}')" title="Редактировать клиента">
                        ${getActionButtonContent('fas fa-edit', 'Изменить', simpleSellerMode)}
                    </button>
                    ${!simpleSellerMode ? `
                    <button class="btn btn-primary btn-sm" onclick="showPersonalPrices('${client.id}')" title="Персональные цены">
                        ${getActionButtonContent('fas fa-tags', 'Цены', simpleSellerMode)}
                    </button>
                    ` : ''}
                    ${!isSellerMode() ? `
                    <button class="btn btn-danger btn-sm" onclick="deleteClient('${client.id}')">
                        ${getActionButtonContent('fas fa-trash', 'Удалить', simpleSellerMode)}
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="card-content">
                <div class="card-info">
                    <span>Телефон:</span>
                    <span>${escapeHtml(client.phone || 'Не указан')}</span>
                </div>
                <div class="card-info">
                    <span>Email:</span>
                    <span>${escapeHtml(client.email || 'Не указан')}</span>
                </div>
                <div class="card-info">
                    <span>Адрес:</span>
                    <span>${escapeHtml(client.address || 'Не указан')}</span>
                </div>
                <div class="client-card-summary">
                    <div>
                        <span>Накладных</span>
                        <strong>${clientInvoices.length}</strong>
                    </div>
                    <div>
                        <span>На сумму</span>
                        <strong>${formatCurrency(totalAmount)}</strong>
                    </div>
                    <div>
                        <span>Долг</span>
                        <strong>${renderClientDebtSummary(client)}</strong>
                    </div>
                </div>
                <div class="client-card-section">
                    <h4>Последние накладные</h4>
                    ${renderClientRecentInvoices(client)}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// Показать модальное окно добавления клиента
function showAddClientModal() {
    openModal('addClientModal');
    document.getElementById('clientName').focus();
}

// Добавить клиента
function addClient() {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const address = document.getElementById('clientAddress').value.trim();
    
    if (!name) {
        alert('Введите имя клиента');
        return;
    }

    const client = {
        id: generateId(),
        name: name,
        phone: phone,
        email: email,
        address: address,
        createdAt: new Date().toISOString()
    };

    clients.push(client);
    saveData('clients', clients);
    
    closeModal('addClientModal');
    document.getElementById('addClientForm').reset();
    loadClients();
    loadClientsToSelects();
}

// Показать модал редактирования клиента
function showEditClientModal(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const idEl = document.getElementById('editClientId');
    const nameEl = document.getElementById('editClientName');
    const phoneEl = document.getElementById('editClientPhone');
    const emailEl = document.getElementById('editClientEmail');
    const addrEl = document.getElementById('editClientAddress');
    if (idEl) idEl.value = client.id;
    if (nameEl) nameEl.value = client.name || '';
    if (phoneEl) phoneEl.value = client.phone || '';
    if (emailEl) emailEl.value = client.email || '';
    if (addrEl) addrEl.value = client.address || '';
    openModal('editClientModal');
    if (nameEl) nameEl.focus();
}

// Сохранить изменения клиента
function updateClient() {
    const id = document.getElementById('editClientId')?.value;
    const name = document.getElementById('editClientName')?.value.trim();
    const phone = document.getElementById('editClientPhone')?.value.trim();
    const email = document.getElementById('editClientEmail')?.value.trim();
    const address = document.getElementById('editClientAddress')?.value.trim();
    if (!id) return;
    if (!name) {
        alert('Введите имя клиента');
        return;
    }
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return;
    clients[idx] = { ...clients[idx], name, phone, email, address };
    saveData('clients', clients);
    closeModal('editClientModal');
    loadClients();
    loadClientsToSelects();
}

// Удалить клиента (улучшенная версия)
function deleteClient(clientId) {
    if (confirm('Удалить клиента?')) {
        // Удаляем клиента из массива
        clients = clients.filter(c => c.id !== clientId);
        saveData('clients', clients);

        loadClients();
        loadClientsToSelects();
    }
}

// ==================== ПОИСК КЛИЕНТОВ ====================

// Инициализация поиска клиентов
function initializeClientSearch() {
    const searchInput = document.getElementById('invoiceClientSearch');
    const dropdown = document.getElementById('clientDropdown');
    const hiddenInput = document.getElementById('invoiceClient');
    const clearButton = document.getElementById('clearClientSearch');
    
    if (!searchInput || !dropdown || !hiddenInput) return;
    
    let selectedClientId = null;
    let filteredClients = [];
    let highlightedIndex = -1;
    
    // Функция для получения всех клиентов включая "Частное лицо"
    function getAllClients() {
        const allClients = [...clients];
        allClients.unshift({
            id: 'private_person',
            name: 'Частное лицо',
            phone: '',
            email: '',
            address: ''
        });
        return allClients;
    }
    
    // Обработчик ввода в поле поиска
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        
        // Обновляем видимость кнопки очистки
        updateClearButtonVisibility();
        
        if (query.length === 0) {
            // Если поле пустое, показываем всех клиентов
            filteredClients = getAllClients();
            showDropdown(filteredClients);
            highlightedIndex = -1;
            return;
        }
        
        // Фильтруем клиентов
        filteredClients = clients.filter(client => 
            client.name.toLowerCase().includes(query) ||
            (client.phone && client.phone.includes(query)) ||
            (client.email && client.email.toLowerCase().includes(query))
        );
        
        // Добавляем "Частное лицо" если запрос подходит
        if ('частное лицо'.includes(query) || 'private'.includes(query)) {
            filteredClients.unshift({
                id: 'private_person',
                name: 'Частное лицо',
                phone: '',
                email: '',
                address: ''
            });
        }
        
        showDropdown(filteredClients);
        highlightedIndex = -1;
    });
    
    // Обработчик фокуса на поле поиска
    searchInput.addEventListener('focus', function() {
        // При фокусе показываем всех клиентов
        filteredClients = getAllClients();
        showDropdown(filteredClients);
        highlightedIndex = -1;
    });
    
    // Обработчик клика на кнопку очистки
    if (clearButton) {
        clearButton.addEventListener('click', function(e) {
            e.preventDefault();
            clearSelection();
        });
    }
    
    // Обработчик нажатия клавиш
    searchInput.addEventListener('keydown', function(e) {
        if (!dropdown.classList.contains('show')) return;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                highlightedIndex = Math.min(highlightedIndex + 1, filteredClients.length - 1);
                updateHighlight();
                break;
            case 'ArrowUp':
                e.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, -1);
                updateHighlight();
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredClients.length) {
                    selectClient(filteredClients[highlightedIndex]);
                }
                break;
            case 'Escape':
                hideDropdown();
                break;
        }
    });
    
    // Обработчик клика вне поля поиска
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
    
    // Функция показа выпадающего списка
    function showDropdown(clients) {
        if (clients.length === 0) {
            dropdown.innerHTML = '<div class="client-dropdown-empty">Клиенты не найдены</div>';
        } else {
            const searchQuery = searchInput.value.trim();
            const headerText = searchQuery ? `Найдено клиентов: ${clients.length}` : `Всего клиентов: ${clients.length}`;
            
            dropdown.innerHTML = `
                <div class="client-dropdown-header">
                    <span class="client-count">${headerText}</span>
                </div>
                ${clients.map((client, index) => `
                    <div class="client-dropdown-item" data-index="${index}" data-client-id="${client.id}">
                        <div class="client-name">${client.name}</div>
                        ${client.phone ? `<div class="client-details">Телефон: ${client.phone}</div>` : ''}
                        ${client.email ? `<div class="client-details">Email: ${client.email}</div>` : ''}
                    </div>
                `).join('')}
            `;
            
            // Добавляем обработчики клика на элементы списка
            dropdown.querySelectorAll('.client-dropdown-item').forEach((item, index) => {
                item.addEventListener('click', function() {
                    selectClient(clients[index]);
                });
                
                item.addEventListener('mouseenter', function() {
                    highlightedIndex = index;
                    updateHighlight();
                });
            });
        }
        
        dropdown.classList.add('show');
    }
    
    // Функция скрытия выпадающего списка
    function hideDropdown() {
        dropdown.classList.remove('show');
        highlightedIndex = -1;
    }
    
    // Функция обновления подсветки
    function updateHighlight() {
        dropdown.querySelectorAll('.client-dropdown-item').forEach((item, index) => {
            item.classList.toggle('highlighted', index === highlightedIndex);
        });
    }
    
    // Функция выбора клиента
    function selectClient(client) {
        selectedClientId = client.id;
        searchInput.value = client.name;
        hiddenInput.value = client.id;
        hideDropdown();
        updateClearButtonVisibility();
        
        // Добавляем класс selected к выбранному элементу
        dropdown.querySelectorAll('.client-dropdown-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = dropdown.querySelector(`[data-client-id="${client.id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Обновляем цены для всех товаров в накладной при смене клиента
        updateInvoicePricesForClient(client.id);
    }
    
    // Функция очистки выбора
    function clearSelection() {
        selectedClientId = null;
        searchInput.value = '';
        hiddenInput.value = '';
        hideDropdown();
        updateClearButtonVisibility();
        
        // Обновляем цены для всех товаров в накладной при очистке клиента
        updateInvoicePricesForClient('');
    }
    
    // Функция обновления видимости кнопки очистки
    function updateClearButtonVisibility() {
        if (clearButton) {
            clearButton.style.display = searchInput.value.trim() ? 'flex' : 'none';
        }
    }
    
    // Инициализация видимости кнопки очистки
    updateClearButtonVisibility();
    
    // Экспортируем функции для внешнего использования
    window.clearClientSelection = clearSelection;
}

// ==================== КАСТОМНЫЙ ВЫПАДАЮЩИЙ СПИСОК СПОСОБОВ ОПЛАТЫ ====================

// Инициализация кастомного выпадающего списка способов оплаты
function initializePaymentTypeSelect() {
    const selectElement = document.getElementById('paymentTypeSelect');
    const displayElement = selectElement.querySelector('.payment-type-display');
    const dropdownElement = selectElement.querySelector('.payment-type-dropdown');
    const hiddenInput = document.getElementById('paymentType');
    const options = selectElement.querySelectorAll('.payment-type-option');
    
    if (!selectElement || !displayElement || !dropdownElement || !hiddenInput) return;
    
    let isOpen = false;
    let selectedValue = '';
    
    // Данные для отображения
    const paymentTypes = {
        'cash': {
            name: 'Наличными',
            desc: 'Оплата наличными деньгами',
            icon: 'fas fa-money-bill-wave'
        },
        'debt': {
            name: 'В долг',
            desc: 'Оплата в рассрочку',
            icon: 'fas fa-hand-holding-usd'
        }
    };
    
    // Обработчик клика на основной элемент
    displayElement.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown();
    });
    
    // Обработчики клика на опции
    options.forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const value = option.getAttribute('data-value');
            selectOption(value);
        });
    });
    
    // Обработчик клика вне элемента
    document.addEventListener('click', function(e) {
        if (!selectElement.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Обработчик клавиатуры
    displayElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
        } else if (e.key === 'Escape') {
            closeDropdown();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                openDropdown();
            }
        }
    });
    
    // Функция переключения выпадающего списка
    function toggleDropdown() {
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }
    
    // Функция открытия выпадающего списка
    function openDropdown() {
        isOpen = true;
        selectElement.classList.add('active');
        dropdownElement.classList.add('show');
        displayElement.classList.add('active');
        
        // Добавляем атрибут для доступности
        displayElement.setAttribute('aria-expanded', 'true');
    }
    
    // Функция закрытия выпадающего списка
    function closeDropdown() {
        isOpen = false;
        selectElement.classList.remove('active');
        dropdownElement.classList.remove('show');
        displayElement.classList.remove('active');
        
        // Убираем атрибут для доступности
        displayElement.setAttribute('aria-expanded', 'false');
    }
    
    // Функция выбора опции
    function selectOption(value) {
        selectedValue = value;
        const paymentType = paymentTypes[value];
        
        if (paymentType) {
            // Обновляем отображение
            const iconElement = displayElement.querySelector('i:first-child');
            const textElement = displayElement.querySelector('span');
            
            iconElement.className = paymentType.icon;
            textElement.textContent = paymentType.name;
            
            // Обновляем скрытое поле
            hiddenInput.value = value;
            
            // Обновляем визуальное состояние опций
            options.forEach(option => {
                option.classList.remove('selected');
                if (option.getAttribute('data-value') === value) {
                    option.classList.add('selected');
                }
            });
            
            // Добавляем анимацию выбора
            const selectedOption = selectElement.querySelector(`[data-value="${value}"]`);
            if (selectedOption) {
                selectedOption.style.animation = 'none';
                setTimeout(() => {
                    selectedOption.style.animation = 'selectPulse 0.6s ease';
                }, 10);
            }
        }
        
        closeDropdown();
    }
    
    // Функция сброса выбора
    function resetSelection() {
        selectedValue = '';
        const iconElement = displayElement.querySelector('i:first-child');
        const textElement = displayElement.querySelector('span');
        
        iconElement.className = 'fas fa-credit-card';
        textElement.textContent = 'Выберите тип оплаты';
        hiddenInput.value = '';
        
        options.forEach(option => {
            option.classList.remove('selected');
        });
    }
    
    // Экспортируем функции для внешнего использования
    window.resetPaymentTypeSelection = resetSelection;
    window.getSelectedPaymentType = () => selectedValue;
}

// ==================== НАКЛАДНЫЕ ====================

// Загрузка накладных с предпросмотром и фильтрацией
// Формирует визуальные бейджи для типа табака и жарки у позиции накладной
function getItemTypeBadges(item) {
    try {
        const badges = [];
        const packageModeLabels = {
            whole: 'целый пакет',
            partial: 'не целый пакет',
            mixed: 'целые + открытый'
        };
        if (item && item.tobaccoType) {
            badges.push(`<span class="type-badge type-badge--tobacco" title="Тип табака">${getTobaccoTypeLabel(item.tobaccoType)}</span>`);
        }
        if (item && Number(item.kgItemCount) > 0) {
            badges.push(`<span class="type-badge" title="Количество штук/пакетов">${formatQuantity(item.kgItemCount, 'шт')} шт</span>`);
        }
        if (item && item.roast) {
            const parts = [];
            const roastParts = getRoastParts(item.roast);
            if (roastParts.length > 0) {
                roastParts.forEach(part => parts.push(`${part.label}: ${part.packs}`));
            } else {
                // Старая версия (обратная совместимость)
                const mixed = parseInt(item.roast.mixedPacks || 0, 10);
                const pure = parseInt(item.roast.purePacks || 0, 10);
                if (mixed > 0) parts.push(`мешаный: ${mixed}`);
                if (pure > 0) parts.push(`не мешаный: ${pure}`);
            }
            if (parts.length) {
                badges.push(`<span class="type-badge type-badge--roast" title="Тип жарки">${parts.join(' | ')}</span>`);
            }
        } else if (item && item.roastType) {
            const label = getRoastTypeLabel(item.roastType);
            badges.push(`<span class="type-badge type-badge--roast" title="Тип жарки">${label}</span>`);
        }
        if (item && item.packageSaleMode && !item.tobaccoType && !item.roastType && !item.roast && packageModeLabels[item.packageSaleMode]) {
            badges.push(`<span class="type-badge" title="Пакет">${packageModeLabels[item.packageSaleMode]}</span>`);
        }
        return badges.length ? `<span class="item-type-badges">${badges.join('')}</span>` : '';
    } catch (e) {
        console.warn('getItemTypeBadges error', e);
        return '';
    }
}

function renderSimpleSellerInvoiceCard(invoice, invoiceNumber) {
    const itemsList = invoice.items.map(item => `
        <div class="seller-simple-invoice-item">
            <div class="seller-simple-invoice-item-name">
                <strong>${item.productName}</strong>
                ${getItemTypeBadges(item)}
            </div>
            <div class="seller-simple-invoice-item-meta">
                <span>Количество: <strong>${formatQuantity(item.quantity, item.unit)} ${item.unit}</strong></span>
                <span>Цена: <strong>${formatCurrency(item.price)}</strong></span>
                <span>Сумма: <strong>${formatCurrency(item.total)}</strong></span>
            </div>
        </div>
    `).join('');

    const paymentDetails = invoice.paymentType === 'cash'
        ? `
            <div>
                <span class="seller-simple-payment-label">Продажа наличными</span>
                <strong>${formatCurrency(invoice.total)}</strong>
            </div>
            ${invoice.changeInfo ? `
            <div>
                <span class="seller-simple-payment-label">Получено от клиента</span>
                <strong>${formatCurrency(invoice.changeInfo.receivedAmount)}</strong>
            </div>
            <div>
                <span class="seller-simple-payment-label">Сдача клиенту</span>
                <strong>${formatCurrency(invoice.changeInfo.changeAmount)}</strong>
            </div>
            ` : ''}
        `
        : `
            <div>
                <span class="seller-simple-payment-label">Продажа в долг</span>
                <strong>${formatCurrency(invoice.total)}</strong>
            </div>
        `;

    return `
        <div class="card invoice-card seller-simple-invoice-card ${invoice.paymentType === 'debt' ? 'debt-invoice' : 'cash-invoice'}" data-invoice-id="${invoice.id}">
            <div class="seller-simple-invoice-head">
                <div class="seller-simple-invoice-head-main">
                    <div class="seller-simple-invoice-number">Накладная #${invoiceNumber}</div>
                    <div class="seller-simple-invoice-date">${formatDate(invoice.date)}</div>
                </div>
                <div class="seller-simple-invoice-total-box">
                    <span>Итог</span>
                    <strong>${formatCurrency(invoice.total)}</strong>
                </div>
            </div>
            <div class="seller-simple-invoice-body">
                <div class="seller-simple-client-row">
                    <span class="seller-simple-caption">Клиент</span>
                    <strong>${getDisplayClientName(invoice.client)}</strong>
                </div>
                <div class="seller-simple-status-row">
                    <span class="seller-simple-caption">Тип оплаты</span>
                    <div>${invoice.paymentType === 'cash' ? 'Наличными' : 'В долг'}</div>
                </div>
                <div class="seller-simple-payment-card ${invoice.paymentType === 'cash' ? 'cash' : 'debt'}">
                    ${paymentDetails}
                </div>
                ${invoice.notes ? `
                <div class="seller-simple-note-block">
                    <span class="seller-simple-note-label">Примечание</span>
                    <div class="seller-simple-note-text">${invoice.notes}</div>
                </div>
                ` : ''}
                <div class="seller-simple-items-block">
                    <div class="seller-simple-block-title">Товары в накладной</div>
                    <div class="seller-simple-items-list">
                        ${itemsList}
                    </div>
                </div>
                <div class="seller-simple-actions">
                    <button class="btn btn-primary btn-sm" onclick="showEditInvoiceModal('${invoice.id}')" title="Редактировать">
                        ${getActionButtonContent('fas fa-edit', 'Изменить', true)}
                    </button>
                    ${invoice.paymentType === 'cash' ? `
                    <button class="btn btn-success btn-sm" onclick="showChangeCalculator('${invoice.id}')" title="Указать наличные">
                        ${getActionButtonContent('fas fa-money-bill-wave', 'Наличные', true)}
                    </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${invoice.id}')" title="Удалить">
                        ${getActionButtonContent('fas fa-trash', 'Удалить', true)}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function loadInvoices() {
    autoArchiveOldInvoices();

    const container = document.getElementById('invoices-list');
    const searchTerm = document.getElementById('invoice-search')?.value?.toLowerCase() || '';
    const clientFilter = document.getElementById('invoice-client-filter')?.value || '';
    const dateFilter = document.getElementById('invoice-date-filter')?.value || '';
    const paymentFilter = document.getElementById('invoice-payment-filter')?.value || '';
    const recentFilter = document.getElementById('invoice-recent-filter')?.value || '';
    const sellerMode = isSellerMode();
    const simpleSellerMode = isSellerSimpleMode();
    
    // Дополнительная проверка загрузки
    console.log('Загружаем накладные. Всего в системе:', invoices.length);
    
    // Фильтруем накладные для отображения (все накладные активны, так как удалённые полностью удаляются)
    let filteredInvoices = invoices.filter(invoice => !invoice.isArchived);
    
    // Фильтрация по поиску
    if (searchTerm) {
        filteredInvoices = filteredInvoices.filter(invoice => {
            const client = clients.find(c => c.id === invoice.client);
            const clientName = client ? client.name.toLowerCase() : '';
            const notes = (invoice.notes || '').toLowerCase();
            const items = invoice.items.map(item => item.productName.toLowerCase()).join(' ');
            
            return clientName.includes(searchTerm) || 
                   notes.includes(searchTerm) || 
                   items.includes(searchTerm);
        });
    }
    
    // Фильтрация по клиенту
    if (clientFilter) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.client === clientFilter);
    }
    
    // Фильтрация по дате
    if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filteredInvoices = filteredInvoices.filter(invoice => {
            const invoiceDate = new Date(invoice.date);
            return invoiceDate.toDateString() === filterDate.toDateString();
        });
    }
    
    // Фильтрация по типу оплаты
    if (paymentFilter) {
        console.log('Фильтр по типу оплаты:', paymentFilter);
        console.log('Накладные до фильтрации:', filteredInvoices.length);
        filteredInvoices = filteredInvoices.filter(invoice => {
            const matches = invoice.paymentType === paymentFilter;
            console.log(`Накладная ${invoice.id}: paymentType=${invoice.paymentType}, matches=${matches}`);
            return matches;
        });
        console.log('Накладные после фильтрации:', filteredInvoices.length);
    }
    
    // Фильтрация по последним действиям
    if (recentFilter) {
        const now = new Date();
        let startDate, endDate;
        
        switch(recentFilter) {
            case 'today':
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'yesterday':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'last5':
                filteredInvoices = filteredInvoices.slice(-5);
                break;
            case 'last10':
                filteredInvoices = filteredInvoices.slice(-10);
                break;
        }
        
        if (recentFilter !== 'last5' && recentFilter !== 'last10') {
            filteredInvoices = filteredInvoices.filter(invoice => {
                const invoiceDate = new Date(invoice.date);
                return invoiceDate >= startDate && invoiceDate <= endDate;
            });
        }
    }
    
    if (filteredInvoices.length === 0) {
        selectedInvoices.clear();
        updateInvoiceFilterCount(0);
        syncInvoiceBulkActionsVisibility();
        container.innerHTML = '<p class="text-center">Нет накладных по выбранным фильтрам</p>';
        return;
    }

    // Сортируем накладные по дате создания (новые сначала)
    filteredInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = filteredInvoices.map(invoice => {
        // Находим правильный номер накладной в оригинальном массиве
        const originalIndex = invoices.findIndex(inv => inv.id === invoice.id);
        const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';

        if (simpleSellerMode) {
            return renderSimpleSellerInvoiceCard(invoice, invoiceNumber);
        }
        
        const itemsList = invoice.items.map(item => 
            `<div class="invoice-item-preview">
                <span class="item-name">${item.productName} ${getItemTypeBadges(item)}</span>
                <span class="item-quantity">${formatQuantity(item.quantity, item.unit)} ${item.unit}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                <span class="item-total">${formatCurrency(item.total)}</span>
            </div>`
        ).join('');
        
        return `
            <div class="card invoice-card ${invoice.paymentType === 'debt' ? 'debt-invoice' : 'cash-invoice'}" data-invoice-id="${invoice.id}">
                <div class="card-header">
                    <div class="card-title">
                        ${sellerMode ? '' : `<input type="checkbox" class="invoice-checkbox" id="invoice-${invoice.id}" onchange="updateSelectedInvoices()" style="margin-right: 8px;">`}
                        Накладная #${invoiceNumber}
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="previewInvoice('${invoice.id}')" title="Предпросмотр">
                            ${getActionButtonContent('fas fa-eye', 'Посмотреть')}
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="showEditInvoiceModal('${invoice.id}')" title="Редактировать">
                            ${getActionButtonContent('fas fa-edit', 'Изменить')}
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="printInvoice('${invoice.id}')" title="Печать">
                            ${getActionButtonContent('fas fa-print', 'Печать')}
                        </button>
                        ${invoice.paymentType === 'cash' ? `
                        <button class="btn btn-success btn-sm" onclick="showChangeCalculator('${invoice.id}')" title="Указать наличные">
                            ${getActionButtonContent('fas fa-money-bill-wave', 'Наличные')}
                        </button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${invoice.id}')" title="Удалить">
                            ${getActionButtonContent('fas fa-trash', 'Удалить')}
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="invoice-preview">
                        <div class="invoice-info">
                            <div class="card-info">
                                <span>Дата:</span>
                                <span>${formatDate(invoice.date)}</span>
                            </div>
                            <div class="card-info">
                                <span>Клиент:</span>
                                <span>${getDisplayClientName(invoice.client)}</span>
                            </div>
                            <div class="card-info">
                                <span>Оплата:</span>
                                <span>${invoice.paymentType === 'cash' ? 'Наличными' : 'В долг'}</span>
                            </div>
                            ${invoice.notes ? `<div class="card-info">
                                <span>Примечания:</span>
                                <span>${escapeHtml(invoice.notes)}</span>
                            </div>` : ''}
                            ${invoice.changeInfo ? `<div class="card-info change-info">
                                <span>Сдача:</span>
                                <span>Получено: ${formatCurrency(invoice.changeInfo.receivedAmount)} | Сдача: ${formatCurrency(invoice.changeInfo.changeAmount)}</span>
                            </div>` : ''}
                        </div>
                        <div class="invoice-total-section">
                            <div class="invoice-total-wrapper">
                                <span class="invoice-total-label">Итог:</span>
                                <span class="invoice-total-amount">${formatCurrency(invoice.total)}</span>
                            </div>
                        </div>
                        <div class="invoice-items-preview">
                            <h4><i class="fas fa-list"></i> Товары в накладной:</h4>
                            <div class="items-preview-list">
                                ${itemsList}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Обновляем счетчик найденных накладных
    updateInvoiceFilterCount(filteredInvoices.length);
    syncInvoiceBulkActionsVisibility();
    applyInvoiceActionAccess();

    if (typeof renderControlCenter === 'function') {
        renderControlCenter();
    }
}

// Обновление счетчика отфильтрованных накладных с красивым дизайном
function updateInvoiceFilterCount(count) {
    const counter = document.getElementById('invoice-filter-count');
    if (counter) {
        const totalInvoices = invoices.filter(invoice => !invoice.isArchived).length;
        const foundInvoices = count;
        
        // Определяем эмодзи и стиль в зависимости от результатов
        let emoji, statusClass, message;
        
        if (foundInvoices === 0) {
            emoji = '🔍';
            statusClass = 'filter-count-empty';
            message = `Поиск не дал результатов`;
        } else if (foundInvoices === totalInvoices) {
            emoji = '📋';
            statusClass = 'filter-count-all';
            message = `Показаны все ${foundInvoices} накладных`;
        } else if (foundInvoices < totalInvoices) {
            emoji = '✅';
            statusClass = 'filter-count-filtered';
            message = `Найдено ${foundInvoices} из ${totalInvoices} накладных`;
        } else {
            emoji = '🎯';
            statusClass = 'filter-count-exact';
            message = `Точное совпадение: ${foundInvoices} накладных`;
        }
        
        // Обновляем HTML с красивым дизайном
        counter.innerHTML = `
            <div class="filter-count-display ${statusClass}">
                <span class="filter-count-emoji">${emoji}</span>
                <span class="filter-count-text">${message}</span>
                <span class="filter-count-numbers">${foundInvoices}/${totalInvoices}</span>
            </div>
        `;
    }
}

// Очистка фильтров накладных
function clearInvoiceFilters() {
    document.getElementById('invoice-search').value = '';
    document.getElementById('invoice-client-filter').value = '';
    document.getElementById('invoice-date-filter').value = '';
    document.getElementById('invoice-payment-filter').value = '';
    document.getElementById('invoice-recent-filter').value = '';
    loadInvoices();
}

// Предпросмотр накладной в модальном окне
function showInvoicePreviewModal(invoice, invoiceNumber, options = {}) {
    if (!invoice) return;

    const title = options.title || `Предпросмотр накладной #${invoiceNumber}`;
    const printAction = options.allowPrint === false
        ? ''
        : `
            <button class="btn btn-primary" onclick="printInvoice('${invoice.id}')">
                <i class="fas fa-print"></i> Печать
            </button>
        `;

    const modalHtml = `
        <div id="previewInvoiceModal" class="modal">
            <div class="modal-content modal-preview">
                <div class="modal-header">
                    <h3>${escapeHtml(title)}</h3>
                    <span class="close" onclick="closeModal('previewInvoiceModal')">&times;</span>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div class="invoice-preview-full">
                        <div class="invoice-header">
                            <h2>Накладная #${invoiceNumber}</h2>
                            <p class="invoice-date">Дата: ${formatDate(invoice.date)}</p>
                        </div>
                        <div class="invoice-details">
                            <div class="detail-row">
                                <span class="detail-label">Клиент:</span>
                                <span class="detail-value">${getDisplayClientName(invoice.client)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Тип оплаты:</span>
                                <span class="detail-value">${invoice.paymentType === 'cash' ? 'Наличными' : 'В долг'}</span>
                            </div>
                            ${invoice.notes ? `<div class="detail-row">
                                <span class="detail-label">Примечания:</span>
                                <span class="detail-value">${escapeHtml(invoice.notes)}</span>
                            </div>` : ''}
                            ${invoice.changeInfo ? `<div class="detail-row">
                                <span class="detail-label">Наличные:</span>
                                <span class="detail-value">Получено ${formatCurrency(invoice.changeInfo.receivedAmount)} • Сдача ${formatCurrency(invoice.changeInfo.changeAmount)}</span>
                            </div>` : ''}
                            ${options.archiveMetaHtml || ''}
                        </div>
                        <div class="invoice-items-full">
                            <h3>Товары:</h3>
                            <table class="invoice-items-table">
                                <thead>
                                    <tr>
                                        <th>Товар</th>
                                        <th>Количество</th>
                                        <th>Цена</th>
                                        <th>Сумма</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoice.items.map(item => `
                                        <tr>
                                            <td>${item.productName} ${getItemTypeBadges(item)}</td>
                                            <td>${formatQuantity(item.quantity, item.unit)} ${item.unit}</td>
                                            <td>${formatCurrency(item.price)}</td>
                                            <td>${formatCurrency(item.total)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="invoice-total-row">
                                <span class="total-label">Итого:</span>
                                <span class="total-amount">${formatCurrency(invoice.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('previewInvoiceModal')">Закрыть</button>
                    ${printAction}
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('previewInvoiceModal');
    if (existingModal) {
        existingModal.remove();
    }

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('previewInvoiceModal').style.display = 'block';
    document.getElementById('previewInvoiceModal').classList.add('open');
}

function previewInvoice(invoiceId) {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const originalIndex = invoices.findIndex(inv => inv.id === invoiceId);
    const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
    showInvoicePreviewModal(invoice, invoiceNumber);
}

function previewArchivedInvoice(invoiceId) {
    const invoice = archivedInvoices.find(item => item.id === invoiceId);
    if (!invoice) {
        alert('Накладная не найдена в архиве');
        return;
    }

    const invoiceNumber = invoice.invoiceNumberAtArchive || '?';
    const archiveMetaHtml = `
        <div class="detail-row">
            <span class="detail-label">В архиве с:</span>
            <span class="detail-value">${formatShortDateTime(invoice.archivedAt)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Кто архивировал:</span>
            <span class="detail-value">${escapeHtml(invoice.archivedBy || 'Не указано')}</span>
        </div>
    `;

    showInvoicePreviewModal(invoice, invoiceNumber, {
        title: `Архивная накладная #${invoiceNumber}`,
        allowPrint: false,
        archiveMetaHtml
    });
}

// Показать модальное окно создания накладной
function showCreateInvoiceModal() {
    if (isSellerMode() && !getCurrentShift()) {
        alert('Сначала откройте смену продавца, затем создавайте накладные');
        return;
    }

    const modal = document.getElementById('createInvoiceModal');
    modal.classList.add('open');
    
    // Блокируем скролл body при открытии модального окна
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    loadInvoiceItems();
    updateInvoiceTotal();
    
    // Сбрасываем тип оплаты на пустое значение
    document.getElementById('paymentType').value = '';
    
    // Очищаем поле поиска клиента
    if (window.clearClientSelection) {
        window.clearClientSelection();
    }
    
    // Сбрасываем выбор способа оплаты
    if (window.resetPaymentTypeSelection) {
        window.resetPaymentTypeSelection();
    }
    
    // Добавляем обработчик для предотвращения закрытия при нажатии Enter
    const form = modal.querySelector('form');
    
    if (form) {
        form.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                return false;
            }
        });
    }
}

// Загрузка товаров для накладной
function loadInvoiceItems() {
    const container = document.getElementById('invoice-items-list');
    container.innerHTML = '';
    addInvoiceItem();
    
    // Настраиваем обработчики для всех полей ввода количества
    setTimeout(() => {
        setupQuantityInputListeners();
    }, 100);
}

// Добавить товар в накладную
function addInvoiceItem() {
    const container = document.getElementById('invoice-items-list');
    const itemId = generateId();
    
    const itemHtml = `
        <div class="invoice-item-row" data-item-id="${itemId}">
            <select class="form-control product-select" onchange="updateProductInfo('${itemId}')">
                <option value="">Выберите товар</option>
                ${getInvoiceSelectableProducts().map(product => `
                    <option value="${product.id}" 
                            data-price="${product.salePrice}" 
                            data-quantity="${getInvoiceProductOptionQuantity(product)}"
                            data-unit="${product.unit || 'шт'}"
                            data-category="${product.category}">
                        ${product.name} - ${formatCurrency(product.salePrice)} (${getInvoiceProductStockText(product)})
                    </option>
                `).join('')}
            </select>
            ${renderPackageSaleModeControls('tobacco')}
            ${renderPackageSaleModeControls('roast')}
            ${renderSimplePackageSaleModeControls()}
            <div class="tobacco-type-selection" style="display: none;">
                <label>Пакеты</label>
                <div class="tobacco-type-options compact tiny">
                    ${renderTobaccoTypeInputs()}
                </div>
            </div>
            <div class="roast-type-selection" style="display: none;">
                <label>Пакеты</label>
                <div class="tobacco-type-options compact tiny">
                    ${renderRoastTypeInputs()}
                </div>
            </div>
            <label class="invoice-quantity-field">
                <span>КОЛ</span>
                <input type="number" class="form-control quantity-input" 
                       placeholder="КГ" min="0.01" step="0.01">
            </label>
            <label class="invoice-quantity-field kg-count-field" style="display: none;">
                <span>ШТ</span>
                <input type="number" class="form-control kg-count-input" 
                       placeholder="ШТ" min="1" step="1" disabled>
            </label>
            <span class="unit-display">шт</span>
            <span class="price-display">0 ₽</span>
            <span class="total-display">0 ₽</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeInvoiceItem('${itemId}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    
    // Настраиваем обработчики для нового поля ввода
    const newInput = container.lastElementChild.querySelector('.quantity-input');
    newInput.addEventListener('input', handleQuantityInput);
    newInput.addEventListener('keydown', handleQuantityKeydown);
    const newKgCountInput = container.lastElementChild.querySelector('.kg-count-input');
    newKgCountInput.addEventListener('input', handleQuantityInput);
    newKgCountInput.addEventListener('keydown', handleQuantityKeydown);
    // Пересчет при изменении количества по типам табака
    const tobaccoInputs = container.lastElementChild.querySelectorAll('.tobacco-qty-input');
    tobaccoInputs.forEach(inp => inp.addEventListener('input', () => updateItemTotal(container.lastElementChild.getAttribute('data-item-id'))));
}

function duplicateInvoiceItem(itemId) {
    const row = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!row) return;
    const select = row.querySelector('.product-select');
    const qty = row.querySelector('.quantity-input');
    const kgCount = row.querySelector('.kg-count-input');
    const unit = row.querySelector('.unit-display');
    const tobaccoChecked = row.querySelector('input[name^="tobacco-type-"]:checked');

    addInvoiceItem();
    const container = document.getElementById('invoice-items-list');
    const newRow = container.lastElementChild;
    const newSelect = newRow.querySelector('.product-select');
    const newQty = newRow.querySelector('.quantity-input');
    const newKgCount = newRow.querySelector('.kg-count-input');
    const newUnit = newRow.querySelector('.unit-display');

    // Проставляем те же значения
    newSelect.value = select.value;
    updateProductInfo(newRow.getAttribute('data-item-id'));
    newQty.value = qty.value;
    if (newKgCount && kgCount) newKgCount.value = kgCount.value;
    newUnit.textContent = unit.textContent;

    // Значения пакетов по типам табака (компактная схема)
    const oldPacks = row.querySelectorAll('.tobacco-pack-count');
    const newPacks = newRow.querySelectorAll('.tobacco-pack-count');
    if (oldPacks && newPacks && oldPacks.length === newPacks.length) {
        oldPacks.forEach((inp, idx) => { newPacks[idx].value = inp.value; });
    }
    // Тип жарки - копируем значения пакетов
    const oldRoastPacks = row.querySelectorAll('.roast-pack-input');
    const newRoastPacks = newRow.querySelectorAll('.roast-pack-input');
    if (oldRoastPacks && newRoastPacks && oldRoastPacks.length === newRoastPacks.length) {
        oldRoastPacks.forEach((inp, idx) => { 
            newRoastPacks[idx].value = inp.value;
        });
    }

    updateItemTotal(newRow.getAttribute('data-item-id'));
}
// (удалено: переключение чекбокса — теперь используем только микрополя для пакетов)

// Обновить информацию о товаре
function updateProductInfo(itemId) {
    const row = document.querySelector(`[data-item-id="${itemId}"]`);
    const select = row.querySelector('.product-select');
    const option = select.options[select.selectedIndex];
    const priceDisplay = row.querySelector('.price-display');
    const quantityInput = row.querySelector('.quantity-input');
    const unitDisplay = row.querySelector('.unit-display');
    const tobaccoTypeSelection = row.querySelector('.tobacco-type-selection');
    const roastTypeSelection = row.querySelector('.roast-type-selection');
    
    if (option.value) {
        const productId = option.value;
        const clientId = document.getElementById('invoiceClient').value;
        const category = String(option.dataset.category || '');
        const selectedProduct = products.find(p => p.id === productId);
        
        // Проверяем, является ли товар табаком (по названию или категории)
        const isTobacco = selectedProduct ? isTobaccoProduct(selectedProduct) : (option.text.toLowerCase().includes('табак') || 
                         category.toLowerCase().includes('табак') ||
                         option.text.toLowerCase().includes('tobacco'));
        // Проверяем, является ли товар жаркой (по названию)
        const isRoast = selectedProduct ? isRoastProduct(selectedProduct) : (option.text.toLowerCase().includes('жарка') || category.toLowerCase().includes('жарка') || option.text.toLowerCase().includes('обжар'));
        const isSimplePackaged = selectedProduct ? isSimplePackagedProduct(selectedProduct) : false;
        const packageControls = row.querySelectorAll('.package-sale-mode-controls');
        packageControls.forEach(control => {
            const targetKind = isTobacco ? 'tobacco' : isRoast ? 'roast' : isSimplePackaged ? 'simple' : '';
            control.style.display = control.dataset.packageKind === targetKind ? 'flex' : 'none';
        });
        
        // Показываем выбор типа табака только для табака
        if (isTobacco) {
            tobaccoTypeSelection.style.display = 'flex';
            // Навешиваем пересчет на поля количества пакетов по типам табака
            const packInputs = row.querySelectorAll('.tobacco-pack-count');
            packInputs.forEach(inp => {
                inp.oninput = () => updateItemTotal(itemId);
            });
        } else {
            tobaccoTypeSelection.style.display = 'none';
            // Сбрасываем выбор типа табака
            const radioButtons = row.querySelectorAll('input[name^="tobacco-type-"]');
            radioButtons.forEach(radio => radio.checked = false);
            const customInput = row.querySelector('.custom-tobacco-input');
            if (customInput) customInput.style.display = 'none';
            // Сброс полей количества пакетов
            row.querySelectorAll('.tobacco-pack-count').forEach(i => { i.value = ''; });
        }

        // Показываем выбор типа жарки только для жарки
        if (isRoast) {
            roastTypeSelection.style.display = 'flex';
            // Подпишем перераспределение при изменении пакетов
            const inputs = roastTypeSelection.querySelectorAll('.roast-pack-input');
            inputs.forEach(inp => {
                inp.oninput = () => distributeRoastWeight(row);
            });
        } else {
            roastTypeSelection.style.display = 'none';
            // Сбрасываем значения пакетов жарки
            row.querySelectorAll('.roast-pack-input').forEach(inp => inp.value = '');
        }
        updatePackageSaleModeForRow(row);
        
        // Получаем актуальную цену (персональную или стандартную)
        const actualPrice = getActualPrice(clientId, productId);
        const standardPrice = parseFloat(option.dataset.price);
        const maxQuantity = parseFloat(option.dataset.quantity);
        const unit = option.dataset.unit || 'шт';
        const availableQuantity = getAvailableInvoiceQuantityForProduct(products.find(p => p.id === productId));
        syncKgCountVisibility(row, unit);
        
        // Отображаем цену с индикатором персональной цены
        if (actualPrice !== standardPrice) {
            priceDisplay.innerHTML = `
                <span style="color: #e74c3c; font-weight: 600; text-decoration: underline; text-decoration-style: wavy; text-underline-offset: 3px;" title="Персональная цена">${formatCurrency(actualPrice)}</span>
                <br><small style="color: #7f8c8d; text-decoration: line-through; font-size: 11px;">${formatCurrency(standardPrice)}</small>
            `;
        } else {
            priceDisplay.textContent = formatCurrency(actualPrice);
        }
        
        quantityInput.max = isTobacco ? availableQuantity : (isRoast && unit === 'кг' ? '' : maxQuantity);
        quantityInput.value = unit === 'кг' ? '1.00' : '1';
        quantityInput.step = unit === 'кг' ? '0.01' : '1';
        quantityInput.min = unit === 'кг' ? '0.01' : '1';
        unitDisplay.textContent = unit;
        
        // Фокусируемся на поле ввода для удобства
        setTimeout(() => {
            quantityInput.focus();
            quantityInput.select();
        }, 100);
        
        updateItemTotal(itemId);
    } else {
        priceDisplay.textContent = '0 ₽';
        quantityInput.value = '';
        quantityInput.min = '0.01';
        quantityInput.step = '0.01';
        syncKgCountVisibility(row, 'шт');
        unitDisplay.textContent = 'шт';
        tobaccoTypeSelection.style.display = 'none';
        roastTypeSelection.style.display = 'none';
        row.querySelectorAll('.package-sale-mode-controls').forEach(control => {
            control.style.display = 'none';
        });
        // Сбрасываем выбор типа табака
        const radioButtons = row.querySelectorAll('input[name^="tobacco-type-"]');
        radioButtons.forEach(radio => radio.checked = false);
        // Сбрасываем значения пакетов жарки
        row.querySelectorAll('.roast-pack-input').forEach(inp => inp.value = '');
        const customInput = row.querySelector('.custom-tobacco-input');
        if (customInput) customInput.style.display = 'none';
        updateItemTotal(itemId);
    }
}

// Обновить тип табака
function updateTobaccoType(itemId) {
    const row = document.querySelector(`[data-item-id="${itemId}"]`);
    const customInput = row.querySelector('.custom-tobacco-input');
    const selectedType = row.querySelector('input[name^="tobacco-type-"]:checked');
    
    if (selectedType && selectedType.value === 'custom') {
        customInput.style.display = 'block';
    } else {
        customInput.style.display = 'none';
    }
    
    updateItemTotal(itemId);
}

// Обновить тип жарки
function updateRoastType(itemId) {
    const row = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!row) return;
    distributeRoastWeight(row);
}

// Получить выбранный тип жарки
function getSelectedRoastType(itemId) {
    const row = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!row) return null;
    const packValues = getRoastPackValuesFromRow(row);
    const types = ROAST_TYPE_CONFIGS
        .filter(config => packValues[config.type] > 0)
        .map(config => config.type);
    if (types.length === 0) return null;
    if (types.length === 1) return types[0];
    return types.join('_and_');
}

// Распределение общего веса по количеству пакетов жарки
function distributeRoastWeight(row) {
    if (!row) return;
    const select = row.querySelector('.product-select');
    if (!select || !select.value) return;
    const optionText = select.options[select.selectedIndex]?.text?.toLowerCase() || '';
    const category = select.options[select.selectedIndex]?.dataset?.category?.toLowerCase() || '';
    const isRoast = optionText.includes('жарка') || category.includes('жарка') || optionText.includes('обжар');
    if (!isRoast) return;

    const totalKgInput = row.querySelector('.quantity-input');
    const unit = row.querySelector('.unit-display')?.textContent || 'шт';
    const totalKg = parseFloat(totalKgInput?.value || '0');
    if (unit !== 'кг' || !(totalKg > 0)) return;

    const packValues = getRoastPackValuesFromRow(row);
    if (getTotalRoastPackCount(packValues) <= 0) return;
    applyRoastKgDistribution(row, totalKg, packValues);
}

// Обновить пользовательский тип табака
function updateCustomTobaccoType(itemId) {
    updateItemTotal(itemId);
}

// Получить выбранный тип табака для товара
function getSelectedTobaccoType(itemId) {
    const row = document.querySelector(`[data-item-id="${itemId}"]`);
    const selectedType = row.querySelector('input[name^="tobacco-type-"]:checked');
    
    if (selectedType) {
        if (selectedType.value === 'custom') {
            const customInput = row.querySelector('.custom-tobacco-input input');
            return customInput ? customInput.value.trim() : null;
        }
        return selectedType.value;
    }
    return null;
}

// Обновить общую сумму товара
function updateItemTotal(itemId) {
    // Ищем товар только в форме создания накладной
    const itemsContainer = document.getElementById('invoice-items-list');
    if (!itemsContainer) return;
    
    const row = itemsContainer.querySelector(`[data-item-id="${itemId}"]`);
    if (!row) return;
    
    const select = row.querySelector('.product-select');
    const quantityInput = row.querySelector('.quantity-input');
    const totalDisplay = row.querySelector('.total-display');
    const unitDisplay = row.querySelector('.unit-display');
    
    if (select.value && quantityInput.value) {
        const productId = select.value;
        const clientId = document.getElementById('invoiceClient').value;
        const actualPrice = getActualPrice(clientId, productId);
        const quantity = parseFloat(quantityInput.value);
        const unit = unitDisplay.textContent;
        const total = actualPrice * quantity;
        
        // Округляем количество при отображении только если поле не в фокусе
        if (unit === 'кг' && document.activeElement !== quantityInput) {
            quantityInput.value = parseFloat(quantity).toFixed(2);
        }
        
        totalDisplay.textContent = formatCurrency(total);
    } else {
        totalDisplay.textContent = '0 ₽';
    }
    
    updateInvoiceTotal();

    // Дополнительно перераспределяем вес по пакетам (для жарки)
    distributeRoastWeight(row);
    // Пересчет для табака: цена * ОБЩЕЕ количество (вводится в поле строки).
    // Поля типов теперь задают только КОЛ-ВО ПАКЕТОВ для распределения, а не количество штук.
    if (row) {
        const isTobaccoVisible = row.querySelector('.tobacco-type-selection')?.style.display === 'block';
        const priceDisplay = row.querySelector('.price-display');
        const totalDisplay = row.querySelector('.total-display');
        const quantityInput = row.querySelector('.quantity-input');
        const select = row.querySelector('.product-select');
        const option = select?.options[select.selectedIndex];
        if (option && option.value) {
            const clientId = document.getElementById('invoiceClient')?.value;
            if (!clientId) return;
            
            const productId = option.value;
            const actualPrice = getActualPrice(clientId, productId);
            const standardPrice = parseFloat(option.dataset.price || actualPrice);
            
            // Отображаем цену с индикатором персональной цены
            if (actualPrice !== standardPrice) {
                if (priceDisplay) {
                    priceDisplay.innerHTML = `
                        <span style="color: #e74c3c; font-weight: 600; text-decoration: underline; text-decoration-style: wavy; text-underline-offset: 3px;" title="Персональная цена">${formatCurrency(actualPrice)}</span>
                        <br><small style="color: #7f8c8d; text-decoration: line-through; font-size: 11px;">${formatCurrency(standardPrice)}</small>
                    `;
                }
            } else {
                if (priceDisplay) {
                    priceDisplay.textContent = formatCurrency(actualPrice);
                }
            }
            
            const totalQty = parseFloat(quantityInput.value || '0');
            if (totalDisplay) {
                totalDisplay.textContent = `${formatCurrency(actualPrice * (isNaN(totalQty) ? 0 : totalQty))}`;
            }
            updateInvoiceTotal();
            return;
        }
    }
}

// Обновление в реальном времени при вводе количества
function setupQuantityInputListeners() {
    const quantityInputs = document.querySelectorAll('.quantity-input, .kg-count-input');
    quantityInputs.forEach(input => {
        // Удаляем старые обработчики
        input.removeEventListener('input', handleQuantityInput);
        input.removeEventListener('keydown', handleQuantityKeydown);
        
        // Добавляем новые обработчики
        input.addEventListener('input', handleQuantityInput);
        input.addEventListener('keydown', handleQuantityKeydown);
    });
}

// Обработчик ввода количества
function handleQuantityInput(event) {
    const input = event.target;
    const row = input.closest('.invoice-item-row');
    const itemId = row.getAttribute('data-item-id');
    
    // Обновляем сумму только если введено корректное значение
    const value = parseFloat(input.value);
    if (!isNaN(value) && value >= 0) {
        syncMixedSaleQuantities(row);
        updateItemTotal(itemId);
    }
}

// Обработчик нажатия клавиш для количества
function handleQuantityKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
}

// Удалить товар из накладной
function removeInvoiceItem(itemId) {
    // Ищем товар только в форме создания накладной
    const itemsContainer = document.getElementById('invoice-items-list');
    if (!itemsContainer) return;
    
    const row = itemsContainer.querySelector(`[data-item-id="${itemId}"]`);
    if (row) {
        row.remove();
        updateInvoiceTotal();
    }
}

// Обновить общую сумму накладной
function updateInvoiceTotal() {
    // Ищем товары только в форме создания накладной
    const itemsContainer = document.getElementById('invoice-items-list');
    if (!itemsContainer) return;
    
    const rows = itemsContainer.querySelectorAll('.invoice-item-row');
    let total = 0;
    
    rows.forEach(row => {
        const select = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');
        
        if (select.value && quantityInput.value) {
            const productId = select.value;
            const clientId = document.getElementById('invoiceClient').value;
            const actualPrice = getActualPrice(clientId, productId);
            const quantity = parseFloat(quantityInput.value);
            const itemTotal = actualPrice * quantity;
            total += itemTotal;
        }
    });
    
    document.getElementById('invoice-total').textContent = formatCurrency(total);
}

// Создать накладную
function createInvoice() {
    console.log('🚀 Функция createInvoice вызвана');
    
    const client = document.getElementById('invoiceClient').value;
    const paymentType = document.getElementById('paymentType').value;
    const notes = document.getElementById('invoiceNotes').value.trim();
    
    console.log('📋 Данные формы:', { client, paymentType, notes });

    if (!client) {
        alert('Пожалуйста, выберите клиента (или "Частное лицо")');
        return;
    }
    
    // Ищем товары только в форме создания накладной
    const itemsContainer = document.getElementById('invoice-items-list');
    if (!itemsContainer) {
        alert('Ошибка: контейнер товаров не найден');
        return;
    }
    const rows = Array.from(itemsContainer.querySelectorAll('.invoice-item-row'));
    const items = [];
    let total = 0;
    const packageTypeUsage = createPackageTypeUsageTracker();
    
    for (const row of rows) {
        const select = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');
        const unitDisplay = row.querySelector('.unit-display');
        const itemId = row.getAttribute('data-item-id');

        if (!select.value || !quantityInput.value) {
            continue; // пустая строка - пропускаем
        }

        const productId = select.value;
        const quantity = parseFloat(quantityInput.value);
        const product = products.find(p => p.id === productId);
        const unit = unitDisplay.textContent;

        if (!product) {
            console.error(`❌ Товар с ID ${productId} не найден в базе данных`);
            alert(`Ошибка: товар не найден в базе данных. ID: ${productId}`);
            return; // прерываем создание накладной целиком
        }

        const isTobacco = isTobaccoProduct(product);
        const isRoast = isRoastProduct(product);
        const isSimplePackaged = isSimplePackagedProduct(product);
        const kgItemCount = getKgItemCountFromRow(row);
        const packageSaleMode = getPackageSaleModeFromRow(row);

        if (!validateKgItemCount(row, product, unit)) {
            return;
        }
        if (!validateKgProductSalePieces(product, kgItemCount)) {
            return;
        }

        // Для табака больше не требуем выбор одного типа заранее — ввод пакетов ниже распределит количество
        if (isTobacco) {
            // no-op
        }

        if (isRoast && packageSaleMode !== 'partial') {
            const roastPackValues = getRoastPackValuesFromRow(row);
            if (getTotalRoastPackCount(roastPackValues) <= 0) {
                alert(`Для товара "${product.name}" укажите количество пакетов по типам (5/0, 4/1, 3/2, 2/3)`);
                return; // прерываем создание накладной целиком
            }
        }

        if (!validateInvoiceRowPackageTypeStock(row, product, packageTypeUsage)) {
            return;
        }

        if (product) {
            const actualPrice = getActualPrice(client, productId);
            if (isTobacco) {
                // Новая логика: поля типов содержат число ПАКЕТОВ, а общее количество задаётся в поле строки
                const availableTobaccoQty = getAvailableInvoiceQuantityForProduct(product);
                if (quantity > availableTobaccoQty) {
                    alert(`Недостаточно остатка для товара "${product.name}". Доступно: ${formatQuantity(availableTobaccoQty, unit)} ${unit}`);
                    return;
                }
                if (packageSaleMode === 'mixed') {
                    const mixedItems = buildMixedTobaccoInvoiceItems(row, product, productId, actualPrice, unit);
                    if (!mixedItems) return;
                    mixedItems.forEach(item => {
                        items.push(item);
                        total += item.total;
                    });
                    continue;
                }
                if (packageSaleMode === 'partial') {
                    const partialType = getPartialPackageTypeFromRow(row, AUTO_TOBACCO_PURE_TYPE);
                    const itemTotal = actualPrice * quantity;
                    const item = {
                        productId: productId,
                        productName: product.name,
                        quantity: quantity,
                        price: actualPrice,
                        standardPrice: product.salePrice,
                        total: itemTotal,
                        unit: unit,
                        packageSaleMode: 'partial',
                        tobaccoType: partialType,
                        tobaccoPackCount: 0
                    };
                    if (isKgUnit(unit)) item.kgItemCount = kgItemCount;
                    items.push(item);
                    total += itemTotal;
                    continue;
                }
                const packInputs = row.querySelectorAll('.tobacco-pack-count');
                const nonZeroPacks = Array.from(packInputs).filter(i => (parseFloat(i.value || '0') || 0) > 0);
                const packCounts = {};
                nonZeroPacks.forEach(input => {
                    packCounts[input.dataset.tobaccoType] = (Number(packCounts[input.dataset.tobaccoType]) || 0) + (parseFloat(input.value || '0') || 0);
                });
                const allocations = allocateSoldPiecesAcrossPackTypes(quantity, packCounts, 'tobacco');
                if (quantity > 0 && allocations.length > 0) {
                    allocations.forEach(part => {
                        const packs = Number(part.packCount) || 0;
                        const subQty = Number(part.pieces) || 0;
                        const itemTotal = actualPrice * subQty;
                        const item = {
                            productId: productId,
                            productName: product.name,
                            quantity: subQty,
                            price: actualPrice,
                            standardPrice: product.salePrice,
                            total: itemTotal,
	                        unit: unit,
                            packageSaleMode: 'whole',
	                        tobaccoType: part.type,
	                        tobaccoPackCount: packs
	                    };
                        if (isKgUnit(unit)) item.kgItemCount = kgItemCount;
	                    items.push(item);
                        total += itemTotal;
                    });
                } else if (quantity > 0) {
                    // Пакеты не указаны — считаем одной позицией
                    const itemTotal = actualPrice * quantity;
                    const item = {
                        productId: productId,
                        productName: product.name,
                        quantity: quantity,
                        price: actualPrice,
                        standardPrice: product.salePrice,
	                        total: itemTotal,
	                        unit: unit,
                            packageSaleMode: 'whole'
	                    };
                    if (isKgUnit(unit)) item.kgItemCount = kgItemCount;
	                    items.push(item);
                    total += itemTotal;
                }
            } else if (isRoast && (isKgUnit(unit) ? kgItemCount : quantity) > getAvailableInvoiceQuantityForProduct(product)) {
                const availableRoastQty = getAvailableInvoiceQuantityForProduct(product);
                alert(`Недостаточно остатка для товара "${product.name}". Доступно: ${formatQuantity(availableRoastQty, 'шт')} шт`);
                return;
            } else if (isRoast && packageSaleMode === 'mixed') {
                const mixedItems = buildMixedRoastInvoiceItems(row, product, productId, actualPrice, unit);
                if (!mixedItems) return;
                mixedItems.forEach(item => {
                    items.push(item);
                    total += item.total;
                });
            } else if (quantity > 0 && (isRoast || quantity <= product.quantity)) {
                const itemTotal = actualPrice * quantity;
                const item = {
                    productId: productId,
                    productName: product.name,
                    quantity: quantity,
                    price: actualPrice,
	                    standardPrice: product.salePrice,
	                    total: itemTotal,
	                    unit: unit
	                };
	                if (isKgUnit(unit)) item.kgItemCount = kgItemCount;
	                if (isRoast) {
                    item.packageSaleMode = packageSaleMode;
                    if (packageSaleMode === 'partial') {
                        item.roastType = getPartialPackageTypeFromRow(row, AUTO_ROAST_PURE_TYPE);
                    } else {
                        const roastPackValues = getRoastPackValuesFromRow(row);
                        const roastPackOrder = getRoastPackOrderFromRow(row);
                        const totalPacks = getTotalRoastPackCount(roastPackValues);
                        item.roast = {};
                        ROAST_TYPE_CONFIGS.forEach(config => {
                            item.roast[config.packField] = roastPackValues[config.type] || 0;
                            item.roast[config.kgField] = parseFloat(row.dataset[config.kgField] || '0');
                        });
                        item.roastTypeOrder = roastPackOrder;
                        const singleType = ROAST_TYPE_CONFIGS.find(config => roastPackValues[config.type] > 0 && roastPackValues[config.type] === totalPacks);
                        if (singleType) item.roastType = singleType.type;
                        else if (totalPacks > 0) item.roastType = 'mixed';
                    }
                } else if (isSimplePackaged) {
                    item.packageSaleMode = packageSaleMode;
                }
                items.push(item);
                total += itemTotal;
            } else {
                console.log(`❌ Товар не добавлен: product=${!!product}, quantity=${quantity}, maxQuantity=${product?.quantity}`);
            }
        }
    }
    
    console.log(`📊 Итого товаров в накладной: ${items.length}`);
    console.log(`💰 Общая сумма накладной: ${formatCurrency(total)}`);
    
    if (items.length === 0) {
        alert('Добавьте товары в накладную');
        return;
    }
    
    if (!paymentType) {
        alert('Выберите тип оплаты');
        return;
    }
    
    // Создаем накладную
    const currentShift = getCurrentShift();
    const invoice = {
        id: generateId(),
        date: new Date().toISOString(),
        client: client,
        paymentType: paymentType,
        notes: notes,
        items: items,
        total: total,
        shiftId: currentShift ? currentShift.id : null,
        sellerName: currentShift ? currentShift.sellerName : '',
        createdByRole: getCurrentRole()
    };
    
    invoices.push(invoice);
    rebuildPartialSaleOpenedStockEvents();
    saveData('invoices', invoices);
    logActivity('create_invoice', {
        invoiceId: invoice.id,
        total: invoice.total,
        paymentType: invoice.paymentType,
        client: getDisplayClientName(invoice.client),
        sellerName: invoice.sellerName || null,
        invoiceSnapshot: createInvoiceAuditSnapshot(invoice)
    });
    
    // Дополнительная проверка сохранения
    console.log('Накладная создана:', invoice.id);
    console.log('Всего накладных в системе:', invoices.length);
    
    // Обновляем количество товаров
    items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            adjustProductStockByInvoiceItem(product, item, -1);
            const pieceText = isKgUnit(item.unit) && Number(item.kgItemCount) > 0 ? ` / ${formatQuantity(item.kgItemCount, 'шт')} шт` : '';
            addMovement('Продажа', `Продано ${formatQuantity(item.quantity, item.unit)} ${item.unit}${pieceText} товара "${item.productName}" по накладной #${invoice.id}`, -item.quantity);
        }
    });
    saveData('products', products);
    
    // Если оплата в долг, создаем долг
    if (paymentType === 'debt' && client) {
        const debtClientName = getDebtClientName(client);
        if (debtClientName) {
            let existingDebt = ensureDebtRecordShape(debts.find(d => d.clientName === debtClientName));
            const originalIndex = invoices.findIndex(inv => inv.id === invoice.id);
            const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
            const alreadyAdded = existingDebt?.invoices?.find(inv => inv.id === invoice.id);

            if (alreadyAdded) {
                console.warn('⚠️ Накладная уже добавлена к долгу клиента:', debtClientName);
            } else if (existingDebt) {
                const oldAmount = existingDebt.amount;
                existingDebt.amount += total;
                existingDebt.invoices.push({
                    id: invoice.id,
                    number: invoiceNumber,
                    amount: total,
                    date: invoice.date,
                    items: invoice.items
                });
                existingDebt.history.push({
                    type: 'add',
                    amount: total,
                    date: new Date().toISOString(),
                    invoiceId: invoice.id,
                    invoiceNumber: invoiceNumber,
                    description: `➕ Добавлен долг по накладной №${invoiceNumber} на сумму <strong>${formatCurrency(total)}</strong><br><strong>Было:</strong> ${formatCurrency(oldAmount)} → <strong>Стало:</strong> ${formatCurrency(existingDebt.amount)}<br><button class="btn btn-info btn-xs" onclick="showInvoiceDetails('${invoice.id}')" style="margin-top: 5px;"><i class="fas fa-receipt"></i> Показать накладную</button>`
                });
                saveData('debts', debts);
            } else {
                const debt = {
                    id: generateId(),
                    clientName: debtClientName,
                    amount: total,
                    description: `Долг по накладной №${invoiceNumber}`,
                    createdAt: new Date().toISOString(),
                    invoices: [{
                        id: invoice.id,
                        number: invoiceNumber,
                        amount: total,
                        date: invoice.date,
                        items: invoice.items
                    }],
                    history: [{
                        type: 'create',
                        amount: total,
                        date: new Date().toISOString(),
                        invoiceId: invoice.id,
                        invoiceNumber: invoiceNumber,
                        description: `🆕 Создан долг по накладной №${invoiceNumber} на сумму <strong>${formatCurrency(total)}</strong><br><strong>Было:</strong> 0,00 ₽ → <strong>Стало:</strong> ${formatCurrency(total)}<br><button class="btn btn-info btn-xs" onclick="showInvoiceDetails('${invoice.id}')" style="margin-top: 5px;"><i class="fas fa-receipt"></i> Показать накладную</button>`
                    }]
                };
                debts.push(debt);
                saveData('debts', debts);
            }
        }
    }
    
    // Создаем отчет о продаже
    createSalesReport(invoice);
    
    closeModal('createInvoiceModal');
    // Показываем баннер с кнопкой расчета сдачи для наличных
    if (paymentType === 'cash') {
        showPostInvoiceActions(invoice.id, total);
    }
    document.getElementById('createInvoiceForm').reset();
    loadInvoices();
    loadDebts();
    refreshIncomingIfVisible();
    updateStats();
    loadDashboardData();
}

// Показать краткий баннер после создания накладной с кнопкой расчета сдачи
function showPostInvoiceActions(invoiceId, totalAmount) {
    // Удаляем предыдущий баннер, если есть
    const old = document.getElementById('post-invoice-banner');
    if (old) old.remove();

    // Проверяем, есть ли информация о сдаче
    const invoice = invoices.find(inv => inv.id === invoiceId);
    const hasChangeInfo = invoice && invoice.changeInfo;
    
    const banner = document.createElement('div');
    banner.id = 'post-invoice-banner';
    banner.className = 'post-invoice-banner';
    
    if (hasChangeInfo) {
        // Показываем информацию о сдаче
        banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-info">
                    <i class="fas fa-check-circle"></i>
                    <span>Наличные сохранены. Получено: <strong>${formatCurrency(invoice.changeInfo.receivedAmount)}</strong> | Сдача: <strong>${formatCurrency(invoice.changeInfo.changeAmount)}</strong></span>
                </div>
                <div class="banner-actions">
                    <button class="btn btn-secondary btn-sm" onclick="this.closest('#post-invoice-banner').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    } else {
        // Показываем стандартный баннер для новой накладной
        banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-info">
                    <i class="fas fa-check-circle"></i>
                    <span>Накладная создана. Итог: <strong>${formatCurrency(totalAmount)}</strong></span>
                </div>
                <div class="banner-actions">
                    <button class="btn btn-success btn-sm" onclick="showChangeCalculator('${invoiceId}')">
                        <i class="fas fa-money-bill-wave"></i> Указать наличные
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="this.closest('#post-invoice-banner').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Вставляем баннер в верхнюю часть основной области
    const main = document.querySelector('.main-content');
    if (main) {
        main.prepend(banner);
        // Автоскрытие через 8 секунд, если пользователь не взаимодействует
        setTimeout(() => {
            if (banner && banner.parentNode) banner.remove();
        }, 8000);
    }
}

// Удалить накладную (улучшенная версия)
function archiveInvoice(invoiceId) {
    const invoiceIndex = invoices.findIndex(item => item.id === invoiceId);
    if (invoiceIndex === -1) {
        alert('Накладная не найдена');
        return;
    }

    const invoice = invoices[invoiceIndex];
    if (!confirm('Убрать эту накладную из рабочего списка и отправить в архив? Складские остатки и продажи останутся как есть.')) {
        return;
    }

    const archivedSnapshot = moveInvoiceToArchive(invoiceId, 'Перенесена в архив');
    if (!archivedSnapshot) return;

    saveInvoiceArchiveState();
    logActivity('archive_invoice', {
        invoiceId: invoice.id,
        total: invoice.total,
        paymentType: invoice.paymentType,
        invoiceSnapshot: createInvoiceAuditSnapshot(archivedSnapshot, archivedSnapshot.invoiceNumberAtArchive)
    });

    loadInvoices();
    loadDashboardData();
    updateStats();
}

function deleteInvoice(invoiceId) {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) {
        alert('Накладная не найдена');
        return;
    }

    const permission = requestInvoiceMutationPermission(invoice, 'delete');
    if (!permission.allowed) {
        return;
    }

    if (confirm('Удалить накладную?')) {
        if (invoice) {
            // Возвращаем товары на склад
            invoice.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    adjustProductStockByInvoiceItem(product, item, 1);
                    const pieceText = isKgUnit(item.unit) && Number(item.kgItemCount) > 0 ? ` / ${formatQuantity(item.kgItemCount, 'шт')} шт` : '';
                    addMovement('Возврат', `Возвращено ${formatQuantity(item.quantity, item.unit)} ${item.unit}${pieceText} товара "${item.productName}" (удаление накладной #${invoiceId})`, item.quantity);
                }
            });
            saveData('products', products);

            // === ДОРАБОТКА: если накладная была в долг ===
            if (invoice.paymentType === 'debt' && invoice.client) {
                const debtClientName = getDebtClientName(invoice.client);
                if (debtClientName) {
                    // Находим долг клиента
                    let existingDebt = ensureDebtRecordShape(debts.find(d => d.clientName === debtClientName));
                    if (existingDebt) {
                        const oldAmount = existingDebt.amount;
                        existingDebt.amount -= invoice.total;
                        // Формируем номер накладной для истории
                        const originalIndex = invoices.findIndex(inv => inv.id === invoice.id);
                        const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
                        // Удаляем накладную из списка связанных накладных долга
                        if (existingDebt.invoices) {
                            existingDebt.invoices = existingDebt.invoices.filter(inv => inv.id !== invoiceId);
                        }
                        
                        // Добавляем запись в историю
                        console.log(`Добавляем запись об удалении накладной для клиента: ${debtClientName}`);
                        existingDebt.history.push({
                            type: 'subtract',
                            amount: invoice.total,
                            date: new Date().toISOString(),
                            invoiceId: invoice.id,
                            invoiceNumber: invoiceNumber,
                            description: `🗑️ Удалена накладная №${invoiceNumber} на сумму <strong>${formatCurrency(invoice.total)}</strong><br><strong>Было:</strong> ${formatCurrency(oldAmount)} → <strong>Стало:</strong> ${formatCurrency(existingDebt.amount)}<br><button class="btn btn-warning btn-xs" onclick="showInvoiceDetails('${invoice.id}')" style="margin-top: 5px;"><i class="fas fa-receipt"></i> Показать накладную</button>`
                        });
                        console.log('История долга после добавления:', existingDebt.history);
                        // Если долг стал 0 или меньше — удаляем долг и добавляем запись о погашении
                        if (existingDebt.amount <= 0) {
                            existingDebt.history.push({
                                type: 'payoff',
                                amount: 0,
                                date: new Date().toISOString(),
                                description: `✅ Долг полностью погашен после удаления накладной №${invoiceNumber}`
                            });
                            debts = debts.filter(d => d.id !== existingDebt.id);
                        }
                        console.log('Сохраняем долги после удаления накладной:', debts);
                        saveData('debts', debts);
                    }
                }
            }
            // === КОНЕЦ ДОРАБОТКИ ===

            // Полностью удаляем накладную из массива
            invoices = invoices.filter(i => i.id !== invoiceId);
            archivedInvoices = archivedInvoices.filter(item => item.id !== invoiceId);
            rebuildPartialSaleOpenedStockEvents();

            // Удаляем отчет о данной накладной
            reports = reports.filter(report => report.invoiceId !== invoiceId);
            saveData('reports', reports);
            saveData('personalPrices', personalPrices);
        }

        saveData('invoices', invoices);
        saveData('archivedInvoices', archivedInvoices);

        logActivity('delete_invoice', {
            invoiceId: invoiceId,
            total: invoice.total,
            paymentType: invoice.paymentType,
            reason: permission.reason || 'Без причины',
            sellerName: invoice.sellerName || null,
            invoiceSnapshot: createInvoiceAuditSnapshot(invoice)
        });

        loadInvoices();
        refreshIncomingIfVisible();
        updateStats();
        loadDashboardData();
        loadDebts(); // Обновляем отображение долгов
    }
}

function restoreArchivedInvoice(invoiceId) {
    const archiveIndex = archivedInvoices.findIndex(item => item.id === invoiceId);
    if (archiveIndex === -1) {
        alert('Накладная не найдена в архиве');
        return;
    }

    const archivedInvoice = archivedInvoices[archiveIndex];
    archivedInvoices.splice(archiveIndex, 1);

    const invoiceIndex = invoices.findIndex(item => item.id === invoiceId);
    if (invoiceIndex !== -1) {
        const restoredInvoice = { ...invoices[invoiceIndex] };
        delete restoredInvoice.isArchived;
        delete restoredInvoice.archivedAt;
        delete restoredInvoice.archivedBy;
        delete restoredInvoice.archiveReason;
        delete restoredInvoice.invoiceNumberAtArchive;
        invoices[invoiceIndex] = restoredInvoice;
    } else {
        const restoredInvoice = { ...archivedInvoice };
        delete restoredInvoice.isArchived;
        delete restoredInvoice.archivedAt;
        delete restoredInvoice.archivedBy;
        delete restoredInvoice.archiveReason;
        delete restoredInvoice.invoiceNumberAtArchive;
        invoices.push(restoredInvoice);
    }

    saveData('invoices', invoices);
    saveData('archivedInvoices', archivedInvoices);
    logActivity('restore_invoice', {
        invoiceId: archivedInvoice.id,
        total: archivedInvoice.total,
        paymentType: archivedInvoice.paymentType,
        invoiceSnapshot: createInvoiceAuditSnapshot(archivedInvoice, archivedInvoice.invoiceNumberAtArchive)
    });

    showArchivedInvoices();
    loadInvoices();
    loadDashboardData();
    updateStats();
}

function showArchivedInvoices() {
    const modalId = 'archivedInvoicesModal';
    document.getElementById(modalId)?.remove();

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal open';
    modal.innerHTML = `
        <div class="modal-content modal-large" style="max-height: 92vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h3>Архив накладных</h3>
                <span class="close" onclick="removeModal(this)">&times;</span>
            </div>
            <div class="modal-body" style="overflow-y: auto;">
                ${archivedInvoices.length ? archivedInvoices
                    .sort((left, right) => String(right.archivedAt || '').localeCompare(String(left.archivedAt || '')))
                    .map(invoice => `
                        <div class="incoming-history-card archived-invoice-card">
                            <div class="incoming-history-head">
                                <div>
                                    <strong>Накладная #${invoice.invoiceNumberAtArchive || '?'}</strong>
                                    <small>${formatDateShort(invoice.date)} • ${escapeHtml(getDisplayClientName(invoice.client))}</small>
                                </div>
                                <span class="incoming-status ${invoice.paymentType === 'debt' ? 'warning' : 'success'}">
                                    ${invoice.paymentType === 'debt' ? 'В долг' : 'Наличными'}
                                </span>
                            </div>
                            <div class="incoming-history-grid">
                                <div><span>Сумма</span><strong>${formatCurrency(invoice.total)}</strong></div>
                                <div><span>Товаров</span><strong>${invoice.items.length}</strong></div>
                                <div><span>Архивирована</span><strong>${formatShortDateTime(invoice.archivedAt)}</strong></div>
                                <div><span>Кто архивировал</span><strong>${escapeHtml(invoice.archivedBy || 'Не указано')}</strong></div>
                            </div>
                            <div class="invoice-archive-items-list">
                                ${invoice.items.map(item => `
                                    <div class="invoice-archive-item">
                                        <strong>${escapeHtml(item.productName)}</strong>
                                        <span>${formatQuantity(item.quantity, item.unit)} ${item.unit}</span>
                                        <span>${formatCurrency(item.total)}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="incoming-history-actions">
                                <button class="btn btn-secondary btn-sm" onclick="previewArchivedInvoice('${invoice.id}')">
                                    <i class="fas fa-eye"></i> Посмотреть
                                </button>
                                <button class="btn btn-success btn-sm" onclick="restoreArchivedInvoice('${invoice.id}')">
                                    <i class="fas fa-undo"></i> Вернуть из архива
                                </button>
                            </div>
                        </div>
                    `).join('')
                    : '<p class="text-center">Архив накладных пока пуст</p>'}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="removeModal(this)">Закрыть</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Очистить все накладные (улучшенная версия)
function clearAllInvoices() {
    const activeInvoices = invoices.filter(invoice => !invoice.isArchived);

    if (!activeInvoices.length) {
        alert('В рабочем списке нет накладных');
        return;
    }

    if (!confirm(`Очистить рабочий список и перенести ${activeInvoices.length} накладную(ых) в архив? Склад, отчеты и долги останутся без изменений.`)) {
        return;
    }

    const archivedAt = new Date().toISOString();
    activeInvoices.forEach(invoice => {
        moveInvoiceToArchive(invoice.id, 'Очистка рабочего списка накладных', {
            archivedAt
        });
    });

    saveInvoiceArchiveState();
    logActivity('archive_invoice', {
        invoiceId: null,
        totalInvoices: activeInvoices.length,
        total: activeInvoices.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0),
        archiveReason: 'Очистка рабочего списка накладных'
    });

    loadInvoices();
    refreshIncomingIfVisible();
    updateStats();
    loadDashboardData();
    loadDebts();
}

function getPrintableInvoiceItems(items = []) {
    const grouped = new Map();

    items.forEach(item => {
        const unit = item.unit || 'шт';
        const price = Number(item.price) || 0;
        const key = [
            item.productId || item.productName || '',
            unit,
            price
        ].join('|');

        if (!grouped.has(key)) {
            grouped.set(key, {
                productId: item.productId,
                productName: item.productName,
                unit,
                price,
                quantity: 0,
                total: 0
            });
        }

        const group = grouped.get(key);
        group.quantity += Number(item.quantity) || 0;
        group.total += Number(item.total) || 0;
    });

    return Array.from(grouped.values());
}

// Печать накладной
function printInvoice(invoiceId) {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    const client = clients.find(c => c.id === invoice.client);
    
    // Находим правильный номер накладной
    const originalIndex = invoices.findIndex(inv => inv.id === invoiceId);
    const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
    
    const groupedItems = getPrintableInvoiceItems(invoice.items || []);

    // Создаем максимально простой HTML для печати
    const printContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Накладная #${invoiceNumber}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: 14px;
            margin: 20px; 
            line-height: 1.4;
            color: #000;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #333;
        }
        .info { 
            margin-bottom: 20px; 
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
        }
        .info p {
            margin: 5px 0;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px; 
            border: 1px solid #ddd;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 10px; 
            text-align: left; 
        }
        th { 
            background-color: #f2f2f2; 
            font-weight: bold;
        }
        .total { 
            text-align: right; 
            font-weight: bold; 
            font-size: 18px; 
            margin-top: 20px;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 5px;
        }
        @media print {
            body { margin: 10px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Накладная #${invoiceNumber}</h1>
        <p>Дата: ${formatDate(invoice.date)}</p>
    </div>
    
    <div class="info">
        <p><strong>Клиент:</strong> ${getDisplayClientName(invoice.client)}</p>
        <p><strong>Оплата:</strong> ${invoice.paymentType === 'cash' ? 'Наличными' : 'В долг'}</p>
        ${invoice.notes ? `<p><strong>Примечания:</strong> ${invoice.notes}</p>` : ''}
    </div>
    
    <table>
        <thead>
            <tr>
                <th>№</th>
                <th>Товар</th>
                <th>Количество</th>
                <th>Цена</th>
                <th>Сумма</th>
            </tr>
        </thead>
        <tbody>
            ${groupedItems.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.productName}</td>
                    <td>${formatQuantity(item.quantity, item.unit)} ${item.unit}</td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>${formatCurrency(item.total)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total">
        <p>Итого: ${formatCurrency(invoice.total)}</p>
    </div>
    
    <script>
        // Принудительная печать через 500мс
        setTimeout(function() {
            window.print();
        }, 500);
    </script>
</body>
</html>`;
    
    // Открываем новое окно
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Записываем контент
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// ==================== ДОЛГИ ====================

const CERTIFICATE_DEBT_SETTINGS_KEY = 'certificateDebtSettings';
const CERTIFICATE_DEBT_WEEKDAYS = [
    { key: 'monday', label: 'Пн', name: 'Понедельник' },
    { key: 'tuesday', label: 'Вт', name: 'Вторник' },
    { key: 'wednesday', label: 'Ср', name: 'Среда' },
    { key: 'thursday', label: 'Чт', name: 'Четверг' },
    { key: 'friday', label: 'Пт', name: 'Пятница' },
    { key: 'saturday', label: 'Сб', name: 'Суббота' },
    { key: 'sunday', label: 'Вс', name: 'Воскресенье' }
];

function normalizeCertificateDebtClientIds(ids = []) {
    return Array.isArray(ids)
        ? [...new Set(ids.map(id => String(id)).filter(Boolean))]
        : [];
}

function getTodayCertificateDebtWeekdayKey() {
    const dayIndex = new Date().getDay();
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex] || 'monday';
}

function normalizeCertificateDebtWeekdayKey(key) {
    return CERTIFICATE_DEBT_WEEKDAYS.some(day => day.key === key) ? key : getTodayCertificateDebtWeekdayKey();
}

function getCertificateDebtWeekdayName(key) {
    return CERTIFICATE_DEBT_WEEKDAYS.find(day => day.key === key)?.name || 'День';
}

function normalizeCertificateDebtWeekdayClientIds(weekdayClientIds = {}) {
    return CERTIFICATE_DEBT_WEEKDAYS.reduce((result, day) => {
        result[day.key] = normalizeCertificateDebtClientIds(weekdayClientIds?.[day.key]);
        return result;
    }, {});
}

function getCertificateDebtSettings() {
    const saved = readStorageJson(CERTIFICATE_DEBT_SETTINGS_KEY, {}) || {};
    const selectedWeekday = normalizeCertificateDebtWeekdayKey(saved.selectedWeekday || getTodayCertificateDebtWeekdayKey());
    return {
        amount: Math.max(0, Number(saved.amount) || 300),
        selectedClientIds: normalizeCertificateDebtClientIds(saved.selectedClientIds),
        selectedWeekday,
        weekdayClientIds: normalizeCertificateDebtWeekdayClientIds(saved.weekdayClientIds || {})
    };
}

function saveCertificateDebtSettings(settings = {}) {
    const current = getCertificateDebtSettings();
    const selectedWeekday = normalizeCertificateDebtWeekdayKey(settings.selectedWeekday || current.selectedWeekday);
    const weekdayClientIds = normalizeCertificateDebtWeekdayClientIds({
        ...current.weekdayClientIds,
        ...(settings.weekdayClientIds || {})
    });
    const selectedClientIds = normalizeCertificateDebtClientIds(settings.selectedClientIds);
    weekdayClientIds[selectedWeekday] = selectedClientIds;

    const normalized = {
        amount: Math.max(0, Number(settings.amount ?? current.amount) || 0),
        selectedClientIds,
        selectedWeekday,
        weekdayClientIds
    };

    saveData(CERTIFICATE_DEBT_SETTINGS_KEY, normalized);
    return normalized;
}

function getCertificateDebtClientSummary(client) {
    const debt = getClientActiveDebt(client);
    return debt && (Number(debt.amount) || 0) > 0
        ? `Текущий долг: ${formatCurrency(debt.amount)}`
        : 'Долга нет';
}

function normalizeCertificateDebtSearch(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();
}

function renderCertificateDebtModalHtml() {
    const settings = getCertificateDebtSettings();
    const activeWeekday = settings.selectedWeekday;
    const activeWeekdayClientIds = settings.weekdayClientIds[activeWeekday] || [];
    const selectedIds = new Set(activeWeekdayClientIds.length ? activeWeekdayClientIds : settings.selectedClientIds);
    const sortedClients = [...clients].sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'ru'));

    return `
        <div id="certificateDebtModal" class="modal open">
            <div class="modal-content modal-large certificate-debt-modal">
                <div class="modal-header">
                    <h3>Выписать справки</h3>
                    <span class="close" onclick="closeModal('certificateDebtModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="certificateDebtSelectedWeekday" value="${activeWeekday}">
                    <div class="certificate-debt-top">
                        <div class="form-group">
                            <label for="certificateDebtAmount">Стоимость одной справки (₽)</label>
                            <input type="number" id="certificateDebtAmount" class="form-control" min="0" step="0.01" value="${settings.amount || 300}">
                        </div>
                        <div class="certificate-debt-actions-row">
                            <button class="btn btn-secondary btn-sm" onclick="selectAllCertificateDebtClients(true)">
                                <i class="fas fa-check-double"></i> Выбрать всех
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="selectAllCertificateDebtClients(false)">
                                <i class="fas fa-xmark"></i> Снять всех
                            </button>
                        </div>
                    </div>
                    <div class="certificate-debt-hint">
                        Выберите день недели, отметьте клиентов и сохраните выбор. Потом при нажатии на этот день клиенты отметятся автоматически.
                    </div>
                    <div class="certificate-weekday-panel">
                        <div class="certificate-weekday-title">
                            <strong>День недели</strong>
                            <span id="certificateDebtWeekdaySummary">${getCertificateDebtWeekdayName(activeWeekday)}: выбрано ${selectedIds.size}</span>
                        </div>
                        <div class="certificate-weekday-buttons">
                            ${CERTIFICATE_DEBT_WEEKDAYS.map(day => {
                                const count = (settings.weekdayClientIds[day.key] || []).length;
                                return `
                                    <button type="button" class="certificate-weekday-btn ${day.key === activeWeekday ? 'active' : ''}" data-weekday="${day.key}" onclick="selectCertificateDebtWeekday('${day.key}')">
                                        <strong>${day.label}</strong>
                                        <span>${count} кл.</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="certificate-debt-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="certificateDebtClientSearch" class="form-control" placeholder="Поиск клиента..." oninput="filterCertificateDebtClients()">
                    </div>
                    <div class="certificate-client-list">
                        ${sortedClients.length ? sortedClients.map(client => `
                            <label class="certificate-client-row" data-client-search="${escapeHtml(normalizeCertificateDebtSearch(`${client.name || ''} ${client.phone || ''} ${client.email || ''}`))}">
                                <div>
                                    <strong>${escapeHtml(client.name || 'Без имени')}</strong>
                                    <span>${escapeHtml(getCertificateDebtClientSummary(client))}</span>
                                </div>
                                <input type="checkbox" class="certificate-client-checkbox" value="${escapeHtml(client.id)}" onchange="refreshCertificateDebtWeekdaySummary()" ${selectedIds.has(String(client.id)) ? 'checked' : ''}>
                            </label>
                        `).join('') : '<p class="text-center">Клиентов пока нет</p>'}
                    </div>
                    <p id="certificateDebtNoClientsFound" class="text-center certificate-debt-empty-search" style="display: none;">Клиенты не найдены</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('certificateDebtModal')">Закрыть</button>
                    <button class="btn btn-warning" onclick="saveCertificateDebtModalSettings(true)">Сохранить для дня</button>
                    <button class="btn btn-success" onclick="issueCertificateDebtsFromModal()">
                        <i class="fas fa-file-medical"></i> Выписать справки
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showCertificateDebtModal() {
    document.getElementById('certificateDebtModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', renderCertificateDebtModalHtml());
    openModal('certificateDebtModal');
}

function selectAllCertificateDebtClients(checked) {
    document.querySelectorAll('#certificateDebtModal .certificate-client-checkbox').forEach(input => {
        input.checked = Boolean(checked);
    });
    refreshCertificateDebtWeekdaySummary();
}

function filterCertificateDebtClients() {
    const query = normalizeCertificateDebtSearch(document.getElementById('certificateDebtClientSearch')?.value || '');
    const rows = Array.from(document.querySelectorAll('#certificateDebtModal .certificate-client-row'));
    let visibleCount = 0;

    rows.forEach(row => {
        const matches = !query || normalizeCertificateDebtSearch(row.dataset.clientSearch || row.textContent).includes(query);
        row.style.display = matches ? '' : 'none';
        if (matches) visibleCount += 1;
    });

    const emptyMessage = document.getElementById('certificateDebtNoClientsFound');
    if (emptyMessage) {
        emptyMessage.style.display = rows.length && visibleCount === 0 ? 'block' : 'none';
    }
}

function getCertificateDebtCheckedClientIds() {
    return Array.from(document.querySelectorAll('#certificateDebtModal .certificate-client-checkbox:checked'))
        .map(input => String(input.value || ''))
        .filter(Boolean);
}

function refreshCertificateDebtWeekdaySummary(settings = null) {
    const activeWeekday = normalizeCertificateDebtWeekdayKey(document.getElementById('certificateDebtSelectedWeekday')?.value);
    const checkedCount = getCertificateDebtCheckedClientIds().length;
    const summary = document.getElementById('certificateDebtWeekdaySummary');
    if (summary) {
        summary.textContent = `${getCertificateDebtWeekdayName(activeWeekday)}: выбрано ${checkedCount}`;
    }

    const savedSettings = settings || getCertificateDebtSettings();
    document.querySelectorAll('#certificateDebtModal .certificate-weekday-btn').forEach(button => {
        const key = button.dataset.weekday;
        button.classList.toggle('active', key === activeWeekday);
        const countEl = button.querySelector('span');
        if (countEl) {
            countEl.textContent = `${(savedSettings.weekdayClientIds?.[key] || []).length} кл.`;
        }
    });
}

function selectCertificateDebtWeekday(weekdayKey) {
    const settings = getCertificateDebtSettings();
    const activeWeekday = normalizeCertificateDebtWeekdayKey(weekdayKey);
    const selectedIds = new Set(settings.weekdayClientIds[activeWeekday] || []);
    const hiddenInput = document.getElementById('certificateDebtSelectedWeekday');

    if (hiddenInput) {
        hiddenInput.value = activeWeekday;
    }

    document.querySelectorAll('#certificateDebtModal .certificate-client-checkbox').forEach(input => {
        input.checked = selectedIds.has(String(input.value || ''));
    });

    const searchInput = document.getElementById('certificateDebtClientSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    filterCertificateDebtClients();
    refreshCertificateDebtWeekdaySummary(settings);
}

function collectCertificateDebtModalSettings() {
    const amount = Math.max(0, Number(document.getElementById('certificateDebtAmount')?.value) || 0);
    const selectedClientIds = getCertificateDebtCheckedClientIds();
    const selectedWeekday = normalizeCertificateDebtWeekdayKey(document.getElementById('certificateDebtSelectedWeekday')?.value);
    const currentSettings = getCertificateDebtSettings();
    const weekdayClientIds = {
        ...currentSettings.weekdayClientIds,
        [selectedWeekday]: selectedClientIds
    };

    return { amount, selectedClientIds, selectedWeekday, weekdayClientIds };
}

function saveCertificateDebtModalSettings(showAlert = false) {
    const settings = collectCertificateDebtModalSettings();
    if (settings.amount <= 0) {
        alert('Введите стоимость справки больше нуля');
        return null;
    }

    const saved = saveCertificateDebtSettings(settings);
    refreshCertificateDebtWeekdaySummary(saved);
    if (showAlert) {
        alert(`${getCertificateDebtWeekdayName(saved.selectedWeekday)}: сохранено клиентов ${saved.selectedClientIds.length}. Стоимость справки: ${formatCurrency(saved.amount)}`);
    }
    return saved;
}

function addCertificateDebtForClient(client, amount) {
    const clientName = client.name || 'Клиент';
    const existingDebt = ensureDebtRecordShape(debts.find(debt => String(debt.clientName || '').trim() === String(clientName).trim()));
    const now = new Date().toISOString();

    if (existingDebt) {
        const beforeAmount = Number(existingDebt.amount) || 0;
        const beforeSnapshot = createDebtAuditSnapshot(existingDebt);
        existingDebt.amount = roundCurrencyAmount(beforeAmount + amount);
        existingDebt.history.push({
            type: 'add',
            amount,
            date: now,
            source: 'certificate',
            description: `➕ Добавлено за справку <strong>${formatCurrency(amount)}</strong><br><strong>Было:</strong> ${formatCurrency(beforeAmount)} → <strong>Стало:</strong> ${formatCurrency(existingDebt.amount)}<br><em>Комментарий:</em> за справку`
        });
        return {
            debt: existingDebt,
            created: false,
            beforeAmount,
            afterAmount: existingDebt.amount,
            beforeSnapshot,
            afterSnapshot: createDebtAuditSnapshot(existingDebt)
        };
    }

    const debt = {
        id: generateId(),
        clientName,
        amount,
        paidAmount: 0,
        description: 'За справку',
        createdAt: now,
        invoices: [],
        history: [{
            type: 'create',
            amount,
            date: now,
            source: 'certificate',
            description: `🆕 Создан долг за справку на сумму <strong>${formatCurrency(amount)}</strong><br><strong>Было:</strong> 0,00 ₽ → <strong>Стало:</strong> ${formatCurrency(amount)}`
        }]
    };
    debts.push(debt);

    return {
        debt,
        created: true,
        beforeAmount: 0,
        afterAmount: amount,
        beforeSnapshot: null,
        afterSnapshot: createDebtAuditSnapshot(debt)
    };
}

function issueCertificateDebtsFromModal() {
    const settings = saveCertificateDebtModalSettings(false);
    if (!settings) return;

    if (!settings.selectedClientIds.length) {
        alert('Выберите хотя бы одного клиента');
        return;
    }

    const selectedClients = settings.selectedClientIds
        .map(clientId => clients.find(client => String(client.id) === String(clientId)))
        .filter(Boolean);

    if (!selectedClients.length) {
        alert('Выбранные клиенты не найдены');
        return;
    }

    const totalAmount = settings.amount * selectedClients.length;
    if (!confirm(`Выписать справки ${selectedClients.length} клиентам на сумму ${formatCurrency(settings.amount)} каждому? Общая сумма долгов: ${formatCurrency(totalAmount)}.`)) {
        return;
    }

    const results = selectedClients.map(client => addCertificateDebtForClient(client, settings.amount));
    saveData('debts', debts);
    logActivity('certificate_debt', {
        amount: settings.amount,
        totalAmount,
        clientCount: selectedClients.length,
        clients: selectedClients.map(client => ({ id: client.id, name: client.name })),
        debtIds: results.map(result => result.debt.id)
    });

    closeModal('certificateDebtModal');
    loadDebts();
    loadClients();
    updateStats();
    alert(`Справки выписаны. Добавлено долгов: ${selectedClients.length} × ${formatCurrency(settings.amount)}.`);
}

// Загрузка долгов
function loadDebts() {
    const container = document.getElementById('debts-list');
    const simpleSellerMode = isSellerSimpleMode();
    syncDebtsFromInvoices();
    
    if (debts.length === 0) {
        container.innerHTML = '<p class="text-center">Нет долгов</p>';
        return;
    }

    container.innerHTML = debts.map(rawDebt => {
        const debt = ensureDebtRecordShape(rawDebt);
        const invoiceCount = debt.invoices ? debt.invoices.length : 0;
        const lastEntry = getLastDebtHistoryEntry(debt);

        if (simpleSellerMode) {
            return `
                <div class="card seller-simple-debt-card">
                    <div class="seller-simple-debt-head">
                        <div>
                            <div class="seller-simple-debt-client">${escapeHtml(debt.clientName)}</div>
                            <div class="seller-simple-debt-date">Создан: ${formatDateShort(debt.createdAt)}</div>
                        </div>
                        <div class="seller-simple-debt-amount">${formatCurrency(debt.amount)}</div>
                    </div>
                    <div class="seller-simple-debt-meta">
                        <div class="seller-simple-debt-meta-item">
                            <span>Накладных</span>
                            <strong>${invoiceCount}</strong>
                        </div>
                        <div class="seller-simple-debt-meta-item">
                            <span>Последнее изменение</span>
                            <strong>${lastEntry ? getDebtHistoryTypeLabel(lastEntry.type) : 'Пока нет'}</strong>
                        </div>
                    </div>
                    <div class="seller-simple-debt-last-note">
                        <span class="seller-simple-caption">Что менялось по долгу</span>
                        <div>${lastEntry ? formatHistoryTextForSimpleView(lastEntry.description) : 'История пока пустая'}</div>
                    </div>
                    <div class="seller-simple-actions seller-simple-debt-actions">
                        <button class="btn btn-secondary btn-sm" onclick="manageDebt('${debt.id}')">
                            ${getActionButtonContent('fas fa-edit', 'Открыть долг', true)}
                        </button>
                        ${invoiceCount > 0 ? `
                        <button class="btn btn-info btn-sm" onclick="showDebtInvoices('${debt.id}')">
                            ${getActionButtonContent('fas fa-receipt', 'Накладные', true)}
                        </button>
                        ` : ''}
                        <button class="btn btn-success btn-sm" onclick="payOffDebtFromList('${debt.id}')">
                            ${getActionButtonContent('fas fa-money-bill-wave', 'Оплата', true)}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteDebt('${debt.id}')">
                            ${getActionButtonContent('fas fa-trash', 'Удалить', true)}
                        </button>
                    </div>
                </div>
            `;
        }

        return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">${debt.clientName}</div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="manageDebt('${debt.id}')">
                        ${getActionButtonContent('fas fa-edit', 'Изменить', simpleSellerMode)}
                    </button>
                    <button class="btn btn-success btn-sm" onclick="payOffDebtFromList('${debt.id}')">
                        ${getActionButtonContent('fas fa-money-bill-wave', 'Оплата', simpleSellerMode)}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteDebt('${debt.id}')">
                        ${getActionButtonContent('fas fa-trash', 'Удалить', simpleSellerMode)}
                    </button>
                </div>
            </div>
            <div class="card-content">
                <div class="card-info">
                    <span>Сумма долга:</span>
                    <span>${formatCurrency(debt.amount)}</span>
                </div>
                <div class="card-info">
                    <span>Накладные:</span>
                    <span>${invoiceCount} шт. <button class="btn btn-info btn-xs" onclick="showDebtInvoices('${debt.id}')" title="Показать накладные">
                        <i class="fas fa-receipt"></i> Показать
                    </button></span>
                </div>
                <div class="card-info">
                    <span>Дата создания:</span>
                    <span>${formatDateShort(debt.createdAt)}</span>
                </div>
                <div class="card-info">
                    <span>Комментарий:</span>
                    <span>${getLastComment(debt) || 'Нет комментария'}</span>
                </div>
            </div>
        </div>
    `}).join('');
}

// Показать модальное окно добавления долга
function showAddDebtModal() {
    openModal('addDebtModal');
    document.getElementById('debtClientName').focus();
}

// Добавить долг
function addDebt() {
    const clientName = document.getElementById('debtClientName').value.trim();
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const description = document.getElementById('debtDescription').value.trim();
    
    if (!clientName || !amount) {
        alert('Заполните обязательные поля');
        return;
    }

    const debt = {
        id: generateId(),
        clientName: clientName,
        amount: amount,
        description: description,
        createdAt: new Date().toISOString(),
        invoices: [], // Пустой массив для ручно созданных долгов
        history: [{
            type: 'create',
            amount: amount,
            date: new Date().toISOString(),
            description: `🆕 Создан долг на сумму <strong>${formatCurrency(amount)}</strong><br><strong>Было:</strong> 0,00 ₽ → <strong>Стало:</strong> ${formatCurrency(amount)}${description ? `<br><em>💬 Описание:</em> ${description}` : ''}`
        }]
    };

    debts.push(debt);
    saveData('debts', debts);
    logActivity('debt_create', {
        debtId: debt.id,
        clientName: debt.clientName,
        amount: debt.amount,
        debtSnapshot: createDebtAuditSnapshot(debt)
    });
    
    closeModal('addDebtModal');
    document.getElementById('addDebtForm').reset();
    loadDebts();
    updateStats();
}

function renderDebtPaymentsSection(debt) {
    const payments = getDebtPaymentsForDebt(debt.id);
    if (!payments.length) return '';

    return `
        <div class="debt-payments-section">
            <h4 class="debt-history-title">Оплаты по долгу</h4>
            <div class="debt-payments-list">
                ${payments.map(payment => {
                    const cancelled = isDebtPaymentCancelled(payment);
                    const methodLabel = getDebtPaymentMethodLabel(payment.paymentMethod);
                    const cancelInfo = cancelled
                        ? `<div class="debt-payment-cancel-note">Отменена ${formatShortDateTime(payment.cancelledAt || payment.date)}${payment.cancelReason ? `: ${escapeHtml(payment.cancelReason)}` : ''}</div>`
                        : '';

                    return `
                        <div class="debt-payment-row ${cancelled ? 'is-cancelled' : ''}">
                            <div class="debt-payment-main">
                                <strong>${formatCurrency(payment.amount)}</strong>
                                <span>${escapeHtml(methodLabel)} • ${formatShortDateTime(payment.date)}</span>
                                ${payment.sellerName ? `<small>Смена: ${escapeHtml(payment.sellerName)}</small>` : ''}
                                ${payment.note ? `<small>${escapeHtml(payment.note)}</small>` : ''}
                                ${cancelInfo}
                            </div>
                            <div class="debt-payment-actions">
                                ${cancelled
                                    ? '<span class="debt-payment-status">Отменена</span>'
                                    : `<button class="btn btn-danger btn-sm" onclick="cancelDebtPayment('${payment.id}')"><i class="fas fa-undo"></i> Отменить оплату</button>`}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Управление долгом
function manageDebt(debtId) {
    console.log('Открываем управление долгом для ID:', debtId);
    const debt = debts.find(d => d.id === debtId);
    if (!debt) {
        console.error('Долг не найден для ID:', debtId);
        return;
    }
    console.log('Найден долг:', debt);
    console.log('История долга:', debt.history);

    const debtInfo = document.getElementById('debt-info');
    console.log('Элемент debt-info найден:', debtInfo);
    
    const historyHTML = debt.history.length > 0 ? debt.history.map(entry => {
        console.log('Отображаем запись истории:', entry);
        const typeLabels = {
            'create': 'Создан',
            'add': 'Добавлено',
            'subtract': 'Вычтено',
            'comment': 'Комментарий',
            'payment': 'Оплата',
            'cancel_payment': 'Оплата отменена',
            'payoff': 'Погашен'
        };
        
        const typeIcons = {
            'create': '➕',
            'add': '➕',
            'subtract': '➖',
            'comment': '💬',
            'payment': '💵',
            'cancel_payment': '↩',
            'payoff': '✅'
        };
        
        return `
            <div class="debt-history-item">
                <div class="debt-history-header">
                    <span class="debt-history-type ${entry.type}">
                        ${typeIcons[entry.type] || '•'} ${typeLabels[entry.type] || 'Изменение'}
                    </span>
                    <span class="debt-history-date">${formatDate(entry.date)}</span>
                </div>
                <div class="debt-history-details">
                    ${entry.description}
                </div>
            </div>
        `;
    }).join('') : '<div class="debt-history-empty">История изменений пуста</div>';
    
    console.log('Сгенерированный HTML истории:', historyHTML);
    
    // Формируем информацию о накладных
    const debtInvoices = debt.invoices || [];
    let invoicesInfo = '';
    
    if (debtInvoices.length > 0) {
        invoicesInfo = `
            <div class="debt-invoices-info">
                <h5>Связанные накладные (${debtInvoices.length} шт.):</h5>
                <div class="debt-invoices-summary">
                    ${debtInvoices.map(invoice => `
                        <div class="debt-invoice-summary">
                            <span>Накладная №${invoice.number}</span>
                            <span>${formatCurrency(invoice.amount)}</span>
                            <span>${formatDateShort(invoice.date)}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-info btn-sm" onclick="showDebtInvoices('${debt.id}')" style="margin-top: 10px;">
                    <i class="fas fa-receipt"></i> Показать детали накладных
                </button>
            </div>
        `;
    }
    const paymentsInfo = renderDebtPaymentsSection(debt);

    if (isSellerSimpleMode()) {
        const simpleHistoryHTML = debt.history.length > 0
            ? debt.history.slice().reverse().map(entry => `
                <div class="debt-history-item seller-simple-history-item">
                    <div class="seller-simple-history-top">
                        <span class="debt-history-type ${entry.type}">${getDebtHistoryTypeLabel(entry.type)}</span>
                        <span class="debt-history-date">${formatShortDateTime(entry.date)}</span>
                    </div>
                    <div class="seller-simple-history-text">
                        ${formatHistoryTextForSimpleView(entry.description)}
                    </div>
                </div>
            `).join('')
            : '<div class="debt-history-empty">История изменений пуста</div>';

        const simpleInvoicesInfo = debtInvoices.length > 0 ? `
            <div class="seller-simple-debt-linked">
                <div class="seller-simple-block-title">Связанные накладные</div>
                <div class="seller-simple-linked-list">
                    ${debtInvoices.map(invoice => `
                        <div class="seller-simple-linked-item">
                            <strong>Накладная №${invoice.number}</strong>
                            <span>${formatDateShort(invoice.date)}</span>
                            <strong>${formatCurrency(invoice.amount)}</strong>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-info btn-sm seller-simple-open-invoices-btn" onclick="showDebtInvoices('${debt.id}')">
                    ${getActionButtonContent('fas fa-receipt', 'Открыть накладные', true)}
                </button>
            </div>
        ` : '';

        debtInfo.innerHTML = `
            <div class="seller-simple-debt-modal-summary">
                <div class="seller-simple-debt-modal-client">
                    <span class="seller-simple-caption">Клиент</span>
                    <strong>${escapeHtml(debt.clientName)}</strong>
                </div>
                <div class="seller-simple-debt-modal-amount">
                    <span class="seller-simple-caption">Сейчас должен</span>
                    <strong>${formatCurrency(debt.amount)}</strong>
                </div>
                <div class="seller-simple-debt-modal-meta">
                    <div>
                        <span class="seller-simple-caption">Когда создан</span>
                        <strong>${formatDateShort(debt.createdAt)}</strong>
                    </div>
                    <div>
                        <span class="seller-simple-caption">Комментарий</span>
                        <strong>${escapeHtml(getLastComment(debt) || 'Нет комментария')}</strong>
                    </div>
                </div>
            </div>
            ${simpleInvoicesInfo}
            ${paymentsInfo}
            <div class="debt-history-section seller-simple-debt-history">
                <h4 class="debt-history-title">Что менялось по долгу</h4>
                <div class="debt-history-container seller-simple-debt-history-list">
                    ${simpleHistoryHTML}
                </div>
            </div>
        `;
    } else {
        debtInfo.innerHTML = `
            <div class="card">
                <div class="card-content">
                    <div class="card-info">
                        <span>Клиент:</span>
                        <span><strong>${debt.clientName}</strong></span>
                    </div>
                    <div class="card-info">
                        <span>Текущая сумма:</span>
                        <span><strong style="color: #e74c3c; font-size: 16px;">${formatCurrency(debt.amount)}</strong></span>
                    </div>
                    <div class="card-info">
                        <span>Дата создания:</span>
                        <span>${formatDateShort(debt.createdAt)}</span>
                    </div>
                    <div class="card-info">
                        <span>Комментарий:</span>
                        <span>${getLastComment(debt) || 'Нет комментария'}</span>
                    </div>
                </div>
            </div>
            ${invoicesInfo}
            ${paymentsInfo}
            <div class="debt-history-section">
                <h4 class="debt-history-title">История изменений</h4>
                <div class="debt-history-container">
                    ${historyHTML}
                </div>
            </div>
        `;
    }

    openModal('manageDebtModal');
    document.getElementById('debtChangeAmount').value = '';
    document.getElementById('debtComment').value = '';
    resetDebtPaymentForm(debt);
    
    // Сохраняем ID долга для использования в других функциях
    document.getElementById('manageDebtModal').setAttribute('data-debt-id', debtId);
}

// Показать детали накладной
function showInvoiceDetails(invoiceId) {
    // Сначала ищем в активных накладных
    let invoice = invoices.find(i => i.id === invoiceId);
    
    // Если не найдена в активных накладных, ищем в долгах
    if (!invoice) {
        for (let debt of debts) {
            const debtInvoice = debt.invoices?.find(inv => inv.id === invoiceId);
            if (debtInvoice) {
                // Создаем объект накладной из данных долга
                invoice = {
                    id: debtInvoice.id,
                    date: debtInvoice.date,
                    client: debt.clientName,
                    total: debtInvoice.amount,
                    items: debtInvoice.items,
                    paymentType: 'debt'
                };
                break;
            }
        }
    }
    
    if (!invoice) {
        alert('Накладная не найдена в системе');
        return;
    }
    
    // Находим правильный номер накладной
    let invoiceNumber = '?';
    const originalIndex = invoices.findIndex(inv => inv.id === invoiceId);
    if (originalIndex !== -1) {
        invoiceNumber = originalIndex + 1;
    } else {
        // Если накладная не найдена в активных, ищем в долгах
        for (let debt of debts) {
            const debtInvoice = debt.invoices?.find(inv => inv.id === invoiceId);
            if (debtInvoice) {
                invoiceNumber = debtInvoice.number;
                break;
            }
        }
    }
    
    const itemsList = invoice.items.map(item => 
        `<div class="invoice-item-detail">
            <span class="item-name">${item.productName} ${getItemTypeBadges(item)}</span>
            <span class="item-quantity">${formatQuantity(item.quantity, item.unit)} ${item.unit}</span>
            <span class="item-price">${formatCurrency(item.price)}</span>
            <span class="item-total">${formatCurrency(item.total)}</span>
        </div>`
    ).join('');
    
    // Блокируем скролл body при открытии модального окна
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.innerHTML = `
        <div class="modal-content modal-large debt-invoices-modal">
            <div class="modal-header">
                <h3>Детали накладной №${invoiceNumber}</h3>
                <span class="close" onclick="removeModal(this)">&times;</span>
            </div>
            <div class="modal-body">
                <div class="debt-invoices-header">
                    <h4>Накладная №${invoiceNumber}</h4>
                    <p>Клиент: <strong>${getDisplayClientName(invoice.client)}</strong> | Дата: <strong>${formatDate(invoice.date)}</strong> | Сумма: <strong>${formatCurrency(invoice.total)}</strong></p>
                </div>
                <div class="debt-invoice-item">
                    <div class="debt-invoice-header">
                        <h5>Товары в накладной (${invoice.items.length} шт.)</h5>
                        <span class="debt-invoice-amount">${formatCurrency(invoice.total)}</span>
                    </div>
                    <div class="debt-invoice-items">
                        <div class="debt-invoice-items-container">
                            ${itemsList}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="removeModal(this)">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Показать накладные долга
function showDebtInvoices(debtId) {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;
    
    const debtInvoices = debt.invoices || [];
    
    if (debtInvoices.length === 0) {
        alert('У этого долга нет связанных накладных');
        return;
    }
    
    let invoicesHTML = `
        <div class="debt-invoices-header">
            <h4>Накладные долга: ${debt.clientName}</h4>
            <p>Общая сумма долга: <strong>${formatCurrency(debt.amount)}</strong> | Накладных: <strong>${debtInvoices.length}</strong></p>
        </div>
        <div class="debt-invoices-list">
    `;
    
    debtInvoices.forEach((invoice, index) => {
        const itemsList = invoice.items.map(item => 
            `<div class="invoice-item-detail">
                <span class="item-name">${item.productName}</span>
                <span class="item-quantity">${formatQuantity(item.quantity, item.unit)} ${item.unit}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                <span class="item-total">${formatCurrency(item.total)}</span>
            </div>`
        ).join('');
        
        invoicesHTML += `
            <div class="debt-invoice-item">
                <div class="debt-invoice-header">
                    <h5>Накладная №${invoice.number}</h5>
                    <span class="debt-invoice-amount">${formatCurrency(invoice.amount)}</span>
                </div>
                <div class="debt-invoice-date">
                    Дата: ${formatDate(invoice.date)}
                </div>
                <div class="debt-invoice-items">
                    <h6>Товары (${invoice.items.length} шт.):</h6>
                    <div class="debt-invoice-items-container">
                        ${itemsList}
                    </div>
                </div>
            </div>
        `;
    });
    
    invoicesHTML += '</div>';
    
    // Блокируем скролл body при открытии модального окна
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    // Создаем модальное окно для показа накладных
    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.innerHTML = `
        <div class="modal-content modal-extra-large debt-invoices-modal">
            <div class="modal-header">
                <h3>Накладные долга</h3>
                <span class="close" onclick="removeModal(this)">&times;</span>
            </div>
            <div class="modal-body">
                ${invoicesHTML}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="removeModal(this)">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Изменить сумму долга
function changeDebtAmount() {
    const debtId = document.getElementById('manageDebtModal').getAttribute('data-debt-id');
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;
    const beforeSnapshot = createDebtAuditSnapshot(debt);
    const beforeAmount = Number(debt.amount) || 0;

    const changeAmount = parseFloat(document.getElementById('debtChangeAmount').value) || 0;
    const comment = document.getElementById('debtComment').value.trim();
    
    // Проверяем, что введена либо сумма, либо комментарий
    if (!changeAmount && !comment) {
        alert('Введите сумму изменения или комментарий');
        return;
    }

    // Если введена сумма, изменяем долг
    if (changeAmount !== 0) {
        const oldAmount = debt.amount;
        debt.amount += changeAmount;
        
        if (debt.amount < 0) {
            alert('Сумма долга не может быть отрицательной');
            debt.amount = oldAmount;
            return;
        }

        // Создаем информативное сообщение
        let description;
        if (changeAmount > 0) {
            description = `➕ Добавлено <strong>${formatCurrency(Math.abs(changeAmount))}</strong><br><strong>Было:</strong> ${formatCurrency(oldAmount)} → <strong>Стало:</strong> ${formatCurrency(debt.amount)}`;
        } else {
            description = `➖ Вычтено <strong>${formatCurrency(Math.abs(changeAmount))}</strong><br><strong>Было:</strong> ${formatCurrency(oldAmount)} → <strong>Стало:</strong> ${formatCurrency(debt.amount)}`;
        }
        
        if (comment) {
            description += `<br><em>💬 Комментарий:</em> ${comment}`;
        }

        // Добавляем запись в историю об изменении суммы
        debt.history.push({
            type: changeAmount > 0 ? 'add' : 'subtract',
            amount: Math.abs(changeAmount),
            date: new Date().toISOString(),
            description: description
        });
    } else if (comment) {
        // Если введен только комментарий, добавляем запись без изменения суммы
        console.log('Добавляем комментарий:', comment);
        debt.history.push({
            type: 'comment',
            amount: 0,
            date: new Date().toISOString(),
            description: comment
        });
        console.log('История после добавления:', debt.history);
    }

    saveData('debts', debts);
    logActivity('debt_change', {
        debtId: debt.id,
        clientName: debt.clientName,
        changeAmount,
        comment,
        beforeAmount,
        afterAmount: Number(debt.amount) || 0,
        beforeDebtSnapshot: beforeSnapshot,
        afterDebtSnapshot: createDebtAuditSnapshot(debt)
    });
    console.log('Данные сохранены, обновляем интерфейс');
    
    document.getElementById('debtChangeAmount').value = '';
    document.getElementById('debtComment').value = '';
    
    loadDebts();
    updateStats();
    manageDebt(debtId); // Обновляем модальное окно
}

function resetDebtPaymentForm(debt) {
    const amountInput = document.getElementById('debtPaymentAmount');
    if (amountInput) {
        amountInput.value = '';
        amountInput.max = String(Math.max(0, Number(debt?.amount) || 0));
        amountInput.placeholder = `Осталось ${formatCurrency(Number(debt?.amount) || 0)}`;
    }

    const methodSelect = document.getElementById('debtPaymentMethod');
    if (methodSelect) methodSelect.value = 'cash';

    const noteInput = document.getElementById('debtPaymentNote');
    if (noteInput) noteInput.value = '';
}

function getDebtPaymentFormMethod() {
    const method = document.getElementById('debtPaymentMethod')?.value;
    if (method === 'cash' || method === 'card') return method;
    return getDebtPaymentMethod();
}

function getDebtPaymentFormNote() {
    return (document.getElementById('debtPaymentNote')?.value || '').trim();
}

function applyDebtPayment(debtId, rawAmount, paymentMethod, note = '') {
    const debt = ensureDebtRecordShape(debts.find(d => d.id === debtId));
    if (!debt) {
        console.error('Долг не найден для ID:', debtId);
        return false;
    }

    const beforeAmount = roundCurrencyAmount(debt.amount);
    const paymentAmount = roundCurrencyAmount(rawAmount);

    if (paymentAmount <= 0) {
        alert('Введите сумму оплаты больше нуля');
        return false;
    }

    if (paymentAmount - beforeAmount > 0.01) {
        alert(`Сумма оплаты больше долга. Осталось к оплате ${formatCurrency(beforeAmount)}`);
        return false;
    }

    const beforeSnapshot = createDebtAuditSnapshot(debt);
    const afterAmount = roundCurrencyAmount(Math.max(0, beforeAmount - paymentAmount));
    const isFullPayment = afterAmount <= 0.01;
    const debtPayment = recordDebtPayment(beforeSnapshot, paymentMethod, paymentAmount, note, {
        beforeAmount,
        afterAmount: isFullPayment ? 0 : afterAmount
    });

    if (!debtPayment) return false;

    debt.amount = isFullPayment ? 0 : afterAmount;
    debt.paidAmount = roundCurrencyAmount((Number(debt.paidAmount) || 0) + paymentAmount);

    const noteHtml = note ? `<br><em>Комментарий:</em> ${escapeHtml(note)}` : '';
    debt.history.push({
        type: isFullPayment ? 'payoff' : 'payment',
        amount: paymentAmount,
        date: debtPayment.date,
        paymentId: debtPayment.id,
        description: `${isFullPayment ? '✅ Долг полностью погашен' : '💵 Принята оплата по долгу'} на сумму <strong>${formatCurrency(paymentAmount)}</strong><br><strong>Было:</strong> ${formatCurrency(beforeAmount)} → <strong>Осталось:</strong> ${formatCurrency(debt.amount)}<br><em>Оплата:</em> ${getDebtPaymentMethodLabel(paymentMethod)}${noteHtml}`
    });

    const afterSnapshot = createDebtAuditSnapshot(debt);

    if (isFullPayment) {
        archiveDebt({
            ...debt,
            archiveAmount: beforeAmount,
            archivePaidAmount: paymentAmount,
            archiveReason: 'paid_off'
        });
        debts = debts.filter(d => d.id !== debtId);
    }

    saveData('debts', debts);
    logActivity(isFullPayment ? 'debt_payoff' : 'debt_payment', {
        debtId,
        clientName: debt.clientName,
        amount: paymentAmount,
        paidAmount: paymentAmount,
        paymentMethod,
        paymentId: debtPayment.id,
        note,
        beforeAmount,
        afterAmount: isFullPayment ? 0 : afterAmount,
        beforeDebtSnapshot: beforeSnapshot,
        afterDebtSnapshot: afterSnapshot,
        debtSnapshot: isFullPayment ? beforeSnapshot : null
    });

    loadDebts();
    loadMoneyData();
    updateStats();

    if (isFullPayment) {
        closeModal('manageDebtModal');
    } else {
        manageDebt(debtId);
    }

    return true;
}

function restoreArchivedDebtForPaymentCancel(debtId) {
    let archivedDebts = getArchivedDebts();
    const archivedIndex = archivedDebts.findIndex(debt => debt.id === debtId);
    if (archivedIndex === -1) return null;

    const restoredDebt = { ...archivedDebts[archivedIndex] };
    delete restoredDebt.archivedAt;

    archivedDebts.splice(archivedIndex, 1);
    saveArchivedDebts(archivedDebts);

    const shapedDebt = ensureDebtRecordShape(restoredDebt);
    debts.push(shapedDebt);
    return shapedDebt;
}

function cancelDebtPayment(paymentId) {
    const payment = debtPayments.find(item => item.id === paymentId);
    if (!payment) {
        alert('Оплата не найдена');
        return false;
    }

    if (isDebtPaymentCancelled(payment)) {
        alert('Эта оплата уже отменена');
        return false;
    }

    const reasonAnswer = prompt('Почему отменяем оплату?', 'Ошибка ввода оплаты');
    if (reasonAnswer === null) return false;
    const reason = reasonAnswer.trim() || 'Ошибка ввода оплаты';

    const paymentAmount = roundCurrencyAmount(payment.amount);
    if (paymentAmount <= 0) {
        alert('У оплаты некорректная сумма');
        return false;
    }

    let debt = ensureDebtRecordShape(debts.find(item => item.id === payment.debtId));
    if (!debt) {
        debt = restoreArchivedDebtForPaymentCancel(payment.debtId);
    }

    if (!debt) {
        alert('Долг по этой оплате не найден. Сначала восстановите долг из архива.');
        return false;
    }

    const beforeAmount = roundCurrencyAmount(debt.amount);
    const expectedAmountAfterPayment = roundCurrencyAmount(payment.afterAmount ?? Math.max(0, (Number(payment.beforeAmount) || 0) - paymentAmount));
    if (beforeAmount - expectedAmountAfterPayment > 0.01) {
        const proceed = confirm(`Сейчас долг уже ${formatCurrency(beforeAmount)}, а после этой оплаты должен был быть ${formatCurrency(expectedAmountAfterPayment)}. Похоже, долг уже меняли вручную.\n\nВсё равно отменить оплату и добавить к долгу ${formatCurrency(paymentAmount)}?`);
        if (!proceed) return false;
    }

    if (!confirm(`Отменить оплату клиента "${payment.clientName || debt.clientName}" на сумму ${formatCurrency(paymentAmount)}? Она перестанет считаться в смене и деньгах.`)) {
        return false;
    }

    const now = new Date().toISOString();
    const beforeSnapshot = createDebtAuditSnapshot(debt);

    debt.amount = roundCurrencyAmount(beforeAmount + paymentAmount);
    debt.paidAmount = roundCurrencyAmount(Math.max(0, (Number(debt.paidAmount) || 0) - paymentAmount));
    debt.history.push({
        type: 'cancel_payment',
        amount: paymentAmount,
        date: now,
        paymentId: payment.id,
        description: `↩ Отменена ошибочная оплата на сумму <strong>${formatCurrency(paymentAmount)}</strong><br><strong>Было:</strong> ${formatCurrency(beforeAmount)} → <strong>Стало:</strong> ${formatCurrency(debt.amount)}<br><em>Оплата была:</em> ${getDebtPaymentMethodLabel(payment.paymentMethod)}<br><em>Причина:</em> ${escapeHtml(reason)}`
    });

    payment.status = 'cancelled';
    payment.cancelledAt = now;
    payment.cancelledBy = getActorLabel();
    payment.cancelReason = reason;

    const moneyTransaction = moneyTransactions.find(transaction =>
        transaction.id === payment.moneyTransactionId ||
        (transaction.type === 'debt_payment' && transaction.sourceId === payment.id)
    );

    if (moneyTransaction) {
        moneyTransaction.status = 'cancelled';
        moneyTransaction.cancelledAt = now;
        moneyTransaction.cancelledBy = getActorLabel();
        moneyTransaction.cancelReason = reason;
        moneyTransaction.note = [moneyTransaction.note, `Отменено: ${reason}`].filter(Boolean).join(' • ');
    }

    saveData('debtPayments', debtPayments);
    saveData('moneyTransactions', moneyTransactions);
    saveData('debts', debts);

    const afterSnapshot = createDebtAuditSnapshot(debt);
    logActivity('debt_payment_cancel', {
        debtId: debt.id,
        clientName: debt.clientName,
        amount: paymentAmount,
        paymentMethod: payment.paymentMethod,
        paymentId: payment.id,
        reason,
        beforeAmount,
        afterAmount: debt.amount,
        beforeDebtSnapshot: beforeSnapshot,
        afterDebtSnapshot: afterSnapshot
    });

    loadDebts();
    loadMoneyData();
    updateStats();
    manageDebt(debt.id);
    return true;
}

// Принять оплату по долгу из модального окна
function payOffDebt(payFull = false) {
    const debtId = document.getElementById('manageDebtModal').getAttribute('data-debt-id');
    const debt = ensureDebtRecordShape(debts.find(d => d.id === debtId));
    if (!debt) {
        console.error('Долг не найден для ID:', debtId);
        return;
    }

    const paymentMethod = payFull ? getDebtPaymentMethod() : getDebtPaymentFormMethod();
    if (!paymentMethod) return;

    const paymentAmount = payFull
        ? roundCurrencyAmount(debt.amount)
        : roundCurrencyAmount(document.getElementById('debtPaymentAmount')?.value);

    if (payFull && !confirm(`Погасить долг клиента "${debt.clientName}" полностью на сумму ${formatCurrency(paymentAmount)}?`)) {
        return;
    }

    applyDebtPayment(debtId, paymentAmount, paymentMethod, getDebtPaymentFormNote());
}

// Открыть оплату долга из списка
function payOffDebtFromList(debtId) {
    manageDebt(debtId);
    setTimeout(() => document.getElementById('debtPaymentAmount')?.focus(), 0);
}

function deleteDebt(debtId) {
    const debt = ensureDebtRecordShape(debts.find(d => d.id === debtId));
    if (!debt) {
        console.error('Долг не найден для ID:', debtId);
        return;
    }

    if (!confirm(`Удалить долг клиента "${debt.clientName}" на сумму ${formatCurrency(debt.amount)}?`)) {
        return;
    }

    const debtSnapshot = createDebtAuditSnapshot(debt);
    const deletedDebt = {
        ...debt,
        deletedAt: new Date().toISOString(),
        archiveReason: 'deleted_by_user'
    };
    archiveDebt(deletedDebt);

    debts = debts.filter(d => d.id !== debtId);
    saveData('debts', debts);
    logActivity('debt_delete', {
        debtId,
        clientName: debt.clientName,
        amount: debt.amount,
        debtSnapshot
    });

    const modal = document.getElementById('manageDebtModal');
    if (modal?.getAttribute('data-debt-id') === debtId) {
        closeModal('manageDebtModal');
    }

    loadDebts();
    loadMoneyData();
    updateStats();
}

function deleteCurrentDebt() {
    const debtId = document.getElementById('manageDebtModal')?.getAttribute('data-debt-id');
    if (debtId) deleteDebt(debtId);
}

// ==================== ДВИЖЕНИЕ ПО СКЛАДУ ====================

function getMovementsPageData(source = movements, page = movementsPage) {
    const sorted = [...(Array.isArray(source) ? source : [])]
        .sort((left, right) => String(right?.date || '').localeCompare(String(left?.date || '')));
    const pageSize = MOVEMENTS_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;

    return {
        items: sorted.slice(startIndex, startIndex + pageSize),
        total: sorted.length,
        page: safePage,
        totalPages,
        startIndex,
        endIndex: Math.min(sorted.length, startIndex + pageSize)
    };
}

function renderMovementItem(movement = {}) {
    const quantity = Number(movement.quantity) || 0;
    const quantityText = `${quantity > 0 ? '+' : ''}${formatQuantity(quantity, 'шт')} шт`;

    return `
        <div class="movement-item ${quantity < 0 ? 'sale' : 'purchase'}">
            <div class="movement-header">
                <span class="movement-type">${escapeHtml(movement.type || 'Движение')}</span>
                <span class="movement-date">${formatDate(movement.date)}</span>
            </div>
            <div class="movement-details">
                ${escapeHtml(movement.description || 'Без описания')} (${quantityText})
            </div>
        </div>
    `;
}

// Загрузка движений
function loadMovements() {
    const container = document.getElementById('movements-list');
    if (!container) return;

    if (!Array.isArray(movements) || movements.length === 0) {
        container.innerHTML = '<p class="text-center">Нет движений</p>';
        return;
    }

    const pageData = getMovementsPageData(movements, movementsPage);
    movementsPage = pageData.page;

    container.innerHTML = `
        <div class="movements-summary">
            <span>${pageData.startIndex + 1}-${pageData.endIndex} из ${pageData.total} движений</span>
            <span>Страница ${pageData.page} из ${pageData.totalPages}</span>
        </div>
        <div class="movements-page-grid">
            ${pageData.items.map(renderMovementItem).join('')}
        </div>
        ${pageData.totalPages > 1 ? `
            <div class="movements-pagination">
                <button class="btn btn-secondary btn-sm" onclick="changeMovementsPage(-1)" ${pageData.page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Назад
                </button>
                <button class="btn btn-secondary btn-sm" onclick="changeMovementsPage(1)" ${pageData.page >= pageData.totalPages ? 'disabled' : ''}>
                    Вперед <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        ` : ''}
    `;
}

function changeMovementsPage(delta) {
    movementsPage += Number(delta) || 0;
    loadMovements();
}

// Добавить движение
function addMovement(type, description, quantity) {
    const movement = {
        id: generateId(),
        type: type,
        description: description,
        quantity: quantity,
        date: new Date().toISOString()
    };

    movements.push(movement);
    saveData('movements', movements);
}

// Очистить все движения (улучшенная версия)
function clearAllMovements() {
    if (confirm('Очистить всю историю движений? Это действие нельзя отменить.')) {
        // Полностью очищаем массив движений
        movements = [];
        saveData('movements', movements);

        loadMovements();
        loadDashboardData();
    }
}

// ==================== ПРИХОД И СКЛАД ====================

function getIncomingSelectedDate() {
    const dateInput = document.getElementById('incoming-report-date');
    if (!dateInput) return getTodayDateKey();
    if (!dateInput.value) {
        dateInput.value = getTodayDateKey();
    }
    return dateInput.value;
}

function refreshIncomingIfVisible(force = false) {
    const incomingTab = document.getElementById('incoming');
    if (!incomingTab) return;

    if (force || incomingTab.classList.contains('active')) {
        loadIncomingData();
    }
}

function renderIncomingReceiptHistoryCard(receipt, options = {}) {
    const outstanding = getReceiptOutstandingAmount(receipt);
    const isPaid = outstanding <= 0;
    const lastPayment = Array.isArray(receipt.paymentHistory) && receipt.paymentHistory.length
        ? receipt.paymentHistory[receipt.paymentHistory.length - 1]
        : null;
    const showPaymentHistory = options.showPaymentHistory !== false && !isSellerMode();

    return `
        <div class="incoming-history-card incoming-receipt-card ${isPaid ? 'incoming-receipt-paid-card' : ''}">
            <div class="incoming-history-head">
                <div>
                    <strong>${escapeHtml(receipt.supplierName || 'Поставщик')}</strong>
                    <small>${receipt.invoiceNumber ? `Накладная №${escapeHtml(receipt.invoiceNumber)}` : 'Без номера'} • ${formatDateShort(receipt.date)}</small>
                </div>
                <span class="incoming-status ${isPaid ? 'success' : 'warning'}">
                    ${isPaid ? 'Оплачена' : `Долг ${formatCurrency(outstanding)}`}
                </span>
            </div>
            <div class="incoming-history-grid">
                <div><span>Сумма</span><strong>${formatCurrency(receipt.totalAmount)}</strong></div>
                <div><span>Оплачено</span><strong>${formatCurrency(receipt.paidAmount)}</strong></div>
                <div><span>Остаток к оплате</span><strong>${formatCurrency(outstanding)}</strong></div>
                <div><span>Принял</span><strong>${escapeHtml(receipt.acceptedBy || 'Не указано')}</strong></div>
                <div><span>Тип табака</span><strong>${getIncomingTobaccoMixedTypeSummary(receipt.tobaccoMixedTypes || { [receipt.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE]: receipt.tobaccoPieces || 0 }).join(', ') || 'Нет табака'}</strong></div>
            </div>
            ${renderIncomingReceiptItemBreakdown(receipt)}
            <div class="incoming-history-footer">
                <small>Создано: ${formatShortDateTime(receipt.createdAt)}</small>
                ${receipt.note ? `<small>Комментарий: ${escapeHtml(receipt.note)}</small>` : ''}
                ${lastPayment ? `<small>Последняя оплата: ${formatCurrency(lastPayment.amount)} • ${formatShortDateTime(lastPayment.date)}</small>` : ''}
            </div>
            <div class="incoming-history-actions">
                <button class="btn btn-secondary btn-sm" onclick="showEditIncomingReceiptModal('${receipt.id}')">
                    <i class="fas fa-pen"></i> Редактировать
                </button>
                ${!isSellerMode() ? `
                <button class="btn btn-secondary btn-sm" onclick="showReceiptPaymentModal('${receipt.id}')" ${isPaid ? 'disabled' : ''}>
                    <i class="fas fa-wallet"></i> Оплатить
                </button>
                <button class="btn btn-warning btn-sm" onclick="archiveIncomingReceipt('${receipt.id}')">
                    <i class="fas fa-archive"></i> В архив
                </button>
                ` : ''}
            </div>
            ${showPaymentHistory ? renderIncomingPaymentHistory(receipt) : ''}
        </div>
    `;
}

function loadIncomingData() {
    const dateInput = document.getElementById('incoming-report-date');
    const summaryContainer = document.getElementById('incoming-daily-summary');
    const dayReportContainer = document.getElementById('incoming-day-report');
    const receiptsContainer = document.getElementById('incoming-receipts-list');
    const supplierDebtContainer = document.getElementById('supplier-debt-summary');

    if (!summaryContainer || !dayReportContainer || !receiptsContainer || !supplierDebtContainer) {
        return;
    }

    if (dateInput) {
        if (!dateInput.value) {
            dateInput.value = getTodayDateKey();
        }
        if (isSellerMode()) {
            dateInput.value = getTodayDateKey();
            dateInput.disabled = true;
        } else {
            dateInput.disabled = false;
        }
    }

    const reportDate = getIncomingSelectedDate();
    const report = calculateIncomingDailyReport(reportDate);
    const openingTobaccoState = report.openingState.categories?.tobacco || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { total: 0, byType: {} } };
    const openingRoastState = report.openingState.categories?.roast || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { total: 0, byType: {} } };
    const closingTobaccoState = report.closingState.categories?.tobacco || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { total: 0, byType: {} } };
    const closingRoastState = report.closingState.categories?.roast || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { total: 0, byType: {} } };
    const openingTobacco = getTobaccoStockPiecesFromState(openingTobaccoState);
    const openingRoast = getRoastStockPiecesFromState(openingRoastState);
    const closingTobacco = getTobaccoStockPiecesFromState(closingTobaccoState);
    const closingRoast = getRoastStockPiecesFromState(closingRoastState);
    const openingRoastKg = getRoastStockKgFromState(openingRoastState);
    const closingRoastKg = getRoastStockKgFromState(closingRoastState);
    const openingTobaccoPacks = openingTobaccoState.finishedRemaining || { total: 0 };
    const openingRoastPacks = openingRoastState.finishedRemaining || { total: 0 };
    const closingTobaccoPacks = closingTobaccoState.finishedRemaining || { total: 0 };
    const closingRoastPacks = closingRoastState.finishedRemaining || { total: 0 };
    const tobaccoSalesToday = report.salesToday.tobacco || { total: 0 };
    const roastSalesToday = report.salesToday.roast || { total: 0 };
    const receiptItems = report.receiptTotals.byItems || {};
    const receiptTobaccoTypes = getIncomingTobaccoMixedTypeSummary(report.receiptTotals.tobaccoMixedTypes || {});
    const negativeBalances = [];
    if (closingTobacco.good < 0) negativeBalances.push(`табак: ${formatQuantity(Math.abs(closingTobacco.good), 'шт')} шт ниже нуля`);
    if (closingTobacco.defect < 0) negativeBalances.push(`маленький брак: ${formatQuantity(Math.abs(closingTobacco.defect), 'шт')} шт ниже нуля`);
    if (closingRoast.good < 0) negativeBalances.push(`жарка: ${formatQuantity(Math.abs(closingRoast.good), 'шт')} шт ниже нуля`);
    if (closingRoast.defect < 0) negativeBalances.push(`большой брак: ${formatQuantity(Math.abs(closingRoast.defect), 'шт')} шт ниже нуля`);
    if (closingTobaccoPacks.total < 0) negativeBalances.push(`табачные пакеты: ${formatQuantity(Math.abs(closingTobaccoPacks.total), 'шт')} шт ниже нуля`);
    if (closingRoastPacks.total < 0) negativeBalances.push(`пакеты жарки: ${formatQuantity(Math.abs(closingRoastPacks.total), 'шт')} шт ниже нуля`);

    summaryContainer.innerHTML = `
        <div class="incoming-summary-card">
            <span>Принято накладных за день</span>
            <strong>${report.receiptsToday.length}</strong>
            <small>${formatDateShort(reportDate)}</small>
        </div>
        <div class="incoming-summary-card">
            <span>Сумма прихода за день</span>
            <strong>${formatCurrency(report.receiptTotals.totalAmount)}</strong>
            <small>По всем накладным за выбранный день</small>
        </div>
        <div class="incoming-summary-card">
            <span>Оплачено поставщику за день</span>
            <strong>${formatCurrency(report.receiptTotals.paidToday)}</strong>
            <small>Платежи, проведённые сегодня</small>
        </div>
        <div class="incoming-summary-card">
            <span>Возврат поставщику за день</span>
            <strong>${formatCurrency(report.returnTotals.totalAmount)}</strong>
            <small>${report.returnsToday.length} возвратов</small>
        </div>
        <div class="incoming-summary-card">
            <span>Табачных пакетов сейчас</span>
            <strong>${formatQuantity(closingTobaccoPacks.total, 'шт')} шт</strong>
            <small>${getPackBreakdownWithOpenedText(closingTobaccoPacks, closingTobaccoState.openedRemaining || {}, getTobaccoTypeLabel)}<br>Продано сегодня: ${formatQuantity(tobaccoSalesToday.total, 'шт')} шт<br>${getTobaccoPackBreakdownText(tobaccoSalesToday)}</small>
        </div>
        <div class="incoming-summary-card">
            <span>Пакетов жарки сейчас</span>
            <strong>${formatQuantity(closingRoastPacks.total, 'шт')} шт</strong>
            <small>${formatQuantity(closingRoastKg, 'кг')} кг<br>${getPackBreakdownWithOpenedText(closingRoastPacks, closingRoastState.openedRemaining || {}, getRoastTypeLabel)}<br>Продано сегодня: ${formatQuantity(roastSalesToday.total, 'шт')} шт<br>${getRoastPackBreakdownText(roastSalesToday)}</small>
        </div>
        <div class="incoming-summary-card incoming-summary-card-accent">
            <span>Долг поставщику</span>
            <strong>${formatCurrency(report.supplierDebtTotal)}</strong>
            <small>Открытых накладных: ${getOpenIncomingReceiptsOldestFirst().length}</small>
        </div>
    `;

    dayReportContainer.innerHTML = `
        <div class="incoming-report-grid">
            <div class="incoming-report-block">
                <h4><i class="fas fa-sun"></i> Было утром</h4>
                ${renderIncomingMorningWarehouseLines(report.dateKey, report.openingState)}
            </div>
            <div class="incoming-report-block">
                <h4><i class="fas fa-truck-loading"></i> Приняли за день</h4>
                <div class="incoming-report-line"><span>Принято накладных</span><strong>${report.receiptsToday.length} шт</strong></div>
                <div class="incoming-report-line"><span>Сумма накладных</span><strong>${formatCurrency(report.receiptTotals.totalAmount)}</strong></div>
                <div class="incoming-report-line"><span>Возврат поставщику</span><strong>${formatCurrency(report.returnTotals.totalAmount)}</strong></div>
                <div class="incoming-report-line"><span>Табак</span><strong>${formatQuantity(receiptItems.tobacco?.pieces || 0, 'шт')} шт</strong></div>
                <div class="incoming-report-line"><span>Маленький брак</span><strong>${formatQuantity(receiptItems.smallDefect?.pieces || 0, 'шт')} шт</strong></div>
                <div class="incoming-report-line"><span>Жарка</span><strong>${formatQuantity(receiptItems.roast?.pieces || 0, 'шт')} шт</strong></div>
                <div class="incoming-report-line"><span>Большой брак</span><strong>${formatQuantity(receiptItems.bigDefect?.pieces || 0, 'шт')} шт</strong></div>
                <div class="incoming-report-line"><span>Суповой</span><strong>${(receiptItems.soup?.pieces || 0) > 0 ? `${formatQuantity(receiptItems.soup.pieces, 'шт')} шт` : (receiptItems.soup?.kg || 0) > 0 ? `${formatQuantity(receiptItems.soup.kg, 'кг')} кг` : '0'}</strong></div>
                <div class="incoming-report-line"><span>Потраха</span><strong>${(receiptItems.offal?.pieces || 0) > 0 ? `${formatQuantity(receiptItems.offal.pieces, 'шт')} шт` : (receiptItems.offal?.kg || 0) > 0 ? `${formatQuantity(receiptItems.offal.kg, 'кг')} кг` : '0'}</strong></div>
            </div>
            <div class="incoming-report-block">
                <h4><i class="fas fa-chart-line"></i> Что ушло за день</h4>
                <div class="incoming-report-line"><span>Накладных продаж за день</span><strong>${report.invoicesToday.length} шт</strong></div>
                <div class="incoming-report-line"><span>Продано табака мешаного</span><strong>${formatQuantity(tobaccoSalesToday.mixed || 0, 'шт')} пак.</strong></div>
                <div class="incoming-report-line"><span>Продано табака не мешаного</span><strong>${formatQuantity(tobaccoSalesToday.pure || 0, 'шт')} пак.</strong></div>
                <div class="incoming-report-line"><span>Продано жарки мешаной</span><strong>${formatQuantity(roastSalesToday.mixed || 0, 'шт')} пак.</strong></div>
                <div class="incoming-report-line"><span>Продано жарки не мешаной</span><strong>${formatQuantity(roastSalesToday.pure || 0, 'шт')} пак.</strong></div>
                <div class="incoming-report-line"><span>Оплачено поставщику</span><strong>${formatCurrency(report.receiptTotals.paidToday)}</strong></div>
                <div class="incoming-report-line"><span>Где смотреть остаток</span><strong>Раздел «Склад»</strong></div>
            </div>
        </div>
        ${negativeBalances.length ? `
            <div class="incoming-warning-note">
                <strong>Нужна проверка остатков.</strong> В расчётах получилось: ${negativeBalances.join(', ')}.
                Значит, продажи записаны больше, чем было принято в приходе.
            </div>
        ` : ''}
    `;

    supplierDebtContainer.innerHTML = `
        <div class="incoming-supplier-total">
            <div>
                <span>Сумма всех накладных</span>
                <strong>${formatCurrency(report.supplierTotals.totalAmount)}</strong>
            </div>
            <div>
                <span>Уже оплачено</span>
                <strong>${formatCurrency(report.supplierTotals.paidAmount)}</strong>
            </div>
            <div>
                <span>Общий долг поставщику</span>
                <strong>${formatCurrency(report.supplierTotals.outstanding)}</strong>
            </div>
            <div>
                <span>Приходных накладных</span>
                <strong>${incomingReceipts.length}</strong>
            </div>
            <div>
                <span>За выбранный день принято</span>
                <strong>${report.receiptsToday.length} шт / ${formatCurrency(report.receiptTotals.totalAmount)}</strong>
            </div>
        </div>
        ${!isSellerMode() ? `
        <div class="incoming-history-actions" style="margin-top: 12px;">
            <button class="btn btn-primary btn-sm" onclick="showSupplierTotalPaymentModal()" ${report.supplierTotals.outstanding <= 0 ? 'disabled' : ''}>
                <i class="fas fa-wallet"></i> Оплатить общий долг
            </button>
            <button class="btn btn-secondary btn-sm" onclick="showArchivedIncomingReceipts()">
                <i class="fas fa-archive"></i> Открыть архив
            </button>
        </div>
        ` : ''}
    `;

    const receiptsForList = [...incomingReceipts]
        .sort((left, right) => {
            const dateCompare = compareDateKeys(right.dateKey, left.dateKey);
            if (dateCompare !== 0) return dateCompare;
            return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
        })
        .filter(receipt => !isSellerMode() || receipt.dateKey === report.dateKey);

    if (!receiptsForList.length) {
        receiptsContainer.innerHTML = '<p class="text-center">Приходных накладных пока нет</p>';
    } else {
        const openReceipts = receiptsForList.filter(receipt => getReceiptOutstandingAmount(receipt) > 0);
        const paidReceipts = receiptsForList.filter(receipt => getReceiptOutstandingAmount(receipt) <= 0);
        const openHtml = openReceipts.length
            ? openReceipts.map(receipt => renderIncomingReceiptHistoryCard(receipt)).join('')
            : '<p class="text-center">Открытых приходных накладных нет</p>';
        const paidHtml = paidReceipts.length ? `
            <details class="incoming-paid-receipts">
                <summary>
                    <span><i class="fas fa-circle-check"></i> Оплаченные накладные</span>
                    <strong>${paidReceipts.length}</strong>
                </summary>
                <div class="incoming-paid-receipts-list">
                    ${paidReceipts.map(receipt => renderIncomingReceiptHistoryCard(receipt, { showPaymentHistory: false })).join('')}
                </div>
            </details>
        ` : '';

        receiptsContainer.innerHTML = `${openHtml}${paidHtml}`;
    }
}

function renderIncomingReceiptModalRows() {
    const container = document.getElementById('incomingReceiptItemsGrid');
    if (!container) return;

    container.innerHTML = INCOMING_RECEIPT_ITEM_CONFIGS.map(config => {
        const priceInfo = getIncomingReceiptPriceInfo(config.key);
        const allowKgInput = config.allowKgInput !== false;
        return `
            <div class="incoming-receipt-row ${allowKgInput ? '' : 'incoming-receipt-row--pieces-only'} ${config.key === 'tobacco' ? 'incoming-receipt-row--tobacco' : ''}" data-incoming-item="${config.key}">
                <div class="incoming-receipt-row-head">
                    <div class="incoming-receipt-row-title">
                        <i class="${config.icon}"></i>
                        <span>${config.label}</span>
                    </div>
                    <div class="incoming-receipt-row-price ${priceInfo.isReady ? '' : 'warning'}">
                        <strong>${escapeHtml(priceInfo.displayPrice)}</strong>
                        <small>${escapeHtml(priceInfo.sourceLabel)}</small>
                    </div>
                </div>
                <div class="incoming-receipt-row-body">
                    <label class="incoming-receipt-input">
                        <span>Сколько штук</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            class="form-control incoming-receipt-pieces"
                            data-incoming-key="${config.key}"
                            data-field="pieces"
                            placeholder="0"
                            oninput="updateIncomingReceiptSummary()"
                        >
                    </label>
                    ${config.key === 'tobacco' ? `
                    <label class="incoming-receipt-input incoming-receipt-input-wide">
                        <span>Какой мешаный табак привёз поставщик</span>
                        <select
                            class="form-control incoming-receipt-tobacco-type"
                            data-incoming-key="${config.key}"
                            onchange="updateIncomingReceiptSummary()"
                        >
                            ${INCOMING_TOBACCO_MIXED_TYPES.map(type => `
                                <option value="${type}" ${type === AUTO_TOBACCO_MIXED_TYPE ? 'selected' : ''}>${getTobaccoTypeSummary(type)}</option>
                            `).join('')}
                        </select>
                    </label>
                    ` : ''}
                    ${allowKgInput ? `
                    <label class="incoming-receipt-input">
                        <span>Сколько килограмм</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="form-control incoming-receipt-kg"
                            data-incoming-key="${config.key}"
                            data-field="kg"
                            placeholder="0"
                            oninput="updateIncomingReceiptSummary()"
                        >
                    </label>
                    ` : ''}
                    <div class="incoming-receipt-line-total">
                        <span>Сумма по позиции</span>
                        <strong id="incoming-line-total-${config.key}">0 ₽</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function collectIncomingReceiptFormItems() {
    return INCOMING_RECEIPT_ITEM_CONFIGS.map(config => {
        const piecesQty = Math.max(0, parseFloat(document.querySelector(`.incoming-receipt-pieces[data-incoming-key="${config.key}"]`)?.value || '0') || 0);
        const kgQty = Math.max(0, parseFloat(document.querySelector(`.incoming-receipt-kg[data-incoming-key="${config.key}"]`)?.value || '0') || 0);
        const tobaccoMixedType = config?.key === 'tobacco'
            ? sanitizeIncomingTobaccoMixedType(document.querySelector(`.incoming-receipt-tobacco-type[data-incoming-key="${config.key}"]`)?.value || AUTO_TOBACCO_MIXED_TYPE)
            : '';
        const priceInfo = getIncomingReceiptPriceInfo(config.key);

        return normalizeIncomingReceiptItem({
            key: config.key,
            piecesQty,
            kgQty,
            tobaccoMixedType,
            pricingUnit: priceInfo.pricingUnit,
            unitPrice: priceInfo.unitPrice,
            sourceLabel: priceInfo.sourceLabel,
            productId: priceInfo.productId,
            lineTotal: calculateIncomingReceiptLineTotal({
                pricingUnit: priceInfo.pricingUnit,
                unitPrice: priceInfo.unitPrice,
                piecesQty,
                kgQty
            })
        });
    }).filter(item => item.piecesQty > 0 || item.kgQty > 0);
}

function updateIncomingReceiptSummary() {
    const warningEl = document.getElementById('incomingReceiptWarning');
    const totalEl = document.getElementById('incomingReceiptComputedTotal');
    const metaEl = document.getElementById('incomingReceiptComputedMeta');

    const items = collectIncomingReceiptFormItems();
    let totalAmount = 0;
    const warnings = [];
    let filledPositions = 0;

    INCOMING_RECEIPT_ITEM_CONFIGS.forEach(config => {
        const item = items.find(entry => entry.key === config.key);
        const lineTotal = item ? item.lineTotal : 0;
        const lineEl = document.getElementById(`incoming-line-total-${config.key}`);
        if (lineEl) {
            lineEl.textContent = formatCurrency(lineTotal);
        }

        const hasValue = item && ((item.piecesQty > 0) || (item.kgQty > 0));
        if (hasValue) {
            filledPositions += 1;
            const priceInfo = getIncomingReceiptPriceInfo(config.key);
            if (!priceInfo.isReady) {
                warnings.push(`для позиции "${config.label}" не найдена цена`);
            }
        }

        totalAmount += Number(lineTotal) || 0;
    });

    if (totalEl) {
        totalEl.textContent = formatCurrency(totalAmount);
    }

    if (metaEl) {
        const tobaccoType = items.find(item => item.key === 'tobacco')?.tobaccoMixedType;
        metaEl.textContent = filledPositions > 0
            ? `Заполнено позиций: ${filledPositions}.${tobaccoType ? ` Табак: ${getTobaccoTypeLabel(tobaccoType)}.` : ''} Сумма считается автоматически.`
            : 'Заполни нужные позиции, и программа сама посчитает итог накладной.';
    }

    if (warningEl) {
        if (warnings.length) {
            warningEl.style.display = 'block';
            warningEl.textContent = `Внимание: ${warnings.join(', ')}. Проверь раздел "Товары" или настройки себестоимости.`;
        } else {
            warningEl.style.display = 'none';
            warningEl.textContent = '';
        }
    }
}

function renderInitialStockModalRows() {
    const container = document.getElementById('initialStockItemsGrid');
    if (!container) return;

    container.innerHTML = INCOMING_RECEIPT_ITEM_CONFIGS.map(config => {
        const priceInfo = getIncomingReceiptPriceInfo(config.key);
        const allowKgInput = config.allowKgInput !== false;
        return `
            <div class="incoming-receipt-row ${allowKgInput ? '' : 'incoming-receipt-row--pieces-only'} ${config.key === 'tobacco' ? 'incoming-receipt-row--tobacco' : ''}" data-initial-stock-item="${config.key}">
                <div class="incoming-receipt-row-head">
                    <div class="incoming-receipt-row-title">
                        <i class="${config.icon}"></i>
                        <span>${config.label}</span>
                    </div>
                    <div class="incoming-receipt-row-price ${priceInfo.isReady ? '' : 'warning'}">
                        <strong>${escapeHtml(priceInfo.displayPrice)}</strong>
                        <small>${escapeHtml(priceInfo.sourceLabel)}</small>
                    </div>
                </div>
                <div class="incoming-receipt-row-body">
                    <label class="incoming-receipt-input">
                        <span>Сколько штук уже есть</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            class="form-control initial-stock-pieces"
                            data-initial-key="${config.key}"
                            placeholder="0"
                            oninput="updateInitialStockSummary()"
                        >
                    </label>
                    ${config.key === 'tobacco' ? `
                    <label class="incoming-receipt-input incoming-receipt-input-wide">
                        <span>Тип табачных пакетов</span>
                        <select
                            class="form-control initial-stock-tobacco-type"
                            data-initial-key="${config.key}"
                            onchange="updateInitialStockSummary()"
                        >
                            ${INCOMING_TOBACCO_MIXED_TYPES.map(type => `
                                <option value="${type}" ${type === AUTO_TOBACCO_MIXED_TYPE ? 'selected' : ''}>${getTobaccoTypeSummary(type)}</option>
                            `).join('')}
                        </select>
                    </label>
                    ` : ''}
                    ${allowKgInput ? `
                    <label class="incoming-receipt-input">
                        <span>Сколько кг уже есть</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="form-control initial-stock-kg"
                            data-initial-key="${config.key}"
                            placeholder="0"
                            oninput="updateInitialStockSummary()"
                        >
                    </label>
                    ` : ''}
                    <div class="incoming-receipt-line-total">
                        <span>Стоимость позиции</span>
                        <strong id="initial-stock-line-total-${config.key}">0 ₽</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function collectInitialStockFormItems() {
    return INCOMING_RECEIPT_ITEM_CONFIGS.map(config => {
        const piecesQty = Math.max(0, parseFloat(document.querySelector(`.initial-stock-pieces[data-initial-key="${config.key}"]`)?.value || '0') || 0);
        const kgQty = Math.max(0, parseFloat(document.querySelector(`.initial-stock-kg[data-initial-key="${config.key}"]`)?.value || '0') || 0);
        const tobaccoMixedType = config.key === 'tobacco'
            ? sanitizeIncomingTobaccoMixedType(document.querySelector(`.initial-stock-tobacco-type[data-initial-key="${config.key}"]`)?.value || AUTO_TOBACCO_MIXED_TYPE)
            : '';
        const priceInfo = getIncomingReceiptPriceInfo(config.key);

        return normalizeIncomingReceiptItem({
            key: config.key,
            piecesQty,
            kgQty,
            tobaccoMixedType,
            pricingUnit: priceInfo.pricingUnit,
            unitPrice: priceInfo.unitPrice,
            sourceLabel: priceInfo.sourceLabel,
            productId: priceInfo.productId,
            lineTotal: calculateIncomingReceiptLineTotal({
                pricingUnit: priceInfo.pricingUnit,
                unitPrice: priceInfo.unitPrice,
                piecesQty,
                kgQty
            })
        });
    }).filter(item => item.piecesQty > 0 || item.kgQty > 0);
}

function updateInitialStockSummary() {
    const warningEl = document.getElementById('initialStockWarning');
    const totalEl = document.getElementById('initialStockComputedTotal');
    const metaEl = document.getElementById('initialStockComputedMeta');
    const items = collectInitialStockFormItems();
    let totalAmount = 0;
    const warnings = [];
    let filledPositions = 0;

    INCOMING_RECEIPT_ITEM_CONFIGS.forEach(config => {
        const item = items.find(entry => entry.key === config.key);
        const lineTotal = item ? item.lineTotal : 0;
        const lineEl = document.getElementById(`initial-stock-line-total-${config.key}`);
        if (lineEl) {
            lineEl.textContent = formatCurrency(lineTotal);
        }

        const hasValue = item && ((item.piecesQty > 0) || (item.kgQty > 0));
        if (hasValue) {
            filledPositions += 1;
            const priceInfo = getIncomingReceiptPriceInfo(config.key);
            if (!priceInfo.isReady) {
                warnings.push(`для позиции "${config.label}" не найдена цена`);
            }
        }

        totalAmount += Number(lineTotal) || 0;
    });

    if (totalEl) totalEl.textContent = formatCurrency(totalAmount);
    if (metaEl) {
        metaEl.textContent = filledPositions > 0
            ? `Заполнено позиций: ${filledPositions}. Это попадёт в наличие и стоимость склада без долга поставщику.`
            : 'Заполни то, что уже лежит на складе и было оплачено раньше.';
    }

    if (warningEl) {
        if (warnings.length) {
            warningEl.style.display = 'block';
            warningEl.textContent = `Внимание: ${warnings.join(', ')}. Проверь раздел "Товары" или настройки себестоимости.`;
        } else {
            warningEl.style.display = 'none';
            warningEl.textContent = '';
        }
    }
}

function fillInitialStockModal(entry = {}) {
    const normalizedEntry = normalizeInitialStockEntry(entry);
    const dateInput = document.getElementById('initialStockDate');
    const noteInput = document.getElementById('initialStockNote');

    if (dateInput) dateInput.value = normalizedEntry.dateKey || getTodayDateKey();
    if (noteInput) noteInput.value = normalizedEntry.note || '';

    getIncomingReceiptItems(normalizedEntry).forEach(item => {
        const piecesInput = document.querySelector(`.initial-stock-pieces[data-initial-key="${item.key}"]`);
        const kgInput = document.querySelector(`.initial-stock-kg[data-initial-key="${item.key}"]`);
        const tobaccoTypeInput = document.querySelector(`.initial-stock-tobacco-type[data-initial-key="${item.key}"]`);

        if (piecesInput) piecesInput.value = item.piecesQty || '';
        if (kgInput) kgInput.value = item.kgQty || '';
        if (tobaccoTypeInput && item.key === 'tobacco') {
            tobaccoTypeInput.value = item.tobaccoMixedType || normalizedEntry.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE;
        }
    });

    updateInitialStockSummary();
}

function showInitialStockModal(entryId = '') {
    if (isSellerMode()) {
        alert('Стартовые остатки может вносить только руководитель');
        return;
    }

    const editEntry = entryId
        ? initialStockEntries.find(item => item.id === entryId)
        : null;
    if (entryId && !editEntry) {
        alert('Стартовый остаток не найден');
        return;
    }

    const editMode = Boolean(editEntry);
    const normalizedEditEntry = editMode ? normalizeInitialStockEntry(editEntry) : null;
    document.getElementById('initialStockModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'initialStockModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content incoming-receipt-modal-content">
            <div class="modal-header">
                <h3>${editMode ? 'Редактировать стартовый остаток' : 'Внести стартовые остатки'}</h3>
                <span class="close" onclick="removeModal(this)">&times;</span>
            </div>
            <div class="modal-body">
                <form id="initialStockForm">
                    <input type="hidden" id="initialStockEditId" value="${editMode ? escapeHtml(normalizedEditEntry.id) : ''}">
                    <div class="incoming-receipt-top">
                        <div class="form-group">
                            <label for="initialStockDate">Дата остатка</label>
                            <input type="date" id="initialStockDate" class="form-control" value="${editMode ? escapeHtml(normalizedEditEntry.dateKey) : getTodayDateKey()}">
                        </div>
                    </div>
                    <div class="incoming-receipt-summary-card">
                        <div>
                            <span>Стоимость уже оплаченного товара</span>
                            <strong id="initialStockComputedTotal">0 ₽</strong>
                        </div>
                    </div>
                    <div id="initialStockComputedMeta" class="incoming-hint">Заполни то, что уже лежит на складе и было оплачено раньше.</div>
                    <div id="initialStockWarning" class="incoming-receipt-warning" style="display: none;"></div>
                    <div class="incoming-receipt-list-header">
                        <span>Что уже есть на складе</span>
                        <small>Эта операция не создаёт долг поставщику и не списывает деньги из кошельков.</small>
                    </div>
                    <div id="initialStockItemsGrid" class="incoming-receipt-grid"></div>
                    <div class="form-group">
                        <label for="initialStockNote">Комментарий</label>
                        <textarea id="initialStockNote" class="form-control" rows="3" placeholder="Например: остаток до начала учета, уже оплачен ранее"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="removeModal(this)">Отмена</button>
                <button class="btn btn-primary" onclick="saveInitialStockEntry()">${editMode ? 'Сохранить изменения' : 'Сохранить стартовый остаток'}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    renderInitialStockModalRows();
    if (editMode) {
        fillInitialStockModal(normalizedEditEntry);
    } else {
        updateInitialStockSummary();
    }
    openModal('initialStockModal');
}

function saveInitialStockEntry() {
    if (isSellerMode()) {
        alert('Стартовые остатки может вносить только руководитель');
        return;
    }

    const editId = document.getElementById('initialStockEditId')?.value || '';
    const editIndex = editId ? initialStockEntries.findIndex(item => item.id === editId) : -1;
    const currentEntry = editIndex >= 0 ? normalizeInitialStockEntry(initialStockEntries[editIndex]) : null;

    if (editId && editIndex === -1) {
        alert('Стартовый остаток не найден');
        return;
    }

    const items = collectInitialStockFormItems();
    const dateKey = document.getElementById('initialStockDate')?.value || getTodayDateKey();
    const note = document.getElementById('initialStockNote')?.value?.trim() || '';

    if (!items.length) {
        alert('Укажите хотя бы одну позицию стартового остатка');
        return;
    }

    const missingPriceItem = items.find(item => {
        const priceInfo = getIncomingReceiptPriceInfo(item.key);
        return !priceInfo.isReady;
    });

    if (missingPriceItem) {
        alert(`Для позиции "${missingPriceItem.label}" не найдена цена. Проверь настройки или товар в разделе "Товары".`);
        return;
    }

    const summary = getIncomingReceiptItemsSummary(items);
    const entry = normalizeInitialStockEntry({
        id: editId || generateId(),
        note,
        totalAmount: summary.totalAmount,
        items,
        goodQty: summary.goodQty,
        bigDefectQty: summary.bigDefectQty,
        smallDefectQty: summary.smallDefectQty,
        tobaccoPieces: summary.tobaccoPieces,
        tobaccoKg: summary.tobaccoKg,
        roastPieces: summary.roastPieces,
        roastKg: summary.roastKg,
        smallDefectPieces: summary.smallDefectPieces,
        smallDefectKg: summary.smallDefectKg,
        bigDefectPieces: summary.bigDefectPieces,
        bigDefectKg: summary.bigDefectKg,
        soupPieces: summary.soupPieces,
        soupKg: summary.soupKg,
        offalPieces: summary.offalPieces,
        offalKg: summary.offalKg,
        tobaccoMixedType: items.find(item => item.key === 'tobacco')?.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE,
        createdAt: currentEntry?.createdAt || new Date().toISOString(),
        date: buildStorageDateFromDateKey(dateKey),
        dateKey,
        createdBy: currentEntry?.createdBy || getActorLabel()
    });

    if (editId) {
        initialStockEntries[editIndex] = entry;
    } else {
        initialStockEntries.push(entry);
    }
    saveData('initialStockEntries', initialStockEntries);
    syncIncomingProductsStock(true, editId ? {} : { applyMissingAsDelta: true });

    if (editId) {
        const beforeSummary = currentEntry ? getIncomingReceiptItemsSummary(getIncomingReceiptItems(currentEntry)) : { tobaccoPieces: 0, smallDefectPieces: 0, roastPieces: 0, bigDefectPieces: 0 };
        const beforePieces = (Number(beforeSummary.tobaccoPieces) || 0) + (Number(beforeSummary.smallDefectPieces) || 0) + (Number(beforeSummary.roastPieces) || 0) + (Number(beforeSummary.bigDefectPieces) || 0);
        const afterPieces = summary.tobaccoPieces + summary.smallDefectPieces + summary.roastPieces + summary.bigDefectPieces;
        addMovement('Стартовый остаток', `Изменён стартовый остаток на сумму ${formatCurrency(entry.totalAmount)}${note ? `: ${note}` : ''}`, afterPieces - beforePieces);
        logActivity('update_initial_stock', {
            initialStockId: entry.id,
            beforeTotalAmount: currentEntry?.totalAmount || 0,
            totalAmount: entry.totalAmount,
            note,
            beforeItems: currentEntry?.items || [],
            items: entry.items
        });
    } else {
        addMovement('Стартовый остаток', `Внесён уже оплаченный товар на сумму ${formatCurrency(entry.totalAmount)}${note ? `: ${note}` : ''}`, summary.tobaccoPieces + summary.smallDefectPieces + summary.roastPieces + summary.bigDefectPieces);
        logActivity('initial_stock', {
            initialStockId: entry.id,
            totalAmount: entry.totalAmount,
            note,
            items: entry.items
        });
    }

    closeModal('initialStockModal');
    document.getElementById('initialStockModal')?.remove();
    loadProductsToSelects();
    renderDashboardInventoryOverview();
    loadIncomingData();
    loadMoneyData();
    updateStats();
    alert(editId ? 'Стартовый остаток обновлён, склад пересчитан' : 'Стартовые остатки добавлены на склад без долга поставщику');
}

function renderInitialStockHistoryHtml() {
    const entries = [...(Array.isArray(initialStockEntries) ? initialStockEntries : [])]
        .map(normalizeInitialStockEntry)
        .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
    const totalValue = entries.reduce((sum, entry) => sum + (Number(entry.totalAmount) || 0), 0);

    return `
        <div class="initial-stock-panel">
            <div class="inventory-control-head">
                <div>
                    <strong>Стартовые остатки</strong>
                    <small>Уже оплаченный товар, который добавлен в склад без долга поставщику</small>
                </div>
                <button class="btn btn-primary btn-sm" onclick="showInitialStockModal()">
                    <i class="fas fa-boxes-stacked"></i> Внести остатки
                </button>
            </div>
            <div class="incoming-supplier-total">
                <div>
                    <span>Записей</span>
                    <strong>${entries.length}</strong>
                </div>
                <div>
                    <span>Стоимость при внесении</span>
                    <strong>${formatCurrency(totalValue)}</strong>
                </div>
                <div>
                    <span>Влияет на</span>
                    <strong>Склад и товар по закупке</strong>
                </div>
                <div>
                    <span>Долг поставщику</span>
                    <strong>Не создаётся</strong>
                </div>
            </div>
            ${entries.length ? `
                <div class="incoming-history-list">
                    ${entries.slice(0, 8).map(entry => `
                        <div class="incoming-history-card">
                            <div class="incoming-history-head">
                                <div>
                                    <strong>Стартовый остаток</strong>
                                    <small>${formatDateShort(entry.date)} • ${escapeHtml(entry.createdBy || 'Руководитель')}</small>
                                </div>
                                <span class="incoming-status success">Оплачено ранее</span>
                            </div>
                            <div class="incoming-history-grid">
                                <div><span>Стоимость</span><strong>${formatCurrency(entry.totalAmount)}</strong></div>
                                <div><span>Табак</span><strong>${formatQuantity(entry.tobaccoPieces + entry.smallDefectPieces, 'шт')} шт</strong></div>
                                <div><span>Жарка</span><strong>${formatQuantity(entry.roastPieces + entry.bigDefectPieces, 'шт')} шт</strong></div>
                                <div><span>Долг</span><strong>0 ₽</strong></div>
                            </div>
                            ${renderIncomingReceiptItemBreakdown(entry)}
                            ${entry.note ? `<div class="incoming-history-note">${escapeHtml(entry.note)}</div>` : ''}
                            <div class="incoming-history-actions">
                                <button class="btn btn-secondary btn-sm" onclick="showInitialStockModal('${entry.id}')">
                                    <i class="fas fa-edit"></i> Редактировать
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="deleteInitialStockEntry('${entry.id}')">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-center">Стартовые остатки ещё не внесены</p>'}
        </div>
    `;
}

function deleteInitialStockEntry(entryId) {
    if (isSellerMode()) {
        alert('Стартовые остатки может удалять только руководитель');
        return;
    }

    const entry = initialStockEntries.find(item => item.id === entryId);
    if (!entry) {
        alert('Стартовый остаток не найден');
        return;
    }

    if (!confirm(`Удалить стартовый остаток на сумму ${formatCurrency(entry.totalAmount)}? Остатки склада пересчитаются.`)) {
        return;
    }

    initialStockEntries = initialStockEntries.filter(item => item.id !== entryId);
    saveData('initialStockEntries', initialStockEntries);
    syncIncomingProductsStock(true);
    logActivity('delete_initial_stock', {
        initialStockId: entry.id,
        totalAmount: entry.totalAmount,
        items: entry.items
    });
    renderDashboardInventoryOverview();
    loadProducts();
    loadIncomingData();
    loadMoneyData();
    updateStats();
}

function getSupplierReturnRows() {
    const coreRows = ['tobacco', 'smallDefect', 'roast', 'bigDefect']
        .map(key => getIncomingReceiptItemConfig(key))
        .filter(Boolean);
    const productRows = products
        .filter(product => !isCoreIncomingProduct(product))
        .slice()
        .sort((left, right) => {
            const categoryCompare = String(left.category || '').localeCompare(String(right.category || ''), 'ru');
            if (categoryCompare !== 0) return categoryCompare;
            return String(left.name || '').localeCompare(String(right.name || ''), 'ru');
        })
        .map(createIncomingProductItemConfig)
        .filter(Boolean);

    return [...coreRows, ...productRows];
}

function formatSupplierReturnAvailability(availability = {}, config = {}) {
    const piecesText = `${formatQuantity(availability.pieces || 0, 'шт')} шт`;
    if (config.allowKgInput !== false) {
        return `${piecesText}${(Number(availability.kg) || 0) > 0 ? ` / ${formatQuantity(availability.kg, 'кг')} кг` : ''}`;
    }
    return piecesText;
}

function renderSupplierReturnModalRows() {
    const container = document.getElementById('supplierReturnItemsGrid');
    if (!container) return;

    const rows = getSupplierReturnRows();

    container.innerHTML = rows.map(config => {
        const priceInfo = getIncomingReceiptPriceInfo(config.key);
        const allowKgInput = config.allowKgInput !== false;
        const availability = getSupplierReturnAvailability(config.key, config.productId || priceInfo.productId);
        return `
            <div class="incoming-receipt-row ${allowKgInput ? '' : 'incoming-receipt-row--pieces-only'} ${config.key === 'tobacco' ? 'incoming-receipt-row--tobacco' : ''}" data-return-item="${escapeHtml(config.key)}" data-product-id="${escapeHtml(config.productId || priceInfo.productId || '')}">
                <div class="incoming-receipt-row-head">
                    <div class="incoming-receipt-row-title">
                        <i class="${config.icon}"></i>
                        <span>${escapeHtml(config.label)}</span>
                    </div>
                    <div class="incoming-receipt-row-price ${priceInfo.isReady ? '' : 'warning'}">
                        <strong>${escapeHtml(priceInfo.displayPrice)}</strong>
                        <small>${escapeHtml(priceInfo.sourceLabel)} • остаток ${escapeHtml(formatSupplierReturnAvailability(availability, config))}</small>
                    </div>
                </div>
                <div class="incoming-receipt-row-body">
                    <label class="incoming-receipt-input">
                        <span>Сколько штук вернуть</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            class="form-control supplier-return-pieces"
                            data-return-key="${escapeHtml(config.key)}"
                            placeholder="0"
                            oninput="updateSupplierReturnSummary()"
                        >
                    </label>
                    ${config.key === 'tobacco' ? `
                    <label class="incoming-receipt-input incoming-receipt-input-wide">
                        <span>Тип табачного возврата</span>
                        <select
                            class="form-control supplier-return-tobacco-type"
                            data-return-key="${escapeHtml(config.key)}"
                            onchange="updateSupplierReturnSummary()"
                        >
                            ${INCOMING_TOBACCO_MIXED_TYPES.map(type => `
                                <option value="${type}" ${type === AUTO_TOBACCO_MIXED_TYPE ? 'selected' : ''}>${getTobaccoTypeSummary(type)}</option>
                            `).join('')}
                        </select>
                    </label>
                    ` : ''}
                    ${allowKgInput ? `
                    <label class="incoming-receipt-input">
                        <span>Сколько кг вернуть</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="form-control supplier-return-kg"
                            data-return-key="${escapeHtml(config.key)}"
                            placeholder="0"
                            oninput="updateSupplierReturnSummary()"
                        >
                    </label>
                    ` : ''}
                    <div class="incoming-receipt-line-total">
                        <span>Стоимость возврата</span>
                        <strong class="supplier-return-line-total">0 ₽</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function collectSupplierReturnFormItems() {
    return Array.from(document.querySelectorAll('#supplierReturnItemsGrid .incoming-receipt-row[data-return-item]')).map(row => {
        const key = row.dataset.returnItem || '';
        const config = getIncomingReceiptItemConfig(key);
        const piecesQty = Math.max(0, parseFloat(row.querySelector('.supplier-return-pieces')?.value || '0') || 0);
        const kgQty = Math.max(0, parseFloat(row.querySelector('.supplier-return-kg')?.value || '0') || 0);
        const tobaccoMixedType = config?.key === 'tobacco'
            ? sanitizeIncomingTobaccoMixedType(row.querySelector('.supplier-return-tobacco-type')?.value || AUTO_TOBACCO_MIXED_TYPE)
            : '';
        const priceInfo = getIncomingReceiptPriceInfo(key);

        return normalizeIncomingReceiptItem({
            key,
            piecesQty,
            kgQty,
            tobaccoMixedType,
            pricingUnit: priceInfo.pricingUnit,
            unitPrice: priceInfo.unitPrice,
            sourceLabel: priceInfo.sourceLabel,
            productId: row.dataset.productId || priceInfo.productId || config?.productId || null,
            lineTotal: calculateIncomingReceiptLineTotal({
                pricingUnit: priceInfo.pricingUnit,
                unitPrice: priceInfo.unitPrice,
                piecesQty,
                kgQty
            })
        });
    }).filter(item => item.piecesQty > 0 || item.kgQty > 0);
}

function getSupplierReturnAvailability(configKey, productId = '') {
    const state = calculateIncomingInventoryState(getTodayDateKey());
    const tobaccoStock = getTobaccoStockPiecesFromState(state.categories?.tobacco || {});
    const roastState = state.categories?.roast || {};
    const roastStock = getRoastStockPiecesFromState(roastState);
    const roastKg = getRoastStockKgFromState(roastState);
    const config = getIncomingReceiptItemConfig(configKey);
    const product = productId
        ? products.find(productEntry => String(productEntry.id) === String(productId))
        : (config?.productId
            ? products.find(productEntry => String(productEntry.id) === String(config.productId))
            : findIncomingProductByAliases(config?.aliases || []));

    if (configKey === 'tobacco') return { pieces: tobaccoStock.total, kg: 0 };
    if (configKey === 'smallDefect') return { pieces: tobaccoStock.defect, kg: 0 };
    if (configKey === 'roast') return { pieces: roastStock.total, kg: roastKg };
    if (configKey === 'bigDefect') return { pieces: roastStock.defect, kg: roastKg };

    if (!product) return { pieces: 0, kg: 0 };
    if (isKgUnit(product.unit)) {
        return { pieces: getProductPieceQuantity(product), kg: Math.max(0, Number(product.quantity) || 0) };
    }
    return { pieces: Math.max(0, Number(product.quantity) || 0), kg: 0 };
}

function validateSupplierReturnItems(items = []) {
    for (const item of items) {
        const config = getIncomingReceiptItemConfig(item.key);
        const availability = getSupplierReturnAvailability(item.key, item.productId);
        const piecesQty = Math.max(0, Number(item.piecesQty) || 0);
        const kgQty = Math.max(0, Number(item.kgQty) || 0);
        const product = item.productId
            ? products.find(productEntry => String(productEntry.id) === String(item.productId))
            : (config?.productId
                ? products.find(productEntry => String(productEntry.id) === String(config.productId))
                : findIncomingProductByAliases(config?.aliases || []));
        const isKgControlled = config?.allowKgInput !== false
            && (['roast', 'bigDefect', 'soup', 'offal'].includes(item.key) || isKgUnit(product?.unit));

        if (piecesQty > availability.pieces + 0.0001) {
            alert(`Недостаточно остатков для возврата "${item.label}". Доступно: ${formatQuantity(availability.pieces, 'шт')} шт`);
            return false;
        }

        if (kgQty > 0 && kgQty > availability.kg + 0.0001) {
            alert(`Недостаточно килограмм для возврата "${item.label}". Доступно: ${formatQuantity(availability.kg, 'кг')} кг`);
            return false;
        }

        if (isKgControlled && (kgQty <= 0) && (piecesQty > 0) && (!product || isKgUnit(product.unit) || item.key === 'roast' || item.key === 'bigDefect')) {
            alert(`Для возврата "${item.label}" укажите вес в кг`);
            return false;
        }
    }

    return true;
}

function updateSupplierReturnSummary() {
    const totalEl = document.getElementById('supplierReturnComputedTotal');
    const metaEl = document.getElementById('supplierReturnComputedMeta');
    const warningEl = document.getElementById('supplierReturnWarning');
    const items = collectSupplierReturnFormItems();
    const itemsByKey = new Map(items.map(item => [item.key, item]));
    let totalAmount = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const warnings = [];

    Array.from(document.querySelectorAll('#supplierReturnItemsGrid .incoming-receipt-row[data-return-item]')).forEach(row => {
        const key = row.dataset.returnItem || '';
        const item = itemsByKey.get(key);
        const config = getIncomingReceiptItemConfig(key);
        const lineTotal = item ? item.lineTotal : 0;
        const lineEl = row.querySelector('.supplier-return-line-total');
        if (lineEl) lineEl.textContent = formatCurrency(lineTotal);

        if (item) {
            const priceInfo = getIncomingReceiptPriceInfo(key);
            if (!priceInfo.isReady) {
                warnings.push(`для позиции "${config?.label || item.label}" не найдена цена`);
            }
        }
    });

    if (totalEl) totalEl.textContent = formatCurrency(totalAmount);
    if (metaEl) {
        metaEl.textContent = items.length
            ? `Заполнено позиций: ${items.length}. Возврат уменьшит остатки склада и стоимость товара.`
            : 'Заполни товар, который нужно вернуть поставщику.';
    }
    if (warningEl) {
        warningEl.style.display = warnings.length ? 'block' : 'none';
        warningEl.textContent = warnings.length ? `Внимание: ${warnings.join(', ')}.` : '';
    }
}

function showSupplierReturnModal() {
    document.getElementById('supplierReturnModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'supplierReturnModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content incoming-receipt-modal-content">
            <div class="modal-header">
                <h3>Возврат поставщику</h3>
                <span class="close" onclick="removeModal(this)">&times;</span>
            </div>
            <div class="modal-body">
                <form id="supplierReturnForm">
                    <div class="incoming-receipt-top">
                        <div class="form-group">
                            <label for="supplierReturnDate">Дата возврата</label>
                            <input type="date" id="supplierReturnDate" class="form-control" value="${getTodayDateKey()}" ${isSellerMode() ? 'disabled' : ''}>
                        </div>
                        <div class="form-group">
                            <label for="supplierReturnName">Поставщик</label>
                            <input type="text" id="supplierReturnName" class="form-control" placeholder="Поставщик">
                        </div>
                    </div>
                    <div class="incoming-receipt-summary-card">
                        <div>
                            <span>Стоимость возврата</span>
                            <strong id="supplierReturnComputedTotal">0 ₽</strong>
                        </div>
                    </div>
                    <div id="supplierReturnComputedMeta" class="incoming-hint">Заполни товар, который нужно вернуть поставщику.</div>
                    <div id="supplierReturnWarning" class="incoming-receipt-warning" style="display: none;"></div>
                    <div class="incoming-receipt-list-header">
                        <span>Что возвращаем</span>
                        <small>Программа спишет эти остатки со склада. Деньги и долг поставщику отдельно не меняются.</small>
                    </div>
                    <div id="supplierReturnItemsGrid" class="incoming-receipt-grid"></div>
                    <div class="form-group">
                        <label for="supplierReturnNote">Комментарий</label>
                        <textarea id="supplierReturnNote" class="form-control" rows="3" placeholder="Например: товар плохого качества, поставщик забрал обратно"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="removeModal(this)">Отмена</button>
                <button class="btn btn-warning" onclick="saveSupplierReturn()">Сделать возврат</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    renderSupplierReturnModalRows();
    updateSupplierReturnSummary();
    openModal('supplierReturnModal');
}

function saveSupplierReturn() {
    const items = collectSupplierReturnFormItems();
    const dateKey = isSellerMode()
        ? getTodayDateKey()
        : (document.getElementById('supplierReturnDate')?.value || getTodayDateKey());
    const supplierName = document.getElementById('supplierReturnName')?.value?.trim() || 'Поставщик';
    const note = document.getElementById('supplierReturnNote')?.value?.trim() || '';

    if (!items.length) {
        alert('Укажите хотя бы одну позицию для возврата');
        return;
    }

    if (!validateSupplierReturnItems(items)) {
        return;
    }

    const summary = getIncomingReceiptItemsSummary(items);
    const entry = normalizeSupplierReturn({
        id: generateId(),
        supplierName,
        note,
        totalAmount: summary.totalAmount,
        items,
        goodQty: summary.goodQty,
        bigDefectQty: summary.bigDefectQty,
        smallDefectQty: summary.smallDefectQty,
        tobaccoPieces: summary.tobaccoPieces,
        tobaccoKg: summary.tobaccoKg,
        roastPieces: summary.roastPieces,
        roastKg: summary.roastKg,
        smallDefectPieces: summary.smallDefectPieces,
        smallDefectKg: summary.smallDefectKg,
        bigDefectPieces: summary.bigDefectPieces,
        bigDefectKg: summary.bigDefectKg,
        soupPieces: summary.soupPieces,
        soupKg: summary.soupKg,
        offalPieces: summary.offalPieces,
        offalKg: summary.offalKg,
        tobaccoMixedType: items.find(item => item.key === 'tobacco')?.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE,
        createdAt: new Date().toISOString(),
        date: buildStorageDateFromDateKey(dateKey),
        dateKey,
        createdBy: getActorLabel(),
        shiftId: getCurrentShift()?.id || null
    });

    supplierReturns.push(entry);
    saveData('supplierReturns', supplierReturns);
    syncIncomingProductsStock(true);
    const returnedPieces = items.reduce((sum, item) => sum + (Number(item.piecesQty) || 0), 0);
    addMovement('Возврат поставщику', `Возврат товара поставщику "${entry.supplierName}" на сумму ${formatCurrency(entry.totalAmount)}${note ? `: ${note}` : ''}`, -returnedPieces);
    logActivity('supplier_return', {
        supplierReturnId: entry.id,
        supplierName: entry.supplierName,
        totalAmount: entry.totalAmount,
        items: entry.items,
        note
    });

    closeModal('supplierReturnModal');
    document.getElementById('supplierReturnModal')?.remove();
    loadProductsToSelects();
    loadProducts();
    renderDashboardInventoryOverview();
    loadIncomingData();
    updateStats();
    alert('Возврат поставщику сохранён, остатки склада пересчитаны');
}

function getSupplierReturnOtherProductPieces(entry = {}) {
    const coreKeys = new Set(['tobacco', 'smallDefect', 'roast', 'bigDefect']);
    return getIncomingReceiptItems(entry)
        .filter(item => !coreKeys.has(item.key))
        .reduce((sum, item) => sum + (Number(item.piecesQty) || 0), 0);
}

function renderSupplierReturnsHistoryHtml() {
    const entries = getSupplierReturnEntries()
        .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
    const totalValue = entries.reduce((sum, entry) => sum + (Number(entry.totalAmount) || 0), 0);

    return `
        <div class="supplier-return-panel">
            <div class="inventory-control-head">
                <div>
                    <strong>Возвраты поставщику</strong>
                    <small>Списывают плохой товар со склада без создания продажи</small>
                </div>
                <button class="btn btn-warning btn-sm" onclick="showSupplierReturnModal()">
                    <i class="fas fa-rotate-left"></i> Сделать возврат
                </button>
            </div>
            <div class="incoming-supplier-total">
                <div>
                    <span>Возвратов</span>
                    <strong>${entries.length}</strong>
                </div>
                <div>
                    <span>Стоимость списанного</span>
                    <strong>${formatCurrency(totalValue)}</strong>
                </div>
                <div>
                    <span>Влияет на</span>
                    <strong>Склад и стоимость товара</strong>
                </div>
                <div>
                    <span>Продажи</span>
                    <strong>Не меняет</strong>
                </div>
            </div>
            ${entries.length ? `
                <div class="incoming-history-list">
                    ${entries.slice(0, 6).map(entry => `
                        <div class="incoming-history-card">
                            <div class="incoming-history-head">
                                <div>
                                    <strong>${escapeHtml(entry.supplierName || 'Поставщик')}</strong>
                                    <small>${formatDateShort(entry.date)} • ${escapeHtml(entry.createdBy || 'Не указано')}</small>
                                </div>
                                <span class="incoming-status warning">Возврат</span>
                            </div>
                            <div class="incoming-history-grid">
                                <div><span>Стоимость</span><strong>${formatCurrency(entry.totalAmount)}</strong></div>
                                <div><span>Табак</span><strong>${formatQuantity(entry.tobaccoPieces + entry.smallDefectPieces, 'шт')} шт</strong></div>
                                <div><span>Жарка</span><strong>${formatQuantity(entry.roastPieces + entry.bigDefectPieces, 'шт')} шт</strong></div>
                                <div><span>Остальные товары</span><strong>${formatQuantity(getSupplierReturnOtherProductPieces(entry), 'шт')} шт</strong></div>
                            </div>
                            ${renderIncomingReceiptItemBreakdown(entry)}
                            ${entry.note ? `<div class="incoming-history-note">${escapeHtml(entry.note)}</div>` : ''}
                            <div class="incoming-history-actions">
                                <button class="btn btn-danger btn-sm" onclick="deleteSupplierReturn('${entry.id}')">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-center">Возвратов поставщику пока нет</p>'}
        </div>
    `;
}

function deleteSupplierReturn(entryId) {
    const entry = supplierReturns.find(item => item.id === entryId);
    if (!entry) {
        alert('Возврат не найден');
        return;
    }

    if (!confirm(`Удалить возврат поставщику на сумму ${formatCurrency(entry.totalAmount)}? Остатки склада пересчитаются.`)) {
        return;
    }

    supplierReturns = supplierReturns.filter(item => item.id !== entryId);
    saveData('supplierReturns', supplierReturns);
    syncIncomingProductsStock(true);
    logActivity('delete_supplier_return', {
        supplierReturnId: entry.id,
        totalAmount: entry.totalAmount,
        items: entry.items
    });
    renderDashboardInventoryOverview();
    loadProducts();
    loadIncomingData();
    updateStats();
}

function showAddIncomingReceiptModal() {
    if (isSellerMode() && !getCurrentShift()) {
        alert('Сначала откройте смену продавца');
        return;
    }

    const form = document.getElementById('incomingReceiptForm');
    const dateInput = document.getElementById('incomingReceiptDate');
    const editIdInput = document.getElementById('incomingReceiptEditId');
    const title = document.getElementById('incomingReceiptModalTitle');
    const saveBtn = document.getElementById('incomingReceiptSaveBtn');
    if (form) form.reset();
    if (editIdInput) editIdInput.value = '';
    if (title) title.textContent = 'Принять накладную поставщика';
    if (saveBtn) saveBtn.textContent = 'Сохранить приход';
    if (dateInput) {
        dateInput.value = isSellerMode() ? getTodayDateKey() : getIncomingSelectedDate();
        dateInput.disabled = isSellerMode();
    }
    renderIncomingReceiptModalRows();
    updateIncomingReceiptSummary();
    openModal('incomingReceiptModal');
}

function createIncomingReceipt() {
    const editId = document.getElementById('incomingReceiptEditId')?.value || '';
    const supplierName = document.getElementById('incomingSupplierName')?.value?.trim() || 'Поставщик';
    const invoiceNumber = document.getElementById('incomingInvoiceNumber')?.value?.trim() || '';
    const note = document.getElementById('incomingReceiptNote')?.value?.trim() || '';
    const items = collectIncomingReceiptFormItems();
    const dateKey = isSellerMode()
        ? getTodayDateKey()
        : (document.getElementById('incomingReceiptDate')?.value || getTodayDateKey());

    if (!items.length) {
        alert('Укажи хотя бы одну позицию в приходной накладной');
        return;
    }

    const missingPriceItem = items.find(item => {
        const priceInfo = getIncomingReceiptPriceInfo(item.key);
        return !priceInfo.isReady;
    });

    if (missingPriceItem) {
        alert(`Для позиции "${missingPriceItem.label}" не найдена цена. Проверь настройки или товар в разделе "Товары".`);
        return;
    }

    const summary = getIncomingReceiptItemsSummary(items);
    const totalAmount = summary.totalAmount;

    if (editId) {
        const receiptIndex = incomingReceipts.findIndex(item => item.id === editId);
        if (receiptIndex === -1) {
            alert('Приходная накладная не найдена');
            return;
        }

        const currentReceipt = incomingReceipts[receiptIndex];
        const beforeSnapshot = createReceiptAuditSnapshot(currentReceipt);
        if (totalAmount < Number(currentReceipt.paidAmount || 0)) {
            alert(`Новая сумма накладной меньше уже оплаченной суммы ${formatCurrency(currentReceipt.paidAmount)}. Сначала скорректируй оплаты.`);
            return;
        }

        const updatedReceipt = normalizeIncomingReceipt({
            ...currentReceipt,
            supplierName,
            invoiceNumber,
            note,
            totalAmount,
            items,
            goodQty: summary.goodQty,
            bigDefectQty: summary.bigDefectQty,
            smallDefectQty: summary.smallDefectQty,
            tobaccoPieces: summary.tobaccoPieces,
            tobaccoKg: summary.tobaccoKg,
            roastPieces: summary.roastPieces,
            roastKg: summary.roastKg,
            smallDefectPieces: summary.smallDefectPieces,
            smallDefectKg: summary.smallDefectKg,
            bigDefectPieces: summary.bigDefectPieces,
            bigDefectKg: summary.bigDefectKg,
            soupPieces: summary.soupPieces,
            soupKg: summary.soupKg,
            offalPieces: summary.offalPieces,
            offalKg: summary.offalKg,
            tobaccoMixedType: items.find(item => item.key === 'tobacco')?.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE,
            date: buildStorageDateFromDateKey(dateKey),
            dateKey
        });

        incomingReceipts[receiptIndex] = updatedReceipt;
        saveData('incomingReceipts', incomingReceipts);
        syncIncomingProductsStock();
        logActivity('update_receipt', {
            receiptId: updatedReceipt.id,
            supplierName: updatedReceipt.supplierName,
            totalAmount: updatedReceipt.totalAmount,
            beforeReceiptSnapshot: beforeSnapshot,
            afterReceiptSnapshot: createReceiptAuditSnapshot(updatedReceipt)
        });
    } else {
        const receipt = normalizeIncomingReceipt({
            id: generateId(),
            supplierName,
            invoiceNumber,
            note,
            totalAmount,
            paidAmount: 0,
            items,
            goodQty: summary.goodQty,
            bigDefectQty: summary.bigDefectQty,
            smallDefectQty: summary.smallDefectQty,
            tobaccoPieces: summary.tobaccoPieces,
            tobaccoKg: summary.tobaccoKg,
            roastPieces: summary.roastPieces,
            roastKg: summary.roastKg,
            smallDefectPieces: summary.smallDefectPieces,
            smallDefectKg: summary.smallDefectKg,
            bigDefectPieces: summary.bigDefectPieces,
            bigDefectKg: summary.bigDefectKg,
            soupPieces: summary.soupPieces,
            soupKg: summary.soupKg,
            offalPieces: summary.offalPieces,
            offalKg: summary.offalKg,
            tobaccoMixedType: items.find(item => item.key === 'tobacco')?.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE,
            acceptedBy: getCurrentSellerNameForIncoming(),
            createdAt: new Date().toISOString(),
            date: buildStorageDateFromDateKey(dateKey),
            dateKey,
            shiftId: getCurrentShift()?.id || null,
            paymentHistory: []
        });

        incomingReceipts.push(receipt);
        saveData('incomingReceipts', incomingReceipts);
        syncIncomingProductsStock(false, { applyMissingAsDelta: true });
        logActivity('create_receipt', {
            receiptId: receipt.id,
            supplierName: receipt.supplierName,
            totalAmount: receipt.totalAmount,
            sellerName: receipt.acceptedBy,
            receiptSnapshot: createReceiptAuditSnapshot(receipt)
        });
    }

    loadProductsToSelects();
    closeModal('incomingReceiptModal');
    loadIncomingData();
    loadDashboardData();
    updateStats();
}

function showEditIncomingReceiptModal(receiptId) {
    const receipt = incomingReceipts.find(item => item.id === receiptId);
    if (!receipt) {
        alert('Приходная накладная не найдена');
        return;
    }
    if (isSellerMode() && receipt.dateKey !== getTodayDateKey()) {
        alert('Работник может редактировать только сегодняшний приход');
        return;
    }

    const form = document.getElementById('incomingReceiptForm');
    const editIdInput = document.getElementById('incomingReceiptEditId');
    const title = document.getElementById('incomingReceiptModalTitle');
    const saveBtn = document.getElementById('incomingReceiptSaveBtn');
    if (form) form.reset();
    renderIncomingReceiptModalRows();

    if (editIdInput) editIdInput.value = receipt.id;
    if (title) title.textContent = 'Редактировать приходную накладную';
    if (saveBtn) saveBtn.textContent = 'Сохранить изменения';

    const dateInput = document.getElementById('incomingReceiptDate');
    if (dateInput) {
        dateInput.value = receipt.dateKey || getTodayDateKey();
        dateInput.disabled = isSellerMode();
    }
    const supplierInput = document.getElementById('incomingSupplierName');
    if (supplierInput) supplierInput.value = receipt.supplierName || '';
    const invoiceInput = document.getElementById('incomingInvoiceNumber');
    if (invoiceInput) invoiceInput.value = receipt.invoiceNumber || '';
    const noteInput = document.getElementById('incomingReceiptNote');
    if (noteInput) noteInput.value = receipt.note || '';

    getIncomingReceiptItems(receipt).forEach(item => {
        const piecesInput = document.querySelector(`.incoming-receipt-pieces[data-incoming-key="${item.key}"]`);
        const kgInput = document.querySelector(`.incoming-receipt-kg[data-incoming-key="${item.key}"]`);
        const tobaccoTypeInput = document.querySelector(`.incoming-receipt-tobacco-type[data-incoming-key="${item.key}"]`);
        if (piecesInput) piecesInput.value = item.piecesQty || '';
        if (kgInput) kgInput.value = item.kgQty || '';
        if (tobaccoTypeInput && item.key === 'tobacco') tobaccoTypeInput.value = item.tobaccoMixedType || receipt.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE;
    });

    updateIncomingReceiptSummary();
    openModal('incomingReceiptModal');
}

function archiveIncomingReceipt(receiptId) {
    const receiptIndex = incomingReceipts.findIndex(item => item.id === receiptId);
    if (receiptIndex === -1) {
        alert('Приходная накладная не найдена');
        return;
    }

    if (!confirm('Убрать эту приходную накладную из активного списка и перенести в архив?')) {
        return;
    }

    const receipt = incomingReceipts[receiptIndex];
    archivedIncomingReceipts.unshift(normalizeArchivedIncomingReceipt({
        ...receipt,
        archivedAt: new Date().toISOString(),
        archivedBy: sessionAccess.userName || 'Руководитель',
        archiveReason: 'Перенесено в архив'
    }));
    incomingReceipts.splice(receiptIndex, 1);
    saveData('incomingReceipts', incomingReceipts);
    saveData('archivedIncomingReceipts', archivedIncomingReceipts);
    syncIncomingProductsStock();
    logActivity('archive_receipt', {
        receiptId: receipt.id,
        supplierName: receipt.supplierName,
        totalAmount: receipt.totalAmount,
        receiptSnapshot: createReceiptAuditSnapshot(receipt)
    });

    loadProductsToSelects();
    loadIncomingData();
    loadDashboardData();
    updateStats();
}

function updateProductionAvailabilityHint() {
    const hint = document.getElementById('packageProductionHint');
    if (!hint) return;

    const dateKey = isSellerMode()
        ? getTodayDateKey()
        : (document.getElementById('packageProductionDate')?.value || getTodayDateKey());
    const state = calculateIncomingInventoryState(dateKey);
    const tobaccoState = state.categories?.tobacco || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { total: 0 } };
    const roastState = state.categories?.roast || { rawRemaining: { good: 0, defect: 0 }, finishedRemaining: { total: 0 } };

    hint.innerHTML = `
        Остатки сейчас: табак <strong>${formatQuantity(tobaccoState.rawRemaining.good, 'шт')}</strong>,
        маленький брак <strong>${formatQuantity(tobaccoState.rawRemaining.defect, 'шт')}</strong>,
        жарка <strong>${formatQuantity(roastState.rawRemaining.good, 'шт')}</strong>,
        большой брак <strong>${formatQuantity(roastState.rawRemaining.defect, 'шт')}</strong>.
        Готовых пакетов: табачных <strong>${formatQuantity(tobaccoState.finishedRemaining.total, 'шт')}</strong>,
        жарки <strong>${formatQuantity(roastState.finishedRemaining.total, 'шт')}</strong>.
    `;
}

function showPackageProductionModal() {
    if (isSellerMode() && !getCurrentShift()) {
        alert('Сначала откройте смену продавца');
        return;
    }

    const form = document.getElementById('packageProductionForm');
    const dateInput = document.getElementById('packageProductionDate');
    if (form) form.reset();
    if (dateInput) {
        dateInput.value = isSellerMode() ? getTodayDateKey() : getIncomingSelectedDate();
    }
    updateProductionAvailabilityHint();
    openModal('packageProductionModal');
}

function createPackageProduction() {
    const dateKey = isSellerMode()
        ? getTodayDateKey()
        : (document.getElementById('packageProductionDate')?.value || getTodayDateKey());
    const goodUsedQty = parseFloat(document.getElementById('packageGoodUsedQty')?.value || '0') || 0;
    const bigDefectUsedQty = parseFloat(document.getElementById('packageBigDefectUsedQty')?.value || '0') || 0;
    const smallDefectUsedQty = parseFloat(document.getElementById('packageSmallDefectUsedQty')?.value || '0') || 0;
    const mixedPacksProduced = parseFloat(document.getElementById('packageMixedProduced')?.value || '0') || 0;
    const purePacksProduced = parseFloat(document.getElementById('packagePureProduced')?.value || '0') || 0;
    const note = document.getElementById('packageProductionNote')?.value?.trim() || '';

    if ((goodUsedQty + bigDefectUsedQty + smallDefectUsedQty) <= 0) {
        alert('Укажите, сколько табака, жарки или брака ушло на фасовку');
        return;
    }

    if ((mixedPacksProduced + purePacksProduced) <= 0) {
        alert('Укажите, сколько готовых пакетов получилось');
        return;
    }

    const state = calculateIncomingInventoryState(dateKey);
    if (goodUsedQty > state.rawRemaining.good) {
        alert(`Недостаточно табака или жарки. Сейчас доступно ${formatQuantity(state.rawRemaining.good, 'шт')} шт`);
        return;
    }
    if (bigDefectUsedQty > state.rawRemaining.bigDefect) {
        alert(`Недостаточно большого брака. Сейчас доступно ${formatQuantity(state.rawRemaining.bigDefect, 'шт')} шт`);
        return;
    }
    if (smallDefectUsedQty > state.rawRemaining.smallDefect) {
        alert(`Недостаточно малого брака. Сейчас доступно ${formatQuantity(state.rawRemaining.smallDefect, 'шт')} шт`);
        return;
    }

    const entry = normalizePackageProduction({
        id: generateId(),
        createdAt: new Date().toISOString(),
        date: `${dateKey}T12:00:00`,
        dateKey,
        createdBy: getCurrentSellerNameForIncoming(),
        shiftId: getCurrentShift()?.id || null,
        note,
        goodUsedQty,
        bigDefectUsedQty,
        smallDefectUsedQty,
        mixedPacksProduced,
        purePacksProduced
    });

    packageProductions.push(entry);
    saveData('packageProductions', packageProductions);
    logActivity('package_production', {
        mixedPacksProduced,
        purePacksProduced,
        sellerName: entry.createdBy
    });

    closeModal('packageProductionModal');
    loadIncomingData();
}

function showReceiptPaymentModal(receiptId) {
    const receipt = incomingReceipts.find(item => item.id === receiptId);
    if (!receipt) {
        alert('Приходная накладная не найдена');
        return;
    }

    document.getElementById('receiptPaymentId').value = receipt.id;
    document.getElementById('receiptPaymentMode').value = 'single';
    document.getElementById('receiptPaymentAmount').value = '';
    document.getElementById('receiptPaymentNote').value = '';
    populateMoneyWalletSelects();
    const walletSelect = document.getElementById('receiptPaymentWallet');
    if (walletSelect) walletSelect.value = getCashControlSettings().defaultReceiverWallet;
    document.getElementById('receiptPaymentSummary').innerHTML = `
        <div><strong>${escapeHtml(receipt.supplierName || 'Поставщик')}</strong></div>
        <div>Накладная: ${receipt.invoiceNumber ? `№${escapeHtml(receipt.invoiceNumber)}` : 'без номера'}</div>
        <div>Сумма: ${formatCurrency(receipt.totalAmount)} | Уже оплачено: ${formatCurrency(receipt.paidAmount)} | Осталось: ${formatCurrency(getReceiptOutstandingAmount(receipt))}</div>
    `;

    openModal('receiptPaymentModal');
}

function showSupplierTotalPaymentModal() {
    const openReceipts = getOpenIncomingReceiptsOldestFirst();
    const totalOutstanding = openReceipts.reduce((sum, receipt) => sum + getReceiptOutstandingAmount(receipt), 0);

    if (totalOutstanding <= 0) {
        alert('У поставщика нет открытого долга');
        return;
    }

    document.getElementById('receiptPaymentId').value = '';
    document.getElementById('receiptPaymentMode').value = 'aggregate';
    document.getElementById('receiptPaymentAmount').value = '';
    document.getElementById('receiptPaymentNote').value = '';
    populateMoneyWalletSelects();
    const walletSelect = document.getElementById('receiptPaymentWallet');
    if (walletSelect) walletSelect.value = getCashControlSettings().defaultReceiverWallet;
    document.getElementById('receiptPaymentSummary').innerHTML = `
        <div><strong>Общая оплата поставщику</strong></div>
        <div>Открытых приходных накладных: ${openReceipts.length}</div>
        <div>Общий долг: ${formatCurrency(totalOutstanding)}</div>
        <div>Оплата распределится автоматически: сначала закроются самые старые накладные, потом более новые.</div>
    `;

    openModal('receiptPaymentModal');
}

function saveReceiptPayment() {
    const paymentMode = document.getElementById('receiptPaymentMode')?.value || 'single';
    const receiptId = document.getElementById('receiptPaymentId')?.value;
    const amount = parseFloat(document.getElementById('receiptPaymentAmount')?.value || '0') || 0;
    const note = document.getElementById('receiptPaymentNote')?.value?.trim() || '';
    const paymentWallet = sanitizeMoneyWalletId(document.getElementById('receiptPaymentWallet')?.value || getCashControlSettings().defaultReceiverWallet);

    if (amount <= 0) {
        alert('Введите сумму оплаты');
        return;
    }

    if (paymentMode === 'aggregate') {
        const totalOutstanding = getOpenIncomingReceiptsOldestFirst().reduce((sum, receipt) => sum + getReceiptOutstandingAmount(receipt), 0);
        if (amount > totalOutstanding) {
            alert(`Нельзя оплатить больше общего долга. Осталось ${formatCurrency(totalOutstanding)}`);
            return;
        }

        const distribution = distributeSupplierPaymentAcrossReceipts(amount, note);
        saveData('incomingReceipts', incomingReceipts);
        const moneyTransaction = recordMoneyTransaction({
            type: 'supplier_payment',
            amount: distribution.appliedAmount,
            fromWallet: paymentWallet,
            category: 'Оплата поставщику',
            counterparty: 'Поставщик',
            note: note || 'Общая оплата поставщику',
            sourceId: `supplier-total-${Date.now()}`
        });
        logActivity('supplier_total_payment', {
            amount: distribution.appliedAmount,
            allocationsCount: distribution.allocations.length,
            fromWallet: paymentWallet,
            moneyTransactionId: moneyTransaction?.id || null,
            remaining: totalOutstanding - distribution.appliedAmount,
            allocations: distribution.allocations.map(allocation => {
                const receipt = incomingReceipts.find(item => item.id === allocation.receiptId);
                return {
                    ...allocation,
                    remaining: receipt ? getReceiptOutstandingAmount(receipt) : 0
                };
            })
        });
    } else {
        const receipt = incomingReceipts.find(item => item.id === receiptId);

        if (!receipt) {
            alert('Приходная накладная не найдена');
            return;
        }

        const outstanding = getReceiptOutstandingAmount(receipt);
        if (amount > outstanding) {
            alert(`Нельзя оплатить больше остатка. Осталось ${formatCurrency(outstanding)}`);
            return;
        }

        const payment = applyIncomingReceiptPayment(receipt, amount, note);
        saveData('incomingReceipts', incomingReceipts);
        const moneyTransaction = recordMoneyTransaction({
            type: 'supplier_payment',
            amount,
            fromWallet: paymentWallet,
            category: 'Оплата поставщику',
            counterparty: receipt.supplierName || 'Поставщик',
            note: note || (receipt.invoiceNumber ? `Накладная №${receipt.invoiceNumber}` : 'Оплата приходной накладной'),
            receiptId: receipt.id,
            sourceId: payment?.id || null
        });
        logActivity('receipt_payment', {
            receiptId: receipt.id,
            supplierName: receipt.supplierName,
            amount,
            fromWallet: paymentWallet,
            moneyTransactionId: moneyTransaction?.id || null,
            remaining: getReceiptOutstandingAmount(receipt),
            receiptSnapshot: createReceiptAuditSnapshot(receipt)
        });
    }

    closeModal('receiptPaymentModal');
    loadIncomingData();
    loadDashboardData();
    loadMoneyData();
}

function restoreArchivedIncomingReceipt(receiptId) {
    const receiptIndex = archivedIncomingReceipts.findIndex(item => item.id === receiptId);
    if (receiptIndex === -1) {
        alert('Накладная не найдена в архиве');
        return;
    }

    const receipt = archivedIncomingReceipts[receiptIndex];
    archivedIncomingReceipts.splice(receiptIndex, 1);
    incomingReceipts.push(normalizeIncomingReceipt(receipt));
    saveData('incomingReceipts', incomingReceipts);
    saveData('archivedIncomingReceipts', archivedIncomingReceipts);
    syncIncomingProductsStock();
    logActivity('restore_receipt', {
        receiptId: receipt.id,
        supplierName: receipt.supplierName,
        totalAmount: receipt.totalAmount,
        receiptSnapshot: createReceiptAuditSnapshot(receipt)
    });
    showArchivedIncomingReceipts();
    loadProductsToSelects();
    loadIncomingData();
    loadDashboardData();
    updateStats();
}

function deleteArchivedIncomingReceiptPermanently(receiptId) {
    const receipt = archivedIncomingReceipts.find(item => item.id === receiptId);
    if (!receipt) {
        alert('Накладная не найдена в архиве');
        return;
    }

    if (!confirm('Удалить эту накладную из архива навсегда? Это действие нельзя отменить.')) {
        return;
    }

    archivedIncomingReceipts = archivedIncomingReceipts.filter(item => item.id !== receiptId);
    saveData('archivedIncomingReceipts', archivedIncomingReceipts);
    logActivity('delete_receipt_permanent', {
        receiptId: receipt.id,
        supplierName: receipt.supplierName,
        totalAmount: receipt.totalAmount,
        receiptSnapshot: createReceiptAuditSnapshot(receipt)
    });
    showArchivedIncomingReceipts();
    loadIncomingData();
    loadDashboardData();
    updateStats();
}

function showArchivedIncomingReceipts() {
    const modalId = 'archivedIncomingReceiptsModal';
    document.getElementById(modalId)?.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal open';
    modal.innerHTML = `
        <div class="modal-content modal-large" style="max-height: 92vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h3>Архив приходных накладных</h3>
                <span class="close" onclick="removeModal(this)">&times;</span>
            </div>
            <div class="modal-body" style="overflow-y: auto;">
                ${archivedIncomingReceipts.length ? archivedIncomingReceipts
                    .sort((left, right) => String(right.archivedAt || '').localeCompare(String(left.archivedAt || '')))
                    .map(receipt => `
                        <div class="incoming-history-card archived-receipt-card">
                            <div class="incoming-history-head">
                                <div>
                                    <strong>${escapeHtml(receipt.supplierName || 'Поставщик')}</strong>
                                    <small>${receipt.invoiceNumber ? `Накладная №${escapeHtml(receipt.invoiceNumber)}` : 'Без номера'} • ${formatDateShort(receipt.date)}</small>
                                </div>
                                <span class="incoming-status info">В архиве</span>
                            </div>
                            <div class="incoming-history-grid">
                                <div><span>Сумма</span><strong>${formatCurrency(receipt.totalAmount)}</strong></div>
                                <div><span>Оплачено</span><strong>${formatCurrency(receipt.paidAmount)}</strong></div>
                                <div><span>Архивирована</span><strong>${formatShortDateTime(receipt.archivedAt)}</strong></div>
                                <div><span>Кто архивировал</span><strong>${escapeHtml(receipt.archivedBy || 'Не указано')}</strong></div>
                            </div>
                            ${renderIncomingReceiptItemBreakdown(receipt)}
                            <div class="incoming-history-actions">
                                <button class="btn btn-success btn-sm" onclick="restoreArchivedIncomingReceipt('${receipt.id}')">
                                    <i class="fas fa-undo"></i> Восстановить
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="deleteArchivedIncomingReceiptPermanently('${receipt.id}')">
                                    <i class="fas fa-trash"></i> Удалить навсегда
                                </button>
                            </div>
                        </div>
                    `).join('')
                    : '<p class="text-center">Архив приходных накладных пока пуст</p>'}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="removeModal(this)">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// ==================== УТИЛИТЫ ====================

// Генерация ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Сохранение данных в основное локальное хранилище
function saveData(key, data) {
    schedulePersistentWrite(key, data);

    if (!LOCAL_ONLY_KEYS.has(key)) {
        markCloudPendingChange(key);
        scheduleCloudSync();
    }
}

function getCloudSyncMeta() {
    const meta = readStorageJson(CLOUD_SYNC_META_KEY, {}) || {};
    return {
        hasPendingChanges: Boolean(meta.hasPendingChanges),
        pendingSince: meta.pendingSince || '',
        lastLocalChangeAt: meta.lastLocalChangeAt || '',
        lastLocalDataUpdatedAt: meta.lastLocalDataUpdatedAt || '',
        lastSuccessfulPushAt: meta.lastSuccessfulPushAt || '',
        lastSuccessfulPullAt: meta.lastSuccessfulPullAt || '',
        lastSuccessfulSyncAt: meta.lastSuccessfulSyncAt || '',
        lastFailureAt: meta.lastFailureAt || '',
        lastFailureMessage: meta.lastFailureMessage || ''
    };
}

function saveCloudSyncMeta(meta = {}) {
    localStorage.setItem(CLOUD_SYNC_META_KEY, JSON.stringify({
        ...getCloudSyncMeta(),
        ...meta
    }));
    renderCloudSafetyBanner();
}

function markCloudPendingChange(reason = '') {
    const config = getCloudSyncConfig();
    if (!config.enabled) return;

    const now = new Date().toISOString();
    const current = getCloudSyncMeta();
    saveCloudSyncMeta({
        hasPendingChanges: true,
        pendingSince: current.pendingSince || now,
        lastLocalChangeAt: now,
        lastLocalDataUpdatedAt: now,
        pendingReason: reason || current.pendingReason || ''
    });
}

function clearCloudPendingChanges() {
    const now = new Date().toISOString();
    saveCloudSyncMeta({
        hasPendingChanges: false,
        pendingSince: '',
        lastSuccessfulPushAt: now,
        lastSuccessfulSyncAt: now,
        lastFailureMessage: ''
    });
}

function markCloudSyncFailure(error, fallback = 'Ошибка синхронизации') {
    saveCloudSyncMeta({
        lastFailureAt: new Date().toISOString(),
        lastFailureMessage: normalizeCloudError(error, fallback)
    });
}

function markCloudPullSuccess() {
    const now = new Date().toISOString();
    saveCloudSyncMeta({
        lastSuccessfulPullAt: now,
        lastSuccessfulSyncAt: now,
        lastFailureMessage: ''
    });
}

function hasPendingCloudChanges() {
    return getCloudSyncMeta().hasPendingChanges;
}

function formatCloudSyncTime(value) {
    if (!value) return 'не было';
    return formatShortDateTime(value);
}

function getCloudSafetyStatus() {
    const config = getCloudSyncConfig();
    const meta = getCloudSyncMeta();
    if (!config.enabled) {
        return { level: 'muted', title: 'Облако не настроено', detail: 'Данные сохраняются только на этом устройстве.' };
    }
    if (!navigator.onLine) {
        return { level: 'danger', title: 'Нет интернета', detail: 'Данные сохранены локально и отправятся после восстановления сети/VPN.' };
    }
    if (meta.hasPendingChanges) {
        return { level: 'danger', title: 'Есть неотправленные изменения', detail: `Сохранено локально с ${formatCloudSyncTime(meta.pendingSince)}. Включите VPN, данные отправятся автоматически.` };
    }
    if (cloudSyncState.lastError || meta.lastFailureMessage) {
        return { level: 'warning', title: 'Облако требует внимания', detail: cloudSyncState.lastError || meta.lastFailureMessage };
    }
    if (cloudSyncState.ready) {
        return { level: 'success', title: 'Облако активно', detail: `Последний обмен: ${formatCloudSyncTime(meta.lastSuccessfulSyncAt)}` };
    }
    return { level: 'warning', title: 'Облако подключается', detail: 'Если долго висит этот статус, проверьте VPN.' };
}

function renderCloudSafetyBanner() {
    if (typeof document === 'undefined' || !document.body) return;
    const config = getCloudSyncConfig();
    const meta = getCloudSyncMeta();
    const shouldShow = config.enabled && (!navigator.onLine || meta.hasPendingChanges || cloudSyncState.lastError || meta.lastFailureMessage);
    let banner = document.getElementById('cloud-safety-banner');

    if (!shouldShow) {
        if (banner) banner.remove();
        return;
    }

    const status = getCloudSafetyStatus();
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'cloud-safety-banner';
        document.body.appendChild(banner);
    }

    banner.className = `cloud-safety-banner cloud-safety-banner-${status.level}`;
    banner.innerHTML = `
        <div>
            <strong>${escapeHtml(status.title)}</strong>
            <span>${escapeHtml(status.detail)}</span>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="syncCloudNow()">
            <i class="fas fa-arrows-rotate"></i> Синхронизировать
        </button>
    `;
}

// Форматирование валюты
function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(amount);
}

// Форматирование даты
function formatDate(dateString) {
    return resolveDateInput(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Форматирование короткой даты (только дата без времени)
function formatDateShort(dateString) {
    return resolveDateInput(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Получить последний комментарий из истории долга
function getLastComment(debt) {
    // Сначала проверяем исходное описание долга
    if (debt.description) {
        return debt.description;
    }
    
    // Если нет исходного описания, ищем последний комментарий в истории
    const commentEntries = debt.history.filter(entry => entry.type === 'comment');
    if (commentEntries.length > 0) {
        // Возвращаем последний комментарий (самый новый)
        return commentEntries[commentEntries.length - 1].description;
    }
    
    return null;
}

// Функция форматирования количества с учетом единицы измерения
function formatQuantity(quantity, unit) {
    if (unit === 'кг') {
        return parseFloat(quantity).toFixed(2);
    } else {
        return Math.round(quantity);
    }
}

// Универсальная функция для разблокировки скролла
function unlockBodyScroll() {
    const openModals = document.querySelectorAll('.modal.open');
    if (openModals.length === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}

// Функция для закрытия модального окна через remove (для динамически созданных)
function removeModal(element) {
    const modal = element.closest('.modal');
    if (modal) {
        modal.remove();
        unlockBodyScroll();
    }
}

// Закрытие модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Полностью сбрасываем состояние модального окна
        modal.classList.remove('open');
        modal.style.display = '';
        
        // Удаляем модальное окно из DOM если это предпросмотр накладной
        if (modalId === 'previewInvoiceModal' || modalId === 'shiftInvoicesModal' || modalId === 'activityEntryDetailsModal') {
            modal.remove();
        }

        if (modalId === 'editInvoiceModal') {
            window.currentInvoiceEditApproval = null;
        }
        
        // Разблокируем скролл body, если нет других открытых модальных окон
        unlockBodyScroll();
    }
}

// Открытие модального окна
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Блокируем скролл body при открытии модального окна
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        
        // Используем flex-раскладку из CSS (.modal.open { display:flex; align-items:center; })
        modal.style.display = '';
        modal.classList.add('open');
    }
}

// Загрузка категорий в селекты
function loadCategoriesToSelects() {
    const selects = [
        document.getElementById('productCategory'),
        document.getElementById('editProductCategory'),
        document.getElementById('category-filter')
    ];
    
    selects.forEach(select => {
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Выберите категорию</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
            select.value = currentValue;
        }
    });
}

// Загрузка клиентов в селекты
function loadClientsToSelects() {
    // Обновляем только фильтр накладных (старый select)
    const filterSelect = document.getElementById('invoice-client-filter');
    
    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Все клиенты</option>';
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            filterSelect.appendChild(option);
        });
        
        filterSelect.value = currentValue;
    }
    
    // Для нового поискового поля клиенты уже доступны через глобальную переменную clients
    // и будут автоматически загружены при инициализации поиска
}

// Загрузка товаров в селекты
function loadProductsToSelects() {
    // Эта функция может быть расширена для загрузки товаров в селекты
    // если потребуется в будущем
}

// ==================== ПЕРСОНАЛЬНЫЕ ЦЕНЫ ====================

// Показать модальное окно персональных цен
function showPersonalPrices(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const container = document.getElementById('personal-prices-content');
    
    // Получаем персональные цены для этого клиента
    const clientPrices = personalPrices.filter(pp => pp.clientId === clientId);
    
    let content = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #2c3e50; margin-bottom: 10px;">
                <i class="fas fa-user" style="margin-right: 8px; color: #3498db;"></i>
                Клиент: ${client.name}
            </h4>
            <p style="color: #7f8c8d; font-size: 14px;">
                Установите персональные цены для товаров. Если цена не указана, будет использоваться стандартная цена.
            </p>
        </div>
        
        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6;">Товар</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6;">Стандартная цена</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6;">Персональная цена</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6;">Экономия</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    products.forEach(product => {
        const personalPrice = clientPrices.find(pp => pp.productId === product.id);
        const currentPrice = personalPrice ? personalPrice.price : product.salePrice;
        const savings = product.salePrice - currentPrice;
        
        content += `
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px;">
                    <div style="font-weight: 600; color: #2c3e50;">${product.name}</div>
                    <div style="font-size: 12px; color: #7f8c8d;">${product.unit}</div>
                </td>
                <td style="padding: 12px; color: #2c3e50;">
                    ${formatCurrency(product.salePrice)}
                </td>
                <td style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="number" 
                               id="personal-price-${product.id}" 
                               value="${currentPrice}" 
                               step="0.01" 
                               min="0"
                               style="width: 100px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;"
                               onchange="updatePersonalPrice('${clientId}', '${product.id}', this.value)">
                        ${personalPrice ? 
                            `<button onclick="removePersonalPrice('${clientId}', '${product.id}')" 
                                     style="padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" 
                                     title="Сбросить к стандартной цене">
                                <i class="fas fa-times"></i>
                             </button>` : ''
                        }
                    </div>
                </td>
                <td style="padding: 12px;">
                    ${savings > 0 ? 
                        `<span style="color: #27ae60; font-weight: 600;">-${formatCurrency(savings)}</span>` : 
                        personalPrice ? 
                        `<span style="color: #e74c3c; font-weight: 600;">+${formatCurrency(-savings)}</span>` : 
                        `<span style="color: #7f8c8d;">-</span>`
                    }
                </td>
            </tr>
        `;
    });
    
    content += `
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h5 style="margin-bottom: 10px; color: #2c3e50;">
                <i class="fas fa-info-circle" style="margin-right: 8px; color: #3498db;"></i>
                Сводка по персональным ценам
            </h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #3498db;">
                    <div style="font-size: 12px; color: #7f8c8d;">Всего товаров</div>
                    <div style="font-size: 18px; font-weight: 600; color: #2c3e50;">${products.length}</div>
                </div>
                <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #27ae60;">
                    <div style="font-size: 12px; color: #7f8c8d;">С персональными ценами</div>
                    <div style="font-size: 18px; font-weight: 600; color: #2c3e50;">${clientPrices.length}</div>
                </div>
                <div style="background: white; padding: 10px; border-radius: 6px; border-left: 4px solid #e74c3c;">
                    <div style="font-size: 12px; color: #7f8c8d;">Общая экономия</div>
                    <div style="font-size: 18px; font-weight: 600; color: #2c3e50;">
                        ${formatCurrency(clientPrices.reduce((sum, pp) => {
                            const product = products.find(p => p.id === pp.productId);
                            return sum + (product ? product.salePrice - pp.price : 0);
                        }, 0))}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = content;
    openModal('personalPricesModal');
}

// Обновить персональную цену
function updatePersonalPrice(clientId, productId, newPrice) {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    
    // Находим существующую персональную цену
    let personalPrice = personalPrices.find(pp => pp.clientId === clientId && pp.productId === productId);
    
    if (personalPrice) {
        // Обновляем существующую цену
        personalPrice.price = price;
        personalPrice.updatedAt = new Date().toISOString();
    } else {
        // Создаем новую персональную цену
        personalPrice = {
            id: generateId(),
            clientId: clientId,
            productId: productId,
            price: price,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        personalPrices.push(personalPrice);
    }
    
    saveData('personalPrices', personalPrices);
    
    // Обновляем отображение
    showPersonalPrices(clientId);
}

// Получить персональную цену для клиента и товара
function getPersonalPrice(clientId, productId) {
    const personalPrice = personalPrices.find(pp => pp.clientId === clientId && pp.productId === productId);
    return personalPrice ? personalPrice.price : null;
}

// Получить актуальную цену для клиента и товара
function getActualPrice(clientId, productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    const personalPrice = getPersonalPrice(clientId, productId);
    return personalPrice !== null ? personalPrice : product.salePrice;
}

// Удалить персональную цену (сброс к стандартной)
function removePersonalPrice(clientId, productId) {
    personalPrices = personalPrices.filter(pp => !(pp.clientId === clientId && pp.productId === productId));
    saveData('personalPrices', personalPrices);
    
    // Обновляем отображение
    showPersonalPrices(clientId);
}



// Закрытие модальных окон при клике вне их
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            const modalId = modal.id;
            if (modalId) {
                closeModal(modalId);
            } else {
                modal.classList.remove('open');
                modal.style.display = '';
                // Разблокируем скролл body, если нет других открытых модальных окон
                unlockBodyScroll();
            }
        }
    });
}

// ==================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ОЧИСТКИ ====================

// Функция для полной очистки локального хранилища
async function clearAllLocalStorage() {
    if (confirm('ВНИМАНИЕ! Это удалит ВСЕ данные из системы. Это действие необратимо.\n\nВы уверены?')) {
        if (confirm('Последнее предупреждение: Все данные будут удалены навсегда.\n\nНажмите OK для подтверждения.')) {
            // Очищаем все массивы
            categories = [];
            products = [];
            clients = [];
            invoices = [];
            archivedInvoices = [];
            debts = [];
            movements = [];
            reports = [];
            personalPrices = [];
            shiftSessions = [];
            activityLog = [];
            debtPayments = [];
            moneyTransactions = [];
            incomingReceipts = [];
            archivedIncomingReceipts = [];
            initialStockEntries = [];
            supplierReturns = [];
            packageProductions = [];
            openedStockEvents = [];
            
            // Полностью очищаем localStorage и IndexedDB
            localStorage.clear();
            if (persistentStorageState.available) {
                try {
                    await persistentDbClear();
                } catch (error) {
                    console.warn('Не удалось очистить IndexedDB:', error);
                }
            }
            
            // Перезагружаем страницу для полного сброса
            location.reload();
        }
    }
}

// Функция для проверки и очистки "мусора" в localStorage
function cleanupLocalStorage() {
    const keys = Object.keys(localStorage);
    const validKeys = [
        ...APP_STATE_FIELDS,
        ...EXTRA_STORAGE_FIELDS,
        'securitySettings',
        'sessionAccess',
        CLOUD_SYNC_CONFIG_BACKUP_KEY
    ];
    let cleanedCount = 0;
    
    keys.forEach(key => {
        if (!validKeys.includes(key)) {
            localStorage.removeItem(key);
            cleanedCount++;
        }
    });
    
    if (cleanedCount > 0) {
        alert(`Очищено ${cleanedCount} ненужных записей из localStorage!`);
    } else {
        alert('localStorage уже чистый!');
    }
}

function formatStorageSize(bytes = 0) {
    const safeBytes = Math.max(0, Number(bytes) || 0);
    const kb = safeBytes / 1024;
    const mb = safeBytes / (1024 * 1024);
    const gb = safeBytes / (1024 * 1024 * 1024);

    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${safeBytes.toFixed(0)} B`;
}

function getStorageStatusByPercent(usagePercent) {
    if (usagePercent < 50) {
        return { label: 'Отлично', icon: '🟢' };
    }
    if (usagePercent < 80) {
        return { label: 'Хорошо', icon: '🟡' };
    }
    if (usagePercent < 95) {
        return { label: 'Внимание', icon: '🟠' };
    }
    return { label: 'Критично', icon: '🔴' };
}

function buildIndexedDBStorageMessage(estimate = {}, persisted = null, databaseNames = []) {
    const quota = Math.max(0, Number(estimate.quota) || 0);
    const usage = Math.max(0, Number(estimate.usage) || 0);
    const freeSpace = Math.max(0, quota - usage);
    const usagePercent = quota > 0 ? ((usage / quota) * 100) : 0;
    const status = getStorageStatusByPercent(usagePercent);
    const dbList = Array.isArray(databaseNames) && databaseNames.length
        ? databaseNames.map(name => `   🗄️ ${name}`).join('\n')
        : '   Пока баз IndexedDB не найдено';
    const persistentText = persisted === true
        ? 'Включено'
        : persisted === false
            ? 'Не включено'
            : 'Не удалось проверить';

    return `
📊 **Информация об IndexedDB**

${status.icon} **Статус:** ${status.label} (${usagePercent.toFixed(1)}% общего браузерного хранилища использовано)

💾 **Использовано браузерным хранилищем:**
   ${formatStorageSize(usage)}

📦 **Примерно доступно:**
   ${formatStorageSize(freeSpace)}

🎯 **Общий лимит для этого сайта:**
   ${formatStorageSize(quota)}

🔒 **Постоянное хранение:**
   ${persistentText}

🗂️ **Базы IndexedDB:**
${dbList}

ℹ️ IndexedDB считается внутри общего хранилища браузера вместе с другими офлайн-данными этого сайта. До переноса данных в IndexedDB тут может быть пусто, но лимит уже можно посмотреть.
`;
}

async function checkIndexedDBStorageSize() {
    if (!navigator.storage || typeof navigator.storage.estimate !== 'function') {
        alert('Ваш браузер не поддерживает проверку размера IndexedDB через Storage API.');
        return;
    }

    try {
        const estimate = await navigator.storage.estimate();
        const persisted = typeof navigator.storage.persisted === 'function'
            ? await navigator.storage.persisted()
            : null;
        const databases = indexedDB && typeof indexedDB.databases === 'function'
            ? await indexedDB.databases()
            : [];
        const databaseNames = databases
            .map(database => database.name)
            .filter(Boolean);

        alert(buildIndexedDBStorageMessage(estimate, persisted, databaseNames));
    } catch (error) {
        console.error('Ошибка проверки IndexedDB:', error);
        alert('Не удалось проверить размер IndexedDB. Попробуйте открыть страницу в современном браузере Chrome/Edge.');
    }
}

// Функция для проверки размера localStorage с информацией о емкости
function checkLocalStorageSize() {
    let totalSize = 0;
    const keys = Object.keys(localStorage);
    
    // Подсчитываем размер всех данных
    keys.forEach(key => {
        const value = localStorage.getItem(key);
        totalSize += key.length + value.length;
    });
    
    const sizeInKB = (totalSize / 1024).toFixed(2);
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    // Определяем максимальную емкость localStorage
    let maxCapacity = 0;
    let usedCapacity = 0;
    
    // Определяем максимальную емкость localStorage (безопасный способ)
    // Стандартные лимиты для разных браузеров
    const browserLimits = {
        'Chrome': 5 * 1024 * 1024,    // 5MB
        'Firefox': 10 * 1024 * 1024,  // 10MB  
        'Safari': 5 * 1024 * 1024,    // 5MB
        'Edge': 10 * 1024 * 1024,     // 10MB
        'default': 5 * 1024 * 1024     // 5MB по умолчанию
    };
    
    // Определяем браузер
    let browser = 'default';
    if (navigator.userAgent.includes('Chrome')) browser = 'Chrome';
    else if (navigator.userAgent.includes('Firefox')) browser = 'Firefox';
    else if (navigator.userAgent.includes('Safari')) browser = 'Safari';
    else if (navigator.userAgent.includes('Edge')) browser = 'Edge';
    
    maxCapacity = browserLimits[browser];
    usedCapacity = totalSize;
    
    const maxCapacityKB = (maxCapacity / 1024).toFixed(2);
    const maxCapacityMB = (maxCapacity / (1024 * 1024)).toFixed(2);
    const freeSpace = maxCapacity - usedCapacity;
    const freeSpaceKB = (freeSpace / 1024).toFixed(2);
    const freeSpaceMB = (freeSpace / (1024 * 1024)).toFixed(2);
    const usagePercent = ((usedCapacity / maxCapacity) * 100).toFixed(1);
    
    // Определяем статус использования
    let status = '';
    let statusIcon = '';
    
    if (usagePercent < 50) {
        status = 'Отлично';
        statusIcon = '🟢';
    } else if (usagePercent < 80) {
        status = 'Хорошо';
        statusIcon = '🟡';
    } else if (usagePercent < 95) {
        status = 'Внимание';
        statusIcon = '🟠';
    } else {
        status = 'Критично';
        statusIcon = '🔴';
    }
    
    const message = `
📊 **Информация о localStorage**

${statusIcon} **Статус:** ${status} (${usagePercent}% использовано)

💾 **Использовано:**
   ${sizeInKB} KB (${sizeInMB} MB)

📦 **Доступно:**
   ${freeSpaceKB} KB (${freeSpaceMB} MB)

🎯 **Общая емкость:**
   ${maxCapacityKB} KB (${maxCapacityMB} MB)

📝 **Записей в системе:** ${keys.length}

🔍 **Детализация:`
    
    // Добавляем детализацию по типам данных
    const dataTypes = {
        'categories': 'Категории',
        'products': 'Товары', 
        'clients': 'Клиенты',
        'invoices': 'Накладные',
        'debts': 'Долги',
        'movements': 'Движения',
        'reports': 'Отчеты'
    };
    
    let details = '';
    Object.keys(dataTypes).forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            const size = (value.length / 1024).toFixed(2);
            details += `\n   📋 ${dataTypes[key]}: ${size} KB`;
        }
    });
    
    const finalMessage = message + details + `\n\n💡 **Рекомендации:**`;
    
    // Добавляем рекомендации
    let recommendations = '';
    if (usagePercent > 80) {
        recommendations += `\n⚠️  Рекомендуется очистить ненужные данные`;
    }
    if (usagePercent > 95) {
        recommendations += `\n🚨 Критически мало места! Очистите данные немедленно!`;
    }
    if (keys.length > 100) {
        recommendations += `\n🧹 Много записей - используйте "Очистить мусор"`;
    }
    if (recommendations === '') {
        recommendations = `\n✅ Все в порядке! Места достаточно.`;
    }
    
    alert(finalMessage + recommendations);
}

// ==================== ДОПОЛНИТЕЛЬНЫЕ ИНСТРУМЕНТЫ ====================

// Экспорт выборочных данных
function exportSelectedData() {
    const dataTypes = [
        { key: 'categories', name: 'Категории', data: categories },
        { key: 'products', name: 'Товары', data: products },
        { key: 'clients', name: 'Клиенты', data: clients },
        { key: 'invoices', name: 'Накладные', data: invoices },
        { key: 'archivedInvoices', name: 'Архив накладных', data: archivedInvoices },
        { key: 'debts', name: 'Долги', data: debts },
        { key: 'movements', name: 'Движения', data: movements },
        { key: 'reports', name: 'Отчеты', data: reports },
        { key: 'personalPrices', name: 'Персональные цены', data: personalPrices },
        { key: 'moneyTransactions', name: 'Деньги', data: moneyTransactions },
        { key: 'incomingReceipts', name: 'Приходные накладные', data: incomingReceipts },
        { key: 'archivedIncomingReceipts', name: 'Архив приходных накладных', data: archivedIncomingReceipts },
        { key: 'initialStockEntries', name: 'Стартовые остатки', data: initialStockEntries },
        { key: 'supplierReturns', name: 'Возвраты поставщику', data: supplierReturns },
        { key: 'packageProductions', name: 'Фасовка пакетов', data: packageProductions }
    ];
    
    let selectedTypes = [];
    let message = 'Выберите типы данных для экспорта:\n\n';
    
    dataTypes.forEach((type, index) => {
        message += `${index + 1}. ${type.name} (${type.data.length} записей)\n`;
    });
    
    message += '\nВведите номера через запятую (например: 1,3,5) или "all" для всех:';
    
    const userInput = prompt(message);
    if (!userInput) return;
    
    if (userInput.toLowerCase() === 'all') {
        selectedTypes = dataTypes;
    } else {
        const selectedNumbers = userInput.split(',').map(num => parseInt(num.trim()) - 1);
        selectedTypes = selectedNumbers
            .filter(num => num >= 0 && num < dataTypes.length)
            .map(num => dataTypes[num]);
    }
    
    if (selectedTypes.length === 0) {
        alert('Не выбрано ни одного типа данных');
        return;
    }
    
    const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        selectedTypes: selectedTypes.map(type => type.key)
    };
    
    selectedTypes.forEach(type => {
        exportData[type.key] = type.data;
    });
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `warehouse-selected-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert(`Экспортировано ${selectedTypes.length} типов данных!`);
}

// Аналитика данных
function showDataAnalytics() {
    const totalProducts = products.length;
    const totalClients = clients.length;
    const totalInvoices = invoices.length;
    const totalDebts = debts.length;
    const totalMovements = movements.length;
    const totalReports = reports.length;
    
    // Статистика по товарам
    const inventoryState = calculateIncomingInventoryState(getTodayDateKey());
    const productsWithStock = products.filter(product => (Number(getProductStockDisplay(product, inventoryState).quantity) || 0) > 0).length;
    const productsOutOfStock = Math.max(0, products.length - productsWithStock);
    const totalStockValue = getWarehouseValueByUnifiedStock();
    
    // Статистика по накладным
    const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const avgInvoiceValue = totalInvoices > 0 ? totalSales / totalInvoices : 0;
    const cashInvoices = invoices.filter(inv => inv.paymentType === 'cash').length;
    const debtInvoices = invoices.filter(inv => isActiveInvoiceRecord(inv) && inv.paymentType === 'debt').length;
    
    // Статистика по долгам
    const totalDebtAmount = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const avgDebtAmount = debts.length > 0 ? totalDebtAmount / debts.length : 0;
    
    const message = `
📊 **Аналитика данных системы**

📦 **Товары:**
   Всего товаров: ${totalProducts}
   В наличии: ${productsWithStock}
   Нет в наличии: ${productsOutOfStock}
   Стоимость склада: ${formatCurrency(totalStockValue)}

👥 **Клиенты:**
   Всего клиентов: ${totalClients}

📋 **Накладные:**
   Всего накладных: ${totalInvoices}
   Общая сумма продаж: ${formatCurrency(totalSales)}
   Средний чек: ${formatCurrency(avgInvoiceValue)}
   Наличные: ${cashInvoices}
   В долг: ${debtInvoices}

💰 **Долги:**
   Всего долгов: ${totalDebtAmount > 0 ? debts.length : 0}
   Общая сумма долгов: ${formatCurrency(totalDebtAmount)}
   Средний долг: ${formatCurrency(avgDebtAmount)}

📈 **Движения:**
   Всего движений: ${totalMovements}

📊 **Отчеты:**
   Всего отчетов: ${totalReports}

💡 **Рекомендации:**
   ${productsOutOfStock > 0 ? `⚠️ ${productsOutOfStock} товаров нет в наличии` : '✅ Все товары в наличии'}
   ${totalDebtAmount > 0 ? `⚠️ Есть долги на сумму ${formatCurrency(totalDebtAmount)}` : '✅ Долгов нет'}
    `;
    
    alert(message);
}

// Проверка целостности данных
function showDataIntegrity() {
    let issues = [];
    let warnings = [];
    
    // Проверка товаров
    products.forEach(product => {
        if (!product.name || product.name.trim() === '') {
            issues.push(`Товар без названия (ID: ${product.id})`);
        }
        if (product.quantity < 0) {
            warnings.push(`Отрицательное количество у товара "${product.name}"`);
        }
        if (!product.categoryId || !categories.find(c => c.id === product.categoryId)) {
            warnings.push(`Товар "${product.name}" имеет несуществующую категорию`);
        }
    });
    
    // Проверка накладных
    invoices.forEach(invoice => {
        if (invoice.items.length === 0) {
            issues.push(`Накладная без товаров (ID: ${invoice.id})`);
        }
        invoice.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) {
                issues.push(`Накладная содержит несуществующий товар: ${item.productName}`);
            }
        });
    });
    
    // Проверка долгов
    debts.forEach(debt => {
        if (!debt.clientName || debt.clientName.trim() === '') {
            issues.push(`Долг без имени клиента (ID: ${debt.id})`);
        }
        if (debt.amount <= 0) {
            warnings.push(`Нулевой или отрицательный долг у клиента "${debt.clientName}"`);
        }
    });
    
    // Проверка клиентов
    clients.forEach(client => {
        if (!client.name || client.name.trim() === '') {
            issues.push(`Клиент без имени (ID: ${client.id})`);
        }
    });
    
    const message = `
🔍 **Проверка целостности данных**

${issues.length === 0 ? '✅ Критических ошибок не найдено' : `❌ Найдено ${issues.length} критических ошибок:`}
${issues.map(issue => `   • ${issue}`).join('\n')}

${warnings.length === 0 ? '✅ Предупреждений нет' : `⚠️ Найдено ${warnings.length} предупреждений:`}
${warnings.map(warning => `   • ${warning}`).join('\n')}

💡 **Рекомендации:**
${issues.length > 0 ? '🔧 Рекомендуется исправить критические ошибки' : '✅ Данные в хорошем состоянии'}
${warnings.length > 0 ? '⚠️ Обратите внимание на предупреждения' : ''}
    `;
    
    alert(message);
}

// История резервных копий
function showBackupHistory() {
    const backupHistory = JSON.parse(localStorage.getItem('backupHistory')) || [];
    const currentBackup = {
        date: new Date().toISOString(),
        categories: categories.length,
        products: products.length,
        clients: clients.length,
        invoices: invoices.filter(invoice => !invoice.isArchived).length,
        archivedInvoices: archivedInvoices.length,
        debts: debts.length,
        movements: movements.length,
        reports: reports.length,
        personalPrices: personalPrices.length,
        moneyTransactions: moneyTransactions.length,
        incomingReceipts: incomingReceipts.length,
        archivedIncomingReceipts: archivedIncomingReceipts.length,
        initialStockEntries: initialStockEntries.length,
        supplierReturns: supplierReturns.length,
        packageProductions: packageProductions.length
    };
    
    // Добавляем текущее состояние в историю (если его там нет)
    const today = new Date().toISOString().split('T')[0];
    const todayBackup = backupHistory.find(b => b.date.startsWith(today));
    if (!todayBackup) {
        backupHistory.push(currentBackup);
        // Оставляем только последние 10 записей
        if (backupHistory.length > 10) {
            backupHistory.splice(0, backupHistory.length - 10);
        }
        saveData('backupHistory', backupHistory);
    }
    
    let message = `📅 **История резервных копий**\n\n`;
    
    if (backupHistory.length === 0) {
        message += 'История пуста. Первая запись будет создана сегодня.';
    } else {
        backupHistory.forEach((backup, index) => {
            const date = new Date(backup.date).toLocaleDateString('ru-RU');
            message += `${index + 1}. ${date}\n`;
            message += `   📦 Товары: ${backup.products}\n`;
            message += `   👥 Клиенты: ${backup.clients}\n`;
            message += `   📋 Накладные: ${backup.invoices}\n`;
            message += `   🗂️ Архив накладных: ${backup.archivedInvoices || 0}\n`;
            message += `   💰 Долги: ${backup.debts}\n`;
            message += `   📈 Движения: ${backup.movements}\n`;
            message += `   📊 Отчеты: ${backup.reports}\n`;
            message += `   🚚 Приход: ${backup.incomingReceipts || 0}\n`;
            message += `   🗃️ Архив прихода: ${backup.archivedIncomingReceipts || 0}\n`;
            message += `   📦 Стартовые остатки: ${backup.initialStockEntries || 0}\n`;
            message += `   ↩ Возвраты поставщику: ${backup.supplierReturns || 0}\n`;
            message += `   📦 Фасовка: ${backup.packageProductions || 0}\n`;
            message += `   💵 Деньги: ${backup.moneyTransactions || 0}\n`;
            if (typeof backup.personalPrices === 'number') {
                message += `   🏷️ Персональные цены: ${backup.personalPrices}\n`;
            }
            message += `\n`;
        });
    }
    
    message += `💡 **Текущее состояние:**\n`;
    message += `📦 Товары: ${currentBackup.products}\n`;
    message += `👥 Клиенты: ${currentBackup.clients}\n`;
    message += `📋 Накладные: ${currentBackup.invoices}\n`;
    message += `🗂️ Архив накладных: ${currentBackup.archivedInvoices}\n`;
    message += `💰 Долги: ${currentBackup.debts}\n`;
    message += `📈 Движения: ${currentBackup.movements}\n`;
    message += `📊 Отчеты: ${currentBackup.reports}\n`;
    message += `🚚 Приход: ${currentBackup.incomingReceipts}\n`;
    message += `🗃️ Архив прихода: ${currentBackup.archivedIncomingReceipts}\n`;
    message += `📦 Стартовые остатки: ${currentBackup.initialStockEntries}\n`;
    message += `↩ Возвраты поставщику: ${currentBackup.supplierReturns}\n`;
    message += `📦 Фасовка: ${currentBackup.packageProductions}\n`;
    message += `💵 Деньги: ${currentBackup.moneyTransactions}`;
    
    alert(message);
}

// Универсальная функция для отображения имени клиента
function getDisplayClientName(clientIdOrName) {
    if (!clientIdOrName || clientIdOrName === '') return 'Без клиента';
    if (clientIdOrName === 'private_person') return 'Частное лицо';
    // Если это ID, ищем в clients
    const client = clients.find(c => c.id === clientIdOrName);
    if (client) return client.name;
    // Если это уже имя
    return clientIdOrName;
}

// Функция для проверки целостности долгов
function validateDebtsIntegrity() {
    console.log('🔍 Проверка целостности долгов...');
    
    let issues = [];
    let totalDebtAmount = 0;
    let totalInvoicesAmount = 0;
    
    // Проверяем каждый долг
    debts.forEach(debt => {
        const debtInvoices = debt.invoices || [];
        const calculatedAmount = getDebtInvoiceTotal(debt);
        const expectedOutstanding = getDebtExpectedOutstandingAmount(debt);
        
        // Проверяем соответствие суммы долга и суммы накладных
        if (debtInvoices.length && !hasManualDebtAmountAdjustment(debt) && Math.abs(debt.amount - expectedOutstanding) > 0.01) {
            issues.push(`❌ Долг клиента "${debt.clientName}": текущий остаток (${formatCurrency(debt.amount)}) не соответствует накладным минус оплаты (${formatCurrency(expectedOutstanding)}). Накладные: ${formatCurrency(calculatedAmount)}, оплачено: ${formatCurrency(getDebtPaidAmount(debt))}`);
        }
        
        // Проверяем существование накладных
        debtInvoices.forEach(invoice => {
            const actualInvoice = invoices.find(i => i.id === invoice.id);
            // Если накладная не найдена в invoices, ищем в debt.invoices (то есть она удалена, но осталась в истории)
            if (!actualInvoice) {
                // Если invoice действительно есть в debt.invoices (а мы по ним и проходим), не считаем это ошибкой
                // (можно добавить отдельное предупреждение, если нужно)
                // issues.push(`⚠️ Накладная №${invoice.number} для клиента "${debt.clientName}" есть только в истории долга, но не найдена в системе (удалена)`);
            } else if (actualInvoice.paymentType !== 'debt') {
                issues.push(`❌ Накладная №${invoice.number} для клиента "${debt.clientName}" не является долговой`);
            }
        });
        
        totalDebtAmount += debt.amount;
        totalInvoicesAmount += calculatedAmount;
    });
    
    // Проверяем накладные в долг без соответствующих долгов
    const debtInvoices = invoices.filter(inv => isActiveInvoiceRecord(inv) && inv.paymentType === 'debt');
    debtInvoices.forEach(invoice => {
        const clientObj = clients.find(c => c.id === invoice.client);
        if (clientObj) {
            const debt = debts.find(d => d.clientName === clientObj.name);
            if (!debt) {
                issues.push(`❌ Накладная №${invoices.findIndex(inv => inv.id === invoice.id) + 1} для клиента "${clientObj.name}" не имеет соответствующего долга`);
            } else {
                const debtInvoice = debt.invoices?.find(inv => inv.id === invoice.id);
                if (!debtInvoice) {
                    issues.push(`❌ Накладная №${invoices.findIndex(inv => inv.id === invoice.id) + 1} для клиента "${clientObj.name}" не прикреплена к долгу`);
                }
            }
        }
    });
    
    console.log(`📊 Результаты проверки:`);
    console.log(`- Общая сумма долгов: ${formatCurrency(totalDebtAmount)}`);
    console.log(`- Сумма по накладным: ${formatCurrency(totalInvoicesAmount)}`);
    console.log(`- Найдено проблем: ${issues.length}`);
    
    if (issues.length > 0) {
        console.log('🚨 Проблемы найдены:');
        issues.forEach(issue => console.log(issue));
        
        const message = `Найдено ${issues.length} проблем с долгами:\n\n${issues.join('\n')}\n\nРекомендуется исправить эти проблемы для обеспечения точности данных.`;
        alert(message);
    } else {
        console.log('✅ Целостность долгов проверена - проблем не найдено');
        alert('✅ Целостность долгов проверена - проблем не найдено!');
    }
    
    return issues.length === 0;
}

// Функция для автоматического исправления проблем с долгами
function fixDebtsIssues() {
    console.log('🔧 Автоматическое исправление проблем с долгами...');
    
    let fixedIssues = [];
    
    // Пересчитываем суммы долгов на основе накладных
    debts.forEach(debt => {
        const debtInvoices = debt.invoices || [];
        const calculatedAmount = getDebtInvoiceTotal(debt);
        const expectedOutstanding = getDebtExpectedOutstandingAmount(debt);
        
        if (debtInvoices.length && !hasManualDebtAmountAdjustment(debt) && Math.abs(debt.amount - expectedOutstanding) > 0.01) {
            const oldAmount = debt.amount;
            debt.amount = expectedOutstanding;
            
            debt.history.push({
                type: 'comment',
                amount: 0,
                date: new Date().toISOString(),
                description: `🔧 Автоматическое исправление: остаток долга скорректирован с ${formatCurrency(oldAmount)} на ${formatCurrency(expectedOutstanding)}. Накладные: ${formatCurrency(calculatedAmount)}, оплачено: ${formatCurrency(getDebtPaidAmount(debt))}`
            });
            
            fixedIssues.push(`✅ Исправлен остаток долга клиента "${debt.clientName}": ${formatCurrency(oldAmount)} → ${formatCurrency(expectedOutstanding)}`);
        }
    });
    
    // Добавляем отсутствующие накладные к долгам
    const debtInvoices = invoices.filter(inv => isActiveInvoiceRecord(inv) && inv.paymentType === 'debt');
    debtInvoices.forEach(invoice => {
        const clientObj = clients.find(c => c.id === invoice.client);
        if (clientObj) {
            const debt = debts.find(d => d.clientName === clientObj.name);
            if (debt && debt.invoices) {
                const existingInvoice = debt.invoices.find(inv => inv.id === invoice.id);
                if (!existingInvoice) {
                    const originalIndex = invoices.findIndex(inv => inv.id === invoice.id);
                    const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
                    
                    debt.invoices.push({
                        id: invoice.id,
                        number: invoiceNumber,
                        amount: invoice.total,
                        date: invoice.date,
                        items: invoice.items
                    });
                    
                    debt.amount += invoice.total;
                    
                    debt.history.push({
                        type: 'add',
                        amount: invoice.total,
                        date: new Date().toISOString(),
                        invoiceId: invoice.id,
                        invoiceNumber: invoiceNumber,
                        description: `🔧 Автоматически добавлена накладная №${invoiceNumber} на сумму <strong>${formatCurrency(invoice.total)}</strong>`
                    });
                    
                    fixedIssues.push(`✅ Добавлена накладная №${invoiceNumber} к долгу клиента "${clientObj.name}"`);
                }
            }
        }
    });
    
    if (fixedIssues.length > 0) {
        saveData('debts', debts);
        console.log('🔧 Исправления применены:');
        fixedIssues.forEach(fix => console.log(fix));
        
        const message = `Применено ${fixedIssues.length} исправлений:\n\n${fixedIssues.join('\n')}\n\nДанные сохранены.`;
        alert(message);
        
        // Обновляем интерфейс
        loadDebts();
        updateStats();
    } else {
        console.log('✅ Проблемы не найдены или уже исправлены');
        alert('✅ Проблемы не найдены или уже исправлены!');
    }
}

// Функция для создания резервной копии перед исправлениями
function backupBeforeFix() {
    const backup = {
        debts: JSON.parse(JSON.stringify(debts)),
        invoices: JSON.parse(JSON.stringify(invoices)),
        timestamp: new Date().toISOString()
    };
    
    saveData('debts_backup', backup);
    console.log('💾 Создана резервная копия перед исправлениями');
}

// Функция для восстановления из резервной копии
function restoreFromBackup() {
    const backup = localStorage.getItem('debts_backup');
    if (backup) {
        const backupData = JSON.parse(backup);
        debts = backupData.debts;
        invoices = backupData.invoices;
        
        saveData('debts', debts);
        saveData('invoices', invoices);
        
        console.log('🔄 Восстановлено из резервной копии от', new Date(backupData.timestamp).toLocaleString());
        alert('🔄 Восстановлено из резервной копии!');
        
        loadDebts();
        updateStats();
    } else {
        alert('❌ Резервная копия не найдена');
    }
}

// Получить архив долгов из localStorage
function getArchivedDebts() {
    return readStorageJson('archivedDebts', []);
}

// Сохранить архив долгов
function saveArchivedDebts(archivedDebts) {
    saveData('archivedDebts', Array.isArray(archivedDebts) ? archivedDebts : []);
}

function getArchivedDebtDisplayAmount(debt) {
    return roundCurrencyAmount(debt?.archiveAmount ?? debt?.amount ?? 0);
}

function getArchivedDebtForRestore(debt) {
    const restoredDebt = ensureDebtRecordShape({
        ...debt,
        amount: getArchivedDebtDisplayAmount(debt)
    });
    delete restoredDebt.archivedAt;
    delete restoredDebt.archiveAmount;
    delete restoredDebt.archivePaidAmount;
    delete restoredDebt.archiveReason;
    return restoredDebt;
}

// Добавить долг в архив
function archiveDebt(debt) {
    const archivedDebts = getArchivedDebts();
    const archivedDebt = { ...debt, archivedAt: new Date().toISOString() };
    const existingIndex = archivedDebts.findIndex(item => item.id === archivedDebt.id);
    if (existingIndex >= 0) {
        archivedDebts[existingIndex] = archivedDebt;
    } else {
        archivedDebts.push(archivedDebt);
    }
    saveArchivedDebts(archivedDebts);
}

// Восстановить долг из архива
function restoreDebtFromArchive(debtId) {
    let archivedDebts = getArchivedDebts();
    const archivedDebt = archivedDebts.find(d => d.id === debtId);
    if (!archivedDebt) {
        alert('Долг не найден в архиве');
        return;
    }
    // Удаляем из архива
    archivedDebts = archivedDebts.filter(d => d.id !== debtId);
    saveArchivedDebts(archivedDebts);
    // Добавляем в активные долги
    debts.push(getArchivedDebtForRestore(archivedDebt));
    saveData('debts', debts);
    loadDebts();
    updateStats();
    alert('Долг успешно восстановлен!');
}

// Очистить архив долгов
function clearArchivedDebts() {
    if (confirm('⚠️ ВНИМАНИЕ! Это действие нельзя отменить.\n\nВы уверены, что хотите полностью очистить архив долгов?\n\nВсе удаленные долги будут потеряны навсегда.')) {
        saveData('archivedDebts', []);
        alert('🗑️ Архив долгов полностью очищен!');
        // Закрываем модальное окно архива
        const modal = document.querySelector('.modal.open');
        if (modal) {
            modal.remove();
        }
    }
}

// Показать модальное окно архива долгов
function showArchivedDebts() {
    const archivedDebts = getArchivedDebts();
    let html = '';
    if (archivedDebts.length === 0) {
        html = '<p class="text-center">Архив пуст</p>';
    } else {
        html = archivedDebts.map(debt => `
            <div class="card" style="margin-bottom: 18px;">
                <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                    <div class="card-title" style="flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">${debt.clientName}</div>
                    <div class="card-actions" style="flex-shrink: 0;">
                        <button class="btn btn-success btn-sm" onclick="restoreDebtFromArchive('${debt.id}')" style="min-width: 120px;">
                            <i class="fas fa-undo"></i> Восстановить
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="card-info">
                        <span>Сумма долга:</span>
                        <span>${formatCurrency(getArchivedDebtDisplayAmount(debt))}</span>
                    </div>
                    <div class="card-info">
                        <span>Дата создания:</span>
                        <span>${formatDateShort(debt.createdAt)}</span>
                    </div>
                    <div class="card-info">
                        <span>Дата архивации:</span>
                        <span>${formatDateShort(debt.archivedAt)}</span>
                    </div>
                    <div class="card-info">
                        <span>Комментарий:</span>
                        <span>${getLastComment(debt) || 'Нет комментария'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Блокируем скролл body при открытии модального окна
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.innerHTML = `
        <div class="modal-content modal-large" style="max-width: 700px; max-height: 90vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h3>Архив долгов</h3>
                <span class="close" onclick="removeModal(this)">&times;</span>
            </div>
            <div class="modal-body" style="overflow-y: auto; flex: 1 1 auto; min-height: 100px;">
                ${html}
            </div>
            <div class="modal-footer" style="flex-shrink: 0;">
                <button class="btn btn-secondary" onclick="removeModal(this)">Закрыть</button>
                ${archivedDebts.length > 0 ? `
                    <button class="btn btn-danger" onclick="clearArchivedDebts()" style="margin-left: 10px;">
                        <i class="fas fa-trash"></i> Очистить архив
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ==================== ФУНКЦИИ ДЛЯ РАСЧЕТА СДАЧИ ====================

// Рассчитать оптимальную сумму для оплаты
function calculateOptimalAmount(total) {
    if (total <= 0) return 0;
    
    // Если сумма меньше 100, округляем до 100
    if (total <= 100) {
        return 100;
    }
    
    // Если сумма меньше 1000, округляем до ближайших 100
    if (total <= 1000) {
        return Math.ceil(total / 100) * 100;
    }
    
    // Если сумма больше 1000, округляем до ближайших 500
    return Math.ceil(total / 500) * 500;
}

// Генерировать умные кнопки для сумм
function generateSmartAmountButtons(total) {
    const smartButtonsContainer = document.getElementById('smartAmountButtons');
    if (!smartButtonsContainer) return;
    
    if (total <= 0) {
        smartButtonsContainer.innerHTML = '';
        return;
    }
    
    const amounts = [];
    
    // Добавляем оптимальную сумму
    const optimal = calculateOptimalAmount(total);
    amounts.push(optimal);
    
    // Добавляем суммы с минимальной сдачей (округление вверх)
    if (total > 100) {
        const roundUp100 = Math.ceil(total / 100) * 100;
        if (roundUp100 !== optimal) {
            amounts.push(roundUp100);
        }
    }
    
    // Добавляем суммы для удобной сдачи
    if (total > 500) {
        const roundUp500 = Math.ceil(total / 500) * 500;
        if (roundUp500 !== optimal && roundUp500 !== amounts[amounts.length - 1]) {
            amounts.push(roundUp500);
        }
    }
    
    // Добавляем суммы для минимальной сдачи
    const minChange = Math.ceil(total);
    if (minChange !== optimal && minChange !== amounts[amounts.length - 1]) {
        amounts.push(minChange);
    }
    
    // Убираем дубликаты и сортируем
    const uniqueAmounts = [...new Set(amounts)].sort((a, b) => a - b);
    
    // Генерируем HTML для кнопок
    smartButtonsContainer.innerHTML = uniqueAmounts.map(amount => {
        const change = amount - total;
        const changeText = change === 0 ? 'Точная сумма' : `Сдача: ${formatCurrency(change)}`;
        return `
            <button type="button" class="btn btn-sm" onclick="setQuickAmount(${amount})" title="${changeText}">
                ${formatCurrency(amount)}
                <small style="display: block; font-size: 10px; opacity: 0.8;">${changeText}</small>
            </button>
        `;
    }).join('');
}

// Функции для работы с выбором накладных в отчетах
function toggleAllInvoices(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateDeleteButton();
}

function updateDeleteButton() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    
    if (checkedBoxes.length > 0) {
        deleteBtn.style.display = 'inline-block';
    } else {
        deleteBtn.style.display = 'none';
    }
}

function deleteSelectedInvoices() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Выберите накладные для удаления');
        return;
    }
    
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (confirm(`Вы уверены, что хотите удалить ${selectedIds.length} накладную(ых)? Это действие нельзя отменить.`)) {
        // Удаляем накладные из массива reports
        const originalLength = reports.length;
        reports = reports.filter(report => !selectedIds.includes(report.id));
        
        // Сохраняем изменения
        saveData('reports', reports);
        
        // Обновляем отчет
        generateReport();
        
        alert(`Успешно удалено ${originalLength - reports.length} накладных`);
    }
}

// Получить подсказку для сдачи
function getChangeHint(change) {
    if (change === 0) {
        return 'Отличная сумма! Сдача не нужна.';
    } else if (change <= 50) {
        return 'Минимальная сдача - удобно для клиента.';
    } else if (change <= 200) {
        return 'Небольшая сдача - клиент получит удобные купюры.';
    } else if (change <= 1000) {
        return 'Средняя сдача - проверьте наличие купюр.';
    } else {
        return 'Большая сдача - убедитесь в наличии достаточного количества купюр.';
    }
}

// Функция создания накладной с валидацией
function createInvoiceWithValidation() {
    console.log('🔘 Кнопка "Создать накладную" нажата');
    if (isSellerMode() && !getCurrentShift()) {
        alert('Сначала откройте смену продавца');
        return;
    }
    // Вызываем оригинальную функцию
    createInvoice();
}

// Добавляем инициализацию в существующую функцию showCreateInvoiceModal
function showCreateInvoiceModalWithInit() {
    showCreateInvoiceModal();
}

// ==================== РЕДАКТИРОВАНИЕ НАКЛАДНОЙ ====================

// Показать модальное окно редактирования накладной
function showEditInvoiceModal(invoiceId) {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) {
        alert('Накладная не найдена');
        return;
    }

    const permission = requestInvoiceMutationPermission(invoice, 'edit', true);
    if (!permission.allowed) {
        return;
    }

    window.currentInvoiceEditApproval = {
        invoiceId,
        approvedAt: Date.now(),
        managerApproved: isSellerMode() && !canSellerDirectlyMutateInvoice(invoice)
    };
    
    // Сохраняем ID накладной
    document.getElementById('editInvoiceId').value = invoiceId;
    
    // Блокируем скролл body при открытии модального окна
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    // Открываем модальное окно
    openModal('editInvoiceModal');
    
    // Загружаем данные накладной в форму
    loadEditInvoiceData(invoice);
    
    // Инициализируем поиск клиента для редактирования
    initializeEditClientSearch();
    
    // Инициализируем выбор типа оплаты для редактирования
    initializeEditPaymentTypeSelect();
    
    // Загружаем товары накладной
    loadEditInvoiceItems(invoice);
    
    // Обновляем итоговую сумму
    updateEditInvoiceTotal();
}

// Загрузить данные накладной в форму
function loadEditInvoiceData(invoice) {
    // Устанавливаем клиента
    const client = clients.find(c => c.id === invoice.client);
    if (client) {
        document.getElementById('editInvoiceClient').value = invoice.client;
        document.getElementById('editInvoiceClientSearch').value = client.name;
    } else if (invoice.client === 'private_person') {
        document.getElementById('editInvoiceClient').value = 'private_person';
        document.getElementById('editInvoiceClientSearch').value = 'Частное лицо';
    }
    
    // Устанавливаем тип оплаты
    if (invoice.paymentType) {
        setEditPaymentType(invoice.paymentType);
    }
    
    // Устанавливаем примечания
    document.getElementById('editInvoiceNotes').value = invoice.notes || '';
}

// Загрузить товары накладной в форму редактирования
function loadEditInvoiceItems(invoice) {
    const container = document.getElementById('edit-invoice-items-list');
    container.innerHTML = '';
    
    const itemsForEdit = groupInvoiceItemsForEdit(invoice.items || []);

    itemsForEdit.forEach(item => {
        addEditInvoiceItemWithData(item);
    });
    
    // Настраиваем обработчики для всех полей ввода количества
    setTimeout(() => {
        setupEditQuantityInputListeners();
    }, 100);
}

// Добавить товар в форму редактирования с данными
function addEditInvoiceItemWithData(item) {
    const container = document.getElementById('edit-invoice-items-list');
    const itemId = generateId();
    const product = products.find(p => p.id === item.productId);
    
    if (!product) {
        console.error('Товар не найден:', item.productId);
        return;
    }
    
    const isTobacco = isTobaccoProduct(product);
    const isRoast = isRoastProduct(product);
    
    let tobaccoHtml = '';
    let roastHtml = '';
    
    if (isTobacco) {
        tobaccoHtml = `
            <div class="tobacco-type-selection">
                <label>Пакеты</label>
                <div class="tobacco-type-options compact tiny">
                    ${renderTobaccoTypeInputs(item.tobaccoPackCounts || item.tobaccoType)}
                </div>
            </div>
        `;
    }
    
    if (isRoast) {
        const roastForRender = {
            ...(item.roast || {}),
            _typeOrder: item.roastTypeOrder || []
        };
        roastHtml = `
            <div class="roast-type-selection">
                <label>Пакеты</label>
                <div class="tobacco-type-options compact tiny">
                    ${renderRoastTypeInputs(roastForRender)}
                </div>
            </div>
        `;
    }
    
    // Устанавливаем data-атрибуты для жарки, если они есть
    let dataAttributes = '';
    if (isRoast && item.roast) {
        const kg50 = item.roast.kg50 || '0';
        const kg41 = item.roast.kg41 || '0';
        const kg32 = item.roast.kg32 || '0';
        const kg23 = item.roast.kg23 || '0';
        dataAttributes = `data-kg50="${kg50}" data-kg41="${kg41}" data-kg32="${kg32}" data-kg23="${kg23}"`;
    }
    
    const itemHtml = `
        <div class="invoice-item-row" data-item-id="${itemId}" ${dataAttributes}>
            <select class="form-control product-select" onchange="updateEditProductInfo('${itemId}')">
                <option value="">Выберите товар</option>
                ${getInvoiceSelectableProducts().map(p => `
                    <option value="${p.id}" 
                            data-price="${p.salePrice}" 
                            data-quantity="${getInvoiceProductOptionQuantity(p)}"
                            data-unit="${p.unit || 'шт'}"
                            data-category="${p.category}"
                            ${p.id === item.productId ? 'selected' : ''}>
                        ${p.name} - ${formatCurrency(p.salePrice)} (${getInvoiceProductStockText(p)})
                    </option>
                `).join('')}
            </select>
            ${renderPackageSaleModeControls('tobacco', item.packageSaleMode || 'whole', item.tobaccoType)}
            ${renderPackageSaleModeControls('roast', item.packageSaleMode || 'whole', item.roastType)}
            ${renderSimplePackageSaleModeControls(item.packageSaleMode || 'whole')}
            ${tobaccoHtml}
            ${roastHtml}
            <label class="invoice-quantity-field">
                <span>${isKgUnit(item.unit) ? 'КГ' : 'КОЛ'}</span>
                <input type="number" class="form-control quantity-input" 
                       placeholder="КГ" min="0.01" step="0.01" value="${item.quantity}">
            </label>
            <label class="invoice-quantity-field kg-count-field" style="display: ${isKgUnit(item.unit) ? 'flex' : 'none'};">
                <span>ШТ</span>
                <input type="number" class="form-control kg-count-input" 
                       placeholder="ШТ" min="1" step="1" value="${getKgItemCountFromItem(item)}" ${isKgUnit(item.unit) ? '' : 'disabled'}>
            </label>
            <span class="unit-display">${item.unit || 'шт'}</span>
            <span class="price-display">${formatCurrency(item.price)}</span>
            <span class="total-display">${formatCurrency(item.total)}</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEditInvoiceItem('${itemId}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    
    // Добавляем обработчики для полей жарки, если это жарка
    if (isRoast && item.roast) {
        const row = container.lastElementChild;
        const roastInputs = row.querySelectorAll('.roast-pack-input');
        roastInputs.forEach(inp => {
            inp.addEventListener('input', () => {
                // Пересчитываем вес при изменении пакетов
                distributeEditRoastWeight(row);
            });
        });
        
        // Пересчитываем вес при загрузке
        setTimeout(() => {
            distributeEditRoastWeight(row);
        }, 50);
    }
    
    // Обновляем информацию о товаре
    setTimeout(() => {
        updateEditProductInfo(itemId);
    }, 50);
}

// Распределение веса жарки для формы редактирования
function distributeEditRoastWeight(row) {
    if (!row) return;
    const select = row.querySelector('.product-select');
    if (!select || !select.value) return;
    const product = products.find(p => p.id === select.value);
    if (!product) return;
    
    const optionText = product.name.toLowerCase();
    const category = product.category?.toLowerCase() || '';
    const isRoast = optionText.includes('жарка') || category.includes('жарка') || optionText.includes('обжар');
    if (!isRoast) return;

    const totalKgInput = row.querySelector('.quantity-input');
    const unit = row.querySelector('.unit-display')?.textContent || 'шт';
    const totalKg = parseFloat(totalKgInput?.value || '0');
    if (unit !== 'кг' || !(totalKg > 0)) return;

    const packValues = getRoastPackValuesFromRow(row);
    if (getTotalRoastPackCount(packValues) <= 0) return;
    applyRoastKgDistribution(row, totalKg, packValues);
}

// Добавить пустой товар в форму редактирования
function addEditInvoiceItem() {
    const container = document.getElementById('edit-invoice-items-list');
    const itemId = generateId();
    
    const itemHtml = `
        <div class="invoice-item-row" data-item-id="${itemId}">
            <select class="form-control product-select" onchange="updateEditProductInfo('${itemId}')">
                <option value="">Выберите товар</option>
                ${getInvoiceSelectableProducts().map(product => `
                    <option value="${product.id}" 
                            data-price="${product.salePrice}" 
                            data-quantity="${getInvoiceProductOptionQuantity(product)}"
                            data-unit="${product.unit || 'шт'}"
                            data-category="${product.category}">
                        ${product.name} - ${formatCurrency(product.salePrice)} (${getInvoiceProductStockText(product)})
                    </option>
                `).join('')}
            </select>
            ${renderPackageSaleModeControls('tobacco')}
            ${renderPackageSaleModeControls('roast')}
            ${renderSimplePackageSaleModeControls()}
            <div class="tobacco-type-selection" style="display: none;">
                <label>Пакеты</label>
                <div class="tobacco-type-options compact tiny">
                    ${renderTobaccoTypeInputs()}
                </div>
            </div>
            <div class="roast-type-selection" style="display: none;">
                <label>Пакеты</label>
                <div class="tobacco-type-options compact tiny">
                    ${renderRoastTypeInputs()}
                </div>
            </div>
            <label class="invoice-quantity-field">
                <span>КОЛ</span>
                <input type="number" class="form-control quantity-input" 
                       placeholder="КГ" min="0.01" step="0.01">
            </label>
            <label class="invoice-quantity-field kg-count-field" style="display: none;">
                <span>ШТ</span>
                <input type="number" class="form-control kg-count-input" 
                       placeholder="ШТ" min="1" step="1" disabled>
            </label>
            <span class="unit-display">шт</span>
            <span class="price-display">0 ₽</span>
            <span class="total-display">0 ₽</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEditInvoiceItem('${itemId}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    
    // Настраиваем обработчики для нового поля ввода
    const newInput = container.lastElementChild.querySelector('.quantity-input');
    newInput.addEventListener('input', handleEditQuantityInput);
    newInput.addEventListener('keydown', handleEditQuantityKeydown);
    const newKgCountInput = container.lastElementChild.querySelector('.kg-count-input');
    newKgCountInput.addEventListener('input', handleEditQuantityInput);
    newKgCountInput.addEventListener('keydown', handleEditQuantityKeydown);
}

// Удалить товар из формы редактирования
function removeEditInvoiceItem(itemId) {
    const row = document.querySelector(`#edit-invoice-items-list [data-item-id="${itemId}"]`);
    if (row) {
        row.remove();
        updateEditInvoiceTotal();
    }
}

// Обновить информацию о товаре в форме редактирования
function updateEditProductInfo(itemId) {
    const row = document.querySelector(`#edit-invoice-items-list [data-item-id="${itemId}"]`);
    if (!row) return;
    
    const select = row.querySelector('.product-select');
    const productId = select.value;
    const product = products.find(p => p.id === productId);
    const quantityInput = row.querySelector('.quantity-input');
    
    if (!product) {
        row.querySelector('.unit-display').textContent = 'шт';
        row.querySelector('.price-display').textContent = '0 ₽';
        row.querySelector('.total-display').textContent = '0 ₽';
        if (quantityInput) quantityInput.max = '';
        row.querySelectorAll('.package-sale-mode-controls').forEach(control => {
            control.style.display = 'none';
        });
        syncKgCountVisibility(row, 'шт');
        return;
    }
    
    const unit = product.unit || 'шт';
    row.querySelector('.unit-display').textContent = unit;
    syncKgCountVisibility(row, unit);
    
    const clientId = document.getElementById('editInvoiceClient').value;
    const actualPrice = getActualPrice(clientId, productId);
    const standardPrice = product.salePrice;
    const priceDisplay = row.querySelector('.price-display');
    
    // Отображаем цену с индикатором персональной цены
    if (actualPrice !== standardPrice) {
        priceDisplay.innerHTML = `
            <span style="color: #e74c3c; font-weight: 600; text-decoration: underline; text-decoration-style: wavy; text-underline-offset: 3px;" title="Персональная цена">${formatCurrency(actualPrice)}</span>
            <br><small style="color: #7f8c8d; text-decoration: line-through; font-size: 11px;">${formatCurrency(standardPrice)}</small>
        `;
    } else {
        priceDisplay.textContent = formatCurrency(actualPrice);
    }
    
    // Показываем/скрываем выбор типа табака/жарки
    const isTobacco = isTobaccoProduct(product);
    const isRoast = isRoastProduct(product);
    const isSimplePackaged = isSimplePackagedProduct(product);
    row.querySelectorAll('.package-sale-mode-controls').forEach(control => {
        const targetKind = isTobacco ? 'tobacco' : isRoast ? 'roast' : isSimplePackaged ? 'simple' : '';
        control.style.display = control.dataset.packageKind === targetKind ? 'flex' : 'none';
    });
    
    const tobaccoSelection = row.querySelector('.tobacco-type-selection');
    const roastSelection = row.querySelector('.roast-type-selection');
    if (quantityInput) {
        quantityInput.max = isTobacco ? getAvailableInvoiceQuantityForProduct(product) : (isRoast && unit === 'кг' ? '' : (Number(product.quantity) || 0));
    }
    
    if (tobaccoSelection) {
        tobaccoSelection.style.display = isTobacco ? 'flex' : 'none';
        if (isTobacco) {
            row.querySelectorAll('.tobacco-pack-count').forEach(inp => {
                inp.oninput = () => updateEditItemTotal(itemId);
            });
        } else {
            row.querySelectorAll('.tobacco-pack-count').forEach(inp => {
                inp.value = '';
            });
        }
    }
    if (roastSelection) {
        roastSelection.style.display = isRoast ? 'flex' : 'none';
        if (isRoast) {
            row.querySelectorAll('.roast-pack-input').forEach(inp => {
                inp.oninput = () => {
                    distributeEditRoastWeight(row);
                    updateEditItemTotal(itemId);
                };
            });
        } else {
            row.querySelectorAll('.roast-pack-input').forEach(inp => {
                inp.value = '';
            });
        }
    }
    updatePackageSaleModeForRow(row);
    
    updateEditItemTotal(itemId);
}

// Обновить итог по товару в форме редактирования
function updateEditItemTotal(itemId) {
    const row = document.querySelector(`#edit-invoice-items-list [data-item-id="${itemId}"]`);
    if (!row) return;
    
    const select = row.querySelector('.product-select');
    const quantityInput = row.querySelector('.quantity-input');
    
    if (!select.value || !quantityInput.value) {
        row.querySelector('.total-display').textContent = '0 ₽';
        updateEditInvoiceTotal();
        return;
    }
    
    const productId = select.value;
    const clientId = document.getElementById('editInvoiceClient').value;
    const actualPrice = getActualPrice(clientId, productId);
    const quantity = parseFloat(quantityInput.value) || 0;
    const total = actualPrice * quantity;
    
    row.querySelector('.total-display').textContent = formatCurrency(total);
    updateEditInvoiceTotal();
}

// Обновить итоговую сумму в форме редактирования
function updateEditInvoiceTotal() {
    const rows = Array.from(document.querySelectorAll('#edit-invoice-items-list .invoice-item-row'));
    let total = 0;
    
    rows.forEach(row => {
        const select = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');
        
        if (select.value && quantityInput.value) {
            const productId = select.value;
            const clientId = document.getElementById('editInvoiceClient').value;
            const actualPrice = getActualPrice(clientId, productId);
            const quantity = parseFloat(quantityInput.value);
            const itemTotal = actualPrice * quantity;
            total += itemTotal;
        }
    });
    
    document.getElementById('edit-invoice-total').textContent = formatCurrency(total);
}

// Обработчики для полей ввода количества в форме редактирования
function handleEditQuantityInput(event) {
    const row = event.target.closest('.invoice-item-row');
    if (row) {
        const itemId = row.getAttribute('data-item-id');
        // Пересчитываем вес жарки, если это жарка
        const select = row.querySelector('.product-select');
        if (select && select.value) {
            const product = products.find(p => p.id === select.value);
            if (product) {
                const isRoast = product.name.toLowerCase().includes('жарка') || 
                              (product.category && product.category.toLowerCase().includes('жарка')) ||
                              product.name.toLowerCase().includes('обжар');
                if (isRoast) {
                    distributeEditRoastWeight(row);
                }
            }
        }
        syncMixedSaleQuantities(row);
        updateEditItemTotal(itemId);
    }
}

function handleEditQuantityKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const row = event.target.closest('.invoice-item-row');
        if (row) {
            const nextInput = row.nextElementSibling?.querySelector('.quantity-input');
            if (nextInput) {
                nextInput.focus();
            } else {
                addEditInvoiceItem();
                setTimeout(() => {
                    const newRow = document.querySelector('#edit-invoice-items-list .invoice-item-row:last-child');
                    if (newRow) {
                        newRow.querySelector('.quantity-input')?.focus();
                    }
                }, 50);
            }
        }
    }
}

// Настроить обработчики для полей ввода количества в форме редактирования
function setupEditQuantityInputListeners() {
    const inputs = document.querySelectorAll('#edit-invoice-items-list .quantity-input, #edit-invoice-items-list .kg-count-input');
    inputs.forEach(input => {
        input.removeEventListener('input', handleEditQuantityInput);
        input.removeEventListener('keydown', handleEditQuantityKeydown);
        input.addEventListener('input', handleEditQuantityInput);
        input.addEventListener('keydown', handleEditQuantityKeydown);
    });
}

// Обновить накладную
function updateInvoice() {
    const invoiceId = document.getElementById('editInvoiceId').value;
    if (!invoiceId) {
        alert('Ошибка: ID накладной не найден');
        return;
    }
    
    const invoiceIndex = invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex === -1) {
        alert('Накладная не найдена');
        return;
    }
    
    const oldInvoice = invoices[invoiceIndex];
    
    const client = document.getElementById('editInvoiceClient').value;
    const paymentType = document.getElementById('editPaymentType').value;
    const notes = document.getElementById('editInvoiceNotes').value.trim();
    
    if (!client) {
        alert('Пожалуйста, выберите клиента (или "Частное лицо")');
        return;
    }
    
    if (!paymentType) {
        alert('Выберите тип оплаты');
        return;
    }
    
    // Возвращаем товары на склад (старые количества)
    oldInvoice.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            adjustProductStockByInvoiceItem(product, item, 1);
            const pieceText = isKgUnit(item.unit) && Number(item.kgItemCount) > 0 ? ` / ${formatQuantity(item.kgItemCount, 'шт')} шт` : '';
            addMovement('Возврат', `Возвращено ${formatQuantity(item.quantity, item.unit)} ${item.unit}${pieceText} товара "${item.productName}" (редактирование накладной #${invoiceId})`, item.quantity);
        }
    });
    
    // Собираем новые товары из формы
    const rows = Array.from(document.querySelectorAll('#edit-invoice-items-list .invoice-item-row'));
    const items = [];
    let total = 0;
    const packageTypeUsage = createPackageTypeUsageTracker();
    
    for (const row of rows) {
        const select = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');
        const unitDisplay = row.querySelector('.unit-display');
        const itemId = row.getAttribute('data-item-id');

        if (!select.value || !quantityInput.value) {
            continue;
        }

        const productId = select.value;
        const quantity = parseFloat(quantityInput.value);
        const product = products.find(p => p.id === productId);
        const unit = unitDisplay.textContent;

        if (!product) {
            alert(`Ошибка: товар не найден в базе данных. ID: ${productId}`);
            // Возвращаем товары обратно на склад
            oldInvoice.items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                if (prod) {
                    adjustProductStockByInvoiceItem(prod, item, -1);
                }
            });
            return;
        }

        const isTobacco = isTobaccoProduct(product);
        const isRoast = isRoastProduct(product);
        const isSimplePackaged = isSimplePackagedProduct(product);
        const kgItemCount = getKgItemCountFromRow(row);
        const packageSaleMode = getPackageSaleModeFromRow(row);

        if (!validateKgItemCount(row, product, unit)) {
            oldInvoice.items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                if (prod) {
                    adjustProductStockByInvoiceItem(prod, item, -1);
                }
            });
            return;
        }
        if (!validateKgProductSalePieces(product, kgItemCount)) {
            oldInvoice.items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                if (prod) {
                    adjustProductStockByInvoiceItem(prod, item, -1);
                }
            });
            return;
        }

        if (isRoast && packageSaleMode !== 'partial') {
            const roastPackValues = getRoastPackValuesFromRow(row);
            if (getTotalRoastPackCount(roastPackValues) <= 0) {
                alert(`Для товара "${product.name}" укажите количество пакетов по типам (5/0, 4/1, 3/2, 2/3)`);
                oldInvoice.items.forEach(item => {
                    const prod = products.find(p => p.id === item.productId);
                    if (prod) {
                        adjustProductStockByInvoiceItem(prod, item, -1);
                    }
                });
                return;
            }
        }

        if (!validateInvoiceRowPackageTypeStock(row, product, packageTypeUsage, { existingInvoice: oldInvoice })) {
            oldInvoice.items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                if (prod) {
                    adjustProductStockByInvoiceItem(prod, item, -1);
                }
            });
            return;
        }

        if (isTobacco) {
            const availableTobaccoQty = getAvailableInvoiceQuantityForProduct(product) + getInvoiceExistingInventoryQuantity(oldInvoice, productId, product);
            if (quantity > availableTobaccoQty) {
                alert(`Недостаточно остатка для товара "${product.name}". Доступно: ${formatQuantity(availableTobaccoQty, unit)} ${unit}`);
                oldInvoice.items.forEach(item => {
                    const prod = products.find(p => p.id === item.productId);
                    if (prod) {
                        adjustProductStockByInvoiceItem(prod, item, -1);
                    }
                });
                return;
            }
            if (packageSaleMode === 'mixed') {
                const actualPrice = getActualPrice(client, productId);
                const mixedItems = buildMixedTobaccoInvoiceItems(row, product, productId, actualPrice, unit);
                if (!mixedItems) {
                    oldInvoice.items.forEach(item => {
                        const prod = products.find(p => p.id === item.productId);
                        if (prod) {
                            adjustProductStockByInvoiceItem(prod, item, -1);
                        }
                    });
                    return;
                }
                mixedItems.forEach(item => {
                    items.push(item);
                    total += item.total;
                });
                continue;
            }
            if (packageSaleMode === 'partial') {
                const actualPrice = getActualPrice(client, productId);
                const itemTotal = actualPrice * quantity;
                const item = {
                    productId: productId,
                    productName: product.name,
                    quantity: quantity,
                    price: actualPrice,
                    standardPrice: product.salePrice,
                    total: itemTotal,
                    unit: unit,
                    packageSaleMode: 'partial',
                    tobaccoType: getPartialPackageTypeFromRow(row, AUTO_TOBACCO_PURE_TYPE),
                    tobaccoPackCount: 0
                };
                if (isKgUnit(unit)) item.kgItemCount = kgItemCount;
                items.push(item);
                total += itemTotal;
                continue;
            }
            const packInputs = row.querySelectorAll('.tobacco-pack-count');
            const nonZeroPacks = Array.from(packInputs).filter(i => (parseFloat(i.value || '0') || 0) > 0);
            const packCounts = {};
            nonZeroPacks.forEach(input => {
                packCounts[input.dataset.tobaccoType] = (Number(packCounts[input.dataset.tobaccoType]) || 0) + (parseFloat(input.value || '0') || 0);
            });
            const allocations = allocateSoldPiecesAcrossPackTypes(quantity, packCounts, 'tobacco');
            if (quantity > 0 && allocations.length > 0) {
                allocations.forEach(part => {
                    const packs = Number(part.packCount) || 0;
                    const subQty = Number(part.pieces) || 0;
                    const actualPrice = getActualPrice(client, productId);
                    const itemTotal = actualPrice * subQty;
                    const item = {
                        productId: productId,
                        productName: product.name,
                        quantity: subQty,
                        price: actualPrice,
                        standardPrice: product.salePrice,
                        total: itemTotal,
                        unit: unit,
                        packageSaleMode: 'whole',
                        tobaccoType: part.type,
                        tobaccoPackCount: packs
                    };
                    if (isKgUnit(unit)) item.kgItemCount = kgItemCount;
                    items.push(item);
                    total += itemTotal;
                });
            } else if (quantity > 0) {
                const actualPrice = getActualPrice(client, productId);
                const itemTotal = actualPrice * quantity;
                const item = {
                    productId: productId,
                    productName: product.name,
                    quantity: quantity,
                    price: actualPrice,
                    standardPrice: product.salePrice,
                        total: itemTotal,
                        unit: unit,
                        packageSaleMode: 'whole'
                    };
                    if (isKgUnit(unit)) item.kgItemCount = kgItemCount;
                    items.push(item);
                    total += itemTotal;
                }
        } else if (isRoast && (isKgUnit(unit) ? kgItemCount : quantity) > (getAvailableInvoiceQuantityForProduct(product) + getInvoiceExistingInventoryQuantity(oldInvoice, productId, product))) {
            const availableRoastQty = getAvailableInvoiceQuantityForProduct(product) + getInvoiceExistingInventoryQuantity(oldInvoice, productId, product);
            alert(`Недостаточно остатка для товара "${product.name}". Доступно: ${formatQuantity(availableRoastQty, 'шт')} шт`);
            oldInvoice.items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                if (prod) {
                    adjustProductStockByInvoiceItem(prod, item, -1);
                }
            });
            return;
        } else if (isRoast && packageSaleMode === 'mixed') {
            const actualPrice = getActualPrice(client, productId);
            const mixedItems = buildMixedRoastInvoiceItems(row, product, productId, actualPrice, unit);
            if (!mixedItems) {
                oldInvoice.items.forEach(item => {
                    const prod = products.find(p => p.id === item.productId);
                    if (prod) {
                        adjustProductStockByInvoiceItem(prod, item, -1);
                    }
                });
                return;
            }
            mixedItems.forEach(item => {
                items.push(item);
                total += item.total;
            });
        } else if (quantity > 0 && (isRoast || quantity <= product.quantity)) {
            const actualPrice = getActualPrice(client, productId);
            const itemTotal = actualPrice * quantity;
            const item = {
                productId: productId,
                productName: product.name,
                quantity: quantity,
                price: actualPrice,
                    standardPrice: product.salePrice,
                    total: itemTotal,
                    unit: unit
                };
                if (isKgUnit(unit)) item.kgItemCount = kgItemCount;
                if (isRoast) {
                item.packageSaleMode = packageSaleMode;
                if (packageSaleMode === 'partial') {
                    item.roastType = getPartialPackageTypeFromRow(row, AUTO_ROAST_PURE_TYPE);
                } else {
                    const roastPackValues = getRoastPackValuesFromRow(row);
                    const roastPackOrder = getRoastPackOrderFromRow(row);
                    const totalPacks = getTotalRoastPackCount(roastPackValues);
                    item.roast = {};
                    ROAST_TYPE_CONFIGS.forEach(config => {
                        item.roast[config.packField] = roastPackValues[config.type] || 0;
                        item.roast[config.kgField] = parseFloat(row.dataset[config.kgField] || '0');
                    });
                    item.roastTypeOrder = roastPackOrder;
                    const singleType = ROAST_TYPE_CONFIGS.find(config => roastPackValues[config.type] > 0 && roastPackValues[config.type] === totalPacks);
                    if (singleType) item.roastType = singleType.type;
                    else if (totalPacks > 0) item.roastType = 'mixed';
                }
            } else if (isSimplePackaged) {
                item.packageSaleMode = packageSaleMode;
            }
            items.push(item);
            total += itemTotal;
        } else if (quantity > product.quantity) {
            alert(`Недостаточно остатка для товара "${product.name}". Доступно: ${formatQuantity(product.quantity, unit)} ${unit}`);
            // Возвращаем товары обратно на склад
            oldInvoice.items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                if (prod) {
                    adjustProductStockByInvoiceItem(prod, item, -1);
                }
            });
            return;
        }
    }
    
    if (items.length === 0) {
        alert('Добавьте товары в накладную');
        // Возвращаем товары обратно на склад
        oldInvoice.items.forEach(item => {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
                adjustProductStockByInvoiceItem(prod, item, -1);
            }
        });
        return;
    }
    
    // Списываем товары со склада (новые количества)
    items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            adjustProductStockByInvoiceItem(product, item, -1);
            const pieceText = isKgUnit(item.unit) && Number(item.kgItemCount) > 0 ? ` / ${formatQuantity(item.kgItemCount, 'шт')} шт` : '';
            addMovement('Продажа', `Продано ${formatQuantity(item.quantity, item.unit)} ${item.unit}${pieceText} товара "${item.productName}" (редактирование накладной #${invoiceId})`, -item.quantity);
        }
    });
    
    // Обновляем накладную
    invoices[invoiceIndex] = {
        ...oldInvoice,
        client: client,
        paymentType: paymentType,
        notes: notes,
        items: items,
        total: total
    };
    rebuildPartialSaleOpenedStockEvents();
    
    saveData('products', products);
    saveData('invoices', invoices);
    
    // Обновляем долг, если это накладная в долг
    if (oldInvoice.paymentType === 'debt' || paymentType === 'debt') {
        updateDebtAfterInvoiceEdit(oldInvoice, invoices[invoiceIndex]);
    }
    
    // Обновляем отчет, связанный с накладной
    updateInvoiceReport(invoices[invoiceIndex]);
    
    // Закрываем модальное окно
    closeModal('editInvoiceModal');
    
    // Обновляем отображение
    loadInvoices();
    refreshIncomingIfVisible();
    updateStats();
    loadDashboardData();
    
    // Обновляем отчеты, если открыта вкладка отчетов
    if (document.getElementById('reports') && document.getElementById('reports').classList.contains('active')) {
        generateReport();
    }
    
    alert('Накладная успешно обновлена');
}

// Обновить отчет после редактирования накладной
function updateInvoiceReport(invoice) {
    // Находим отчет по ID накладной
    const reportIndex = reports.findIndex(r => r.invoiceId === invoice.id);
    
    if (reportIndex !== -1) {
        // Обновляем существующий отчет
        const clientName = getDisplayClientName(invoice.client);
        reports[reportIndex] = {
            ...reports[reportIndex],
            date: invoice.date,
            client: clientName,
            clientId: invoice.client,
            paymentType: invoice.paymentType,
            total: invoice.total,
            items: invoice.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                unit: item.unit,
                packageSaleMode: item.packageSaleMode || 'whole',
                tobaccoType: item.tobaccoType,
                tobaccoPackCount: item.tobaccoPackCount,
                openedTobaccoPackCount: item.openedTobaccoPackCount,
                kgItemCount: item.kgItemCount,
                roastType: item.roastType,
                openedRoastPackCount: item.openedRoastPackCount,
                roastTypeOrder: item.roastTypeOrder || [],
                roast: item.roast
            }))
        };
        saveData('reports', reports);
    } else {
        // Если отчета нет, создаем новый (на случай, если накладная была создана до внедрения отчетов)
        createSalesReport(invoice);
    }
}

// Обновить долг после редактирования накладной
function updateDebtAfterInvoiceEdit(oldInvoice, newInvoice) {
    const oldDebtClientName = getDebtClientName(oldInvoice.client);
    const newDebtClientName = getDebtClientName(newInvoice.client);
    let oldDebt = ensureDebtRecordShape(debts.find(d => d.clientName === oldDebtClientName));
    let newDebt = ensureDebtRecordShape(debts.find(d => d.clientName === newDebtClientName));
    
    // Если была накладная в долг, уменьшаем долг на старую сумму
    if (oldInvoice.paymentType === 'debt' && oldDebt) {
        oldDebt.amount -= oldInvoice.total;
        if (oldDebt.invoices) {
            oldDebt.invoices = oldDebt.invoices.filter(inv => inv.id !== oldInvoice.id);
        }
    }
    
    // Если новая накладная в долг, добавляем к долгу
    if (newInvoice.paymentType === 'debt') {
        if (!newDebtClientName) {
            saveData('debts', debts);
            loadDebts();
            return;
        }

        if (!newDebt) {
            newDebt = {
                id: generateId(),
                clientName: newDebtClientName,
                amount: newInvoice.total,
                date: new Date().toISOString(),
                description: '',
                invoices: [],
                history: []
            };
            debts.push(newDebt);
        } else {
            newDebt.clientName = newDebtClientName;
            newDebt.amount += newInvoice.total;
        }
        
        if (!newDebt.invoices) {
            newDebt.invoices = [];
        }
        const originalIndex = invoices.findIndex(inv => inv.id === newInvoice.id);
        const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
        const invoiceExists = newDebt.invoices.find(inv => inv.id === newInvoice.id);
        if (!invoiceExists) {
            newDebt.invoices.push({
                id: newInvoice.id,
                number: invoiceNumber,
                amount: newInvoice.total,
                date: newInvoice.date,
                items: newInvoice.items
            });
        } else {
            const invoiceIndex = newDebt.invoices.findIndex(inv => inv.id === newInvoice.id);
            if (invoiceIndex !== -1) {
                newDebt.invoices[invoiceIndex] = {
                    id: newInvoice.id,
                    number: invoiceNumber,
                    amount: newInvoice.total,
                    date: newInvoice.date,
                    items: newInvoice.items
                };
            }
        }
    }
    
    if (oldDebt && oldDebt.amount <= 0) {
        const debtIndex = debts.findIndex(d => d.id === oldDebt.id);
        if (debtIndex !== -1) {
            debts.splice(debtIndex, 1);
        }
    }

    if (newDebt && newDebt !== oldDebt && newDebt.amount <= 0) {
        const debtIndex = debts.findIndex(d => d.id === newDebt.id);
        if (debtIndex !== -1) {
            debts.splice(debtIndex, 1);
        }
    }
    
    saveData('debts', debts);
    loadDebts();
}

// Функция обновления накладной с валидацией
function updateInvoiceWithValidation() {
    const invoiceId = document.getElementById('editInvoiceId').value;
    const beforeInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!beforeInvoice) {
        alert('Накладная не найдена');
        return;
    }

    const cachedApproval = window.currentInvoiceEditApproval;
    let permission;

    if (cachedApproval && cachedApproval.invoiceId === invoiceId && (Date.now() - cachedApproval.approvedAt) < (30 * 60 * 1000)) {
        if (isSellerMode()) {
            const reason = prompt('Укажите причину редактирования накладной');
            if (!reason || !reason.trim()) {
                alert('Нужно обязательно указать причину');
                return;
            }
            permission = { allowed: true, reason: reason.trim() };
        } else {
            permission = { allowed: true, reason: '' };
        }
    } else {
        permission = requestInvoiceMutationPermission(beforeInvoice, 'edit');
    }

    if (!permission.allowed) {
        return;
    }

    const beforeSnapshot = JSON.stringify(beforeInvoice);
    const beforeAuditSnapshot = createInvoiceAuditSnapshot(beforeInvoice);
    updateInvoice();

    const updatedInvoice = invoices.find(inv => inv.id === invoiceId);
    if (updatedInvoice && JSON.stringify(updatedInvoice) !== beforeSnapshot) {
        logActivity('edit_invoice', {
            invoiceId: updatedInvoice.id,
            total: updatedInvoice.total,
            paymentType: updatedInvoice.paymentType,
            reason: permission.reason || 'Без причины',
            sellerName: updatedInvoice.sellerName || null,
            beforeInvoiceSnapshot: beforeAuditSnapshot,
            afterInvoiceSnapshot: createInvoiceAuditSnapshot(updatedInvoice)
        });
    }

    window.currentInvoiceEditApproval = null;
}

// Инициализация поиска клиента для редактирования
function initializeEditClientSearch() {
    const searchInput = document.getElementById('editInvoiceClientSearch');
    const dropdown = document.getElementById('editClientDropdown');
    const hiddenInput = document.getElementById('editInvoiceClient');
    const clearButton = document.getElementById('clearEditClientSearch');
    
    if (!searchInput || !dropdown || !hiddenInput) return;
    
    // Удаляем старые обработчики, если они есть
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    const newHiddenInput = hiddenInput.cloneNode(true);
    hiddenInput.parentNode.replaceChild(newHiddenInput, hiddenInput);
    
    // Получаем обновленные элементы
    const updatedSearchInput = document.getElementById('editInvoiceClientSearch');
    const updatedHiddenInput = document.getElementById('editInvoiceClient');
    const updatedClearButton = document.getElementById('clearEditClientSearch');
    
    let selectedClientId = null;
    let filteredClients = [];
    let highlightedIndex = -1;
    
    function getAllClients() {
        const allClients = [...clients];
        allClients.unshift({
            id: 'private_person',
            name: 'Частное лицо',
            phone: '',
            email: '',
            address: ''
        });
        return allClients;
    }
    
    updatedSearchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        const allClients = getAllClients();
        
        if (query === '') {
            // Если поле пустое, показываем всех клиентов
            filteredClients = allClients;
            showDropdown(filteredClients);
            highlightedIndex = -1;
            return;
        }
        
        // Фильтруем клиентов
        filteredClients = allClients.filter(client =>
            client.name.toLowerCase().includes(query) ||
            (client.phone && client.phone.includes(query)) ||
            (client.email && client.email.toLowerCase().includes(query))
        );
        
        showDropdown(filteredClients);
        highlightedIndex = -1;
    });
    
    function selectClient(client) {
        selectedClientId = client.id;
        updatedHiddenInput.value = client.id;
        updatedSearchInput.value = client.name;
        hideDropdown();
        updateEditInvoicePricesForClient(client.id);
    }
    
    if (updatedClearButton) {
        updatedClearButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectedClientId = null;
            updatedHiddenInput.value = '';
            updatedSearchInput.value = '';
            // Показываем список всех клиентов после очистки
            filteredClients = getAllClients();
            showDropdown(filteredClients);
        });
    }
    
    // Обработчик фокуса на поле поиска
    updatedSearchInput.addEventListener('focus', function() {
        // При фокусе показываем всех клиентов
        filteredClients = getAllClients();
        showDropdown(filteredClients);
        highlightedIndex = -1;
    });
    
    // Обработчик клика на поле поиска
    updatedSearchInput.addEventListener('click', function() {
        // При клике показываем всех клиентов, если поле пустое
        if (!updatedSearchInput.value.trim()) {
            filteredClients = getAllClients();
            showDropdown(filteredClients);
        }
    });
    
    // Удаляем старый обработчик, если он был добавлен ранее
    if (window.editClientSearchClickHandler) {
        document.removeEventListener('click', window.editClientSearchClickHandler);
    }
    
    function handleClickOutside(e) {
        if (!updatedSearchInput.closest('.client-search-container').contains(e.target)) {
            hideDropdown();
        }
    }
    
    // Сохраняем обработчик для последующего удаления
    window.editClientSearchClickHandler = handleClickOutside;
    document.addEventListener('click', handleClickOutside);
    
    function showDropdown(clients) {
        if (clients.length === 0) {
            dropdown.innerHTML = '<div class="client-dropdown-empty">Клиенты не найдены</div>';
        } else {
            const searchQuery = updatedSearchInput.value.trim();
            const headerText = searchQuery ? `Найдено клиентов: ${clients.length}` : `Всего клиентов: ${clients.length}`;
            
            dropdown.innerHTML = `
                <div class="client-dropdown-header">
                    <span class="client-count">${headerText}</span>
                </div>
                ${clients.map((client, index) => `
                    <div class="client-dropdown-item" data-index="${index}" data-client-id="${client.id}">
                        <div class="client-name">${client.name}</div>
                        ${client.phone ? `<div class="client-details">Телефон: ${client.phone}</div>` : ''}
                        ${client.email ? `<div class="client-details">Email: ${client.email}</div>` : ''}
                    </div>
                `).join('')}
            `;
            
            dropdown.querySelectorAll('.client-dropdown-item').forEach((item, index) => {
                item.addEventListener('click', function() {
                    selectClient(clients[index]);
                });
            });
        }
        
        dropdown.classList.add('show');
    }
    
    function hideDropdown() {
        dropdown.classList.remove('show');
        highlightedIndex = -1;
    }
    
    // Устанавливаем текущего клиента, если он уже выбран
    const currentClientId = updatedHiddenInput.value;
    if (currentClientId) {
        const allClients = getAllClients();
        const currentClient = allClients.find(c => c.id === currentClientId);
        if (currentClient) {
            updatedSearchInput.value = currentClient.name;
        }
    }
    
    // Обработчик изменения клиента для обновления цен
    updatedHiddenInput.addEventListener('change', function() {
        updateEditInvoicePricesForClient(this.value);
    });
}

// Обновить цены для всех товаров в форме редактирования при смене клиента
window.updateEditInvoicePricesForClient = function(clientId) {
    const rows = document.querySelectorAll('#edit-invoice-items-list .invoice-item-row');
    rows.forEach(row => {
        const itemId = row.getAttribute('data-item-id');
        const select = row.querySelector('.product-select');
        const priceDisplay = row.querySelector('.price-display');
        const totalDisplay = row.querySelector('.total-display');
        const quantityInput = row.querySelector('.quantity-input');
        
        if (!select || !select.value || !priceDisplay) {
            return;
        }
        
        const productId = select.value;
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            return;
        }
        
        // Получаем актуальную цену (персональную или стандартную)
        const actualPrice = getActualPrice(clientId, productId);
        const standardPrice = product.salePrice;
        
        // Обновляем отображение цены с индикатором персональной цены
        if (actualPrice !== standardPrice) {
            priceDisplay.innerHTML = `
                <span style="color: #e74c3c; font-weight: 600; text-decoration: underline; text-decoration-style: wavy; text-underline-offset: 3px;" title="Персональная цена">${formatCurrency(actualPrice)}</span>
                <br><small style="color: #7f8c8d; text-decoration: line-through; font-size: 11px;">${formatCurrency(standardPrice)}</small>
            `;
        } else {
            priceDisplay.textContent = formatCurrency(actualPrice);
        }
        
        // Обновляем итог для этого товара
        if (quantityInput && quantityInput.value) {
            const quantity = parseFloat(quantityInput.value) || 0;
            const total = actualPrice * quantity;
            if (totalDisplay) {
                totalDisplay.textContent = formatCurrency(total);
            }
        }
    });
    
    // Обновляем общий итог один раз после всех обновлений
    updateEditInvoiceTotal();
};

// Инициализация выбора типа оплаты для редактирования
function initializeEditPaymentTypeSelect() {
    const selectElement = document.getElementById('editPaymentTypeSelect');
    const displayElement = selectElement.querySelector('.payment-type-display');
    const dropdownElement = selectElement.querySelector('.payment-type-dropdown');
    const hiddenInput = document.getElementById('editPaymentType');
    const options = selectElement.querySelectorAll('.payment-type-option');
    
    if (!selectElement || !displayElement || !dropdownElement || !hiddenInput) return;
    
    let isOpen = false;
    let selectedValue = '';
    
    const paymentTypes = {
        'cash': {
            name: 'Наличными',
            desc: 'Оплата наличными деньгами',
            icon: 'fas fa-money-bill-wave'
        },
        'debt': {
            name: 'В долг',
            desc: 'Оплата в рассрочку',
            icon: 'fas fa-hand-holding-usd'
        }
    };
    
    displayElement.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown();
    });
    
    options.forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const value = option.getAttribute('data-value');
            selectOption(value);
        });
    });
    
    document.addEventListener('click', function(e) {
        if (!selectElement.contains(e.target)) {
            closeDropdown();
        }
    });
    
    function toggleDropdown() {
        isOpen = !isOpen;
        if (isOpen) {
            dropdownElement.style.display = 'block';
            selectElement.setAttribute('aria-expanded', 'true');
        } else {
            closeDropdown();
        }
    }
    
    function closeDropdown() {
        isOpen = false;
        dropdownElement.style.display = 'none';
        selectElement.setAttribute('aria-expanded', 'false');
    }
    
    function selectOption(value) {
        selectedValue = value;
        hiddenInput.value = value;
        const type = paymentTypes[value];
        displayElement.innerHTML = `
            <i class="${type.icon}"></i>
            <span>${type.name}</span>
            <i class="fas fa-chevron-down payment-type-arrow"></i>
        `;
        closeDropdown();
    }
    
    // Устанавливаем текущий тип оплаты, если он уже выбран
    const currentPaymentType = hiddenInput.value;
    if (currentPaymentType) {
        selectOption(currentPaymentType);
    }
}

// Установить тип оплаты в форме редактирования
function setEditPaymentType(value) {
    const hiddenInput = document.getElementById('editPaymentType');
    if (hiddenInput) {
        hiddenInput.value = value;
        // Обновляем отображение
        setTimeout(() => {
            initializeEditPaymentTypeSelect();
        }, 100);
    }
}

// ==================== ФУНКЦИИ ДЛЯ КАЛЬКУЛЯТОРА СДАЧИ ====================

// Показать калькулятор сдачи для накладной
function showChangeCalculator(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Накладная не найдена');
        return;
    }
    
    // Сохраняем ID накладной в глобальной переменной для функции сохранения
    window.currentChangeCalculatorInvoiceId = invoiceId;
    
    // Заполняем информацию о накладной
    fillInvoiceSummary(invoice);
    
    // Устанавливаем сумму заказа
    document.getElementById('orderTotalDisplay').textContent = formatCurrency(invoice.total);
    
    const receivedInput = document.getElementById('receivedAmount');
    const changeInput = document.getElementById('manualChangeAmount');
    receivedInput.value = invoice.changeInfo?.receivedAmount ?? '';
    changeInput.value = invoice.changeInfo?.changeAmount ?? '0';
    
    // Показываем модальное окно
    openModal('changeCalculatorModal');
    
    // Фокусируемся на поле ввода
    setTimeout(() => {
        receivedInput.focus();
    }, 100);
}

// Заполнить информацию о накладной в калькуляторе
function fillInvoiceSummary(invoice) {
    const summaryContainer = document.getElementById('cashEntrySummary');
    if (!summaryContainer) return;

    const invoiceNumber = invoices.findIndex(inv => inv.id === invoice.id) + 1;
    summaryContainer.innerHTML = `
        <strong>Накладная #${invoiceNumber > 0 ? invoiceNumber : '?'}</strong>
        <span>Клиент: ${getDisplayClientName(invoice.client)}</span>
        <span>Сумма накладной: ${formatCurrency(invoice.total)}</span>
    `;
}

// Сохранить информацию о сдаче в накладной
function saveChangeInfo() {
    const total = parseFloat(document.getElementById('orderTotalDisplay').textContent.replace(/[^\d.,]/g, '').replace(',', '.'));
    const received = parseFloat(document.getElementById('receivedAmount').value) || 0;
    const change = parseFloat(document.getElementById('manualChangeAmount').value) || 0;
    
    if (!received || received <= 0) {
        alert('Сначала введите полученную сумму');
        return;
    }
    
    if (change < 0) {
        alert('Сдача не может быть отрицательной');
        return;
    }

    if (change > received) {
        alert('Сдача не может быть больше полученной суммы');
        return;
    }
    
    // Получаем ID накладной из глобальной переменной
    const invoiceId = window.currentChangeCalculatorInvoiceId;
    if (!invoiceId) {
        alert('Ошибка: не найден ID накладной');
        return;
    }
    
    // Получаем накладную из текущего состояния приложения
    const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);
    
    if (invoiceIndex === -1) {
        alert('Ошибка: накладная не найдена');
        return;
    }
    
    // Добавляем информацию о сдаче в накладную
    invoices[invoiceIndex].changeInfo = {
        receivedAmount: received,
        changeAmount: change,
        savedAt: new Date().toISOString()
    };
    
    // Сохраняем обновленную накладную
    saveData('invoices', invoices);
    logActivity('save_change', {
        invoiceId: invoiceId,
        total: total,
        receivedAmount: received,
        changeAmount: change,
        invoiceSnapshot: createInvoiceAuditSnapshot(invoices[invoiceIndex])
    });
    
    // Закрываем модальное окно
    closeModal('changeCalculatorModal');
    
    // Показываем краткое уведомление в баннере
    showPostInvoiceActions(invoiceId, invoices[invoiceIndex].total);
    
    // Обновляем отображение накладных с небольшой задержкой
    setTimeout(() => {
        loadInvoices();
    }, 500);
}

// Глобальные переменные для выбранных накладных
let selectedInvoices = new Set();

function syncInvoiceBulkActionsVisibility() {
    const sellerMode = isSellerMode();
    const selectedPanel = document.getElementById('selectedInvoicesPanel');
    const multiCalcBtn = document.getElementById('multiCalcBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');

    if (selectAllBtn) {
        selectAllBtn.hidden = sellerMode;
        selectAllBtn.disabled = sellerMode;
        selectAllBtn.setAttribute('aria-hidden', sellerMode ? 'true' : 'false');
        selectAllBtn.style.display = sellerMode ? 'none' : '';
    }

    if (multiCalcBtn) {
        multiCalcBtn.hidden = sellerMode;
        multiCalcBtn.disabled = sellerMode;
        multiCalcBtn.setAttribute('aria-hidden', sellerMode ? 'true' : 'false');
        multiCalcBtn.style.display = sellerMode ? 'none' : (selectedInvoices.size > 0 ? 'inline-flex' : 'none');
    }

    if (selectedPanel) {
        selectedPanel.hidden = sellerMode;
        selectedPanel.setAttribute('aria-hidden', sellerMode ? 'true' : 'false');
        if (sellerMode) {
            selectedPanel.style.display = 'none';
        }
    }
}

// Обновить информацию о выбранных накладных
function updateSelectedInvoices() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');
    selectedInvoices.clear();
    
    checkboxes.forEach(checkbox => {
        const invoiceId = checkbox.id.replace('invoice-', '');
        selectedInvoices.add(invoiceId);
    });
    
    const selectedPanel = document.getElementById('selectedInvoicesPanel');
    const selectedCount = document.getElementById('selectedCount');
    const selectedTotal = document.getElementById('selectedTotal');
    const multiCalcBtn = document.getElementById('multiCalcBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const sellerMode = isSellerMode();

    if (sellerMode) {
        if (selectedPanel) {
            selectedPanel.style.display = 'none';
        }
        if (multiCalcBtn) {
            multiCalcBtn.style.display = 'none';
        }
        if (selectAllBtn) {
            selectAllBtn.style.display = 'none';
        }
        document.querySelectorAll('.invoice-card').forEach(card => {
            card.classList.remove('selected');
        });
        return;
    }
    
    if (selectedInvoices.size > 0) {
        // Показываем панель выбранных накладных
        selectedPanel.style.display = 'flex';
        
        // Обновляем счетчик
        selectedCount.textContent = selectedInvoices.size;
        
        // Рассчитываем общую сумму
        let total = 0;
        selectedInvoices.forEach(invoiceId => {
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
                total += invoice.total;
            }
        });
        
        selectedTotal.textContent = formatCurrency(total);
        
        // Показываем кнопку расчета общей сдачи
        multiCalcBtn.style.display = sellerMode ? 'none' : 'inline-flex';
        
        // Обновляем текст кнопки "Выбрать все"
        if (!sellerMode) {
            selectAllBtn.innerHTML = '<i class="fas fa-square"></i> Снять выбор';
            selectAllBtn.onclick = clearSelection;
        }
        
        // Добавляем визуальное выделение выбранных карточек
        document.querySelectorAll('.invoice-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        checkboxes.forEach(checkbox => {
            const card = checkbox.closest('.invoice-card');
            if (card) {
                card.classList.add('selected');
            }
        });
    } else {
        // Скрываем панель
        selectedPanel.style.display = 'none';
        multiCalcBtn.style.display = 'none';
        
        // Возвращаем текст кнопки "Выбрать все"
        if (!sellerMode) {
            selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> Выбрать все';
            selectAllBtn.onclick = selectAllInvoices;
        }
        
        // Убираем выделение
        document.querySelectorAll('.invoice-card').forEach(card => {
            card.classList.remove('selected');
        });
    }
}

// Выбрать все накладные
function selectAllInvoices() {
    if (isSellerMode()) return;
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelectedInvoices();
}

// Снять выбор со всех накладных
function clearSelection() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedInvoices();
}

// Показать калькулятор для нескольких накладных
function showMultiInvoiceCalculator() {
    if (isSellerMode()) return;
    if (selectedInvoices.size === 0) {
        alert('Выберите накладные для расчета сдачи');
        return;
    }
    
    // Собираем информацию о выбранных накладных
    const selectedInvoicesData = [];
    let totalAmount = 0;
    
    selectedInvoices.forEach(invoiceId => {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
            selectedInvoicesData.push(invoice);
            totalAmount += invoice.total;
        }
    });
    
    // Сохраняем данные в глобальную переменную
    window.multiInvoiceData = {
        invoices: selectedInvoicesData,
        totalAmount: totalAmount
    };
    
    // Показываем модальное окно с калькулятором
    showMultiInvoiceCalculatorModal();
}

// Показать модальное окно калькулятора для нескольких накладных
function showMultiInvoiceCalculatorModal() {
    const data = window.multiInvoiceData;
    if (!data) return;
    
    // Блокируем скролл body при открытии модального окна
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.id = 'multiInvoiceCalculatorModal';
    
    const invoicesList = data.invoices.map(invoice => {
        const originalIndex = invoices.findIndex(inv => inv.id === invoice.id);
        const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
        return `
            <div class="multi-invoice-item">
                <span class="invoice-number">Накладная #${invoiceNumber}</span>
                <span class="invoice-amount">${formatCurrency(invoice.total)}</span>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-calculator"></i> Калькулятор общей сдачи</h3>
                <span class="close" onclick="closeModal('multiInvoiceCalculatorModal')">&times;</span>
            </div>
            <div class="modal-body">
                <div class="multi-invoice-summary">
                    <h4>Выбранные накладные:</h4>
                    <div class="multi-invoice-list">
                        ${invoicesList}
                    </div>
                    <div class="multi-invoice-total">
                        <strong>Общая сумма: ${formatCurrency(data.totalAmount)}</strong>
                    </div>
                </div>
                
                <div class="change-calculator">
                    <div class="form-group">
                        <label for="multiReceivedAmount">Получено от клиента (₽)</label>
                        <div class="amount-input-wrapper">
                            <input type="number" id="multiReceivedAmount" class="form-control" step="0.01" placeholder="Введите сумму" oninput="calculateMultiChange()">
                            <button type="button" class="btn btn-outline-success btn-sm" onclick="suggestMultiStandardAmount()" title="Предложить удобную сумму">
                                <i class="fas fa-magic"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="standard-amount-buttons" style="margin-top: 15px;">
                        <div class="standard-amounts-label">Стандартные суммы:</div>
                        <div class="quick-amount-buttons">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="setMultiQuickAmount(1000)">1000 ₽</button>
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="setMultiQuickAmount(2000)">2000 ₽</button>
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="setMultiQuickAmount(5000)">5000 ₽</button>
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="setMultiQuickAmount(10000)">10000 ₽</button>
                        </div>
                    </div>
                    
                    <div id="multiChangeDisplay" style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 12px; display: none;">
                        <div class="change-info">
                            <div class="change-row">
                                <span class="change-label">Общая сумма заказов:</span>
                                <span class="change-value" id="multiOrderTotalDisplay">0 ₽</span>
                            </div>
                            <div class="change-row">
                                <span class="change-label">Получено:</span>
                                <span class="change-value" id="multiReceivedDisplay">0 ₽</span>
                            </div>
                            <div class="change-row change-total">
                                <span class="change-label">Сдача:</span>
                                <span class="change-value" id="multiChangeAmount">0 ₽</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('multiInvoiceCalculatorModal')">Закрыть</button>
                <button class="btn btn-success" onclick="saveMultiChangeInfo()" id="saveMultiChangeBtn" style="display: none;">
                    <i class="fas fa-save"></i> Сохранить
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Устанавливаем общую сумму
    document.getElementById('multiOrderTotalDisplay').textContent = formatCurrency(data.totalAmount);
    
    // Фокусируемся на поле ввода
    setTimeout(() => {
        document.getElementById('multiReceivedAmount').focus();
    }, 100);
}

// Обновить отображение конкретной накладной без перезагрузки всей страницы
function updateInvoiceDisplay(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    // Ищем карточку накладной по содержимому (номеру накладной)
    const originalIndex = invoices.findIndex(inv => inv.id === invoiceId);
    const invoiceNumber = originalIndex !== -1 ? originalIndex + 1 : '?';
    
    // Ищем карточку по номеру накладной в заголовке
    const invoiceCards = document.querySelectorAll('.invoice-card');
    let invoiceCard = null;
    
    for (let card of invoiceCards) {
        const title = card.querySelector('.card-title');
        if (title && title.textContent.includes(`Накладная #${invoiceNumber}`)) {
            invoiceCard = card;
            break;
        }
    }
    
    if (!invoiceCard) {
        // Если не нашли, обновляем всю страницу
        loadInvoices();
        return;
    }
    
    const client = clients.find(c => c.id === invoice.client);
    
    const itemsList = invoice.items.map(item => 
        `<div class="invoice-item-preview">
            <span class="item-name">${item.productName} ${getItemTypeBadges(item)}</span>
            <span class="item-quantity">${formatQuantity(item.quantity, item.unit)} ${item.unit}</span>
            <span class="item-price">${formatCurrency(item.price)}</span>
            <span class="item-total">${formatCurrency(item.total)}</span>
        </div>`
    ).join('');
    
    const changeInfoHtml = invoice.changeInfo ? 
        `<div class="card-info change-info">
            <span>Сдача:</span>
            <span>Получено: ${formatCurrency(invoice.changeInfo.receivedAmount)} | Сдача: ${formatCurrency(invoice.changeInfo.changeAmount)}</span>
        </div>` : '';
    
    const newContent = `
        <div class="card-header">
            <div class="card-title">Накладная #${invoiceNumber}</div>
            <div class="card-actions">
                <button class="btn btn-secondary btn-sm" onclick="previewInvoice('${invoice.id}')" title="Предпросмотр">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="printInvoice('${invoice.id}')" title="Печать">
                    <i class="fas fa-print"></i>
                </button>
                ${invoice.paymentType === 'cash' ? `
                <button class="btn btn-success btn-sm" onclick="showChangeCalculator('${invoice.id}')" title="Указать наличные">
                    <i class="fas fa-money-bill-wave"></i>
                </button>
                ` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${invoice.id}')" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="card-content">
            <div class="invoice-preview">
                <div class="invoice-info">
                    <div class="card-info">
                        <span>Дата:</span>
                        <span>${formatDate(invoice.date)}</span>
                    </div>
                    <div class="card-info">
                        <span>Клиент:</span>
                        <span>${getDisplayClientName(invoice.client)}</span>
                    </div>
                    <div class="card-info">
                        <span>Оплата:</span>
                        <span>${invoice.paymentType === 'cash' ? 'Наличными' : 'В долг'}</span>
                    </div>
                    ${invoice.notes ? `<div class="card-info">
                        <span>Примечания:</span>
                        <span>${invoice.notes}</span>
                    </div>` : ''}
                    ${changeInfoHtml}
                </div>
                <div class="invoice-total-section">
                    <div class="invoice-total-wrapper">
                        <span class="invoice-total-label">Итог:</span>
                        <span class="invoice-total-amount">${formatCurrency(invoice.total)}</span>
                    </div>
                </div>
                <div class="invoice-items-preview">
                    <h4><i class="fas fa-list"></i> Товары в накладной:</h4>
                    <div class="items-preview-list">
                        ${itemsList}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    invoiceCard.innerHTML = newContent;
    invoiceCard.setAttribute('data-invoice-id', invoiceId);
}

// Функции для калькулятора нескольких накладных
function calculateMultiChange() {
    const data = window.multiInvoiceData;
    if (!data) return;
    
    const total = data.totalAmount;
    const received = parseFloat(document.getElementById('multiReceivedAmount').value) || 0;
    const changeDisplay = document.getElementById('multiChangeDisplay');
    const changeAmount = document.getElementById('multiChangeAmount');
    const receivedDisplay = document.getElementById('multiReceivedDisplay');
    const saveMultiChangeBtn = document.getElementById('saveMultiChangeBtn');
    
    if (received <= 0) {
        changeDisplay.style.display = 'none';
        saveMultiChangeBtn.style.display = 'none';
        return;
    }
    
    // Обновляем отображение полученной суммы
    if (receivedDisplay) {
        receivedDisplay.textContent = formatCurrency(received);
    }
    
    const change = received - total;
    
    if (change >= 0) {
        changeAmount.textContent = formatCurrency(change);
        changeDisplay.style.display = 'block';
        saveMultiChangeBtn.style.display = 'inline-flex';
        
        // Изменяем цвет в зависимости от суммы сдачи
        if (change === 0) {
            changeAmount.style.color = '#059669';
            changeAmount.style.fontWeight = '800';
        } else if (change <= 50) {
            changeAmount.style.color = '#d97706';
            changeAmount.style.fontWeight = '700';
        } else if (change <= 200) {
            changeAmount.style.color = '#f59e0b';
            changeAmount.style.fontWeight = '700';
        } else {
            changeAmount.style.color = '#059669';
            changeAmount.style.fontWeight = '700';
        }
    } else {
        changeAmount.textContent = `Недостаточно: ${formatCurrency(Math.abs(change))}`;
        changeAmount.style.color = '#dc2626';
        changeAmount.style.fontWeight = '700';
        changeDisplay.style.display = 'block';
        saveMultiChangeBtn.style.display = 'none';
    }
}

function suggestMultiStandardAmount() {
    const data = window.multiInvoiceData;
    if (!data) return;
    
    const suggestedAmount = calculateOptimalAmount(data.totalAmount);
    document.getElementById('multiReceivedAmount').value = suggestedAmount;
    calculateMultiChange();
}

function setMultiQuickAmount(amount) {
    document.getElementById('multiReceivedAmount').value = amount;
    calculateMultiChange();
    document.getElementById('multiReceivedAmount').focus();
}

function saveMultiChangeInfo() {
    const data = window.multiInvoiceData;
    if (!data) return;
    
    const received = parseFloat(document.getElementById('multiReceivedAmount').value) || 0;
    const change = received - data.totalAmount;
    
    if (!received || received <= 0) {
        alert('Сначала введите полученную сумму');
        return;
    }
    
    if (change < 0) {
        alert('Полученная сумма меньше общей суммы заказов');
        return;
    }
    
    // Сохраняем информацию о сдаче во все выбранные накладные
    data.invoices.forEach(invoice => {
        const invoiceIndex = invoices.findIndex(inv => inv.id === invoice.id);
        if (invoiceIndex !== -1) {
            invoices[invoiceIndex].changeInfo = {
                receivedAmount: received,
                changeAmount: change,
                savedAt: new Date().toISOString(),
                isMultiInvoice: true,
                relatedInvoices: data.invoices.map(inv => inv.id)
            };
        }
    });
    
    // Сохраняем обновленные накладные
    saveData('invoices', invoices);
    
    // Закрываем модальное окно
    closeModal('multiInvoiceCalculatorModal');
    
    // Показываем уведомление
    showPostInvoiceActions(data.invoices[0].id, data.totalAmount);
    
    // Обновляем отображение накладных
    setTimeout(() => {
        loadInvoices();
        clearSelection();
    }, 500);
}

// Распечатать чек сдачи
function printChangeReceipt() {
    const total = document.getElementById('orderTotalDisplay').textContent;
    const received = document.getElementById('receivedAmount').value;
    const change = document.getElementById('changeAmount').textContent;
    
    if (!received || received <= 0) {
        alert('Сначала введите полученную сумму');
        return;
    }
    
    // Создаем окно для печати
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Чек сдачи</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { max-width: 400px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .row { display: flex; justify-content: space-between; margin: 10px 0; }
                .total { border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; font-weight: bold; font-size: 18px; }
                .change { color: #059669; font-size: 20px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>ЧЕК СДАЧИ</h2>
                    <p>${new Date().toLocaleString('ru-RU')}</p>
                </div>
                
                <div class="row">
                    <span>Сумма заказа:</span>
                    <span>${total}</span>
                </div>
                
                <div class="row">
                    <span>Получено:</span>
                    <span>${formatCurrency(parseFloat(received))}</span>
                </div>
                
                <div class="row total change">
                    <span>СДАЧА:</span>
                    <span>${change}</span>
                </div>
                
                <div class="footer">
                    <p>Спасибо за покупку!</p>
                    <p>Сдача рассчитана автоматически</p>
                </div>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Автоматически открываем диалог печати
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// ==================== ЗАРАБОТОК ====================
function getTodayDateString(date) {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
}

function getInvoiceDateString(invoice) {
    if (!invoice || !invoice.date) return '';
    try {
        return new Date(invoice.date).toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

function readEarningsMarginMap() {
    return readStorageJson('earningsMargins', {});
}

function writeEarningsMarginMap(map) {
    saveData('earningsMargins', map || {});
}

function loadEarnings() {
    const dateInput = document.getElementById('earnings-date');
    const marginTypeSelect = document.getElementById('earnings-margin-type');
    const rowsContainer = document.getElementById('earnings-rows');
    const totalEl = document.getElementById('earnings-total');
    const countEl = document.getElementById('earnings-count');

    if (!dateInput || !rowsContainer) return;

    // Дата по умолчанию сегодня
    if (!dateInput.value) {
        dateInput.value = getTodayDateString();
    }
    const selectedDate = dateInput.value;

    // Группируем сегодняшние продажи по товарам на основе invoices
    const salesByProductId = {};
    invoices.forEach(inv => {
        if (getInvoiceDateString(inv) !== selectedDate) return;
        (inv.items || []).forEach(item => {
            if (!salesByProductId[item.productId]) {
                salesByProductId[item.productId] = {
                    productId: item.productId,
                    name: item.productName || (products.find(p => p.id === item.productId)?.name || 'Товар'),
                    quantity: 0,
                    price: item.price || 0,
                    amount: 0
                };
            }
            salesByProductId[item.productId].quantity += Number(item.quantity) || 0;
            salesByProductId[item.productId].amount += Number(item.total != null ? item.total : (item.price || 0) * (Number(item.quantity) || 0));
            if (!salesByProductId[item.productId].price && item.price) {
                salesByProductId[item.productId].price = item.price;
            }
        });
    });

    const marginMap = readEarningsMarginMap();
    const marginType = marginTypeSelect ? marginTypeSelect.value : 'absolute';

    const rows = Object.values(salesByProductId);

    if (rows.length === 0) {
        rowsContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:12px;">Нет продаж за выбранную дату</td></tr>';
        totalEl && (totalEl.textContent = formatCurrency(0));
        countEl && (countEl.textContent = '0');
        return;
    }

    let totalNet = 0;
    const html = rows.map(row => {
        const key = String(row.productId);
        const saved = marginMap[key] || { type: marginType, value: '' };
        const effectiveType = saved.type || marginType;
        const marginValue = Number(saved.value) || 0;

        let net = 0;
        if (effectiveType === 'percent') {
            // процент от суммы продажи
            net = row.amount * (marginValue / 100);
        } else {
            // фикс за единицу
            net = (marginValue) * row.quantity;
        }
        totalNet += net;

        const priceText = formatCurrency(row.price || 0);
        const amountText = formatCurrency(row.amount || 0);
        const netText = formatCurrency(net);

        return (
            `<tr data-product-id="${row.productId}">`+
            `<td>${escapeHtml(row.name)}</td>`+
            `<td class="numeric">${row.quantity}</td>`+
            `<td class="numeric">${priceText}</td>`+
            `<td class="numeric">${amountText}</td>`+
            `<td>`+
                `<div class="input-group">`+
                    `<input type="number" step="0.01" class="form-control earnings-margin-input" placeholder="0.00" value="${saved.value != null ? saved.value : ''}">`+
                    `<span class="input-addon">${effectiveType === 'percent' ? '%' : '₽/шт'}</span>`+
                `</div>`+
            `</td>`+
            `<td class="earnings-net numeric">${netText}</td>`+
            `</tr>`
        );
    }).join('');

    rowsContainer.innerHTML = html;
    totalEl && (totalEl.textContent = formatCurrency(totalNet));
    countEl && (countEl.textContent = String(rows.length));

    // Навешиваем обработчики ввода на маржу
    rowsContainer.querySelectorAll('tr').forEach(tr => {
        const productId = tr.getAttribute('data-product-id');
        const input = tr.querySelector('.earnings-margin-input');
        if (!input) return;
        input.addEventListener('input', () => {
            // Оставляем только цифры, точку и запятую; заменяем запятую на точку
            const cleaned = (input.value || '').replace(/[^0-9,.-]/g, '').replace(',', '.');
            input.value = cleaned;

            const map = readEarningsMarginMap();
            const typeNow = (document.getElementById('earnings-margin-type')?.value) || 'absolute';
            const valueNow = cleaned;
            map[String(productId)] = { type: typeNow, value: valueNow };
            writeEarningsMarginMap(map);
            // Пересчитать
            recalcEarningsRow(tr, typeNow);
            recalcEarningsTotal();
        });
        input.addEventListener('blur', () => {
            const num = Number(input.value);
            if (!isNaN(num)) {
                input.value = num.toFixed(2);
            }
        });
    });

    // Переключение типа маржи
    if (marginTypeSelect) {
        marginTypeSelect.onchange = () => {
            const map = readEarningsMarginMap();
            // Обновляем отображение единиц измерения и пересчитываем
            rowsContainer.querySelectorAll('tr').forEach(tr => {
                const pid = tr.getAttribute('data-product-id');
                const badge = tr.querySelector('td:nth-child(5) span');
                if (badge) {
                    badge.textContent = marginTypeSelect.value === 'percent' ? '%' : '₽/шт';
                }
                // сохранить выбранный тип для продукта
                const input = tr.querySelector('.earnings-margin-input');
                const valueNow = input ? input.value : '';
                map[String(pid)] = { type: marginTypeSelect.value, value: valueNow };
                recalcEarningsRow(tr, marginTypeSelect.value);
            });
            writeEarningsMarginMap(map);
            recalcEarningsTotal();
        };
    }
}

function recalcEarningsRow(tr, type) {
    const quantity = Number(tr.children[1]?.textContent) || 0;
    const amountText = tr.children[3]?.textContent || '0';
    const amount = parseCurrency(amountText);
    const input = tr.querySelector('.earnings-margin-input');
    const value = Number(input?.value) || 0;
    let net = 0;
    if (type === 'percent') {
        net = amount * (value / 100);
    } else {
        net = value * quantity;
    }
    const netCell = tr.querySelector('.earnings-net');
    if (netCell) netCell.textContent = formatCurrency(net);
}

function recalcEarningsTotal() {
    const totalEl = document.getElementById('earnings-total');
    const rows = document.querySelectorAll('#earnings-rows tr');
    let total = 0;
    rows.forEach(tr => {
        const netText = tr.querySelector('.earnings-net')?.textContent || '0';
        total += parseCurrency(netText);
    });
    totalEl && (totalEl.textContent = formatCurrency(total));
}

function parseCurrency(text) {
    if (!text) return 0;
    // Удаляем все кроме цифр, запятой, точки и минуса
    const cleaned = String(text).replace(/[^0-9,.-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Анализ персональных цен
function displayPersonalPricesAnalysis(reports) {
    const container = document.getElementById('personal-prices-details');
    
    console.log('=== АНАЛИЗ ПЕРСОНАЛЬНЫХ ЦЕН ===');
    console.log('Получено отчетов для анализа:', reports.length);
    
    if (reports.length === 0) {
        console.log('Нет отчетов для анализа');
        container.innerHTML = `
            <div class="no-personal-prices">
                <i class="fas fa-chart-line"></i>
                <h4>Нет продаж за выбранный период</h4>
                <p>Попробуйте изменить период или дату</p>
            </div>
        `;
        return;
    }
    
    // Собираем данные по товарам и их ценам
    const productPriceAnalysis = {};
    
    reports.forEach(report => {
        console.log('Обрабатываем отчет:', report.id, 'Товаров:', report.items.length);
        report.items.forEach(item => {
            const productId = item.productId;
            const productName = item.productName;
            const price = item.price;
            const quantity = item.quantity;
            const total = item.total;
            const tobaccoType = item.tobaccoType; // Получаем тип табака
            const roastType = item.roastType; // Получаем тип жарки (если одиночный)
            
            console.log('Товар:', productName, 'Цена:', price, 'Тип табака:', tobaccoType);
            
            if (!productPriceAnalysis[productId]) {
                // Получаем стандартную цену товара
                const product = products.find(p => p.id === productId);
                const standardPrice = product ? product.salePrice : price;
                
                productPriceAnalysis[productId] = {
                    id: productId, // Добавляем ID товара
                    name: productName,
                    standardPrice: standardPrice,
                    unit: item.unit || 'шт',
                    priceBreakdown: {},
                    totalQuantity: 0,
                    totalAmount: 0
                };
            }
            
            // Если по жарке есть детальная разбивка — делим на строки по типам
            if (item.roast) {
                const roastParts = getRoastParts(item.roast);
                if (roastParts.length > 0) {
                    const totalKg = roastParts.reduce((sum, part) => sum + part.kg, 0) || 1;
                    const addPart = (key, qty, partRoastType) => {
                        if (!productPriceAnalysis[productId].priceBreakdown[key]) {
                            productPriceAnalysis[productId].priceBreakdown[key] = {
                                quantity: 0,
                                amount: 0,
                                price: price,
                                tobaccoType: tobaccoType,
                                roastType: partRoastType
                            };
                        }
                        productPriceAnalysis[productId].priceBreakdown[key].quantity += qty;
                        productPriceAnalysis[productId].priceBreakdown[key].amount += total * (qty / totalKg);
                        productPriceAnalysis[productId].totalQuantity += qty;
                        productPriceAnalysis[productId].totalAmount += total * (qty / totalKg);
                    };
                    roastParts.forEach(part => {
                        if (part.kg > 0) {
                            const key = `${price}_roast_${part.type}`;
                            addPart(key, part.kg, part.type);
                        }
                    });
                }
                // Старая версия (обратная совместимость)
                else if (item.roast.mixedKg > 0 || item.roast.pureKg > 0) {
                    const mixedKg = Number(item.roast.mixedKg) || 0;
                    const pureKg = Number(item.roast.pureKg) || 0;
                    const totalKg = (mixedKg + pureKg) || 1;
                    const addPart = (key, qty, partRoastType) => {
                        if (!productPriceAnalysis[productId].priceBreakdown[key]) {
                            productPriceAnalysis[productId].priceBreakdown[key] = {
                                quantity: 0,
                                amount: 0,
                                price: price,
                                tobaccoType: tobaccoType,
                                roastType: partRoastType
                            };
                        }
                        productPriceAnalysis[productId].priceBreakdown[key].quantity += qty;
                        productPriceAnalysis[productId].priceBreakdown[key].amount += total * (qty / totalKg);
                        productPriceAnalysis[productId].totalQuantity += qty;
                        productPriceAnalysis[productId].totalAmount += total * (qty / totalKg);
                    };
                    if (mixedKg > 0) {
                        const key = `${price}_roast_mixed`;
                        addPart(key, mixedKg, 'mixed');
                    }
                    if (pureKg > 0) {
                        const key = `${price}_roast_pure`;
                        addPart(key, pureKg, 'pure');
                    }
                } else {
                    // Обычная логика: один тип табака или одиночный тип жарки, либо вообще без типа
                    const priceKey = tobaccoType 
                        ? `${price}_${tobaccoType}` 
                        : (roastType ? `${price}_roast_${roastType}` : price);
                    if (!productPriceAnalysis[productId].priceBreakdown[priceKey]) {
                        productPriceAnalysis[productId].priceBreakdown[priceKey] = {
                            quantity: 0,
                            amount: 0,
                            price: price,
                            tobaccoType: tobaccoType,
                            roastType: roastType
                        };
                    }
                    productPriceAnalysis[productId].priceBreakdown[priceKey].quantity += quantity;
                    productPriceAnalysis[productId].priceBreakdown[priceKey].amount += total;
                    productPriceAnalysis[productId].totalQuantity += quantity;
                    productPriceAnalysis[productId].totalAmount += total;
                }
            } else {
                // Обычная логика: один тип табака или одиночный тип жарки, либо вообще без типа
                const priceKey = tobaccoType 
                    ? `${price}_${tobaccoType}` 
                    : (roastType ? `${price}_roast_${roastType}` : price);
                if (!productPriceAnalysis[productId].priceBreakdown[priceKey]) {
                    productPriceAnalysis[productId].priceBreakdown[priceKey] = {
                        quantity: 0,
                        amount: 0,
                        price: price,
                        tobaccoType: tobaccoType,
                        roastType: roastType
                    };
                }
                productPriceAnalysis[productId].priceBreakdown[priceKey].quantity += quantity;
                productPriceAnalysis[productId].priceBreakdown[priceKey].amount += total;
                productPriceAnalysis[productId].totalQuantity += quantity;
                productPriceAnalysis[productId].totalAmount += total;
            }
        });
    });
    
    console.log('Анализ товаров:', productPriceAnalysis);
    
    // Показываем все товары с красивым дизайном
    const allProducts = Object.values(productPriceAnalysis);
    
    console.log('Все товары для анализа:', allProducts.length);
    
    if (allProducts.length === 0) {
        container.innerHTML = `
            <div class="no-personal-prices">
                <i class="fas fa-tags"></i>
                <h4>Нет данных для анализа</h4>
                <p>Нет продаж за выбранный период</p>
            </div>
        `;
        return;
    }
    
    // Сортируем по общему количеству продаж
    allProducts.sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    container.innerHTML = allProducts.map(product => {
        const priceKeys = Object.keys(product.priceBreakdown);
        const standardPrice = product.standardPrice;
        const productId = product.id; // Получаем ID товара
        
        // Сортируем по цене (по убыванию)
        priceKeys.sort((a, b) => {
            const priceA = product.priceBreakdown[a].price;
            const priceB = product.priceBreakdown[b].price;
            return priceB - priceA;
        });
        
        return `
            <div class="personal-price-item">
                <div class="personal-price-header">
                    <div class="personal-price-title">
                        <i class="fas fa-shopping-bag"></i>
                        ${product.name}
                    </div>
                    <div class="personal-price-stats">
                        <span>Всего: ${formatQuantity(product.totalQuantity, product.unit)} ${product.unit}</span>
                        <span>Сумма: ${formatCurrency(product.totalAmount)}</span>
                    </div>
                </div>
                
                <div class="price-breakdown">
                    ${priceKeys.map(priceKey => {
                        const priceData = product.priceBreakdown[priceKey];
                        const price = priceData.price;
                        const tobaccoType = priceData.tobaccoType;
                        const roastType = priceData.roastType;
                        const isStandardPrice = price === standardPrice;
                        const percentage = product.totalQuantity > 0 ? 
                            ((priceData.quantity / product.totalQuantity) * 100).toFixed(1) : 0;
                        
                        // Формируем описание типа (табак или жарка)
                        let typeDescription = '';
                        if (tobaccoType) {
                            const tobaccoAnnotation = getTobaccoTypeAnnotation(tobaccoType);
                            typeDescription = tobaccoAnnotation ? ` (${tobaccoAnnotation})` : ` (${tobaccoType})`;
                        } 
                        if (roastType) {
                            const roastLabel = getRoastTypeLabel(roastType);
                            typeDescription += roastLabel ? ` (${roastLabel})` : ` (${roastType})`;
                        }
                        
                        return `
                            <div class="price-row ${isStandardPrice ? 'standard-price' : 'personal-price'}" data-product-id="${productId}" data-price="${price}" data-tobacco-type="${tobaccoType || ''}" data-roast-type="${roastType || ''}">
                                <div class="price-data-row">
                                    <div class="price-info price-unit">
                                        <div class="price-label">ЦЕНА ЗА ЕДИНИЦУ</div>
                                        <div class="price-value">${formatCurrency(price)}${typeDescription}</div>
                                        <div class="price-type-badge ${isStandardPrice ? 'standard' : 'personal'}">
                                            <i class="fas ${isStandardPrice ? 'fa-check-circle' : 'fa-user'}"></i>
                                            ${isStandardPrice ? 'СТАНДАРТНАЯ' : 'ПЕРСОНАЛЬНАЯ'}
                                        </div>
                                    </div>
                                    <div class="price-info price-quantity">
                                        <div class="price-label">КОЛИЧЕСТВО</div>
                                        <div class="price-quantity-value">${formatQuantity(priceData.quantity, product.unit)} ${product.unit}</div>
                                    </div>
                                    <div class="price-info price-total">
                                        <div class="price-label">ОБЩАЯ СУММА</div>
                                        <div class="price-total-value">${formatCurrency(priceData.amount)}</div>
                                    </div>
                                    <div class="price-info price-share">
                                        <div class="price-label">ДОЛЯ ПРОДАЖ</div>
                                        <div class="price-share-container">
                                            <div class="price-share-bar">
                                                <div class="price-share-fill" style="width: ${percentage}%"></div>
                                            </div>
                                            <span class="price-share-text">${percentage}%</span>
                                        </div>
                                    </div>
                                    <div class="price-actions">
                                        <button class="btn btn-warning btn-sm" onclick="editPersonalPriceRecord('${productId}', '${price}', '${tobaccoType}', ${priceData.quantity})" title="Редактировать количество">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="deletePersonalPriceRecord('${productId}', '${price}', '${tobaccoType}')" title="Удалить запись">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Функции для работы с выбором накладных в отчетах
function toggleAllInvoices(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.invoice-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateDeleteButton();
}

function updateDeleteButton() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    
    if (checkedBoxes.length > 0) {
        deleteBtn.style.display = 'inline-block';
    } else {
        deleteBtn.style.display = 'none';
    }
}

function deleteSelectedInvoices() {
    const checkedBoxes = document.querySelectorAll('.invoice-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Выберите накладные для удаления');
        return;
    }
    
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (confirm(`Вы уверены, что хотите удалить ${selectedIds.length} накладную(ых)? Это действие нельзя отменить.`)) {
        // Удаляем накладные из массива reports
        const originalLength = reports.length;
        reports = reports.filter(report => !selectedIds.includes(report.id));
        
        // Сохраняем изменения
        saveData('reports', reports);
        
        // Обновляем отчет
        generateReport();
        
        alert(`Успешно удалено ${originalLength - reports.length} накладных`);
    }
}
  
// ==================== ФУНКЦИИ ДЛЯ РАЗДЕЛА "РАСЧЁТ" ====================

// Функция расчёта маржи и прибыли
function calculateMargins() {
    const tbody = document.getElementById('calculation-tbody');
    const rows = tbody.querySelectorAll('tr[data-row-id]');
    let totalQuantity = 0;
    let totalProfit = 0;
    
    rows.forEach(row => {
        const rowId = row.getAttribute('data-row-id');
        const priceInput = document.getElementById(`price-${rowId}`);
        const quantityInput = document.getElementById(`quantity-${rowId}`);
        const marginElement = document.getElementById(`margin-${rowId}`);
        const profitElement = document.getElementById(`profit-${rowId}`);
        
        if (priceInput && quantityInput && marginElement && profitElement) {
            const price = parseFloat(priceInput.value) || 0;
            const quantity = parseInt(quantityInput.value) || 0;
            
            // Извлекаем тип табака из rowId (формат: tobaccoType_price)
            const tobaccoType = rowId.split('_')[0];
            const packageCost = getPackageCost(tobaccoType); // Себестоимость пакета
            const costPerUnit = packageCost / 10; // Себестоимость за штуку (в пакете 10 штук)
            
            // Сохраняем цену в localStorage
            if (price > 0) {
                localStorage.setItem(`calculation_price_${rowId}`, price.toString());
            }
            
            // Рассчитываем маржу за единицу (цена продажи - себестоимость за штуку)
            const margin = price - costPerUnit;
            marginElement.textContent = `${margin.toFixed(2)} ₽`;
            
            // Рассчитываем общую прибыль (маржа за штуку * количество штук)
            // quantity - это количество штук (как указано в заголовке таблицы)
            const profit = margin * quantity;
            profitElement.textContent = `${profit.toFixed(2)} ₽`;
            
            // Добавляем к общим показателям
            totalQuantity += quantity;
            totalProfit += profit;
        }
    });
    
    // Обновляем итоговые показатели
    document.getElementById('total-quantity').textContent = `${totalQuantity} шт`;
    document.getElementById('total-profit').textContent = `${totalProfit.toFixed(2)} ₽`;
    
    // Рассчитываем среднюю маржу
    const averageMargin = totalQuantity > 0 ? totalProfit / totalQuantity : 0;
    document.getElementById('average-margin').textContent = `${averageMargin.toFixed(2)} ₽`;
}

// Функция загрузки сохраненных цен для раздела расчет
function loadCalculationPrices() {
    // Эта функция теперь не нужна, так как мы используем динамические строки
    // Сохраненные цены будут загружаться при создании строк
}

// Функция для отладки - показать товары, которые определяются как табак
function debugTobaccoProducts() {
    console.log('=== ОТЛАДКА ТОВАРОВ ТАБАКА ===');
    products.forEach(product => {
        const isTobacco = product.name.toLowerCase().includes('табак') || 
                         product.category.toLowerCase().includes('табак') ||
                         product.name.toLowerCase().includes('tobacco');
        
        if (isTobacco) {
            console.log(`ТАБАК: ${product.name} (категория: ${product.category})`);
        }
    });
    console.log('=== КОНЕЦ ОТЛАДКИ ===');
}

// Функция очистки данных персональных цен
function clearPersonalPricesData() {
    if (confirm('Вы уверены, что хотите очистить все данные персональных цен? Это действие нельзя отменить.')) {
        // Очищаем персональные цены
        personalPrices = [];
        saveData('personalPrices', personalPrices);
        
        // Очищаем отчеты (так как они содержат информацию о персональных ценах)
        reports = [];
        saveData('reports', reports);
        
        // Очищаем накладные (так как они связаны с отчетами)
        invoices = [];
        saveData('invoices', invoices);
        
        // Обновляем интерфейс
        loadInvoices();
        updateStats();
        loadDashboardData();
        
        // Очищаем отображение персональных цен
        const container = document.getElementById('personal-prices-details');
        if (container) {
            container.innerHTML = `
                <div class="no-personal-prices">
                    <i class="fas fa-tags"></i>
                    <h4>Данные очищены</h4>
                    <p>Все данные персональных цен, отчетов и накладных были удалены</p>
                </div>
            `;
        }
        
        alert('Все данные персональных цен, отчетов и накладных были успешно очищены.');
    }
}

// Получение отфильтрованных отчетов по периоду (как в generateReport)
function getFilteredReports(dateElementId = 'report-date', periodElementId = 'report-period') {
    const selectedDate = document.getElementById(dateElementId).value;
    const period = document.getElementById(periodElementId).value;
    
    let startDate, endDate;
    
    // Устанавливаем дату по умолчанию если не выбрана
    const reportDate = selectedDate || new Date().toISOString().split('T')[0];
    
    if (period === 'today') {
        startDate = new Date(reportDate);
        endDate = new Date(reportDate);
        endDate.setHours(23, 59, 59, 999);
    } else if (period === 'yesterday') {
        startDate = new Date(reportDate);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
        startDate = new Date(reportDate);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(reportDate);
        endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
        startDate = new Date(reportDate);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(reportDate);
        endDate.setHours(23, 59, 59, 999);
    } else { // all
        startDate = new Date(0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }
    
    // Фильтруем отчеты по периоду
    return reports.filter(report => {
        const reportDate = new Date(report.date);
        return reportDate >= startDate && reportDate <= endDate;
    });
}

// Функция сбора данных о продажах табака по типам и ценам
function collectTobaccoSalesData() {
    const tobaccoSales = {}; // Динамический объект для всех типов табака
    
    console.log('=== СБОР ДАННЫХ О ПРОДАЖАХ ТАБАКА ===');
    
    // Получаем отфильтрованные отчеты по периоду
    const filteredReports = getFilteredReports();
    console.log('Используем отфильтрованные отчеты:', filteredReports.length, 'из', reports.length);
    
    // Проходим по отфильтрованным отчетам
    filteredReports.forEach(report => {
        report.items.forEach(item => {
            // Проверяем, является ли товар табаком
            const isTobacco = item.productName.toLowerCase().includes('табак') || 
                             item.productName.toLowerCase().includes('tobacco');
            
            if (isTobacco && item.tobaccoType) {
                const tobaccoType = item.tobaccoType;
                const price = item.price;
                const quantity = item.quantity;
                
                console.log(`Найдена продажа табака: ${item.productName}, тип: ${tobaccoType}, цена: ${price}₽, количество: ${quantity}`);
                
                // Создаем объект для типа табака, если его еще нет
                if (!tobaccoSales[tobaccoType]) {
                    tobaccoSales[tobaccoType] = {};
                }
                
                // Создаем ключ для цены
                const priceKey = price.toString();
                
                if (!tobaccoSales[tobaccoType][priceKey]) {
                    tobaccoSales[tobaccoType][priceKey] = {
                        price: price,
                        totalQuantity: 0,
                        totalAmount: 0,
                        sales: []
                    };
                }
                
                // Добавляем данные о продаже
                tobaccoSales[tobaccoType][priceKey].totalQuantity += quantity;
                tobaccoSales[tobaccoType][priceKey].totalAmount += item.total;
                tobaccoSales[tobaccoType][priceKey].sales.push({
                    date: report.date,
                    client: report.client,
                    quantity: quantity,
                    amount: item.total
                });
            }
        });
    });
    
    console.log('Собранные данные:', tobaccoSales);
    return tobaccoSales;
}

// Сбор данных о продажах жарки по типам и ценам (5/0, 4/1, 3/2, 2/3)
function collectRoastSalesData() {
    const roastSales = Object.fromEntries([
        ...ROAST_TYPE_CONFIGS.map(config => [config.type, {}]),
        ['mixed', {}],
        ['pure', {}]
    ]);
    
    // Получаем отфильтрованные отчеты по периоду
    const filteredReports = getFilteredReports();
    console.log('Сбор данных жарки: используем отфильтрованные отчеты:', filteredReports.length, 'из', reports.length);
    
    filteredReports.forEach(report => {
        report.items.forEach(item => {
            const price = item.price;
            const roastParts = getRoastParts(item.roast);
            if (roastParts.length > 0) {
                const totalKg = roastParts.reduce((sum, part) => sum + part.kg, 0) || 1;

                roastParts.forEach(part => {
                    if (part.kg > 0) {
                        if (!roastSales[part.type][price]) roastSales[part.type][price] = { totalKg: 0, totalAmount: 0 };
                        roastSales[part.type][price].totalKg += part.kg;
                        roastSales[part.type][price].totalAmount += item.total * (part.kg / totalKg);
                    }
                });
            } 
            // Старая версия (обратная совместимость)
            else if (item.roast && (item.roast.mixedKg > 0 || item.roast.pureKg > 0)) {
                if (item.roast.mixedKg > 0) {
                    if (!roastSales.mixed[price]) roastSales.mixed[price] = { totalKg: 0, totalAmount: 0 };
                    roastSales.mixed[price].totalKg += item.roast.mixedKg;
                    const totalKg = (item.roast.mixedKg + item.roast.pureKg) || 1;
                    roastSales.mixed[price].totalAmount += item.total * (item.roast.mixedKg / totalKg);
                }
                if (item.roast.pureKg > 0) {
                    if (!roastSales.pure[price]) roastSales.pure[price] = { totalKg: 0, totalAmount: 0 };
                    roastSales.pure[price].totalKg += item.roast.pureKg;
                    const totalKg = (item.roast.mixedKg + item.roast.pureKg) || 1;
                    roastSales.pure[price].totalAmount += item.total * (item.roast.pureKg / totalKg);
                }
            } else if (item.roastType === 'mixed' || item.roastType === 'pure') {
                const quantity = parseFloat(item.quantity) || 0;
                const unit = (item.unit || 'шт').toLowerCase();
                const kg = unit === 'кг' ? quantity : quantity * 1.55;
                if (!roastSales[item.roastType][price]) roastSales[item.roastType][price] = { totalKg: 0, totalAmount: 0 };
                roastSales[item.roastType][price].totalKg += kg;
                roastSales[item.roastType][price].totalAmount += item.total;
            } else if (ROAST_TYPE_CONFIGS.some(config => config.type === item.roastType)) {
                const quantity = parseFloat(item.quantity) || 0;
                const unit = (item.unit || 'шт').toLowerCase();
                const kg = unit === 'кг' ? quantity : quantity * 1.55;
                if (!roastSales[item.roastType][price]) roastSales[item.roastType][price] = { totalKg: 0, totalAmount: 0 };
                roastSales[item.roastType][price].totalKg += kg;
                roastSales[item.roastType][price].totalAmount += item.total;
            }
        });
    });
    return roastSales;
}

// Функция автоматического заполнения раздела расчет
function autoFillCalculationFromSales() {
    const tobaccoSales = collectTobaccoSalesData();
    
    // Очищаем текущие данные
    resetCalculation();
    
    let hasData = false;
    let filledTypes = [];
    let totalSales = 0;
    const tbody = document.getElementById('calculation-tbody');
    
    // Создаем строки для всех комбинаций типов и цен
    Object.keys(tobaccoSales).forEach(tobaccoType => {
        const typeData = tobaccoSales[tobaccoType];
        const prices = Object.keys(typeData);
        
        if (prices.length > 0) {
            hasData = true;
            
            // Сортируем цены по убыванию
            const sortedPrices = prices.sort((a, b) => parseFloat(b) - parseFloat(a));
            
            sortedPrices.forEach(price => {
                const data = typeData[price];
                
                // Создаем строку для этой комбинации тип + цена
                const rowHtml = createCalculationRow(tobaccoType, price, data.totalQuantity);
                tbody.insertAdjacentHTML('beforeend', rowHtml);
                
                // Формируем описание типа
                let typeDescription = '';
                typeDescription = getTobaccoTypeSummary(tobaccoType) || tobaccoType;
                
                filledTypes.push(`${typeDescription} по ${price}₽: ${data.totalQuantity} шт`);
                totalSales += data.totalQuantity;
                
                console.log(`Создана строка: ${tobaccoType} - цена: ${price}₽, количество: ${data.totalQuantity}`);
            });
        }
    });
    
    if (hasData) {
        // Пересчитываем маржи
        calculateMargins();
        
        // Показываем детальное уведомление
        const message = `Раздел "Расчет" автоматически заполнен данными из продаж табака!\n\n` +
                       `Создано строк:\n${filledTypes.join('\n')}\n\n` +
                       `Всего продано: ${totalSales} шт`;
        
        alert(message);
    } else {
        alert('Не найдено данных о продажах табака с указанными типами (6/4, 7/3, 8/2, 10/0).\n\nУбедитесь, что:\n1. У вас есть накладные с товарами табака\n2. При создании накладных выбран тип табака\n3. В названии товара есть слово "табак"');
    }
}

// Функция показа статистики продаж табака
function showTobaccoSalesStats() {
    const tobaccoSales = collectTobaccoSalesData();
    
    console.log('=== СТАТИСТИКА ПРОДАЖ ТАБАКА ===');
    console.log('Собранные данные табака:', tobaccoSales);
    
    let statsMessage = '=== СТАТИСТИКА ПРОДАЖ ТАБАКА ===\n\n';
    let totalSales = 0;
    let totalAmount = 0;
    let hasAnyData = false;
    
    Object.keys(tobaccoSales).forEach(tobaccoType => {
        const typeData = tobaccoSales[tobaccoType];
        const prices = Object.keys(typeData);
        
        if (prices.length > 0) {
            hasAnyData = true;
            
            // Формируем описание типа
            let typeDescription = '';
            typeDescription = getTobaccoTypeSummary(tobaccoType);
            
            statsMessage += `📦 ${typeDescription}:\n`;
            
            // Сортируем по цене (по убыванию)
            const sortedPrices = prices.sort((a, b) => parseFloat(b) - parseFloat(a));
            
            sortedPrices.forEach(price => {
                const data = typeData[price];
                statsMessage += `  💰 ${price}₽: ${data.totalQuantity} шт (${formatCurrency(data.totalAmount)})\n`;
                totalSales += data.totalQuantity;
                totalAmount += data.totalAmount;
            });
            
            statsMessage += '\n';
        }
    });
    
    if (hasAnyData) {
        statsMessage += `📊 ИТОГО:\n`;
        statsMessage += `  Всего продано: ${totalSales} шт\n`;
        statsMessage += `  Общая сумма: ${formatCurrency(totalAmount)}\n`;
        statsMessage += `  Средняя цена: ${formatCurrency(totalAmount / totalSales)} за шт\n`;
    } else {
        statsMessage += '❌ Данные о продажах табака не найдены.\n\n';
        statsMessage += 'Убедитесь, что:\n';
        statsMessage += '1. У вас есть накладные с товарами табака\n';
        statsMessage += '2. При создании накладных выбран тип табака\n';
        statsMessage += '3. В названии товара есть слово "табак"';
    }
    
    alert(statsMessage);
}

// Функция создания строки расчета
function createCalculationRow(tobaccoType, price, quantity = 0) {
    const packageCost = getPackageCost(tobaccoType); // Себестоимость пакета
    const costPerUnit = packageCost / 10; // Себестоимость за штуку (в пакете 10 штук)
    const rowId = `${tobaccoType}_${price}`;
    
    // Формируем описание типа
    const typeDescription = getTobaccoTypeSummary(tobaccoType) || `Пользовательский тип: ${tobaccoType}`;
    
    // Форматируем отображение типа
    const displayType = tobaccoType.includes('/') ? tobaccoType : tobaccoType.replace('-', '/');
    
    const rowHtml = `
        <tr data-row-id="${rowId}">
            <td>
                <strong>${displayType}</strong><br>
                <small>${typeDescription}</small>
            </td>
            <td class="numeric">
                <input type="number" id="price-${rowId}" class="form-control calculation-input" 
                       step="0.01" placeholder="0.00" value="${price}" oninput="calculateMargins()">
            </td>
            <td class="numeric">${costPerUnit > 0 ? costPerUnit.toFixed(2) + ' ₽' : '—'}</td>
            <td class="numeric" id="margin-${rowId}">0 ₽</td>
            <td class="numeric">
                <input type="number" id="quantity-${rowId}" class="form-control calculation-input" 
                       step="1" placeholder="0" value="${quantity}" oninput="calculateMargins()">
            </td>
            <td class="numeric" id="profit-${rowId}">0 ₽</td>
        </tr>
    `;
    
    return rowHtml;
}

// Функция очистки таблицы расчета
function clearCalculationTable() {
    const tbody = document.getElementById('calculation-tbody');
    if (tbody) {
        tbody.innerHTML = '';
    }
    
    // Сбрасываем итоговые показатели
    document.getElementById('total-quantity').textContent = '0 шт';
    document.getElementById('total-profit').textContent = '0 ₽';
    document.getElementById('average-margin').textContent = '0 ₽';
}

// Функция отладки отчетов
function debugReports() {
    console.log('=== ОТЛАДКА ОТЧЕТОВ ===');
    console.log('Всего отчетов в системе:', reports.length);
    console.log('Всего накладных в системе:', invoices.length);
    
    if (reports.length > 0) {
        console.log('Последние 3 отчета:');
        reports.slice(-3).forEach((report, index) => {
            console.log(`Отчет ${index + 1}:`, {
                id: report.id,
                date: report.date,
                client: report.client,
                total: report.total,
                items: report.items.length,
                itemsWithTobacco: report.items.filter(item => item.tobaccoType).length
            });
        });
        
        // Проверяем товары табака
        const tobaccoItems = [];
        reports.forEach(report => {
            report.items.forEach(item => {
                if (item.productName.toLowerCase().includes('табак') || 
                    item.productName.toLowerCase().includes('tobacco')) {
                    tobaccoItems.push({
                        product: item.productName,
                        tobaccoType: item.tobaccoType,
                        price: item.price,
                        quantity: item.quantity,
                        date: report.date
                    });
                }
            });
        });
        
        console.log('Товары табака в отчетах:', tobaccoItems.length);
        if (tobaccoItems.length > 0) {
            console.log('Примеры товаров табака:', tobaccoItems.slice(0, 3));
        }
    } else {
        console.log('Отчетов нет! Проверьте:');
        console.log('1. Созданы ли накладные?');
        console.log('2. Вызывается ли createSalesReport при создании накладной?');
    }
    
    console.log('=== КОНЕЦ ОТЛАДКИ ===');
}

// Функция принудительного обновления персональных цен
function forceUpdatePersonalPrices() {
    console.log('=== ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ПЕРСОНАЛЬНЫХ ЦЕН ===');
    
    // Получаем все отчеты
    const allReports = reports;
    console.log('Всего отчетов для анализа:', allReports.length);
    
    // Показываем все отчеты без фильтрации по дате
    displayPersonalPricesAnalysis(allReports);
    
    alert('Персональные цены обновлены! Проверьте консоль для отладочной информации.');
}

// Глобальные переменные для редактирования
let currentEditData = null;

// Функция редактирования записи персональных цен
function editPersonalPriceRecord(productId, price, tobaccoType, quantity) {
    console.log('editPersonalPriceRecord вызвана с параметрами:', { productId, price, tobaccoType, quantity });
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error('Товар не найден:', productId);
        return;
    }
    
    // Сохраняем данные для редактирования
    currentEditData = {
        productId: productId,
        price: parseFloat(price),
        tobaccoType: tobaccoType,
        originalQuantity: quantity
    };
    
    console.log('currentEditData установлена:', currentEditData);
    
    // Заполняем форму
    const productNameInput = document.getElementById('editProductName');
    const tobaccoTypeInput = document.getElementById('editTobaccoType');
    const priceInput = document.getElementById('editPrice');
    const quantityInput = document.getElementById('editQuantity');
    
    if (productNameInput) productNameInput.value = product.name;
    if (tobaccoTypeInput) tobaccoTypeInput.value = tobaccoType;
    if (priceInput) priceInput.value = formatCurrency(price);
    if (quantityInput) {
        quantityInput.value = quantity;
        // Убираем readonly атрибут если он есть
        quantityInput.removeAttribute('readonly');
        quantityInput.removeAttribute('disabled');
        // Устанавливаем фокус на поле количества
        setTimeout(() => {
            quantityInput.focus();
            quantityInput.select();
        }, 100);
    }
    
    console.log('Форма заполнена, показываем модальное окно');
    
    // Показываем модальное окно
    const modal = document.getElementById('editPersonalPriceModal');
    if (modal) {
        modal.classList.add('open');
        console.log('Модальное окно показано');
    } else {
        console.error('Модальное окно editPersonalPriceModal не найдено');
    }
}

// Функция корректировки количества
function adjustQuantity(amount) {
    console.log('adjustQuantity вызвана с amount:', amount);
    const quantityInput = document.getElementById('editQuantity');
    if (!quantityInput) {
        console.error('Поле editQuantity не найдено');
        return;
    }
    
    const currentQuantity = parseFloat(quantityInput.value) || 0;
    const newQuantity = Math.max(0, currentQuantity + amount);
    quantityInput.value = newQuantity;
    
    console.log('Количество изменено с', currentQuantity, 'на', newQuantity);
    
    // Устанавливаем фокус обратно на поле
    quantityInput.focus();
}

// Функция сохранения изменений
function savePersonalPriceEdit() {
    if (!currentEditData) return;
    
    const newQuantity = parseFloat(document.getElementById('editQuantity').value);
    if (isNaN(newQuantity) || newQuantity < 0) {
        alert('Введите корректное количество');
        return;
    }
    
    if (newQuantity === currentEditData.originalQuantity) {
        alert('Количество не изменилось');
        closeModal('editPersonalPriceModal');
        return;
    }
    
    if (confirm(`Изменить количество с ${currentEditData.originalQuantity} на ${newQuantity}?`)) {
        // Находим и обновляем соответствующие записи в отчетах
        let updated = false;
        
        reports.forEach(report => {
            report.items.forEach(item => {
                if (item.productId === currentEditData.productId && 
                    item.price === currentEditData.price && 
                    item.tobaccoType === currentEditData.tobaccoType) {
                    
                    // Вычисляем разницу
                    const difference = newQuantity - currentEditData.originalQuantity;
                    const newItemQuantity = Math.max(0, item.quantity + difference);
                    
                    if (newItemQuantity === 0) {
                        // Если количество стало 0, удаляем запись
                        const itemIndex = report.items.indexOf(item);
                        if (itemIndex > -1) {
                            report.items.splice(itemIndex, 1);
                        }
                    } else {
                        // Обновляем количество и сумму
                        item.quantity = newItemQuantity;
                        item.total = item.price * newItemQuantity;
                    }
                    
                    updated = true;
                }
            });
            
            // Пересчитываем общую сумму накладной
            if (updated) {
                report.total = report.items.reduce((sum, item) => sum + item.total, 0);
            }
        });
        
        if (updated) {
            // Сохраняем изменения
            saveData('reports', reports);
            
            // Обновляем накладные
            invoices.forEach(invoice => {
                if (invoice.items) {
                    invoice.items.forEach(item => {
                        if (item.productId === currentEditData.productId && 
                            item.price === currentEditData.price && 
                            item.tobaccoType === currentEditData.tobaccoType) {
                            
                            const difference = newQuantity - currentEditData.originalQuantity;
                            const newItemQuantity = Math.max(0, item.quantity + difference);
                            
                            if (newItemQuantity === 0) {
                                const itemIndex = invoice.items.indexOf(item);
                                if (itemIndex > -1) {
                                    invoice.items.splice(itemIndex, 1);
                                }
                            } else {
                                item.quantity = newItemQuantity;
                                item.total = item.price * newItemQuantity;
                            }
                        }
                    });
                    
                    // Пересчитываем общую сумму накладной
                    invoice.total = invoice.items.reduce((sum, item) => sum + item.total, 0);
                }
            });
            
            saveData('invoices', invoices);
            
            // Обновляем интерфейс
            updateStats();
            loadDashboardData();
            
            // Обновляем отчет персональных цен
            const selectedDate = document.getElementById('report-date').value;
            const period = document.getElementById('report-period').value;
            generateReport();
            
            alert('Запись успешно обновлена!');
        } else {
            alert('Не удалось найти соответствующую запись для обновления');
        }
    }
    
    closeModal('editPersonalPriceModal');
    currentEditData = null;
}

// Функция удаления записи персональных цен
function deletePersonalPriceRecord(productId, price, tobaccoType) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (confirm(`Удалить все записи о продаже "${product.name}" (${tobaccoType}) по цене ${formatCurrency(price)}?`)) {
        let deleted = false;
        
        // Удаляем из отчетов
        reports.forEach(report => {
            report.items = report.items.filter(item => {
                if (item.productId === productId && 
                    item.price === parseFloat(price) && 
                    item.tobaccoType === tobaccoType) {
                    deleted = true;
                    return false; // Удаляем запись
                }
                return true; // Оставляем запись
            });
            
            // Пересчитываем общую сумму накладной
            report.total = report.items.reduce((sum, item) => sum + item.total, 0);
        });
        
        // Удаляем из накладных
        invoices.forEach(invoice => {
            if (invoice.items) {
                invoice.items = invoice.items.filter(item => {
                    if (item.productId === productId && 
                        item.price === parseFloat(price) && 
                        item.tobaccoType === tobaccoType) {
                        return false; // Удаляем запись
                    }
                    return true; // Оставляем запись
                });
                
                // Пересчитываем общую сумму накладной
                invoice.total = invoice.items.reduce((sum, item) => sum + item.total, 0);
            }
        });
        
        if (deleted) {
            // Сохраняем изменения
            saveData('reports', reports);
            saveData('invoices', invoices);
            
            // Обновляем интерфейс
            updateStats();
            loadDashboardData();
            
            // Обновляем отчет персональных цен
            generateReport();
            
            alert('Запись успешно удалена!');
        } else {
            alert('Не удалось найти соответствующую запись для удаления');
        }
    }
}

// Функция сброса всех полей расчёта
function resetCalculation() {
    clearCalculationTable();
    
    // Очищаем localStorage от старых данных
    const packages = TOBACCO_TYPE_CONFIGS.map(config => config.type);
    packages.forEach(packageType => {
        localStorage.removeItem(`calculation_price_${packageType}`);
    });
}


// ===================== РАСЧЁТ ЖАРКИ =====================
let roastCalcInitialized = false;

function initRoastCalcOnce() {
    if (roastCalcInitialized) return;
    const tbody = document.getElementById('rc-tbody');
    if (tbody) {
        roastCalcInitialized = true;
    }
}

// ==================== ФУНКЦИИ ДЛЯ НАСТРОЕК ====================

// Константы себестоимости жарки по умолчанию
const DEFAULT_ROAST_COSTS = {
    good: 300,    // ₽/кг
    defect: 170   // ₽/кг
};

// Константы себестоимости табака по умолчанию (за единицу)
const DEFAULT_TOBACCO_COSTS = {
    good: 30,     // ₽/шт (хороший табак)
    defect: 14    // ₽/шт (брак)
};

function getShiftCashSettings() {
    const saved = localStorage.getItem('shiftCashSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            const startCash = Number(settings.startCash);
            if (startCash >= 0) {
                return { startCash };
            }
        } catch (e) {
            console.error('Ошибка при загрузке настроек кассы:', e);
        }
    }

    return { startCash: SHIFT_START_CASH };
}

function getConfiguredShiftStartCash() {
    return Number(getShiftCashSettings().startCash || 0);
}

function saveShiftCashSettingsToStorage(settings) {
    saveData('shiftCashSettings', settings);
}

function updateShiftStartCashDisplay() {
    const label = document.getElementById('shift-start-cash-label');
    if (label) {
        label.textContent = formatCurrency(getConfiguredShiftStartCash());
    }
}

function loadShiftCashSettings() {
    const settings = getShiftCashSettings();
    const input = document.getElementById('settings-shift-start-cash');
    if (input) {
        input.value = settings.startCash;
    }
    updateShiftStartCashDisplay();
}

function saveShiftCashSettings() {
    const input = document.getElementById('settings-shift-start-cash');
    const messageDiv = document.getElementById('settings-shift-cash-save-message');

    if (!input) {
        alert('Ошибка: не найдено поле стартовой кассы');
        return;
    }

    const startCash = Number(input.value);
    if (!(startCash >= 0)) {
        alert('Введите корректную сумму стартовой кассы');
        return;
    }

    saveShiftCashSettingsToStorage({ startCash });
    updateShiftStartCashDisplay();
    renderControlCenter();

    if (messageDiv) {
        messageDiv.className = 'settings-alert alert-success';
        messageDiv.textContent = 'Стартовая касса сохранена';
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

function resetShiftCashSettings() {
    if (!confirm('Вернуть стартовую кассу 7 000 ₽?')) {
        return;
    }

    localStorage.removeItem('shiftCashSettings');
    scheduleCloudSync();
    loadShiftCashSettings();
    renderControlCenter();

    const messageDiv = document.getElementById('settings-shift-cash-save-message');
    if (messageDiv) {
        messageDiv.className = 'settings-alert alert-success';
        messageDiv.textContent = 'Стартовая касса сброшена к 7 000 ₽';
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// Загрузка настроек себестоимости жарки из localStorage
function getRoastCostSettings() {
    const saved = localStorage.getItem('roastCostSettings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Ошибка при загрузке настроек жарки:', e);
        }
    }
    // Возвращаем значения по умолчанию
    return {
        good: DEFAULT_ROAST_COSTS.good,
        defect: DEFAULT_ROAST_COSTS.defect
    };
}

// Сохранение настроек себестоимости жарки в localStorage
function saveRoastCostSettingsToStorage(settings) {
    saveData('roastCostSettings', settings);
}

// Получение себестоимости хорошей жарки
function getCostGood() {
    return getRoastCostSettings().good;
}

// Получение себестоимости брака
function getCostDefect() {
    return getRoastCostSettings().defect;
}

// Получение себестоимости мешаный (рассчитывается автоматически)
function getCostMixed() {
    const settings = getRoastCostSettings();
    return ((4 * settings.good) + settings.defect) / 5;
}

// Загрузка настроек в форму
function loadRoastCostSettings() {
    const settings = getRoastCostSettings();
    const goodInput = document.getElementById('settings-cost-good');
    const defectInput = document.getElementById('settings-cost-defect');
    
    if (goodInput) {
        goodInput.value = settings.good;
        // Удаляем старые обработчики и добавляем новые
        goodInput.oninput = updateMixedCost;
    }
    if (defectInput) {
        defectInput.value = settings.defect;
        // Удаляем старые обработчики и добавляем новые
        defectInput.oninput = updateMixedCost;
    }
    
    // Обновляем значение для типа 4/1
    updateMixedCost();
    
    // Обновляем отображение констант в разделе расчета жарки
    updateRoastCostDisplay();
}

// Обновление отображаемых значений для всех типов жарки при изменении хорошей или брака
function updateMixedCost() {
    const goodInput = document.getElementById('settings-cost-good');
    const defectInput = document.getElementById('settings-cost-defect');
    
    if (goodInput && defectInput) {
        const good = parseFloat(goodInput.value) || 0;
        const defect = parseFloat(defectInput.value) || 0;
        
        const mixedInput = document.getElementById('settings-cost-mixed'); // для обратной совместимости

        ROAST_TYPE_CONFIGS.forEach(config => {
            const input = document.getElementById(`settings-cost-${config.type}`);
            const cost = ((config.good * good) + (config.defect * defect)) / 5;
            if (input) input.value = cost.toFixed(2);
        });
        
        // Для обратной совместимости обновляем старое поле "мешаный" (используем 4/1)
        if (mixedInput) {
            mixedInput.value = (((4 * good) + defect) / 5).toFixed(2);
        }
    }
}

// Обновление отображения констант в разделе расчета жарки
function updateRoastCostDisplay() {
    const settings = getRoastCostSettings();
    
    const displayGood = document.getElementById('display-cost-good');
    const displayDefect = document.getElementById('display-cost-defect');
    const displayMixed = document.getElementById('display-cost-mixed'); // для обратной совместимости
    
    if (displayGood) displayGood.textContent = settings.good;
    if (displayDefect) displayDefect.textContent = settings.defect;
    ROAST_TYPE_CONFIGS.forEach(config => {
        const display = document.getElementById(`display-cost-${config.type}`);
        const cost = ((config.good * settings.good) + (config.defect * settings.defect)) / 5;
        if (display) display.textContent = cost.toFixed(0);
    });
    if (displayMixed) displayMixed.textContent = (((4 * settings.good) + settings.defect) / 5).toFixed(0); // для обратной совместимости
}

// Сохранение настроек
function saveRoastCostSettings() {
    const goodInput = document.getElementById('settings-cost-good');
    const defectInput = document.getElementById('settings-cost-defect');
    const messageDiv = document.getElementById('settings-save-message');
    
    if (!goodInput || !defectInput) {
        alert('Ошибка: не найдены поля настроек');
        return;
    }
    
    const good = parseFloat(goodInput.value);
    const defect = parseFloat(defectInput.value);
    
    if (isNaN(good) || isNaN(defect) || good < 0 || defect < 0) {
        alert('Пожалуйста, введите корректные значения (неотрицательные числа)');
        return;
    }
    
    const settings = {
        good: good,
        defect: defect
    };
    
    saveRoastCostSettingsToStorage(settings);
    
    // Обновляем отображение
    updateRoastCostDisplay();
    updateMixedCost();
    
    // Пересчитываем расчет жарки, если он открыт
    if (document.getElementById('roast-calculation').classList.contains('active')) {
        computeRoastCalc();
    }
    
    // Показываем сообщение об успехе
    if (messageDiv) {
        messageDiv.className = 'settings-alert alert-success';
        messageDiv.textContent = 'Настройки успешно сохранены!';
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// Сброс настроек к значениям по умолчанию
function resetRoastCostSettings() {
    if (!confirm('Вы уверены, что хотите сбросить настройки к значениям по умолчанию?')) {
        return;
    }
    
    localStorage.removeItem('roastCostSettings');
    scheduleCloudSync();
    loadRoastCostSettings();
    
    const messageDiv = document.getElementById('settings-save-message');
    if (messageDiv) {
        messageDiv.className = 'settings-alert alert-success';
        messageDiv.textContent = 'Настройки сброшены к значениям по умолчанию';
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
    
    // Пересчитываем расчет жарки, если он открыт
    if (document.getElementById('roast-calculation').classList.contains('active')) {
        computeRoastCalc();
    }
}

// ==================== ФУНКЦИИ ДЛЯ НАСТРОЕК ТАБАКА ====================

// Загрузка настроек себестоимости табака из localStorage
function getTobaccoCostSettings() {
    const saved = localStorage.getItem('tobaccoCostSettings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Ошибка при загрузке настроек табака:', e);
        }
    }
    // Возвращаем значения по умолчанию
    return {
        good: DEFAULT_TOBACCO_COSTS.good,
        defect: DEFAULT_TOBACCO_COSTS.defect
    };
}

// Сохранение настроек себестоимости табака в localStorage
function saveTobaccoCostSettingsToStorage(settings) {
    saveData('tobaccoCostSettings', settings);
}

// Получение себестоимости хорошего табака
function getTobaccoCostGood() {
    return getTobaccoCostSettings().good;
}

// Получение себестоимости брака табака
function getTobaccoCostDefect() {
    return getTobaccoCostSettings().defect;
}

// Получение себестоимости пакета табака по типу
function getPackageCost(tobaccoType) {
    const config = getTobaccoTypeConfig(tobaccoType);
    if (!config) return 0;

    const good = getTobaccoCostGood();
    const defect = getTobaccoCostDefect();

    return config.good * good + config.defect * defect;
}

// Загрузка настроек табака в форму
function loadTobaccoCostSettings() {
    const settings = getTobaccoCostSettings();
    const goodInput = document.getElementById('settings-tobacco-good');
    const defectInput = document.getElementById('settings-tobacco-defect');
    
    if (goodInput) {
        goodInput.value = settings.good;
        goodInput.oninput = updateTobaccoPackageCosts;
    }
    if (defectInput) {
        defectInput.value = settings.defect;
        defectInput.oninput = updateTobaccoPackageCosts;
    }
    
    // Обновляем отображение себестоимости пакетов
    updateTobaccoPackageCosts();
}

// Обновление отображаемых значений себестоимости пакетов
function updateTobaccoPackageCosts() {
    const goodInput = document.getElementById('settings-tobacco-good');
    const defectInput = document.getElementById('settings-tobacco-defect');
    
    if (!goodInput || !defectInput) return;
    
    const good = parseFloat(goodInput.value) || 0;
    const defect = parseFloat(defectInput.value) || 0;
    
    TOBACCO_TYPE_CONFIGS.forEach(config => {
        const packageCost = config.good * good + config.defect * defect;
        const costPerUnit = packageCost / 10;
        const input = document.getElementById(`settings-tobacco-${config.type}`);
        if (input) {
            input.value = costPerUnit.toFixed(2) + ' ₽';
        }
    });
}

// Сохранение настроек табака
function saveTobaccoCostSettings() {
    const goodInput = document.getElementById('settings-tobacco-good');
    const defectInput = document.getElementById('settings-tobacco-defect');
    const messageDiv = document.getElementById('settings-tobacco-save-message');
    
    if (!goodInput || !defectInput) {
        alert('Ошибка: не найдены поля настроек');
        return;
    }
    
    const good = parseFloat(goodInput.value);
    const defect = parseFloat(defectInput.value);
    
    if (isNaN(good) || isNaN(defect) || good < 0 || defect < 0) {
        alert('Пожалуйста, введите корректные значения (неотрицательные числа)');
        return;
    }
    
    const settings = {
        good: good,
        defect: defect
    };
    
    saveTobaccoCostSettingsToStorage(settings);
    
    // Обновляем отображение
    updateTobaccoPackageCosts();
    
    // Пересчитываем расчет табака, если он открыт
    if (document.getElementById('calculation').classList.contains('active')) {
        calculateMargins();
        // Обновляем отображаемые себестоимости в таблице
        updateTobaccoCostDisplay();
    }
    
    // Показываем сообщение об успехе
    if (messageDiv) {
        messageDiv.className = 'settings-alert alert-success';
        messageDiv.textContent = 'Настройки табака успешно сохранены!';
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// Сброс настроек табака к значениям по умолчанию
function resetTobaccoCostSettings() {
    if (!confirm('Вы уверены, что хотите сбросить настройки табака к значениям по умолчанию?')) {
        return;
    }
    
    localStorage.removeItem('tobaccoCostSettings');
    scheduleCloudSync();
    loadTobaccoCostSettings();
    
    const messageDiv = document.getElementById('settings-tobacco-save-message');
    if (messageDiv) {
        messageDiv.className = 'settings-alert alert-success';
        messageDiv.textContent = 'Настройки табака сброшены к значениям по умолчанию';
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
    
    // Пересчитываем расчет табака, если он открыт
    if (document.getElementById('calculation').classList.contains('active')) {
        calculateMargins();
        updateTobaccoCostDisplay();
    }
}

// Обновление отображения себестоимости в таблице расчета табака
function updateTobaccoCostDisplay() {
    const tbody = document.getElementById('calculation-tbody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr[data-row-id]');
    if (rows.length === 0) return; // Если таблица пустая, ничего не делаем
    
    rows.forEach(row => {
        const rowId = row.getAttribute('data-row-id');
        if (!rowId) return;
        
        const tobaccoType = rowId.split('_')[0];
        const packageCost = getPackageCost(tobaccoType); // Себестоимость пакета
        const costPerUnit = packageCost / 10; // Себестоимость за штуку (в пакете 10 штук)
        
        // Обновляем отображаемую себестоимость в ячейке (3-я колонка)
        const cells = row.querySelectorAll('td.numeric');
        if (cells.length >= 2 && costPerUnit > 0) {
            // Ячейка себестоимости - это 2-я numeric ячейка (индекс 1)
            // Отображаем себестоимость за штуку, а не за пакет
            cells[1].textContent = costPerUnit.toFixed(2) + ' ₽';
        }
    });
    
    // Пересчитываем маржи только если есть строки
    if (rows.length > 0) {
        calculateMargins();
    }
}

// ==================== ФУНКЦИИ ДЛЯ РАСЧЕТА ЖАРКИ ====================

function initRoastCalc() {
    // При входе на вкладку пересчитываем (на случай изменённых значений)
    initRoastCalcOnce();
    // Обновляем отображение констант
    updateRoastCostDisplay();
    computeRoastCalc();
}

function computeRoastCalc() {
    // Получаем настройки из localStorage или используем значения по умолчанию
    const COST_GOOD = getCostGood(); // ₽/кг
    const COST_DEFECT = getCostDefect(); // ₽/кг
    const COST_MIXED = getCostMixed(); // ₽/кг (для обратной совместимости)

    // Считываем динамические строки из rc-tbody
    const tbody = document.getElementById('rc-tbody');
    if (!tbody) return;

    let totalKg = 0;
    let totalProfit = 0;

    Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
        const type = tr.getAttribute('data-type'); // '5-0' | '4-1' | '3-2' | '2-3' | 'mixed' | 'pure'
        const price = parseFloat(tr.getAttribute('data-price')) || 0;
        const kgInput = tr.querySelector('input[data-field="kg"]');
        const kg = parseFloat(kgInput && kgInput.value ? kgInput.value : '0') || 0;

        // Рассчитываем себестоимость в зависимости от типа
        let cost;
        const roastConfig = getRoastTypeConfig(type);
        if (roastConfig) {
            cost = ((roastConfig.good * COST_GOOD) + (roastConfig.defect * COST_DEFECT)) / 5;
        } else if (type === 'mixed') {
            // Старый тип "мешаный" (обратная совместимость)
            cost = COST_MIXED;
        } else {
            // 'pure' или любой другой = все хорошие
            cost = COST_GOOD;
        }

        const marginPerKg = price - cost;
        const profit = kg * marginPerKg;

        const profitCell = tr.querySelector('[data-field="profit"]');
        const marginCell = tr.querySelector('[data-field="margin"]');
        const costCell = tr.querySelector('[data-field="cost"]');

        if (costCell) costCell.textContent = cost.toFixed(2);
        if (marginCell) marginCell.textContent = marginPerKg.toFixed(2);
        if (profitCell) profitCell.textContent = formatCurrency(profit);

        totalKg += kg;
        totalProfit += profit;
    });

    const avgMargin = totalKg > 0 ? totalProfit / totalKg : 0;
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText('rc-total-kg', totalKg.toFixed(2));
    setText('rc-total-profit', formatCurrency(totalProfit));
    setText('rc-avg-margin', avgMargin.toFixed(2));
}

function resetRoastCalc() {
    const tbody = document.getElementById('rc-tbody');
    if (tbody) tbody.innerHTML = '';
    computeRoastCalc();
}

function autoFillRoastCalcFromReports() {
    // Используем сбор данных по жарке из отчетов
    const roastSales = collectRoastSalesData();

    const tbody = document.getElementById('rc-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Константы для перевода «штук» в кг
    const KG_PER_UNIT = 1.55;

    const mapping = [
        ...ROAST_TYPE_CONFIGS.map(config => ({ key: config.type, type: config.type, label: config.label })),
        { key: 'mixed', type: 'mixed', label: 'Мешаный' }, // обратная совместимость
        { key: 'pure', type: 'pure', label: 'Не мешаный' } // обратная совместимость
    ];

    mapping.forEach(({ key, type, label }) => {
        const byPrice = roastSales[key] || {};
        const prices = Object.keys(byPrice).map(p => parseFloat(p)).sort((a,b) => a - b);
        prices.forEach(price => {
            const rec = byPrice[price];
            const kg = rec ? rec.totalKg : 0; // уже в кг

            const tr = document.createElement('tr');
            tr.setAttribute('data-type', type);
            tr.setAttribute('data-price', String(price));
            tr.innerHTML = `
                <td>${label} по ${price}</td>
                <td class="numeric" data-field="cost"></td>
                <td class="numeric">${price}</td>
                <td class="numeric"><input type="number" min="0" step="0.01" value="${kg.toFixed(2)}" class="calculation-input" data-field="kg"></td>
                <td class="numeric" data-field="profit">0 ₽</td>
                <td class="numeric" data-field="margin">0</td>
            `;
            const kgInput = tr.querySelector('input[data-field="kg"]');
            if (kgInput) kgInput.addEventListener('input', computeRoastCalc);
            tbody.appendChild(tr);
        });
    });

    computeRoastCalc();
}

// Бухгалтерия - сбор данных о доходах
function refreshAccountingData() {
	// Получаем выбранный период
	let startDate, endDate;
	const dateInput = document.getElementById('accounting-date');
	const periodSelect = document.getElementById('accounting-period');
	const selectedDate = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
	const period = periodSelect && periodSelect.value ? periodSelect.value : 'all';
	
	// Устанавливаем дату по умолчанию в поле
	if (dateInput && !dateInput.value) {
		dateInput.value = selectedDate;
	}
	
	if (period === 'today') {
		startDate = new Date(selectedDate);
		endDate = new Date(selectedDate);
		endDate.setHours(23, 59, 59, 999);
	} else if (period === 'yesterday') {
		startDate = new Date(selectedDate);
		startDate.setDate(startDate.getDate() - 1);
		endDate = new Date(startDate);
		endDate.setHours(23, 59, 59, 999);
	} else if (period === 'week') {
		startDate = new Date(selectedDate);
		startDate.setDate(startDate.getDate() - 7);
		endDate = new Date(selectedDate);
		endDate.setHours(23, 59, 59, 999);
	} else if (period === 'month') {
		startDate = new Date(selectedDate);
		startDate.setMonth(startDate.getMonth() - 1);
		endDate = new Date(selectedDate);
		endDate.setHours(23, 59, 59, 999);
	} else { // all
		startDate = new Date(0);
		endDate = new Date();
		endDate.setHours(23, 59, 59, 999);
	}

	const accountingData = collectAccountingData(startDate, endDate);
    displayAccountingData(accountingData);
}

function collectAccountingData(startDate, endDate) {
	const data = {
		tobacco: { income: 0, quantity: 0, label: 'Расчёт табака', unit: 'шт', avgMargin: 0 },
		roast: { income: 0, quantity: 0, label: 'Расчёт жарки', unit: 'кг', avgMargin: 0 },
		other: { income: 0, quantity: 0, label: 'Прочее' }
	};

	// Готовим отчёты по выбранному периоду
	const filteredReports = (reports || []).filter(r => {
		const d = new Date(r.date);
		return d >= startDate && d <= endDate;
	});

	// Из расчётов берём ТОЛЬКО среднюю маржу (значения на единицу)
	// Табак: ₽/шт
	const tobaccoAvgMarginEl = document.getElementById('average-margin');
	if (tobaccoAvgMarginEl && tobaccoAvgMarginEl.textContent) {
		const m = parseFloat(tobaccoAvgMarginEl.textContent.replace(/\s/g, '').replace(/[^\d.,-]/g, '').replace(',', '.'));
		data.tobacco.avgMargin = isNaN(m) ? 0 : m;
	}
	// Жарка: ₽/кг
	const roastAvgMarginEl = document.getElementById('rc-avg-margin');
	if (roastAvgMarginEl && roastAvgMarginEl.textContent) {
		const m = parseFloat(roastAvgMarginEl.textContent.replace(/\s/g, '').replace(',', '.'));
		data.roast.avgMargin = isNaN(m) ? 0 : m;
	}

	// Суммируем количества и доходы за период
	const productStats = {};
	filteredReports.forEach(report => {
		report.items.forEach(item => {
			const product = products.find(p => p.id === item.productId);
			if (!product) return;
			const nameLower = (item.productName || '').toLowerCase();
			const isTobacco = nameLower.includes('табак') || nameLower.includes('tobacco');
			const isRoast = nameLower.includes('жарка') || nameLower.includes('roast');

			if (isTobacco) {
				data.tobacco.quantity += item.quantity;
			} else if (isRoast) {
				data.roast.quantity += item.quantity; // количество в кг
			} else {
				if (!productStats[item.productId]) {
					productStats[item.productId] = {
						name: item.productName,
						unit: item.unit || product.unit || 'шт',
						quantity: 0,
						marginPerUnit: (product.salePrice || 0) - (product.purchasePrice || 0),
						purchasePrice: product.purchasePrice || 0,
						standardPrice: product.salePrice || 0,
						actualAmount: 0,
						potentialAmount: 0
					};
				}
				productStats[item.productId].quantity += item.quantity;
				productStats[item.productId].actualAmount += (item.total || 0);
				productStats[item.productId].potentialAmount += (item.quantity * (productStats[item.productId].standardPrice || 0));
			}
		});
	});

	// Доходы для табака и жарки: средняя маржа из расчётов × количество за период
	if (data.tobacco.avgMargin > 0 && data.tobacco.quantity > 0) {
		data.tobacco.income = data.tobacco.avgMargin * data.tobacco.quantity;
	}
	if (data.roast.avgMargin > 0 && data.roast.quantity > 0) {
		data.roast.income = data.roast.avgMargin * data.roast.quantity;
	}

	// Прочие товары: маржа из карточек товара × количество за период
	data.other.items = [];
	Object.values(productStats).forEach(stat => {
		// Потенциальная потеря: если продавали дешевле стандартной цены
		const loss = Math.max(0, (stat.potentialAmount || 0) - (stat.actualAmount || 0));
		// Правильный расчет дохода: стандартная маржа × количество − потенциальная потеря
		// (эквивалентно фактическая выручка − себестоимость)
		const income = (stat.marginPerUnit * stat.quantity) - loss;
		data.other.items.push({
			name: stat.name,
			income: income,
			quantity: stat.quantity,
			unit: stat.unit,
			avgMargin: stat.marginPerUnit
		});
		data.other.income += income;
		data.other.quantity += stat.quantity;
	});

	// Итог
	data.total = (data.tobacco.income || 0) + (data.roast.income || 0) + (data.other.income || 0);
	return data;
}

function displayAccountingData(data) {
    // Обновляем общий доход
    const totalIncomeEl = document.getElementById('accounting-total-income');
    if (totalIncomeEl) {
        totalIncomeEl.textContent = formatCurrency(data.total);
    }

    // Обновляем таблицу доходов по позициям
    const itemsListEl = document.getElementById('accounting-items-list');
    if (itemsListEl) {
        itemsListEl.innerHTML = '';
        
        // Добавляем расчёт табака и жарки
        const items = [];
        
        if (data.tobacco.income > 0 || data.tobacco.quantity > 0) {
			items.push({ ...data.tobacco, unit: 'шт' });
        }
        
        if (data.roast.income > 0 || data.roast.quantity > 0) {
			items.push({ ...data.roast, unit: 'кг' });
        }
        
        // Добавляем все позиции из "Прочее" отдельными строками
        if (data.other && data.other.items && data.other.items.length > 0) {
            data.other.items.forEach(productItem => {
                items.push({
                    label: productItem.name,
                    income: productItem.income,
                    quantity: productItem.quantity,
                    unit: productItem.unit,
					avgMargin: productItem.avgMargin || 0
                });
            });
        }

        items.forEach(item => {
            const percentage = data.total > 0 ? (item.income / data.total * 100).toFixed(1) : 0;
            const row = document.createElement('tr');
            
			// Форматируем среднюю маржу
			const avgMarginText = (item.avgMargin != null)
				? `${formatCurrency(item.avgMargin)} / ${item.unit}`
				: '—';
            
            row.innerHTML = `
                <td><strong>${item.label}</strong></td>
                <td class="numeric">${formatQuantity(item.quantity, item.unit)} ${item.unit}</td>
                <td class="numeric">
                    <strong>${formatCurrency(item.income)}</strong>
                </td>
				<td class="numeric">${avgMarginText}</td>
                <td class="numeric">${percentage}%</td>
            `;
            itemsListEl.appendChild(row);
        });

        // Если нет данных
        if (items.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="4" style="text-align: center; color: #6b7280; padding: 20px;">
                    Нет данных для отображения. Заполните расчёты табака, жарки или создайте накладные.
                </td>
            `;
            itemsListEl.appendChild(row);
        }
    }
}

// ==================== КОНТРОЛЬ ДОСТУПА, СМЕН И ОБЛАКА ====================

function getCurrentRole() {
    return sessionAccess.currentRole === 'seller' ? 'seller' : 'manager';
}

function isAuthenticatedUser() {
    return Boolean(sessionAccess.isAuthenticated);
}

function isSellerMode() {
    return isAuthenticatedUser() && getCurrentRole() === 'seller';
}

function isSellerSimpleMode() {
    return isSellerMode() && sessionAccess.sellerSimpleMode !== false;
}

function getDefaultTabForCurrentRole() {
    return isSellerMode() ? 'shift' : 'dashboard';
}

function isTabAllowedForCurrentRole(tabName) {
    return !isSellerMode() || SELLER_ALLOWED_TABS.includes(tabName);
}

function persistSecuritySettings() {
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
}

function persistSessionAccess() {
    localStorage.setItem('sessionAccess', JSON.stringify(sessionAccess));
}

function initializeAuth() {
    sessionAccess = {
        currentRole: sessionAccess.currentRole === 'seller' ? 'seller' : 'manager',
        isAuthenticated: Boolean(sessionAccess.isAuthenticated),
        userName: sessionAccess.userName || '',
        sellerSimpleMode: sessionAccess.sellerSimpleMode !== false
    };

    securitySettings = {
        managerPinHash: securitySettings.managerPinHash || '',
        sellerPinHash: securitySettings.sellerPinHash || ''
    };

    persistSessionAccess();
    persistSecuritySettings();
    renderAuthState();
    showAuthTab('manager');
}

function renderAuthState() {
    const overlay = document.getElementById('auth-overlay');
    const container = document.querySelector('.container');
    const sidebarName = document.getElementById('sidebar-session-name');
    const sidebarRole = document.getElementById('sidebar-session-role');
    const logoutButton = document.getElementById('sidebar-logout-btn');
    const sellerModeToggle = document.getElementById('seller-view-toggle-btn');
    const sellerModeNote = document.getElementById('seller-mode-note');
    const sellerNameInput = document.getElementById('shift-seller-name');
    const authSellerName = document.getElementById('auth-seller-name');
    const authenticated = isAuthenticatedUser();
    const sellerMode = isSellerMode();
    const simpleSellerMode = authenticated && sellerMode && sessionAccess.sellerSimpleMode !== false;

    document.body.classList.toggle('authenticated-mode', authenticated);
    document.body.classList.toggle('seller-mode', authenticated && sellerMode);
    document.body.classList.toggle('manager-mode', authenticated && !sellerMode);
    document.body.classList.toggle('seller-simple-mode', simpleSellerMode);
    document.body.classList.toggle('seller-normal-mode', authenticated && sellerMode && !simpleSellerMode);

    if (overlay) {
        overlay.style.display = authenticated ? 'none' : 'flex';
    }

    if (container) {
        const mobileLayout = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
        container.style.display = authenticated ? (mobileLayout ? 'block' : 'flex') : 'none';
    }

    if (sidebarName) {
        sidebarName.textContent = authenticated ? (sessionAccess.userName || (getCurrentRole() === 'seller' ? 'Продавец' : 'Руководитель')) : 'Не выполнен вход';
    }

    if (sidebarRole) {
        sidebarRole.textContent = authenticated
            ? (getCurrentRole() === 'seller' ? 'Роль: продавец' : 'Роль: руководитель')
            : 'Ожидание входа';
    }

    if (logoutButton) {
        logoutButton.style.display = authenticated ? 'inline-flex' : 'none';
    }

    if (sellerModeToggle) {
        sellerModeToggle.style.display = authenticated && sellerMode ? 'inline-flex' : 'none';
        sellerModeToggle.innerHTML = simpleSellerMode
            ? '<i class="fas fa-eye"></i> Переключиться из простого режима в обычный'
            : '<i class="fas fa-font"></i> Вернуться в простой режим';
    }

    if (sellerModeNote) {
        sellerModeNote.style.display = authenticated && sellerMode ? 'block' : 'none';
        sellerModeNote.textContent = simpleSellerMode
            ? 'Простой режим включен: крупный текст и только важные кнопки.'
            : 'Обычный режим включен: видно больше деталей и действий.';
    }

    if (sellerNameInput && getCurrentRole() === 'seller') {
        sellerNameInput.value = sessionAccess.userName || '';
        sellerNameInput.readOnly = true;
    } else if (sellerNameInput) {
        sellerNameInput.readOnly = false;
    }

    if (authSellerName && !authSellerName.value && sessionAccess.userName) {
        authSellerName.value = sessionAccess.userName;
    }
}

function showAuthTab(role) {
    const managerTab = document.getElementById('auth-manager-tab');
    const sellerTab = document.getElementById('auth-seller-tab');
    const managerPanel = document.getElementById('auth-manager-panel');
    const sellerPanel = document.getElementById('auth-seller-panel');

    if (!managerTab || !sellerTab || !managerPanel || !sellerPanel) return;

    const isManager = role !== 'seller';
    managerTab.classList.toggle('active', isManager);
    sellerTab.classList.toggle('active', !isManager);
    managerPanel.classList.toggle('active', isManager);
    sellerPanel.classList.toggle('active', !isManager);
}

function setAuthenticatedSession(role, userName) {
    sessionAccess.currentRole = role;
    sessionAccess.isAuthenticated = true;
    sessionAccess.userName = userName || (role === 'seller' ? 'Продавец' : 'Руководитель');
    if (typeof sessionAccess.sellerSimpleMode !== 'boolean') {
        sessionAccess.sellerSimpleMode = true;
    }
    persistSessionAccess();
    renderAuthState();
    applyAccessControl();
    renderControlCenter();
    startCloudPresenceHeartbeat();
    window.__suppressTabAccessAlert = true;
    switchTab(getDefaultTabForCurrentRole());
    window.__suppressTabAccessAlert = false;
}

function loginAsManager() {
    const pinInput = document.getElementById('auth-manager-pin');
    const pin = pinInput ? pinInput.value.trim() : '';

    if (hasManagerPin() && !verifyManagerPin(pin)) {
        alert('Неверный PIN руководителя');
        return;
    }

    setAuthenticatedSession('manager', 'Руководитель');
    if (pinInput) pinInput.value = '';
}

function loginAsSeller() {
    const nameInput = document.getElementById('auth-seller-name');
    const pinInput = document.getElementById('auth-seller-pin');
    const sellerName = nameInput ? nameInput.value.trim() : '';
    const pin = pinInput ? pinInput.value.trim() : '';

    if (!securitySettings.sellerPinHash) {
        alert('PIN продавца еще не настроен. Сначала войдите как руководитель и задайте его.');
        showAuthTab('manager');
        return;
    }

    if (!sellerName) {
        alert('Введите имя продавца');
        return;
    }

    if (hashPin(pin) !== securitySettings.sellerPinHash) {
        alert('Неверный PIN продавца');
        return;
    }

    setAuthenticatedSession('seller', sellerName);
    if (pinInput) pinInput.value = '';
}

function logoutCurrentUser() {
    pushCloudPresenceNow('offline');
    stopCloudPresenceHeartbeat();
    sessionAccess.isAuthenticated = false;
    sessionAccess.userName = '';
    sessionAccess.currentRole = '';
    persistSessionAccess();
    renderAuthState();
    showAuthTab('manager');
}

function refreshCurrentVisibleTab() {
    if (!isAuthenticatedUser()) {
        return;
    }

    const activeTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab') || getDefaultTabForCurrentRole();
    window.__suppressTabAccessAlert = true;
    switchTab(activeTab);
    window.__suppressTabAccessAlert = false;
}

function toggleSellerSimpleMode() {
    if (!isSellerMode()) {
        return;
    }

    sessionAccess.sellerSimpleMode = !isSellerSimpleMode();
    persistSessionAccess();
    renderAuthState();
    applyAccessControl();
    refreshCurrentVisibleTab();
}

function getCloudSyncConfig() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem('cloudSyncConfig') || 'null');
    } catch (error) {
        console.warn('Не удалось прочитать настройки облака:', error);
    }
    if (!saved) {
        try {
            saved = JSON.parse(localStorage.getItem(CLOUD_SYNC_CONFIG_BACKUP_KEY) || 'null');
            if (saved) {
                localStorage.setItem('cloudSyncConfig', JSON.stringify(saved));
            }
        } catch (error) {
            console.warn('Не удалось восстановить настройки облака из резерва:', error);
        }
    }
    if (!saved) {
        return {
            ...DEFAULT_CLOUD_SYNC_CONFIG,
            supabase: { ...DEFAULT_CLOUD_SYNC_CONFIG.supabase },
            firebaseConfig: { ...DEFAULT_CLOUD_SYNC_CONFIG.firebaseConfig }
        };
    }

    return {
        ...DEFAULT_CLOUD_SYNC_CONFIG,
        ...saved,
        provider: saved.provider || (saved.firebaseConfig?.apiKey ? 'firebase' : 'supabase'),
        supabase: {
            ...DEFAULT_CLOUD_SYNC_CONFIG.supabase,
            ...(saved.supabase || {})
        },
        firebaseConfig: {
            ...DEFAULT_CLOUD_SYNC_CONFIG.firebaseConfig,
            ...(saved.firebaseConfig || {})
        }
    };
}

function saveCloudSyncConfig(config) {
    const serialized = JSON.stringify(config);
    localStorage.setItem('cloudSyncConfig', serialized);
    localStorage.setItem(CLOUD_SYNC_CONFIG_BACKUP_KEY, serialized);
}

function hashPin(pin) {
    let hash = 0;
    const source = `warehouse:${pin}`;
    for (let i = 0; i < source.length; i++) {
        hash = ((hash << 5) - hash) + source.charCodeAt(i);
        hash |= 0;
    }
    return String(hash);
}

function hasManagerPin() {
    return Boolean(securitySettings.managerPinHash);
}

function verifyManagerPin(pin) {
    return hashPin(pin) === securitySettings.managerPinHash;
}

function requireManagerApproval(actionLabel) {
    if (!hasManagerPin()) {
        alert('Сначала задайте PIN руководителя, потом можно будет ограничивать доступ продавца');
        return false;
    }

    const pin = prompt(`Для действия "${actionLabel}" нужен PIN руководителя`);
    if (!pin) return false;

    if (!verifyManagerPin(pin)) {
        alert('Неверный PIN руководителя');
        return false;
    }

    return true;
}

function configureManagerPin() {
    if (hasManagerPin()) {
        const currentPin = prompt('Введите текущий PIN руководителя');
        if (!currentPin) return;

        if (!verifyManagerPin(currentPin)) {
            alert('Неверный текущий PIN');
            return;
        }
    }

    const newPin = prompt('Задайте новый PIN руководителя');
    if (!newPin) return;

    if (newPin.trim().length < 4) {
        alert('PIN должен быть минимум из 4 символов');
        return;
    }

    const confirmPin = prompt('Повторите новый PIN');
    if (confirmPin !== newPin) {
        alert('PIN не совпадает');
        return;
    }

    securitySettings.managerPinHash = hashPin(newPin);
    persistSecuritySettings();
    renderControlCenter();
    alert('PIN руководителя сохранен');
}

function configureSellerPin() {
    if (hasManagerPin()) {
        const managerPin = prompt('Введите PIN руководителя для настройки доступа продавца');
        if (!managerPin) return;
        if (!verifyManagerPin(managerPin)) {
            alert('Неверный PIN руководителя');
            return;
        }
    }

    const sellerPin = prompt('Задайте PIN продавца');
    if (!sellerPin) return;

    if (sellerPin.trim().length < 4) {
        alert('PIN продавца должен быть минимум из 4 символов');
        return;
    }

    const confirmPin = prompt('Повторите PIN продавца');
    if (confirmPin !== sellerPin) {
        alert('PIN продавца не совпадает');
        return;
    }

    securitySettings.sellerPinHash = hashPin(sellerPin);
    persistSecuritySettings();
    renderControlCenter();
    alert('PIN продавца сохранен');
}

function switchToSellerMode() {
    if (!hasManagerPin()) {
        alert('Перед включением режима продавца сначала задайте PIN руководителя');
        configureManagerPin();
        if (!hasManagerPin()) return;
    }

    sessionAccess.currentRole = 'seller';
    persistSessionAccess();
    applyAccessControl();
    renderControlCenter();
    logActivity('switch_role', { role: 'seller' });
}

function switchToManagerMode() {
    if (getCurrentRole() === 'manager') {
        applyAccessControl();
        renderControlCenter();
        return;
    }

    if (!requireManagerApproval('переход в режим руководителя')) {
        return;
    }

    sessionAccess.currentRole = 'manager';
    persistSessionAccess();
    applyAccessControl();
    renderControlCenter();
    logActivity('switch_role', { role: 'manager' });
}

function initializeAccessControl() {
    renderAuthState();
    applyAccessControl();
    window.addEventListener('online', renderControlCenter);
    window.addEventListener('offline', renderControlCenter);
}

function applyAccessControl() {
    if (!isAuthenticatedUser()) {
        renderAuthState();
        return;
    }

    const sellerMode = isSellerMode();
    const statsPanel = document.querySelector('.stats-panel');
    const quickActions = document.getElementById('quick-actions');
    const auditCard = document.getElementById('manager-audit-card');
    const managerControlCenter = document.getElementById('manager-control-center');

    document.querySelectorAll('.nav-item').forEach(item => {
        const tabName = item.getAttribute('data-tab');
        item.style.display = (!sellerMode || SELLER_ALLOWED_TABS.includes(tabName)) ? '' : 'none';
    });

    document.querySelectorAll('.manager-only-action').forEach(button => {
        button.hidden = sellerMode;
        button.disabled = sellerMode;
        button.setAttribute('aria-hidden', sellerMode ? 'true' : 'false');
        button.style.display = sellerMode ? 'none' : '';
    });
    document.querySelectorAll('.manager-only-card').forEach(card => {
        card.hidden = sellerMode;
        card.setAttribute('aria-hidden', sellerMode ? 'true' : 'false');
        card.style.display = sellerMode ? 'none' : '';
    });
    syncInvoiceBulkActionsVisibility();

    if (statsPanel) {
        statsPanel.style.display = sellerMode ? 'none' : 'grid';
    }

    if (quickActions) {
        quickActions.style.display = sellerMode ? 'none' : (document.getElementById('dashboard')?.classList.contains('active') ? 'block' : 'none');
    }

    if (auditCard) {
        auditCard.style.display = sellerMode ? 'none' : '';
    }

    if (managerControlCenter) {
        managerControlCenter.style.display = sellerMode ? 'none' : 'grid';
    }

    const activeTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab');
    if (!activeTab || !isTabAllowedForCurrentRole(activeTab)) {
        window.__suppressTabAccessAlert = true;
        switchTab(getDefaultTabForCurrentRole());
        window.__suppressTabAccessAlert = false;
        return;
    }

    applyInvoiceActionAccess();
    renderAuthState();
}

function getCurrentShift() {
    return shiftSessions.find(shift => shift.status === 'open') || null;
}

function autoCloseStaleOpenShift() {
    const todayKey = getTodayDateKey();
    let changed = false;

    shiftSessions.forEach(shift => {
        if (shift.status !== 'open') return;

        const openedDateKey = getRecordDateKey({ dateKey: shift.dateKey, date: shift.openedAt || shift.createdAt });
        if (!openedDateKey || openedDateKey === todayKey) return;

        shift.status = 'closed';
        shift.closedAt = `${openedDateKey}T23:59:59`;
        shift.autoClosed = true;
        shift.closeNote = shift.closeNote || 'Смена автоматически закрыта при наступлении нового дня';

        const summary = calculateShiftSummary(shift);
        shift.summary = {
            startCash: summary.startCash,
            grossCashReceived: summary.grossCashReceived,
            netCashSales: summary.netCashSales,
            cashDebtPayments: summary.cashDebtPayments,
            debtSales: summary.debtSales,
            expectedCash: summary.expectedCash,
            actualCash: null,
            difference: 0,
            invoiceCount: summary.invoiceCount,
            autoClosed: true
        };
        changed = true;
    });

    if (changed) {
        saveData('shiftSessions', shiftSessions);
    }

    return changed;
}

function getShiftEndDate(shift) {
    return new Date(shift.closedAt || Date.now());
}

function getInvoicesForShift(shift) {
    if (!shift) return [];

    const shiftStart = new Date(shift.openedAt);
    const shiftEnd = getShiftEndDate(shift);

    return invoices.filter(invoice => {
        if (invoice.shiftId && invoice.shiftId === shift.id) {
            return true;
        }

        if (!invoice.date) return false;
        const invoiceDate = new Date(invoice.date);
        return invoiceDate >= shiftStart && invoiceDate <= shiftEnd;
    });
}

function getDebtPaymentsForShift(shift) {
    if (!shift) return [];

    const shiftStart = new Date(shift.openedAt);
    const shiftEnd = getShiftEndDate(shift);

    return debtPayments.filter(payment => {
        if (isDebtPaymentCancelled(payment)) return false;

        if (payment.shiftId && payment.shiftId === shift.id) {
            return true;
        }

        if (!payment.date) return false;
        const paymentDate = new Date(payment.date);
        return paymentDate >= shiftStart && paymentDate <= shiftEnd;
    });
}

function getInvoiceCashKeptAmount(invoice) {
    const receivedAmount = Number(invoice?.changeInfo?.receivedAmount);
    const changeAmount = Number(invoice?.changeInfo?.changeAmount) || 0;

    if (Number.isFinite(receivedAmount) && receivedAmount > 0) {
        return Math.max(0, roundCurrencyAmount(receivedAmount - changeAmount));
    }

    return Number(invoice?.total) || 0;
}

function calculateShiftSummary(shift) {
    if (!shift) {
        return {
            startCash: getConfiguredShiftStartCash(),
            grossCashReceived: 0,
            totalChange: 0,
            netCashSales: 0,
            cashDebtPayments: 0,
            debtSales: 0,
            expectedCash: getConfiguredShiftStartCash(),
            actualCash: null,
            difference: 0,
            invoiceCount: 0,
            missingChangeInfoCount: 0
        };
    }

    const shiftInvoices = getInvoicesForShift(shift);
    const cashInvoices = shiftInvoices.filter(invoice => invoice.paymentType === 'cash');
    const debtInvoices = shiftInvoices.filter(invoice => invoice.paymentType === 'debt');
    const cashDebtPayments = getDebtPaymentsForShift(shift)
        .filter(payment => payment.paymentMethod === 'cash')
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const grossCashReceived = cashInvoices.reduce((sum, invoice) => sum + (Number(invoice.changeInfo?.receivedAmount) || Number(invoice.total) || 0), 0) + cashDebtPayments;
    const totalChange = cashInvoices.reduce((sum, invoice) => sum + (Number(invoice.changeInfo?.changeAmount) || 0), 0);
    const netCashSales = cashInvoices.reduce((sum, invoice) => sum + getInvoiceCashKeptAmount(invoice), 0);
    const debtSales = debtInvoices.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
    const shiftStartCash = Number(shift.startCash ?? SHIFT_START_CASH);
    const expectedCash = shiftStartCash + netCashSales + cashDebtPayments;
    const actualCash = shift.actualCash != null ? Number(shift.actualCash) : null;
    const difference = actualCash != null ? actualCash - expectedCash : 0;

    return {
        startCash: shiftStartCash,
        grossCashReceived,
        totalChange,
        netCashSales,
        cashDebtPayments,
        debtSales,
        expectedCash,
        actualCash,
        difference,
        invoiceCount: shiftInvoices.length,
        missingChangeInfoCount: cashInvoices.filter(invoice => !invoice.changeInfo).length
    };
}

function getShiftDisplaySummary(shift) {
    const calculatedSummary = calculateShiftSummary(shift);

    if (!shift) {
        return calculatedSummary;
    }

    const actualCash = shift.actualCash != null ? Number(shift.actualCash) : calculatedSummary.actualCash;
    const difference = actualCash != null ? actualCash - calculatedSummary.expectedCash : calculatedSummary.difference;

    return {
        ...calculatedSummary,
        actualCash,
        difference
    };
}

function openShift() {
    if (getCurrentShift()) {
        alert('Смена уже открыта');
        return;
    }

    const sellerNameInput = document.getElementById('shift-seller-name');
    const sellerName = isSellerMode()
        ? (sessionAccess.userName || '')
        : (sellerNameInput ? sellerNameInput.value.trim() : '');
    if (!sellerName) {
        alert('Введите имя продавца перед открытием смены');
        return;
    }

    const shift = {
        id: generateId(),
        sellerName,
        openedAt: new Date().toISOString(),
        startCash: getConfiguredShiftStartCash(),
        cashToLeaveTarget: getConfiguredShiftCashToLeave(),
        status: 'open',
        openedByRole: getCurrentRole()
    };

    shiftSessions.push(shift);
    saveData('shiftSessions', shiftSessions);
    logActivity('open_shift', {
        shiftId: shift.id,
        sellerName: shift.sellerName,
        startCash: shift.startCash
    });

    if (sellerNameInput) {
        sellerNameInput.value = sellerName;
    }

    renderControlCenter();
    alert(`Смена открыта. В кассе должно быть ${formatCurrency(shift.startCash)}`);
}

function closeShift() {
    const currentShift = getCurrentShift();
    if (!currentShift) {
        alert('Нет открытой смены');
        return;
    }

    const actualCashInput = document.getElementById('shift-actual-cash');
    const cashToLeaveInput = document.getElementById('shift-cash-to-leave');
    const factTobaccoInput = document.getElementById('shift-fact-tobacco');
    const factRoastInput = document.getElementById('shift-fact-roast');
    const factSoupInput = document.getElementById('shift-fact-soup');
    const closeNoteInput = document.getElementById('shift-close-note');
    const actualCash = Number(actualCashInput?.value || 0);
    const cashToLeaveTarget = Number(cashToLeaveInput?.value || getConfiguredShiftCashToLeave());
    const factTobacco = Number(factTobaccoInput?.value || 0);
    const factRoast = Number(factRoastInput?.value || 0);
    const factSoup = Number(factSoupInput?.value || 0);

    if (!(actualCash >= 0)) {
        alert('Введите фактическую сумму в кассе');
        return;
    }
    if (!(cashToLeaveTarget >= 0)) {
        alert('Введите корректную сумму, которую оставить в кассе');
        return;
    }
    if (!factTobaccoInput?.value || !factRoastInput?.value || !factSoupInput?.value) {
        alert('Перед закрытием смены введите фактические остатки табака, жарки и супа');
        return;
    }
    if (!(factTobacco >= 0) || !(factRoast >= 0) || !(factSoup >= 0)) {
        alert('Введите фактические остатки табака, жарки и супа');
        return;
    }
    if (getCloudSyncConfig().enabled && (hasPendingCloudChanges() || cloudSyncState.lastError || !cloudSyncState.ready)) {
        const status = getCloudSafetyStatus();
        const proceed = confirm(`${status.title}\n${status.detail}\n\nСмена сохранится на этом устройстве, но руководитель увидит ее только после успешной синхронизации. Закрыть смену?`);
        if (!proceed) {
            return;
        }
    }

    const summary = calculateShiftSummary(currentShift);
    const inventoryReport = calculateInventoryControlReport(getTodayDateKey());
    const soupSnapshot = getSoupInventoryControlSnapshot(inventoryReport.dateKey);
    const inventoryCheck = {
        dateKey: inventoryReport.dateKey,
        opening: { ...inventoryReport.opening, soup: soupSnapshot.opening },
        openingPieces: { soup: soupSnapshot.openingPieces || 0 },
        receivedToday: { ...inventoryReport.receivedToday, soup: soupSnapshot.receivedToday },
        receivedTodayPieces: { soup: soupSnapshot.receivedTodayPieces || 0 },
        returnedToday: { ...inventoryReport.returnedToday, soup: soupSnapshot.returnedToday },
        returnedTodayPieces: { soup: soupSnapshot.returnedTodayPieces || 0 },
        soldToday: { ...inventoryReport.soldToday, soup: soupSnapshot.soldToday },
        soldTodayPieces: { soup: soupSnapshot.soldTodayPieces || 0 },
        expected: { ...inventoryReport.expected, soup: soupSnapshot.expectedPieces || 0 },
        expectedKg: { soup: soupSnapshot.expected || 0 },
        fact: {
            tobacco: factTobacco,
            roast: factRoast,
            soup: factSoup
        },
        factKg: { soup: soupSnapshot.fact || 0 },
        difference: {
            tobacco: factTobacco - (Number(inventoryReport.expected.tobacco) || 0),
            roast: factRoast - (Number(inventoryReport.expected.roast) || 0),
            soup: factSoup - (Number(soupSnapshot.expectedPieces) || 0)
        },
        differenceKg: { soup: soupSnapshot.difference || 0 },
        units: { tobacco: 'шт', roast: 'шт', soup: 'шт', soupKg: soupSnapshot.unit || 'кг' }
    };
    const cashTransferAmount = Math.max(0, actualCash - cashToLeaveTarget);
    const cashLeftInRegister = actualCash - cashTransferAmount;
    const receiverWallet = getCashControlSettings().defaultReceiverWallet;
    currentShift.status = 'closed';
    currentShift.closedAt = new Date().toISOString();
    currentShift.actualCash = actualCash;
    currentShift.cashToLeaveTarget = cashToLeaveTarget;
    currentShift.cashLeftInRegister = cashLeftInRegister;
    currentShift.cashTransferAmount = cashTransferAmount;
    currentShift.cashTransferToWallet = receiverWallet;
    currentShift.closeNote = closeNoteInput ? closeNoteInput.value.trim() : '';
    currentShift.inventoryCheck = inventoryCheck;
    currentShift.summary = {
        ...summary,
        actualCash,
        difference: actualCash - summary.expectedCash,
        cashToLeaveTarget,
        cashLeftInRegister,
        cashTransferAmount
    };

    let transferTransaction = null;
    if (cashTransferAmount > 0) {
        transferTransaction = recordMoneyTransaction({
            type: 'shift_transfer',
            amount: cashTransferAmount,
            fromWallet: 'worker_cash',
            toWallet: receiverWallet,
            category: 'Передача выручки после смены',
            counterparty: getMoneyWalletLabel(receiverWallet),
            note: currentShift.closeNote || `Смена ${currentShift.sellerName || ''}`.trim(),
            shiftId: currentShift.id
        });
    }

    saveData('shiftSessions', shiftSessions);
    logActivity('close_shift', {
        shiftId: currentShift.id,
        sellerName: currentShift.sellerName,
        expectedCash: summary.expectedCash,
        actualCash,
        difference: actualCash - summary.expectedCash,
        cashToLeaveTarget,
        cashLeftInRegister,
        cashTransferAmount,
        cashTransferToWallet: receiverWallet,
        inventoryCheck,
        moneyTransactionId: transferTransaction?.id || null
    });

    if (actualCashInput) actualCashInput.value = '';
    if (cashToLeaveInput) cashToLeaveInput.value = getConfiguredShiftCashToLeave();
    if (factTobaccoInput) factTobaccoInput.value = '';
    if (factRoastInput) factRoastInput.value = '';
    if (factSoupInput) factSoupInput.value = '';
    if (closeNoteInput) closeNoteInput.value = '';

    renderControlCenter();
    const transferText = cashTransferAmount > 0
        ? `Передать ${getMoneyWalletLabel(receiverWallet)}: ${formatCurrency(cashTransferAmount)}. В кассе осталось ${formatCurrency(cashLeftInRegister)}.`
        : `Передачи нет. В кассе осталось ${formatCurrency(cashLeftInRegister)}.`;
    const stockText = `Остатки: табак ${formatInventoryDifference(inventoryCheck.difference.tobacco)}, жарка ${formatInventoryDifference(inventoryCheck.difference.roast)}, суп ${formatInventoryDifferenceForUnit(inventoryCheck.difference.soup, 'шт')}.`;
    const shouldExport = confirm(`Смена закрыта. ${getShiftDifferenceText(currentShift.summary.difference)}.\n${transferText}\n${stockText}\n\nСкачать полный файл смены для отправки руководителю?`);
    if (shouldExport) {
        exportShiftData(currentShift.id);
    }
}

function getRecentShifts(limit = 5) {
    return [...shiftSessions]
        .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))
        .slice(0, limit);
}

function normalizeShiftHistorySearch(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();
}

function getShiftHistoryDateKey(shift) {
    return getRecordDateKey({ dateKey: shift?.dateKey, date: shift?.openedAt || shift?.createdAt || shift?.closedAt });
}

function getShiftHistoryDifference(shift) {
    const summary = getShiftDisplaySummary(shift);
    return Number(summary.difference) || 0;
}

function getShiftHistoryFiltersFromDom() {
    return {
        search: document.getElementById('shift-history-search')?.value || '',
        fromDate: document.getElementById('shift-history-from')?.value || '',
        toDate: document.getElementById('shift-history-to')?.value || '',
        status: document.getElementById('shift-history-status')?.value || 'all',
        difference: document.getElementById('shift-history-difference')?.value || 'all',
        pageSize: document.getElementById('shift-history-page-size')?.value || '10'
    };
}

function doesShiftMatchHistoryFilters(shift, filters = {}) {
    const search = normalizeShiftHistorySearch(filters.search);
    const dateKey = getShiftHistoryDateKey(shift);
    const status = filters.status || 'all';
    const differenceFilter = filters.difference || 'all';
    const difference = getShiftHistoryDifference(shift);

    if (filters.fromDate && (!dateKey || compareDateKeys(dateKey, filters.fromDate) < 0)) return false;
    if (filters.toDate && (!dateKey || compareDateKeys(dateKey, filters.toDate) > 0)) return false;
    if (status !== 'all' && shift.status !== status) return false;

    if (differenceFilter === 'ok' && Math.abs(difference) >= 0.01) return false;
    if (differenceFilter === 'over' && difference <= 0.01) return false;
    if (differenceFilter === 'under' && difference >= -0.01) return false;
    if (differenceFilter === 'mismatch' && Math.abs(difference) < 0.01) return false;

    if (search) {
        const haystack = normalizeShiftHistorySearch([
            shift.sellerName,
            shift.closeNote,
            shift.openedByRole,
            shift.status === 'open' ? 'открыта open' : 'закрыта closed'
        ].filter(Boolean).join(' '));
        if (!haystack.includes(search)) return false;
    }

    return true;
}

function getFilteredShiftHistory(shifts = shiftSessions, filters = {}) {
    return [...(Array.isArray(shifts) ? shifts : [])]
        .filter(shift => doesShiftMatchHistoryFilters(shift, filters))
        .sort((left, right) => String(right.openedAt || '').localeCompare(String(left.openedAt || '')));
}

function getShiftHistoryPageData(shifts = shiftSessions, filters = {}, page = 1) {
    const filtered = getFilteredShiftHistory(shifts, filters);
    const pageSizeValue = filters.pageSize || '10';
    const pageSize = pageSizeValue === 'all' ? filtered.length || 1 : Math.max(1, Number(pageSizeValue) || 10);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const startIndex = pageSizeValue === 'all' ? 0 : (currentPage - 1) * pageSize;
    const items = pageSizeValue === 'all' ? filtered : filtered.slice(startIndex, startIndex + pageSize);

    return {
        items,
        filtered,
        total: filtered.length,
        page: currentPage,
        pageSize,
        totalPages,
        startIndex,
        endIndex: startIndex + items.length
    };
}

function handleShiftHistoryFilterChange(resetPage = true) {
    if (resetPage) shiftHistoryPage = 1;
    renderShiftHistory();
}

function changeShiftHistoryPage(delta) {
    shiftHistoryPage += Number(delta) || 0;
    renderShiftHistory();
}

function resetShiftHistoryFilters() {
    ['shift-history-search', 'shift-history-from', 'shift-history-to'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    const statusSelect = document.getElementById('shift-history-status');
    const differenceSelect = document.getElementById('shift-history-difference');
    const pageSizeSelect = document.getElementById('shift-history-page-size');
    if (statusSelect) statusSelect.value = 'all';
    if (differenceSelect) differenceSelect.value = 'all';
    if (pageSizeSelect) pageSizeSelect.value = '10';
    handleShiftHistoryFilterChange(true);
}

function getShiftDifferenceText(difference) {
    const amount = Math.abs(Number(difference) || 0);
    if (amount < 0.01) {
        return 'в кассе ровно столько, сколько должно быть';
    }
    if (difference > 0) {
        return `в кассе на ${formatCurrency(amount)} больше, чем должно быть`;
    }
    return `в кассе на ${formatCurrency(amount)} меньше, чем должно быть`;
}

function formatInventoryDifference(difference) {
    const amount = Math.abs(Number(difference) || 0);
    if (amount === 0) {
        return 'сходится';
    }
    return `${difference > 0 ? '+' : '-'}${formatQuantity(amount, 'шт')} шт`;
}

function formatInventoryDifferenceForUnit(difference, unit = 'шт') {
    const amount = Math.abs(Number(difference) || 0);
    if (amount === 0) {
        return 'сходится';
    }
    return `${difference > 0 ? '+' : '-'}${formatQuantity(amount, unit)} ${unit}`;
}

function getActorLabel() {
    if (sessionAccess.userName) return sessionAccess.userName;
    const currentShift = getCurrentShift();
    if (currentShift?.sellerName) return currentShift.sellerName;
    return getCurrentRole() === 'seller' ? 'Продавец' : 'Руководитель';
}

function createInvoiceAuditSnapshot(invoice, fallbackNumber = null) {
    if (!invoice) return null;

    let invoiceNumber = fallbackNumber || Number(invoice.invoiceNumberAtArchive) || null;
    if (!invoiceNumber && invoices.some(item => item.id === invoice.id)) {
        invoiceNumber = getInvoiceNumber(invoice.id);
    }

    return {
        id: invoice.id,
        invoiceNumber: invoiceNumber || '?',
        date: invoice.date,
        clientName: getDisplayClientName(invoice.client),
        paymentType: invoice.paymentType,
        total: Number(invoice.total) || 0,
        sellerName: invoice.sellerName || '',
        receivedAmount: Number(invoice.changeInfo?.receivedAmount) || 0,
        changeAmount: Number(invoice.changeInfo?.changeAmount) || 0,
        items: (invoice.items || []).map(item => ({
            productName: item.productName,
            quantity: Number(item.quantity) || 0,
            unit: item.unit || 'шт',
            price: Number(item.price) || 0,
            total: Number(item.total) || 0,
            packageSaleMode: item.packageSaleMode || 'whole',
            tobaccoType: item.tobaccoType || '',
            tobaccoPackCount: Number(item.tobaccoPackCount) || 0,
            openedTobaccoPackCount: Number(item.openedTobaccoPackCount) || 0,
            kgItemCount: Number(item.kgItemCount) || 0,
            roastType: item.roastType || '',
            openedRoastPackCount: Number(item.openedRoastPackCount) || 0,
            roastTypeOrder: item.roastTypeOrder || [],
            roast: item.roast || null
        }))
    };
}

function createReceiptAuditSnapshot(receipt) {
    if (!receipt) return null;

    return {
        id: receipt.id,
        supplierName: receipt.supplierName || 'Поставщик',
        invoiceNumber: receipt.invoiceNumber || '',
        date: receipt.date,
        dateKey: receipt.dateKey || '',
        totalAmount: Number(receipt.totalAmount) || 0,
        paidAmount: Number(receipt.paidAmount) || 0,
        acceptedBy: receipt.acceptedBy || '',
        tobaccoMixedType: receipt.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE,
        tobaccoMixedTypes: { ...(receipt.tobaccoMixedTypes || {}) },
        items: getIncomingReceiptItems(receipt).map(item => ({
            key: item.key,
            label: item.label,
            piecesQty: Number(item.piecesQty) || 0,
            kgQty: Number(item.kgQty) || 0,
            lineTotal: Number(item.lineTotal) || 0,
            tobaccoMixedType: item.tobaccoMixedType || ''
        })),
        paymentHistory: Array.isArray(receipt.paymentHistory)
            ? receipt.paymentHistory.map(payment => ({
                amount: Number(payment.amount) || 0,
                date: payment.date,
                note: payment.note || '',
                paidBy: payment.paidBy || ''
            }))
            : []
    };
}

function createDebtAuditSnapshot(debt) {
    if (!debt) return null;

    return {
        id: debt.id,
        clientName: debt.clientName || 'Без имени',
        amount: Number(debt.amount) || 0,
        paidAmount: Number(debt.paidAmount) || 0,
        createdAt: debt.createdAt || '',
        invoiceCount: Array.isArray(debt.invoices) ? debt.invoices.length : 0,
        invoices: (debt.invoices || []).map(invoice => ({
            id: invoice.id,
            number: invoice.number || '?',
            amount: Number(invoice.amount) || 0,
            date: invoice.date || '',
            items: Array.isArray(invoice.items) ? invoice.items.map(item => ({
                productName: item.productName,
                quantity: Number(item.quantity) || 0,
                unit: item.unit || 'шт',
                total: Number(item.total) || 0
            })) : []
        }))
    };
}

function getActivityCategory(entry) {
    switch (entry?.type) {
        case 'create_invoice':
        case 'edit_invoice':
        case 'delete_invoice':
        case 'archive_invoice':
        case 'restore_invoice':
            return 'invoice';
        case 'debt_create':
        case 'debt_change':
        case 'debt_payment':
        case 'debt_payment_cancel':
        case 'debt_payoff':
        case 'debt_delete':
        case 'certificate_debt':
            return 'debt';
        case 'create_receipt':
        case 'update_receipt':
        case 'receipt_payment':
        case 'supplier_total_payment':
        case 'package_production':
        case 'assemble_opened_stock':
        case 'initial_stock':
        case 'update_initial_stock':
        case 'delete_initial_stock':
        case 'archive_receipt':
        case 'restore_receipt':
        case 'delete_receipt_permanent':
            return 'incoming';
        case 'open_shift':
        case 'close_shift':
            return 'shift';
        case 'save_change':
        case 'money_operation':
            return 'cash';
        case 'switch_role':
            return 'access';
        default:
            return 'all';
    }
}

function getActivitySummary(entry) {
    switch (entry?.type) {
        case 'create_invoice':
        case 'edit_invoice':
        case 'delete_invoice':
        case 'archive_invoice':
        case 'restore_invoice':
            if (entry.totalInvoices) {
                return `Архивировано накладных: ${entry.totalInvoices} • ${formatCurrency(entry.total || 0)}`;
            }
            return `Накладная • ${entry.client || entry.invoiceSnapshot?.clientName || 'клиент не указан'} • ${formatCurrency(entry.total || entry.invoiceSnapshot?.total || 0)}`;
        case 'debt_create':
        case 'debt_change':
            return `${entry.clientName || entry.debtSnapshot?.clientName || 'Долг'} • ${formatCurrency(entry.afterAmount ?? entry.paidAmount ?? entry.amount ?? entry.debtSnapshot?.amount ?? 0)}`;
        case 'debt_payment':
            return `${entry.clientName || entry.debtSnapshot?.clientName || 'Долг'} • оплата ${formatCurrency(entry.paidAmount || entry.amount || 0)} • осталось ${formatCurrency(entry.afterAmount || 0)}`;
        case 'debt_payment_cancel':
            return `${entry.clientName || entry.debtSnapshot?.clientName || 'Долг'} • отменена оплата ${formatCurrency(entry.amount || 0)} • долг ${formatCurrency(entry.afterAmount || 0)}`;
        case 'debt_payoff':
            return `${entry.clientName || entry.debtSnapshot?.clientName || 'Долг'} • погашено ${formatCurrency(entry.paidAmount || entry.amount || entry.debtSnapshot?.amount || 0)}`;
        case 'debt_delete':
            return `${entry.clientName || entry.debtSnapshot?.clientName || 'Долг'} • удалён ${formatCurrency(entry.amount || entry.debtSnapshot?.amount || 0)}`;
        case 'certificate_debt':
            return `Справки • клиентов ${entry.clientCount || 0} • ${formatCurrency(entry.totalAmount || 0)}`;
        case 'create_receipt':
        case 'update_receipt':
        case 'archive_receipt':
        case 'restore_receipt':
        case 'delete_receipt_permanent':
            return `${entry.supplierName || entry.receiptSnapshot?.supplierName || 'Поставщик'} • ${formatCurrency(entry.totalAmount || entry.receiptSnapshot?.totalAmount || 0)}`;
        case 'package_production':
            return `Фасовка • мешаных ${formatQuantity(entry.mixedPacksProduced || 0, 'шт')} • не мешаных ${formatQuantity(entry.purePacksProduced || 0, 'шт')}`;
        case 'assemble_opened_stock':
            return `Сборка открытых остатков • ${entry.productKind === 'roast' ? 'жарка' : 'табак'} • ${formatQuantity(entry.packCount || 0, 'шт')} пак.`;
        case 'initial_stock':
            return `Стартовый остаток • ${formatCurrency(entry.totalAmount || 0)}`;
        case 'update_initial_stock':
            return `Изменён стартовый остаток • ${formatCurrency(entry.beforeTotalAmount || 0)} → ${formatCurrency(entry.totalAmount || 0)}`;
        case 'delete_initial_stock':
            return `Удалён стартовый остаток • ${formatCurrency(entry.totalAmount || 0)}`;
        case 'receipt_payment':
            return `${entry.supplierName || 'Поставщик'} • оплата ${formatCurrency(entry.amount || 0)}`;
        case 'supplier_total_payment':
            return `Общая оплата поставщику • ${formatCurrency(entry.amount || 0)}`;
        case 'open_shift':
        case 'close_shift':
            return `${entry.sellerName || 'Смена'}${entry.difference != null ? ` • ${getShiftDifferenceText(entry.difference)}` : ''}`;
        case 'save_change':
            return `Наличные по накладной • получено ${formatCurrency(entry.receivedAmount || 0)} • сдача ${formatCurrency(entry.changeAmount || 0)}`;
        case 'money_operation':
            return `${getMoneyOperationTypeLabel(entry.moneyType)} • ${formatCurrency(entry.amount || 0)}${entry.category ? ` • ${entry.category}` : ''}`;
        case 'switch_role':
            return entry.role === 'seller' ? 'Вход продавца' : 'Вход руководителя';
        default:
            return 'Действие';
    }
}

function logActivity(type, details = {}) {
    const entry = {
        id: generateId(),
        type,
        createdAt: new Date().toISOString(),
        role: getCurrentRole(),
        actor: getActorLabel(),
        shiftId: getCurrentShift()?.id || details.shiftId || null,
        ...details
    };

    activityLog.unshift(entry);
    activityLog = activityLog.slice(0, 300);
    saveData('activityLog', activityLog);

    if (document.getElementById('activity-log-preview')) {
        renderActivityLogTable();
    }
}

function getActivityTitle(entry) {
    switch (entry.type) {
        case 'create_invoice': return 'Создана накладная';
        case 'edit_invoice': return 'Изменена накладная';
        case 'delete_invoice': return 'Удалена накладная';
        case 'archive_invoice': return 'Накладная отправлена в архив';
        case 'restore_invoice': return 'Накладная восстановлена из архива';
        case 'save_change': return 'Сохранена сдача';
        case 'money_operation': return 'Операция с деньгами';
        case 'debt_create': return 'Создан долг';
        case 'debt_change': return 'Изменён долг';
        case 'debt_payment': return 'Принята оплата долга';
        case 'debt_payment_cancel': return 'Оплата долга отменена';
        case 'debt_payoff': return 'Долг погашен';
        case 'debt_delete': return 'Долг удалён';
        case 'certificate_debt': return 'Выписаны справки';
        case 'open_shift': return 'Открыта смена';
        case 'close_shift': return 'Закрыта смена';
        case 'create_receipt': return 'Принята накладная поставщика';
        case 'update_receipt': return 'Изменена приходная накладная';
        case 'package_production': return 'Сформированы пакеты';
        case 'initial_stock': return 'Внесены стартовые остатки';
        case 'update_initial_stock': return 'Изменены стартовые остатки';
        case 'delete_initial_stock': return 'Удалены стартовые остатки';
        case 'receipt_payment': return 'Проведена оплата поставщику';
        case 'supplier_total_payment': return 'Проведена общая оплата поставщику';
        case 'archive_receipt': return 'Приходная накладная отправлена в архив';
        case 'restore_receipt': return 'Приходная накладная восстановлена из архива';
        case 'delete_receipt_permanent': return 'Приходная накладная удалена навсегда';
        case 'switch_role': return 'Сменен режим';
        default: return 'Действие';
    }
}

function formatShortDateTime(dateString) {
    if (!dateString) return 'Без даты';
    if (isDateKey(dateString)) {
        return resolveDateInput(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    return resolveDateInput(dateString).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getInvoiceNumber(invoiceId) {
    const index = invoices.findIndex(invoice => invoice.id === invoiceId);
    return index !== -1 ? index + 1 : '?';
}

function getActivityCategoryLabel(category) {
    switch (category) {
        case 'invoice': return 'Накладные';
        case 'debt': return 'Долги';
        case 'incoming': return 'Приход';
        case 'shift': return 'Смена';
        case 'cash': return 'Наличные';
        case 'access': return 'Доступ';
        default: return 'Другое';
    }
}

function renderAuditMetaRows(rows = []) {
    return `
        <div class="audit-detail-grid">
            ${rows.map(row => `
                <div class="audit-detail-cell">
                    <span>${escapeHtml(row.label)}</span>
                    <strong>${row.isHtml ? row.value : escapeHtml(row.value == null ? '' : String(row.value))}</strong>
                </div>
            `).join('')}
        </div>
    `;
}

function getAuditInvoiceChangeConfig() {
    return [
        { key: 'clientName', label: 'Клиент' },
        { key: 'paymentType', label: 'Оплата', formatter: value => value === 'cash' ? 'Наличными' : value === 'debt' ? 'В долг' : 'Не указано' },
        { key: 'total', label: 'Сумма', formatter: value => formatCurrency(value || 0) },
        { key: 'receivedAmount', label: 'Получено', formatter: value => formatCurrency(value || 0) },
        { key: 'changeAmount', label: 'Сдача', formatter: value => formatCurrency(value || 0) },
        { key: 'sellerName', label: 'Продавец' },
        { key: 'items', label: 'Товары', formatter: value => formatAuditItemsSummary(value) }
    ];
}

function getAuditReceiptChangeConfig() {
    return [
        { key: 'supplierName', label: 'Поставщик' },
        { key: 'invoiceNumber', label: 'Номер' },
        { key: 'date', label: 'Дата', formatter: value => value ? formatDateShort(value) : 'Без даты' },
        { key: 'totalAmount', label: 'Сумма', formatter: value => formatCurrency(value || 0) },
        { key: 'paidAmount', label: 'Оплачено', formatter: value => formatCurrency(value || 0) },
        { key: 'acceptedBy', label: 'Принял' },
        { key: 'items', label: 'Позиции', formatter: value => formatAuditReceiptItemsSummary(value) }
    ];
}

function getAuditDebtChangeConfig() {
    return [
        { key: 'clientName', label: 'Клиент' },
        { key: 'amount', label: 'Сумма долга', formatter: value => formatCurrency(value || 0) },
        { key: 'paidAmount', label: 'Оплачено', formatter: value => formatCurrency(value || 0) },
        { key: 'invoiceCount', label: 'Связанных накладных' },
        { key: 'invoices', label: 'Накладные', formatter: value => formatAuditDebtInvoicesSummary(value) }
    ];
}

function formatAuditItemsSummary(items = []) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return 'Нет товаров';
    const total = list.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    return `${formatQuantity(list.length, 'шт')} поз. • ${formatCurrency(total)}`;
}

function formatAuditReceiptItemsSummary(items = []) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return 'Нет позиций';
    const pieces = list.reduce((sum, item) => sum + (Number(item.piecesQty) || 0), 0);
    const kg = list.reduce((sum, item) => sum + (Number(item.kgQty) || 0), 0);
    return `${formatQuantity(list.length, 'шт')} поз. • ${formatQuantity(pieces, 'шт')} шт • ${formatQuantity(kg, 'кг')} кг`;
}

function formatAuditDebtInvoicesSummary(invoicesList = []) {
    const list = Array.isArray(invoicesList) ? invoicesList : [];
    if (!list.length) return 'Нет накладных';
    const amount = list.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
    return `${formatQuantity(list.length, 'шт')} накл. • ${formatCurrency(amount)}`;
}

function normalizeAuditCompareValue(value) {
    if (Array.isArray(value)) {
        return JSON.stringify(value.map(item => Object.keys(item || {}).sort().reduce((acc, key) => {
            acc[key] = item[key];
            return acc;
        }, {})));
    }
    if (value && typeof value === 'object') {
        return JSON.stringify(Object.keys(value).sort().reduce((acc, key) => {
            acc[key] = value[key];
            return acc;
        }, {}));
    }
    return String(value ?? '');
}

function renderAuditChangeOverview(beforeSnapshot, afterSnapshot, config = []) {
    if (!beforeSnapshot && !afterSnapshot) return '';

    const rows = config
        .map(field => {
            const beforeValue = beforeSnapshot ? beforeSnapshot[field.key] : undefined;
            const afterValue = afterSnapshot ? afterSnapshot[field.key] : undefined;
            if (normalizeAuditCompareValue(beforeValue) === normalizeAuditCompareValue(afterValue)) {
                return '';
            }
            const formatter = field.formatter || (value => value == null || value === '' ? 'Не указано' : String(value));
            return `
                <div class="audit-change-row">
                    <span class="audit-change-label">${escapeHtml(field.label)}</span>
                    <div class="audit-change-value audit-change-before">
                        <small>Было</small>
                        <strong>${escapeHtml(formatter(beforeValue))}</strong>
                    </div>
                    <div class="audit-change-arrow"><i class="fas fa-arrow-right"></i></div>
                    <div class="audit-change-value audit-change-after">
                        <small>Стало</small>
                        <strong>${escapeHtml(formatter(afterValue))}</strong>
                    </div>
                </div>
            `;
        })
        .filter(Boolean);

    if (!rows.length) return '';

    return `
        <div class="audit-change-overview">
            <div class="audit-change-head">
                <i class="fas fa-wand-magic-sparkles"></i>
                <div>
                    <strong>Что изменилось</strong>
                    <span>Главные изменения выделены цветом, чтобы сразу было видно, где именно поменяли данные.</span>
                </div>
            </div>
            <div class="audit-change-list">
                ${rows.join('')}
            </div>
        </div>
    `;
}

function getAuditInvoiceItemTypeLabel(item = {}) {
    const parts = [];
    if (item.tobaccoType) {
        parts.push(`Табак ${getTobaccoTypeLabel(item.tobaccoType)}`);
    }
    if (item.roastType) {
        parts.push(`Жарка ${getRoastTypeLabel(item.roastType)}`);
    }
    return parts.join(' • ') || 'Без типа';
}

function renderAuditInvoiceSnapshot(snapshot, title = 'Накладная') {
    if (!snapshot) {
        return '<div class="audit-empty">Данных по накладной нет</div>';
    }

    return `
        <div class="audit-detail-card">
            <h4>${escapeHtml(title)}</h4>
            ${renderAuditMetaRows([
                { label: 'Номер', value: `№${snapshot.invoiceNumber || '?'}` },
                { label: 'Дата', value: formatShortDateTime(snapshot.date) },
                { label: 'Клиент', value: snapshot.clientName || 'Не указан' },
                { label: 'Оплата', value: snapshot.paymentType === 'cash' ? 'Наличными' : 'В долг' },
                { label: 'Сумма', value: formatCurrency(snapshot.total || 0), isHtml: true },
                { label: 'Продавец', value: snapshot.sellerName || 'Не указан' }
            ])}
            ${(snapshot.receivedAmount || snapshot.changeAmount) ? renderAuditMetaRows([
                { label: 'Получено', value: formatCurrency(snapshot.receivedAmount || 0), isHtml: true },
                { label: 'Сдача', value: formatCurrency(snapshot.changeAmount || 0), isHtml: true }
            ]) : ''}
            <div class="table-responsive">
                <table class="invoice-items-table audit-items-table">
                    <thead>
                        <tr>
                            <th>Товар</th>
                            <th>Тип</th>
                            <th>Кол-во</th>
                            <th>Цена</th>
                            <th>Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(snapshot.items || []).map(item => `
                            <tr>
                                <td>${escapeHtml(item.productName || 'Товар')}</td>
                                <td>${escapeHtml(getAuditInvoiceItemTypeLabel(item))}</td>
                                <td>${formatQuantity(item.quantity || 0, item.unit || 'шт')} ${escapeHtml(item.unit || 'шт')}</td>
                                <td>${formatCurrency(item.price || 0)}</td>
                                <td>${formatCurrency(item.total || 0)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5">Товаров нет</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAuditReceiptSnapshot(snapshot, title = 'Приходная накладная') {
    if (!snapshot) {
        return '<div class="audit-empty">Данных по приходной накладной нет</div>';
    }

    const tobaccoTypes = getIncomingTobaccoMixedTypeSummary(snapshot.tobaccoMixedTypes || {});
    return `
        <div class="audit-detail-card">
            <h4>${escapeHtml(title)}</h4>
            ${renderAuditMetaRows([
                { label: 'Поставщик', value: snapshot.supplierName || 'Поставщик' },
                { label: 'Номер', value: snapshot.invoiceNumber ? `№${snapshot.invoiceNumber}` : 'Без номера' },
                { label: 'Дата', value: formatDateShort(snapshot.date || snapshot.dateKey) },
                { label: 'Сумма', value: formatCurrency(snapshot.totalAmount || 0), isHtml: true },
                { label: 'Оплачено', value: formatCurrency(snapshot.paidAmount || 0), isHtml: true },
                { label: 'Принял', value: snapshot.acceptedBy || 'Не указано' },
                { label: 'Тип табака', value: tobaccoTypes.join(', ') || getTobaccoTypeLabel(snapshot.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE) }
            ])}
            <div class="table-responsive">
                <table class="invoice-items-table audit-items-table">
                    <thead>
                        <tr>
                            <th>Позиция</th>
                            <th>Шт</th>
                            <th>Кг</th>
                            <th>Тип</th>
                            <th>Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(snapshot.items || []).map(item => `
                            <tr>
                                <td>${escapeHtml(item.label || item.key || 'Позиция')}</td>
                                <td>${formatQuantity(item.piecesQty || 0, 'шт')}</td>
                                <td>${formatQuantity(item.kgQty || 0, 'кг')}</td>
                                <td>${item.key === 'tobacco' ? escapeHtml(getTobaccoTypeLabel(item.tobaccoMixedType || snapshot.tobaccoMixedType || AUTO_TOBACCO_MIXED_TYPE)) : 'Без типа'}</td>
                                <td>${formatCurrency(item.lineTotal || 0)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5">Позиций нет</td></tr>'}
                    </tbody>
                </table>
            </div>
            ${(snapshot.paymentHistory || []).length ? `
                <div class="audit-subsection">
                    <h5>Оплаты по накладной</h5>
                    <div class="table-responsive">
                        <table class="invoice-items-table audit-items-table">
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Сумма</th>
                                    <th>Кто оплатил</th>
                                    <th>Комментарий</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${snapshot.paymentHistory.map(payment => `
                                    <tr>
                                        <td>${formatShortDateTime(payment.date)}</td>
                                        <td>${formatCurrency(payment.amount || 0)}</td>
                                        <td>${escapeHtml(payment.paidBy || 'Не указано')}</td>
                                        <td>${escapeHtml(payment.note || '')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderAuditDebtSnapshot(snapshot, title = 'Долг') {
    if (!snapshot) {
        return '<div class="audit-empty">Данных по долгу нет</div>';
    }

    return `
        <div class="audit-detail-card">
            <h4>${escapeHtml(title)}</h4>
            ${renderAuditMetaRows([
                { label: 'Клиент', value: snapshot.clientName || 'Без имени' },
                { label: 'Сумма долга', value: formatCurrency(snapshot.amount || 0), isHtml: true },
                { label: 'Оплачено', value: formatCurrency(snapshot.paidAmount || 0), isHtml: true },
                { label: 'Создан', value: formatShortDateTime(snapshot.createdAt) },
                { label: 'Связанных накладных', value: snapshot.invoiceCount || 0 }
            ])}
            ${(snapshot.invoices || []).length ? `
                <div class="table-responsive">
                    <table class="invoice-items-table audit-items-table">
                        <thead>
                            <tr>
                                <th>Накладная</th>
                                <th>Дата</th>
                                <th>Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${snapshot.invoices.map(invoice => `
                                <tr>
                                    <td>№${invoice.number || '?'}</td>
                                    <td>${formatDateShort(invoice.date)}</td>
                                    <td>${formatCurrency(invoice.amount || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<div class="audit-empty">Связанных накладных нет</div>'}
        </div>
    `;
}

function showActivityEntryDetails(entryId) {
    const entry = activityLog.find(item => item.id === entryId);
    if (!entry) {
        alert('Событие не найдено');
        return;
    }

    const modalId = 'activityEntryDetailsModal';
    document.getElementById(modalId)?.remove();

    let detailsHtml = `
        <div class="audit-detail-card">
            <h4>${escapeHtml(getActivityTitle(entry))}</h4>
            ${renderAuditMetaRows([
                { label: 'Когда', value: formatShortDateTime(entry.createdAt) },
                { label: 'Кто', value: entry.actor || 'Система' },
                { label: 'Роль', value: entry.role === 'seller' ? 'Продавец' : 'Руководитель' },
                { label: 'Раздел', value: getActivityCategoryLabel(getActivityCategory(entry)) },
                { label: 'Кратко', value: getActivitySummary(entry) }
            ])}
            ${entry.reason ? `<div class="audit-note">Причина: ${escapeHtml(entry.reason)}</div>` : ''}
            ${entry.comment ? `<div class="audit-note">Комментарий: ${escapeHtml(entry.comment)}</div>` : ''}
        </div>
    `;

    if (entry.beforeInvoiceSnapshot || entry.afterInvoiceSnapshot) {
        detailsHtml += `
            ${renderAuditChangeOverview(entry.beforeInvoiceSnapshot, entry.afterInvoiceSnapshot, getAuditInvoiceChangeConfig())}
            <div class="audit-compare-grid">
                ${renderAuditInvoiceSnapshot(entry.beforeInvoiceSnapshot, 'Было до изменения')}
                ${renderAuditInvoiceSnapshot(entry.afterInvoiceSnapshot, 'Стало после изменения')}
            </div>
        `;
    } else if (entry.invoiceSnapshot) {
        detailsHtml += renderAuditInvoiceSnapshot(entry.invoiceSnapshot);
    }

    if (entry.beforeReceiptSnapshot || entry.afterReceiptSnapshot) {
        detailsHtml += `
            ${renderAuditChangeOverview(entry.beforeReceiptSnapshot, entry.afterReceiptSnapshot, getAuditReceiptChangeConfig())}
            <div class="audit-compare-grid">
                ${renderAuditReceiptSnapshot(entry.beforeReceiptSnapshot, 'Было до изменения')}
                ${renderAuditReceiptSnapshot(entry.afterReceiptSnapshot, 'Стало после изменения')}
            </div>
        `;
    } else if (entry.receiptSnapshot) {
        detailsHtml += renderAuditReceiptSnapshot(entry.receiptSnapshot);
    }

    if (entry.beforeDebtSnapshot || entry.afterDebtSnapshot) {
        detailsHtml += `
            ${renderAuditChangeOverview(entry.beforeDebtSnapshot, entry.afterDebtSnapshot, getAuditDebtChangeConfig())}
            <div class="audit-compare-grid">
                ${renderAuditDebtSnapshot(entry.beforeDebtSnapshot, 'Было до изменения')}
                ${renderAuditDebtSnapshot(entry.afterDebtSnapshot, 'Стало после изменения')}
            </div>
        `;
    } else if (entry.debtSnapshot) {
        detailsHtml += renderAuditDebtSnapshot(entry.debtSnapshot);
    }

    if (entry.allocations?.length) {
        detailsHtml += `
            <div class="audit-detail-card">
                <h4>Как распределилась общая оплата</h4>
                <div class="table-responsive">
                    <table class="invoice-items-table audit-items-table">
                        <thead>
                            <tr>
                                <th>Поставщик</th>
                                <th>Накладная</th>
                                <th>Оплачено</th>
                                <th>Осталось по накладной</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entry.allocations.map(allocation => `
                                <tr>
                                    <td>${escapeHtml(allocation.supplierName || 'Поставщик')}</td>
                                    <td>${allocation.invoiceNumber ? `№${escapeHtml(allocation.invoiceNumber)}` : 'Без номера'}</td>
                                    <td>${formatCurrency(allocation.amount || 0)}</td>
                                    <td>${formatCurrency(allocation.remaining || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    const modalHtml = `
        <div id="${modalId}" class="modal open">
            <div class="modal-content modal-preview audit-detail-modal">
                <div class="modal-header">
                    <h3>${escapeHtml(getActivityTitle(entry))}</h3>
                    <span class="close" onclick="closeModal('${modalId}')">&times;</span>
                </div>
                <div class="modal-body audit-detail-body">
                    ${detailsHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('${modalId}')">Закрыть</button>
                    ${entry.invoiceId ? `<button class="btn btn-primary" onclick="closeModal('${modalId}'); ${invoices.some(invoice => invoice.id === entry.invoiceId) ? `previewInvoice('${entry.invoiceId}')` : `showInvoiceDetails('${entry.invoiceId}')`}">Открыть накладную</button>` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    openModal(modalId);
}

function normalizeActivityLogSearch(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();
}

function getActivityLogFiltersFromDom() {
    return {
        search: document.getElementById('audit-filter-search')?.value || '',
        type: document.getElementById('audit-filter-type')?.value || 'all',
        dateMode: document.getElementById('audit-filter-date-mode')?.value || 'all',
        dateExact: document.getElementById('audit-filter-date-exact')?.value || '',
        dateFrom: document.getElementById('audit-filter-date-from')?.value || '',
        dateTo: document.getElementById('audit-filter-date-to')?.value || '',
        pageSize: document.getElementById('audit-filter-page-size')?.value || '20'
    };
}

function doesActivityEntryMatchFilters(entry = {}, filters = {}) {
    const typeFilter = filters.type || 'all';
    const category = getActivityCategory(entry);
    const createdDateKey = getRecordDateKey({ date: entry.createdAt || entry.date });
    const dateMode = filters.dateMode || 'all';
    const search = normalizeActivityLogSearch(filters.search);

    if (typeFilter !== 'all' && category !== typeFilter) return false;
    if (dateMode === 'day' && filters.dateExact && createdDateKey !== filters.dateExact) return false;
    if (dateMode === 'range') {
        if (filters.dateFrom && compareDateKeys(createdDateKey, filters.dateFrom) < 0) return false;
        if (filters.dateTo && compareDateKeys(createdDateKey, filters.dateTo) > 0) return false;
    }
    if (dateMode === 'after' && filters.dateFrom && compareDateKeys(createdDateKey, filters.dateFrom) < 0) return false;
    if (dateMode === 'all') {
        if (filters.dateFrom && compareDateKeys(createdDateKey, filters.dateFrom) < 0) return false;
        if (filters.dateTo && compareDateKeys(createdDateKey, filters.dateTo) > 0) return false;
    }

    if (!search) return true;

    const haystack = normalizeActivityLogSearch([
        entry.id,
        entry.actor,
        getActivityCategoryLabel(category),
        getActivityTitle(entry),
        getActivitySummary(entry),
        entry.client,
        entry.sellerName,
        entry.category,
        entry.counterparty,
        entry.note,
        entry.amount,
        entry.total
    ].filter(Boolean).join(' '));

    return haystack.includes(search);
}

function getActivityLogPageData(entries = [], filters = {}, requestedPage = 1) {
    const pageSize = filters.pageSize || '20';
    const filtered = (Array.isArray(entries) ? entries : [])
        .filter(entry => doesActivityEntryMatchFilters(entry, filters))
        .sort((left, right) => String(right.createdAt || right.date || '').localeCompare(String(left.createdAt || left.date || '')));

    if (pageSize === 'all') {
        return {
            items: filtered,
            total: filtered.length,
            page: 1,
            totalPages: 1,
            pageSize,
            startIndex: filtered.length ? 0 : -1,
            endIndex: filtered.length
        };
    }

    const numericPageSize = Math.max(1, Number(pageSize) || 20);
    const totalPages = Math.max(1, Math.ceil(filtered.length / numericPageSize));
    const page = Math.min(Math.max(1, Number(requestedPage) || 1), totalPages);
    const startIndex = (page - 1) * numericPageSize;
    const endIndex = Math.min(startIndex + numericPageSize, filtered.length);

    return {
        items: filtered.slice(startIndex, endIndex),
        total: filtered.length,
        page,
        totalPages,
        pageSize: numericPageSize,
        startIndex: filtered.length ? startIndex : -1,
        endIndex
    };
}

function syncActivityLogDateFields() {
    const mode = document.getElementById('audit-filter-date-mode')?.value || 'all';
    const exactWrap = document.getElementById('audit-filter-date-exact-wrap');
    const fromWrap = document.getElementById('audit-filter-date-from-wrap');
    const toWrap = document.getElementById('audit-filter-date-to-wrap');

    if (exactWrap) exactWrap.style.display = mode === 'day' ? 'grid' : 'none';
    if (fromWrap) fromWrap.style.display = (mode === 'range' || mode === 'after') ? 'grid' : 'none';
    if (toWrap) toWrap.style.display = mode === 'range' ? 'grid' : 'none';
}

function handleActivityLogFilterChange() {
    auditLogPage = 1;
    renderActivityLogTable();
}

function handleActivityLogDateModeChange() {
    syncActivityLogDateFields();
    handleActivityLogFilterChange();
}

function changeActivityLogPage(delta) {
    auditLogPage += Number(delta) || 0;
    renderActivityLogTable();
}

function resetActivityLogFilters() {
    const defaults = {
        'audit-filter-search': '',
        'audit-filter-type': 'all',
        'audit-filter-date-mode': 'all',
        'audit-filter-date-exact': '',
        'audit-filter-date-from': '',
        'audit-filter-date-to': '',
        'audit-filter-page-size': '20'
    };

    Object.entries(defaults).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    });

    syncActivityLogDateFields();
    handleActivityLogFilterChange();
}

function shouldUseMobileAuditCards() {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: 640px)').matches;
}

function renderActivityLogTable() {
    const container = document.getElementById('activity-log-preview');
    const countLabel = document.getElementById('audit-log-count');
    const pagination = document.getElementById('audit-log-pagination');
    if (!container) return;

    syncActivityLogDateFields();
    const filters = getActivityLogFiltersFromDom();
    const pageData = getActivityLogPageData(activityLog, filters, auditLogPage);
    auditLogPage = pageData.page;

    if (countLabel) {
        const shownText = pageData.total
            ? `${pageData.startIndex + 1}-${pageData.endIndex} из ${pageData.total}`
            : '0 действий';
        countLabel.textContent = `${shownText} • всего ${activityLog.length}`;
    }

    if (!pageData.items.length) {
        container.innerHTML = '<div class="timeline-item">Под выбранные фильтры действий не найдено</div>';
        if (pagination) pagination.innerHTML = '';
        return;
    }

    if (shouldUseMobileAuditCards()) {
        container.innerHTML = `
            <div class="audit-mobile-list">
                ${pageData.items.map(entry => `
                    <article class="audit-mobile-card">
                        <div class="audit-mobile-card-top">
                            <strong>${escapeHtml(getActivityTitle(entry))}</strong>
                            <span>${formatShortDateTime(entry.createdAt)}</span>
                        </div>
                        <div class="audit-mobile-card-meta">
                            <span><i class="fas fa-user"></i> ${escapeHtml(entry.actor || 'Система')}</span>
                            <span><i class="fas fa-folder-open"></i> ${escapeHtml(getActivityCategoryLabel(getActivityCategory(entry)))}</span>
                        </div>
                        <p>${escapeHtml(getActivitySummary(entry))}</p>
                        <button class="btn btn-secondary btn-sm" onclick="showActivityEntryDetails('${entry.id}')">
                            <i class="fas fa-eye"></i> Детали
                        </button>
                    </article>
                `).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="table-responsive">
                <table class="invoice-items-table audit-log-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Кто</th>
                            <th>Раздел</th>
                            <th>Действие</th>
                            <th>Кратко</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageData.items.map(entry => `
                            <tr>
                                <td>${formatShortDateTime(entry.createdAt)}</td>
                                <td>${escapeHtml(entry.actor || 'Система')}</td>
                                <td>${escapeHtml(getActivityCategoryLabel(getActivityCategory(entry)))}</td>
                                <td>${escapeHtml(getActivityTitle(entry))}</td>
                                <td>${escapeHtml(getActivitySummary(entry))}</td>
                                <td>
                                    <button class="btn btn-secondary btn-sm" onclick="showActivityEntryDetails('${entry.id}')">
                                        <i class="fas fa-eye"></i> Детали
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    if (!pagination) return;
    if (filters.pageSize === 'all' || pageData.totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    pagination.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="changeActivityLogPage(-1)" ${pageData.page <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Назад
        </button>
        <span>Страница ${pageData.page} из ${pageData.totalPages}</span>
        <button class="btn btn-secondary btn-sm" onclick="changeActivityLogPage(1)" ${pageData.page >= pageData.totalPages ? 'disabled' : ''}>
            Вперед <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

function showShiftInvoices(shiftId) {
    if (isSellerMode()) {
        return;
    }

    const shift = shiftSessions.find(item => item.id === shiftId);
    if (!shift) {
        alert('Смена не найдена');
        return;
    }

    const shiftSummary = getShiftDisplaySummary(shift);
    const shiftInvoices = getInvoicesForShift(shift)
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const modalId = 'shiftInvoicesModal';
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
        <div id="${modalId}" class="modal">
            <div class="modal-content modal-preview shift-details-modal">
                <div class="modal-header">
                    <h3>Накладные за смену ${escapeHtml(shift.sellerName || 'Без имени')}</h3>
                    <span class="close" onclick="closeModal('${modalId}')">&times;</span>
                </div>
                <div class="modal-body" style="max-height: 72vh; overflow-y: auto;">
                    <div class="shift-details-header">
                        <div class="shift-details-period">
                            <strong>Смена:</strong>
                            <span>${formatShortDateTime(shift.openedAt)}${shift.closedAt ? ` → ${formatShortDateTime(shift.closedAt)}` : ''}</span>
                        </div>
                        <div class="shift-details-period">
                            <strong>Статус:</strong>
                            <span>${shift.status === 'closed' ? 'Закрыта' : 'Открыта'}</span>
                        </div>
                    </div>

                    <div class="shift-summary shift-details-summary">
                        <div class="shift-metric">
                            <span class="control-label">Наличными принято</span>
                            <strong>${formatCurrency(shiftSummary.grossCashReceived)}</strong>
                        </div>
                        <div class="shift-metric">
                            <span class="control-label">Продаж наличными</span>
                            <strong>${formatCurrency(shiftSummary.netCashSales)}</strong>
                        </div>
                        <div class="shift-metric">
                            <span class="control-label">Продаж в долг</span>
                            <strong>${formatCurrency(shiftSummary.debtSales)}</strong>
                        </div>
                        <div class="shift-metric">
                            <span class="control-label">Сдача выдана</span>
                            <strong>${formatCurrency(shiftSummary.totalChange)}</strong>
                        </div>
                        <div class="shift-metric ${shiftSummary.difference < 0 ? 'danger' : shiftSummary.difference > 0 ? 'warning' : ''}">
                            <span class="control-label">Должно быть в кассе</span>
                            <strong>${formatCurrency(shiftSummary.expectedCash)}</strong>
                            ${shiftSummary.actualCash != null ? `<small>Факт: ${formatCurrency(shiftSummary.actualCash)} | ${getShiftDifferenceText(shiftSummary.difference)}</small>` : ''}
                        </div>
                        <div class="shift-metric">
                            <span class="control-label">Накладных за смену</span>
                            <strong>${shiftInvoices.length}</strong>
                        </div>
                    </div>

                    <div class="shift-invoices-block">
                        <div class="shift-invoices-header">
                            <h4>Накладные этой смены</h4>
                            <span>${shiftInvoices.length} шт.</span>
                        </div>
                        ${shiftInvoices.length ? `
                            <div class="table-responsive">
                                <table class="invoice-items-table shift-invoices-table">
                                    <thead>
                                        <tr>
                                            <th>№</th>
                                            <th>Дата</th>
                                            <th>Клиент</th>
                                            <th>Оплата</th>
                                            <th>Сумма</th>
                                            <th>Наличные / сдача</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${shiftInvoices.map(invoice => `
                                            <tr>
                                                <td>№${getInvoiceNumber(invoice.id)}</td>
                                                <td>${formatShortDateTime(invoice.date)}</td>
                                                <td>${escapeHtml(getDisplayClientName(invoice.client))}</td>
                                                <td>${invoice.paymentType === 'cash' ? 'Наличные' : 'В долг'}</td>
                                                <td>${formatCurrency(invoice.total)}</td>
                                                <td>
                                                    ${invoice.paymentType === 'cash'
                                                        ? `Получено: ${formatCurrency(Number(invoice.changeInfo?.receivedAmount) || Number(invoice.total) || 0)}<br><small>Сдача: ${formatCurrency(Number(invoice.changeInfo?.changeAmount) || 0)}</small>`
                                                        : `<span class="shift-invoice-debt-note">В долг на ${formatCurrency(invoice.total)}</span>`}
                                                </td>
                                                <td>
                                                    <button class="btn btn-secondary btn-sm" onclick="previewInvoice('${invoice.id}')" title="Предпросмотр накладной">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div class="timeline-item">За эту смену накладных не найдено</div>
                        `}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('${modalId}')">Закрыть</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    openModal(modalId);
}

function renderShiftHistoryItem(shift) {
    const shiftSummaryData = getShiftDisplaySummary(shift);
    const shiftSoupSnapshot = getSoupInventoryControlSnapshot(shift.inventoryCheck?.dateKey || getShiftHistoryDateKey(shift) || getTodayDateKey());
    const shiftSoupCheck = shift.inventoryCheck
        ? getInventoryCheckSoupSummary(shift.inventoryCheck, shiftSoupSnapshot)
        : null;
    const difference = Number(shiftSummaryData.difference) || 0;
    const statusClass = shift.status === 'open'
        ? 'status-chip-success'
        : Math.abs(difference) < 0.01
            ? 'status-chip-info'
            : 'status-chip-danger';

    return `
        <div class="timeline-item shift-history-item">
            <div class="shift-history-item-head">
                <div>
                    <strong>${escapeHtml(shift.sellerName || 'Без имени')}</strong>
                    <small>${formatShortDateTime(shift.openedAt)}${shift.closedAt ? ` → ${formatShortDateTime(shift.closedAt)}` : ''}</small>
                </div>
                <span class="status-chip ${statusClass}">${shift.status === 'open' ? 'Открыта' : Math.abs(difference) < 0.01 ? 'Сошлась' : getShiftDifferenceText(difference)}</span>
            </div>
            <div class="shift-history-stats">
                <div>
                    <span>Наличными</span>
                    <strong>${formatCurrency(shiftSummaryData.grossCashReceived || 0)}</strong>
                </div>
                <div>
                    <span>Долги наличными</span>
                    <strong>${formatCurrency(shiftSummaryData.cashDebtPayments || 0)}</strong>
                </div>
                <div>
                    <span>В долг</span>
                    <strong>${formatCurrency(shiftSummaryData.debtSales || 0)}</strong>
                </div>
                <div>
                    <span>Накладных</span>
                    <strong>${shiftSummaryData.invoiceCount || 0}</strong>
                </div>
            </div>
            <div class="timeline-note">
                Касса должна быть: ${formatCurrency(shiftSummaryData.expectedCash || getConfiguredShiftStartCash())}
                ${shift.status === 'closed' ? ` | Факт: ${formatCurrency(shiftSummaryData.actualCash || 0)} | ${getShiftDifferenceText(difference)}` : ''}
            </div>
            ${shift.status === 'closed' ? `
            <div class="timeline-note">
                Оставлено в кассе: ${formatCurrency(shift.cashLeftInRegister ?? shift.cashToLeaveTarget ?? 0)} | Передано ${getMoneyWalletLabel(shift.cashTransferToWallet || DEFAULT_MONEY_WALLET_ID)}: ${formatCurrency(shift.cashTransferAmount || 0)}
            </div>
            ` : ''}
            ${shift.closeNote ? `<div class="timeline-note">Комментарий: ${escapeHtml(shift.closeNote)}</div>` : ''}
            ${shift.inventoryCheck ? `
            <div class="timeline-note">
                Склад: табак факт ${formatQuantity(shift.inventoryCheck.fact?.tobacco || 0, 'шт')} / должно ${formatQuantity(shift.inventoryCheck.expected?.tobacco || 0, 'шт')} (${formatInventoryDifference(shift.inventoryCheck.difference?.tobacco || 0)}) | жарка факт ${formatQuantity(shift.inventoryCheck.fact?.roast || 0, 'шт')} / должно ${formatQuantity(shift.inventoryCheck.expected?.roast || 0, 'шт')} (${formatInventoryDifference(shift.inventoryCheck.difference?.roast || 0)}) | суп факт ${formatQuantity(shiftSoupCheck?.fact || 0, 'шт')} / должно ${formatQuantity(shiftSoupCheck?.expected || 0, 'шт')} (${formatInventoryDifferenceForUnit(shiftSoupCheck?.difference || 0, 'шт')})
            </div>
            ` : ''}
            ${shift.status === 'closed' ? `
                <div class="timeline-actions">
                    ${!isSellerMode() ? `
                    <button class="btn btn-secondary btn-sm" onclick="showShiftInvoices('${shift.id}')">
                        <i class="fas fa-receipt"></i> Накладные смены
                    </button>
                    ` : ''}
                    <button class="btn btn-success btn-sm" onclick="exportShiftData('${shift.id}')">
                        <i class="fas fa-file-export"></i> Экспорт
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function renderShiftHistory() {
    const recentShiftsList = document.getElementById('recent-shifts-list');
    const countLabel = document.getElementById('shift-history-count');
    const pagination = document.getElementById('shift-history-pagination');

    if (!recentShiftsList) return;

    const filters = getShiftHistoryFiltersFromDom();
    const pageData = getShiftHistoryPageData(shiftSessions, filters, shiftHistoryPage);
    shiftHistoryPage = pageData.page;

    if (countLabel) {
        const shownText = pageData.total
            ? `${pageData.startIndex + 1}-${pageData.endIndex} из ${pageData.total}`
            : '0 смен';
        countLabel.textContent = `${shownText} • всего ${shiftSessions.length}`;
    }

    recentShiftsList.innerHTML = pageData.items.length
        ? pageData.items.map(shift => renderShiftHistoryItem(shift)).join('')
        : '<div class="timeline-item">Под выбранные фильтры смен не найдено</div>';

    if (!pagination) return;

    if (filters.pageSize === 'all' || pageData.totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    pagination.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="changeShiftHistoryPage(-1)" ${pageData.page <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Назад
        </button>
        <span>Страница ${pageData.page} из ${pageData.totalPages}</span>
        <button class="btn btn-secondary btn-sm" onclick="changeShiftHistoryPage(1)" ${pageData.page >= pageData.totalPages ? 'disabled' : ''}>
            Вперед <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

function renderControlCenter() {
    if (!isAuthenticatedUser()) {
        renderAuthState();
        return;
    }

    const roleLabel = document.getElementById('current-role-label');
    const pinStatus = document.getElementById('manager-pin-status');
    const cloudBadge = document.getElementById('cloud-sync-badge');
    const cloudStatusLabel = document.getElementById('cloud-sync-status-label');
    const cloudStatusDetail = document.getElementById('cloud-sync-status-detail');
    const shiftChip = document.getElementById('shift-status-chip');
    const shiftSummary = document.getElementById('shift-summary');
    const openForm = document.getElementById('shift-open-form');
    const closeForm = document.getElementById('shift-close-form');
    const recentShiftsList = document.getElementById('recent-shifts-list');
    const activityPreview = document.getElementById('activity-log-preview');
    const auditCard = document.getElementById('manager-audit-card');

    if (!roleLabel || !pinStatus || !cloudBadge || !shiftChip || !shiftSummary || !openForm || !closeForm || !recentShiftsList || !activityPreview) {
        return;
    }

    roleLabel.textContent = getCurrentRole() === 'seller' ? 'Продавец' : 'Руководитель';
    roleLabel.className = isSellerMode() ? 'seller-highlight' : '';
    pinStatus.textContent = `Рук.: ${hasManagerPin() ? 'задан' : 'не задан'} • Продавец: ${securitySettings.sellerPinHash ? 'задан' : 'не задан'}`;
    const cloudSafetyStatus = getCloudSafetyStatus();

    if (!navigator.onLine) {
        cloudBadge.textContent = 'Нет сети';
        cloudBadge.className = 'status-chip status-chip-warning';
    } else if (cloudSyncState.syncing) {
        cloudBadge.textContent = 'Синхронизация...';
        cloudBadge.className = 'status-chip status-chip-info';
    } else if (cloudSyncState.initializing || cloudSyncState.pulling) {
        cloudBadge.textContent = 'Подключаю облако...';
        cloudBadge.className = 'status-chip status-chip-info';
    } else if (cloudSyncState.ready) {
        cloudBadge.textContent = 'Облако активно';
        cloudBadge.className = 'status-chip status-chip-success';
    } else if (getCloudSyncConfig().enabled) {
        cloudBadge.textContent = cloudSyncState.lastError ? 'Ошибка облака' : 'Облако настроено';
        cloudBadge.className = `status-chip ${cloudSyncState.lastError ? 'status-chip-danger' : 'status-chip-warning'}`;
    } else {
        cloudBadge.textContent = 'Локально';
        cloudBadge.className = 'status-chip status-chip-muted';
    }
    if (cloudStatusLabel && cloudStatusDetail) {
        const meta = getCloudSyncMeta();
        cloudStatusLabel.textContent = cloudSafetyStatus.title;
        cloudStatusLabel.className = `cloud-status-strong cloud-status-${cloudSafetyStatus.level}`;
        cloudStatusDetail.textContent = `${cloudSafetyStatus.detail} Последняя отправка: ${formatCloudSyncTime(meta.lastSuccessfulPushAt)}. Последнее чтение: ${formatCloudSyncTime(meta.lastSuccessfulPullAt)}.`;
    }
    renderCloudPresenceSummary();
    renderCloudSafetyBanner();

    const currentShift = getCurrentShift();
    const shiftToShow = currentShift || getRecentShifts(1)[0] || null;
    const summary = getShiftDisplaySummary(shiftToShow);
    const inventoryReport = calculateInventoryControlReport(getTodayDateKey());
    const shiftInventoryCheck = shiftToShow?.inventoryCheck || getLastInventoryCheckForDate(getTodayDateKey());
    const soupInventorySnapshot = getSoupInventoryControlSnapshot(getTodayDateKey());
    const soupInventoryCheckSummary = shiftInventoryCheck
        ? getInventoryCheckSoupSummary(shiftInventoryCheck, soupInventorySnapshot)
        : null;
    updateShiftStartCashDisplay();

    if (currentShift) {
        shiftChip.textContent = `Смена открыта: ${currentShift.sellerName}`;
        shiftChip.className = 'status-chip status-chip-success';
    } else if (shiftToShow?.status === 'closed') {
        const difference = Number(shiftToShow.summary?.difference || 0);
        shiftChip.textContent = difference === 0 ? 'Последняя смена закрыта без расхождений' : getShiftDifferenceText(difference);
        shiftChip.className = `status-chip ${difference === 0 ? 'status-chip-info' : 'status-chip-danger'}`;
    } else {
        shiftChip.textContent = 'Смена не открыта';
        shiftChip.className = 'status-chip status-chip-muted';
    }

    openForm.style.display = currentShift ? 'none' : 'grid';
    closeForm.style.display = currentShift ? 'grid' : 'none';

    const shiftSellerInput = document.getElementById('shift-seller-name');
    const shiftCashToLeaveInput = document.getElementById('shift-cash-to-leave');
    const openShiftBtn = document.getElementById('openShiftBtn');
    const closeShiftBtn = document.getElementById('closeShiftBtn');

    if (shiftSellerInput && getCurrentRole() === 'seller') {
        shiftSellerInput.value = sessionAccess.userName || '';
        shiftSellerInput.readOnly = true;
    }

    if (openShiftBtn) {
        openShiftBtn.style.display = currentShift ? 'none' : 'inline-flex';
    }

    if (closeShiftBtn) {
        closeShiftBtn.style.display = currentShift ? 'inline-flex' : 'none';
    }

    if (shiftCashToLeaveInput && currentShift && !shiftCashToLeaveInput.value) {
        shiftCashToLeaveInput.value = currentShift.cashToLeaveTarget ?? getConfiguredShiftCashToLeave();
    }

    shiftSummary.innerHTML = `
        <div class="shift-metric">
            <span class="control-label">Старт кассы</span>
            <strong>${formatCurrency(summary.startCash)}</strong>
        </div>
        <div class="shift-metric">
            <span class="control-label">Наличными получено</span>
            <strong>${formatCurrency(summary.grossCashReceived)}</strong>
        </div>
        <div class="shift-metric">
            <span class="control-label">Сдача выдана</span>
            <strong>${formatCurrency(summary.totalChange)}</strong>
        </div>
        <div class="shift-metric">
            <span class="control-label">Продаж наличными</span>
            <strong>${formatCurrency(summary.netCashSales)}</strong>
        </div>
        <div class="shift-metric">
            <span class="control-label">Долги наличными</span>
            <strong>${formatCurrency(summary.cashDebtPayments || 0)}</strong>
        </div>
        <div class="shift-metric">
            <span class="control-label">Продаж в долг</span>
            <strong>${formatCurrency(summary.debtSales)}</strong>
        </div>
        <div class="shift-metric ${summary.difference < 0 ? 'danger' : summary.difference > 0 ? 'warning' : ''}">
            <span class="control-label">Должно быть в кассе</span>
            <strong>${formatCurrency(summary.expectedCash)}</strong>
            ${summary.actualCash != null ? `<small>Факт: ${formatCurrency(summary.actualCash)} | ${getShiftDifferenceText(summary.difference)}</small>` : ''}
        </div>
        <div class="shift-metric">
            <span class="control-label">Накладных за смену</span>
            <strong>${summary.invoiceCount}</strong>
            ${summary.missingChangeInfoCount > 0 ? `<small>Без данных по сдаче: ${summary.missingChangeInfoCount}</small>` : ''}
        </div>
        <div class="shift-metric">
            <span class="control-label">Оставить в кассе</span>
            <strong>${formatCurrency(shiftToShow?.cashToLeaveTarget ?? getConfiguredShiftCashToLeave())}</strong>
            ${shiftToShow?.status === 'closed' ? `<small>Передано ${getMoneyWalletLabel(shiftToShow.cashTransferToWallet || DEFAULT_MONEY_WALLET_ID)}: ${formatCurrency(shiftToShow.cashTransferAmount || 0)}</small>` : ''}
        </div>
        <div class="shift-metric ${shiftInventoryCheck && shiftInventoryCheck.difference?.tobacco !== 0 ? 'warning' : ''}">
            <span class="control-label">Склад табак</span>
            <strong>${formatQuantity((shiftInventoryCheck?.expected?.tobacco ?? inventoryReport.expected.tobacco), 'шт')} шт</strong>
            ${shiftInventoryCheck ? `<small>Факт: ${formatQuantity(shiftInventoryCheck.fact?.tobacco || 0, 'шт')} шт | ${formatInventoryDifference(shiftInventoryCheck.difference?.tobacco || 0)}</small>` : '<small>Должно быть к закрытию смены</small>'}
        </div>
        <div class="shift-metric ${shiftInventoryCheck && shiftInventoryCheck.difference?.roast !== 0 ? 'warning' : ''}">
            <span class="control-label">Склад жарка</span>
            <strong>${formatQuantity((shiftInventoryCheck?.expected?.roast ?? inventoryReport.expected.roast), 'шт')} шт</strong>
            ${shiftInventoryCheck ? `<small>Факт: ${formatQuantity(shiftInventoryCheck.fact?.roast || 0, 'шт')} шт | ${formatInventoryDifference(shiftInventoryCheck.difference?.roast || 0)}</small>` : '<small>Должно быть к закрытию смены</small>'}
        </div>
        <div class="shift-metric ${soupInventoryCheckSummary && soupInventoryCheckSummary.difference !== 0 ? 'warning' : ''}">
            <span class="control-label">Склад суп</span>
            <strong>${formatQuantity(soupInventoryCheckSummary?.expected ?? soupInventorySnapshot.expectedPieces, 'шт')} шт</strong>
            ${soupInventoryCheckSummary ? `<small>Факт: ${formatQuantity(soupInventoryCheckSummary.fact || 0, 'шт')} шт | ${formatInventoryDifferenceForUnit(soupInventoryCheckSummary.difference || 0, 'шт')}</small>` : `<small>Должно быть к закрытию смены • ${formatQuantity(soupInventorySnapshot.expected || 0, soupInventorySnapshot.unit)} ${soupInventorySnapshot.unit}</small>`}
        </div>
    `;

    renderShiftHistory();

    renderActivityLogTable();

    if (auditCard) {
        auditCard.style.display = isSellerMode() ? 'none' : '';
    }

    renderAuthState();
}

function canSellerDirectlyMutateInvoice(invoice) {
    if (!invoice) return false;

    const currentShift = getCurrentShift();
    if (!currentShift || !invoice.date) {
        return false;
    }

    const invoiceDate = new Date(invoice.date);
    const ageMinutes = (Date.now() - invoiceDate.getTime()) / (1000 * 60);
    const sameShift = invoice.shiftId && invoice.shiftId === currentShift.id;

    return sameShift && ageMinutes <= SELLER_EDIT_WINDOW_MINUTES;
}

function requestInvoiceMutationPermission(invoice, action, skipReasonPrompt = false) {
    if (!invoice) {
        return { allowed: false, reason: '' };
    }

    const actionLabel = action === 'delete' ? 'удаление' : 'редактирование';

    if (!isSellerMode()) {
        return { allowed: true, reason: '' };
    }

    if (canSellerDirectlyMutateInvoice(invoice)) {
        if (skipReasonPrompt) {
            return { allowed: true, reason: '' };
        }

        const reason = prompt(`Укажите причину ${actionLabel} накладной`);
        if (!reason || !reason.trim()) {
            alert('Нужно обязательно указать причину');
            return { allowed: false, reason: '' };
        }

        return { allowed: true, reason: reason.trim() };
    }

    if (!requireManagerApproval(`${actionLabel} старой накладной`)) {
        return { allowed: false, reason: '' };
    }

    if (skipReasonPrompt) {
        return { allowed: true, reason: 'Подтверждено PIN руководителя' };
    }

    const reason = prompt(`Укажите причину ${actionLabel} накладной после подтверждения руководителя`);
    if (!reason || !reason.trim()) {
        alert('Нужно обязательно указать причину');
        return { allowed: false, reason: '' };
    }

    return { allowed: true, reason: reason.trim() };
}

function applyInvoiceActionAccess() {
    document.querySelectorAll('.invoice-card').forEach(card => {
        const invoiceId = card.getAttribute('data-invoice-id');
        const invoice = invoices.find(item => item.id === invoiceId);
        const editButton = card.querySelector('button[onclick*="showEditInvoiceModal"]');
        const deleteButton = card.querySelector('button[onclick*="deleteInvoice"]');
        const directChangeAllowed = canSellerDirectlyMutateInvoice(invoice);

        if (editButton && isSellerMode() && !directChangeAllowed) {
            editButton.title = 'Редактирование этой накладной потребует PIN руководителя';
        }

        if (deleteButton && isSellerMode() && !directChangeAllowed) {
            deleteButton.title = 'Удаление этой накладной потребует PIN руководителя';
        }
    });
}

function normalizeSupabaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeSupabaseSyncConfig(config = {}) {
    return {
        url: normalizeSupabaseUrl(config.url || DEFAULT_SUPABASE_PROJECT_URL),
        publishableKey: String(config.publishableKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim(),
        tableName: String(config.tableName || DEFAULT_SUPABASE_SYNC_TABLE).trim() || DEFAULT_SUPABASE_SYNC_TABLE,
        workspaceId: String(config.workspaceId || 'main').trim() || 'main',
        syncKey: String(config.syncKey || '').trim(),
        syncKeyHash: String(config.syncKeyHash || '').trim()
    };
}

function generateCloudSyncKey() {
    const bytes = new Uint8Array(24);
    if (window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function sha256Hex(value) {
    if (!window.crypto?.subtle || typeof TextEncoder === 'undefined') {
        return '';
    }

    const buffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function ensureSupabaseSyncKeyHash(supabaseConfig) {
    const config = normalizeSupabaseSyncConfig(supabaseConfig);
    if (config.syncKeyHash) return config.syncKeyHash;
    if (!config.syncKey) return '';
    return sha256Hex(config.syncKey);
}

function stopCloudSyncPolling() {
    if (cloudSyncState.pollTimer) {
        clearInterval(cloudSyncState.pollTimer);
        cloudSyncState.pollTimer = null;
    }
}

function startCloudSyncPolling() {
    stopCloudSyncPolling();
    cloudSyncState.pollTimer = setInterval(() => {
        pullCloudStateNow({ silent: true, skipIfBusy: true });
    }, CLOUD_SYNC_POLL_INTERVAL_MS);
}

function getCloudDeviceId() {
    let deviceId = localStorage.getItem(CLOUD_DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = `device-${generateId()}`;
        localStorage.setItem(CLOUD_DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

function getCloudPresenceRecord(status = 'online') {
    const now = new Date().toISOString();
    return {
        deviceId: getCloudDeviceId(),
        actor: getActorLabel(),
        role: getCurrentRole(),
        status,
        lastSeenAt: now,
        lastSyncAt: getCloudSyncMeta().lastSuccessfulSyncAt || '',
        hasPendingChanges: hasPendingCloudChanges(),
        userAgent: navigator.userAgent || ''
    };
}

function mergeCloudPresence(existing = {}, record = getCloudPresenceRecord()) {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const nextPresence = Object.entries(existing || {}).reduce((acc, [deviceId, item]) => {
        const seenTime = new Date(item?.lastSeenAt || 0).getTime();
        if (Number.isFinite(seenTime) && seenTime >= cutoff) {
            acc[deviceId] = item;
        }
        return acc;
    }, {});

    nextPresence[record.deviceId] = record;
    return nextPresence;
}

function saveCloudPresenceLocally(presence = cloudPresence) {
    cloudPresence = presence && typeof presence === 'object' ? presence : {};
    localStorage.setItem('cloudPresence', JSON.stringify(cloudPresence));
}

function getCloudPresenceList() {
    return Object.values(cloudPresence || {})
        .filter(item => item && item.deviceId)
        .sort((left, right) => String(right.lastSeenAt || '').localeCompare(String(left.lastSeenAt || '')));
}

function isPresenceOnline(record) {
    const lastSeen = new Date(record?.lastSeenAt || 0).getTime();
    return record?.status === 'online'
        && Number.isFinite(lastSeen)
        && (Date.now() - lastSeen) <= CLOUD_PRESENCE_ONLINE_TTL_MS;
}

function renderCloudPresenceSummary() {
    const countEl = document.getElementById('cloud-online-count');
    const listEl = document.getElementById('cloud-online-list');
    if (!countEl || !listEl) return;

    const list = getCloudPresenceList();
    const onlineList = list.filter(isPresenceOnline);
    countEl.textContent = onlineList.length ? `${onlineList.length} онлайн` : 'Нет онлайн';
    countEl.className = onlineList.length ? 'cloud-online-strong' : 'cloud-offline-strong';
    listEl.innerHTML = list.length
        ? list.slice(0, 5).map(item => {
            const online = isPresenceOnline(item);
            const role = item.role === 'seller' ? 'продавец' : 'руководитель';
            const pending = item.hasPendingChanges ? ' • ждет отправки' : '';
            return `<span class="cloud-presence-row ${online ? 'online' : 'offline'}">${escapeHtml(item.actor || 'Пользователь')} (${role}) - ${online ? 'онлайн' : formatCloudSyncTime(item.lastSeenAt)}${pending}</span>`;
        }).join('')
        : '<span class="cloud-presence-row offline">Пока нет данных по устройствам</span>';
}

async function pushCloudPresenceNow(status = 'online') {
    const config = getCloudSyncConfig();
    if (!hasValidCloudConfig(config) || (config.provider || 'supabase') !== 'supabase' || cloudSyncState.presenceSyncing) {
        return;
    }

    const supabaseConfig = normalizeSupabaseSyncConfig(config.supabase);
    if (!cloudSyncState.client) {
        await initializeSupabaseSync(config);
    }
    if (!cloudSyncState.client) return;

    try {
        cloudSyncState.presenceSyncing = true;
        const remote = await cloudSyncState.client.selectState(supabaseConfig.workspaceId);
        const remotePayload = remote?.payload || {};
        const presence = mergeCloudPresence(remotePayload.cloudPresence || cloudPresence, getCloudPresenceRecord(status));
        const now = new Date().toISOString();
        const payload = {
            ...remotePayload,
            cloudPresence: presence,
            dataUpdatedAt: remotePayload.dataUpdatedAt || remotePayload.updatedAt || now,
            updatedAt: now
        };
        const syncKeyHash = await ensureSupabaseSyncKeyHash(supabaseConfig);
        await cloudSyncState.client.upsertState({
            workspace_id: supabaseConfig.workspaceId,
            sync_key_hash: syncKeyHash,
            payload,
            payload_updated_at: payload.updatedAt,
            client_id: getActorLabel(),
            updated_at: now
        });
        saveCloudPresenceLocally(presence);
        renderCloudPresenceSummary();
    } catch (error) {
        cloudSyncState.lastError = normalizeCloudError(error, 'Ошибка статуса онлайн');
        markCloudSyncFailure(error, 'Ошибка статуса онлайн');
    } finally {
        cloudSyncState.presenceSyncing = false;
        renderControlCenter();
    }
}

function stopCloudPresenceHeartbeat() {
    if (cloudSyncState.presenceTimer) {
        clearInterval(cloudSyncState.presenceTimer);
        cloudSyncState.presenceTimer = null;
    }
}

function startCloudPresenceHeartbeat() {
    stopCloudPresenceHeartbeat();
    if (!hasValidCloudConfig(getCloudSyncConfig())) return;
    pushCloudPresenceNow();
    cloudSyncState.presenceTimer = setInterval(() => {
        pushCloudPresenceNow();
    }, CLOUD_PRESENCE_INTERVAL_MS);
}

function normalizeCloudError(error, fallback = 'Ошибка облака') {
    const message = String(error?.message || error || '').trim();
    if (/load failed|failed to fetch|networkerror|network request failed/i.test(message)) {
        return 'Не удалось соединиться с Supabase. Проверь интернет на телефоне и обнови страницу. Технически: Load failed';
    }
    return message || fallback;
}

async function parseSupabaseRpcResponse(response) {
    if (!response.ok) {
        throw new Error(await response.text() || `Supabase HTTP ${response.status}`);
    }

    const rows = await response.json();
    return Array.isArray(rows) ? (rows[0] || null) : rows;
}

function createSupabaseDataClient(config) {
    const headers = {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`
    };
    const rpcEndpoint = `${config.url}/rest/v1/rpc`;

    const fetchClient = {
        async selectState(workspaceId) {
            if (typeof window.fetch !== 'function') {
                throw new Error('fetch недоступен на этом устройстве');
            }

            const response = await window.fetch(`${rpcEndpoint}/warehouse_sync_pull`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-store',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_workspace_id: workspaceId,
                    p_sync_key: config.syncKey
                })
            });
            return parseSupabaseRpcResponse(response);
        },
        async upsertState(row) {
            if (typeof window.fetch !== 'function') {
                throw new Error('fetch недоступен на этом устройстве');
            }

            const response = await window.fetch(`${rpcEndpoint}/warehouse_sync_push`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-store',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_workspace_id: row.workspace_id,
                    p_sync_key: config.syncKey,
                    p_payload: row.payload || {},
                    p_client_id: row.client_id || null
                })
            });
            return parseSupabaseRpcResponse(response);
        }
    };

    if (window.supabase?.createClient) {
        const client = window.supabase.createClient(
            config.url,
            config.publishableKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        return {
            async selectState(workspaceId) {
                try {
                    const { data, error } = await client.rpc('warehouse_sync_pull', {
                        p_workspace_id: workspaceId,
                        p_sync_key: config.syncKey
                    });
                    if (error) throw error;
                    return Array.isArray(data) ? (data[0] || null) : data;
                } catch (error) {
                    return fetchClient.selectState(workspaceId);
                }
            },
            async upsertState(row) {
                try {
                    const { data, error } = await client.rpc('warehouse_sync_push', {
                        p_workspace_id: row.workspace_id,
                        p_sync_key: config.syncKey,
                        p_payload: row.payload || {},
                        p_client_id: row.client_id || null
                    });
                    if (error) throw error;
                    return Array.isArray(data) ? (data[0] || null) : data;
                } catch (error) {
                    return fetchClient.upsertState(row);
                }
            }
        };
    }

    return fetchClient;
}

async function configureCloudSync() {
    if (isSellerMode() && !requireManagerApproval('настройка облачной синхронизации')) {
        return;
    }

    const currentConfig = getCloudSyncConfig();
    const currentSupabase = normalizeSupabaseSyncConfig(currentConfig.supabase);
    const url = prompt('Supabase URL', currentSupabase.url || DEFAULT_SUPABASE_PROJECT_URL);
    if (url === null) return;
    const publishableKey = prompt('Supabase publishable key', currentSupabase.publishableKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY);
    if (publishableKey === null) return;
    const workspaceId = prompt('Название общей базы/точки синхронизации', currentSupabase.workspaceId || 'main');
    if (workspaceId === null) return;
    const syncKey = prompt('Секретный ключ синхронизации. На телефоне должен быть точно такой же.', currentSupabase.syncKey || generateCloudSyncKey());
    if (syncKey === null) return;

    const normalizedSupabase = normalizeSupabaseSyncConfig({
        ...currentSupabase,
        url,
        publishableKey,
        workspaceId,
        syncKey,
        syncKeyHash: ''
    });
    normalizedSupabase.syncKeyHash = await ensureSupabaseSyncKeyHash(normalizedSupabase);
    if (!normalizedSupabase.syncKeyHash) {
        alert('Не удалось подготовить защитный ключ. Откройте приложение через localhost или HTTPS и попробуйте еще раз.');
        return;
    }

    const enableSync = confirm('Включить Supabase-синхронизацию? Текущие данные будут отправлены в облако, если там еще пусто.');
    saveCloudSyncConfig({
        ...currentConfig,
        enabled: enableSync,
        provider: 'supabase',
        supabase: normalizedSupabase
    });

    await initializeCloudSync(true);
    if (enableSync && cloudSyncState.ready) {
        await pushCloudStateNow();
    }
    alert(enableSync ? 'Supabase-синхронизация включена' : 'Настройки сохранены, синхронизация выключена');
}

function hasValidCloudConfig(config) {
    if (!config?.enabled) return false;
    if ((config.provider || 'supabase') === 'supabase') {
        const supabaseConfig = normalizeSupabaseSyncConfig(config.supabase);
        return Boolean(
            supabaseConfig.url &&
            supabaseConfig.publishableKey &&
            supabaseConfig.workspaceId &&
            supabaseConfig.syncKey
        );
    }

    return Boolean(
        config.firebaseConfig?.apiKey &&
        config.firebaseConfig?.projectId &&
        config.firebaseConfig?.appId
    );
}

async function initializeCloudSync(forceReinitialize = false) {
    const config = getCloudSyncConfig();
    cloudSyncState.initializing = hasValidCloudConfig(config);

    if (cloudSyncState.unsubscribe && forceReinitialize) {
        cloudSyncState.unsubscribe();
        cloudSyncState.unsubscribe = null;
        cloudSyncState.ready = false;
    }
    if (forceReinitialize) {
        stopCloudSyncPolling();
        cloudSyncState.client = null;
        cloudSyncState.lastRemoteUpdatedAt = '';
    }

    if (!hasValidCloudConfig(config)) {
        cloudSyncState.ready = false;
        cloudSyncState.initializing = false;
        cloudSyncState.lastError = '';
        stopCloudSyncPolling();
        renderControlCenter();
        return;
    }

    if ((config.provider || 'supabase') === 'supabase') {
        await initializeSupabaseSync(config);
        return;
    }

    if (typeof firebase === 'undefined') {
        cloudSyncState.ready = false;
        cloudSyncState.initializing = false;
        cloudSyncState.lastError = 'Firebase SDK не загружен';
        renderControlCenter();
        return;
    }

    try {
        const appName = 'warehouseCloudApp';
        let app = firebase.apps.find(item => item.name === appName);
        if (!app) {
            app = firebase.initializeApp(config.firebaseConfig, appName);
        }

        cloudSyncState.db = app.firestore();
        cloudSyncState.docRef = cloudSyncState.db.collection(config.collectionName).doc(config.documentId);

        const snapshot = await cloudSyncState.docRef.get();
        if (snapshot.exists) {
            applyCloudPayload(snapshot.data());
        } else {
            await cloudSyncState.docRef.set(collectCloudPayload(), { merge: true });
        }

        if (!cloudSyncState.unsubscribe) {
            cloudSyncState.unsubscribe = cloudSyncState.docRef.onSnapshot((doc) => {
                if (!doc.exists) return;
                applyCloudPayload(doc.data());
            }, (error) => {
                cloudSyncState.lastError = error.message || 'Ошибка подписки Firestore';
                renderControlCenter();
            });
        }

        cloudSyncState.ready = true;
        cloudSyncState.lastError = '';
    } catch (error) {
        cloudSyncState.ready = false;
        cloudSyncState.lastError = normalizeCloudError(error, 'Ошибка подключения к Firestore');
    }

    cloudSyncState.initializing = false;
    renderControlCenter();
}

async function initializeSupabaseSync(config = getCloudSyncConfig()) {
    const supabaseConfig = normalizeSupabaseSyncConfig(config.supabase);

    try {
        const syncKeyHash = await ensureSupabaseSyncKeyHash(supabaseConfig);
        const normalizedConfig = { ...supabaseConfig, syncKeyHash };
        if (!syncKeyHash) {
            throw new Error('Не удалось подготовить sync-key');
        }

        cloudSyncState.client = createSupabaseDataClient(normalizedConfig);
        cloudSyncState.ready = true;
        cloudSyncState.lastError = '';
        saveCloudSyncConfig({
            ...config,
            provider: 'supabase',
            supabase: normalizedConfig
        });
        await pullCloudStateNow({ allowInitialPush: true, silent: true });
        startCloudSyncPolling();
        startCloudPresenceHeartbeat();
    } catch (error) {
        cloudSyncState.ready = false;
        cloudSyncState.lastError = normalizeCloudError(error, 'Ошибка подключения Supabase');
        stopCloudSyncPolling();
        stopCloudPresenceHeartbeat();
    } finally {
        cloudSyncState.initializing = false;
    }

    renderControlCenter();
}

function collectCloudPayload() {
    const state = getCurrentAppState();
    const now = new Date().toISOString();
    const meta = getCloudSyncMeta();
    const dataUpdatedAt = meta.lastLocalDataUpdatedAt || cloudSyncState.lastDataUpdatedAt || now;
    const presence = mergeCloudPresence(cloudPresence, getCloudPresenceRecord());
    LOCAL_ONLY_KEYS.forEach(key => delete state[key]);
    delete state.securitySettings;
    delete state.sessionAccess;
    delete state.cloudSyncConfig;

    return {
        ...state,
        cloudPresence: presence,
        dataUpdatedAt,
        updatedAt: now
    };
}

function persistCloudPayloadLocally(payload) {
    const mappings = {
        categories: 'categories',
        products: 'products',
        clients: 'clients',
        invoices: 'invoices',
        archivedInvoices: 'archivedInvoices',
        debts: 'debts',
        movements: 'movements',
        reports: 'reports',
        personalPrices: 'personalPrices',
        shiftSessions: 'shiftSessions',
        debtPayments: 'debtPayments',
        moneyTransactions: 'moneyTransactions',
        activityLog: 'activityLog',
        incomingReceipts: 'incomingReceipts',
        archivedIncomingReceipts: 'archivedIncomingReceipts',
        initialStockEntries: 'initialStockEntries',
        supplierReturns: 'supplierReturns',
        packageProductions: 'packageProductions',
        openedStockEvents: 'openedStockEvents',
        cashControlSettings: 'cashControlSettings'
    };

    Object.entries(mappings).forEach(([field, key]) => {
        if (payload[field] !== undefined) {
            schedulePersistentWrite(key, payload[field]);
        }
    });
}

function refreshInterfaceAfterDataChange() {
    updateStats();
    loadDashboardData();
    loadCategoriesToSelects();
    loadClientsToSelects();
    loadProductsToSelects();
    applyAccessControl();
    window.__suppressTabAccessAlert = true;
    renderTabContent(document.querySelector('.nav-item.active')?.getAttribute('data-tab') || getDefaultTabForCurrentRole());
    window.__suppressTabAccessAlert = false;
    renderControlCenter();
}

function applyCloudPayload(payload) {
    if (!payload || cloudSyncState.applyingRemote) return false;

    const payloadUpdatedAt = payload.updatedAt || '';
    const payloadDataUpdatedAt = payload.dataUpdatedAt || payload.updatedAt || '';
    if (payloadUpdatedAt && payloadUpdatedAt === cloudSyncState.lastAppliedRemoteUpdatedAt) {
        return false;
    }
    if (payload.cloudPresence) {
        saveCloudPresenceLocally(payload.cloudPresence);
        renderCloudPresenceSummary();
    }
    if (payloadDataUpdatedAt && payloadDataUpdatedAt === cloudSyncState.lastDataUpdatedAt) {
        cloudSyncState.lastAppliedRemoteUpdatedAt = payloadUpdatedAt || cloudSyncState.lastAppliedRemoteUpdatedAt;
        renderControlCenter();
        return false;
    }

    cloudSyncState.applyingRemote = true;
    try {
        categories = Array.isArray(payload.categories) ? payload.categories : categories;
        products = Array.isArray(payload.products) ? payload.products : products;
        clients = Array.isArray(payload.clients) ? payload.clients : clients;
        invoices = Array.isArray(payload.invoices) ? payload.invoices : invoices;
        archivedInvoices = Array.isArray(payload.archivedInvoices) ? payload.archivedInvoices.map(normalizeArchivedInvoice) : archivedInvoices;
        debts = Array.isArray(payload.debts) ? payload.debts : debts;
        movements = Array.isArray(payload.movements) ? payload.movements : movements;
        reports = Array.isArray(payload.reports) ? payload.reports : reports;
        personalPrices = Array.isArray(payload.personalPrices) ? payload.personalPrices : personalPrices;
        shiftSessions = Array.isArray(payload.shiftSessions) ? payload.shiftSessions : shiftSessions;
        debtPayments = Array.isArray(payload.debtPayments) ? payload.debtPayments : debtPayments;
        moneyTransactions = Array.isArray(payload.moneyTransactions) ? payload.moneyTransactions.map(normalizeMoneyTransaction) : moneyTransactions;
        activityLog = Array.isArray(payload.activityLog) ? payload.activityLog : activityLog;
        incomingReceipts = Array.isArray(payload.incomingReceipts) ? payload.incomingReceipts.map(normalizeIncomingReceipt) : incomingReceipts;
        archivedIncomingReceipts = Array.isArray(payload.archivedIncomingReceipts) ? payload.archivedIncomingReceipts.map(normalizeArchivedIncomingReceipt) : archivedIncomingReceipts;
        initialStockEntries = Array.isArray(payload.initialStockEntries) ? payload.initialStockEntries.map(normalizeInitialStockEntry) : initialStockEntries;
        supplierReturns = Array.isArray(payload.supplierReturns) ? payload.supplierReturns.map(normalizeSupplierReturn) : supplierReturns;
        packageProductions = Array.isArray(payload.packageProductions) ? payload.packageProductions.map(normalizePackageProduction) : packageProductions;
        openedStockEvents = Array.isArray(payload.openedStockEvents) ? payload.openedStockEvents.map(normalizeOpenedStockEvent) : openedStockEvents;
        rebuildPartialSaleOpenedStockEvents();
        EXTRA_STORAGE_FIELDS.forEach(key => {
            if (LOCAL_ONLY_KEYS.has(key)) return;
            if (payload[key] !== undefined) {
                restoreOptionalStorageField(payload, key);
            }
        });
        persistCloudPayloadLocally(payload);
        autoCloseStaleOpenShift();
        autoArchiveOldInvoices();
        syncIncomingProductsStock();
        cloudSyncState.lastAppliedRemoteUpdatedAt = payloadUpdatedAt || cloudSyncState.lastAppliedRemoteUpdatedAt;
        cloudSyncState.lastDataUpdatedAt = payloadDataUpdatedAt || cloudSyncState.lastDataUpdatedAt;
    } finally {
        cloudSyncState.applyingRemote = false;
    }

    try {
        refreshInterfaceAfterDataChange();
    } catch (error) {
        console.error('Ошибка обновления интерфейса после облака:', error);
        renderControlCenter();
    }

    return true;
}

function scheduleCloudSync() {
    if (cloudSyncState.applyingRemote) return;
    if (!hasValidCloudConfig(getCloudSyncConfig())) return;

    if (cloudSyncState.pendingTimer) {
        clearTimeout(cloudSyncState.pendingTimer);
    }

    cloudSyncState.pendingTimer = setTimeout(() => {
        pushCloudStateNow();
    }, CLOUD_SYNC_PUSH_DEBOUNCE_MS);
}

async function pushCloudStateNow() {
    const config = getCloudSyncConfig();
    if (!hasValidCloudConfig(config)) {
        return;
    }

    if ((config.provider || 'supabase') !== 'supabase') {
        if (!cloudSyncState.docRef) return;
        try {
            cloudSyncState.syncing = true;
            renderControlCenter();
            await cloudSyncState.docRef.set(collectCloudPayload(), { merge: true });
            cloudSyncState.lastError = '';
            clearCloudPendingChanges();
        } catch (error) {
            cloudSyncState.lastError = normalizeCloudError(error, 'Ошибка записи в облако');
            markCloudSyncFailure(error, 'Ошибка записи в облако');
        } finally {
            cloudSyncState.syncing = false;
            renderControlCenter();
        }
        return;
    }

    const supabaseConfig = normalizeSupabaseSyncConfig(config.supabase);
    if (!cloudSyncState.client) {
        await initializeSupabaseSync(config);
    }
    if (!cloudSyncState.client) return;

    try {
        cloudSyncState.syncing = true;
        renderControlCenter();
        const payload = collectCloudPayload();
        const payloadUpdatedAt = payload.updatedAt;
        const syncKeyHash = await ensureSupabaseSyncKeyHash(supabaseConfig);
        const data = await cloudSyncState.client.upsertState({
            workspace_id: supabaseConfig.workspaceId,
            sync_key_hash: syncKeyHash,
            payload,
            payload_updated_at: payloadUpdatedAt,
            client_id: getActorLabel(),
            updated_at: new Date().toISOString()
        });
        cloudSyncState.lastRemoteUpdatedAt = data?.payload_updated_at || payloadUpdatedAt;
        cloudSyncState.lastDataUpdatedAt = payload.dataUpdatedAt || payloadUpdatedAt;
        cloudSyncState.lastError = '';
        saveCloudPresenceLocally(payload.cloudPresence || cloudPresence);
        clearCloudPendingChanges();
    } catch (error) {
        cloudSyncState.lastError = normalizeCloudError(error, 'Ошибка записи в Supabase');
        markCloudSyncFailure(error, 'Ошибка записи в Supabase');
    } finally {
        cloudSyncState.syncing = false;
        renderControlCenter();
    }
}

async function pullCloudStateNow(options = {}) {
    const config = getCloudSyncConfig();
    if (!hasValidCloudConfig(config) || (config.provider || 'supabase') !== 'supabase') {
        return null;
    }
    if (cloudSyncState.pulling && options.skipIfBusy) {
        return null;
    }

    const supabaseConfig = normalizeSupabaseSyncConfig(config.supabase);
    if (!cloudSyncState.client) {
        await initializeSupabaseSync(config);
    }
    if (!cloudSyncState.client) return null;

    try {
        cloudSyncState.pulling = true;
        if (!options.silent) {
            cloudSyncState.syncing = true;
            renderControlCenter();
        }

        const data = await cloudSyncState.client.selectState(supabaseConfig.workspaceId);
        if (!data) {
            if (options.allowInitialPush) {
                await pushCloudStateNow();
            }
            return null;
        }

        const remoteUpdatedAt = data.payload_updated_at || data.payload?.updatedAt || '';
        if (remoteUpdatedAt && remoteUpdatedAt !== cloudSyncState.lastRemoteUpdatedAt) {
            const applied = applyCloudPayload(data.payload || {});
            if (applied || data.payload?.updatedAt === cloudSyncState.lastAppliedRemoteUpdatedAt) {
                cloudSyncState.lastRemoteUpdatedAt = remoteUpdatedAt;
            }
        }
        cloudSyncState.lastError = '';
        markCloudPullSuccess();
        if (hasPendingCloudChanges()) {
            scheduleCloudSync();
        }
        return data;
    } catch (error) {
        cloudSyncState.lastError = normalizeCloudError(error, 'Ошибка чтения Supabase');
        markCloudSyncFailure(error, 'Ошибка чтения Supabase');
        if (!options.silent) {
            renderControlCenter();
        }
        return null;
    } finally {
        if (!options.silent) {
            cloudSyncState.syncing = false;
            renderControlCenter();
        }
        cloudSyncState.pulling = false;
    }
}

async function syncCloudNow() {
    if (!hasValidCloudConfig(getCloudSyncConfig())) {
        alert('Сначала настройте облачную синхронизацию');
        return;
    }

    await initializeCloudSync(true);

    if ((getCloudSyncConfig().provider || 'supabase') === 'supabase') {
        await pullCloudStateNow();
        await pushCloudStateNow();
        alert(cloudSyncState.lastError ? `Ошибка синхронизации: ${cloudSyncState.lastError}` : 'Синхронизация Supabase выполнена');
        return;
    }

    await pushCloudStateNow();
}

let cloudSyncAutoRefreshInitialized = false;

function initializeCloudSyncAutoRefresh() {
    if (cloudSyncAutoRefreshInitialized) return;
    cloudSyncAutoRefreshInitialized = true;

    const pullIfReady = () => {
        if (!hasValidCloudConfig(getCloudSyncConfig())) return;
        pullCloudStateNow({ silent: true, skipIfBusy: true });
        if (hasPendingCloudChanges()) {
            scheduleCloudSync();
        }
        pushCloudPresenceNow();
    };

    window.addEventListener('focus', pullIfReady);
    window.addEventListener('online', pullIfReady);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            pullIfReady();
        }
    });
}

function buildCloudSyncSettingsExport() {
    const config = getCloudSyncConfig();
    return {
        exportType: 'warehouse-cloud-sync-settings',
        version: 1,
        exportedAt: new Date().toISOString(),
        cloudSyncConfig: {
            ...config,
            enabled: true,
            provider: 'supabase',
            firebaseConfig: DEFAULT_CLOUD_SYNC_CONFIG.firebaseConfig
        }
    };
}

function exportCloudSyncSettings() {
    const config = getCloudSyncConfig();
    if (!hasValidCloudConfig({ ...config, enabled: true, provider: 'supabase' })) {
        alert('Сначала настройте Supabase-синхронизацию');
        return;
    }

    downloadJsonFile(buildCloudSyncSettingsExport(), buildExportFileName('warehouse-phone-sync-settings'));
    alert('Файл настроек создан. Откройте приложение на телефоне и импортируйте этот файл в блоке "Телефон и облако".');
}

function importCloudSyncSettings(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const data = JSON.parse(event.target.result);
            const importedConfig = data.cloudSyncConfig || data;
            if ((importedConfig.provider || 'supabase') !== 'supabase' || !importedConfig.supabase) {
                throw new Error('Это не файл настроек Supabase для склада');
            }

            const supabaseConfig = normalizeSupabaseSyncConfig(importedConfig.supabase);
            if (!supabaseConfig.syncKeyHash) {
                supabaseConfig.syncKeyHash = await ensureSupabaseSyncKeyHash(supabaseConfig);
            }
            saveCloudSyncConfig({
                ...getCloudSyncConfig(),
                ...importedConfig,
                enabled: true,
                provider: 'supabase',
                supabase: supabaseConfig
            });
            await initializeCloudSync(true);
            alert('Настройки Supabase импортированы. Данные подтянутся из облака автоматически.');
        } catch (error) {
            alert(`Не удалось импортировать настройки: ${error.message}`);
        } finally {
            input.value = '';
        }
    };
    reader.readAsText(file);
}
