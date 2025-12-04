import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { profissionalAPI, getAuthToken, setAuthToken } from '../../services/api';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import { colors } from '../../constants/colors';

const ProntuariosScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNovoProntuarioModal, setShowNovoProntuarioModal] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [searchPaciente, setSearchPaciente] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadProntuarios();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (showNovoProntuarioModal) {
      loadPacientes();
    }
  }, [showNovoProntuarioModal]);

  const loadProntuarios = async () => {
    setRefreshing(true);
    setLoading(true);
    
    try {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      const response = await profissionalAPI.getProntuarios(1, 50);
      
      console.log('Prontuários Response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        // A resposta paginada retorna data diretamente (não data.data)
        const prontuariosData = response.data || [];
        console.log('Prontuários Data:', prontuariosData);
        console.log('Response completo:', JSON.stringify(response, null, 2));
        
        // Se for um array, usar diretamente
        const prontuariosArray = Array.isArray(prontuariosData) ? prontuariosData : [];
        
        const prontuariosFormatados = prontuariosArray.map((p: any) => ({
          id: p.id,
          idPaciente: p.idPaciente,
          nomePaciente: p.nomePaciente || 'Paciente',
          dataRegistro: p.dataRegistro ? (p.dataRegistro instanceof Date ? p.dataRegistro : new Date(p.dataRegistro)) : new Date(),
          observacoes: p.observacoes || '',
        }));
        
        console.log('Prontuários Formatados:', prontuariosFormatados);
        setProntuarios(prontuariosFormatados);
      } else {
        console.error('Erro na resposta dos prontuários:', response);
        Alert.alert('Atenção', 'Não foi possível carregar os prontuários. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro ao carregar prontuários:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar os prontuários.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const loadPacientes = async () => {
    setLoadingPacientes(true);
    try {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      const response = await profissionalAPI.getPacientes();
      
      if (response.success) {
        const pacientesData = response.data || [];
        setPacientes(pacientesData);
      } else {
        Alert.alert('Atenção', 'Não foi possível carregar os pacientes.');
      }
    } catch (error: any) {
      console.error('Erro ao carregar pacientes:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar os pacientes.');
    } finally {
      setLoadingPacientes(false);
    }
  };

  const handleCreateProntuario = () => {
    if (!selectedPaciente) {
      Alert.alert('Atenção', 'Por favor, selecione um paciente.');
      return;
    }
    
    setShowNovoProntuarioModal(false);
    navigation.navigate('NovoProntuarioProfissional', {
      idPaciente: selectedPaciente.id,
      nomePaciente: selectedPaciente.nome || selectedPaciente.nomeCompleto
    });
    setSelectedPaciente(null);
    setSearchPaciente('');
  };

  const filteredPacientes = pacientes.filter(paciente => {
    const nome = (paciente.nome || paciente.nomeCompleto || '').toLowerCase();
    return nome.includes(searchPaciente.toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando prontuários...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9FC" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 75 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadProntuarios} />
        }
      >
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Prontuários</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowNovoProntuarioModal(true)}
            >
              <LinearGradient
                colors={['#4CAF50', '#2196F3']}
                style={styles.addButtonGradient}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Novo Prontuário</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* Lista de Prontuários */}
          {prontuarios.length > 0 ? (
            prontuarios.map((prontuario) => (
              <TouchableOpacity
                key={prontuario.id}
                style={styles.prontuarioCard}
                onPress={() => navigation.navigate('ProntuarioProfissional', { 
                  idPaciente: prontuario.idPaciente,
                  nomePaciente: prontuario.nomePaciente 
                })}
              >
                <LinearGradient
                  colors={['#E3F2FD', '#FFFFFF']}
                  style={styles.prontuarioCardGradient}
                >
                  <View style={styles.prontuarioHeader}>
                    <View style={styles.prontuarioHeaderLeft}>
                      <Text style={styles.prontuarioPaciente}>{prontuario.nomePaciente}</Text>
                      <Text style={styles.prontuarioDate}>
                        {prontuario.dataRegistro.toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#2196F3" />
                  </View>
                  {prontuario.observacoes && (
                    <Text style={styles.prontuarioPreview} numberOfLines={2}>
                      {prontuario.observacoes}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#CCC" />
              <Text style={styles.emptyStateText}>Nenhum prontuário encontrado</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal Novo Prontuário */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showNovoProntuarioModal}
        onRequestClose={() => {
          setShowNovoProntuarioModal(false);
          setSelectedPaciente(null);
          setSearchPaciente('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Prontuário</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowNovoProntuarioModal(false);
                  setSelectedPaciente(null);
                  setSearchPaciente('');
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#2196F3" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar paciente..."
                  placeholderTextColor="#888"
                  value={searchPaciente}
                  onChangeText={setSearchPaciente}
                />
                {searchPaciente ? (
                  <TouchableOpacity onPress={() => setSearchPaciente('')}>
                    <Ionicons name="close-circle" size={20} color="#CCC" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {loadingPacientes ? (
                <View style={styles.loadingContainerModal}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.loadingTextModal}>Carregando pacientes...</Text>
                </View>
              ) : filteredPacientes.length > 0 ? (
                <FlatList
                  data={filteredPacientes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.pacienteItem,
                        selectedPaciente?.id === item.id && styles.pacienteItemSelected
                      ]}
                      onPress={() => setSelectedPaciente(item)}
                    >
                      <View style={styles.pacienteItemContent}>
                        <Ionicons 
                          name="person" 
                          size={24} 
                          color={selectedPaciente?.id === item.id ? '#2196F3' : '#666'} 
                        />
                        <Text style={[
                          styles.pacienteItemText,
                          selectedPaciente?.id === item.id && styles.pacienteItemTextSelected
                        ]}>
                          {item.nome || item.nomeCompleto}
                        </Text>
                      </View>
                      {selectedPaciente?.id === item.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.pacientesList}
                  contentContainerStyle={{ paddingBottom: 10 }}
                />
              ) : (
                <View style={styles.emptyStateModal}>
                  <Ionicons name="person-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyStateTextModal}>
                    {searchPaciente ? 'Nenhum paciente encontrado' : 'Nenhum paciente disponível'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowNovoProntuarioModal(false);
                  setSelectedPaciente(null);
                  setSearchPaciente('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.createButton, !selectedPaciente && styles.createButtonDisabled]}
                onPress={handleCreateProntuario}
                disabled={!selectedPaciente}
              >
                <LinearGradient
                  colors={selectedPaciente ? ['#4CAF50', '#2196F3'] : ['#CCC', '#999']}
                  style={styles.createButtonGradient}
                >
                  <Ionicons name="document-text" size={18} color="white" />
                  <Text style={styles.createButtonText}>Criar Prontuário</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Tab Navigator */}
      <BottomTabNavigator 
        tabs={[
          { name: 'DashboardProfissional', label: 'Início', icon: 'home-outline', iconActive: 'home' },
          { name: 'Consultas', label: 'Consultas', icon: 'calendar-outline', iconActive: 'calendar' },
          { name: 'ProntuariosProfissional', label: 'Prontuários', icon: 'document-text-outline', iconActive: 'document-text' },
          { name: 'PerfilProfissional', label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC', // Fundo claro ao invés de gradiente
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1976D2',
    flex: 1,
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  prontuarioCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  prontuarioCardGradient: {
    padding: 16,
  },
  prontuarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  prontuarioHeaderLeft: {
    flex: 1,
  },
  prontuarioPaciente: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  prontuarioDate: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  prontuarioPreview: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976D2',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  loadingContainerModal: {
    padding: 40,
    alignItems: 'center',
  },
  loadingTextModal: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  pacientesList: {
    maxHeight: 300,
  },
  pacienteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 8,
  },
  pacienteItemSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  pacienteItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  pacienteItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pacienteItemTextSelected: {
    color: '#1976D2',
  },
  emptyStateModal: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTextModal: {
    fontSize: 14,
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  createButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default ProntuariosScreen;

