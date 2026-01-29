import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import Logo from '../components/Logo';
import iconPersonne from '../assets/images/Frame personne.png'
import iconRetard from '../assets/images/Frame 45 retard.png'
import iconTaux from '../assets/images/Frame 45 taux de presence.png'
import attendanceService from '../services/attendanceService';
import authService from '../services/authService';
import { getUserData } from '../services/userDataService';
import companiesService from '../services/companiesService';

function KpiCard({ title, value, sub, iconSrc }) {
  return (
    <div className="flex items-center justify-between gap-5 bg-white border border-[#D4DCDC] rounded-2xl px-5 py-4">
      <div className="space-y-2">
        <div className="font-['Instrument_Sans',sans-serif] text-sm font-semibold text-[#002222]">{title}</div>
        <div className="flex items-end gap-2">
          <div className="font-['Audiowide',cursive] text-[32px] leading-none text-[#002222]">{value}</div>
          {sub ? <div className="font-['Instrument_Sans',sans-serif] text-xs text-[#5A6565]">{sub}</div> : null}
        </div>
      </div>
      <div className="rounded-2xl w-[50px] h-[50px] bg-[#0389A6]/10 flex items-center justify-center overflow-hidden">
        {iconSrc && (
          <img src={iconSrc} alt="icone" className="w-7 h-7 object-contain" />
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="w-full flex items-center gap-2 border-b border-[#D4DCDC]/40 px-5 py-2.5 bg-white rounded-t-2xl">
      <div className="font-['Audiowide',cursive] text-sm text-[#002222]">{children}</div>
    </div>
  );
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    retards: 0,
    totalEmployees: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState([
    { day: 'Lun', rate: 0 },
    { day: 'Mar', rate: 0 },
    { day: 'Mer', rate: 0 },
    { day: 'Jeu', rate: 0 },
    { day: 'Ven', rate: 0 },
    { day: 'Sam', rate: 0 }
  ]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setDashboardError(null);
      try {
        // Récupérer les informations utilisateur (avec fusion depuis toutes les sources)
        const userData = getUserData();
        const currentUser = userData || authService.getStoredAuth().user;
        
        if (userData) {
          setUser(userData);
        } else if (currentUser) {
          setUser(currentUser);
        }
        
        // Récupérer l'ID de l'entreprise
        let companyId = currentUser?.companyId || currentUser?.company?.id || null;
        if (!companyId) {
          companyId = await companiesService.getMyCompanyId();

          if (companyId && currentUser) {
            const updatedUser = { ...currentUser, companyId };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            setUser(updatedUser);
          }
        }

        if (companyId) {
          const dashboard = await attendanceService.getDashboard({ companyId });

          setDashboardError(null);

          setStats({
            present: dashboard.presentToday || 0,
            absent: dashboard.absentToday || 0,
            retards: dashboard.lateToday || 0,
            totalEmployees: dashboard.totalEmployees || 0
          });

          setWeeklyAttendance(Array.isArray(dashboard.weeklyAttendance) ? dashboard.weeklyAttendance : weeklyAttendance);

          const threshold = new Date();
          threshold.setHours(9, 0, 0, 0);

          const activities = (Array.isArray(dashboard.recentActivity) ? dashboard.recentActivity : [])
            .map((event) => {
              const firstName = event.user?.firstName || '';
              const lastName = event.user?.lastName || '';
              const name = `${firstName} ${lastName}`.trim() || event.user?.email || 'Employé';
              const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const time = event.clockInAt || event.clockOutAt;
              const timeStr = time ? new Date(time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

              let action = "Pointage d'arrivée";
              let status = 'ok';
              const clockInAt = event.clockInAt ? new Date(event.clockInAt) : null;
              if (clockInAt && clockInAt > threshold) {
                action = 'Retard signalé';
                status = 'warn';
              }

              return {
                initials,
                name,
                action,
                time: timeStr,
                status
              };
            });

          setRecentActivity(activities);
          setAlerts([]);
        } else {
          // Si pas de companyId, initialiser tout à zéro
          setDashboardError("Aucune entreprise associée à ce compte. Veuillez vérifier l'association à une entreprise.");
          setStats({ present: 0, absent: 0, retards: 0, totalEmployees: 0 });
          setRecentActivity([]);
          setAlerts([]);
          setWeeklyAttendance([
            { day: 'Lun', rate: 0 },
            { day: 'Mar', rate: 0 },
            { day: 'Mer', rate: 0 },
            { day: 'Jeu', rate: 0 },
            { day: 'Ven', rate: 0 },
            { day: 'Sam', rate: 0 }
          ]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
        const apiMessage = error?.response?.data?.message;
        setDashboardError(apiMessage || error?.message || 'Erreur lors du chargement du tableau de bord');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Récupérer le nom de l'entreprise depuis toutes les sources
  const getCompanyName = () => {
    // Utiliser getUserData pour récupérer les données fusionnées
    const userData = getUserData();
    if (!userData && !user) return '';
    
    const currentUserData = userData || user;
    
    // Essayer de récupérer le nom de l'entreprise depuis différentes sources
    let companyName = currentUserData.nomEntreprise || currentUserData.companyName || currentUserData.company || '';
    
    // Si pas trouvé dans currentUser, chercher dans users
    if (!companyName) {
      try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userFromList = users.find(u => u.email === currentUserData.email);
        if (userFromList) {
          companyName = userFromList.nomEntreprise || userFromList.companyName || '';
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du nom de l\'entreprise:', error);
      }
    }
    
    // Si toujours pas trouvé, chercher dans employees
    if (!companyName) {
      try {
        // Ne pas utiliser de cache global "employees" (multi-tenant). Les employés sont scoppés par entreprise.
        // Si besoin, le nom d'entreprise doit venir du token/session (getUserData) ou de l'API.
      } catch (error) {
        console.error('Erreur lors de la récupération du nom de l\'entreprise:', error);
      }
    }
    
    if (companyName && companyName.trim()) {
      return companyName.trim();
    }
    
    // Si pas de nom d'entreprise, retourner une chaîne vide
    return '';
  };
  
  const companyName = getCompanyName();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Top bar */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-20 flex items-center justify-between">
          <Logo />
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
        <main className="p-5 md:p-8 space-y-6">
          {dashboardError && !loading ? (
            <div className="bg-white border border-[#D4DCDC] rounded-2xl px-5 py-4">
              <div className="font-['Instrument_Sans',sans-serif] text-sm text-[#D84343]">{dashboardError}</div>
            </div>
          ) : null}
          {/* Greeting + CTA */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-1">
              <h2 className="font-['Audiowide',cursive] text-[26px] text-[#002222]">
                Bonjour{companyName ? `, ${companyName}` : ''}
              </h2>
              <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Voici un aperçu de l'activité de votre entreprise aujourd'hui</p>
            </div>
            <button className="px-6 py-2.5 rounded-2xl bg-[#0389A6] text-white font-['Instrument_Sans',sans-serif]">Actions rapide</button>
          </div>

          {/* KPI row */}
          {loading ? (
            <div className="grid md:grid-cols-4 gap-4">
              <KpiCard title="Employés présents" value="..." sub="Chargement..." iconSrc={iconPersonne} />
              <KpiCard title="Employés absents" value="..." sub="Chargement..." iconSrc={iconPersonne} />
              <KpiCard title="Retards" value="..." sub="Chargement..." iconSrc={iconRetard} />
              <KpiCard title="Nombre d'employés" value="..." sub="Total employés" iconSrc={iconTaux} />
            </div>
          ) : (
          <div className="grid md:grid-cols-4 gap-4">
              <KpiCard title="Employés présents" value={stats.present.toString()} sub={`/${stats.present + stats.absent} employés`} iconSrc={iconPersonne} />
              <KpiCard title="Employés absents" value={stats.absent.toString()} sub="employés absents" iconSrc={iconPersonne} />
              <KpiCard title="Retards" value={stats.retards.toString()} sub="retards aujourd'hui" iconSrc={iconRetard} />
              <KpiCard title="Nombre d'employés" value={stats.totalEmployees.toString()} sub="Total employés" iconSrc={iconTaux} />
          </div>
          )}

          {/* Chart + Activity + Alerts */}
          <div className="grid lg:grid-cols-[1fr_410px] gap-4">
            <div className="space-y-4">
              <div className="border border-[#D4DCDC] rounded-2xl overflow-hidden bg-white">
                <SectionTitle>Taux de présence de la semaine</SectionTitle>
                <div className="p-5">
                  {/* Graphique à barres */}
                  <div className="relative w-full" style={{ height: '256px' }}>
                    {/* Axe Y avec graduations (à gauche) */}
                    <div className="absolute left-0 top-0 bottom-12 flex flex-col justify-between text-[#5A6565] font-['Instrument_Sans',sans-serif] text-xs" style={{ height: '200px', width: '30px' }}>
                      <span>100</span>
                      <span>80</span>
                      <span>60</span>
                      <span>40</span>
                      <span>20</span>
                      <span>00</span>
                    </div>
                    
                    {/* Zone des barres avec marge gauche pour l'axe Y */}
                    <div className="ml-10 h-[200px] flex items-end justify-between gap-2 pr-2">
                      {weeklyAttendance.map((item, index) => {
                        const maxHeight = 200; // Hauteur maximale en pixels
                        const barHeight = (item.rate / 100) * maxHeight;
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                            {/* Barre */}
                            <div 
                              className="w-full rounded-t-lg bg-[#0389A6] transition-all duration-300"
                              style={{ 
                                height: `${barHeight}px`,
                                minHeight: item.rate > 0 ? '4px' : '0px'
                              }}
                            />
                            {/* Label du jour */}
                            <div className="font-['Instrument_Sans',sans-serif] text-xs text-[#5A6565] mt-1">
                              {item.day}
                            </div>
                            {/* Valeur en pourcentage */}
                            <div className="font-['Instrument_Sans',sans-serif] text-xs font-semibold text-[#002222]">
                              {item.rate}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Légende */}
                  <div className="flex items-center gap-3 mt-4 text-[#5A6565] font-['Instrument_Sans',sans-serif] text-sm">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0389A6]" /> Évolution du taux de présence sur les 7 derniers jours
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="border border-[#D4DCDC] rounded-2xl overflow-hidden bg-white">
                <SectionTitle>Activité récente</SectionTitle>
                <div className="divide-y divide-[#D4DCDC]/40">
                  {recentActivity.length === 0 && !loading ? (
                    <div className="px-4 py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#ECEFEF] flex items-center justify-center mx-auto mb-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#5A6565"/>
                        </svg>
                      </div>
                      <p className="text-[#5A6565] font-['Instrument_Sans',sans-serif] text-sm">
                        Aucune activité récente
                      </p>
                    </div>
                  ) : (
                    recentActivity.map((e, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                      {/* Left: avatar + texts */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-[38px] h-[38px] rounded-xl border border-[#0389A6] bg-[#0389A6]/10 flex items-center justify-center font-['Instrument_Sans',sans-serif] text-[#0389A6] font-bold">
                          {e.initials}
                        </div>
                        <div className="leading-tight min-w-0">
                          <div className="font-['Instrument_Sans',sans-serif] text-sm font-semibold text-[#002222] truncate">{e.name}</div>
                          <div className="font-['Instrument_Sans',sans-serif] text-sm text-[#5A6565] truncate">{e.action}</div>
                        </div>
                      </div>

                      {/* Right: time + status icon */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {e.time && (
                          <div className="font-['Instrument_Sans',sans-serif] text-sm text-[#5A6565]/70">{e.time}</div>
                        )}
                        {e.status === 'ok' && (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" className="fill-green-500/10"/>
                            <path d="M8 12.5l2.5 2.5L16 9" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {e.status === 'warn' && (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" className="fill-orange-500/10"/>
                            <path d="M12 7v7M12 17h.01" stroke="#FF8F18" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                        {e.status === 'error' && (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" className="fill-red-500/10"/>
                            <path d="M9 9l6 6M15 9l-6 6" stroke="#D84343" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-[#D4DCDC] rounded-2xl overflow-hidden bg-white">
                <SectionTitle>Alertes et notifications</SectionTitle>
                <div className="p-4">
                  {alerts.length === 0 && !loading ? (
                    <div className="px-4 py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#ECEFEF] flex items-center justify-center mx-auto mb-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="text-[#5A6565] font-['Instrument_Sans',sans-serif] text-sm">
                        Aucune alerte pour le moment
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((alert, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-5 h-5 rounded"
                              style={{ backgroundColor: alert.color || '#0389A6' }}
                            />
                            <div className="font-['Instrument_Sans',sans-serif] text-sm text-[#002222]">
                              {alert.message}
                  </div>
                    </div>
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-['Instrument_Sans',sans-serif]"
                            style={{
                              backgroundColor: alert.priorityBg || '#ECEFEF',
                              color: alert.priorityColor || '#002222'
                            }}
                          >
                            {alert.priority || 'medium'}
                          </span>
                  </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
