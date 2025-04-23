import { createApp } from 'vue';
const config = {
  // Business configuration
  businessName: "BeautySalon",
  businessHoursStart: 9, // 9 AM
  businessHoursEnd: 19, // 7 PM
  
  // Tax configuration
  taxRate: 18, // 16% IVA
  applyTax: false, // Whether to apply tax
  
  // Currency configuration
  currency: "DOP", // DOP (Dominican Peso) or USD (US Dollar)
  currencySymbol: "RD$", // RD$ for Dominican Peso, $ for USD
  
  // Categories for services
  serviceCategories: [
    "Corte de Cabello",
    "Peinado",
    "Color",
    "Tratamiento",
    "Uñas",
    "Maquillaje",
    "Depilación",
    "Masaje",
    "Facial"
  ],
  // Availability configuration
  unavailableDays: [], // Array of weekdays (0 = Sunday, 1 = Monday, etc.)
  unavailableHours: [], // Array of hours (integers)
  
  // Firebase configuration
  firebase: {
    apiKey: "AIzaSyDF0fwRZJUQfI1x0V16zmsmw6Jbe2p06jw",
    authDomain: "personal-apps-db.firebaseapp.com",
    databaseURL: "https://personal-apps-db-default-rtdb.firebaseio.com",
    projectId: "personal-apps-db",
    storageBucket: "personal-apps-db.firebasestorage.app",
    messagingSenderId: "312063054436",
    appId: "1:312063054436:web:a4fa64a32f263f7a534571",
    measurementId: "G-RWNL3MJN8J"
  }
};
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, addDoc, 
  updateDoc, deleteDoc, doc, setDoc, query, where
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  getAuth, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "firebase/auth";

// Initialize Firebase
const firebaseApp = initializeApp(config.firebase);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

const app = createApp({
  data() {
    return {
      // App state
      currentView: 'login',
      activeModal: null,
      errorMessage: null,
      
      // User authentication
      user: null,
      loginEmail: '',
      loginPassword: '',
      registerEmail: '',
      registerPassword: '',
      
      // Calendar data
      selectedDate: new Date(),
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear(),
      weekdays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      businessHours: Array.from({length: config.businessHoursEnd - config.businessHoursStart}, (_, i) => i + config.businessHoursStart),
      
      // Catalog data
      services: [],
      catalogFilter: 'all',
      serviceCategories: config.serviceCategories,
      
      // Clients data
      clients: [],
      clientSearch: '',
      clientSortField: 'name',
      clientSortDirection: 'asc',
      
      // Appointments data
      appointments: [],
      editingAppointment: {
        id: null,
        date: null,
        time: null,
        clientId: '',
        serviceId: '',
        notes: '',
        status: 'pending'
      },
      
      // Services/catalog data
      editingService: {
        id: null,
        name: '',
        category: config.serviceCategories[0],
        price: 0,
        duration: 30,
        description: '',
        color: '#4a90e2',
        icon: 'M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,11.71 4.03,11.43 4.07,11.15C5.02,12.45 6.23,13.14 7.5,13.14C9.09,13.14 10.23,11.83 11.5,11.83C12.69,11.83 13.42,12.63 14.67,12.63C15.85,12.63 16.74,12.03 17.73,11.04C18.28,11.88 18.59,12.93 18.59,14.03C18.59,17.28 15.63,20 12,20Z',
        imageUrl: '',
        imageFile: null
      },
      
      // Client data
      editingClient: {
        id: null,
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        balance: 0,
        createdAt: null
      },
      
      // Payments/Invoices data
      currentInvoice: {
        clientId: '',
        items: [{
          serviceId: '',
          quantity: 1
        }],
        paymentMethod: 'cash'
      },
      paymentTab: 'new',
      invoices: [],
      invoiceFilters: {
        startDate: this.formatDateForInput(new Date(new Date().setMonth(new Date().getMonth() - 1))),
        endDate: this.formatDateForInput(new Date()),
        status: 'all'
      },
      nextInvoiceNumber: 1001,
      
      // Client payments
      selectedClient: null,
      paymentAmount: 0,
      paymentMethod: 'cash',
      paymentNote: '',
      
      // Client history
      clientHistory: {
        visits: 0,
        totalSpent: 0,
        transactions: [],
        appointments: []
      },
      historyTab: 'transactions',
      
      // Reports
      reportTab: 'sales',
      reportPeriod: 'month',
      reportFilters: {
        startDate: this.formatDateForInput(new Date(new Date().setDate(1))),
        endDate: this.formatDateForInput(new Date())
      },
      
      // Invoice view
      selectedInvoice: null,
      
      // Translations
      paymentMethodTranslation: {
        'cash': 'Efectivo',
        'card': 'Tarjeta',
        'transfer': 'Transferencia',
        'credit': 'Crédito'
      },
      appointmentStatusTranslation: {
        'pending': 'Pendiente',
        'completed': 'Completado',
        'canceled': 'Cancelado',
        'confirmed': 'Agendada',
        'realizada': 'Realizada',
        'facturada': 'Facturada'
      },
      
      // Setup for Firebase
      isLoading: true,
      dbInitialized: false,
      
      // Configuration-dependent translations
      currencyDisplay: config.currencySymbol,
      
      // New properties
      notifications: [],
      notifiedAppointments: [],
      settings: {
        unavailableDays: [], // días (0=Dom, 1=Lun, …, 6=Sáb)
        unavailableHours: [] // horas en números (ej. 13, 14)
      },
      unavailableHoursInput: '', // cadena para editar horas no laborables
      specificUnavailableSlots: [],
      alarms: [],
      newAlarm: { repeating: false, date: '', weekDay: '0', startHour: 0, endHour: 0 },
      pendingAppointmentRequests: [],
    };
  },
  computed: {
    // Calendar computed properties
    currentMonthName() {
      return new Date(this.currentYear, this.currentMonth, 1).toLocaleString('es', { month: 'long' });
    },
    
    calendarDays() {
      const days = [];
      
      // Get first day of month
      const firstDay = new Date(this.currentYear, this.currentMonth, 1);
      const startingDayOfWeek = firstDay.getDay();
      
      // Get last day of month
      const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
      const totalDays = lastDay.getDate();
      
      // Get last day of previous month
      const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
      
      // Fill in days from previous month
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const date = new Date(this.currentYear, this.currentMonth - 1, day);
        days.push({
          day,
          date,
          otherMonth: true,
          isToday: this.isToday(date)
        });
      }
      
      // Fill in days of current month
      const today = new Date();
      for (let i = 1; i <= totalDays; i++) {
        const date = new Date(this.currentYear, this.currentMonth, i);
        days.push({
          day: i,
          date,
          otherMonth: false,
          isToday: this.isToday(date)
        });
      }
      
      // Fill in days from next month
      const remainingDays = 42 - days.length; // 6 rows of 7 days
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(this.currentYear, this.currentMonth + 1, i);
        days.push({
          day: i,
          date,
          otherMonth: true,
          isToday: this.isToday(date)
        });
      }
      
      return days;
    },
    
    // Catalog computed properties
    filteredServices() {
      if (this.catalogFilter === 'all') {
        return this.services;
      }
      return this.services.filter(service => service.category === this.catalogFilter);
    },
    
    // Client computed properties
    filteredClients() {
      let filtered = [...this.clients];
      
      if (this.clientSearch) {
        const search = this.clientSearch.toLowerCase();
        filtered = filtered.filter(client => 
          client.name.toLowerCase().includes(search) ||
          client.phone.includes(search) ||
          client.email.toLowerCase().includes(search)
        );
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        let comparison = 0;
        
        if (a[this.clientSortField] < b[this.clientSortField]) {
          comparison = -1;
        } else if (a[this.clientSortField] > b[this.clientSortField]) {
          comparison = 1;
        }
        
        return this.clientSortDirection === 'asc' ? comparison : -comparison;
      });
      
      return filtered;
    },
    
    // Invoice computed properties
    isInvoiceValid() {
      if (!this.currentInvoice.clientId) return false;
      
      // Check if at least one item is selected
      const hasValidItems = this.currentInvoice.items.some(item => 
        item.serviceId && item.quantity > 0
      );
      
      return hasValidItems;
    },
    
    filteredInvoices() {
      let filtered = [...this.invoices];
      
      // Apply date filters
      if (this.invoiceFilters.startDate && this.invoiceFilters.endDate) {
        const startDate = new Date(this.invoiceFilters.startDate);
        const endDate = new Date(this.invoiceFilters.endDate);
        endDate.setHours(23, 59, 59); // Include the entire end day
        
        filtered = filtered.filter(invoice => {
          const invoiceDate = new Date(invoice.date);
          return invoiceDate >= startDate && invoiceDate <= endDate;
        });
      }
      
      // Apply status filter
      if (this.invoiceFilters.status !== 'all') {
        if (this.invoiceFilters.status === 'paid') {
          filtered = filtered.filter(invoice => invoice.paymentMethod !== 'credit' || invoice.status === 'paid');
        } else {
          filtered = filtered.filter(invoice => invoice.paymentMethod === 'credit' && invoice.status === 'pending');
        }
      }
      
      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return filtered;
    },
    
    // Payment validation
    isPaymentValid() {
      return this.selectedClient && 
             this.paymentAmount > 0 && 
             this.paymentAmount <= this.selectedClient.balance &&
             this.paymentMethod;
    },
    
    // Service validation
    isServiceValid() {
      return this.editingService.name && 
             this.editingService.category && 
             this.editingService.price > 0 && 
             this.editingService.duration > 0;
    },
    
    // Client validation
    isClientValid() {
      return this.editingClient.name && this.editingClient.phone;
    },
    
    // Appointment validation
    isAppointmentValid() {
      return this.editingAppointment.clientId && this.editingAppointment.serviceId;
    },
    
    // Reports computed properties
    filteredSalesInvoices() {
      const start = new Date(this.reportFilters.startDate);
      const end = new Date(this.reportFilters.endDate);
      end.setHours(23, 59, 59, 999);
      return this.invoices.filter(invoice => new Date(invoice.date) >= start && new Date(invoice.date) <= end);
    },

    salesChartData() {
      if (this.reportPeriod === 'day') {
        // Group invoices by hour using real data
        const startHour = this.businessHours[0] || 9;
        const endHour = config.businessHoursEnd;
        const groups = {};
        for (let hr = startHour; hr < endHour; hr++) {
          groups[hr] = 0;
        }
        this.filteredSalesInvoices.forEach(invoice => {
          const hr = new Date(invoice.date).getHours();
          if (hr >= startHour && hr < endHour) {
            groups[hr] += invoice.total;
          }
        });
        const chartData = [];
        for (let hr = startHour; hr < endHour; hr++) {
          chartData.push({ label: `${hr}:00`, value: groups[hr] });
        }
        return chartData;
      } else if (this.reportPeriod === 'week') {
        // Group invoices by day of week
        const groups = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        this.filteredSalesInvoices.forEach(invoice => {
          const day = new Date(invoice.date).getDay();
          groups[day] += invoice.total;
        });
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return dayNames.map((name, idx) => ({ label: name, value: groups[idx] }));
      } else if (this.reportPeriod === 'month') {
        // Group invoices by week of the month
        const groups = {};
        this.filteredSalesInvoices.forEach(invoice => {
          const weekNum = Math.floor((new Date(invoice.date).getDate() - 1) / 7) + 1;
          groups[weekNum] = (groups[weekNum] || 0) + invoice.total;
        });
        const weeks = Object.keys(groups).sort((a, b) => a - b);
        return weeks.map(week => ({ label: `Semana ${week}`, value: groups[week] }));
      } else if (this.reportPeriod === 'year') {
        // Group invoices by month
        const groups = {};
        for (let m = 0; m < 12; m++) {
          groups[m] = 0;
        }
        this.filteredSalesInvoices.forEach(invoice => {
          const m = new Date(invoice.date).getMonth();
          groups[m] += invoice.total;
        });
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return monthNames.map((name, m) => ({ label: name, value: groups[m] }));
      } else {
        return [];
      }
    },

    calculateTotalSales() {
      // Sum total sales from the filtered invoices
      return this.filteredSalesInvoices.reduce((total, invoice) => total + invoice.total, 0);
    },

    calculateTotalServices() {
      // Count the total quantity of services provided within the filtered invoices
      let total = 0;
      this.filteredSalesInvoices.forEach(invoice => {
        if (invoice.items && Array.isArray(invoice.items)) {
          invoice.items.forEach(item => {
            total += item.quantity;
          });
        }
      });
      return total;
    },

    calculateUniqueClients() {
      // Count unique clients from the filtered invoices
      const uniqueClients = new Set();
      this.filteredSalesInvoices.forEach(invoice => {
        if (invoice.clientId) uniqueClients.add(invoice.clientId);
      });
      return uniqueClients.size;
    },

    chartYAxisValues() {
      const maxSales = Math.max(...this.salesChartData.map(d => d.value));
      const step = Math.ceil(maxSales / 5);
      return [0, step, step * 2, step * 3, step * 4, step * 5].filter(v => v <= maxSales * 1.1);
    },

    clientsWithDebt() {
      return this.clients.filter(client => client.balance > 0)
        .sort((a, b) => b.balance - a.balance);
    },
    
    calculateBarHeight(value) {
      const num = Number(value);
      const max = Math.max(...this.salesChartData.map(d => Number(d.value)));
      if (isNaN(num) || max === 0 || isNaN(max)) {
        return 0;
      }
      return (num / max) * 100;
    },
    
    topServices() {
      // This would analyze invoices to find the most popular services
      // For demonstration, we'll create sample data
      const serviceCounts = {};
      this.filteredSalesInvoices.forEach(invoice => {
        invoice.items.forEach(item => {
          if (!serviceCounts[item.serviceId]) {
            serviceCounts[item.serviceId] = { count: 0, revenue: 0 };
          }
          serviceCounts[item.serviceId].count += item.quantity;
          serviceCounts[item.serviceId].revenue += item.price * item.quantity;
        });
      });

      // Convert serviceCounts to an array of objects
      const topServices = Object.entries(serviceCounts).map(([serviceId, { count, revenue }]) => {
        const service = this.getServiceById(serviceId);
        return {
          name: service ? service.name : 'Unknown Service',
          count,
          revenue
        };
      }).sort((a, b) => b.revenue - a.revenue);

      return topServices;
    },
    
    topClients() {
      // This would analyze invoices to find the best clients
      const clientSpending = {};
      this.filteredSalesInvoices.forEach(invoice => {
        const clientId = invoice.clientId;
        if (!clientSpending[clientId]) {
          clientSpending[clientId] = { visits: 0, totalSpent: 0 };
        }
        clientSpending[clientId].visits++;
        clientSpending[clientId].totalSpent += invoice.total;
      });

      // Convert clientSpending to an array of objects
      const topClients = Object.entries(clientSpending).map(([clientId, { visits, totalSpent }]) => {
        const client = this.getClientById(clientId);
        return {
          name: client ? client.name : 'Unknown Client',
          visits,
          totalSpent
        };
      }).sort((a, b) => b.totalSpent - a.totalSpent);

      return topClients;
    },
    
    calculateTax(){
      
    },
  calculateTotal() {
    return config.applyTax ? this.calculateSubtotal() * (1 + config.taxRate / 100) : this.calculateSubtotal(); // Si el impuesto es del 18%
  },

  unreadNotificationsCount() {
    return this.notifications.filter(n => !n.read).length;
  }
  },
  
  watch: {
    user(newUser, oldUser) {
      if (newUser) {
        this.fetchDataFromFirebase();
        this.currentView = 'appointments'; // Redirect to appointments after login
      } else {
        this.clearData();
        this.currentView = 'login'; // Redirect to login after logout
      }
    }
  },
  
  methods: {
    // Error Handling
    showError(message) {
      this.errorMessage = message;
      setTimeout(() => {
        this.errorMessage = null;
      }, 5000); // Clear after 5 seconds
    },

    // Logging methods
    log(message) {
      console.log(`[LOG] ${message}`);
    },

    warn(message) {
      console.warn(`[WARN] ${message}`);
    },

    error(message) {
      console.error(`[ERROR] ${message}`);
      this.showError(message);
    },

    // Authentication methods
    async fetchDataFromFirebase() {
      try {
        this.isLoading = true;
        
        // Load services from Firestore
        const servicesSnapshot = await getDocs(query(collection(db, 'services'), where("userId", "==", this.user.uid)));
        if (!servicesSnapshot.empty) {
          this.services = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          this.log(`Loaded ${this.services.length} services.`);
        } else {
          this.services = [];
          this.log("No services found.");
        }
        
        // Load clients from Firestore
        const clientsSnapshot = await getDocs(query(collection(db, 'clients'), where("userId", "==", this.user.uid)));
        if (!clientsSnapshot.empty) {
          this.clients = clientsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          this.log(`Loaded ${this.clients.length} clients.`);
        } else {
          this.clients = [];
          this.log("No clients found.");
        }
        
        // Load appointments from Firestore
        const appointmentsSnapshot = await getDocs(query(collection(db, 'appointments'), where("userId", "==", this.user.uid)));
        this.appointments = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: new Date(doc.data().date) // Ensure date is a Date object
        }));
        this.log(`Loaded ${this.appointments.length} appointments.`);
        
        // Load invoices from Firestore
        const invoicesSnapshot = await getDocs(query(collection(db, 'invoices'), where("userId", "==", this.user.uid)));
        this.invoices = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: new Date(doc.data().date) // Ensure date is a Date object
        }));
        this.log(`Loaded ${this.invoices.length} invoices.`);
        
        // Load transactions from Firestore
        const transactionsSnapshot = await getDocs(query(collection(db, 'transactions'), where("userId", "==", this.user.uid)));
        this.transactions = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.log(`Loaded ${this.transactions.length} transactions.`);
        
      } catch (error) {
        this.error(`Error fetching data from Firebase: ${error.message}`);
      } finally {
        this.isLoading = false;
        this.log("Data fetching completed.");
      }
    },
    
    async register() {
      try {
        this.log("Registering user...");
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          this.registerEmail,
          this.registerPassword
        );
        this.user = userCredential.user;
        this.registerEmail = '';
        this.registerPassword = '';
        this.log(`User registered: ${this.user.uid}`);
        
        // After successful registration, fetch data and switch to appointments view
        if (this.user) {
            await this.fetchDataFromFirebase();
            this.currentView = 'appointments';
        }
      } catch (error) {
        this.error(`Error registering user: ${error.message}`);
      }
    },
    
    async login() {
      try {
        this.log("Logging in user...");
        const userCredential = await signInWithEmailAndPassword(
          auth,
          this.loginEmail,
          this.loginPassword
        );
        this.user = userCredential.user;
        this.loginEmail = '';
        this.loginPassword = '';
        this.log(`User logged in: ${this.user.uid}`);
        
        // After successful login, fetch data and switch to appointments view
        if (this.user) {
            await this.fetchDataFromFirebase();
            this.currentView = 'appointments';
        }
      } catch (error) {
        this.error(`Error logging in: ${error.message}`);
      }
    },
    
    async logout() {
      try {
        this.log("Logging out user...");
        await signOut(auth);
        this.user = null;
        this.log("User logged out.");
      } catch (error) {
        this.error(`Error logging out: ${error.message}`);
      }
    },
    
    clearData() {
      this.log("Clearing all data...");
      this.services = [];
      this.clients = [];
      this.appointments = [];
      this.invoices = [];
      this.transactions = [];
      this.selectedDate = new Date();
      this.currentMonth = new Date().getMonth();
      this.currentYear = new Date().getFullYear();
      this.editingAppointment = {
        id: null,
        date: null,
        time: null,
        clientId: '',
        serviceId: '',
        notes: '',
        status: 'pending'
      };
      this.editingService = {
        id: null,
        name: '',
        category: this.serviceCategories[0],
        price: 0,
        duration: 30,
        description: '',
        color: '#4a90e2',
        icon: 'M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,11.71 4.03,11.43 4.07,11.15C5.02,12.45 6.23,13.14 7.5,13.14C9.09,13.14 10.23,11.83 11.5,11.83C12.69,11.83 13.42,12.63 14.67,12.63C15.85,12.63 16.74,12.03 17.73,11.04C18.28,11.88 18.59,12.93 18.59,14.03C18.59,17.28 15.63,20 12,20Z',
        imageUrl: '',
        imageFile: null
      };
      this.editingClient = {
        id: null,
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        balance: 0,
        createdAt: null
      };
      this.currentInvoice = {
        clientId: '',
        items: [{
          serviceId: '',
          quantity: 1
        }],
        paymentMethod: 'cash'
      };
      this.paymentTab = 'new';
      this.invoices = [];
      this.invoiceFilters = {
        startDate: this.formatDateForInput(new Date(new Date().setMonth(new Date().getMonth() - 1))),
        endDate: this.formatDateForInput(new Date()),
        status: 'all'
      };
      this.selectedClient = null;
      this.paymentAmount = 0;
      this.paymentMethod = 'cash';
      this.paymentNote = '';
      this.clientHistory = {
        visits: 0,
        totalSpent: 0,
        transactions: [],
        appointments: []
      };
      this.historyTab = 'transactions';
      this.reportTab = 'sales';
      this.reportPeriod = 'month';
      this.reportFilters = {
        startDate: this.formatDateForInput(new Date(new Date().setDate(1))),
        endDate: this.formatDateForInput(new Date())
      };
      this.selectedInvoice = null;
      this.isLoading = false;
      this.log("Data cleared.");
    },
    // Calendar methods
    previousMonth() {
      if (this.currentMonth === 0) {
        this.currentMonth = 11;
        this.currentYear--;
      } else {
        this.currentMonth--;
      }
    },
    
    nextMonth() {
      if (this.currentMonth === 11) {
        this.currentMonth = 0;
        this.currentYear++;
      } else {
        this.currentMonth++;
      }
    },
    
    isToday(date) {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    },
    
    selectDate(date) {
      this.selectedDate = date;
    },
    
    formatDate(date) {
      if (!(date instanceof Date)) {
        console.error('Invalid date object passed to formatDate:', date);
        return 'Fecha inválida'; // Or some other default value
      }
      return date.toLocaleDateString('es', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    },
    
    formatDateForInput(date) {
      return date.toISOString().split('T')[0];
    },
    
    hasAppointments(date) {
      return this.appointments.some(appointment => {
        if (!appointment.date) return false; // Check if date is valid

        const appointmentDate = new Date(appointment.date);
        return appointmentDate.getDate() === date.getDate() &&
               appointmentDate.getMonth() === date.getMonth() &&
               appointmentDate.getFullYear() === date.getFullYear();
      });
    },
    
    isTimeSlotOccupied(date, hour) {
      return this.appointments.some(appointment => {
        if (!appointment.date) return false; // Check if date is valid

        const appointmentDate = new Date(appointment.date);
        return appointmentDate.getDate() === date.getDate() &&
               appointmentDate.getMonth() === date.getMonth() &&
               appointmentDate.getFullYear() === date.getFullYear() &&
               appointment.time === hour;
      });
    },
    
    getAppointment(date, hour) {
      return this.appointments.find(appointment => {
        if (!appointment.date) return false; // Check if date is valid

        const appointmentDate = new Date(appointment.date);
        return appointmentDate.getDate() === date.getDate() &&
               appointmentDate.getMonth() === date.getMonth() &&
               appointmentDate.getFullYear() === date.getFullYear() &&
               appointment.time === hour;
      });
    },
    
    // Appointment methods
    openAppointmentModal(date, time) {
      if (this.isSlotDisabled(date, time)) {
        this.addNotification("No se puede agendar cita en una fecha/hora no laborable o pasada.");
        return;
      }
      // Si existe una cita en ese horario, edítala; de lo contrario, crea una nueva
      const existingAppointment = this.getAppointment(date, time);
      if (existingAppointment) {
        this.editingAppointment = { ...existingAppointment };
      } else {
        this.editingAppointment = {
          id: null,
          date: date,
          time: time,
          clientId: '',
          serviceId: '',
          notes: '',
          status: 'pending'
        };
      }
      this.activeModal = 'appointment';
    },
    
    async saveAppointment() {
      const isAppointmentValidBl = this.isAppointmentValid;
      if (!isAppointmentValidBl) {
          this.warn("Appointment data is invalid. Cannot save.");
          return;
      }

      let appointment = { ...this.editingAppointment };
      appointment.date = appointment.date.toISOString();
      appointment.userId = this.user.uid;

      this.log(`Saving appointment: ${JSON.stringify(appointment)}`);

      try {
          if (appointment.id) {
              // 
              this.log(`Updating appointment with ID: ${appointment.id}`);
              const appointmentRef = doc(db, 'appointments', appointment.id);
              await updateDoc(appointmentRef, appointment);

              // 
              const index = this.appointments.findIndex(a => a.id === appointment.id);
              if (index !== -1) {
                  this.appointments[index] = { ...appointment, date: new Date(appointment.date) };
                  this.log("Appointment updated successfully.");
              } else {
                  this.warn(`Appointment with ID ${appointment.id} not found in local array.`);
              }
          } else {
              // 
              this.log("Creating new appointment...");

              const docRef = doc(collection(db, 'appointments')); // Firestore 
              appointment.id = docRef.id;

              // 
              await setDoc(docRef, appointment);

              // 
              this.appointments.push({ ...appointment, date: new Date(appointment.date) });

              this.log(`Appointment created with ID: ${appointment.id}`);
          }
      } catch (error) {
          this.error(`Error saving appointment: ${error.message}`);
          // 
          this.saveToLocalStorage();
      }
      
      this.closeModal();
    },
    
    async deleteAppointment() {
      if (!this.editingAppointment.id) {
        this.warn("No appointment ID provided. Cannot delete.");
        return;
      }
      
      this.log(`Deleting appointment with ID: ${this.editingAppointment.id}`);

      try {
        await deleteDoc(doc(db, 'appointments', this.editingAppointment.id));
        const index = this.appointments.findIndex(a => a.id === this.editingAppointment.id);
        if (index !== -1) {
          this.appointments.splice(index, 1);
          this.log("Appointment deleted successfully.");
        } else {
          this.warn(`Appointment with ID ${this.editingAppointment.id} not found in local array.`);
        }
      } catch (error) {
        this.error(`Error deleting appointment: ${error.message}`);
        // 
        this.saveToLocalStorage();
      }
      
      this.closeModal();
    },
    
    // Service/catalog methods
    openServiceModal(service = null) {
      if (service) {
        this.editingService = { ...service };
      } else {
        this.editingService = {
          id: null,
          name: '',
          category: this.serviceCategories[0],
          price: 0,
          duration: 30,
          description: '',
          color: '#4a90e2',
          icon: 'M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,11.71 4.03,11.43 4.07,11.15C5.02,12.45 6.23,13.14 7.5,13.14C9.09,13.14 10.23,11.83 11.5,11.83C12.69,11.83 13.42,12.63 14.67,12.63C15.85,12.63 16.74,12.03 17.73,11.04C18.28,11.88 18.59,12.93 18.59,14.03C18.59,17.28 15.63,20 12,20Z',
          imageUrl: '',
          imageFile: null
        };
      }
      
      this.activeModal = 'service';
    },
    
    async saveService() {
      const isServiceValidbl = this.isServiceValid;
      if (!isServiceValidbl) {
          this.warn("Service data is invalid. Cannot save.");
          return;
      }

      let service = { ...this.editingService };
      service.userId = this.user.uid;

      // 
      if (service.imageFile) {
          try {
              this.log("Uploading service image...");
              const storageRef = ref(storage, `services/${this.user.uid}/${Date.now()}_${service.imageFile.name}`);
              await uploadBytes(storageRef, service.imageFile);
              service.imageUrl = await getDownloadURL(storageRef);
              this.log("Service image uploaded successfully.");
          } catch (error) {
              this.error(`Error uploading image: ${error.message}`);
              return;
          }
      }

      // 
      delete service.imageFile;

      this.log(`Saving service: ${JSON.stringify(service)}`);

      try {
          if (service.id) {
              // 
              this.log(`Updating service with ID: ${service.id}`);
              const serviceRef = doc(db, 'services', service.id);
              await updateDoc(serviceRef, service);

              // 
              const index = this.services.findIndex(s => s.id === service.id);
              if (index !== -1) {
                  this.services[index] = { ...service };
                  this.log("Service updated successfully.");
              } else {
                  this.warn(`Service with ID ${service.id} not found in local array.`);
              }
          } else {
              // 
              this.log("Creating new service...");

              const docRef = doc(collection(db, 'services')); // Firestore 
              service.id = docRef.id;

              // 
              await setDoc(docRef, service);

              // 
              this.services.push({ ...service });

              this.log(`Service created with ID: ${service.id}`);
          }
      } catch (error) {
          this.error(`Error saving service: ${error.message}`);
          // 
          this.saveToLocalStorage();
      }

      this.closeModal();
    },

    
    async deleteService(service) {
      this.log(`Attempting to delete service: ${JSON.stringify(service)}`);
      if (!service || !service.id) {
        this.warn("No service or service ID provided. Cannot delete.");
        return;
      }
      
      this.log(`Deleting service with ID: ${service.id}`);
      
      try {
        await deleteDoc(doc(db, 'services', service.id));
        const index = this.services.findIndex(s => s.id === service.id);
        if (index !== -1) {
          this.services.splice(index, 1);
          this.log("Service deleted successfully.");
        } else {
          this.warn(`Service with ID ${service.id} not found in local array.`);
        }
      } catch (error) {
        this.error(`Error deleting service: ${error.message}`);
        // 
        this.saveToLocalStorage();
      }
      
      if (this.activeModal === 'service') {
        this.closeModal();
      }
    },
    
    // Client methods
    openClientModal(client = null) {
      if (client) {
        this.editingClient = { ...client };
      } else {
        this.editingClient = {
          id: null,
          name: '',
          phone: '',
          email: '',
          address: '',
          notes: '',
          balance: 0,
          createdAt: new Date().toISOString()
        };
      }
      
      this.activeModal = 'client';
    },
    
    async saveClient() {
      const isClientValidBl = this.isClientValid;
      if (!isClientValidBl) {
          this.warn("Client data is invalid. Cannot save.");
          return;
      }

      let client = { ...this.editingClient };
      client.userId = this.user.uid;

      this.log(`Saving client: ${JSON.stringify(client)}`);

      try {
          if (client.id) {
              // 
              this.log(`Updating client with ID: ${client.id}`);
              const clientRef = doc(db, 'clients', client.id);
              await updateDoc(clientRef, client);

              // 
              const index = this.clients.findIndex(c => c.id === client.id);
              if (index !== -1) {
                  this.clients[index] = { ...client };
                  this.log("Client updated successfully.");
              } else {
                  this.warn(`Client with ID ${client.id} not found in local array.`);
              }
          } else {
              // 
              client.createdAt = new Date().toISOString();
              this.log("Creating new client...");

              const docRef = doc(collection(db, 'clients')); // Firestore 
              client.id = docRef.id;

              // 
              await setDoc(docRef, client);

              // 
              this.clients.push({ ...client });

              this.log(`Client created with ID: ${client.id}`);
          }
      } catch (error) {
          this.error(`Error saving client: ${error.message}`);
          // 
          this.saveToLocalStorage();
      }

      // 
      if (this.editingAppointment.date) {
          this.editingAppointment.clientId = client.id;
          this.activeModal = 'appointment';
      } else {
          this.closeModal();
      }
    },
    
    async deleteClient() {
      if (!this.editingClient.id) {
        this.warn("No client ID provided. Cannot delete.");
        return;
      }
      
      // Check if client has appointments or invoices
      const hasAppointments = this.appointments.some(a => a.clientId === this.editingClient.id);
      const hasInvoices = this.invoices.some(i => i.clientId === this.editingClient.id);
      
      if (hasAppointments || hasInvoices) {
        alert('No se puede eliminar el cliente porque tiene citas o facturas asociadas.');
        return;
      }
      
      this.log(`Deleting client with ID: ${this.editingClient.id}`);
      
      try {
        await deleteDoc(doc(db, 'clients', this.editingClient.id));
        const index = this.clients.findIndex(c => c.id === this.editingClient.id);
        if (index !== -1) {
          this.clients.splice(index, 1);
          this.log("Client deleted successfully.");
        } else {
          this.warn(`Client with ID ${this.editingClient.id} not found in local array.`);
        }
      } catch (error) {
        this.error(`Error deleting client: ${error.message}`);
        // 
        this.saveToLocalStorage();
      }
      
      this.closeModal();
    },
    
    sortClients(field) {
      if (this.clientSortField === field) {
        this.clientSortDirection = this.clientSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.clientSortField = field;
        this.clientSortDirection = 'asc';
      }
    },
    
    openNewClientFromAppointment() {
      this.activeModal = 'client';
    },
    
    // Invoice methods
    addInvoiceItem() {
      
      this.currentInvoice.items.push({
        serviceId: '',
        quantity: 1
      });
    },
    
    removeInvoiceItem(index) {
      if (this.currentInvoice.items.length > 1) {
        this.currentInvoice.items.splice(index, 1);
      }
    },
    
    calculateSubtotal() {
      if (!Array.isArray(this.currentInvoice.items)) {
        console.error(" Error: items no es un array", this.currentInvoice.items);
        return 0;
      }

      return this.currentInvoice.items.reduce((total, item) => {
        if (!item || !item.serviceId) return total;

        const service = this.getServiceById(item.serviceId);
        console.log(item.serviceId )
        if (!service) return total;

        return total + (service.price * item.quantity);
      }, 0);
    },

    
    calculateInvoiceTax() {
      return this.calculateSubtotal() * config.taxRate / 100;
    },
    
    calculateTotalInvoice() {
      return this.calculateSubtotal() + this.calculateInvoiceTax();
    }, 
    
    async processInvoice() {
      console.log('ProcessInvoice');
      if (!this.isInvoiceValid) return;
      
      const invoice = {
        userId: this.user.uid, // Associate invoice with user
        invoiceNumber: this.nextInvoiceNumber,
        date: new Date().toISOString(),
        clientId: this.currentInvoice.clientId,
        items: this.currentInvoice.items.filter(item => item.serviceId).map(item => {
          const service = this.getServiceById(item.serviceId);
          return {
            serviceId: item.serviceId,
            quantity: item.quantity,
            price: service.price,
            total: service.price * item.quantity
          };
        }),
        subtotal: this.calculateSubtotal(),
        tax: this.calculateInvoiceTax(),
        total: this.calculateTotalInvoice(),  
        paymentMethod: this.currentInvoice.paymentMethod,
        status: this.currentInvoice.paymentMethod === 'credit' ? 'pending' : 'paid',
        paymentDate: this.currentInvoice.paymentMethod === 'credit' ? null : new Date().toISOString()
      };
      
      try {
        // Save invoice to Firestore
        const docRef = await addDoc(collection(db, 'invoices'), invoice);
        invoice.id = docRef.id;
        this.invoices.push(invoice);
        
        // Update client balance if credit
        if (invoice.paymentMethod === 'credit') {
          const client = this.getClientById(invoice.clientId);
          if (client) {
            client.balance += invoice.total;
            client.lastInvoiceDate = invoice.date;
            const clientRef = doc(db, 'clients', client.id);
            await updateDoc(clientRef, {
              balance: client.balance,
              lastInvoiceDate: client.lastInvoiceDate
            });
          }
        }
        
        // Update client's last invoice date
        const client = this.getClientById(invoice.clientId);
        if (client) {
          client.lastInvoiceDate = invoice.date;
          const clientRef = doc(db, 'clients', client.id);
          await updateDoc(clientRef, {
            lastInvoiceDate: client.lastInvoiceDate
          });
        }
        
        // Update next invoice number in settings
        await updateDoc(doc(db, 'settings', 'invoiceSettings'), {
          nextInvoiceNumber: this.nextInvoiceNumber + 1
        });
      } catch (error) {
        console.error("Error processing invoice:", error);
        // Fall back to local storage if Firebase fails
        this.saveToLocalStorage();
      }
      
      // Offer to print the invoice
      if (confirm('Factura procesada correctamente. ¿Desea imprimir la factura?')) {
        this.printInvoice(invoice);
      }
      
      this.resetInvoice();
    },
    
    resetInvoice() {
      this.currentInvoice = {
        clientId: '',
        items: [{
          serviceId: '',
          quantity: 1
        }],
        paymentMethod: 'cash'
      };
    },
    
    viewInvoice(invoice) {
      this.selectedInvoice = invoice;
      this.activeModal = 'invoice';
    },
    
    printInvoice(invoice) {
      this.selectedInvoice = invoice;
      this.activeModal = 'invoice';
      
      setTimeout(() => {
        const element = this.$refs.invoiceView;
        const options = {
          margin: 10,
          filename: `factura-${invoice.invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Use the global html2pdf function if available, otherwise import dynamically
        if (typeof window.html2pdf === 'function') {
          window.html2pdf(element, options);
        } else {
          import('html2pdf.js')
            .then(module => {
              const html2pdf = module.default || module;
              if (typeof html2pdf === 'function') {
                html2pdf(element, options);
              } else {
                throw new Error("html2pdf is not a function");
              }
            })
            .catch(error => {
              console.error("Error loading html2pdf:", error);
              alert("Error al generar el PDF. Inténtelo de nuevo más tarde.");
            });
        }
      }, 500);
    },
    
    // Payment methods
    openPaymentModal(client) {
      this.selectedClient = client;
      this.paymentAmount = client.balance;
      this.paymentMethod = 'cash';
      this.paymentNote = '';
      
      this.activeModal = 'payment';
    },
    
    async processPayment() {
      if (!this.isPaymentValid) return;
      
      const client = this.selectedClient;
      
      try {
        // Update client balance
        client.balance -= this.paymentAmount;
        const clientRef = doc(db, 'clients', client.id);
        await updateDoc(clientRef, {
          balance: client.balance
        });
        
        // Record the payment transaction
        const payment = {
          userId: this.user.uid, // Associate payment with user
          date: new Date().toISOString(),
          clientId: client.id,
          amount: this.paymentAmount,
          method: this.paymentMethod,
          note: this.paymentNote,
          type: 'payment'
        };
        
        const docRef = await addDoc(collection(db, 'transactions'), payment);
        payment.id = docRef.id;
        
        if (!this.transactions) this.transactions = [];
        this.transactions.push(payment);
        
        // Find pending invoices and mark them as paid
        let remainingAmount = this.paymentAmount;
        const pendingInvoices = this.invoices
          .filter(inv => inv.clientId === client.id && inv.paymentMethod === 'credit' && inv.status === 'pending')
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        for (const invoice of pendingInvoices) {
          if (remainingAmount <= 0) break;
          
          if (remainingAmount >= invoice.total) {
            // Can pay full invoice
            invoice.status = 'paid';
            invoice.paymentDate = new Date().toISOString();
            remainingAmount -= invoice.total;
            
            const invoiceRef = doc(db, 'invoices', invoice.id);
            await updateDoc(invoiceRef, {
              status: 'paid',
              paymentDate: invoice.paymentDate
            });
          } else {
            // Partial payment - in a real app, you might handle this differently
            break;
          }
        }
      } catch (error) {
        console.error("Error processing payment:", error);
        // Fall back to local storage if Firebase fails
        this.saveToLocalStorage();
      }
      
      this.closeModal();
    },
    
    // Client history
    viewClientHistory(client) {
      this.selectedClient = client;
      this.historyTab = 'transactions';
      
      // Calculate client history
      this.clientHistory = {
        visits: 0,
        totalSpent: 0,
        transactions: [],
        appointments: []
      };
      
      const clientInvoices = this.invoices && client.id
  ? this.invoices.filter(inv => inv.clientId === client.id)
  : [];

      
      // Charges (invoices)
      clientInvoices.forEach(invoice => {
        this.clientHistory.transactions.push({
          date: invoice.date,
          description: `Factura #${invoice.invoiceNumber}`,
          amount: invoice.total,
          method: invoice.paymentMethod,
          type: 'charge'
        });
        
        if (invoice.paymentMethod !== 'credit' || invoice.status === 'paid') {
          this.clientHistory.totalSpent += invoice.total;
        }
      });
      
      // Payments
      if (this.transactions) {
        const clientPayments = this.transactions.filter(t => t.clientId === client.id && t.type === 'payment');
        clientPayments.forEach(payment => {
          this.clientHistory.transactions.push({
            date: payment.date,
            description: payment.note || 'Pago',
            amount: payment.amount,
            method: payment.method,
            type: 'payment'
          });
        });
      }
      
      // Sort transactions by date (newest first)
      this.clientHistory.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Get client appointments
      this.clientHistory.appointments = this.appointments
        .filter(app => app.clientId === client.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      this.clientHistory.visits = this.clientHistory.appointments.length;
      
      this.activeModal = 'history';
    },
    
    // Reports methods
    setReportPeriod(period) {
      this.reportPeriod = period;
      
      const today = new Date();
      let startDate;
      
      switch (period) {
        case 'day':
          startDate = new Date(today);
          break;
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(today);
          startDate.setDate(1);
          break;
        case 'year':
          startDate = new Date(today);
          startDate.setMonth(0);
          startDate.setDate(1);
          break;
      }
      
      this.reportFilters.startDate = this.formatDateForInput(startDate);
      this.reportFilters.endDate = this.formatDateForInput(today);
    },
    
    applyReportDateRange() {
      // This would trigger report data calculation
    },
    
    applyInvoiceFilters() {
      // This is handled by the computed property
    },
    
    calculateTotalSales() {
      // In a real app, this would calculate based on filtered invoices
      return this.salesChartData.reduce((total, data) => total + data.value, 0);
    },
    
    calculateTotalServices() {
      // In a real app, this would count services in filtered invoices
      return Math.floor(this.calculateTotalSales() / 500);
    },
    
    calculateUniqueClients() {
      // In a real app, this would count unique clients in filtered invoices
      return Math.min(this.clients.length, Math.floor(this.calculateTotalSales() / 1000));
    },
    
    calculateNewClients() {
      // In a real app, this would count clients created in the reporting period
      return Math.floor(this.clients.length * 0.2);
    },
    
    calculateClientsWithDebt() {
      return this.clients.filter(client => client.balance > 0).length;
    },
    
    calculateTotalDebt() {
      return this.clients.reduce((total, client) => total + client.balance, 0);
    },
    
    calculatePendingPayments() {
      return this.invoices.filter(inv => inv.paymentMethod === 'credit' && inv.status === 'pending').length;
    },
    
    // Helper methods
    formatPrice(value) {
      const num = Number(value);
      return isNaN(num) ? "0.00" : num.toFixed(2);
    },
    
    getServiceById(id) {
      return this.services.find(service => service.id === id);
    },
    
    getClientById(id) {
      return this.clients.find(client => client.id === id);
    },
    
    closeModal() {
      this.activeModal = null;
      this.editingAppointment = {
        id: null,
        date: null,
        time: null,
        clientId: '',
        serviceId: '',
        notes: '',
        status: 'pending'
      };
      this.editingService = {
        id: null,
        name: '',
        category: this.serviceCategories[0],
        price: 0,
        duration: 30,
        description: '',
        color: '#4a90e2',
        icon: 'M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,11.71 4.03,11.43 4.07,11.15C5.02,12.45 6.23,13.14 7.5,13.14C9.09,13.14 10.23,11.83 11.5,11.83C12.69,11.83 13.42,12.63 14.67,12.63C15.85,12.63 16.74,12.03 17.73,11.04C18.28,11.88 18.59,12.93 18.59,14.03C18.59,17.28 15.63,20 12,20Z',
        imageUrl: '',
        imageFile: null
      };
      this.editingClient = {
        id: null,
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        balance: 0
      };
      this.selectedClient = null;
      this.selectedInvoice = null;
    },
    
    async initializeFirebase() {
      if (this.dbInitialized) return;
      
      try {
        this.isLoading = true;
        
        // Load next invoice number
        const settingsSnapshot = await getDocs(collection(db, 'settings'));
        if (!settingsSnapshot.empty) {
          const settingsDoc = settingsSnapshot.docs.find(doc => doc.id === 'invoiceSettings');
          if (settingsDoc) {
            this.nextInvoiceNumber = settingsDoc.data().nextInvoiceNumber;
          } else {
            await setDoc(doc(db, 'settings', 'invoiceSettings'), {
              nextInvoiceNumber: this.nextInvoiceNumber
            });
          }
        } else {
          await setDoc(doc(db, 'settings', 'invoiceSettings'), {
            nextInvoiceNumber: this.nextInvoiceNumber
          });
        }
        
        this.dbInitialized = true;
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        // Fall back to local storage
        this.loadFromLocalStorage();
      } finally {
        this.isLoading = false;
      }
    },
    
    // File handling methods
    handleServiceImageUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.editingService.imageFile = file;
        // Create a temporary URL for preview
        this.editingService.imageUrl = URL.createObjectURL(file);
      }
    },
    
    // LocalStorage methods
    saveToLocalStorage() {
      localStorage.setItem('beautysalon_services', JSON.stringify(this.services));
      localStorage.setItem('beautysalon_clients', JSON.stringify(this.clients));
      localStorage.setItem('beautysalon_appointments', JSON.stringify(this.appointments));
      localStorage.setItem('beautysalon_invoices', JSON.stringify(this.invoices));
      localStorage.setItem('beautysalon_nextInvoiceNumber', this.nextInvoiceNumber);
      
      if (this.transactions) {
        localStorage.setItem('beautysalon_transactions', JSON.stringify(this.transactions));
      }
    },
    
    loadFromLocalStorage() {
      const services = localStorage.getItem('beautysalon_services');
      const clients = localStorage.getItem('beautysalon_clients');
      const appointments = localStorage.getItem('beautysalon_appointments');
      const invoices = localStorage.getItem('beautysalon_invoices');
      const nextInvoiceNumber = localStorage.getItem('beautysalon_nextInvoiceNumber');
      const transactions = localStorage.getItem('beautysalon_transactions');
      
      if (services) this.services = JSON.parse(services);
      if (clients) this.clients = JSON.parse(clients);
      if (appointments) {
        this.appointments = JSON.parse(appointments).map(appointment => ({
            ...appointment,
            date: new Date(appointment.date) // Ensure date is a Date object
        }));
      }
      if (invoices) {
        this.invoices = JSON.parse(invoices).map(invoice => ({
            ...invoice,
            date: new Date(invoice.date) // Ensure date is a Date object
        }));
      }
      if (nextInvoiceNumber) this.nextInvoiceNumber = parseInt(nextInvoiceNumber);
      if (transactions) this.transactions = JSON.parse(transactions);
      
      // Load demo data if no data exists
      this.loadDemoDataIfEmpty();
    },
    
    loadDemoDataIfEmpty() {
      // If there's no data, load some demo data
      if (this.services.length === 0) {
        this.services = config.demoServices.map((service, index) => ({
          id: Date.now() + index,
          ...service
        }));
      }
      
      if (this.clients.length === 0) {
        this.clients = config.demoClients.map((client, index) => ({
          id: Date.now() + index,
          ...client,
          createdAt: new Date().toISOString()
        }));
      }
      
      // Save the demo data
      if (this.services.length > 0 || this.clients.length > 0) {
        this.saveToLocalStorage();
      }
    },
    
    addNotification(message, appointmentId = null) {
      const notification = {
        id: Date.now(),
        message,
        appointmentId,
        date: new Date(),
        read: false
      };
      this.notifications.push(notification);
    },
    
    markNotificationAsRead(notificationId) {
      const notif = this.notifications.find(n => n.id === notificationId);
      if (notif) {
        notif.read = true;
      }
    },
    
    clearNotificationsHistory() {
      this.notifications = [];
    },
    
    checkPastAppointments() {
      const now = new Date();
      this.appointments.forEach(appointment => {
        if (appointment.status === 'pending') {
          const apptDate = new Date(appointment.date);
          apptDate.setHours(appointment.time, 0, 0, 0);
          if (apptDate < now && !this.notifiedAppointments.includes(appointment.id)) {
            const formatted = this.formatDate(apptDate) + ' ' + appointment.time + ':00';
            this.addNotification(`La cita del ${formatted} no ha sido confirmada.`, appointment.id);
            this.notifiedAppointments.push(appointment.id);
          }
        }
      });
    },
    
    async checkPendingAppointmentRequests() {
      // Fetch appointments with 'pending' status
      const pendingAppointmentsSnapshot = await getDocs(
          query(
              collection(db, 'appointments'),
              where("userId", "==", this.user.uid),
              where("status", "==", "pending")
          )
      );

      // Map the appointments to the pendingAppointmentRequests array
      this.pendingAppointmentRequests = pendingAppointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: new Date(doc.data().date) // Ensure date is a Date object
      }));

      // If there are any pending appointment requests, open the modal
      if (this.pendingAppointmentRequests.length > 0) {
          this.activeModal = 'pendingRequests';
      }
    },
    
    async confirmAppointment(appointmentId) {
      const appointment = this.appointments.find(a => a.id === appointmentId);
      if (appointment && appointment.status === 'pending') {
        appointment.status = 'confirmed';
        try {
          const appointmentRef = doc(db, 'appointments', appointment.id);
          await updateDoc(appointmentRef, { status: 'confirmed' });
          this.addNotification(`La cita del ${this.formatDate(new Date(appointment.date))} a las ${appointment.time}:00 ha sido confirmada.`, appointment.id);
        } catch (error) {
          this.error(`Error confirmando cita: ${error.message}`);
        }
      }
    },
    async confirmAppointmentRequest(appointmentId) {
      const appointment = this.pendingAppointmentRequests.find(a => a.id === appointmentId);
      if (appointment && appointment.status === 'pending') {
        appointment.status = 'confirmed';
        try {
          const appointmentRef = doc(db, 'appointments', appointment.id);
          await updateDoc(appointmentRef, { status: 'confirmed' });

          // Actualizar la cita en this.appointments
          const index = this.appointments.findIndex(a => a.id === appointment.id);
          if (index !== -1) {
            this.appointments[index] = { ...appointment, status: 'confirmed' };
          } else {
            this.appointments.push(appointment);
          }

          // Eliminar la cita de pendingAppointmentRequests
          this.pendingAppointmentRequests = this.pendingAppointmentRequests.filter(a => a.id !== appointment.id);

          this.addNotification(`La solicitud de cita del ${this.formatDate(new Date(appointment.date))} a las ${appointment.time}:00 ha sido confirmada.`, appointment.id);
        } catch (error) {
          this.error(`Error confirmando solicitud de cita: ${error.message}`);
        }
      }
    },
    async declineAppointmentRequest(appointmentId) {
      const appointment = this.pendingAppointmentRequests.find(a => a.id === appointmentId);
      if (appointment && appointment.status === 'pending') {
        appointment.status = 'canceled';
        try {
          const appointmentRef = doc(db, 'appointments', appointment.id);
          await updateDoc(appointmentRef, { status: 'canceled' });

          // Actualizar la cita en this.appointments
          const index = this.appointments.findIndex(a => a.id === appointment.id);
          if (index !== -1) {
            this.appointments[index] = { ...appointment, status: 'canceled' };
          }

          // Eliminar la cita de pendingAppointmentRequests
          this.pendingAppointmentRequests = this.pendingAppointmentRequests.filter(a => a.id !== appointment.id);
          
          this.addNotification(`La solicitud de cita del ${this.formatDate(new Date(appointment.date))} a las ${appointment.time}:00 ha sido rechazada.`, appointment.id);
        } catch (error) {
          this.error(`Error rechazando solicitud de cita: ${error.message}`);
        }
      }
    },
    
    isSlotDisabled(date, hour) {
      const now = new Date();
      const slotDate = new Date(date);
      slotDate.setHours(hour, 0, 0, 0);
      if (slotDate < now) return true;
      if (this.settings.unavailableDays.includes(date.getDay())) return true;
      if (this.settings.unavailableHours.includes(hour)) return true;
      const dateStr = date.toISOString().split('T')[0];
      if (this.specificUnavailableSlots.some(slot => slot.date === dateStr && slot.hour === hour)) return true;
      for (const alarm of this.alarms) {
        if (alarm.repeating) {
          if (date.getDay() === parseInt(alarm.weekDay) && hour >= alarm.startHour && hour < alarm.endHour) {
            return true;
          }
        } else {
          if (dateStr === alarm.date && hour >= alarm.startHour && hour < alarm.endHour) {
            return true;
          }
        }
      }
      return false;
    },
    
    saveSettings() {
      // Parsea las horas separadas por comas y actualiza settings.unavailableHours
      if (this.unavailableHoursInput.trim() === '') {
        this.settings.unavailableHours = [];
      } else {
        this.settings.unavailableHours = this.unavailableHoursInput
          .split(',')
          .map(h => parseInt(h.trim()))
          .filter(h => !isNaN(h));
      }
      this.addNotification("Configuración guardada.");
    },
    
    blockTimeSlot(date, hour) {
      const dateStr = date.toISOString().split('T')[0];
      if (!this.isSpecificSlotBlocked(date, hour)) {
        this.specificUnavailableSlots.push({ date: dateStr, hour: hour });
        this.addNotification(`Bloqueado ${dateStr} a las ${hour}:00`);
      }
    },
    
    unblockTimeSlot(date, hour) {
      const dateStr = date.toISOString().split('T')[0];
      const index = this.specificUnavailableSlots.findIndex(slot => slot.date === dateStr && slot.hour === hour);
      if (index !== -1) {
        this.specificUnavailableSlots.splice(index, 1);
        this.addNotification(`Desbloqueado ${dateStr} a las ${hour}:00`);
      }
    },
    
    toggleSpecificSlot(date, hour) {
      if (this.isSpecificSlotBlocked(date, hour)) {
        this.unblockTimeSlot(date, hour);
      } else {
        this.blockTimeSlot(date, hour);
      }
    },
    
    isSpecificSlotBlocked(date, hour) {
      const dateStr = date.toISOString().split('T')[0];
      return this.specificUnavailableSlots.some(slot => slot.date === dateStr && slot.hour === hour);
    },
    
    addAlarm() {
      if (!this.newAlarm.repeating && !this.newAlarm.date) {
        this.showError("Por favor, selecciona una fecha para la alarma.");
        return;
      }
      if (this.newAlarm.startHour >= this.newAlarm.endHour) {
        this.showError("La hora de inicio debe ser menor que la hora de fin.");
        return;
      }
      const alarm = { ...this.newAlarm, id: Date.now() };
      this.alarms.push(alarm);
      this.newAlarm = { repeating: false, date: '', weekDay: '0', startHour: 0, endHour: 0 };
      this.addNotification("Alarma agregada.");
    },
    
    removeAlarm(index) {
      this.alarms.splice(index, 1);
      this.addNotification("Alarma eliminada.");
    },
    async facturarCita(appointment) {
      if (appointment.status !== 'realizada') {
        this.warn("Solo se puede facturar citas realizadas.");
        return;
      }
      const service = this.getServiceById(appointment.serviceId);
      if (!service) {
        this.error("Servicio no encontrado para la cita.");
        return;
      }
      const price = Number(service.price) || 0;
      const subtotal = price;
      const tax = config.applyTax ? subtotal * config.taxRate / 100 : 0;
      const total = subtotal + tax;
      let invoice = {
        userId: this.user.uid,
        invoiceNumber: this.nextInvoiceNumber,
        date: new Date().toISOString(),
        clientId: appointment.clientId,
        items: [{
          serviceId: appointment.serviceId,
          quantity: 1,
          price: subtotal,
          total: subtotal
        }],
        subtotal: subtotal,
        tax: tax,
        total: total,
        paymentMethod: 'cash',
        status: 'paid',
        paymentDate: new Date().toISOString()
      };
      try {
        const docRef = doc(collection(db, 'invoices'));
        invoice.id = docRef.id;
        await setDoc(docRef, invoice);
        this.invoices.push(invoice);
        this.nextInvoiceNumber++;
        await updateDoc(doc(db, 'settings', 'invoiceSettings'), {
          nextInvoiceNumber: this.nextInvoiceNumber
        });
        appointment.status = 'facturada';
        await updateDoc(doc(db, 'appointments', appointment.id), { status: 'facturada' });
        const index = this.appointments.findIndex(a => a.id === appointment.id);
        if (index !== -1) {
          this.appointments[index].status = 'facturada';
        }
        this.addNotification(`Cita facturada. Factura #${invoice.invoiceNumber} generada.`, appointment.id);
      } catch (error) {
        this.error(`Error facturando la cita: ${error.message}`);
      }
    }
  },
  
  mounted() {
    console.log("calculateTotal:", this.calculateTotal); 
    this.initializeFirebase();
    onAuthStateChanged(auth, async (user) => {
      this.user = user;
      
      if (user) {
        // User is signed in, fetch data from Firebase
        try {
          await this.fetchDataFromFirebase();
          this.currentView = 'appointments'; // Or any other default view after login
          this.checkPendingAppointmentRequests();
        } catch (error) {
          console.error("Error fetching data on mount:", error);
          this.showError("Error fetching data on mount: " + error.message);
        }
      } else {
        // User is signed out
        this.currentView = 'login';
        this.clearData();
      }
    });
    setInterval(() => {
      this.checkPastAppointments();
    }, 60000);
  }
});

app.mount('#app');