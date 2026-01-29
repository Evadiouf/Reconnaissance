import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import Logo from '../components/Logo';
import attendanceService from '../services/attendanceService';
import companiesService from '../services/companiesService';
import usersService from '../services/usersService';

function SuiviPresences() {
  const [companyId, setCompanyId] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalRetards: 0,
    tauxPresence: 0
  });

  useEffect(() => {
    const fetchCompanyId = async () => {
      try {
        const id = await companiesService.getMyCompanyId();
        if (id) {
          setCompanyId(id);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du companyId:', error);
      }
    };
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      // Par défaut, ne pas filtrer par dates pour voir toutes les données
      setDateFrom('');
      setDateTo('');
      loadEmployees();
    }
  }, [companyId]);

  // Charger les données initiales une fois que companyId est disponible
  useEffect(() => {
    if (companyId) {
      loadAttendanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadEmployees = async () => {
    try {
      // Utiliser le nouvel endpoint qui fonctionne
      const allUsers = await companiesService.getCompanyEmployees();
      console.log('Employés chargés pour les filtres:', allUsers);
      setEmployees(allUsers || []);
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
      setEmployees([]);
    }
  };

  // Fonction pour créer une date locale correcte pour MongoDB
  const createLocalDate = (dateString, isEndOfDay = false) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isEndOfDay) {
      // Fin de journée : 23:59:59.999
      date.setHours(23, 59, 59, 999);
    } else {
      // Début de journée : 00:00:00.000
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const loadAttendanceData = useCallback(async (filters = {}) => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const params = {
        companyId,
        page: filters.page !== undefined ? filters.page : currentPage,
        limit: 50
      };

      // Utiliser les filtres fournis ou les valeurs par défaut
      const dateFromValue = filters.dateFrom !== undefined ? filters.dateFrom : dateFrom;
      const dateToValue = filters.dateTo !== undefined ? filters.dateTo : dateTo;
      const searchValue = filters.searchTerm !== undefined ? filters.searchTerm : searchTerm;
      const employeeValue = filters.selectedEmployee !== undefined ? filters.selectedEmployee : selectedEmployee;

      if (dateFromValue) {
        const fromDate = createLocalDate(dateFromValue, false);
        params.from = fromDate.toISOString();
        console.log('📅 Date début (local):', fromDate.toLocaleString(), '→ ISO:', fromDate.toISOString());
      }
      if (dateToValue) {
        const toDate = createLocalDate(dateToValue, true);
        params.to = toDate.toISOString();
        console.log('📅 Date fin (local):', toDate.toLocaleString(), '→ ISO:', toDate.toISOString());
      }
      
      // Ajouter les filtres d'employé et de recherche
      if (employeeValue && employeeValue !== 'all') {
        params.userId = employeeValue;
      }
      
      if (searchValue && searchValue.trim()) {
        params.search = searchValue.trim();
      }

      console.log('Chargement des donnees avec les parametres:', params);

      const response = await attendanceService.getCompanyAttendance(params);
      
      setAttendanceData(response.items || []);
      setFilteredData(response.items || []);
      setTotalPages(Math.ceil((response.total || 0) / (response.limit || 50)));
      
      calculateStatistics(response.items || []);
    } catch (error) {
      console.error('Erreur lors du chargement des données de pointage:', error);
      setAttendanceData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentPage]);

  // Recharger les données seulement quand companyId, currentPage ou dates changent
  useEffect(() => {
    if (companyId) {
      loadAttendanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, currentPage]);

  // Rafraîchir automatiquement après un pointage (clock-in / clock-out)
  useEffect(() => {
    const handler = () => {
      // Repartir sur la page 1 pour voir immédiatement le dernier pointage
      setCurrentPage(1);
      loadAttendanceData({ page: 1 });
    };

    window.addEventListener('attendanceUpdated', handler);
    return () => {
      window.removeEventListener('attendanceUpdated', handler);
    };
  }, [loadAttendanceData]);

  const handleDateFromChange = (e) => {
    const newDateFrom = e.target.value;
    setDateFrom(newDateFrom);
    // Appliquer automatiquement le filtre quand on change la date
    setCurrentPage(1);
    loadAttendanceData({ 
      page: 1,
      dateFrom: newDateFrom,
      dateTo: dateTo,
      searchTerm: searchTerm,
      selectedEmployee: selectedEmployee
    });
  };

  const handleDateToChange = (e) => {
    const newDateTo = e.target.value;
    setDateTo(newDateTo);
    // Appliquer automatiquement le filtre quand on change la date
    setCurrentPage(1);
    loadAttendanceData({ 
      page: 1,
      dateFrom: dateFrom,
      dateTo: newDateTo,
      searchTerm: searchTerm,
      selectedEmployee: selectedEmployee
    });
  };

  const handleEmployeeChange = (e) => {
    const newEmployee = e.target.value;
    setSelectedEmployee(newEmployee);
    // Appliquer automatiquement le filtre quand on change l'employé
    setCurrentPage(1);
    loadAttendanceData({ 
      page: 1,
      dateFrom: dateFrom,
      dateTo: dateTo,
      searchTerm: searchTerm,
      selectedEmployee: newEmployee
    });
  };

  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    
    // Appliquer automatiquement le filtre de recherche immédiatement
    setCurrentPage(1);
    loadAttendanceData({ 
      page: 1,
      dateFrom: dateFrom,
      dateTo: dateTo,
      searchTerm: newSearchTerm,
      selectedEmployee: selectedEmployee
    });
  };

  const calculateStatistics = (data) => {
    const uniqueEmployees = new Set();
    let retardsCount = 0;
    const threshold = new Date();
    threshold.setHours(9, 0, 0, 0);

    data.forEach(entry => {
      if (entry.userId) {
        uniqueEmployees.add(entry.userId);
      }
      
      if (entry.clockInTime) {
        const clockInDate = new Date(entry.clockInTime);
        const entryThreshold = new Date(clockInDate);
        entryThreshold.setHours(9, 0, 0, 0);
        
        if (clockInDate > entryThreshold) {
          retardsCount++;
        }
      }
    });

    const totalPresent = uniqueEmployees.size;
    const totalEmployees = employees.length || totalPresent;
    const totalAbsent = Math.max(0, totalEmployees - totalPresent);
    const tauxPresence = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;

    setStatistics({
      totalPresent,
      totalAbsent,
      totalRetards: retardsCount,
      tauxPresence
    });
  };

  // Les filtres sont maintenant appliqués côté serveur, donc on affiche directement les données reçues
  useEffect(() => {
    setFilteredData(attendanceData);
    calculateStatistics(attendanceData);
  }, [attendanceData]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (entry) => {
    if (!entry.clockInTime) {
      return <span className="px-2 py-1 rounded-md text-xs font-medium bg-[rgba(216,67,67,0.1)] text-[#D84343]">Absent</span>;
    }

    const clockInDate = new Date(entry.clockInTime);
    const threshold = new Date(clockInDate);
    threshold.setHours(9, 0, 0, 0);

    if (clockInDate > threshold) {
      return <span className="px-2 py-1 rounded-md text-xs font-medium bg-[rgba(255,143,24,0.1)] text-[#FF8F18]">Retard</span>;
    }

    return <span className="px-2 py-1 rounded-md text-xs font-medium bg-[rgba(1,160,78,0.1)] text-[#01A04E]">Présent</span>;
  };

  const handleApplyFilters = () => {
    console.log('Application des filtres:', { searchTerm, selectedEmployee, dateFrom, dateTo });
    // Réinitialiser à la première page et charger avec les filtres actuels
    setCurrentPage(1);
    loadAttendanceData({ 
      page: 1,
      searchTerm: searchTerm,
      selectedEmployee: selectedEmployee,
      dateFrom: dateFrom,
      dateTo: dateTo
    });
  };

  const resetFilters = () => {
    // Réinitialiser tous les filtres
    setSearchTerm('');
    setSelectedEmployee('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    
    // Recharger les données avec les filtres réinitialisés
    setTimeout(() => {
      loadAttendanceData({ 
        page: 1, 
        searchTerm: '', 
        selectedEmployee: 'all', 
        dateFrom: '', 
        dateTo: '' 
      });
    }, 0);
  };

  return (
    <div className="flex min-h-screen bg-[#ECEFEF]">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[#D4DCDC] px-[30px] py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Logo />
            <h1 className="font-instrument text-[22px] font-bold text-[#002222] leading-[34px]">
              Suivi des Présences
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </header>

        <main className="flex-1 p-[30px] overflow-auto">
          <div className="mb-5 bg-white border border-[#D4DCDC] rounded-2xl p-5">
            <h2 className="font-instrument text-base font-semibold text-[#002222] mb-4">Statistiques Globales</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[rgba(1,160,78,0.1)] border border-[#01A04E] rounded-xl p-4">
                <p className="text-sm text-[#5A6565] mb-1">Employés Présents</p>
                <p className="text-2xl font-bold text-[#01A04E]">{statistics.totalPresent}</p>
              </div>
              <div className="bg-[rgba(216,67,67,0.1)] border border-[#D84343] rounded-xl p-4">
                <p className="text-sm text-[#5A6565] mb-1">Employés Absents</p>
                <p className="text-2xl font-bold text-[#D84343]">{statistics.totalAbsent}</p>
              </div>
              <div className="bg-[rgba(255,143,24,0.1)] border border-[#FF8F18] rounded-xl p-4">
                <p className="text-sm text-[#5A6565] mb-1">Retards</p>
                <p className="text-2xl font-bold text-[#FF8F18]">{statistics.totalRetards}</p>
              </div>
              <div className="bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-xl p-4">
                <p className="text-sm text-[#5A6565] mb-1">Taux de Présence</p>
                <p className="text-2xl font-bold text-[#0389A6]">{statistics.tauxPresence}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-base font-semibold text-[#002222] mb-4">Filtres de Recherche</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A6565] mb-2">Rechercher</label>
                  <input
                    type="text"
                    placeholder="Nom ou email..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full px-4 py-2 border border-[#D4DCDC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0389A6] text-[#002222] placeholder:text-[#5A6565] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A6565] mb-2">Employé</label>
                  <select
                    value={selectedEmployee}
                    onChange={handleEmployeeChange}
                    className="w-full px-4 py-2 border border-[#D4DCDC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0389A6] text-[#002222] bg-white"
                  >
                    <option value="all">Tous les employés</option>
                    {employees.map(emp => (
                      <option key={emp._id || emp.id} value={emp._id || emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A6565] mb-2">Date début</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={handleDateFromChange}
                    className="w-full px-4 py-2 border border-[#D4DCDC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0389A6] text-[#002222] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5A6565] mb-2">Date fin</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={handleDateToChange}
                    className="w-full px-4 py-2 border border-[#D4DCDC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0389A6] text-[#002222] bg-white"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleApplyFilters();
                  }}
                  className="px-4 py-2 bg-[#0389A6] text-white rounded-xl hover:bg-[#027A94] transition-colors font-medium"
                >
                  Appliquer les filtres
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    resetFilters();
                  }}
                  className="px-4 py-2 border border-[#D4DCDC] rounded-xl hover:bg-[#ECEFEF] transition-colors font-medium text-[#002222]"
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="text-center py-10">
                  <p className="text-[#5A6565]">Chargement des données...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[#5A6565]">Aucun pointage trouvé pour les critères sélectionnés</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#D4DCDC]">
                          <th className="text-left py-3 px-4 font-instrument text-sm font-semibold text-[#002222]">Employé</th>
                          <th className="text-left py-3 px-4 font-instrument text-sm font-semibold text-[#002222]">Email</th>
                          <th className="text-left py-3 px-4 font-instrument text-sm font-semibold text-[#002222]">Date</th>
                          <th className="text-left py-3 px-4 font-instrument text-sm font-semibold text-[#002222]">Heure Entrée</th>
                          <th className="text-left py-3 px-4 font-instrument text-sm font-semibold text-[#002222]">Heure Sortie</th>
                          <th className="text-left py-3 px-4 font-instrument text-sm font-semibold text-[#002222]">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((entry, index) => (
                          <tr key={entry.id || index} className="border-b border-[#D4DCDC] hover:bg-[#ECEFEF] transition-colors">
                            <td className="py-3 px-4 font-instrument text-sm text-[#002222]">
                              {entry.user?.firstName && entry.user?.lastName ? 
                                `${entry.user.firstName} ${entry.user.lastName}` : 
                                entry.name || 
                                entry.employeeName || 
                                entry.email?.split('@')[0] || 
                                'Employé'
                              }
                            </td>
                            <td className="py-3 px-4 font-instrument text-sm text-[#5A6565]">
                              {entry.email || entry.user?.email || 'Non disponible'}
                            </td>
                            <td className="py-3 px-4 font-instrument text-sm text-[#5A6565]">
                              {formatDate(entry.clockInTime)}
                            </td>
                            <td className="py-3 px-4 font-instrument text-sm text-[#5A6565]">
                              {formatTime(entry.clockInTime)}
                            </td>
                            <td className="py-3 px-4 font-instrument text-sm text-[#5A6565]">
                              {entry.clockOutTime ? formatTime(entry.clockOutTime) : 'En cours'}
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(entry)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-5 flex justify-center items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-[#D4DCDC] rounded-xl hover:bg-[#ECEFEF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Précédent
                      </button>
                      <span className="px-4 py-2 font-instrument text-sm text-[#5A6565]">
                        Page {currentPage} sur {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-[#D4DCDC] rounded-xl hover:bg-[#ECEFEF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Suivant
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default SuiviPresences;
