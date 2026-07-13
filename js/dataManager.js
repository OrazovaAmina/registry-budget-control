// DataManager - модуль для работы с данными в локальной системе
class DataManager {
    constructor() {
        this.contracts = [];
        this.suppliers = [];
        this.departments = [];
        this.users = [];
        this.logs = [];
        this.init();
    }

    async init() {
        this.loadData();
    }

    // Загрузка данных из localStorage
    loadData() {
        try {
            this.contracts = JSON.parse(localStorage.getItem('registry_contracts')) || [];
            this.suppliers = JSON.parse(localStorage.getItem('registry_suppliers')) || [];
            this.departments = JSON.parse(localStorage.getItem('registry_departments')) || [];
            this.users = JSON.parse(localStorage.getItem('registry_users')) || [];
            this.logs = JSON.parse(localStorage.getItem('registry_logs')) || [];
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            // Инициализация пустыми массивами при первой загрузке
            this.contracts = [];
            this.suppliers = [];
            this.departments = [];
            this.users = [];
            this.logs = [];
        }
    }

    // Сохранение данных в localStorage
    saveData() {
        localStorage.setItem('registry_contracts', JSON.stringify(this.contracts));
        localStorage.setItem('registry_suppliers', JSON.stringify(this.suppliers));
        localStorage.setItem('registry_departments', JSON.stringify(this.departments));
        localStorage.setItem('registry_users', JSON.stringify(this.users));
        localStorage.setItem('registry_logs', JSON.stringify(this.logs));
    }

    // Сохранение данных в JSON файл (через download)
    saveDataToFile(filename, data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // CRUD операции для договоров
    addContract(contract) {
        const newContract = {
            id: this.generateId(),
            ...contract,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Автоматический расчет экономии
        newContract.economy = this.calculateEconomy(contract.plannedAmount, contract.contractAmount);
        newContract.overrun = this.calculateOverrun(contract.plannedAmount, contract.contractAmount);
        newContract.economyPercent = this.calculateEconomyPercent(contract.plannedAmount, contract.contractAmount);
        
        this.contracts.push(newContract);
        this.saveData();
        this.logAction('CREATE', 'contract', newContract.id);
        return newContract;
    }

    updateContract(id, updates) {
        const index = this.contracts.findIndex(c => c.id === id);
        if (index === -1) return null;

        const updatedContract = {
            ...this.contracts[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Пересчет экономии при изменении сумм
        if (updates.plannedAmount !== undefined || updates.contractAmount !== undefined) {
            const planned = updates.plannedAmount !== undefined ? updates.plannedAmount : this.contracts[index].plannedAmount;
            const contract = updates.contractAmount !== undefined ? updates.contractAmount : this.contracts[index].contractAmount;
            updatedContract.economy = this.calculateEconomy(planned, contract);
            updatedContract.overrun = this.calculateOverrun(planned, contract);
            updatedContract.economyPercent = this.calculateEconomyPercent(planned, contract);
        }

        this.contracts[index] = updatedContract;
        this.saveData();
        this.logAction('UPDATE', 'contract', id);
        return updatedContract;
    }

    deleteContract(id) {
        const index = this.contracts.findIndex(c => c.id === id);
        if (index === -1) return false;

        this.contracts.splice(index, 1);
        this.saveData();
        this.logAction('DELETE', 'contract', id);
        return true;
    }

    getContract(id) {
        return this.contracts.find(c => c.id === id);
    }

    getAllContracts() {
        return this.contracts;
    }

    // Фильтрация договоров
    filterContracts(filters) {
        return this.contracts.filter(contract => {
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchableText = `${contract.contractNumber} ${contract.subject} ${contract.supplier} ${contract.bin}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) return false;
            }

            if (filters.status && contract.status !== filters.status) return false;
            if (filters.department && contract.department !== filters.department) return false;
            if (filters.supplier && contract.supplier !== filters.supplier) return false;
            if (filters.dateFrom && new Date(contract.date) < new Date(filters.dateFrom)) return false;
            if (filters.dateTo && new Date(contract.date) > new Date(filters.dateTo)) return false;

            return true;
        });
    }

    // CRUD операции для поставщиков
    addSupplier(supplier) {
        const newSupplier = {
            id: this.generateId(),
            ...supplier,
            createdAt: new Date().toISOString()
        };
        this.suppliers.push(newSupplier);
        this.saveData();
        this.logAction('CREATE', 'supplier', newSupplier.id);
        return newSupplier;
    }

    updateSupplier(id, updates) {
        const index = this.suppliers.findIndex(s => s.id === id);
        if (index === -1) return null;

        this.suppliers[index] = { ...this.suppliers[index], ...updates };
        this.saveData();
        this.logAction('UPDATE', 'supplier', id);
        return this.suppliers[index];
    }

    deleteSupplier(id) {
        const index = this.suppliers.findIndex(s => s.id === id);
        if (index === -1) return false;

        this.suppliers.splice(index, 1);
        this.saveData();
        this.logAction('DELETE', 'supplier', id);
        return true;
    }

    getAllSuppliers() {
        return this.suppliers;
    }

    // CRUD операции для подразделений
    addDepartment(department) {
        const newDepartment = {
            id: this.generateId(),
            ...department,
            createdAt: new Date().toISOString()
        };
        this.departments.push(newDepartment);
        this.saveData();
        this.logAction('CREATE', 'department', newDepartment.id);
        return newDepartment;
    }

    updateDepartment(id, updates) {
        const index = this.departments.findIndex(d => d.id === id);
        if (index === -1) return null;

        this.departments[index] = { ...this.departments[index], ...updates };
        this.saveData();
        this.logAction('UPDATE', 'department', id);
        return this.departments[index];
    }

    deleteDepartment(id) {
        const index = this.departments.findIndex(d => d.id === id);
        if (index === -1) return false;

        this.departments.splice(index, 1);
        this.saveData();
        this.logAction('DELETE', 'department', id);
        return true;
    }

    getAllDepartments() {
        return this.departments;
    }

    // Расчет экономии
    calculateEconomy(plannedAmount, contractAmount) {
        const planned = parseFloat(plannedAmount) || 0;
        const contract = parseFloat(contractAmount) || 0;
        return Math.max(0, planned - contract);
    }

    // Расчет перерасхода
    calculateOverrun(plannedAmount, contractAmount) {
        const planned = parseFloat(plannedAmount) || 0;
        const contract = parseFloat(contractAmount) || 0;
        return Math.max(0, contract - planned);
    }

    // Расчет процента экономии
    calculateEconomyPercent(plannedAmount, contractAmount) {
        const planned = parseFloat(plannedAmount) || 0;
        if (planned === 0) return 0;
        const economy = this.calculateEconomy(plannedAmount, contractAmount);
        return ((economy / planned) * 100).toFixed(2);
    }

    // Статистика
    getStatistics() {
        const totalContracts = this.contracts.length;
        const totalPlanned = this.contracts.reduce((sum, c) => sum + (parseFloat(c.plannedAmount) || 0), 0);
        const totalContract = this.contracts.reduce((sum, c) => sum + (parseFloat(c.contractAmount) || 0), 0);
        const totalEconomy = this.contracts.reduce((sum, c) => sum + (parseFloat(c.economy) || 0), 0);
        const totalOverrun = this.contracts.reduce((sum, c) => sum + (parseFloat(c.overrun) || 0), 0);

        const statusCounts = this.contracts.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
        }, {});

        return {
            totalContracts,
            totalPlanned,
            totalContract,
            totalEconomy,
            totalOverrun,
            statusCounts,
            economyPercent: totalPlanned > 0 ? ((totalEconomy / totalPlanned) * 100).toFixed(2) : 0
        };
    }

    // Логирование действий
    logAction(action, entityType, entityId) {
        const logEntry = {
            id: this.generateId(),
            action,
            entityType,
            entityId,
            timestamp: new Date().toISOString(),
            user: 'current_user' // Можно расширить для системы авторизации
        };
        this.logs.push(logEntry);
        this.saveData();
    }

    getLogs() {
        return this.logs;
    }

    // Экспорт данных
    exportToCSV(data, filename) {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Импорт данных из CSV
    importFromCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index];
            });
            return obj;
        }).filter(obj => Object.keys(obj).length > 0);
    }

    // Резервное копирование
    createBackup() {
        const backupData = {
            contracts: this.contracts,
            suppliers: this.suppliers,
            departments: this.departments,
            users: this.users,
            logs: this.logs,
            backupDate: new Date().toISOString()
        };

        const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
        this.saveDataToFile(filename, backupData);
        this.logAction('BACKUP', 'system', 'all');
    }

    // Восстановление из резервной копии
    restoreFromBackup(backupData) {
        if (backupData.contracts) this.contracts = backupData.contracts;
        if (backupData.suppliers) this.suppliers = backupData.suppliers;
        if (backupData.departments) this.departments = backupData.departments;
        if (backupData.users) this.users = backupData.users;
        if (backupData.logs) this.logs = backupData.logs;
        
        this.saveData();
        this.logAction('RESTORE', 'system', 'all');
    }

    // Генерация уникального ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Глобальный экземпляр DataManager
const dataManager = new DataManager();
