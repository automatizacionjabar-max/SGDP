/**
 * SGD-P Web — Main Application
 * SPA Router, API Client, and Module Handlers
 */

// ===================================================================
// CONFIGURATION — ¡CAMBIAR ESTA URL DESPUÉS DEL DEPLOY!
// ===================================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyOVwyulSMkr-07J84D-MqigyFVfnUAc2eIIEdKVP7jQZfbaGXWTBOHwXSi8CjMFVV4/exec';
// Ejemplo: 'https://script.google.com/macros/s/AKfycb.../exec'

// ===================================================================
// API CLIENT
// ===================================================================
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    getToken() {
        return localStorage.getItem('sgdp_token') || '';
    }

    setToken(token) {
        localStorage.setItem('sgdp_token', token);
    }

    clearToken() {
        localStorage.removeItem('sgdp_token');
        localStorage.removeItem('sgdp_user');
    }

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('sgdp_user') || '{}');
        } catch {
            return {};
        }
    }

    setUser(user) {
        localStorage.setItem('sgdp_user', JSON.stringify(user));
    }

    async request(action, payload = {}) {
        try {
            const body = {
                action: action,
                payload: payload,
                token: this.getToken()
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(body)
            });

            // Apps Script siempre retorna 200, incluso con redirects
            // Manejar redirect de Apps Script
            const data = await response.json();

            if (data.code === 401) {
                this.clearToken();
                App.showLogin();
                showToast('Sesión expirada. Inicia sesión nuevamente.', 'warning');
                return null;
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

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function populateSelect(selectId, options, placeholder = 'Seleccione...') {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
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

        // Check if already logged in
        if (api.getToken()) {
            this.showApp();
        } else {
            this.showLogin();
        }
    },

    bindEvents() {
        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            AuthModule.login();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            api.clearToken();
            this.showLogin();
            showToast('Sesión cerrada', 'success');
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
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
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modal;
                if (modalId) closeModal(modalId);
            });
        });

        // Empleados
        document.getElementById('btn-nuevo-empleado').addEventListener('click', () => EmpleadosModule.openNew());
        document.getElementById('form-empleado').addEventListener('submit', (e) => {
            e.preventDefault();
            EmpleadosModule.save();
        });
        document.getElementById('search-empleados').addEventListener('input', (e) => EmpleadosModule.filter(e.target.value));

        // Inventario
        document.getElementById('btn-nuevo-articulo').addEventListener('click', () => InventarioModule.openNew());
        document.getElementById('form-inventario').addEventListener('submit', (e) => {
            e.preventDefault();
            InventarioModule.save();
        });
        document.getElementById('search-inventario').addEventListener('input', (e) => InventarioModule.filter(e.target.value));

        // Asignaciones
        document.getElementById('asig-search-btn').addEventListener('click', () => AssignmentsModule.searchEmployee());
        document.getElementById('asig-emp-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') AssignmentsModule.searchEmployee();
        });
        document.getElementById('asig-next-btn').addEventListener('click', () => AssignmentsModule.nextStep());
        document.getElementById('asig-prev-btn').addEventListener('click', () => AssignmentsModule.prevStep());
        document.getElementById('asig-save-btn').addEventListener('click', () => AssignmentsModule.save());
        document.getElementById('asig-new-btn').addEventListener('click', () => AssignmentsModule.reset());
        document.getElementById('asig-download-pdf').addEventListener('click', () => AssignmentsModule.downloadPDF());

        // Devoluciones
        document.getElementById('dev-search-btn').addEventListener('click', () => ReturnsModule.searchAssignments());
        document.getElementById('dev-emp-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') ReturnsModule.searchAssignments();
        });
        document.getElementById('dev-save-btn').addEventListener('click', () => ReturnsModule.processReturn());
        document.getElementById('dev-new-btn').addEventListener('click', () => ReturnsModule.reset());

        // Connectivity
        window.addEventListener('online', () => {
            document.getElementById('offline-banner').classList.add('hidden');
        });
        window.addEventListener('offline', () => {
            document.getElementById('offline-banner').classList.remove('hidden');
        });
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    },

    checkConnectivity() {
        if (!navigator.onLine) {
            document.getElementById('offline-banner').classList.remove('hidden');
        }
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

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Show/hide pages
        document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }

        // Update topbar title
        const titles = {
            dashboard: 'Dashboard',
            empleados: 'Gestión de Personal',
            inventario: 'Inventario EPP',
            asignaciones: 'Asignación de EPP',
            devoluciones: 'Devolución de EPP'
        };
        document.getElementById('page-title').textContent = titles[page] || page;

        // Load data for the page
        switch (page) {
            case 'dashboard': DashboardModule.load(); break;
            case 'empleados': EmpleadosModule.load(); break;
            case 'inventario': InventarioModule.load(); break;
            case 'asignaciones': AssignmentsModule.init(); break;
            case 'devoluciones': ReturnsModule.reset(); break;
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

        if (!email || !password) {
            errorEl.textContent = 'Ingrese email y contraseña.';
            errorEl.classList.remove('hidden');
            return;
        }

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
        const alertsContainer = document.getElementById('alerts-container');
        const logsContainer = document.getElementById('logs-container');
        alertsContainer.innerHTML = '<p class="loading-text">Cargando alertas...</p>';
        logsContainer.innerHTML = '<p class="loading-text">Cargando eventos...</p>';

        const result = await api.request('getDashboard');
        if (!result || !result.success) {
            alertsContainer.innerHTML = '<p class="loading-text">Error al cargar datos.</p>';
            return;
        }

        const data = result.data;

        // Stats
        document.getElementById('stat-alert-count').textContent = data.alertCount || 0;

        // Alerts
        if (data.alerts.length === 0) {
            alertsContainer.innerHTML = '<p style="color: var(--success); padding: 12px;">✅ Inventario saludable. No hay alertas.</p>';
        } else {
            let html = '<table><thead><tr><th>SKU</th><th>Artículo</th><th>Stock</th><th>Mínimo</th><th>Ubicación</th></tr></thead><tbody>';
            data.alerts.forEach(a => {
                html += `<tr>
          <td>${a.SKU}</td>
          <td>${a.ItemNombre}</td>
          <td><span class="badge badge-danger">${a.StockActual}</span></td>
          <td>${a.StockMinimo}</td>
          <td>${a.Ubicacion}</td>
        </tr>`;
            });
            html += '</tbody></table>';
            alertsContainer.innerHTML = html;
        }

        // Logs
        if (data.logs.length === 0) {
            logsContainer.innerHTML = '<p class="loading-text">No hay registros.</p>';
        } else {
            let html = '';
            data.logs.forEach(log => {
                html += `<div class="log-card">
          <span class="log-time">${log.Timestamp}</span> —
          <span class="log-action">${log.Accion}</span><br>
          ${log.UsuarioEmail} → ${log.Detalle}
        </div>`;
            });
            logsContainer.innerHTML = html;
        }
    }
};

// ===================================================================
// EMPLEADOS MODULE
// ===================================================================
const EmpleadosModule = {
    data: [],

    async load() {
        const container = document.getElementById('empleados-table-container');
        container.innerHTML = '<p class="loading-text">Cargando empleados...</p>';

        const result = await api.request('getEmpleados');
        if (!result || !result.success) {
            container.innerHTML = '<p class="loading-text">Error al cargar empleados.</p>';
            return;
        }

        this.data = result.data;
        document.getElementById('stat-emp-count').textContent = this.data.length;
        this.render(this.data);
    },

    render(employees) {
        const container = document.getElementById('empleados-table-container');
        if (employees.length === 0) {
            container.innerHTML = '<p class="loading-text">No hay empleados registrados.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Cédula</th><th>Nombres</th><th>Apellidos</th><th>Cargo</th><th>Área</th><th>Sede</th><th>Estado</th><th>Acción</th></tr></thead><tbody>';
        employees.forEach(emp => {
            const estado = emp['Estado'] === 'Activo'
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-danger">Inactivo</span>';
            html += `<tr>
        <td>${emp['ID_Empleado'] || ''}</td>
        <td>${emp['Nombres'] || ''}</td>
        <td>${emp['Apellidos'] || ''}</td>
        <td>${emp['Cargo'] || ''}</td>
        <td>${emp['Area'] || ''}</td>
        <td>${emp['SedePorcicola'] || ''}</td>
        <td>${estado}</td>
        <td><button class="btn-edit" onclick="EmpleadosModule.openEdit(${emp._rowIndex})">Editar</button></td>
      </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    filter(query) {
        const q = query.toLowerCase();
        const filtered = this.data.filter(emp => {
            return String(emp['ID_Empleado'] || '').toLowerCase().includes(q)
                || String(emp['Nombres'] || '').toLowerCase().includes(q)
                || String(emp['Apellidos'] || '').toLowerCase().includes(q)
                || String(emp['Area'] || '').toLowerCase().includes(q)
                || String(emp['Cargo'] || '').toLowerCase().includes(q);
        });
        this.render(filtered);
    },

    async openNew() {
        document.getElementById('modal-empleado-title').textContent = 'Nuevo Empleado';
        document.getElementById('form-empleado').reset();
        document.getElementById('emp-edit-index').value = '';
        document.getElementById('emp-cedula').disabled = false;
        await this.loadOptions();
        openModal('modal-empleado');
    },

    async openEdit(rowIndex) {
        const emp = this.data.find(e => e._rowIndex === rowIndex);
        if (!emp) return;

        document.getElementById('modal-empleado-title').textContent = 'Editar Empleado';
        document.getElementById('emp-edit-index').value = rowIndex;
        document.getElementById('emp-cedula').value = emp['ID_Empleado'] || '';
        document.getElementById('emp-cedula').disabled = true;
        document.getElementById('emp-nombres').value = emp['Nombres'] || '';
        document.getElementById('emp-apellidos').value = emp['Apellidos'] || '';
        document.getElementById('emp-fecha').value = emp['FechaIngreso'] || '';
        document.getElementById('emp-estado').value = emp['Estado'] || 'Activo';
        document.getElementById('emp-consentimiento').value = emp['ConsentimientoLey1581'] || 'Sí';

        await this.loadOptions();

        document.getElementById('emp-cargo').value = emp['Cargo'] || '';
        document.getElementById('emp-area').value = emp['Area'] || '';
        document.getElementById('emp-sede').value = emp['SedePorcicola'] || '';

        openModal('modal-empleado');
    },

    async loadOptions() {
        const result = await api.request('getEmpleadosOptions');
        if (result && result.success) {
            populateSelect('emp-cargo', result.data.cargos);
            populateSelect('emp-area', result.data.areas);
            populateSelect('emp-sede', result.data.sedes);
        }
    },

    async save() {
        const editIndex = document.getElementById('emp-edit-index').value;
        const datos = [
            document.getElementById('emp-cedula').value.trim(),
            document.getElementById('emp-nombres').value.trim(),
            document.getElementById('emp-apellidos').value.trim(),
            document.getElementById('emp-cargo').value,
            document.getElementById('emp-area').value,
            document.getElementById('emp-sede').value,
            document.getElementById('emp-fecha').value,
            document.getElementById('emp-estado').value,
            document.getElementById('emp-consentimiento').value
        ];

        showLoader('Guardando empleado...');
        let result;

        if (editIndex) {
            result = await api.request('actualizarEmpleado', { index: parseInt(editIndex), datos });
        } else {
            result = await api.request('crearEmpleado', { datos });
        }

        hideLoader();

        if (result && result.success) {
            showToast(result.message);
            closeModal('modal-empleado');
            this.load();
        } else {
            showToast(result?.message || 'Error al guardar.', 'error');
        }
    }
};

// ===================================================================
// INVENTARIO MODULE
// ===================================================================
const InventarioModule = {
    data: [],

    async load() {
        const container = document.getElementById('inventario-table-container');
        container.innerHTML = '<p class="loading-text">Cargando inventario...</p>';

        const result = await api.request('getInventario');
        if (!result || !result.success) {
            container.innerHTML = '<p class="loading-text">Error al cargar inventario.</p>';
            return;
        }

        this.data = result.data;
        document.getElementById('stat-inv-count').textContent = this.data.length;
        this.render(this.data);
    },

    render(items) {
        const container = document.getElementById('inventario-table-container');
        if (items.length === 0) {
            container.innerHTML = '<p class="loading-text">No hay artículos en inventario.</p>';
            return;
        }

        let html = '<table><thead><tr><th>SKU</th><th>Nombre</th><th>Tipo</th><th>Stock</th><th>Mín</th><th>Unidad</th><th>Proveedor</th><th>Acción</th></tr></thead><tbody>';
        items.forEach(item => {
            const stock = parseInt(item['StockActual']) || 0;
            const min = parseInt(item['StockMinimo']) || 0;
            const stockBadge = stock <= min
                ? `<span class="badge badge-danger">${stock}</span>`
                : `<span class="badge badge-success">${stock}</span>`;

            html += `<tr>
        <td>${item['SKU'] || ''}</td>
        <td>${item['ItemNombre'] || item['Nombre'] || ''}</td>
        <td>${item['Tipo'] || ''}</td>
        <td>${stockBadge}</td>
        <td>${min}</td>
        <td>${item['Unidad'] || ''}</td>
        <td>${item['Proveedor'] || ''}</td>
        <td><button class="btn-edit" onclick="InventarioModule.openEdit(${item._rowIndex})">Editar</button></td>
      </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    filter(query) {
        const q = query.toLowerCase();
        const filtered = this.data.filter(item => {
            return String(item['SKU'] || '').toLowerCase().includes(q)
                || String(item['ItemNombre'] || item['Nombre'] || '').toLowerCase().includes(q);
        });
        this.render(filtered);
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
        document.getElementById('inv-unidad').value = item['Unidad'] || '';
        document.getElementById('inv-proveedor').value = item['Proveedor'] || '';

        openModal('modal-inventario');
    },

    async loadOptions() {
        const result = await api.request('getInventarioOptions');
        if (result && result.success) {
            populateSelect('inv-tipo', result.data.tipos);
            populateSelect('inv-unidad', result.data.unidades);
            populateSelect('inv-proveedor', result.data.proveedores);
        }
    },

    async save() {
        const editIndex = document.getElementById('inv-edit-index').value;
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

        showLoader('Guardando artículo...');
        let result;

        if (editIndex) {
            result = await api.request('actualizarArticulo', { index: parseInt(editIndex), datos });
        } else {
            result = await api.request('crearArticulo', { datos });
        }

        hideLoader();

        if (result && result.success) {
            showToast(result.message);
            closeModal('modal-inventario');
            this.load();
        } else {
            showToast(result?.message || 'Error al guardar.', 'error');
        }
    }
};

// ===================================================================
// ASSIGNMENTS MODULE
// ===================================================================
const AssignmentsModule = {
    currentStep: 1,
    employeeData: null,
    inventoryItems: [],
    lastAssignmentData: null,
    sigEmp: null,
    sigResp: null,

    init() {
        this.reset();
    },

    reset() {
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

        // Init signature pads
        setTimeout(() => {
            this.sigEmp = new SignaturePad('sig-empleado');
            this.sigResp = new SignaturePad('sig-responsable');

            document.getElementById('clear-sig-emp').onclick = () => this.sigEmp?.clear();
            document.getElementById('clear-sig-resp').onclick = () => this.sigResp?.clear();
        }, 100);
    },

    async searchEmployee() {
        const empId = document.getElementById('asig-emp-id').value.trim();
        if (!empId) {
            showToast('Ingrese la cédula del empleado.', 'warning');
            return;
        }

        showLoader('Buscando empleado...');
        const result = await api.request('getEmployee', { employeeId: empId });
        hideLoader();

        if (!result || !result.success) {
            showToast(result?.message || 'Empleado no encontrado.', 'error');
            return;
        }

        this.employeeData = result.data;
        document.getElementById('asig-emp-name').textContent =
            `${result.data['Nombres'] || ''} ${result.data['Apellidos'] || ''}`;
        document.getElementById('asig-emp-cargo').textContent = result.data['Cargo'] || '-';
        document.getElementById('asig-emp-area').textContent = result.data['Area'] || '-';
        document.getElementById('asig-emp-info').classList.remove('hidden');
        document.getElementById('asig-next-btn').classList.remove('hidden');

        // Preload inventory
        const invResult = await api.request('getInventoryItems');
        if (invResult && invResult.success) {
            this.inventoryItems = invResult.data;
            const select = document.getElementById('asig-item');
            select.innerHTML = '<option value="">Seleccione artículo...</option>';
            invResult.data.forEach(item => {
                const stock = parseInt(item['StockActual']) || 0;
                const opt = document.createElement('option');
                opt.value = item['SKU'] || '';
                opt.textContent = `${item['SKU']} - ${item['ItemNombre'] || item['Nombre'] || ''} (Stock: ${stock})`;
                opt.dataset.name = item['ItemNombre'] || item['Nombre'] || '';
                select.appendChild(opt);
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
            if (!document.getElementById('asig-item').value) {
                showToast('Seleccione un artículo EPP.', 'warning');
                return;
            }
            this.currentStep = 3;
            document.getElementById('asig-step-3').classList.remove('hidden');
            document.getElementById('asig-next-btn').classList.add('hidden');
            document.getElementById('asig-save-btn').classList.remove('hidden');

            // Reinitialize signature pads for this step
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
        const selectedItem = document.getElementById('asig-item');
        const itemName = selectedItem.options[selectedItem.selectedIndex]?.dataset?.name || '';

        const payload = {
            employeeId: this.employeeData['ID_Empleado'] || document.getElementById('asig-emp-id').value,
            sku: selectedItem.value,
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
            // Add full base64 for PDF (with data: prefix)
            this.lastAssignmentData.signature_emp_b64 = this.sigEmp ? this.sigEmp.toBase64() : '';
            this.lastAssignmentData.signature_resp_b64 = this.sigResp ? this.sigResp.toBase64() : '';

            document.getElementById('asig-result-msg').textContent = result.message;
            document.getElementById('asig-result').classList.remove('hidden');

            // Hide the flow form
            document.querySelectorAll('.asig-step, .asig-actions').forEach(el => el.classList.add('hidden'));

            showToast(result.message);
        } else {
            showToast(result?.message || 'Error al guardar asignación.', 'error');
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
// RETURNS MODULE
// ===================================================================
const ReturnsModule = {
    employeeId: '',

    reset() {
        this.employeeId = '';
        document.getElementById('dev-emp-id').value = '';
        document.getElementById('dev-assignments').classList.add('hidden');
        document.getElementById('dev-form-container').classList.add('hidden');
        document.getElementById('dev-result').classList.add('hidden');
    },

    async searchAssignments() {
        const empId = document.getElementById('dev-emp-id').value.trim();
        if (!empId) {
            showToast('Ingrese la cédula del empleado.', 'warning');
            return;
        }

        this.employeeId = empId;
        showLoader('Buscando asignaciones...');
        const result = await api.request('getEmployeeAssignments', { employeeId: empId });
        hideLoader();

        if (!result || !result.success) {
            showToast(result?.message || 'Error al buscar.', 'error');
            return;
        }

        const container = document.getElementById('dev-assignments-list');
        if (result.data.length === 0) {
            container.innerHTML = '<p class="loading-text">No hay asignaciones para este empleado.</p>';
        } else {
            let html = '<table><thead><tr><th>ID</th><th>Fecha</th><th>SKU</th><th>Artículo</th><th>Cant</th><th>Acción</th></tr></thead><tbody>';
            result.data.forEach(asig => {
                html += `<tr>
          <td>${asig.ID_Asignacion}</td>
          <td>${asig.Timestamp}</td>
          <td>${asig.SKU}</td>
          <td>${asig.ItemNombre}</td>
          <td>${asig.Cantidad}</td>
          <td><button class="dev-select-btn" onclick="ReturnsModule.selectAssignment('${asig.ID_Asignacion}', '${asig.SKU}')">Seleccionar</button></td>
        </tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
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
    },

    async processReturn() {
        const payload = {
            asigOriginalId: document.getElementById('dev-asig-id').value,
            employeeId: this.employeeId,
            sku: document.getElementById('dev-sku').value,
            quantityReturned: parseInt(document.getElementById('dev-quantity').value) || 1,
            itemCondition: document.getElementById('dev-condition').value,
            notes: document.getElementById('dev-notes').value
        };

        showLoader('Procesando devolución...');
        const result = await api.request('processReturn', payload);
        hideLoader();

        if (result && result.success) {
            document.getElementById('dev-result-msg').textContent = result.message;
            document.getElementById('dev-form-container').classList.add('hidden');
            document.getElementById('dev-assignments').classList.add('hidden');
            document.getElementById('dev-result').classList.remove('hidden');
            showToast(result.message);
        } else {
            showToast(result?.message || 'Error al procesar devolución.', 'error');
        }
    }
};

// ===================================================================
// INIT
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
