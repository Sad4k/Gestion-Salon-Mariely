import { createApp } from 'vue';
const config = {
  // Business configuration
  businessName: "BeautySalon",
  businessHoursStart: 9, // 9 AM
  businessHoursEnd: 19, // 7 PM
  
  // Tax configuration
  taxRate: 0.16, // 16% IVA
  applyTax: true, // Whether to apply tax
  
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
        'canceled': 'Cancelado'
      },
      
      // Setup for Firebase
      isLoading: true,
      dbInitialized: false,
      
      // Configuration-dependent translations
      currencyDisplay: config.currencySymbol
    };
  },
  // funciones de validadaciones y mas 
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
    clientsWithDebt() {
      return this.clients.filter(client => client.balance > 0)
        .sort((a, b) => b.balance - a.balance);
    },
    
    chartYAxisValues() {
      const maxSales = Math.max(...this.salesChartData.map(d => d.value));
      const step = Math.ceil(maxSales / 5);
      return [0, step, step*2, step*3, step*4, step*5].filter(v => v <= maxSales * 1.1);
    },
    
    salesChartData() {
      // This would be computed based on the current report period
      // For demonstration, we'll create sample data
      
      if (this.reportPeriod === 'day') {
        // Hourly data
        return Array.from({length: 12}, (_, i) => {
          return { 
            label: `${i + 9}:00`, 
            value: Math.floor(Math.random() * 1000)
          };
        });
      } else if (this.reportPeriod === 'week') {
        // Daily data
        return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => {
          return { 
            label: day, 
            value: Math.floor(Math.random() * 2000)
          };
        });
      } else if (this.reportPeriod === 'month') {
        // Weekly data
        return Array.from({length: 4}, (_, i) => {
          return { 
            label: `Semana ${i + 1}`, 
            value: Math.floor(Math.random() * 5000)
          };
        });
      } else {
        // Monthly data
        return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map(month => {
          return { 
            label: month, 
            value: Math.floor(Math.random() * 10000)
          };
        });
      }
    },
    
    topServices() {
      // This would analyze invoices to find the most popular services
      // For demonstration, we'll create sample data
      return this.services.slice(0, 5).map(service => {
        return {
          name: service.name,
          count: Math.floor(Math.random() * 50),
          revenue: Math.floor(Math.random() * 10000)
        };
      }).sort((a, b) => b.revenue - a.revenue);
    },
    
    topClients() {
      // This would analyze invoices to find the best clients
      // For demonstration, we'll create sample data
      return this.clients.slice(0, 5).map(client => {
        return {
          name: client.name,
          visits: Math.floor(Math.random() * 20),
          totalSpent: Math.floor(Math.random() * 20000)
        };
      }).sort((a, b) => b.totalSpent - a.totalSpent);
    },
    
    calculateTax() {
      return config.applyTax ? this.calculateSubtotal() * config.taxRate : 0;
    },
     
    async calculateTotal() {
     const calculateTxFunc = await this.calculateTax
    return this.calculateSubtotal + calculateTxFunc;
    },
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
        category: config.serviceCategories[0],
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
      const isAppointmentValidBL = await this.isAppointmentValid;
      if (!isAppointmentValidBL) {
        this.warn("Appointment data is invalid. Cannot save.");
        return;
      }
      
      const appointment = { ...this.editingAppointment };
      appointment.date = appointment.date.toISOString();
      appointment.userId = this.user.uid;

      this.log(`Saving appointment: ${JSON.stringify(appointment)}`);
      
      try {
        if (appointment.id) {
          // Update existing appointment
          this.log(`Updating appointment with ID: ${appointment.id}`);
          const appointmentRef = doc(db, 'appointments', appointment.id);
          await updateDoc(appointmentRef, appointment);
          const index = this.appointments.findIndex(a => a.id === appointment.id);
          if (index !== -1) {
            this.appointments[index] = { ...appointment, date: new Date(appointment.date) };
            this.log("Appointment updated successfully.");
          } else {
            this.warn(`Appointment with ID ${appointment.id} not found in local array.`);
          }
        } else {
          // Create new appointment
          this.log("Creating new appointment...");
          const docRef = await addDoc(collection(db, 'appointments'), {
            ...appointment,
            userId: this.user.uid // Associate appointment with user
          });
          appointment.id = docRef.id;
          this.appointments.push({ ...appointment, date: new Date(appointment.date) });
          this.log(`Appointment created with ID: ${appointment.id}`);
        }
      } catch (error) {
        this.error(`Error saving appointment: ${error.message}`);
        // Fall back to local storage if Firebase fails
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
        // Fall back to local storage if Firebase fails
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
      const isServiceValidbl = await this.isServiceValid;
      if (!isServiceValidbl) {
        this.warn("Service data is invalid. Cannot save.");
        return;
      }
      
      const service = { ...this.editingService };
      service.userId = this.user.uid;
      
      // Handle image upload if a file was selected
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
      
      delete service.imageFile; // Remove the File object before saving
      
      this.log(`Saving service: ${JSON.stringify(service)}`);
      
      try {
        if (service.id) {
          // Update existing service
          this.log(`Updating service with ID: ${service.id}`);
          const serviceRef = doc(db, 'services', service.id);
          await updateDoc(serviceRef, service);
          const index = this.services.findIndex(s => s.id === service.id);
          if (index !== -1) {
            this.services[index] = service;
            this.log("Service updated successfully.");
          } else {
            this.warn(`Service with ID ${service.id} not found in local array.`);
          }
        } else {
          // Create new service
          this.log("Creating new service...");
          const docRef = await addDoc(collection(db, 'services'), {
            ...service,
            userId: this.user.uid // Associate service with user
          });
          service.id = docRef.id;
          this.services.push(service);
          this.log(`Service created with ID: ${service.id}`);
        }
      } catch (error) {
        this.error(`Error saving service: ${error.message}`);
        // Fall back to local storage if Firebase fails
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
        // Fall back to local storage if Firebase fails
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
      const isClientValidBl = await this.isClientValid;
      if (!isClientValidBl) {
        this.warn("Client data is invalid. Cannot save.");
        return;
      }
      
      const client = { ...this.editingClient };
      client.userId = this.user.uid;
      
      this.log(`Saving client: ${JSON.stringify(client)}`);
      
      try {
        if (client.id) {
          // Update existing client
          this.log(`Updating client with ID: ${client.id}`);
          const clientRef = doc(db, 'clients', client.id);
          await updateDoc(clientRef, client);
          const index = this.clients.findIndex(c => c.id === client.id);
          if (index !== -1) {
            this.clients[index] = client;
            this.log("Client updated successfully.");
          } else {
            this.warn(`Client with ID ${client.id} not found in local array.`);
          }
        } else {
          // Create new client
          client.createdAt = new Date().toISOString();
          this.log("Creating new client...");
          const docRef = await addDoc(collection(db, 'clients'), {
            ...client,
            userId: this.user.uid // Associate client with user
          });
          client.id = docRef.id;
          this.clients.push(client);
          this.log(`Client created with ID: ${client.id}`);
        }
      } catch (error) {
        this.error(`Error saving client: ${error.message}`);
        // Fall back to local storage if Firebase fails
        this.saveToLocalStorage();
      }
      
      // If coming from appointment modal, return to it
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
        // Fall back to local storage if Firebase fails
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
      return this.currentInvoice.items.reduce((total, item) => {
        if (!item.serviceId) return total;
        
        const service = this.getServiceById(item.serviceId);
        if (!service) return total;
        
        return total + (service.price * item.quantity);
      }, 0);
    },
    
    calculateInvoiceTax() {
      return this.calculateSubtotal() * config.taxRate;
    },
    
    calculateTotalInvoice() {
      return this.calculateSubtotal() + this.calculateInvoiceTax();
    },
    
    async processInvoice() {
      if (!this.isInvoiceValid()) return;
      
      const invoice = {
        userId: this.user.uid, // Associate invoice with user
        invoiceNumber: this.nextInvoiceNumber++,
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
        total: this.calculateTotal(),
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
          nextInvoiceNumber: this.nextInvoiceNumber
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
      
      // Use setTimeout to ensure the modal is rendered
      setTimeout(() => {
        const element = this.$refs.invoiceView;
        const options = {
          margin: 10,
          filename: `factura-${invoice.invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        import('html2pdf.js')
          .then(module => {
            const html2pdf = module.default || module;
            html2pdf().from(element).set(options).save();
          })
          .catch(error => {
            console.error("Error loading html2pdf:", error);
            alert("Error al generar el PDF. Inténtelo de nuevo más tarde.");
          });
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
      if (!this.isPaymentValid()) return;
      
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
      
      // Get all transactions
      const clientInvoices = this.invoices.filter(inv => inv.clientId === client.id);
      
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
    
    calculateBarHeight(value) {
      const max = Math.max(...this.salesChartData.map(d => d.value));
      return (value / max) * 100;
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
    }
  },
  
  mounted() {
    this.initializeFirebase();
    onAuthStateChanged(auth, async (user) => {
      this.user = user;
      
      if (user) {
        // User is signed in, fetch data from Firebase
        try {
          await this.fetchDataFromFirebase();
          this.currentView = 'appointments'; // Or any other default view after login
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
  }
});

app.mount('#app');