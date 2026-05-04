import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import companiesService from '../services/companiesService';
import { normalizeDepartmentKey } from '../utils/kioskSchedule';

const emptySlot = () => ({ start: '07:30', end: '09:00', action: 'clock_in' });
const emptyTeam = () => ({
  departmentKey: '',
  label: '',
  enabled: true,
  slots: [emptySlot()],
});

/** Champs formulaire : contraste fort (texte saisi bien visible sur fond clair) */
const inputClass =
  'min-h-[42px] border border-gray-400 rounded-lg bg-white px-3 py-2 ' +
  'text-base font-semibold text-gray-900 caret-[#0389A6] ' +
  'placeholder:text-gray-600 placeholder:font-normal ' +
  'shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0389A6]/45 focus:border-[#0389A6] ' +
  '[color-scheme:light]';

const selectClass = `${inputClass} cursor-pointer pr-8`;

export default function KiosqueSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [defaultSlots, setDefaultSlots] = useState([
    { start: '07:30', end: '09:30', action: 'clock_in' },
    { start: '17:00', end: '19:00', action: 'clock_out' },
  ]);
  const [teamOverrides, setTeamOverrides] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const company = await companiesService.getMyCompany();
      const ka = company?.kioskAttendance;
      if (ka) {
        setEnabled(!!ka.enabled);
        if (Array.isArray(ka.defaultSlots) && ka.defaultSlots.length > 0) {
          setDefaultSlots(ka.defaultSlots.map((s) => ({ ...s })));
        }
        if (Array.isArray(ka.teamOverrides) && ka.teamOverrides.length > 0) {
          setTeamOverrides(
            ka.teamOverrides.map((t) => ({
              departmentKey: t.departmentKey || '',
              label: t.label || '',
              enabled: !!t.enabled,
              slots:
                Array.isArray(t.slots) && t.slots.length > 0
                  ? t.slots.map((s) => ({ ...s }))
                  : [emptySlot()],
            })),
          );
        } else {
          setTeamOverrides([]);
        }
      }
    } catch (e) {
      console.error(e);
      setError('Impossible de charger la configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const normalizedTeams = teamOverrides.map((t) => ({
        departmentKey: normalizeDepartmentKey(t.departmentKey),
        label: (t.label || '').trim() || undefined,
        enabled: !!t.enabled,
        slots: (t.slots || []).filter((s) => s.start && s.end && s.action),
      }));

      await companiesService.updateKioskAttendance({
        enabled,
        defaultSlots: defaultSlots.filter((s) => s.start && s.end && s.action),
        teamOverrides: normalizedTeams.filter((t) => t.departmentKey),
      });
      setMessage('Configuration enregistrée. Le poste kiosque appliquera les changements sous ~1 minute.');
      await load();
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        (Array.isArray(e.response?.data?.message) ? e.response.data.message.join(', ') : null) ||
        e.message ||
        'Erreur lors de l\'enregistrement';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#ECEFEF]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-semibold text-[#002222]">Configuration kiosque</h1>
          <div className="flex items-center gap-4">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </header>

        <main className="flex-1 p-8 max-w-4xl">
          {loading ? (
            <p className="text-gray-900 font-medium">Chargement…</p>
          ) : (
            <div className="space-y-8 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm [color-scheme:light]">
              <p className="text-sm text-gray-800 leading-relaxed">
                Activez le <strong>pointage automatique par plages horaires</strong> pour la page{' '}
                <strong>Kiosque</strong>. Tant que l’option est désactivée, le comportement du kiosque reste
                inchangé (démarrage manuel, entrée puis sortie comme avant). La clé <strong>département</strong>{' '}
                d’une équipe doit correspondre au champ « Département » des employés (insensible à la casse).
              </p>

              <label className="flex items-center gap-3 cursor-pointer text-gray-900">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-5 h-5 shrink-0 rounded border-2 border-gray-500 bg-white text-[#0389A6] accent-[#0389A6] focus:ring-2 focus:ring-[#0389A6]"
                />
                <span className="font-semibold text-[#002222]">Activer les plages horaires sur le kiosque</span>
              </label>

              <section>
                <h2 className="text-lg font-semibold text-[#002222] mb-3">Créneaux par défaut (toute l’entreprise)</h2>
                <p className="text-sm text-gray-700 mb-3">Premier créneau contenant l’heure actuelle = règle appliquée.</p>
                <div className="space-y-2">
                  {defaultSlots.map((row, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={row.start}
                        onChange={(e) => {
                          const next = [...defaultSlots];
                          next[i] = { ...next[i], start: e.target.value };
                          setDefaultSlots(next);
                        }}
                        className={inputClass}
                      />
                      <span className="text-gray-700 font-medium">→</span>
                      <input
                        type="time"
                        value={row.end}
                        onChange={(e) => {
                          const next = [...defaultSlots];
                          next[i] = { ...next[i], end: e.target.value };
                          setDefaultSlots(next);
                        }}
                        className={inputClass}
                      />
                      <select
                        value={row.action}
                        onChange={(e) => {
                          const next = [...defaultSlots];
                          next[i] = { ...next[i], action: e.target.value };
                          setDefaultSlots(next);
                        }}
                        className={selectClass}
                      >
                        <option value="clock_in">Entrée</option>
                        <option value="clock_out">Sortie</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setDefaultSlots((prev) => prev.filter((_, j) => j !== i))}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={defaultSlots.length >= 8}
                    onClick={() => setDefaultSlots((p) => [...p, emptySlot()])}
                    className="text-[#0389A6] text-sm font-medium hover:underline disabled:opacity-40"
                  >
                    + Ajouter un créneau
                  </button>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[#002222] mb-3">Équipes (optionnel)</h2>
                <p className="text-sm text-gray-700 mb-3">
                  Si un employé a le même département (ex.{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-900 font-mono text-sm border border-gray-200">
                    marketing
                  </code>
                  ) qu’une ligne ci-dessous avec « activé » et des créneaux, ce sont{' '}
                  <strong className="text-gray-900">ces</strong> créneaux qui s’appliquent à la place du défaut.
                </p>
                <div className="space-y-6">
                  {teamOverrides.map((team, ti) => (
                    <div key={ti} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap gap-3 items-center">
                        <input
                          placeholder="Clé département (ex. marketing)"
                          value={team.departmentKey}
                          onChange={(e) => {
                            const next = [...teamOverrides];
                            next[ti] = { ...next[ti], departmentKey: e.target.value };
                            setTeamOverrides(next);
                          }}
                          className={`flex-1 min-w-[180px] ${inputClass}`}
                        />
                        <input
                          placeholder="Libellé (optionnel)"
                          value={team.label}
                          onChange={(e) => {
                            const next = [...teamOverrides];
                            next[ti] = { ...next[ti], label: e.target.value };
                            setTeamOverrides(next);
                          }}
                          className={`flex-1 min-w-[120px] ${inputClass}`}
                        />
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-900 shrink-0">
                          <input
                            type="checkbox"
                            checked={team.enabled}
                            onChange={(e) => {
                              const next = [...teamOverrides];
                              next[ti] = { ...next[ti], enabled: e.target.checked };
                              setTeamOverrides(next);
                            }}
                            className="h-4 w-4 rounded border-2 border-gray-500 bg-white accent-[#0389A6]"
                          />
                          Activé
                        </label>
                        <button
                          type="button"
                          onClick={() => setTeamOverrides((p) => p.filter((_, j) => j !== ti))}
                          className="text-red-600 text-sm"
                        >
                          Supprimer l’équipe
                        </button>
                      </div>
                      {(team.slots || []).map((row, si) => (
                        <div key={si} className="flex flex-wrap items-center gap-2 ml-2 pl-3 border-l-2 border-[#0389A6]/30">
                          <input
                            type="time"
                            value={row.start}
                            onChange={(e) => {
                              const next = [...teamOverrides];
                              const slots = [...(next[ti].slots || [])];
                              slots[si] = { ...slots[si], start: e.target.value };
                              next[ti] = { ...next[ti], slots };
                              setTeamOverrides(next);
                            }}
                            className={inputClass}
                          />
                          <span className="text-gray-700 font-medium">→</span>
                          <input
                            type="time"
                            value={row.end}
                            onChange={(e) => {
                              const next = [...teamOverrides];
                              const slots = [...(next[ti].slots || [])];
                              slots[si] = { ...slots[si], end: e.target.value };
                              next[ti] = { ...next[ti], slots };
                              setTeamOverrides(next);
                            }}
                            className={inputClass}
                          />
                          <select
                            value={row.action}
                            onChange={(e) => {
                              const next = [...teamOverrides];
                              const slots = [...(next[ti].slots || [])];
                              slots[si] = { ...slots[si], action: e.target.value };
                              next[ti] = { ...next[ti], slots };
                              setTeamOverrides(next);
                            }}
                            className={selectClass}
                          >
                            <option value="clock_in">Entrée</option>
                            <option value="clock_out">Sortie</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...teamOverrides];
                              next[ti] = {
                                ...next[ti],
                                slots: (next[ti].slots || []).filter((_, j) => j !== si),
                              };
                              setTeamOverrides(next);
                            }}
                            className="text-red-600 text-xs"
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        disabled={(team.slots || []).length >= 8}
                        onClick={() => {
                          const next = [...teamOverrides];
                          next[ti] = { ...next[ti], slots: [...(next[ti].slots || []), emptySlot()] };
                          setTeamOverrides(next);
                        }}
                        className="text-[#0389A6] text-sm ml-2"
                      >
                        + Créneau pour cette équipe
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={teamOverrides.length >= 12}
                    onClick={() => setTeamOverrides((p) => [...p, emptyTeam()])}
                    className="text-[#0389A6] text-sm font-medium hover:underline disabled:opacity-40"
                  >
                    + Ajouter une équipe (département)
                  </button>
                </div>
              </section>

              {message && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">{message}</div>
              )}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre-wrap">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="px-6 py-3 bg-[#0389A6] text-white rounded-xl font-medium hover:bg-[#027A94] disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
