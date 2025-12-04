import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Dimensions,
  StatusBar,
  TextInput,
  Modal,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { profissionalAPI, getAuthToken, setAuthToken } from '../../services/api';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import { colors } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

interface Consulta {
  id: string;
  idPaciente?: string;
  nomePaciente: string;
  dataConsulta: Date;
  status: 'agendada' | 'confirmada' | 'realizada' | 'cancelada' | 'nao_compareceu';
  observacoes?: string;
}

const ConsultasScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [filteredConsultas, setFilteredConsultas] = useState<Consulta[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | Consulta['status']>('todos');
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);
  const [showObservacoesModal, setShowObservacoesModal] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadConsultas();
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
    filterConsultas();
  }, [consultas, searchQuery, statusFilter]);

  const loadConsultas = async () => {
    setRefreshing(true);
    
    try {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      // Carregar todas as consultas
      const response = await profissionalAPI.getConsultas(1, 100);
      
      console.log('Consultas Response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        const consultasData = response.data?.data || response.data || [];
        
        // Converter dados da API para o formato esperado
        const consultasFormatadas = consultasData.map((c: any) => {
          // A API retorna dataConsulta como Date ou string
          let dataConsulta: Date;
          
          // Tentar diferentes formatos de data
          if (c.dataConsulta && c.dataConsulta instanceof Date) {
            dataConsulta = c.dataConsulta;
          } else if (c.dataConsulta && typeof c.dataConsulta === 'string') {
            dataConsulta = new Date(c.dataConsulta);
          } else if (c.data && c.hora) {
            // Formato: data (YYYY-MM-DD) e hora (HH:MM)
            const dataHoraStr = `${c.data}T${c.hora}:00`;
            dataConsulta = new Date(dataHoraStr);
          } else if (c.data_consulta) {
            // Formato: data_consulta (string ou Timestamp)
            if (typeof c.data_consulta === 'string') {
              dataConsulta = new Date(c.data_consulta);
            } else {
              dataConsulta = new Date();
            }
          } else {
            dataConsulta = new Date();
          }
          
          return {
            id: c.id,
            idPaciente: c.id_paciente || c.idPaciente || '',
            nomePaciente: c.paciente_nome || c.nomePaciente || c.nm_paciente || 'Paciente',
            dataConsulta: dataConsulta,
            status: (c.status || 'agendada').toLowerCase() as Consulta['status'],
            observacoes: c.observacoes || c.obs || '',
          };
        });
        
        console.log('Consultas Formatadas:', consultasFormatadas);
        setConsultas(consultasFormatadas);
      } else {
        console.error('Erro na resposta das consultas:', response);
        Alert.alert('Atenção', 'Não foi possível carregar as consultas. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro ao carregar consultas:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar as consultas. Tente novamente.');
    } finally {
      setRefreshing(false);
    }
  };

  const filterConsultas = () => {
    let filtered = consultas;

    // Filtro por busca
    if (searchQuery) {
      filtered = filtered.filter(consulta =>
        consulta.nomePaciente.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(consulta => consulta.status === statusFilter);
    }

    // Ordenar por data
    filtered.sort((a, b) => new Date(a.dataConsulta).getTime() - new Date(b.dataConsulta).getTime());

    setFilteredConsultas(filtered);
  };

  const getStatusLabel = (status: Consulta['status']) => {
    switch (status) {
      case 'agendada': return 'Agendada';
      case 'confirmada': return 'Confirmada';
      case 'realizada': return 'Realizada';
      case 'cancelada': return 'Cancelada';
      case 'nao_compareceu': return 'Não compareceu';
      default: return status;
    }
  };

  const getStatusColor = (status: Consulta['status']) => {
    switch (status) {
      case 'agendada': return '#2196F3';
      case 'confirmada': return '#2196F3';
      case 'realizada': return '#4CAF50';
      case 'cancelada': return '#F44336';
      case 'nao_compareceu': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: Consulta['status']) => {
    switch (status) {
      case 'agendada': return 'time-outline';
      case 'confirmada': return 'person-outline';
      case 'realizada': return 'checkmark-circle-outline';
      case 'cancelada': return 'close-circle-outline';
      default: return 'time-outline';
    }
  };

  const handleUpdateStatus = async (consultaId: string, novoStatus: 'realizada' | 'cancelada') => {
    try {
      const response = await profissionalAPI.updateStatusConsulta(consultaId, novoStatus);
      
      if (response.success) {
        Alert.alert('Sucesso!', `Consulta marcada como ${novoStatus === 'realizada' ? 'realizada' : 'cancelada'} com sucesso!`);
        await loadConsultas();
      } else {
        Alert.alert('Erro', response.message || 'Não foi possível atualizar o status da consulta.');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', error.message || 'Não foi possível atualizar o status da consulta.');
    }
  };

  const handleSaveObservacoes = async () => {
    if (!selectedConsulta) return;

    try {
      // TODO: Substituir por chamada real da API
      console.log('Salvando observações:', observacoes);
      
      Alert.alert('Sucesso!', 'Observações salvas com sucesso!');
      setShowObservacoesModal(false);
      setSelectedConsulta(null);
      setObservacoes('');
      await loadConsultas();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as observações.');
    }
  };

  const FilterButton = ({ status, label }: { status: 'todos' | Consulta['status'], label: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        statusFilter === status && styles.filterButtonActive
      ]}
      onPress={() => setStatusFilter(status)}
    >
      <Text style={[
        styles.filterButtonText,
        statusFilter === status && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ConsultaItem = ({ consulta }: { consulta: Consulta }) => (
    <LinearGradient
      colors={['#E3F2FD', '#FFFFFF']}
      style={styles.consultaItem}
    >
      <View style={styles.consultaHeader}>
        <View style={styles.consultaInfo}>
          <Text style={styles.consultaPaciente}>{consulta.nomePaciente}</Text>
          <View style={styles.consultaDetails}>
            <View style={styles.consultaDetail}>
              <Ionicons name="calendar-outline" size={12} color="#2196F3" />
              <Text style={styles.consultaDetailText}>
                {new Date(consulta.dataConsulta).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <View style={styles.consultaDetail}>
              <Ionicons name="time-outline" size={12} color="#2196F3" />
              <Text style={styles.consultaDetailText}>
                {new Date(consulta.dataConsulta).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(consulta.status) }]}>
          <Ionicons name={getStatusIcon(consulta.status)} size={10} color="white" />
          <Text style={styles.statusText}>{getStatusLabel(consulta.status)}</Text>
        </View>
      </View>

      {consulta.observacoes && (
        <Text style={styles.observacoesPreview} numberOfLines={2}>
          {consulta.observacoes}
        </Text>
      )}

      <View style={styles.consultaActions}>
        {(consulta.status === 'agendada' || consulta.status === 'confirmada') && (
          <>
            <TouchableOpacity 
              style={styles.successButton}
              onPress={() => handleUpdateStatus(consulta.id, 'realizada')}
            >
              <Text style={styles.successButtonText}>Realizada</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButtonAction}
              onPress={() => handleUpdateStatus(consulta.id, 'cancelada')}
            >
              <Text style={styles.cancelButtonActionText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => {
            setSelectedConsulta(consulta);
            setObservacoes(consulta.observacoes || '');
            setShowObservacoesModal(true);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const ObservacoesModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showObservacoesModal}
      onRequestClose={() => setShowObservacoesModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gerenciar Consulta</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowObservacoesModal(false);
                setSelectedConsulta(null);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.modalPatientInfo}>
              <View style={styles.modalPatientHeader}>
                <Ionicons name="person" size={24} color="#2196F3" />
                <Text style={styles.modalSubtitle}>
                  {selectedConsulta?.nomePaciente}
                </Text>
              </View>
              {selectedConsulta && (
                <View style={styles.modalPatientDetails}>
                  <View style={styles.modalDetailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.modalDetailText}>
                      {new Date(selectedConsulta.dataConsulta).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.modalDetailText}>
                      {new Date(selectedConsulta.dataConsulta).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalActionsGrid}>
              {selectedConsulta?.idPaciente && (
                <TouchableOpacity 
                  style={styles.modalActionCard}
                  onPress={() => {
                    setShowObservacoesModal(false);
                    navigation.navigate('ProntuarioProfissional', { 
                      idPaciente: selectedConsulta.idPaciente, 
                      nomePaciente: selectedConsulta.nomePaciente 
                    });
                  }}
                >
                  <LinearGradient
                    colors={['#E3F2FD', '#FFFFFF']}
                    style={styles.modalActionGradient}
                  >
                    <Ionicons name="document-text" size={24} color="#2196F3" />
                    <Text style={styles.modalActionText}>Prontuário</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.modalActionCard}
                onPress={() => {
                  // Modal já está aberto, apenas manter aberto
                }}
              >
                <LinearGradient
                  colors={['#E3F2FD', '#FFFFFF']}
                  style={styles.modalActionGradient}
                >
                  <Ionicons name="create" size={24} color="#2196F3" />
                  <Text style={styles.modalActionText}>Observações</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Observações da Consulta</Text>
              <TextInput
                style={styles.observacoesInput}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Digite suas observações sobre a consulta..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowObservacoesModal(false);
                setSelectedConsulta(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Fechar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveObservacoes}
            >
              <LinearGradient
                colors={['#4CAF50', '#2196F3']}
                style={styles.saveButtonGradient}
              >
                <Ionicons name="save-outline" size={18} color="white" />
                <Text style={styles.saveButtonText}>Salvar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9FC" />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 75 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadConsultas} />
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
            <Text style={styles.title}>Minhas Consultas</Text>
          </View>

          {/* Barra de Pesquisa */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#2196F3" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar paciente..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#CCC" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filtros de Status */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
            <View style={styles.filters}>
              <FilterButton status="todos" label="Todas" />
              <FilterButton status="agendada" label="Agendadas" />
              <FilterButton status="realizada" label="Realizadas" />
              <FilterButton status="cancelada" label="Canceladas" />
              <FilterButton status="nao_compareceu" label="Não Compareceu" />
            </View>
          </ScrollView>

          {/* Lista de Consultas */}
          <View style={styles.consultasList}>
            {filteredConsultas.length > 0 ? (
              filteredConsultas.map((consulta) => (
                <ConsultaItem key={consulta.id} consulta={consulta} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#CCC" />
                <Text style={styles.emptyStateText}>
                  {searchQuery || statusFilter !== 'todos' 
                    ? 'Nenhuma consulta encontrada' 
                    : 'Nenhuma consulta agendada'
                  }
                </Text>
                {(searchQuery || statusFilter !== 'todos') && (
                  <TouchableOpacity 
                    style={styles.emptyStateButton}
                    onPress={() => {
                      setSearchQuery('');
                      setStatusFilter('todos');
                    }}
                  >
                    <Text style={styles.emptyStateButtonText}>Limpar Filtros</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <ObservacoesModal />

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
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1976D2',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 5,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  consultasList: {
    flex: 1,
  },
  consultaItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  consultaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  consultaInfo: {
    flex: 1,
  },
  consultaPaciente: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  consultaDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  consultaDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultaDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  observacoesPreview: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  consultaActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  primaryActionButtonText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '700',
  },
  successButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
  },
  successButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButtonAction: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
  },
  cancelButtonActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 16,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalPatientInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalPatientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    flex: 1,
  },
  modalPatientDetails: {
    gap: 8,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#666',
  },
  modalActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modalActionCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalActionGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  modalActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 8,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  observacoesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default ConsultasScreen;