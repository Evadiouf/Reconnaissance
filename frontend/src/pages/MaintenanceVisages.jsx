import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import faceRecognitionService from '../services/faceRecognitionService';
import companiesService from '../services/companiesService';
import { getUserData } from '../services/userDataService';

function MaintenanceVisages() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [allFaces, setAllFaces] = useState([]);
  const [phantomFaces, setPhantomFaces] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error, info

  useEffect(() => {
    const user = getUserData();
    setUserData(user);
    
    // Vérifier si c'est un admin plateforme
    if (!user?.roles?.includes('superadmin')) {
      setMessage("Accès réservé à l'administrateur de la plateforme");
      setMessageType('error');
      return;
    }
    
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      // Récupérer tous les employés de toutes les entreprises
      const response = await companiesService.getAllCompaniesWithEmployees();
      setEmployees(response);
    } catch (error) {
      console.error('Erreur chargement employés:', error);
      setMessage('Erreur lors du chargement des employés');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const analyzeFaces = async () => {
    try {
      setAnalyzing(true);
      setMessage('');
      
      // 1. Récupérer tous les visages Naratech
      const facesResponse = await faceRecognitionService.listTrainingImages();
      const faces = facesResponse?.faces || facesResponse || [];
      setAllFaces(faces);
      
      // 2. Créer un Set de tous les IDs MongoDB valides
      const validEmployeeIds = new Set();
      employees.forEach(company => {
        if (company.owner) validEmployeeIds.add(company.owner._id || company.owner.id);
        if (company.employees) {
          company.employees.forEach(emp => {
            validEmployeeIds.add(emp._id || emp.id);
          });
        }
      });
      
      // 3. Identifier les faces fantômes
      const phantom = faces.filter(face => 
        !validEmployeeIds.has(face.employee_id) && 
        /^[0-9a-fA-F]{24}$/.test(face.employee_id) // Vérifier que c'est bien un format MongoDB
      );
      
      setPhantomFaces(phantom);
      
      if (phantom.length === 0) {
        setMessage('✅ Aucun visage fantôme détecté. Tous les visages sont correctement liés à des employés.');
        setMessageType('success');
      } else {
        setMessage(`⚠️ ${phantom.length} visage(s) fantôme(s) détecté(s). Ces visages sont liés à des employés qui n\'existent plus dans la base de données.`);
        setMessageType('warning');
      }
    } catch (error) {
      console.error('Erreur analyse visages:', error);
      setMessage('Erreur lors de l\'analyse des visages: ' + (error.message || 'Erreur inconnue'));
      setMessageType('error');
    } finally {
      setAnalyzing(false);
    }
  };

  const deletePhantomFace = async (employeeId, employeeName) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le visage fantôme "${employeeName}" (ID: ${employeeId}) ?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await faceRecognitionService.deleteEmployeeTrainingImage(employeeId);
      
      // Mettre à jour la liste
      setPhantomFaces(prev => prev.filter(face => face.employee_id !== employeeId));
      setAllFaces(prev => prev.filter(face => face.employee_id !== employeeId));
      
      setMessage(`✅ Visage fantôme "${employeeName}" supprimé avec succès. Veuillez ré-enregistrer la photo du bon employé si nécessaire.`);
      setMessageType('success');
    } catch (error) {
      console.error('Erreur suppression visage:', error);
      setMessage('Erreur lors de la suppression du visage: ' + (error.message || 'Erreur inconnue'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllPhantomFaces = async () => {
    if (phantomFaces.length === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer TOUS les ${phantomFaces.length} visages fantômes ? Cette action est irréversible.`)) {
      return;
    }
    
    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;
      
      for (const face of phantomFaces) {
        try {
          await faceRecognitionService.deleteEmployeeTrainingImage(face.employee_id);
          successCount++;
        } catch (error) {
          console.error(`Erreur suppression ${face.employee_id}:`, error);
          errorCount++;
        }
      }
      
      setPhantomFaces([]);
      setAllFaces(prev => prev.filter(face => 
        !phantomFaces.some(phantom => phantom.employee_id === face.employee_id)
      ));
      
      if (errorCount === 0) {
        setMessage(`✅ Tous les ${successCount} visages fantômes ont été supprimés avec succès.`);
        setMessageType('success');
      } else {
        setMessage(`⚠️ ${successCount} visages supprimés, ${errorCount} erreurs. Vérifiez les logs pour plus de détails.`);
        setMessageType('warning');
      }
    } catch (error) {
      console.error('Erreur suppression massive:', error);
      setMessage('Erreur lors de la suppression massive: ' + (error.message || 'Erreur inconnue'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const reloadModel = async () => {
    try {
      setLoading(true);
      await faceRecognitionService.reloadModel();
      setMessage('✅ Modèle de reconnaissance faciale rechargé avec succès.');
      setMessageType('success');
    } catch (error) {
      console.error('Erreur rechargement modèle:', error);
      setMessage('Erreur lors du rechargement du modèle: ' + (error.message || 'Erreur inconnue'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (!userData?.roles?.includes('superadmin')) {
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

          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-6 border border-[#E3E8E8]">
              <h2 className="font-instrument text-lg font-semibold text-[#002222] mb-4">Maintenance Visages</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">⚠️ Accès refusé</p>
                <p className="text-red-600 mt-2">Cette page est réservée à l'administrateur de la plateforme uniquement.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl p-6 border border-[#E3E8E8]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-instrument text-lg font-semibold text-[#002222]">Maintenance Visages (Naratech)</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={reloadModel}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[#FF8F18] text-white hover:bg-[#E67E00] disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : 'Recharger modèle'}
                </button>
              </div>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg border ${
                messageType === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                messageType === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
                <p>{message}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={analyzeFaces}
                  disabled={analyzing || loading}
                  className="px-4 py-2 rounded-lg bg-[#2F6FED] text-white hover:bg-[#255BBD] disabled:opacity-50"
                >
                  {analyzing ? 'Analyse...' : 'Analyser les visages'}
                </button>
                
                {phantomFaces.length > 0 && (
                  <button
                    onClick={deleteAllPhantomFaces}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Supprimer tous les fantômes ({phantomFaces.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-800">Total visages</p>
                  <p className="text-2xl font-bold text-blue-600">{allFaces.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-semibold text-green-800">Visages valides</p>
                  <p className="text-2xl font-bold text-green-600">{allFaces.length - phantomFaces.length}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-semibold text-red-800">Visages fantômes</p>
                  <p className="text-2xl font-bold text-red-600">{phantomFaces.length}</p>
                </div>
              </div>
            </div>

            {phantomFaces.length > 0 && (
              <div>
                <h3 className="font-instrument text-base font-semibold text-[#002222] mb-4">Visages Fantômes Détectés</h3>
                <div className="space-y-3">
                  {phantomFaces.map((face, index) => (
                    <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">ID:</span>
                              <p className="font-mono text-red-600">{face.employee_id}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Nom:</span>
                              <p className="text-gray-800">{face.employee_name || 'Non spécifié'}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Status:</span>
                              <p className="text-red-600 font-medium">❌ Fantôme</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => deletePhantomFace(face.employee_id, face.employee_name)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allFaces.length > 0 && phantomFaces.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">✅ Tous les visages sont correctement liés à des employés existants.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaintenanceVisages;
