import apiClient from './apiClient';

const ATTENDANCE_MY_ENDPOINT = '/api/v1/attendance/my';
const ATTENDANCE_COMPANY_ENDPOINT = '/api/v1/attendance/company';
const ATTENDANCE_REPORT_ENDPOINT = '/api/v1/attendance/report';
const ATTENDANCE_DASHBOARD_ENDPOINT = '/api/v1/attendance/dashboard';
const ATTENDANCE_DASHBOARD_HISTORY_ENDPOINT = '/api/v1/attendance/dashboard/history';
const CLOCK_IN_ENDPOINT = '/api/v1/attendance/clock-in';
const CLOCK_OUT_ENDPOINT = '/api/v1/attendance/clock-out';

const normalizeAttendanceEvent = (event = {}) => {
  if (!event || typeof event !== 'object') {
    return null;
  }

  console.log('🔍 Données brutes de l\'event:', event);
  console.log('👤 event.user:', event.user);

  const status = event.status || event.type || 'Arrivée';

  // Extraction du userId avec plusieurs fallbacks
  const userId =
    event.userId ||
    event.employeeId ||
    event.user?._id?.toString() ||
    event.user?.id?.toString() ||
    (typeof event.user === 'string' ? event.user : '');

  // Extraction du nom avec plusieurs fallbacks
  let name = 'Employé';
  let email = '';
  
  if (event.employeeName) {
    name = event.employeeName;
  } else if (event.name) {
    name = event.name;
  } else if (event.user && typeof event.user === 'object') {
    const firstName = event.user.firstName || '';
    const lastName = event.user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    console.log('📝 Nom extrait depuis event.user object:', fullName);
    if (fullName) {
      name = fullName;
      email = event.user.email || '';
    } else if (event.user.email) {
      name = event.user.email.split('@')[0];
      email = event.user.email;
    }
  } else if (event.user && typeof event.user === 'string') {
    // Si user est juste un ID string, on ne peut pas récupérer le nom ici
    console.log('⚠️ event.user est un string ID, pas un objet peuplé');
    name = 'Employé';
    email = '';
  }

  console.log('✅ Nom final:', name);
  console.log('📧 Email final:', email);

  const clockInTime = event.clockInTime || event.checkInTime || event.clockInAt || event.createdAt || '';
  const clockOutTime = event.clockOutTime || event.checkOutTime || event.clockOutAt || event.updatedAt || '';

  return {
    id: event.id || event._id || `${userId || 'evt'}-${clockInTime || Date.now()}`,
    userId,
    name,
    email,
    clockInTime,
    clockOutTime,
    location: event.location || 'N/A',
    durationSec: event.durationSec,
    source: event.source,
    notes: event.notes,
    status,
    confidence: event.confidence ? `${event.confidence}%` : event.successRate ? `${event.successRate}%` : '—',
    user: event.user // Garder l'objet user complet pour référence
  };
};

const mapEvents = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .map(normalizeAttendanceEvent)
      .filter(Boolean);
  }
  if (Array.isArray(data?.items)) {
    return data.items.map(normalizeAttendanceEvent).filter(Boolean);
  }
  if (Array.isArray(data?.data)) {
    return data.data.map(normalizeAttendanceEvent).filter(Boolean);
  }
  return [];
};

export const attendanceService = {
  async getMyAttendance({ companyId, from, to, page = 1, limit = 20 }) {
    const params = {
      companyId,
      ...(from && { from }),
      ...(to && { to }),
      page,
      limit
    };
    const response = await apiClient.get(ATTENDANCE_MY_ENDPOINT, { params });
    return mapEvents(response.data);
  },

  async getCompanyAttendance({ companyId, from, to, userId, search, page = 1, limit = 50 }) {
    const params = {
      companyId,
      ...(from && { from }),
      ...(to && { to }),
      ...(userId && { userId }),
      ...(search && { search }),
      page,
      limit
    };
    const response = await apiClient.get(ATTENDANCE_COMPANY_ENDPOINT, { params });
    
    console.log('🔍 Données brutes du backend:', response.data);
    console.log('🔍 Premier élément brut:', response.data?.items?.[0]);
    
    const items = mapEvents(response.data);
    
    console.log('✅ Données normalisées:', items);
    if (items[0]) {
      console.log('✅ Premier élément normalisé:', items[0]);
      console.log('   📝 name:', items[0].name);
      console.log('   📧 email:', items[0].email);
      console.log('   👤 userId:', items[0].userId);
      console.log('   🔍 user object:', items[0].user);
    }

    return {
      items,
      page: response.data?.page ?? page,
      limit: response.data?.limit ?? limit,
      total: response.data?.total ?? items.length
    };
  },

  async getAttendanceReport({ companyId, userId, from, to }) {
    const params = {
      companyId,
      ...(userId && { userId }),
      from,
      to
    };
    try {
      const response = await apiClient.get(ATTENDANCE_REPORT_ENDPOINT, { params });
      return response.data;
    } catch (error) {
      // Si l'utilisateur n'a pas la permission (403), retourner un tableau vide silencieusement
      if (error?.response?.status === 403) {
        console.warn('Permission refusée pour le rapport de présence. Utilisation des données personnelles uniquement.');
        return [];
      }
      // Pour les autres erreurs, les propager
      throw error;
    }
  },

  async getDashboard({ companyId }) {
    const params = { companyId };
    const response = await apiClient.get(ATTENDANCE_DASHBOARD_ENDPOINT, { params });
    return response.data;
  },

  async getDashboardHistory({ companyId, from, to }) {
    const params = {
      companyId,
      ...(from && { from }),
      ...(to && { to })
    };
    const response = await apiClient.get(ATTENDANCE_DASHBOARD_HISTORY_ENDPOINT, { params });
    return response.data;
  },

  async clockIn({ companyId, employeeId, source, location, notes }) {
    const payload = {
      companyId,
      ...(employeeId && { employeeId }),
      ...(source && { source }),
      ...(location && { location }),
      ...(notes && { notes })
    };
    const response = await apiClient.post(CLOCK_IN_ENDPOINT, payload);
    window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: { action: 'clock-in' } }));
    return response.data;
  },

  async clockOut({ companyId, employeeId, notes }) {
    const payload = {
      companyId,
      ...(employeeId && { employeeId }),
      ...(notes && { notes })
    };
    const response = await apiClient.post(CLOCK_OUT_ENDPOINT, payload);
    window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: { action: 'clock-out' } }));
    return response.data;
  }
};

export default attendanceService;

