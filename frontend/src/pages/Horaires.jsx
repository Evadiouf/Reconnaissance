import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import schedulesService from '../services/schedulesService';

function Horaires() {
  // État pour les onglets
  const [activeTab, setActiveTab] = useState('calendrier');
  
  // État pour les menus déroulants
  const [openActionMenu, setOpenActionMenu] = useState(null);

  // État pour le calendrier
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // État pour la modal "Créer un horaire"
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    breakStart: '',
    breakEnd: '',
    breakDuration: '',
    workDays: [],
    department: '',
    employees: ''
  });

  // État pour la modal "Modifier l'horaire"
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    breakStart: '',
    breakEnd: '',
    breakDuration: '',
    workDays: [],
    department: '',
    employees: ''
  });

  // Données des horaires (état dynamique) - initialisé à zéro
  const [schedules, setSchedules] = useState([]);

  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  const colorPalette = ['#0389A6', '#01A04E', '#FF8F18', '#8B5CF6', '#D84343', '#F59E0B', '#3B82F6'];

  const formatWorkDays = (workDays) => {
    const days = Array.isArray(workDays) ? workDays : [];
    if (days.length === 7) return 'Tous les jours';
    const hasWeekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].every((d) => days.includes(d));
    if (days.length === 5 && hasWeekdays) return 'Lundi - Vendredi';
    const hasWeekend = ['Samedi', 'Dimanche'].every((d) => days.includes(d));
    if (days.length === 2 && hasWeekend) return 'Samedi - Dimanche';
    return days.join(', ');
  };

  const minutesToLabel = (minutes) => {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m <= 0) return 'Aucune';
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rest = m % 60;
      return rest > 0 ? `${h}h${rest}min` : `${h}h`;
    }
    return `${m}min`;
  };

  const computeBreakMinutes = (breakStart, breakEnd) => {
    if (!breakStart || !breakEnd) return null;
    const start = new Date(`2000-01-01 ${breakStart}`);
    const end = new Date(`2000-01-01 ${breakEnd}`);
    const diffMinutes = (end - start) / (1000 * 60);
    if (!Number.isFinite(diffMinutes) || diffMinutes <= 0) return null;
    return Math.round(diffMinutes);
  };

  const mapApiScheduleToUi = (apiSchedule, index) => {
    const breakMinutes =
      apiSchedule?.breakDurationMinutes ??
      computeBreakMinutes(apiSchedule?.breakStart, apiSchedule?.breakEnd);

    return {
      id: apiSchedule?._id || apiSchedule?.id,
      name: apiSchedule?.name,
      startTime: apiSchedule?.startTime,
      endTime: apiSchedule?.endTime,
      breakStart: apiSchedule?.breakStart || null,
      breakEnd: apiSchedule?.breakEnd || null,
      breakDuration: minutesToLabel(breakMinutes),
      days: formatWorkDays(apiSchedule?.workDays),
      department: apiSchedule?.department || 'Tous',
      employees: Number.isFinite(Number(apiSchedule?.employees)) ? Number(apiSchedule?.employees) : 0,
      graceMinutes: apiSchedule?.graceMinutes ?? 0,
      color: colorPalette[index % colorPalette.length],
    };
  };

  const fetchSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      const apiSchedules = await schedulesService.list();
      const mapped = (Array.isArray(apiSchedules) ? apiSchedules : []).map((s, idx) => mapApiScheduleToUi(s, idx));
      setSchedules(mapped);
    } catch (err) {
      console.error('Erreur chargement horaires:', err);
      setSchedules([]);
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Fonction pour fermer les menus
  const closeAllMenus = () => {
    setOpenActionMenu(null);
  };

  // Fonctions pour la modal
  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      name: '',
      startTime: '',
      endTime: '',
      breakStart: '',
      breakEnd: '',
      breakDuration: '',
      workDays: [],
      department: '',
      employees: ''
    });
  };

  // Fonction pour gérer les changements de formulaire
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fonction pour gérer la sélection des jours
  const toggleWorkDay = (day) => {
    setFormData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day]
    }));
  };

  // Fonction pour calculer la durée de travail
  const calculateWorkDuration = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const start = new Date(`2000-01-01 ${formData.startTime}`);
    const end = new Date(`2000-01-01 ${formData.endTime}`);
    const diff = (end - start) / (1000 * 60 * 60); // en heures
    return Math.max(0, diff);
  };

  // Fonctions pour la modal de modification
  const openEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setEditFormData({
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakStart: schedule.breakStart || '',
      breakEnd: schedule.breakEnd || '',
      breakDuration: schedule.breakDuration,
      workDays: schedule.days === 'Lundi - Vendredi' 
        ? ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
        : schedule.days === 'Samedi - Dimanche'
        ? ['Samedi', 'Dimanche']
        : [],
      department: schedule.department || '',
      employees: schedule.employees.toString()
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingSchedule(null);
    setEditFormData({
      name: '',
      startTime: '',
      endTime: '',
      breakStart: '',
      breakEnd: '',
      breakDuration: '',
      workDays: [],
      department: '',
      employees: ''
    });
  };

  // Fonction pour gérer les changements du formulaire de modification
  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fonction pour gérer la sélection des jours dans le formulaire de modification
  const toggleEditWorkDay = (day) => {
    setEditFormData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day]
    }));
  };

  // Fonction pour calculer la durée de travail pour la modification
  const calculateEditWorkDuration = () => {
    if (!editFormData.startTime || !editFormData.endTime) return 0;
    const start = new Date(`2000-01-01 ${editFormData.startTime}`);
    const end = new Date(`2000-01-01 ${editFormData.endTime}`);
    const diff = (end - start) / (1000 * 60 * 60); // en heures
    return Math.max(0, diff);
  };

  // Fonction pour formater une date en français
  const formatDateLong = (date) => {
    try {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
      }
      const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const day = days[date.getDay()];
      const dayNumber = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${dayNumber} ${month} ${year}`;
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return '';
    }
  };

  // Fonction pour générer le calendrier
  const renderCalendar = () => {
    try {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    const firstDayWeek = (firstDay.getDay() + 6) % 7; // 0 = Lundi, 6 = Dimanche
    
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Jours du mois précédent à afficher
    const prevMonthLastDay = new Date(year, month, 0);
    const daysInPrevMonth = prevMonthLastDay.getDate();
    
    // Navigation mois précédent/suivant
    const goToPrevMonth = () => {
      setCurrentDate(new Date(year, month - 1, 1));
    };
    
    const goToNextMonth = () => {
      setCurrentDate(new Date(year, month + 1, 1));
    };
    
    // Vérifier si un jour est le jour sélectionné
    const isSelected = (day, itemDate) => {
      if (!selectedDate) return false;
      return day === selectedDate.getDate() && 
             month === selectedDate.getMonth() && 
             year === selectedDate.getFullYear() &&
             itemDate.getDate() === selectedDate.getDate() &&
             itemDate.getMonth() === selectedDate.getMonth() &&
             itemDate.getFullYear() === selectedDate.getFullYear();
    };
    
    // Générer les jours à afficher
    const days = [];
    
    // Jours du mois précédent (si nécessaire)
    const prevMonthDays = firstDayWeek === 0 ? 0 : firstDayWeek;
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      days.push({ day, isCurrentMonth: false, isWeekend: isWeekendDay, date: date });
    }
    
    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay(); // 0 = Dimanche, 6 = Samedi
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6; // Dimanche ou Samedi
      
      days.push({ 
        day, 
        isCurrentMonth: true, 
        isWeekend: isWeekendDay,
        date: date
      });
    }
    
    // Jours du mois suivant (pour compléter la grille - 6 semaines)
    const remainingDays = 42 - days.length; // 6 semaines × 7 jours
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dayOfWeek = date.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      days.push({ day, isCurrentMonth: false, isWeekend: isWeekendDay, date: date });
    }
    
    return (
      <div className="bg-white p-2">
        {/* En-tête du calendrier avec navigation */}
        <div className="flex justify-between items-center px-2 py-2 mb-2">
          {/* Flèche gauche */}
          <button
            onClick={goToPrevMonth}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-md hover:bg-[#ECEFEF] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 3L6 9L11 15" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Mois et Année */}
          <div className="flex items-center gap-2">
            <span className="font-inter text-xl font-semibold text-[#002222]">{months[month]}</span>
            <span className="font-inter text-xl font-semibold text-[#002222]">{year}</span>
          </div>
          
          {/* Flèche droite */}
          <button
            onClick={goToNextMonth}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-md hover:bg-[#ECEFEF] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 3L12 9L7 15" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7">
          {weekdays.map((day, index) => (
            <div
              key={index}
              className="flex justify-center items-center py-3"
            >
              <span className={`font-instrument text-lg font-semibold ${
                index >= 5 ? 'text-[#D4DCDC]' : 'text-[#002222]'
              }`}>
                {day}
              </span>
            </div>
          ))}
        </div>
        
        {/* Séparateur */}
        <div className="h-px bg-[#F5F5F5] my-1"></div>
        
        {/* Grille des jours */}
        <div className="grid grid-cols-7">
          {days.map((item, index) => {
            const isSelectedDay = item.isCurrentMonth && isSelected(item.day, item.date);
            
            return (
              <button
                key={index}
                onClick={() => {
                  if (item.isCurrentMonth) {
                    setSelectedDate(item.date);
                  }
                }}
                className={`
                  w-12 h-12 flex items-center justify-center rounded-2xl transition-colors mx-auto
                  ${!item.isCurrentMonth ? 'opacity-35' : ''}
                  ${
                    isSelectedDay 
                      ? 'bg-[#0389A6] text-white' 
                      : !item.isCurrentMonth
                        ? 'text-[#8494A7]'
                        : item.isWeekend
                          ? 'text-[#D4DCDC]'
                          : 'text-[#002222]'
                  }
                  ${item.isCurrentMonth && !isSelectedDay ? 'hover:bg-[#ECEFEF]' : ''}
                `}
              >
                <span className="font-instrument text-lg font-normal">
                  {item.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
    } catch (error) {
      console.error('Erreur lors du rendu du calendrier:', error);
      return (
        <div className="bg-white p-5 text-center">
          <p className="font-instrument text-base text-[#5A6565]">Erreur lors du chargement du calendrier</p>
        </div>
      );
    }
  };

  // Icône SVG pour add-circle
  const AddCircleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8V16M8 12H16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône SVG pour clock
  const ClockIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 6V12L16 14" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône SVG pour calendar
  const CalendarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône SVG pour users
  const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 20H22V18C22 16.3431 20.2091 15 18 15C16.7909 15 15.7 15.4 15 16M15 16C15 14.3431 13.2091 13 11 13C8.79086 13 7 14.3431 7 16M15 16V20H7M13 7C13 8.65685 11.6569 10 10 10C8.34315 10 7 8.65685 7 7C7 5.34315 8.34315 4 10 4C11.6569 4 13 5.34315 13 7ZM20 7C20 8.10457 19.1046 9 18 9C16.8954 9 16 8.10457 16 7C16 5.89543 16.8954 5 18 5C19.1046 5 20 5.89543 20 7Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône SVG pour more vertical
  const MoreVerticalIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" fill="#5A6565" stroke="#5A6565"/>
      <path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" fill="#5A6565" stroke="#5A6565"/>
      <path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" fill="#5A6565" stroke="#5A6565"/>
    </svg>
  );

  // Icône SVG pour arrow down
  const ArrowDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Top bar */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-20 flex items-center justify-between">
          <div className="font-audiowide text-2xl" style={{ color: '#002222' }}>Sen Pointage</div>
          <div className="flex items-center gap-4">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr]" style={{ minHeight: 'calc(100vh - 70px)' }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main */}
        <main className="p-5 md:p-8 space-y-5">
          {/* Header with title and button */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2.5">
              <h2 className="font-audiowide text-[26px] text-[#002222]">Gestion des horaires</h2>
              <p className="font-instrument text-base text-[#5A6565]">Configurez et gérez les plannings de travail pour vos équipes</p>
            </div>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                openCreateModal();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-[#0389A6] rounded-2xl font-instrument text-base text-white hover:bg-[#027A8F] transition-colors cursor-pointer"
            >
              <AddCircleIcon />
              Créer un horaire
            </button>
          </div>

          {/* Onglets */}
          <div className="bg-[#D4DCDC] rounded-2xl p-1 flex gap-1 w-fit">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('horaires'); }}
              className={`px-4 py-2.5 rounded-xl font-instrument text-base transition-colors cursor-pointer ${
                activeTab === 'horaires' ? 'bg-white text-[#002222]' : 'bg-transparent text-[#002222]'
              }`}
            >
              Horaires configurés
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('calendrier'); }}
              className={`px-4 py-2.5 rounded-xl font-instrument text-base transition-colors cursor-pointer ${
                activeTab === 'calendrier' ? 'bg-white text-[#002222]' : 'bg-transparent text-[#002222]'
              }`}
            >
              Vue calendrier
            </button>
          </div>

          {/* Contenu selon l'onglet actif */}
          {activeTab === 'horaires' && (
            <>
              {/* Section Horaires configurées */}
              {schedules.length === 0 ? (
                <div className="bg-white border border-[#D4DCDC] rounded-2xl p-12">
                  <div className="flex flex-col items-center justify-center gap-5 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#ECEFEF] flex items-center justify-center">
                      <ClockIcon />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-audiowide text-xl text-[#002222]">
                        Aucun horaire configuré
                      </h3>
                      <p className="font-instrument text-base text-[#5A6565]">
                        Vous n'avez pas encore créé d'horaire. Cliquez sur "Créer un horaire" pour commencer.
                      </p>
                    </div>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        openCreateModal();
                      }}
                      className="flex items-center gap-2.5 px-6 py-3 bg-[#0389A6] rounded-2xl font-instrument text-base text-white hover:bg-[#027A8F] transition-colors cursor-pointer"
                    >
                      <AddCircleIcon />
                      Créer un horaire
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Compteur d'horaires */}
                  <div className="flex items-center justify-between">
                    <p className="font-instrument text-base text-[#5A6565]">
                      {schedules.length} {schedules.length === 1 ? 'horaire configuré' : 'horaires configurés'}
                    </p>
                  </div>
                  
              {/* Grille des horaires */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="bg-white border border-[#D4DCDC] rounded-2xl p-5 space-y-5">
                    {/* En-tête de la carte */}
                    <div className="space-y-5">
                      {/* Titre et badge */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="font-audiowide text-xl text-[#002222]">{schedule.name}</h3>
                          <div className="flex items-center gap-2">
                            <ClockIcon />
                            <span className="font-instrument text-base text-[#002222]">
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => { 
                              try {
                                e.stopPropagation(); 
                                e.preventDefault();
                                setOpenActionMenu(openActionMenu === schedule.id ? null : schedule.id); 
                              } catch (error) {
                                console.error('Erreur lors de l\'ouverture du menu:', error);
                              }
                            }}
                            className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors cursor-pointer"
                          >
                            <MoreVerticalIcon />
                          </button>
                          {openActionMenu === schedule.id && (
                            <div className="absolute bottom-full right-0 mb-2 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-20 min-w-[150px]">
                              <button
                                type="button"
                                onClick={(e) => { 
                                  try {
                                    e.stopPropagation(); 
                                    e.preventDefault();
                                    setOpenActionMenu(null); 
                                    openEditModal(schedule);
                                  } catch (error) {
                                    console.error('Erreur lors de la modification:', error);
                                  }
                                }}
                                className="w-full text-left px-4 py-2.5 font-instrument text-sm text-[#5A6565] hover:bg-[#ECEFEF] transition-colors"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { 
                                  try {
                                    e.stopPropagation(); 
                                    e.preventDefault();
                                    setOpenActionMenu(null);
                                        if (confirm('Êtes-vous sûr de vouloir supprimer cet horaire ?')) {
                                          schedulesService
                                            .remove(schedule.id)
                                            .then(() => {
                                              setSchedules(prev => prev.filter(s => s.id !== schedule.id));
                                            })
                                            .catch((err) => {
                                              console.error('Erreur lors de la suppression:', err);
                                            });
                                        }
                                  } catch (error) {
                                        console.error('Erreur lors de la suppression:', error);
                                  }
                                }}
                                className="w-full text-left px-4 py-2.5 font-instrument text-sm text-[#D84343] hover:bg-[#ECEFEF] transition-colors"
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Badge pause */}
                      <div className="inline-flex items-center gap-2.5 px-2.5 py-1 bg-[#ECEFEF] rounded-2xl">
                        <span className="font-instrument text-sm font-medium text-[#002222]">
                              Pause: {schedule.breakDuration || 'Aucune'}
                        </span>
                      </div>
                    </div>

                    {/* Séparateur */}
                    <div className="h-px bg-[#D4DCDC]"></div>

                    {/* Informations supplémentaires */}
                    <div className="space-y-4">
                      {/* Jours */}
                      <div className="flex items-center gap-3">
                        <CalendarIcon />
                            <span className="font-instrument text-base text-[#5A6565]">{schedule.days || 'Non spécifié'}</span>
                      </div>

                      {/* Employés */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UsersIcon />
                          <span className="font-instrument text-base text-[#5A6565]">
                                {schedule.employees || 0} {schedule.employees === 1 ? 'employé' : 'employés'}
                          </span>
                        </div>
                        <div 
                          className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: schedule.color || '#0389A6' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                </>
              )}
            </>
          )}

          {activeTab === 'calendrier' && (
            <div className="flex flex-col lg:flex-row gap-5 min-h-[600px]">
              {/* Calendrier */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden w-full lg:w-[352px]">
                <div className="flex items-center gap-4 px-5 py-2.5 border-b border-[#D4DCDC]">
                  {/* Icône calendrier */}
                  <CalendarIcon />
                  <h3 className="font-audiowide text-xl font-normal text-[#002222]">Calendrier</h3>
                </div>
                <div className="p-2">
                  {renderCalendar()}
                </div>
              </div>

              {/* Section Détails */}
              <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                <div className="px-5 py-2.5 border-b border-[#D4DCDC]">
                  {selectedDate ? (
                    <div className="space-y-1.5">
                      <h3 className="font-audiowide text-xl font-normal text-[#002222]">
                        Plannings du {formatDateLong(selectedDate)}
                      </h3>
                      <p className="font-instrument text-base text-[#5A6565]">
                        Vue d'ensemble des horaires actifs pour cette date
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <h3 className="font-audiowide text-xl font-normal text-[#002222]">
                        Sélectionnez une date
                      </h3>
                      <p className="font-instrument text-base text-[#5A6565]">
                        Cliquez sur une date dans le calendrier pour voir les horaires
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {selectedDate ? (
                    schedules.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#ECEFEF] flex items-center justify-center">
                          <ClockIcon />
                        </div>
                        <p className="font-instrument text-base text-[#5A6565]">
                          Aucun horaire configuré pour cette date
                        </p>
                      </div>
                    ) : (
                    <div className="space-y-5">
                        {/* Cartes d'horaires avec détails */}
                      {schedules.map((schedule) => (
                        <div key={schedule.id} className="bg-white border border-[#D4DCDC] rounded-2xl p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Pastille de couleur */}
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: schedule.color || '#0389A6' }}
                            ></div>
                            <div className="space-y-1">
                              <h4 className="font-instrument text-base font-semibold text-[#002222]">
                                {schedule.name}
                              </h4>
                              <p className="font-instrument text-sm text-[#5A6565]">
                                  {schedule.startTime} - {schedule.endTime} • {schedule.department || schedule.days || 'Non spécifié'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-[#5A6565]">
                              <UsersIcon />
                              <span className="font-instrument text-sm">
                                  {schedule.employees || 0} {schedule.employees === 1 ? 'employé' : 'employés'}
                              </span>
                            </div>
                            {/* Menu actions */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => { 
                                  try {
                                    e.stopPropagation(); 
                                    e.preventDefault();
                                    setOpenActionMenu(openActionMenu === `calendar-${schedule.id}` ? null : `calendar-${schedule.id}`); 
                                  } catch (error) {
                                    console.error('Erreur lors de l\'ouverture du menu:', error);
                                  }
                                }}
                                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors cursor-pointer"
                              >
                                <MoreVerticalIcon />
                              </button>
                              {openActionMenu === `calendar-${schedule.id}` && (
                                <div className="absolute bottom-full right-0 mb-2 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-20 min-w-[150px]">
                                  <button
                                    type="button"
                                    onClick={(e) => { 
                                      try {
                                        e.stopPropagation(); 
                                        e.preventDefault();
                                        setOpenActionMenu(null); 
                                        openEditModal(schedule);
                                      } catch (error) {
                                        console.error('Erreur lors de la modification:', error);
                                      }
                                    }}
                                    className="w-full text-left px-4 py-2.5 font-instrument text-sm text-[#5A6565] hover:bg-[#ECEFEF] transition-colors"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { 
                                      try {
                                        e.stopPropagation(); 
                                        e.preventDefault();
                                        setOpenActionMenu(null);
                                        if (confirm('Êtes-vous sûr de vouloir supprimer cet horaire ?')) {
                                          setSchedules(prev => prev.filter(s => s.id !== schedule.id));
                                        }
                                      } catch (error) {
                                        console.error('Erreur lors de la suppression:', error);
                                      }
                                    }}
                                    className="w-full text-left px-4 py-2.5 font-instrument text-sm text-[#D84343] hover:bg-[#ECEFEF] transition-colors"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-10 py-20">
                      <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="#5A6565" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="font-instrument text-base text-[#5A6565] text-center">
                        Sélectionnez une date pour voir les horaires actifs
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Créer un horaire */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-base font-bold text-[#002222]">
                Créer un nouvel horaire
              </h2>
              <button 
                onClick={closeCreateModal}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              <p className="font-instrument text-base font-medium text-[#3E4B4B] mb-5">
                Définissez les heures de travail et les jours pour un groupe d'employés
              </p>

              <div className="space-y-5">
                {/* Ligne 1: Nom de l'horaire + Heure de début */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Nom de l'horaire *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                      placeholder="Ex: Horaire Standard"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Heure de début *
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Ligne 2: Heure de fin + Début de pause */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Heure de fin *
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Début de pause
                    </label>
                    <input
                      type="time"
                      value={formData.breakStart}
                      onChange={(e) => handleInputChange('breakStart', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Ligne 3: Fin de pause + Durée de pause */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Fin de pause
                    </label>
                    <input
                      type="time"
                      value={formData.breakEnd}
                      onChange={(e) => handleInputChange('breakEnd', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Durée de pause
                    </label>
                    <input
                      type="text"
                      value={formData.breakDuration}
                      onChange={(e) => handleInputChange('breakDuration', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                      placeholder="Ex: 1h"
                    />
                  </div>
                </div>

                {/* Jours de travail */}
                <div className="space-y-0.5">
                  <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                    Jour de travail *
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleWorkDay(day)}
                        className={`px-4 py-2.5 rounded-2xl border border-[#D4DCDC] font-instrument text-base transition-colors ${
                          formData.workDays.includes(day)
                            ? 'bg-[#0389A6] text-white border-[#0389A6]'
                            : 'bg-white text-[#002222] hover:bg-[#ECEFEF]'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ligne 4: Département + Nombre d'employés */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Département
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                      placeholder="Ex: Production"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Nombre d'employés
                    </label>
                    <input
                      type="number"
                      value={formData.employees}
                      onChange={(e) => handleInputChange('employees', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Résumé */}
                <div className="bg-[rgba(236,239,239,0.5)] border border-[#D4DCDC] rounded-2xl p-5">
                  <p className="font-instrument text-base font-semibold text-[#002222]">
                    Durée de travail: {calculateWorkDuration()}h
                    <br />
                    Jours sélectionnés: {formData.workDays.length}/7
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-5 px-8 py-3 border-t border-[#D4DCDC]">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] hover:bg-[#ECEFEF] transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={!formData.name || !formData.startTime || !formData.endTime || formData.workDays.length === 0}
                onClick={() => {
                  // Créer un nouvel horaire avec format standardisé
                  const newId = schedules.length > 0 ? Math.max(...schedules.map(s => s.id)) + 1 : 1;
                  
                  // Formater les jours de travail
                  let daysFormatted = '';
                  if (formData.workDays.length === 7) {
                    daysFormatted = 'Tous les jours';
                  } else if (formData.workDays.length === 5 && 
                             formData.workDays.includes('Lundi') && 
                             formData.workDays.includes('Mardi') &&
                             formData.workDays.includes('Mercredi') &&
                             formData.workDays.includes('Jeudi') &&
                             formData.workDays.includes('Vendredi')) {
                    daysFormatted = 'Lundi - Vendredi';
                  } else if (formData.workDays.length === 2 && 
                             formData.workDays.includes('Samedi') && 
                             formData.workDays.includes('Dimanche')) {
                    daysFormatted = 'Samedi - Dimanche';
                  } else {
                    daysFormatted = formData.workDays.join(', ');
                  }
                  
                  // Formater la durée de pause
                  let breakDurationFormatted = formData.breakDuration || 'Aucune';
                  if (formData.breakStart && formData.breakEnd) {
                    // Calculer automatiquement la durée si début et fin sont fournis
                    const start = new Date(`2000-01-01 ${formData.breakStart}`);
                    const end = new Date(`2000-01-01 ${formData.breakEnd}`);
                    const diffMinutes = (end - start) / (1000 * 60);
                    if (diffMinutes > 0) {
                      if (diffMinutes >= 60) {
                        const hours = Math.floor(diffMinutes / 60);
                        const minutes = diffMinutes % 60;
                        breakDurationFormatted = minutes > 0 ? `${hours}h${minutes}min` : `${hours}h`;
                      } else {
                        breakDurationFormatted = `${diffMinutes}min`;
                      }
                    }
                  }
                  
                  const breakMinutes = computeBreakMinutes(formData.breakStart, formData.breakEnd);

                  schedulesService
                    .create({
                      name: formData.name.trim(),
                      startTime: formData.startTime,
                      endTime: formData.endTime,
                      breakStart: formData.breakStart || undefined,
                      breakEnd: formData.breakEnd || undefined,
                      breakDurationMinutes: breakMinutes ?? undefined,
                      workDays: formData.workDays,
                      department: formData.department?.trim?.() || 'Tous',
                      employees: Number.isFinite(Number(formData.employees)) ? Number(formData.employees) : 0,
                    })
                    .then((created) => {
                      const mapped = mapApiScheduleToUi(created, schedules.length);
                      setSchedules((prev) => [mapped, ...prev]);
                      closeCreateModal();
                    })
                    .catch((err) => {
                      console.error('Erreur création horaire:', err);
                    });
                }}
                className={`px-4 py-2.5 rounded-2xl font-instrument text-base transition-colors ${
                  !formData.name || !formData.startTime || !formData.endTime || formData.workDays.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#0389A6] text-white hover:bg-[#027A94]'
                }`}
              >
                Créer l'horaire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier l'horaire */}
      {showEditModal && editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-base font-bold text-[#002222]">
                Modifier l'horaire
              </h2>
              <button 
                onClick={closeEditModal}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              <p className="font-instrument text-base font-medium text-[#3E4B4B] mb-5">
                Modifiez les heures de travail et les jours pour cet horaire
              </p>

              <div className="space-y-5">
                {/* Ligne 1: Nom de l'horaire + Heure de début */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Nom de l'horaire *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => handleEditInputChange('name', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                      placeholder="Ex: Horaire Standard"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Heure de début *
                    </label>
                    <input
                      type="time"
                      value={editFormData.startTime}
                      onChange={(e) => handleEditInputChange('startTime', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Ligne 2: Heure de fin + Début de pause */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Heure de fin *
                    </label>
                    <input
                      type="time"
                      value={editFormData.endTime}
                      onChange={(e) => handleEditInputChange('endTime', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Début de pause
                    </label>
                    <input
                      type="time"
                      value={editFormData.breakStart}
                      onChange={(e) => handleEditInputChange('breakStart', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Ligne 3: Fin de pause + Durée de pause */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Fin de pause
                    </label>
                    <input
                      type="time"
                      value={editFormData.breakEnd}
                      onChange={(e) => handleEditInputChange('breakEnd', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Durée de pause
                    </label>
                    <input
                      type="text"
                      value={editFormData.breakDuration}
                      onChange={(e) => handleEditInputChange('breakDuration', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                      placeholder="Ex: 1h"
                    />
                  </div>
                </div>

                {/* Jours de travail */}
                <div className="space-y-0.5">
                  <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                    Jour de travail *
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleEditWorkDay(day)}
                        className={`px-4 py-2.5 rounded-2xl border border-[#D4DCDC] font-instrument text-base transition-colors ${
                          editFormData.workDays.includes(day)
                            ? 'bg-[#0389A6] text-white border-[#0389A6]'
                            : 'bg-white text-[#002222] hover:bg-[#ECEFEF]'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ligne 4: Département + Nombre d'employés */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Département
                    </label>
                    <input
                      type="text"
                      value={editFormData.department}
                      onChange={(e) => handleEditInputChange('department', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                      placeholder="Ex: Production"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] px-2.5">
                      Nombre d'employés
                    </label>
                    <input
                      type="number"
                      value={editFormData.employees}
                      onChange={(e) => handleEditInputChange('employees', e.target.value)}
                      className="w-full px-7 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Résumé */}
                <div className="bg-[rgba(236,239,239,0.5)] border border-[#D4DCDC] rounded-2xl p-5">
                  <p className="font-instrument text-base font-semibold text-[#002222]">
                    Durée de travail: {calculateEditWorkDuration()}h
                    <br />
                    Jours sélectionnés: {editFormData.workDays.length}/7
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-5 px-8 py-3 border-t border-[#D4DCDC]">
              <button
                onClick={closeEditModal}
                className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] hover:bg-[#ECEFEF] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  // Modifier l'horaire existant
                  const breakMinutes = computeBreakMinutes(editFormData.breakStart, editFormData.breakEnd);

                  schedulesService
                    .update(editingSchedule.id, {
                      name: editFormData.name,
                      startTime: editFormData.startTime,
                      endTime: editFormData.endTime,
                      breakStart: editFormData.breakStart || undefined,
                      breakEnd: editFormData.breakEnd || undefined,
                      breakDurationMinutes: breakMinutes ?? undefined,
                      workDays: editFormData.workDays,
                      department: editFormData.department?.trim?.() || 'Tous',
                      employees: Number.isFinite(Number(editFormData.employees)) ? Number(editFormData.employees) : 0,
                    })
                    .then((updated) => {
                      setSchedules((prev) => {
                        const idx = prev.findIndex((s) => s.id === editingSchedule.id);
                        const index = idx >= 0 ? idx : 0;
                        const mapped = mapApiScheduleToUi(updated, index);
                        return prev.map((s) => (s.id === editingSchedule.id ? { ...mapped, color: s.color } : s));
                      });
                      closeEditModal();
                    })
                    .catch((err) => {
                      console.error('Erreur modification horaire:', err);
                    });
                }}
                className="px-4 py-2.5 bg-[#0389A6] rounded-2xl font-instrument text-base text-white hover:bg-[#027A94] transition-colors"
              >
                Modifier l'horaire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Horaires;
