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
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pacienteAPI, buscaAPI, getAuthToken, setAuthToken } from '../../services/api';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import { colors } from '../../constants/colors';
// Usar localStorage do React Native ou criar um wrapper
// Por enquanto, vamos usar uma solução temporária
const AsyncStorage = {
  getItem: async (key: string) => {
    // Implementação temporária - você pode usar expo-secure-store ou outra solução
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {
      // Ignorar
    }
    return null;
  },
  setItem: async (key: string, value: string) => {
    // Implementação temporária
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Ignorar
    }
  },
};

const { width, height } = Dimensions.get('window');

interface Appointment {
  id: string;
  professional: string;
  specialty: string;
  date: string;
  time: string;
  clinic: string;
  status: 'completed' | 'cancelled' | 'scheduled' | 'agendada' | 'realizada' | 'cancelada';
  rating?: number;
  observacoes?: string;
  dataConsulta?: Date | string;
}

const HistoricoScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled' | 'scheduled'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelMotivoCustom, setCancelMotivoCustom] = useState('');
  const [profissionalDetails, setProfissionalDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showMotivoPicker, setShowMotivoPicker] = useState(false);

  const motivosCancelamento = [
    { label: 'Doença', value: 'Doença' },
    { label: 'Conflito de horário', value: 'Conflito de horário' },
    { label: 'Problemas de transporte', value: 'Problemas de transporte' },
    { label: 'Outro', value: 'Outro' },
  ];
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadAppointments();
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

  const loadAppointments = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setRefreshing(true);
        setLoading(true);
      }

      let token = getAuthToken();
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
        if (token) setAuthToken(token);
      }

      const response = await pacienteAPI.getConsultas(pageNum, 20);
      
      if (response.success && response.data) {
        const consultas = Array.isArray(response.data) ? response.data : [];
        
        const mappedAppointments: Appointment[] = consultas.map((consulta: any) => {
          // Formatar data
          let dataConsulta: Date;
          if (consulta.dataConsulta) {
            if (consulta.dataConsulta instanceof Date) {
              dataConsulta = consulta.dataConsulta;
            } else if (typeof consulta.dataConsulta === 'string') {
              dataConsulta = new Date(consulta.dataConsulta);
            } else if (consulta.dataConsulta.toDate) {
              dataConsulta = consulta.dataConsulta.toDate();
            } else {
              dataConsulta = new Date(consulta.dataConsulta);
            }
          } else {
            dataConsulta = new Date();
          }

          // Mapear status
          let status: 'completed' | 'cancelled' | 'scheduled' = 'scheduled';
          const statusLower = String(consulta.status || '').toLowerCase();
          if (statusLower === 'realizada' || statusLower === 'completed') {
            status = 'completed';
          } else if (statusLower === 'cancelada' || statusLower === 'cancelled') {
            status = 'cancelled';
          } else {
            status = 'scheduled';
          }

          // Formatar data e hora
          const dateStr = dataConsulta.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          const timeStr = dataConsulta.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });

          return {
            id: consulta.id || '',
            professional: consulta.nomeProfissional || consulta.nm_profissional || 'Profissional',
            specialty: consulta.especialidade || 'Geral',
            date: dateStr,
            time: timeStr,
            clinic: consulta.nomeClinica || consulta.nm_clinica || 'Clínica',
            status: status,
            observacoes: consulta.observacoes || consulta.obs || '',
            dataConsulta: dataConsulta,
          };
        });

        if (append) {
          setAppointments(prev => [...prev, ...mappedAppointments]);
        } else {
          setAppointments(mappedAppointments);
        }

        // Verificar se há mais páginas
        if (response.pagination) {
          setHasMore(pageNum < response.pagination.totalPages);
        } else {
          setHasMore(consultas.length === 20);
        }
      } else {
        if (!append) {
          setAppointments([]);
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar consultas:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar as consultas. Tente novamente.');
      if (!append) {
        setAppointments([]);
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelMotivo('');
    setCancelMotivoCustom('');
    setShowCancelModal(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    // Validar motivo
    let motivoFinal = '';
    if (cancelMotivo === 'Outro') {
      motivoFinal = cancelMotivoCustom.trim();
      if (!motivoFinal) {
        Alert.alert('Atenção', 'Por favor, descreva o motivo do cancelamento.');
        return;
      }
    } else if (cancelMotivo) {
      motivoFinal = cancelMotivo;
    } else {
      Alert.alert('Atenção', 'Por favor, selecione o motivo do cancelamento.');
      return;
    }

    try {
      const response = await pacienteAPI.cancelarConsulta(selectedAppointment.id, motivoFinal);
      if (response.success) {
        Alert.alert('Sucesso', 'Consulta cancelada com sucesso!');
        setShowCancelModal(false);
        setSelectedAppointment(null);
        // Recarregar consultas
        loadAppointments(1, false);
      } else {
        Alert.alert('Erro', 'Não foi possível cancelar a consulta.');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível cancelar a consulta.');
    }
  };

  const handleViewDetails = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setLoadingDetails(true);
    setShowDetailsModal(true);

    try {
      // Buscar detalhes da consulta
      const consultaResponse = await pacienteAPI.getConsultaDetalhes(appointment.id);
      
      // Buscar informações do profissional
      let profissionalId = '';
      if (consultaResponse.success && consultaResponse.data) {
        profissionalId = consultaResponse.data.idProfissional || consultaResponse.data.id_profissional || '';
      }

      if (profissionalId) {
        // Buscar dados do profissional
        try {
          const profissionaisResponse = await buscaAPI.getProfissionais();
          if (profissionaisResponse.success && profissionaisResponse.data) {
            const profissional = profissionaisResponse.data.find((p: any) => p.id === profissionalId);
            if (profissional) {
              setProfissionalDetails(profissional);
            }
          }
        } catch (error) {
          console.warn('Erro ao buscar dados do profissional:', error);
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar detalhes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes da consulta.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'all') return true;
    if (filter === 'completed') {
      return appointment.status === 'completed' || appointment.status === 'realizada';
    }
    if (filter === 'cancelled') {
      return appointment.status === 'cancelled' || appointment.status === 'cancelada';
    }
    if (filter === 'scheduled') {
      return appointment.status === 'scheduled' || appointment.status === 'agendada';
    }
    return appointment.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      case 'scheduled': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluída';
      case 'cancelled': return 'Cancelada';
      case 'scheduled': return 'Agendada';
      default: return status;
    }
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <TouchableOpacity
      onPress={() => handleViewDetails(appointment)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#E3F2FD', '#FFFFFF']}
        style={styles.appointmentCard}
      >
      <View style={styles.appointmentHeader}>
        <View>
          <Text style={styles.appointmentProfessional}>{appointment.professional}</Text>
          <Text style={styles.appointmentSpecialty}>{appointment.specialty}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.appointmentDetail}>
          <Ionicons name="calendar" size={16} color="#2196F3" />
          <Text style={styles.appointmentDetailText}>{appointment.date}</Text>
        </View>
        <View style={styles.appointmentDetail}>
          <Ionicons name="time" size={16} color="#2196F3" />
          <Text style={styles.appointmentDetailText}>{appointment.time}</Text>
        </View>
        {appointment.clinic && appointment.clinic !== 'Clínica' && (
          <View style={styles.appointmentDetail}>
            <Ionicons name="business" size={16} color="#2196F3" />
            <Text style={styles.appointmentDetailText}>{appointment.clinic}</Text>
          </View>
        )}
      </View>

      <View style={styles.appointmentActions}>
        {appointment.status === 'scheduled' && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={(e) => {
              e.stopPropagation();
              handleCancelClick(appointment);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
    </TouchableOpacity>
  );

  const FilterButton = ({ title, value, isActive }: any) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9FC" />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 75 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadAppointments} />
        }
      >
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.header}>
            <Text style={styles.title}>Histórico de Consultas</Text>
          </View>

          {/* Filtros */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filters}>
              <FilterButton title="Todas" value="all" isActive={filter === 'all'} />
              <FilterButton title="Agendadas" value="scheduled" isActive={filter === 'scheduled'} />
              <FilterButton title="Concluídas" value="completed" isActive={filter === 'completed'} />
              <FilterButton title="Canceladas" value="cancelled" isActive={filter === 'cancelled'} />
            </View>
          </ScrollView>

          {/* Lista de Consultas */}
          <View style={styles.appointmentsList}>
            {loading && appointments.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Carregando consultas...</Text>
              </View>
            ) : filteredAppointments.length > 0 ? (
              <>
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
                {hasMore && !loading && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => {
                      const nextPage = page + 1;
                      setPage(nextPage);
                      loadAppointments(nextPage, true);
                    }}
                  >
                    <Text style={styles.loadMoreButtonText}>Carregar mais</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time" size={48} color="#CCC" />
                <Text style={styles.emptyStateText}>
                  {refreshing ? 'Carregando...' : 'Nenhuma consulta encontrada'}
                </Text>
                {!refreshing && (
                  <TouchableOpacity 
                    style={styles.emptyStateButton}
                    onPress={() => navigation.navigate('Agendamento')}
                  >
                    <Text style={styles.emptyStateButtonText}>Agendar Consulta</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal de Cancelamento */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancelar Consulta</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Por favor, informe o motivo do cancelamento:
            </Text>

            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Motivo do Cancelamento</Text>
              <TouchableOpacity
                style={styles.pickerWrapper}
                onPress={() => setShowMotivoPicker(true)}
              >
                <Text style={[styles.pickerText, !cancelMotivo && styles.pickerPlaceholder]}>
                  {cancelMotivo || 'Selecione o motivo'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal de seleção de motivo */}
            <Modal
              visible={showMotivoPicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowMotivoPicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Selecione o motivo</Text>
                    <TouchableOpacity onPress={() => setShowMotivoPicker(false)}>
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={motivosCancelamento}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.motivoOption}
                        onPress={() => {
                          setCancelMotivo(item.value);
                          if (item.value !== 'Outro') {
                            setCancelMotivoCustom('');
                          }
                          setShowMotivoPicker(false);
                        }}
                      >
                        <Text style={styles.motivoOptionText}>{item.label}</Text>
                        {cancelMotivo === item.value && (
                          <Ionicons name="checkmark" size={20} color="#2196F3" />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>

            {cancelMotivo === 'Outro' && (
              <View style={styles.textAreaContainer}>
                <Text style={styles.label}>Descreva o motivo</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Descreva o motivo do cancelamento..."
                  placeholderTextColor="#888"
                  value={cancelMotivoCustom}
                  onChangeText={setCancelMotivoCustom}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleCancelAppointment}
              >
                <Text style={styles.confirmModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
          setProfissionalDetails(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Consulta</Text>
              <TouchableOpacity onPress={() => {
                setShowDetailsModal(false);
                setSelectedAppointment(null);
                setProfissionalDetails(null);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsScroll}>
              {loadingDetails ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.loadingText}>Carregando detalhes...</Text>
                </View>
              ) : selectedAppointment ? (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Informações da Consulta</Text>
                    
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={20} color="#2196F3" />
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Profissional</Text>
                        <Text style={styles.detailValue}>{selectedAppointment.professional}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="medical" size={20} color="#2196F3" />
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Especialidade</Text>
                        <Text style={styles.detailValue}>{selectedAppointment.specialty}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={20} color="#2196F3" />
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Data</Text>
                        <Text style={styles.detailValue}>{selectedAppointment.date}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={20} color="#2196F3" />
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Horário</Text>
                        <Text style={styles.detailValue}>{selectedAppointment.time}</Text>
                      </View>
                    </View>

                    {selectedAppointment.clinic && selectedAppointment.clinic !== 'Clínica' && (
                      <View style={styles.detailRow}>
                        <Ionicons name="business" size={20} color="#2196F3" />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailLabel}>Clínica</Text>
                          <Text style={styles.detailValue}>{selectedAppointment.clinic}</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Ionicons name="information-circle" size={20} color="#2196F3" />
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAppointment.status) }]}>
                          <Text style={styles.statusText}>{getStatusText(selectedAppointment.status)}</Text>
                        </View>
                      </View>
                    </View>

                    {selectedAppointment.observacoes && (
                      <View style={styles.detailRow}>
                        <Ionicons name="document-text" size={20} color="#2196F3" />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailLabel}>Observações</Text>
                          <Text style={styles.detailValue}>{selectedAppointment.observacoes}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {profissionalDetails && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Informações do Profissional</Text>
                      
                      {profissionalDetails.telefone && (
                        <View style={styles.detailRow}>
                          <Ionicons name="call" size={20} color="#2196F3" />
                          <View style={styles.detailRowContent}>
                            <Text style={styles.detailLabel}>Telefone</Text>
                            <Text style={styles.detailValue}>{profissionalDetails.telefone}</Text>
                          </View>
                        </View>
                      )}

                      {profissionalDetails.email && (
                        <View style={styles.detailRow}>
                          <Ionicons name="mail" size={20} color="#2196F3" />
                          <View style={styles.detailRowContent}>
                            <Text style={styles.detailLabel}>Email</Text>
                            <Text style={styles.detailValue}>{profissionalDetails.email}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeModalButton]}
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedAppointment(null);
                  setProfissionalDetails(null);
                }}
              >
                <Text style={styles.closeModalButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Tab Navigator */}
      <BottomTabNavigator 
        tabs={[
          { name: 'DashboardPaciente', label: 'Início', icon: 'home-outline', iconActive: 'home' },
          { name: 'Agendamento', label: 'Agendar', icon: 'calendar-outline', iconActive: 'calendar' },
          { name: 'Historico', label: 'Histórico', icon: 'time-outline', iconActive: 'time' },
          { name: 'PerfilPaciente', label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
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
  filters: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingVertical: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  appointmentsList: {
    flex: 1,
  },
  appointmentCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  appointmentProfessional: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
  },
  appointmentSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 15,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  appointmentDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 15,
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
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 15,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  loadMoreButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loadMoreButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos dos modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976D2',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  pickerText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#888',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '60%',
    padding: 20,
  },
  motivoOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  motivoOptionText: {
    fontSize: 16,
    color: '#333',
  },
  textAreaContainer: {
    marginBottom: 15,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmModalButton: {
    backgroundColor: '#F44336',
  },
  confirmModalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  closeModalButton: {
    backgroundColor: '#2196F3',
  },
  closeModalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsScroll: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  detailRowContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default HistoricoScreen;