import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import attendanceService from '../services/attendanceService';
import authService from '../services/authService';
import { getUserData } from '../services/userDataService';
import notificationService from '../services/notificationService';
import companiesService from '../services/companiesService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Rapports() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('Aujourd\'hui');
  const [selectedDepartments, setSelectedDepartments] = useState(['Tous']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeCharts, setIncludeCharts] = useState(false);
  const [includeDetails, setIncludeDetails] = useState(false);

  const [resolvedCompanyId, setResolvedCompanyId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitiesStats, setActivitiesStats] = useState({ totalEvents: 0, totalEmployees: 0, totalDurationSec: 0 });
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState('');
  
  // État pour les rapports générés (initialisé à zéro)
  const [generatedReports, setGeneratedReports] = useState([]);

  // État pour le calendrier (initialisé à la date actuelle)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Fonction pour formater les dates au format DD/MM/YYYY
  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return '';
    }
  };

  const isValidMongoId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id || '');
  };

  const getRangeIso = () => {
    let from;
    let to;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { from: null, to: null, error: 'Dates invalides' };
      }
      if (start > end) {
        return { from: null, to: null, error: 'La date de début doit être antérieure à la date de fin.' };
      }
      from = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
      to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString();
      return { from, to, error: null };
    }

    const now = new Date();
    switch (selectedPeriod) {
      case 'Aujourd\'hui': {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        break;
      }
      case 'Cette semaine': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        from = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).toISOString();
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        break;
      }
      case 'Ce mois': {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        break;
      }
      case '30 derniers jours': {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        from = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate()).toISOString();
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        break;
      }
      case 'Trimestre actuel': {
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), quarter * 3, 1).toISOString();
        to = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59).toISOString();
        break;
      }
      default: {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      }
    }

    return { from, to, error: null };
  };

  const computeDurationSec = (evt) => {
    if (typeof evt?.durationSec === 'number') return evt.durationSec;
    const inAt = evt?.clockInTime ? new Date(evt.clockInTime) : null;
    const outAt = evt?.clockOutTime ? new Date(evt.clockOutTime) : null;
    if (!inAt || !outAt || isNaN(inAt.getTime()) || isNaN(outAt.getTime())) return 0;
    return Math.max(0, Math.floor((outAt.getTime() - inAt.getTime()) / 1000));
  };

  const loadCompanyActivities = async ({ companyId, from, to }) => {
    const limit = 200;
    let page = 1;
    let all = [];
    let total = null;

    while (true) {
      const res = await attendanceService.getCompanyAttendance({ companyId, from, to, page, limit });
      const items = res?.items || [];
      total = typeof res?.total === 'number' ? res.total : total;
      all = all.concat(items);
      if (items.length === 0) break;
      if (typeof total === 'number' && all.length >= total) break;
      page += 1;
      if (page > 50) break;
    }

    const employees = (() => {
      try {
        const scopedKey = companyId ? `employees:${companyId}` : null;
        const raw = (scopedKey ? localStorage.getItem(scopedKey) : null) || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    const deptByEmail = new Map(
      employees
        .filter((e) => e && typeof e === 'object')
        .map((e) => [String(e.email || '').toLowerCase(), e.departement || e.department || 'Non spécifié']),
    );

    const enriched = all.map((evt) => {
      const email = String(evt.email || '').toLowerCase();
      return {
        ...evt,
        department: deptByEmail.get(email) || evt.department || 'Non spécifié',
      };
    });

    const activeDepartments = selectedDepartments.includes('Tous') ? [] : selectedDepartments;
    const filtered = activeDepartments.length
      ? enriched.filter((evt) => activeDepartments.includes(evt.department))
      : enriched;

    filtered.sort((a, b) => {
      const ta = new Date(a.clockInTime || a.clockOutTime || 0).getTime();
      const tb = new Date(b.clockInTime || b.clockOutTime || 0).getTime();
      return tb - ta;
    });

    const uniqueEmployees = new Set(
      filtered
        .map((evt) => evt.userId || evt.email)
        .filter(Boolean)
        .map((v) => String(v)),
    );

    const totalDurationSec = filtered.reduce((acc, evt) => acc + computeDurationSec(evt), 0);

    return {
      items: filtered,
      stats: {
        totalEvents: filtered.length,
        totalEmployees: uniqueEmployees.size,
        totalDurationSec,
      },
    };
  };

  useEffect(() => {
    const init = async () => {
      const merged = getUserData();
      const stored = authService.getStoredAuth().user;
      const fallbackCompanyId = merged?.companyId || merged?.company?.id || stored?.companyId || stored?.company?.id || null;

      let apiCompanyId = null;
      try {
        apiCompanyId = await companiesService.getMyCompanyId();
      } catch (e) {
        apiCompanyId = null;
      }

      const nextCompanyId = apiCompanyId || fallbackCompanyId;
      setResolvedCompanyId(nextCompanyId && isValidMongoId(nextCompanyId) ? nextCompanyId : null);
    };

    init();
  }, []);

  useEffect(() => {
    const refresh = async () => {
      setActivitiesError('');

      if (!resolvedCompanyId) {
        setActivities([]);
        setActivitiesStats({ totalEvents: 0, totalEmployees: 0, totalDurationSec: 0 });
        return;
      }

      const { from, to, error } = getRangeIso();
      if (error) {
        setActivitiesError(error);
        setActivities([]);
        setActivitiesStats({ totalEvents: 0, totalEmployees: 0, totalDurationSec: 0 });
        return;
      }

      setActivitiesLoading(true);
      try {
        const data = await loadCompanyActivities({ companyId: resolvedCompanyId, from, to });
        setActivities(data.items);
        setActivitiesStats(data.stats);
      } catch (e) {
        const message = e?.response?.data?.message || e?.message || 'Erreur lors du chargement des activités.';
        setActivitiesError(message);
        setActivities([]);
        setActivitiesStats({ totalEvents: 0, totalEmployees: 0, totalDurationSec: 0 });
      } finally {
        setActivitiesLoading(false);
      }
    };

    refresh();
    const onAttendanceUpdated = () => {
      refresh();
    };
    window.addEventListener('attendanceUpdated', onAttendanceUpdated);
    return () => {
      window.removeEventListener('attendanceUpdated', onAttendanceUpdated);
    };
  }, [resolvedCompanyId, selectedPeriod, startDate, endDate, selectedDepartments]);
  const [selectedFormat, setSelectedFormat] = useState('PDF');

  // Icônes SVG
  const FileIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2V8H20" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 13H8" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 17H8" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 9H9H8" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const AnalyticsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3V21H21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9L12 6L16 10L20 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 2V6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 2V6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 10H21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ClockIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 6V12L16 14" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SettingsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2569 9.77251 19.9859C9.5799 19.7148 9.31074 19.5063 9 19.385C8.69838 19.2522 8.36381 19.2125 8.03941 19.2713C7.71502 19.3301 7.41568 19.4848 7.18 19.715L7.12 19.775C6.93425 19.961 6.71368 20.1085 6.47088 20.2091C6.22808 20.3098 5.96783 20.3616 5.705 20.3616C5.44217 20.3616 5.18192 20.3098 4.93912 20.2091C4.69632 20.1085 4.47575 19.961 4.29 19.775C4.10405 19.5893 3.95653 19.3687 3.85588 19.1259C3.75523 18.8831 3.70343 18.6228 3.70343 18.36C3.70343 18.0972 3.75523 17.8369 3.85588 17.5941C3.95653 17.3513 4.10405 17.1307 4.29 16.945L4.35 16.885C4.58054 16.6493 4.73519 16.35 4.794 16.0256C4.85282 15.7012 4.81312 15.3666 4.68 15.065C4.55324 14.7692 4.34276 14.517 4.07447 14.3393C3.80618 14.1616 3.49179 14.0663 3.17 14.065H3C2.46957 14.065 1.96086 13.8543 1.58579 13.4792C1.21071 13.1041 1 12.5954 1 12.065C1 11.5346 1.21071 11.0259 1.58579 10.6508C1.96086 10.2757 2.46957 10.065 3 10.065H3.09C3.42099 10.0573 3.742 9.95013 4.01309 9.75752C4.28417 9.56491 4.49268 9.29575 4.615 8.985C4.74775 8.68338 4.78745 8.34881 4.72863 8.02441C4.66982 7.70002 4.51517 7.40068 4.285 7.165L4.225 7.105C4.03905 6.91925 3.89153 6.69868 3.79088 6.45588C3.69023 6.21308 3.63843 5.95283 3.63843 5.69C3.63843 5.42717 3.69023 5.16692 3.79088 4.92412C3.89153 4.68132 4.03905 4.46075 4.225 4.275C4.41075 4.08905 4.63132 3.94153 4.87412 3.84088C5.11692 3.74023 5.37717 3.68843 5.64 3.68843C5.90283 3.68843 6.16308 3.74023 6.40588 3.84088C6.64868 3.94153 6.86925 4.08905 7.055 4.275L7.115 4.335C7.35068 4.56554 7.65002 4.72019 7.97441 4.779C8.29881 4.83782 8.63338 4.79812 8.935 4.665H9C9.29577 4.53824 9.54802 4.32776 9.72569 4.05947C9.90337 3.79118 9.99872 3.47679 10 3.155V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73275 15.6362 4.77245 15.9606 4.71363C16.285 4.65482 16.5843 4.50017 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Modèles de rapports
  const reportTemplates = [
    {
      id: 1,
      title: 'Rapport de présence quotidien',
      description: 'Suivi détaillé des présences, retards et absences pour une journée',
      tags: ['présences', 'retards', 'absences', '+1']
    },
    {
      id: 2,
      title: 'Résumé hebdomadaire',
      description: 'Vue d\'ensemble des statistiques de présence sur une semaine',
      tags: ['taux de présence', 'heures supplémentaires', 'congés']
    },
    {
      id: 3,
      title: 'Performance mensuelle',
      description: 'Analyse complète des performances et tendances sur un mois',
      tags: ['assiduité', 'ponctualité', 'absences', '+1']
    },
    {
      id: 4,
      title: 'Fiche employé individuelle',
      description: 'Rapport détaillé pour un employé spécifique',
      tags: ['historique', 'statistiques', 'évaluations']
    },
    {
      id: 5,
      title: 'Analyse par département',
      description: 'Comparaison des performances entre départements',
      tags: ['comparaisons', 'benchmarks', 'recommandations']
    }
  ];

  // Fonctions pour gérer les actions des rapports
  const handleDownload = (report) => {
    console.log('Téléchargement du rapport:', report);
    console.log('Données du rapport:', report.data);
    console.log('Nombre de lignes:', report.data?.length);
    
    // Utiliser le format du rapport si disponible, sinon le format actuel
    const reportFormat = report.format || selectedFormat;
    try {
      // Déterminer l'extension selon le format
      let extension = 'pdf';
      if (reportFormat.toLowerCase().includes('excel') || reportFormat.toLowerCase().includes('xlsx')) {
        extension = 'xlsx';
      } else if (reportFormat.toLowerCase() === 'csv') {
        extension = 'csv';
      }
      
      const fileName = `${report.name.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
      console.log('Nom du fichier:', fileName);
      console.log('Extension:', extension);
      
      // Si le rapport a des données, les convertir selon le format
      if (report.data && Array.isArray(report.data) && report.data.length > 0) {
        console.log('Génération du PDF avec', report.data.length, 'lignes de données');
        if (extension === 'pdf') {
          // Générer un vrai PDF avec jsPDF
          const doc = new jsPDF();
          
          // En-tête du rapport
          doc.setFontSize(18);
          doc.text(report.name || 'Rapport de présence', 14, 20);
          
          doc.setFontSize(11);
          doc.text(`Période: ${report.period || 'Non définie'}`, 14, 30);
          doc.text(`Date de génération: ${report.date || new Date().toLocaleString('fr-FR')}`, 14, 36);
          
          // Statistiques si disponibles
          if (report.meta && report.meta.totals) {
            doc.text(`Total événements: ${report.meta.totals.totalEvents || 0}`, 14, 42);
            doc.text(`Total employés: ${report.meta.totals.totalEmployees || 0}`, 14, 48);
            const hours = Math.floor((report.meta.totals.totalDurationSec || 0) / 3600);
            const minutes = Math.floor(((report.meta.totals.totalDurationSec || 0) % 3600) / 60);
            doc.text(`Durée totale: ${hours}h ${minutes}min`, 14, 54);
          }
          
          // Préparer les données pour le tableau
          const headers = Object.keys(report.data[0]);
          const rows = report.data.map(row => 
            headers.map(header => {
              const value = row[header];
              // Formater les dates
              if (header.includes('entree') || header.includes('sortie') || header.includes('jour')) {
                if (value) {
                  try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      return date.toLocaleString('fr-FR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    }
                  } catch (e) {
                    return value;
                  }
                }
                return value || 'N/A';
              }
              // Formater les durées en secondes
              if (header.includes('duree') && typeof value === 'number') {
                const h = Math.floor(value / 3600);
                const m = Math.floor((value % 3600) / 60);
                return `${h}h ${m}min`;
              }
              return value || '';
            })
          );
          
          // Traduire les en-têtes
          const translatedHeaders = headers.map(h => {
            const translations = {
              'employe': 'Employé',
              'email': 'Email',
              'departement': 'Département',
              'entree': 'Entrée',
              'sortie': 'Sortie',
              'duree_secondes': 'Durée',
              'source': 'Source',
              'notes': 'Notes',
              'jour': 'Jour',
              'total_pointages': 'Pointages',
              'total_duree_secondes': 'Durée totale'
            };
            return translations[h] || h;
          });
          
          // Ajouter le tableau avec autoTable
          autoTable(doc, {
            head: [translatedHeaders],
            body: rows,
            startY: report.meta && report.meta.totals ? 60 : 42,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [3, 137, 166], textColor: 255 },
            alternateRowStyles: { fillColor: [236, 239, 239] },
            margin: { top: 10, right: 14, bottom: 10, left: 14 }
          });
          
          // Sauvegarder le PDF
          console.log('Sauvegarde du PDF:', fileName);
          doc.save(fileName);
          console.log('PDF généré avec succès');
        } else if (extension === 'csv') {
          // Convertir en CSV
          const headers = Object.keys(report.data[0] || {});
          let content = headers.join(',') + '\n';
          report.data.forEach(row => {
            content += headers.map(h => `"${row[h] || ''}"`).join(',') + '\n';
          });
          
          const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else if (extension === 'xlsx') {
          // Pour Excel, on génère un CSV avec tabulations
          const headers = Object.keys(report.data[0] || {});
          let content = headers.join('\t') + '\n';
          report.data.forEach(row => {
            content += headers.map(h => row[h] || '').join('\t') + '\n';
          });
          
          const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } else {
        alert(`Aucune donnée disponible pour le téléchargement du rapport "${report.name}".`);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du rapport. Veuillez réessayer.');
    }
  };

  const handleDelete = (reportId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
      setGeneratedReports(prev => prev.filter(report => report.id !== reportId));
      alert('Rapport supprimé avec succès');
    }
  };

  const handleViewDetails = (report) => {
    console.log('Voir les détails du rapport:', report);
    alert(`Détails du rapport: ${report.name}\nPériode: ${report.period}\nTaille: ${report.size}\nDate: ${report.date}`);
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) {
      alert('Veuillez sélectionner un modèle de rapport');
      return;
    }

    const template = reportTemplates.find(t => t.id === selectedTemplate);
    
    // Récupérer les données utilisateur complètes
    const userData = getUserData();
    if (!userData || !userData.email) {
      alert('Aucun utilisateur connecté. Veuillez vous reconnecter.');
      return;
    }
    
    const companyId = resolvedCompanyId;
    if (!companyId) {
      alert('Aucune entreprise associée à ce compte (companyId introuvable).');
      return;
    }

    const { from, to, error: rangeError } = getRangeIso();
    if (rangeError) {
      alert(rangeError);
      return;
    }

    // Préparer les départements (filtrer "Tous" si d'autres départements sont sélectionnés)
    const departments = selectedDepartments.includes('Tous') || selectedDepartments.length === 0
      ? []
      : selectedDepartments;

    // Formater la période pour l'affichage
    let periodDisplay = '';
    if (startDate && endDate) {
      periodDisplay = `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (selectedPeriod) {
      periodDisplay = selectedPeriod;
    } else {
      const now = new Date();
      periodDisplay = formatDate(now.toISOString().split('T')[0]);
    }

    const newReport = {
      id: Date.now(),
      name: `${template.title} - ${new Date().toLocaleDateString('fr-FR')}`,
      period: periodDisplay,
      date: new Date().toLocaleString('fr-FR'),
      size: '0 MB',
      status: 'En cours',
      statusColor: 'bg-[rgba(3,137,166,0.1)] text-[#0389A6]',
      progress: true,
      format: selectedFormat,
      departments: departments,
      includeCharts: includeCharts,
      includeDetails: includeDetails
    };

    setGeneratedReports(prev => [newReport, ...prev]);

    try {
      const loaded = await loadCompanyActivities({ companyId, from, to });
      let rows = [];
      if (includeDetails) {
        rows = loaded.items.map((evt) => ({
          employe: evt.name,
          email: evt.email,
          departement: evt.department,
          entree: evt.clockInTime,
          sortie: evt.clockOutTime,
          duree_secondes: computeDurationSec(evt),
          source: evt.source,
          notes: evt.notes || '',
        }));
      } else {
        // Résumé agrégé par employé et par jour
        const byKey = new Map();
        loaded.items.forEach((evt) => {
          const day = evt.clockInTime ? new Date(evt.clockInTime).toISOString().slice(0, 10) : 'unknown';
          const key = `${evt.email || evt.userId || evt.name}-${day}`;
          const prev = byKey.get(key) || {
            employe: evt.name,
            email: evt.email,
            departement: evt.department,
            jour: day,
            total_pointages: 0,
            total_duree_secondes: 0,
          };
          prev.total_pointages += 1;
          prev.total_duree_secondes += computeDurationSec(evt);
          byKey.set(key, prev);
        });
        rows = Array.from(byKey.values()).sort((a, b) => String(b.jour).localeCompare(String(a.jour)));
      }

      const dataSize = JSON.stringify(rows).length;
      const sizeInMB = (dataSize / (1024 * 1024)).toFixed(1);

      setGeneratedReports(prev => prev.map(report => 
        report.id === newReport.id 
          ? { 
              ...report, 
              status: 'Prêt', 
              statusColor: 'bg-[rgba(1,160,78,0.1)] text-[#01A04E]', 
              size: `${sizeInMB} MB`, 
              progress: false,
              data: rows,
              meta: {
                template: template.title,
                period: periodDisplay,
                from,
                to,
                totals: loaded.stats,
              },
            }
          : report
      ));
      
      // Envoyer une notification si les alertes de rapports sont activées
      const userData = getUserData();
      if (userData && userData.email) {
        await notificationService.sendReportAlert(
          userData.email,
          userData.nomComplet || userData.fullName || 'Utilisateur',
          template.title
        );
      }
      
      alert(`Rapport "${template.title}" généré avec succès !`);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setGeneratedReports(prev => prev.map(report => 
        report.id === newReport.id 
          ? { 
              ...report, 
              status: 'Erreur', 
              statusColor: 'bg-[rgba(216,67,67,0.1)] text-[#D84343]', 
              progress: false 
            }
          : report
      ));
      alert(`Erreur lors de la génération du rapport: ${error.message || 'Une erreur est survenue'}`);
    }
  };

  // Périodes prédéfinies
  const periodOptions = ['Aujourd\'hui', 'Cette semaine', 'Ce mois', '30 derniers jours', 'Trimestre actuel'];

  // Fonction pour générer le calendrier selon le design Figma
  const renderCalendar = () => {
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
      if (!selectedCalendarDate) return false;
      return day === selectedCalendarDate.getDate() && 
             month === selectedCalendarDate.getMonth() && 
             year === selectedCalendarDate.getFullYear() &&
             itemDate.getDate() === selectedCalendarDate.getDate() &&
             itemDate.getMonth() === selectedCalendarDate.getMonth() &&
             itemDate.getFullYear() === selectedCalendarDate.getFullYear();
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
      const dayOfWeek = date.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      
      days.push({ 
        day, 
        isCurrentMonth: true, 
        isWeekend: isWeekendDay,
        date: date
      });
    }
    
    // Jours du mois suivant (pour compléter la grille - 6 semaines)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dayOfWeek = date.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      days.push({ day, isCurrentMonth: false, isWeekend: isWeekendDay, date: date });
    }
    
    return (
      <div className="bg-white border border-[#D4DCDC] rounded-2xl p-2" style={{ width: '352px' }}>
        {/* En-tête du calendrier avec navigation */}
        <div className="flex justify-between items-center px-2 py-2 mb-2">
          {/* Flèche gauche */}
          <button
            onClick={goToPrevMonth}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-md hover:bg-[#ECEFEF] transition-colors p-1.5"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 3L6 9L11 15" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Mois et Année */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 font-inter text-xl font-semibold text-[#002222]" style={{ lineHeight: '32px' }}>{months[month]}</span>
            <span className="px-0 py-1 font-inter text-xl font-semibold text-[#002222]" style={{ lineHeight: '32px' }}>{year}</span>
          </div>
          
          {/* Flèche droite */}
          <button
            onClick={goToNextMonth}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-md hover:bg-[#ECEFEF] transition-colors p-1.5"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 3L12 9L7 15" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7">
          {weekdays.map((day, index) => {
            const paddingMap = {
              0: { paddingLeft: '17px', paddingRight: '17px' }, // L
              1: { paddingLeft: '19px', paddingRight: '19px' }, // M
              2: { paddingLeft: '16px', paddingRight: '16px' }, // M
              3: { paddingLeft: '19px', paddingRight: '19px' }, // J
              4: { paddingLeft: '19px', paddingRight: '19px' }, // V
              5: { paddingLeft: '19px', paddingRight: '19px' }, // S
              6: { paddingLeft: '19px', paddingRight: '19px' }  // D
            };
            
            return (
              <div
                key={index}
                className="flex flex-col justify-center items-center py-3 gap-2"
                style={{ width: '48px', ...paddingMap[index] || { paddingLeft: '16px', paddingRight: '16px' } }}
              >
                <span className={`font-instrument text-lg font-semibold ${
                  index >= 5 ? 'text-[#D4DCDC]' : 'text-[#002222]'
                }`} style={{ lineHeight: '24px' }}>
                  {day}
                </span>
              </div>
            );
          })}
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
                    setSelectedCalendarDate(item.date);
                    // Mettre à jour startDate et endDate si nécessaire
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                    setStartDate(dateStr);
                  }
                }}
                className={`
                  flex flex-col justify-center items-center rounded-2xl transition-colors mx-auto gap-2
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
                style={{ 
                  width: '48px', 
                  height: '48px',
                  padding: '12px 20px'
                }}
              >
                <span className="font-instrument text-lg font-normal" style={{ lineHeight: '24px' }}>
                  {item.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Top bar */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="flex items-center justify-between w-full px-12">
          <h1 className="font-audiowide text-2xl font-normal text-[#002222]">Sen Pointage</h1>
          
          <div className="flex items-center gap-4">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr]" style={{ minHeight: 'calc(100vh - 70px)' }}>
        <Sidebar />
        
        <main className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex flex-col gap-2.5">
              <h1 className="font-audiowide text-[26px] font-normal text-[#002222] leading-[30px]">
                Générateur de rapports
              </h1>
              <p className="font-instrument text-base text-[#5A6565]">
                Créez et exportez des rapports personnalisés sur les présences
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-8">
              {/* Sélection du modèle */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <FileIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222]">Sélection du modèle</h2>
                </div>
                <div className="p-5">
                  <p className="font-instrument text-base text-[#5A6565] mb-5">
                    Choisissez le type de rapport que vous souhaitez générer
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 h-[554px]">
                    {reportTemplates.map((template, index) => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`p-5 border border-[#D4DCDC] rounded-2xl cursor-pointer transition-colors flex flex-col ${
                          selectedTemplate === template.id
                            ? 'bg-[#0389A6] text-white border-[#0389A6]'
                            : 'bg-[rgba(236,239,239,0.3)] hover:bg-[rgba(236,239,239,0.5)]'
                        } ${index === 0 ? 'col-span-2 row-span-1' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              selectedTemplate === template.id ? 'bg-white/20 text-white' : 'bg-white text-[#002222]'
                            }`}
                          >
                            <FileIcon />
                          </div>
                          <div className="flex-1">
                            <h3
                              className={`font-instrument text-base font-semibold mb-2 ${
                                selectedTemplate === template.id ? 'text-white' : 'text-[#002222]'
                              }`}
                            >
                              {template.title}
                            </h3>
                            <p
                              className={`font-instrument text-sm mb-3 ${
                                selectedTemplate === template.id ? 'text-white' : 'text-[#5A6565]'
                              }`}
                            >
                              {template.description}
                            </p>

                            {template.id === 1 ? (
                              <div className="mb-3">
                                <Link
                                  to="/rapports/quotidien"
                                  onClick={(e) => e.stopPropagation()}
                                  className={`inline-flex items-center justify-center px-3 py-2 rounded-xl font-instrument text-sm font-medium transition-colors ${
                                    selectedTemplate === template.id
                                      ? 'bg-white/20 text-white hover:bg-white/30'
                                      : 'bg-white text-[#002222] border border-[#D4DCDC] hover:bg-[#F7F9F9]'
                                  }`}
                                >
                                  Ouvrir
                                </Link>
                              </div>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              {template.tags &&
                                template.tags.map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className={`px-2.5 py-1 rounded-2xl font-instrument text-xs ${
                                      selectedTemplate === template.id
                                        ? 'bg-white/20 text-white'
                                        : 'bg-[rgba(1,160,78,0.1)] text-[#01A04E]'
                                    }`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Période du rapport */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <CalendarIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222]">Période du rapport</h2>
                </div>
                <div className="p-5 space-y-5">
                  {/* Sélecteurs de période rapide */}
                  <div className="flex flex-wrap gap-2.5">
                    {periodOptions.map((period) => (
                      <button
                        key={period}
                        onClick={() => {
                          setSelectedPeriod(period);
                          // Calculer les dates selon la période sélectionnée
                          const now = new Date();
                          let from, to;
                          
                          switch (period) {
                            case 'Aujourd\'hui':
                              from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                              to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                              break;
                            case 'Cette semaine':
                              const weekStart = new Date(now);
                              weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
                              from = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
                              to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                              break;
                            case 'Ce mois':
                              from = new Date(now.getFullYear(), now.getMonth(), 1);
                              to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                              break;
                            case '30 derniers jours':
                              from = new Date(now);
                              from.setDate(now.getDate() - 30);
                              to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                              break;
                            case 'Trimestre actuel':
                              const quarter = Math.floor(now.getMonth() / 3);
                              from = new Date(now.getFullYear(), quarter * 3, 1);
                              to = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
                              break;
                            default:
                              from = new Date(now);
                              to = new Date(now);
                          }
                          
                          setStartDate(from.toISOString().split('T')[0]);
                          setEndDate(to.toISOString().split('T')[0]);
                        }}
                        className={`px-4 py-2.5 rounded-2xl font-instrument text-xs transition-colors ${
                          selectedPeriod === period
                            ? 'bg-[#0389A6] text-white'
                            : 'bg-white border border-[#D4DCDC] text-[#002222] hover:bg-[#ECEFEF]'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>

                  {/* Champs de date personnalisés */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Date début */}
                    <div className="space-y-2">
                      <label className="block font-instrument text-base font-semibold text-[#002222]">
                        Date début
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setSelectedPeriod(''); // Désélectionner les périodes prédéfinies
                          }}
                          className="w-full px-4 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent pr-10"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <CalendarIcon />
                        </div>
                      </div>
                    </div>

                    {/* Date de fin */}
                    <div className="space-y-2">
                      <label className="block font-instrument text-base font-semibold text-[#002222]">
                        Date de fin
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setSelectedPeriod(''); // Désélectionner les périodes prédéfinies
                          }}
                          className="w-full px-4 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent pr-10"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <CalendarIcon />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtres et options */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <SettingsIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222]">Filtres et options</h2>
                </div>
                <div className="p-5">
                  <div className="mb-5">
                    <label className="block font-instrument text-base font-semibold text-[#002222] mb-4">
                      Départements
                    </label>
                    <div className="grid grid-cols-3 gap-x-8 gap-y-1.5">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="deptAll" 
                          checked={selectedDepartments.includes('Tous')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments(['Tous']);
                            } else {
                              setSelectedDepartments([]);
                            }
                          }}
                          className="rounded w-4 h-4 checked:bg-[#0389A6] border-[#D4DCDC] focus:ring-[#0389A6] accent-[#0389A6]"
                        />
                        <label 
                          htmlFor="deptAll" 
                          className={`font-instrument text-sm px-2.5 py-1 rounded-md transition-colors ${
                            selectedDepartments.includes('Tous') 
                              ? 'bg-[#0389A6] text-white' 
                              : 'text-[#002222] hover:bg-[#ECEFEF]'
                          } cursor-pointer`}
                        >
                          Tous
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="dept1" 
                          checked={selectedDepartments.includes('Commercial')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Tous').concat('Commercial'));
                            } else {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Commercial'));
                            }
                          }}
                          className="rounded w-4 h-4 accent-[#0389A6]"
                        />
                        <label htmlFor="dept1" className="font-instrument text-sm text-[#002222] cursor-pointer">Commercial</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="dept2" 
                          checked={selectedDepartments.includes('Sécurité')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Tous').concat('Sécurité'));
                            } else {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Sécurité'));
                            }
                          }}
                          className="rounded w-4 h-4 accent-[#0389A6]"
                        />
                        <label htmlFor="dept2" className="font-instrument text-sm text-[#002222] cursor-pointer">Sécurité</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="dept3" 
                          checked={selectedDepartments.includes('Administration')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Tous').concat('Administration'));
                            } else {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Administration'));
                            }
                          }}
                          className="rounded w-4 h-4 accent-[#0389A6]"
                        />
                        <label htmlFor="dept3" className="font-instrument text-sm text-[#002222] cursor-pointer">Administration</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="dept4" 
                          checked={selectedDepartments.includes('IT')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Tous').concat('IT'));
                            } else {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'IT'));
                            }
                          }}
                          className="rounded w-4 h-4 accent-[#0389A6]"
                        />
                        <label htmlFor="dept4" className="font-instrument text-sm text-[#002222] cursor-pointer">IT</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="dept5" 
                          checked={selectedDepartments.includes('Production')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Tous').concat('Production'));
                            } else {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Production'));
                            }
                          }}
                          className="rounded w-4 h-4 accent-[#0389A6]"
                        />
                        <label htmlFor="dept5" className="font-instrument text-sm text-[#002222] cursor-pointer">Production</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="dept6" 
                          checked={selectedDepartments.includes('RH')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'Tous').concat('RH'));
                            } else {
                              setSelectedDepartments(prev => prev.filter(d => d !== 'RH'));
                            }
                          }}
                          className="rounded w-4 h-4 accent-[#0389A6]"
                        />
                        <label htmlFor="dept6" className="font-instrument text-sm text-[#002222] cursor-pointer">RH</label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-8 items-start mt-5">
                    <div className="flex-1">
                      <label className="block font-instrument text-base font-semibold text-[#002222] mb-4">
                        Format d'export
                      </label>
                      <div className="border border-[#D4DCDC] rounded-2xl bg-white p-2.5">
                        <div className="flex flex-col gap-3">
                          {/* Filtre PDF */}
                          <button
                            onClick={() => setSelectedFormat('PDF')}
                            className={`flex items-center justify-between w-full px-1.5 py-1 rounded-[10px] transition-colors ${
                              selectedFormat === 'PDF'
                                ? 'bg-[#ECEFEF]'
                                : 'bg-transparent hover:bg-[#ECEFEF]/50'
                            }`}
                          >
                            <span className="font-instrument text-xs text-[#5A6565]" style={{ letterSpacing: '-0.24px' }}>
                              PDF
                            </span>
                            {selectedFormat === 'PDF' && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                            {selectedFormat !== 'PDF' && (
                              <div className="w-4 h-4 opacity-0"></div>
                            )}
                          </button>

                          {/* Filtre Excel */}
                          <button
                            onClick={() => setSelectedFormat('Excel (.xlsx)')}
                            className={`flex items-center justify-between w-full px-1.5 py-1 rounded-[10px] transition-colors ${
                              selectedFormat === 'Excel (.xlsx)'
                                ? 'bg-[#ECEFEF]'
                                : 'bg-transparent hover:bg-[#ECEFEF]/50'
                            }`}
                          >
                            <span className="font-instrument text-xs text-[#5A6565]" style={{ letterSpacing: '-0.24px' }}>
                              Excel (.xlsx)
                            </span>
                            {selectedFormat === 'Excel (.xlsx)' && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                            {selectedFormat !== 'Excel (.xlsx)' && (
                              <div className="w-4 h-4 opacity-0"></div>
                            )}
                          </button>

                          {/* Filtre CSV */}
                          <button
                            onClick={() => setSelectedFormat('CSV')}
                            className={`flex items-center justify-between w-full px-1.5 py-1 rounded-[10px] transition-colors ${
                              selectedFormat === 'CSV'
                                ? 'bg-[#ECEFEF]'
                                : 'bg-transparent hover:bg-[#ECEFEF]/50'
                            }`}
                          >
                            <span className="font-instrument text-xs text-[#5A6565]" style={{ letterSpacing: '-0.24px' }}>
                              CSV
                            </span>
                            {selectedFormat === 'CSV' && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                            {selectedFormat !== 'CSV' && (
                              <div className="w-4 h-4 opacity-0"></div>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-[200px]">
                      <label className="block font-instrument text-base font-semibold text-[#002222] mb-1">
                        Options d'inclusion
                      </label>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="includeCharts" 
                            checked={includeCharts}
                            onChange={(e) => setIncludeCharts(e.target.checked)}
                            className="rounded w-4 h-4 accent-[#0389A6] cursor-pointer" 
                          />
                          <label htmlFor="includeCharts" className="font-instrument text-sm text-[#002222] cursor-pointer">
                            Inclure les graphiques
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="includeDetails" 
                            checked={includeDetails}
                            onChange={(e) => setIncludeDetails(e.target.checked)}
                            className="rounded w-4 h-4 accent-[#0389A6] cursor-pointer" 
                          />
                          <label htmlFor="includeDetails" className="font-instrument text-sm text-[#002222] cursor-pointer">
                            Inclure les détails
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aperçu du rapport */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl p-5">
                <div className="bg-[rgba(236,239,239,0.5)] border border-[#D4DCDC] rounded-2xl p-5 mb-5">
                  <h3 className="font-instrument text-base font-bold text-[#002222] mb-2.5">
                    Aperçu du rapport
                  </h3>
                  <div className="font-instrument text-sm text-[#5A6565] leading-[22px] space-y-0.5">
                    <div>Modèle: {selectedTemplate ? reportTemplates.find(t => t.id === selectedTemplate)?.title : 'Aucun modèle sélectionné'}</div>
                    <div>Période: {
                      startDate && endDate 
                        ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                        : selectedPeriod 
                        ? selectedPeriod
                        : 'Non définie'
                    }</div>
                    <div>Format: {selectedFormat}</div>
                    <div>Départements: {
                      selectedDepartments.length === 0 
                        ? 'Aucun'
                        : selectedDepartments.includes('Tous') 
                        ? 'Tous'
                        : selectedDepartments.join(', ')
                    }</div>
                    <div>Activités: {activitiesLoading ? 'Chargement...' : activitiesError ? 'Erreur' : `${activitiesStats.totalEvents} pointage(s) • ${activitiesStats.totalEmployees} employé(s)`}</div>
                    {(includeCharts || includeDetails) && (
                      <div>Options: {
                        [
                          includeCharts && 'Graphiques',
                          includeDetails && 'Détails'
                        ].filter(Boolean).join(', ')
                      }</div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleGenerateReport}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-base hover:bg-[#027A94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedTemplate}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 18V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 15L12 12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Générer le rapport
                </button>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-8">
              {/* Rapports générés */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <AnalyticsIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222]">Rapports générés</h2>
                </div>
                <div className="p-5">
                  {generatedReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#ECEFEF] flex items-center justify-center mb-4">
                        <AnalyticsIcon />
                      </div>
                      <p className="font-instrument text-base text-[#5A6565] mb-2">
                        Aucun rapport généré
                      </p>
                      <p className="font-instrument text-sm text-[#5A6565]">
                        Les rapports que vous générez apparaîtront ici
                      </p>
                    </div>
                  ) : (
                    <>
                  <p className="font-instrument text-base text-[#5A6565] mb-5">
                    Vos rapports récents et leur statut
                  </p>
                  
                  <div className="space-y-4">
                    {generatedReports.map((report) => (
                      <div key={report.id} className="border border-[#D4DCDC] rounded-2xl p-4">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex-1">
                            <h4 className="font-instrument text-sm font-medium text-[#002222] mb-1">
                              {report.name}
                            </h4>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-instrument text-xs text-[#5A6565]">
                                {report.period || report.date}
                              </span>
                              <span className="font-instrument text-xs font-semibold text-[#5A6565]">
                                {report.size}
                              </span>
                            </div>
                            {report.period && (
                              <div className="mb-1.5">
                                <span className="font-instrument text-xs text-[#5A6565]">
                                  {report.date}
                                </span>
                              </div>
                            )}
                            {report.progress && (
                              <div className="mt-2">
                                <div className="w-full h-1 bg-[#ECEFEF] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#0389A6] rounded-full" style={{ width: '60%' }}></div>
                                </div>
                                <span className="font-instrument text-xs text-[#0389A6] mt-1 block">
                                  Génération en cours...
                                </span>
                              </div>
                            )}
                          </div>
                          <div className={`px-2.5 py-1 rounded-2xl font-instrument text-xs ${report.statusColor}`}>
                            {report.status}
                          </div>
                        </div>
                        
                        {!report.progress && (
                          <div className="flex items-center justify-center gap-4 pt-2">
                            <button 
                              onClick={() => handleDownload(report)}
                              className="w-[186px] flex items-center justify-center gap-2 px-4 py-1.5 border border-[#D4DCDC] rounded-2xl font-instrument text-xs text-[#002222] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M14 2V8H20" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Télécharger
                            </button>
                            <button 
                              onClick={() => handleViewDetails(report)}
                              className="p-1.5 border border-[#D4DCDC] rounded-md hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                              title="Voir les détails"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 2.66667C6.15905 2.66667 4.66667 4.15905 4.66667 6C4.66667 7.84095 6.15905 9.33333 8 9.33333C9.84095 9.33333 11.3333 7.84095 11.3333 6C11.3333 4.15905 9.84095 2.66667 8 2.66667ZM8 10.6667C5.42267 10.6667 3.33333 12.756 3.33333 15.3333H12.6667C12.6667 12.756 10.5773 10.6667 8 10.6667Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDelete(report.id)}
                              className="p-1.5 border border-[#D4DCDC] rounded-md hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                              title="Supprimer le rapport"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 4H14M12.6667 4V13.3333C12.6667 13.7015 12.5262 14.0544 12.2761 14.3215C12.0261 14.5886 11.6848 14.75 11.3333 14.75H4.66667C4.31522 14.75 3.97391 14.5886 3.72386 14.3215C3.47381 14.0544 3.33333 13.7015 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2.29848 5.47381 1.94565 5.72386 1.67851C5.97391 1.41137 6.31522 1.25 6.66667 1.25H9.33333C9.68478 1.25 10.0261 1.41137 10.2761 1.67851C10.5262 1.94565 10.6667 2.29848 10.6667 2.66667V4" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                    </>
                  )}
                </div>
              </div>

              {/* Statistiques rapides */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <AnalyticsIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222]">Statistiques rapides</h2>
                </div>
                <div className="p-5 space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-sm text-[#002222]">Rapports ce mois</span>
                    <span className="font-instrument text-base font-semibold text-[#002222]">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-sm text-[#002222]">Taille totale</span>
                    <span className="font-instrument text-base font-semibold text-[#002222]">28.4 MB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-sm text-[#002222]">Dernier export</span>
                    <span className="font-instrument text-base font-semibold text-[#002222]">Hier</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Rapports;