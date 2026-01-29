import apiClient from './apiClient';

const COMPANIES_ENDPOINT = '/api/v1/companies';
const COMPANY_TYPES_ENDPOINT = '/api/v1/company-types';
const COMPANY_INVITATIONS_ENDPOINT = '/api/v1/company-invitations';

export const companiesService = {
  async getCompanyTypesPublic() {
    const response = await apiClient.get(`${COMPANY_TYPES_ENDPOINT}/public`);
    return response.data;
  },

  async createCompanyInvitation({ email, companyName, typeId, address, phone, website }) {
    const payload = {
      email: email?.trim().toLowerCase(),
      companyName: companyName?.trim(),
      typeId,
    };

    if (address) payload.address = address.trim();
    if (phone) payload.phone = phone.trim();
    if (website) payload.website = website.trim();

    if (!payload.email || !payload.companyName || !payload.typeId) {
      throw new Error("email, companyName et typeId sont requis");
    }

    const response = await apiClient.post(COMPANY_INVITATIONS_ENDPOINT, payload);
    return response.data;
  },

  async create({ name, typeId, address, phone, email, website, contactName, contactEmail, plan }) {
    const payload = {
      name: name?.trim(),
      typeId: typeId
    };
    
    // Ajouter les champs optionnels s'ils sont fournis
    if (address) payload.address = address.trim();
    if (phone) payload.phone = phone.trim();
    if (email) payload.email = email.trim();
    if (website) payload.website = website.trim();
    if (contactName) payload.contactName = contactName.trim();
    if (contactEmail) payload.contactEmail = contactEmail.trim();
    if (plan) payload.plan = plan.trim();
    
    // Valider que les propriétés requises sont présentes
    if (!payload.name || !payload.typeId) {
      throw new Error('Le nom et le typeId sont requis pour créer une entreprise');
    }
    
    // Valider le format de typeId (ObjectId MongoDB: 24 caractères hexadécimaux)
    if (!/^[0-9a-fA-F]{24}$/.test(payload.typeId)) {
      throw new Error('Le typeId doit être un ObjectId MongoDB valide (24 caractères hexadécimaux)');
    }
    
    const response = await apiClient.post(COMPANIES_ENDPOINT, payload);
    return response.data;
  },

  async getMyCompanies() {
    const response = await apiClient.get(COMPANIES_ENDPOINT);
    // S'assurer de retourner un tableau même si la réponse est dans response.data.data
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else if (data && Array.isArray(data.items)) {
      return data.items;
    } else if (data && Array.isArray(data.companies)) {
      return data.companies;
    }
    // Si ce n'est pas un tableau, retourner un tableau vide
    console.warn('Format de réponse inattendu pour getMyCompanies:', data);
    return [];
  },

  async getAllCompanies() {
    const response = await apiClient.get(`${COMPANIES_ENDPOINT}/all`);
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else if (data && Array.isArray(data.items)) {
      return data.items;
    } else if (data && Array.isArray(data.companies)) {
      return data.companies;
    }
    console.warn('Format de réponse inattendu pour getAllCompanies:', data);
    return [];
  },

  async getMyCompanyId() {
    try {
      const response = await apiClient.get(`${COMPANIES_ENDPOINT}/my-company-id`);
      return response.data?.companyId || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du companyId:', error);
      return null;
    }
  },

  async inviteRH({ email, role, department, sessionTimeout }) {
    const payload = {
      email: email?.trim().toLowerCase(),
      role: role?.trim(),
      department: department?.trim(),
    };
    
    // Ajouter sessionTimeout s'il est fourni
    if (sessionTimeout) {
      payload.sessionTimeout = sessionTimeout;
    }
    
    // Valider que les propriétés requises sont présentes
    if (!payload.email || !payload.role || !payload.department) {
      throw new Error('L\'email, le rôle et le département sont requis pour envoyer une invitation');
    }
    
    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      throw new Error('L\'adresse email n\'est pas valide');
    }
    
    const response = await apiClient.post(`${COMPANIES_ENDPOINT}/invite-rh`, payload);
    return response.data;
  },

  async getCompanyEmployees() {
    try {
      const response = await apiClient.get(`${COMPANIES_ENDPOINT}/employees`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des employés:', error);
      return [];
    }
  },

  async getAllCompaniesWithEmployees() {
    const response = await apiClient.get(`${COMPANIES_ENDPOINT}/all-with-employees`);
    return response.data;
  }
};

export default companiesService;





