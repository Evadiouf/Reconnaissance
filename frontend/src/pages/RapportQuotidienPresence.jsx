import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import companiesService from '../services/companiesService';
import attendanceService from '../services/attendanceService';
import schedulesService from '../services/schedulesService';
import authService from '../services/authService';
import { getUserData } from '../services/userDataService';

function RapportQuotidienPresence() {
  const [resolvedCompanyId, setResolvedCompanyId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [onlyVariances, setOnlyVariances] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [schedulesById, setSchedulesById] = useState(new Map());

  const isValidMongoId = (id) => /^[0-9a-fA-F]{24}$/.test(id || '');

  const dateLabel = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      if (isNaN(d.getTime())) return selectedDate;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const formatTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatHours = (seconds) => {
    if (!seconds || typeof seconds !== 'number') return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h${String(m).padStart(2, '0')}`;
  };

  const parseHHmmToMinutes = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };

  const diffMinutesLabel = (diffMin) => {
    if (diffMin === null || diffMin === undefined) return '';
    if (diffMin === 0) return '0 min';
    const sign = diffMin > 0 ? '+' : '-';
    const val = Math.abs(diffMin);
    return `${sign}${val} min`;
  };

  const computeEcart = ({ clockInAt, clockOutAt, schedule }) => {
    if (!schedule) return '';
    const startMin = parseHHmmToMinutes(schedule.startTime);
    const endMin = parseHHmmToMinutes(schedule.endTime);

    let inDelta = null;
    let outDelta = null;

    if (clockInAt && startMin !== null) {
      const d = new Date(clockInAt);
      if (!isNaN(d.getTime())) {
        const actual = d.getHours() * 60 + d.getMinutes();
        inDelta = actual - startMin;
      }
    }
    if (clockOutAt && endMin !== null) {
      const d = new Date(clockOutAt);
      if (!isNaN(d.getTime())) {
        const actual = d.getHours() * 60 + d.getMinutes();
        outDelta = actual - endMin;
      }
    }

    const parts = [];
    if (inDelta !== null) parts.push(`Entrée ${diffMinutesLabel(inDelta)}`);
    if (outDelta !== null) parts.push(`Sortie ${diffMinutesLabel(outDelta)}`);
    return parts.join(' / ');
  };

  useEffect(() => {
    const init = async () => {
      const merged = getUserData();
      const stored = authService.getStoredAuth().user;
      const fallbackCompanyId = merged?.companyId || merged?.company?._id || merged?.company?.id || stored?.companyId || stored?.company?._id || stored?.company?.id || null;

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

  const loadReport = async () => {
    if (!resolvedCompanyId) {
      setError('Aucune entreprise associée à ce compte (companyId introuvable).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!selectedDate || typeof selectedDate !== 'string') {
        setError('Date invalide.');
        return;
      }

      // Plage UTC stable pour la journée sélectionnée (Option A: rattaché au jour d'entrée)
      const from = `${selectedDate}T00:00:00.000Z`;
      const to = `${selectedDate}T23:59:59.999Z`;

      // Validation simple du format pour éviter d'envoyer des dates cassées
      if (!/^\d{4}-\d{2}-\d{2}T/.test(from) || !/^\d{4}-\d{2}-\d{2}T/.test(to)) {
        setError('Date invalide.');
        return;
      }

      const [companyEmployees, schedules, companyAttendance] = await Promise.all([
        companiesService.getCompanyEmployees(),
        schedulesService.list(),
        attendanceService.getCompanyAttendance({ companyId: resolvedCompanyId, from, to, limit: 500 }),
      ]);

      const normalizedEmployees = Array.isArray(companyEmployees) ? companyEmployees : [];
      setEmployees(normalizedEmployees);

      const scheduleMap = new Map();
      (Array.isArray(schedules) ? schedules : []).forEach((s) => {
        const sid = (s?._id || s?.id) ? String(s._id || s.id) : null;
        if (sid) scheduleMap.set(sid, s);
      });
      setSchedulesById(scheduleMap);

      setEvents(Array.isArray(companyAttendance?.items) ? companyAttendance.items : []);
    } catch (e) {
      const message = e?.response?.data?.message || e?.message || 'Erreur lors du chargement du rapport.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resolvedCompanyId) {
      loadReport();
    }
  }, [resolvedCompanyId, selectedDate]);

  const rows = useMemo(() => {
    const byEmployeeId = new Map();

    (events || []).forEach((evt) => {
      const uid = evt?.userId ? String(evt.userId) : (evt?.user && typeof evt.user === 'object' ? String(evt.user._id || evt.user.id || '') : '');
      if (!uid) return;

      const prev = byEmployeeId.get(uid) || { clockInAt: null, clockOutAt: null };

      const inAt = evt?.clockInTime ? new Date(evt.clockInTime) : null;
      const outAt = evt?.clockOutTime ? new Date(evt.clockOutTime) : null;

      if (inAt && !isNaN(inAt.getTime())) {
        if (!prev.clockInAt || inAt < prev.clockInAt) prev.clockInAt = inAt;
      }
      if (outAt && !isNaN(outAt.getTime())) {
        if (!prev.clockOutAt || outAt > prev.clockOutAt) prev.clockOutAt = outAt;
      }

      byEmployeeId.set(uid, prev);
    });

    const computed = (employees || []).map((emp) => {
      const empId = String(emp._id || emp.id || '');
      const firstName = emp.firstName || emp.prenom || '';
      const lastName = emp.lastName || emp.nom || '';
      const fullName = `${firstName} ${lastName}`.trim() || emp.email?.split?.('@')?.[0] || 'Employé';

      const department = emp.department || emp.departement || 'Non spécifié';

      const presence = byEmployeeId.get(empId) || { clockInAt: null, clockOutAt: null };

      const scheduleId = emp.workingScheduleId ? String(emp.workingScheduleId) : '';
      const schedule = scheduleId ? schedulesById.get(scheduleId) : null;

      const workedSeconds = (() => {
        if (!presence.clockInAt || !presence.clockOutAt) return 0;
        const diff = Math.floor((presence.clockOutAt.getTime() - presence.clockInAt.getTime()) / 1000);
        return Math.max(0, diff);
      })();

      const lateMinutes = (() => {
        if (!presence.clockInAt || !schedule) return null;
        const startMin = parseHHmmToMinutes(schedule.startTime);
        if (startMin === null) return null;
        const actualMin = presence.clockInAt.getHours() * 60 + presence.clockInAt.getMinutes();
        const diff = actualMin - startMin;
        return diff > 0 ? diff : 0;
      })();

      const isPresent = !!presence.clockInAt;
      const isLate = isPresent && typeof lateMinutes === 'number' && lateMinutes > 0;
      const status = (() => {
        if (!isPresent) return 'Absent';
        if (!presence.clockOutAt) return isLate ? 'Retard (en cours)' : 'En cours';
        return isLate ? 'Retard' : 'Présent';
      })();
      const ecart = computeEcart({
        clockInAt: presence.clockInAt?.toISOString?.() || null,
        clockOutAt: presence.clockOutAt?.toISOString?.() || null,
        schedule,
      });

      const hasVariance = isLate || (ecart && ecart.includes('+')) || (ecart && ecart.includes('-'));

      return {
        id: empId,
        fullName,
        firstName,
        lastName,
        department,
        schedule,
        isPresent,
        isLate,
        status,
        lateMinutes: lateMinutes || 0,
        clockInAt: presence.clockInAt ? presence.clockInAt.toISOString() : '',
        clockOutAt: presence.clockOutAt ? presence.clockOutAt.toISOString() : '',
        workedSeconds,
        ecart,
        hasVariance,
      };
    });

    return onlyVariances ? computed.filter((r) => r.hasVariance) : computed;
  }, [employees, events, schedulesById, onlyVariances]);

  const stats = useMemo(() => {
    const total = (employees || []).length;
    const present = rows.filter((r) => r.isPresent).length;
    const late = rows.filter((r) => r.isLate).length;
    const absent = total - present;
    return { total, present, late, absent };
  }, [employees, rows]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex bg-[#ECF1F1] min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
          <div className="flex items-center justify-between w-full px-12">
            <h1 className="font-audiowide text-2xl font-normal text-[#002222]">Sen Pointage</h1>
            <div className="flex items-center gap-4">
              <NotificationIcon />
              <ProfileDropdown />
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-instrument text-lg font-semibold text-[#002222]">Senpointage - Rapport du {dateLabel}</h2>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/rapports" className="px-4 py-2 rounded-lg border border-[#D4DCDC] text-[#002222] bg-white hover:bg-[#F7F9F9]">
                ← Retour aux rapports
              </Link>
              <button onClick={handlePrint} className="px-4 py-2 rounded-lg bg-[#2F6FED] text-white hover:bg-[#255BBD]">
                Imprimer
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl mt-4 p-6 border border-[#E3E8E8]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-[#D4DCDC] rounded-lg text-[#002222]"
                  />
                </div>
                <button
                  onClick={loadReport}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[#2F6FED] text-white hover:bg-[#255BBD] disabled:opacity-50"
                >
                  {loading ? 'Chargement…' : 'Charger le rapport'}
                </button>

                <label className="flex items-center gap-2 text-[#002222]">
                  <input
                    type="checkbox"
                    checked={onlyVariances}
                    onChange={(e) => setOnlyVariances(e.target.checked)}
                  />
                  Afficher uniquement les écarts d’horaires
                </label>
              </div>

              <div className="text-sm text-[#5A6565]">{selectedDate.split('-').reverse().join('/')}</div>
            </div>

            <div className="mt-3 text-sm text-[#5A6565]">
              Les pointages sont rattachés au jour de l’entrée (heure d’arrivée).
            </div>

            {error ? (
              <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-6">
              <div className="rounded-xl border border-[#E3E8E8] bg-white p-5 shadow-sm">
                <div className="text-sm text-[#5A6565]">Total employés</div>
                <div className="text-3xl font-semibold text-[#002222] mt-1">{stats.total}</div>
              </div>
              <div className="rounded-xl bg-[#2E7D50] p-5 text-white shadow-sm">
                <div className="text-sm opacity-90">Présents</div>
                <div className="text-3xl font-semibold mt-1">{stats.present}</div>
              </div>
              <div className="rounded-xl bg-[#F4B400] p-5 text-white shadow-sm">
                <div className="text-sm opacity-90">En retard</div>
                <div className="text-3xl font-semibold mt-1">{stats.late}</div>
              </div>
              <div className="rounded-xl bg-[#D84343] p-5 text-white shadow-sm">
                <div className="text-sm opacity-90">Absents</div>
                <div className="text-3xl font-semibold mt-1">{stats.absent}</div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-base text-[#002222]">
                <thead>
                  <tr className="text-left text-[#002222] border-b border-[#E3E8E8]">
                    <th className="py-4 pr-6">ID</th>
                    <th className="py-4 pr-6">Nom</th>
                    <th className="py-4 pr-6">Prénom</th>
                    <th className="py-4 pr-6">Département</th>
                    <th className="py-4 pr-6">Heure d'arrivée</th>
                    <th className="py-4 pr-6">Heure de départ</th>
                    <th className="py-4 pr-6">Heures travaillées</th>
                    <th className="py-4 pr-6">Écarts d'horaires</th>
                    <th className="py-4 pr-6">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-[#EEF2F2]">
                      <td className="py-4 pr-6 font-mono text-sm text-[#002222]">{r.id}</td>
                      <td className="py-4 pr-6">{r.lastName || r.fullName.split(' ').slice(-1).join(' ')}</td>
                      <td className="py-4 pr-6">{r.firstName || r.fullName.split(' ').slice(0, -1).join(' ')}</td>
                      <td className="py-4 pr-6">{r.department}</td>
                      <td className="py-4 pr-6">{r.isPresent ? formatTime(r.clockInAt) : ''}</td>
                      <td className="py-4 pr-6">{r.isPresent && r.clockOutAt ? formatTime(r.clockOutAt) : ''}</td>
                      <td className="py-4 pr-6">{r.workedSeconds ? formatHours(r.workedSeconds) : ''}</td>
                      <td className="py-4 pr-6 text-[#5A6565]">{r.ecart || ''}</td>
                      <td className="py-4 pr-6">
                        {r.status === 'Absent' ? (
                          <span className="inline-flex items-center gap-2 text-[#D84343] font-medium">
                            <span className="w-4 h-4 rounded-full bg-[#D84343] inline-flex items-center justify-center text-white text-[10px]">×</span>
                            Absent
                          </span>
                        ) : r.status?.includes('Retard') ? (
                          <span className="inline-flex items-center gap-2 text-[#F4B400] font-medium">
                            <span className="w-4 h-4 rounded-full bg-[#F4B400] inline-flex items-center justify-center text-white text-[10px]">!</span>
                            {r.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-[#2E7D50] font-medium">
                            <span className="w-4 h-4 rounded-full bg-[#2E7D50] inline-flex items-center justify-center text-white text-[10px]">✓</span>
                            {r.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#5A6565]">Aucune donnée</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RapportQuotidienPresence;
