/**
 * SGD-P Web — Main Application (v2.0 Optimized)
 * SPA Router, API Client with Caching, and Module Handlers
 */

// ===================================================================
// CONFIGURATION — ¡CAMBIAR ESTA URL DESPUÉS DEL DEPLOY!
// ===================================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyOVwyulSMkr-07J84D-MqigyFVfnUAc2eIIEdKVP7jQZfbaGXWTBOHwXSi8CjMFVV4/exec';
const DRIVE_FOLDER_ID = '1SshRHJnn1cCaU-7xf6ssmCerzCGihQyx'; // OPCIONAL: ID de carpeta de Google Drive para guardar PDFs

// Ejemplo: 'https://script.google.com/macros/s/AKfycb.../exec'

// ===================================================================
// API CLIENT — With Caching for Performance
// ===================================================================
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this._cache = {};
        this._cacheExpiry = {};
        this.CACHE_TTL = 60000; // 60 seconds cache
    }

    getToken() { return localStorage.getItem('sgdp_token') || ''; }
    setToken(token) { localStorage.setItem('sgdp_token', token); }
    clearToken() { localStorage.removeItem('sgdp_token'); localStorage.removeItem('sgdp_user'); }
    getUser() { try { return JSON.parse(localStorage.getItem('sgdp_user') || '{}'); } catch { return {}; } }
    setUser(user) { localStorage.setItem('sgdp_user', JSON.stringify(user)); }

    invalidateCache(key) {
        if (key) { delete this._cache[key]; delete this._cacheExpiry[key]; }
        else { this._cache = {}; this._cacheExpiry = {}; }
    }

    async request(action, payload = {}, useCache = false) {
        // Check cache
        const cacheKey = action + JSON.stringify(payload);
        if (useCache && this._cache[cacheKey] && Date.now() < this._cacheExpiry[cacheKey]) {
            return this._cache[cacheKey];
        }

        try {
            const body = { action, payload, token: this.getToken() };
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(body)
            });

            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch { data = { success: false, message: 'Respuesta inválida del servidor.' }; }

            if (data.code === 401) {
                this.clearToken();
                App.showLogin();
                showToast('Sesión expirada. Inicia sesión nuevamente.', 'warning');
                return null;
            }

            // Store in cache
            if (useCache && data.success) {
                this._cache[cacheKey] = data;
                this._cacheExpiry[cacheKey] = Date.now() + this.CACHE_TTL;
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            showToast('Error de conexión. Verifica tu internet.', 'error');
            return { success: false, message: 'Error de conexión' };
        }
    }
}

const api = new ApiClient(API_URL);

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showLoader(text = 'Procesando...') {
    const loader = document.getElementById('loader');
    loader.querySelector('.loader-text').textContent = text;
    loader.classList.remove('hidden');
}

function hideLoader() { document.getElementById('loader').classList.add('hidden'); }
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function populateSelect(selectId, options, placeholder = 'Seleccione...') {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        select.appendChild(o);
    });
}

// ===================================================================
// APP — Main Controller
// ===================================================================
const App = {
    currentPage: 'dashboard',

    init() {
        this.bindEvents();
        this.checkConnectivity();
        if (api.getToken()) this.showApp();
        else this.showLogin();
    },

    bindEvents() {
        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => { e.preventDefault(); AuthModule.login(); });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            api.clearToken(); api.invalidateCache(); this.showLogin(); showToast('Sesión cerrada');
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => { e.preventDefault(); this.navigateTo(item.dataset.page); });
        });

        // Sidebar toggle (mobile)
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('open');
            document.getElementById('sidebar-overlay').classList.remove('hidden');
        });
        document.getElementById('sidebar-toggle').addEventListener('click', () => this.closeSidebar());
        document.getElementById('sidebar-overlay').addEventListener('click', () => this.closeSidebar());

        // Modal close buttons
        document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
            btn.addEventListener('click', () => { const m = btn.dataset.modal; if (m) closeModal(m); });
        });

        // Empleados
        document.getElementById('btn-nuevo-empleado').addEventListener('click', () => EmpleadosModule.openNew());
        document.getElementById('form-empleado').addEventListener('submit', (e) => { e.preventDefault(); EmpleadosModule.save(); });
        document.getElementById('search-empleados').addEventListener('input', (e) => EmpleadosModule.filter(e.target.value));

        // Inventario
        document.getElementById('btn-nuevo-articulo').addEventListener('click', () => InventarioModule.openNew());
        document.getElementById('form-inventario').addEventListener('submit', (e) => { e.preventDefault(); InventarioModule.save(); });
        document.getElementById('search-inventario').addEventListener('input', (e) => InventarioModule.filter(e.target.value));

        // Asignaciones
        document.getElementById('btn-toggle-asig-form').addEventListener('click', () => AssignmentsModule.toggleForm());
        document.getElementById('asig-search-btn').addEventListener('click', () => AssignmentsModule.searchEmployee());
        document.getElementById('asig-emp-id').addEventListener('keypress', (e) => { if (e.key === 'Enter') AssignmentsModule.searchEmployee(); });
        document.getElementById('asig-next-btn').addEventListener('click', () => AssignmentsModule.nextStep());
        document.getElementById('asig-prev-btn').addEventListener('click', () => AssignmentsModule.prevStep());
        document.getElementById('asig-save-btn').addEventListener('click', () => AssignmentsModule.save());
        document.getElementById('asig-new-btn').addEventListener('click', () => AssignmentsModule.reset());
        document.getElementById('asig-download-pdf').addEventListener('click', () => AssignmentsModule.downloadPDF());
        document.getElementById('search-asignaciones').addEventListener('input', (e) => AssignmentsModule.filterHistory(e.target.value));

        // Devoluciones
        document.getElementById('btn-toggle-dev-form').addEventListener('click', () => ReturnsModule.toggleForm());
        document.getElementById('dev-search-btn').addEventListener('click', () => ReturnsModule.searchAssignments());
        document.getElementById('dev-emp-id').addEventListener('keypress', (e) => { if (e.key === 'Enter') ReturnsModule.searchAssignments(); });
        document.getElementById('dev-save-btn').addEventListener('click', () => ReturnsModule.processReturn());
        document.getElementById('dev-new-btn').addEventListener('click', () => ReturnsModule.reset());
        document.getElementById('search-devoluciones').addEventListener('input', (e) => ReturnsModule.filterHistory(e.target.value));

        // Empleados Pagination
        document.getElementById('emp-prev-page').addEventListener('click', () => EmpleadosModule.prevPage());
        document.getElementById('emp-next-page').addEventListener('click', () => EmpleadosModule.nextPage());

        // Connectivity
        window.addEventListener('online', () => document.getElementById('offline-banner').classList.add('hidden'));
        window.addEventListener('offline', () => document.getElementById('offline-banner').classList.remove('hidden'));
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    },

    checkConnectivity() {
        if (!navigator.onLine) document.getElementById('offline-banner').classList.remove('hidden');
    },

    showLogin() {
        document.getElementById('page-login').classList.add('active');
        document.getElementById('page-login').style.display = '';
        document.getElementById('app-shell').classList.add('hidden');
    },

    showApp() {
        document.getElementById('page-login').classList.remove('active');
        document.getElementById('page-login').style.display = 'none';
        document.getElementById('app-shell').classList.remove('hidden');

        const user = api.getUser();
        document.getElementById('user-name').textContent = user.Nombre || user.Email || 'Usuario';
        document.getElementById('user-role').textContent = user.Rol || 'SST';
        document.getElementById('user-avatar').textContent = (user.Nombre || 'U')[0].toUpperCase();
        document.getElementById('topbar-user').textContent = user.Email || '';

        this.navigateTo('dashboard');
    },

    navigateTo(page) {
        this.currentPage = page;
        this.closeSidebar();

        document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
        document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.remove('hidden');

        const titles = { dashboard: 'Dashboard', empleados: 'Gestión de Personal', inventario: 'Inventario EPP', asignaciones: 'Asignación de EPP', devoluciones: 'Devolución de EPP' };
        document.getElementById('page-title').textContent = titles[page] || page;

        switch (page) {
            case 'dashboard': DashboardModule.load(); break;
            case 'empleados': EmpleadosModule.load(); break;
            case 'inventario': InventarioModule.load(); break;
            case 'asignaciones': AssignmentsModule.load(); break;
            case 'devoluciones': ReturnsModule.load(); break;
        }
    }
};

// ===================================================================
// AUTH MODULE
// ===================================================================
const AuthModule = {
    async login() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        if (!email || !password) { errorEl.textContent = 'Ingrese email y contraseña.'; errorEl.classList.remove('hidden'); return; }

        errorEl.classList.add('hidden');
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'Conectando...';
        btn.querySelector('.btn-loader').classList.remove('hidden');

        const result = await api.request('login', { email, password });

        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'Iniciar Sesión';
        btn.querySelector('.btn-loader').classList.add('hidden');

        if (!result) return;
        if (result.success) {
            api.setToken(result.token);
            api.setUser(result.user);
            showToast(`Bienvenido, ${result.user.Nombre || result.user.Email}`);
            App.showApp();
        } else {
            errorEl.textContent = result.message || 'Error al iniciar sesión.';
            errorEl.classList.remove('hidden');
        }
    }
};

// ===================================================================
// DASHBOARD MODULE
// ===================================================================
const DashboardModule = {
    async load() {
        const alertsC = document.getElementById('alerts-container');
        const logsC = document.getElementById('logs-container');
        alertsC.innerHTML = '<p class="loading-text">Cargando alertas...</p>';
        logsC.innerHTML = '<p class="loading-text">Cargando eventos...</p>';

        const result = await api.request('getDashboard', {}, true);
        if (!result || !result.success) { alertsC.innerHTML = '<p class="loading-text">Error al cargar datos.</p>'; return; }

        const data = result.data;
        document.getElementById('stat-alert-count').textContent = data.alertCount || 0;

        if (data.alerts.length === 0) {
            alertsC.innerHTML = '<p style="color: var(--success); padding: 12px;">✅ Inventario saludable.</p>';
        } else {
            let h = '<table><thead><tr><th>SKU</th><th>Artículo</th><th>Stock</th><th>Mínimo</th><th>Ubicación</th></tr></thead><tbody>';
            data.alerts.forEach(a => { h += `<tr><td>${a.SKU}</td><td>${a.ItemNombre}</td><td><span class="badge badge-danger">${a.StockActual}</span></td><td>${a.StockMinimo}</td><td>${a.Ubicacion || '-'}</td></tr>`; });
            h += '</tbody></table>';
            alertsC.innerHTML = h;
        }

        if (data.logs.length === 0) { logsC.innerHTML = '<p class="loading-text">No hay registros.</p>'; }
        else {
            let h = '';
            data.logs.forEach(log => { h += `<div class="log-card"><span class="log-time">${log.Timestamp}</span> — <span class="log-action">${log.Accion}</span><br>${log.UsuarioEmail} → ${log.Detalle}</div>`; });
            logsC.innerHTML = h;
        }
    }
};

// ===================================================================
// EMPLEADOS MODULE
// ===================================================================
const EmpleadosModule = {
    data: [],
    filteredData: [],
    currentPage: 1,
    pageSize: 50,
    optionsCache: null,
    searchTimeout: null,

    async load() {
        const c = document.getElementById('empleados-table-container');
        c.innerHTML = '<p class="loading-text">Cargando empleados...</p>';
        const result = await api.request('getEmpleados', {}, true);
        if (!result || !result.success) { c.innerHTML = '<p class="loading-text">Error al cargar.</p>'; return; }
        this.data = result.data;
        this.filteredData = result.data;
        document.getElementById('stat-emp-count').textContent = this.data.length;
        this.currentPage = 1;
        this.render();
    },

    render() {
        const c = document.getElementById('empleados-table-container');
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageItems = this.filteredData.slice(start, end);

        if (this.filteredData.length === 0) {
            c.innerHTML = '<p class="loading-text">No se encontraron empleados.</p>';
            document.getElementById('empleados-pagination').classList.add('hidden');
            return;
        }

        document.getElementById('empleados-pagination').classList.remove('hidden');
        let h = '<table class="data-table"><thead><tr><th>ID</th><th>Nombres</th><th>Cargo</th><th>Sede</th><th>Acciones</th></tr></thead><tbody>';
        pageItems.forEach(emp => {
            h += `<tr>
                <td>${emp['ID_Empleado'] || ''}</td>
                <td>${emp['Nombres'] || ''} ${emp['Apellidos'] || ''}</td>
                <td>${emp['Cargo'] || ''}</td>
                <td>${emp['SedePorcicola'] || ''}</td>
                <td>
                    <button class="btn btn-primary btn-xs" onclick="EmpleadosModule.openEdit('${emp['ID_Empleado']}')">Editar</button>
                </td>
            </tr>`;
        });
        h += '</tbody></table>';
        c.innerHTML = h;

        this.updatePagination();
    },

    updatePagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        document.getElementById('emp-page-info').textContent = `Página ${this.currentPage} de ${totalPages || 1}`;
        document.getElementById('emp-prev-page').disabled = this.currentPage === 1;
        document.getElementById('emp-next-page').disabled = this.currentPage >= totalPages;
    },

    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    filter(q) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            const query = q.toLowerCase();
            this.filteredData = this.data.filter(e =>
                [e['ID_Empleado'], e['Nombres'], e['Apellidos'], e['Area'], e['Cargo']].some(v => String(v || '').toLowerCase().includes(query))
            );
            this.currentPage = 1;
            this.render();
        }, 300);
    },

    async openNew() {
        document.getElementById('modal-empleado-title').textContent = 'Nuevo Empleado';
        document.getElementById('form-empleado').reset();
        document.getElementById('emp-edit-index').value = '';
        document.getElementById('emp-cedula').disabled = false;
        await this.loadOptions();
        openModal('modal-empleado');
    },

    async openEdit(id) {
        const emp = this.data.find(e => String(e['ID_Empleado']) === String(id));
        if (!emp) {
            showToast('No se encontró el empleado para editar.', 'error');
            return;
        }

        document.getElementById('modal-empleado-title').textContent = 'Editar Empleado';
        document.getElementById('emp-edit-index').value = emp._rowIndex;
        document.getElementById('emp-cedula').value = emp['ID_Empleado'] || '';
        document.getElementById('emp-cedula').disabled = true;
        document.getElementById('emp-nombres').value = emp['Nombres'] || '';
        document.getElementById('emp-apellidos').value = emp['Apellidos'] || '';
        document.getElementById('emp-fecha').value = emp['FechaIngreso'] || '';
        document.getElementById('emp-estado').value = emp['Estado'] || 'Activo';
        document.getElementById('emp-consentimiento').value = emp['ConsentimientoLey1581'] || 'Aceptado';

        // Cargar opciones solo si es necesario
        if (!this.optionsCache) await this.loadOptions();

        document.getElementById('emp-cargo').value = emp['Cargo'] || '';
        document.getElementById('emp-area').value = emp['Area'] || '';
        document.getElementById('emp-sede').value = emp['SedePorcicola'] || '';
        document.getElementById('emp-empresa').value = emp['Empresa'] || '';

        openModal('modal-empleado');
    },

    async loadOptions() {
        if (this.optionsCache) return this.optionsCache;

        const r = await api.request('getEmpleadosOptions', {}, true);
        if (r && r.success) {
            this.optionsCache = r.data;
            populateSelect('emp-cargo', r.data.cargos);
            populateSelect('emp-area', r.data.areas);
            populateSelect('emp-sede', r.data.sedes);
            populateSelect('emp-empresa', r.data.empresas);
            return r.data;
        }
        return null;
    },

    async save() {
        const editIdx = document.getElementById('emp-edit-index').value;
        // ORDEN HOJA EMPLEADOS (Imagen): 
        // A:ID, B:Nombres, C:Apellidos, D:Cargo, E:Area, F:Sede, G:Empresa, H:Fecha, I:Estado, J:Consentimiento
        const datos = [
            document.getElementById('emp-cedula').value.trim(),
            document.getElementById('emp-nombres').value.trim(),
            document.getElementById('emp-apellidos').value.trim(),
            document.getElementById('emp-cargo').value,
            document.getElementById('emp-area').value,
            document.getElementById('emp-sede').value,
            document.getElementById('emp-empresa').value, // G: Empresa (NUEVO ORDEN)
            document.getElementById('emp-fecha').value,   // H: FechaIngreso
            document.getElementById('emp-estado').value,  // I: Estado
            document.getElementById('emp-consentimiento').value // J: Consentimiento
        ];
        // Nota: El orden exacto debe ser ID, Nombres, Apellidos, Cargo, Area, Sede, Fecha, Estado, Consentimiento, Empresa
        // (Verificar con el usuario si Empresa es la última o una posición específica tras G)
        showLoader('Guardando...');
        const result = editIdx
            ? await api.request('actualizarEmpleado', { index: parseInt(editIdx), datos })
            : await api.request('crearEmpleado', { datos });
        hideLoader();
        if (result && result.success) {
            showToast(result.message); closeModal('modal-empleado'); api.invalidateCache(); this.load();
        } else { showToast(result?.message || 'Error al guardar.', 'error'); }
    }
};

// ===================================================================
// INVENTARIO MODULE
// ===================================================================
const InventarioModule = {
    data: [],

    async load() {
        const c = document.getElementById('inventario-table-container');
        c.innerHTML = '<p class="loading-text">Cargando inventario...</p>';
        const result = await api.request('getInventario', {}, true);
        if (!result || !result.success) { c.innerHTML = '<p class="loading-text">Error al cargar.</p>'; return; }
        this.data = result.data;
        document.getElementById('stat-inv-count').textContent = this.data.length;
        this.render(this.data);
    },

    render(items) {
        const c = document.getElementById('inventario-table-container');
        if (items.length === 0) { c.innerHTML = '<p class="loading-text">Sin artículos.</p>'; return; }
        let h = '<table><thead><tr><th>SKU</th><th>Nombre</th><th>Tipo</th><th>Stock</th><th>Mín</th><th>Unidad</th><th>Proveedor</th><th>Acción</th></tr></thead><tbody>';
        items.forEach(item => {
            const stock = parseInt(item['StockActual']) || 0;
            const min = parseInt(item['StockMinimo']) || 0;
            const badge = stock <= min ? `<span class="badge badge-danger">${stock}</span>` : `<span class="badge badge-success">${stock}</span>`;
            h += `<tr><td>${item['SKU'] || ''}</td><td>${item['ItemNombre'] || item['Nombre'] || ''}</td><td>${item['Tipo'] || ''}</td><td>${badge}</td><td>${min}</td><td>${item['Unidad'] || ''}</td><td>${item['Proveedor'] || ''}</td><td><button class="btn-edit" onclick="InventarioModule.openEdit(${item._rowIndex})">Editar</button></td></tr>`;
        });
        h += '</tbody></table>';
        c.innerHTML = h;
    },

    filter(q) {
        q = q.toLowerCase();
        this.render(this.data.filter(i => [i['SKU'], i['ItemNombre'], i['Nombre']].some(v => String(v || '').toLowerCase().includes(q))));
    },

    async openNew() {
        document.getElementById('modal-inventario-title').textContent = 'Nuevo Artículo';
        document.getElementById('form-inventario').reset();
        document.getElementById('inv-edit-index').value = '';
        document.getElementById('inv-sku').disabled = false;
        await this.loadOptions();
        openModal('modal-inventario');
    },

    async openEdit(rowIndex) {
        const item = this.data.find(i => i._rowIndex === rowIndex);
        if (!item) return;
        document.getElementById('modal-inventario-title').textContent = 'Editar Artículo';
        document.getElementById('inv-edit-index').value = rowIndex;
        document.getElementById('inv-sku').value = item['SKU'] || '';
        document.getElementById('inv-sku').disabled = true;
        document.getElementById('inv-nombre').value = item['ItemNombre'] || item['Nombre'] || '';
        document.getElementById('inv-descripcion').value = item['Descripcion'] || '';
        document.getElementById('inv-stock').value = item['StockActual'] || 0;
        document.getElementById('inv-minimo').value = item['StockMinimo'] || 0;
        document.getElementById('inv-vencimiento').value = item['Vencimiento'] || '';
        document.getElementById('inv-costo').value = item['CostoUnitario'] || item['Costo'] || '';
        document.getElementById('inv-stockmant').value = item['StockMant'] || 0;
        document.getElementById('inv-stockbaja').value = item['StockBaja'] || 0;
        document.getElementById('inv-ubicacion').value = item['Ubicacion'] || '';
        await this.loadOptions();
        document.getElementById('inv-tipo').value = item['Tipo'] || '';
        document.getElementById('inv-unidad').value = item['UnidadMedida'] || item['Unidad'] || '';
        document.getElementById('inv-proveedor').value = item['Proveedor'] || '';
        openModal('modal-inventario');
    },

    async loadOptions() {
        const r = await api.request('getInventarioOptions', {}, true);
        if (r && r.success) { populateSelect('inv-tipo', r.data.tipos); populateSelect('inv-unidad', r.data.unidades); populateSelect('inv-proveedor', r.data.proveedores); }
    },

    async save() {
        const editIdx = document.getElementById('inv-edit-index').value;
        // ORDEN CRITICO: SKU, Nombre, Descripción, Tipo, StockActual, StockMinimo, Unidad, Vencimiento, Proveedor, Costo, StockMant, StockBaja, Ubicación
        const datos = [
            document.getElementById('inv-sku').value.trim().toUpperCase(),
            document.getElementById('inv-nombre').value.trim(),
            document.getElementById('inv-descripcion').value.trim(),
            document.getElementById('inv-tipo').value,
            parseInt(document.getElementById('inv-stock').value) || 0,
            parseInt(document.getElementById('inv-minimo').value) || 0,
            document.getElementById('inv-unidad').value,
            document.getElementById('inv-vencimiento').value,
            document.getElementById('inv-proveedor').value,
            parseFloat(document.getElementById('inv-costo').value) || 0,
            parseInt(document.getElementById('inv-stockmant').value) || 0,
            parseInt(document.getElementById('inv-stockbaja').value) || 0,
            document.getElementById('inv-ubicacion').value.trim()
        ];
        showLoader('Guardando...');
        const result = editIdx
            ? await api.request('actualizarArticulo', { index: parseInt(editIdx), datos })
            : await api.request('crearArticulo', { datos });
        hideLoader();
        if (result && result.success) {
            showToast(result.message);
            closeModal('modal-inventario');
            api.invalidateCache();
            setTimeout(() => this.load(), 500); // Dar un respiro a la cache del lado del servidor
        } else { showToast(result?.message || 'Error al guardar.', 'error'); }
    }
};

// ===================================================================
// ASSIGNMENTS MODULE — With History & PDF Re-download
// ===================================================================
const AssignmentsModule = {
    currentStep: 1,
    employeeData: null,
    inventoryItems: [],
    lastAssignmentData: null,
    sigEmp: null,
    sigResp: null,
    historyData: [],

    async load() {
        // Load history table
        this.loadHistory();
    },

    toggleForm() {
        const wrapper = document.getElementById('asig-form-wrapper');
        if (wrapper.classList.contains('hidden')) {
            wrapper.classList.remove('hidden');
            this.resetForm();
        } else {
            wrapper.classList.add('hidden');
        }
    },

    resetForm() {
        this.currentStep = 1;
        this.employeeData = null;
        this.lastAssignmentData = null;

        document.getElementById('asig-emp-id').value = '';
        document.getElementById('asig-emp-info').classList.add('hidden');
        document.getElementById('asig-step-2').classList.add('hidden');
        document.getElementById('asig-step-3').classList.add('hidden');
        document.getElementById('asig-result').classList.add('hidden');
        document.getElementById('asig-next-btn').classList.add('hidden');
        document.getElementById('asig-prev-btn').classList.add('hidden');
        document.getElementById('asig-save-btn').classList.add('hidden');
        document.getElementById('asig-step-1').classList.remove('hidden');
        document.querySelectorAll('.asig-actions').forEach(el => el.classList.remove('hidden'));

        setTimeout(() => {
            const sigOptions = { penColor: "rgb(0, 0, 0)", minWidth: 0.5, maxWidth: 2.5 };
            this.sigEmp = new SignaturePad(document.getElementById('sig-empleado'), sigOptions);
            this.sigResp = new SignaturePad(document.getElementById('sig-responsable'), sigOptions);
            document.getElementById('clear-sig-emp').onclick = () => this.sigEmp?.clear();
            document.getElementById('clear-sig-resp').onclick = () => this.sigResp?.clear();
        }, 100);
    },

    reset() {
        this.resetForm();
        document.getElementById('asig-form-wrapper').classList.remove('hidden');
    },

    async loadHistory() {
        const c = document.getElementById('asignaciones-table-container');
        c.innerHTML = '<p class="loading-text">Cargando historial...</p>';

        const result = await api.request('getAllAsignaciones', {}, true);
        if (!result || !result.success) { c.innerHTML = '<p class="loading-text">Error al cargar historial.</p>'; return; }

        this.historyData = result.data;
        this.renderHistory(this.historyData);
    },

    renderHistory(data) {
        const c = document.getElementById('asignaciones-table-container');
        if (data.length === 0) { c.innerHTML = '<p class="loading-text">No hay asignaciones registradas.</p>'; return; }

        let h = '<table><thead><tr><th>ID</th><th>Fecha</th><th>Empleado</th><th>SKU</th><th>Artículo</th><th>Cant</th><th>Tipo</th><th>Por</th><th>PDF</th></tr></thead><tbody>';
        data.forEach((a, idx) => {
            h += `<tr>
        <td>${a.ID_Asignacion}</td>
        <td>${a.Timestamp}</td>
        <td>${a.ID_Empleado}</td>
        <td>${a.SKU}</td>
        <td>${a.ItemNombre}</td>
        <td>${a.Cantidad}</td>
        <td>${a.TipoEntrega}</td>
        <td>${a.EntregadoPor}</td>
        <td><button class="btn-edit" onclick="AssignmentsModule.redownloadPDF(${idx})">📄 PDF</button></td>
      </tr>`;
        });
        h += '</tbody></table>';
        c.innerHTML = h;
    },

    filterHistory(q) {
        q = q.toLowerCase();
        this.renderHistory(this.historyData.filter(a =>
            [a.ID_Asignacion, a.ID_Empleado, a.SKU, a.ItemNombre, a.EntregadoPor].some(v => String(v || '').toLowerCase().includes(q))
        ));
    },

    redownloadPDF(idx) {
        const a = this.historyData[idx];
        if (!a) return;
        generateAssignmentPDF({
            asig_id: a.ID_Asignacion,
            timestamp: a.Timestamp,
            employee_id: a.ID_Empleado,
            sku: a.SKU,
            quantity: a.Cantidad,
            current_user_email: a.EntregadoPor,
            delivery_type: a.TipoEntrega,
            employee_name: a.EmpleadoNombre || '', // Asegurar que llegue desde el backend si es posible
            company: a.Empresa || '',
            due_date: a.ProximoVencimiento || '',
            item_name: a.ItemNombre,
            notes: a.Notas || '',
            signature_emp_b64: a.FirmaEmp || '',
            signature_resp_b64: a.FirmaResp || ''
        });
        showToast('PDF descargado');
    },

    async searchEmployee() {
        const empId = document.getElementById('asig-emp-id').value.trim();
        if (!empId) { showToast('Ingrese la cédula.', 'warning'); return; }

        showLoader('Buscando empleado...');
        const result = await api.request('getEmployee', { employeeId: empId });
        hideLoader();

        if (!result || !result.success) { showToast(result?.message || 'No encontrado.', 'error'); return; }

        this.employeeData = result.data;
        document.getElementById('asig-emp-name').textContent = `${result.data['Nombres'] || ''} ${result.data['Apellidos'] || ''}`;
        document.getElementById('asig-emp-cargo').textContent = result.data['Cargo'] || '-';
        document.getElementById('asig-emp-area').textContent = result.data['Area'] || '-';
        document.getElementById('asig-emp-info').classList.remove('hidden');
        document.getElementById('asig-next-btn').classList.remove('hidden');

        // Preload inventory
        const invResult = await api.request('getInventoryItems', {}, true);
        if (invResult && invResult.success) {
            this.inventoryItems = invResult.data;
            const sel = document.getElementById('asig-item');
            sel.innerHTML = '<option value="">Seleccione artículo...</option>';
            invResult.data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item['SKU'] || '';
                opt.textContent = `${item['SKU']} - ${item['ItemNombre'] || item['Nombre'] || ''} (Stock: ${parseInt(item['StockActual']) || 0})`;
                opt.dataset.name = item['ItemNombre'] || item['Nombre'] || '';
                sel.appendChild(opt);
            });
        }
    },

    nextStep() {
        if (this.currentStep === 1) {
            this.currentStep = 2;
            document.getElementById('asig-step-2').classList.remove('hidden');
            document.getElementById('asig-prev-btn').classList.remove('hidden');
            document.getElementById('asig-next-btn').textContent = 'Siguiente → Firmas';
        } else if (this.currentStep === 2) {
            if (!document.getElementById('asig-item').value) { showToast('Seleccione un artículo.', 'warning'); return; }
            this.currentStep = 3;
            document.getElementById('asig-step-3').classList.remove('hidden');
            document.getElementById('asig-next-btn').classList.add('hidden');
            document.getElementById('asig-save-btn').classList.remove('hidden');
            setTimeout(() => {
                this.sigEmp = new SignaturePad('sig-empleado');
                this.sigResp = new SignaturePad('sig-responsable');
                document.getElementById('clear-sig-emp').onclick = () => this.sigEmp?.clear();
                document.getElementById('clear-sig-resp').onclick = () => this.sigResp?.clear();
            }, 200);
        }
    },

    prevStep() {
        if (this.currentStep === 2) {
            this.currentStep = 1;
            document.getElementById('asig-step-2').classList.add('hidden');
            document.getElementById('asig-prev-btn').classList.add('hidden');
            document.getElementById('asig-next-btn').textContent = 'Siguiente →';
        } else if (this.currentStep === 3) {
            this.currentStep = 2;
            document.getElementById('asig-step-3').classList.add('hidden');
            document.getElementById('asig-next-btn').classList.remove('hidden');
            document.getElementById('asig-save-btn').classList.add('hidden');
            document.getElementById('asig-next-btn').textContent = 'Siguiente → Firmas';
        }
    },

    async save() {
        const sel = document.getElementById('asig-item');
        const itemName = sel.options[sel.selectedIndex]?.dataset?.name || '';

        const payload = {
            employeeId: this.employeeData['ID_Empleado'] || document.getElementById('asig-emp-id').value,
            sku: sel.value,
            quantity: parseInt(document.getElementById('asig-quantity').value) || 1,
            deliveryType: document.getElementById('asig-delivery-type').value,
            nextDueDate: document.getElementById('asig-due-date').value,
            notes: document.getElementById('asig-notes').value,
            itemName: itemName,
            signatureEmpB64: this.sigEmp ? this.sigEmp.toBase64Raw() : '',
            signatureRespB64: this.sigResp ? this.sigResp.toBase64Raw() : ''
        };

        showLoader('Registrando asignación...');
        const result = await api.request('saveAssignment', payload);
        hideLoader();

        if (result && result.success) {
            this.lastAssignmentData = result.data;
            this.lastAssignmentData.signature_emp_b64 = this.sigEmp ? this.sigEmp.toBase64() : '';
            this.lastAssignmentData.signature_resp_b64 = this.sigResp ? this.sigResp.toBase64() : '';

            document.getElementById('asig-result-msg').textContent = result.message;
            document.getElementById('asig-result').classList.remove('hidden');
            document.querySelectorAll('.asig-step, .asig-actions').forEach(el => el.classList.add('hidden'));

            showToast(result.message);
            api.invalidateCache();
            this.loadHistory(); // Refresh history

            // --- RESPALDO EN DRIVE (Opcional) ---
            const pdfBase64 = generateAssignmentPDF(this.lastAssignmentData, true);
            if (pdfBase64) {
                api.request('savePdfToDrive', {
                    pdfBase64: pdfBase64,
                    filename: `Recibo_${this.lastAssignmentData.asig_id}.pdf`,
                    folderId: DRIVE_FOLDER_ID
                }).then(driveRes => {
                    if (driveRes && driveRes.success) {
                        console.log('Respaldo en Drive exitoso:', driveRes.fileUrl);
                    }
                });
            }
        } else {
            showToast(result?.message || 'Error al guardar.', 'error');
        }
    },

    downloadPDF() {
        if (this.lastAssignmentData) {
            generateAssignmentPDF(this.lastAssignmentData);
            showToast('PDF descargado');
        }
    }
};

// ===================================================================
// RETURNS MODULE — With History
// ===================================================================
const ReturnsModule = {
    employeeId: '',
    historyData: [],
    sigEmp: null, // Added for return signatures
    sigResp: null, // Added for return signatures

    async load() {
        this.loadHistory();
    },

    toggleForm() {
        const wrapper = document.getElementById('dev-form-wrapper');
        if (wrapper.classList.contains('hidden')) {
            wrapper.classList.remove('hidden');
            this.resetForm();
        } else {
            wrapper.classList.add('hidden');
        }
    },

    resetForm() {
        this.employeeId = '';
        document.getElementById('dev-emp-id').value = '';
        document.getElementById('dev-assignments').classList.add('hidden');
        document.getElementById('dev-form-container').classList.add('hidden');
        document.getElementById('dev-result').classList.add('hidden');
        // Clear signatures on reset
        if (this.sigEmp) this.sigEmp.clear();
        if (this.sigResp) this.sigResp.clear();

        setTimeout(() => {
            const sigOptions = { penColor: "rgb(0, 0, 0)", minWidth: 0.5, maxWidth: 2.5 };
            const canvasEmp = document.getElementById('dev-sig-empleado');
            const canvasResp = document.getElementById('dev-sig-responsable');
            if (canvasEmp) this.sigEmp = new SignaturePad(canvasEmp, sigOptions);
            if (canvasResp) this.sigResp = new SignaturePad(canvasResp, sigOptions);
            document.getElementById('dev-clear-sig-emp').onclick = () => this.sigEmp?.clear();
            document.getElementById('dev-clear-sig-resp').onclick = () => this.sigResp?.clear();
        }, 100);
    },

    reset() {
        this.resetForm();
        document.getElementById('dev-form-wrapper').classList.remove('hidden');
    },

    async loadHistory() {
        const c = document.getElementById('devoluciones-table-container');
        c.innerHTML = '<p class="loading-text">Cargando historial...</p>';

        const result = await api.request('getAllDevoluciones', {}, true);
        if (!result || !result.success) { c.innerHTML = '<p class="loading-text">Error al cargar historial.</p>'; return; }

        this.historyData = result.data;
        this.renderHistory(this.historyData);
    },

    renderHistory(data) {
        const c = document.getElementById('devoluciones-table-container');
        if (data.length === 0) { c.innerHTML = '<p class="loading-text">No hay devoluciones registradas.</p>'; return; }

        let h = '<table><thead><tr><th>ID</th><th>Fecha</th><th>Empleado</th><th>SKU</th><th>Cant</th><th>Estado</th><th>Por</th><th>PDF</th></tr></thead><tbody>';
        data.forEach((d, idx) => {
            const condBadge = d.EstadoItem === 'Bueno' ? 'badge-success' : d.EstadoItem === 'Regular' ? 'badge-warning' : 'badge-danger';
            h += `<tr>
        <td>${d.ID_Devolucion}</td>
        <td>${d.Timestamp}</td>
        <td>${d.ID_Empleado}</td>
        <td>${d.SKU}</td>
        <td>${d.CantidadDevuelta}</td>
        <td><span class="badge ${condBadge}">${d.EstadoItem}</span></td>
        <td>${d.ProcesadoPor}</td>
        <td><button class="btn-edit" onclick="ReturnsModule.downloadHistoryPDF(${idx})">📄 PDF</button></td>
      </tr>`;
        });
        h += '</tbody></table>';
        c.innerHTML = h;
    },

    filterHistory(q) {
        q = q.toLowerCase();
        this.renderHistory(this.historyData.filter(d =>
            [d.ID_Devolucion, d.ID_Empleado, d.SKU, d.ProcesadoPor].some(v => String(v || '').toLowerCase().includes(q))
        ));
    },

    async searchAssignments() {
        const empId = document.getElementById('dev-emp-id').value.trim();
        if (!empId) { showToast('Ingrese la cédula.', 'warning'); return; }

        this.employeeId = empId;
        showLoader('Buscando asignaciones...');
        const result = await api.request('getEmployeeAssignments', { employeeId: empId });
        hideLoader();

        if (!result || !result.success) { showToast(result?.message || 'Error.', 'error'); return; }

        const c = document.getElementById('dev-assignments-list');
        if (result.data.length === 0) {
            c.innerHTML = '<p class="loading-text">No hay asignaciones para este empleado.</p>';
        } else {
            let h = '<table><thead><tr><th>ID</th><th>Fecha</th><th>SKU</th><th>Artículo</th><th>Cant</th><th>Acción</th></tr></thead><tbody>';
            result.data.forEach(a => {
                h += `<tr><td>${a.ID_Asignacion}</td><td>${a.Timestamp}</td><td>${a.SKU}</td><td>${a.ItemNombre}</td><td>${a.Cantidad}</td><td><button class="dev-select-btn" onclick="ReturnsModule.selectAssignment('${a.ID_Asignacion}','${a.SKU}')">Seleccionar</button></td></tr>`;
            });
            h += '</tbody></table>';
            c.innerHTML = h;
        }
        document.getElementById('dev-assignments').classList.remove('hidden');
    },

    selectAssignment(asigId, sku) {
        document.getElementById('dev-asig-id').value = asigId;
        document.getElementById('dev-sku').value = sku;
        document.getElementById('dev-quantity').value = 1;
        document.getElementById('dev-condition').value = 'Bueno';
        document.getElementById('dev-notes').value = '';
        document.getElementById('dev-form-container').classList.remove('hidden');

        // Inicializar firmas para devolución
        setTimeout(() => {
            const sigOptions = { penColor: "rgb(0, 0, 0)", minWidth: 0.5, maxWidth: 2.5 };
            const canvasEmp = document.getElementById('sig-dev-empleado');
            const canvasResp = document.getElementById('sig-dev-responsable');
            if (canvasEmp) this.sigEmp = new SignaturePad(canvasEmp, sigOptions);
            if (canvasResp) this.sigResp = new SignaturePad(canvasResp, sigOptions);
            document.getElementById('clear-sig-dev-emp').onclick = () => this.sigEmp?.clear();
            document.getElementById('clear-sig-dev-resp').onclick = () => this.sigResp?.clear();
        }, 200);
    },

    async processReturn() {
        const payload = {
            asigOriginalId: document.getElementById('dev-asig-id').value,
            employeeId: this.employeeId,
            sku: document.getElementById('dev-sku').value,
            quantityReturned: parseInt(document.getElementById('dev-quantity').value) || 1,
            itemCondition: document.getElementById('dev-condition').value,
            notes: document.getElementById('dev-notes').value,
            signatureEmpB64: this.sigEmp ? this.sigEmp.toBase64Raw() : '',
            signatureRespB64: this.sigResp ? this.sigResp.toBase64Raw() : ''
        };

        showLoader('Procesando devolución...');
        const result = await api.request('processReturn', payload);
        hideLoader();

        if (result && result.success) {
            // El servidor ya devuelve employee_name, company, item_name, etc.
            const row = result;
            row.signature_emp_b64 = this.sigEmp ? this.sigEmp.toBase64() : '';
            row.signature_resp_b64 = this.sigResp ? this.sigResp.toBase64() : '';

            // Generar PDF correspondiente con datos completos
            let pdfBase64 = null;
            if (row.item_condition === 'Bueno') {
                pdfBase64 = generateReturnPDF(row, true);
                generateReturnPDF(row);
            } else {
                pdfBase64 = generateDisposalPDF(row, true);
                generateDisposalPDF(row);
            }

            // Respaldo en Drive
            if (pdfBase64) {
                api.request('savePdfToDrive', {
                    pdfBase64: pdfBase64,
                    filename: `${row.item_condition === 'Bueno' ? 'Devolucion' : 'Acta_Eliminacion'}_${row.dev_id}.pdf`,
                    folderId: DRIVE_FOLDER_ID
                });
            }

            document.getElementById('dev-result-msg').textContent = result.message;
            document.getElementById('dev-result').classList.remove('hidden');
            document.getElementById('dev-form-container').classList.add('hidden');
            document.getElementById('dev-assignments').classList.add('hidden');

            showToast(result.message);
            this.reset();
            this.loadHistory();
            api.invalidateCache();
        } else {
            showToast(result?.message || 'Error.', 'error');
        }
    },

    downloadHistoryPDF(idx) {
        const d = this.historyData[idx];
        if (!d) return;

        const pdfData = {
            dev_id: d.ID_Devolucion,
            timestamp: d.Timestamp,
            employee_id: d.ID_Empleado,
            sku: d.SKU,
            quantity: d.CantidadDevuelta,
            item_condition: d.EstadoItem,
            current_user_email: d.ProcesadoPor,
            signature_emp_b64: d.FirmaEmp,
            signature_resp_b64: d.FirmaResp
        };

        if (d.EstadoItem === 'Bueno') {
            generateReturnPDF(pdfData);
        } else {
            generateDisposalPDF(pdfData);
        }
        showToast('Documento histórico descargado');
    }
};

// ===================================================================
// INIT
// ===================================================================
document.addEventListener('DOMContentLoaded', () => App.init());
