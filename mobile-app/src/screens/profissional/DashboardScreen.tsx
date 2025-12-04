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
  Modal,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { profissionalAPI, setAuthToken, getAuthToken } from '../../services/api';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import { colors } from '../../constants/colors';
// Usar a mesma implementação de AsyncStorage que os outros arquivos
const AsyncStorage = {
  getItem: async (key: string) => {
    // Implementação temporária - você pode usar expo-secure-store ou outra solução
    try {
      // Tentar usar localStorage se disponível (web)
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

interface Consulta {
  id: string;
  idPaciente?: string;
  nomePaciente: string;
  dataConsulta: Date;
  status: 'agendada' | 'confirmada' | 'realizada' | 'cancelada' | 'nao_compareceu';
  observacoes?: string;
}


const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [todasConsultas, setTodasConsultas] = useState<Consulta[]>([]); // Todas as consultas para calcular stats
  const [stats, setStats] = useState<{
    total: number;
    agendadas: number;
    confirmadas: number;
    realizadas: number;
    canceladas: number;
  }>({
    total: 0,
    agendadas: 0,
    confirmadas: 0,
    realizadas: 0,
    canceladas: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusConsulta, setStatusConsulta] = useState<Consulta['status']>('agendada');
  const [filter, setFilter] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('hoje');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    setRefreshing(true);
    
    try {
      // Obter token (já está sendo gerenciado pelo serviço de API)
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      // Carregar dashboard do profissional
      const dashboardResponse = await profissionalAPI.getDashboard();
      
      console.log('Dashboard Response:', JSON.stringify(dashboardResponse, null, 2));
      
      if (dashboardResponse.success) {
        const { consultasHoje, stats: statsData } = dashboardResponse.data || {};
        
        console.log('Consultas Hoje:', consultasHoje);
        console.log('Stats:', statsData);
        
        // Carregar TODAS as consultas primeiro para calcular stats corretamente
        try {
          const todasConsultasResponse = await profissionalAPI.getConsultas(1, 1000);
          console.log('📊 Resposta getConsultas:', todasConsultasResponse);
          
          if (todasConsultasResponse.success && todasConsultasResponse.data?.consultas) {
            const todasFormatadas = (todasConsultasResponse.data.consultas || []).map((c: any) => {
              let dataConsulta: Date;
              if (c.dataConsulta && c.dataConsulta instanceof Date) {
                dataConsulta = c.dataConsulta;
              } else if (c.dataConsulta && typeof c.dataConsulta === 'string') {
                dataConsulta = new Date(c.dataConsulta);
              } else if (c.data && c.hora) {
                const dataHoraStr = `${c.data}T${c.hora}:00`;
                dataConsulta = new Date(dataHoraStr);
              } else {
                dataConsulta = new Date();
              }
              
              // Normalizar status para minúsculas
              const statusNormalizado = (c.status || 'agendada').toLowerCase().trim();
              
              return {
                id: c.id,
                idPaciente: c.id_paciente || c.idPaciente || '',
                nomePaciente: c.paciente_nome || c.nomePaciente || c.nm_paciente || 'Paciente',
                dataConsulta: dataConsulta,
                status: statusNormalizado as Consulta['status'],
                observacoes: c.observacoes || c.obs || '',
              };
            });
            
            console.log('📊 Total de consultas formatadas:', todasFormatadas.length);
            console.log('📊 Status encontrados:', todasFormatadas.map(c => c.status));
            
            setTodasConsultas(todasFormatadas);
            
            // Calcular stats a partir de todas as consultas
            const statsCalculados = {
              total: todasFormatadas.length,
              agendadas: todasFormatadas.filter(c => c.status === 'agendada').length,
              confirmadas: todasFormatadas.filter(c => c.status === 'confirmada').length,
              realizadas: todasFormatadas.filter(c => c.status === 'realizada').length,
              canceladas: todasFormatadas.filter(c => c.status === 'cancelada').length,
            };
            
            console.log('📊 Stats calculados localmente:', statsCalculados);
            setStats(statsCalculados);
          } else {
            // Fallback: usar stats da API se disponível
            if (statsData) {
              const totalValue = Number(statsData.total) || 0;
              const agendadasValue = Number(statsData.agendadas) || 0;
              const confirmadasValue = Number(statsData.confirmadas) || 0;
              const realizadasValue = Number(statsData.realizadas) || 0;
              const canceladasValue = Number(statsData.canceladas) || 0;
              
              console.log('📊 Stats da API (fallback):', {
                total: totalValue,
                agendadas: agendadasValue,
                confirmadas: confirmadasValue,
                realizadas: realizadasValue,
                canceladas: canceladasValue,
              });
              
              setStats({
                total: totalValue,
                agendadas: agendadasValue,
                confirmadas: confirmadasValue,
                realizadas: realizadasValue,
                canceladas: canceladasValue,
              });
            }
          }
        } catch (error) {
          console.error('❌ Erro ao carregar todas as consultas:', error);
          // Se falhar, tentar usar stats da API
          if (statsData) {
            setStats({
              total: Number(statsData.total) || 0,
              agendadas: Number(statsData.agendadas) || 0,
              confirmadas: Number(statsData.confirmadas) || 0,
              realizadas: Number(statsData.realizadas) || 0,
              canceladas: Number(statsData.canceladas) || 0,
            });
          }
        }
        
        // Converter dados da API para o formato esperado (consultas de hoje)
        const consultasFormatadas = (consultasHoje || []).map((c: any) => {
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
            status: (c.status || 'agendada').toLowerCase().trim() as Consulta['status'],
            observacoes: c.observacoes || c.obs || '',
          };
        });
        
        console.log('Consultas Hoje Formatadas:', consultasFormatadas);
        setConsultas(consultasFormatadas);
      } else {
        console.error('Erro na resposta do dashboard:', dashboardResponse);
        Alert.alert('Atenção', 'Não foi possível carregar as consultas. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar os dados. Tente novamente.');
    } finally {
      setRefreshing(false);
    }
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

  const handleUpdateStatus = async (consultaId?: string, novoStatus?: Consulta['status']) => {
    const id = consultaId || selectedConsulta?.id;
    const status = novoStatus || statusConsulta;
    
    if (!id || !status) return;

    try {
      const response = await profissionalAPI.updateStatusConsulta(id, status);
      if (response.success) {
        Alert.alert('Sucesso!', 'Status atualizado com sucesso!');
        setShowStatusModal(false);
        setSelectedConsulta(null);
        await loadData();
      } else {
        Alert.alert('Erro', response.message || 'Não foi possível atualizar o status.');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível atualizar o status.');
    }
  };

  const consultasHoje = consultas.filter(c => {
    const data = new Date(c.dataConsulta);
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString();
  });

  // Usar stats da API para contadores (todas as consultas, não apenas as de hoje)
  const consultasPendentes = (stats?.agendadas || 0) + (stats?.confirmadas || 0);
  const consultasRealizadas = stats?.realizadas || 0;
  
  console.log('Stats calculados:', {
    agendadas: stats?.agendadas,
    confirmadas: stats?.confirmadas,
    realizadas: stats?.realizadas,
    pendentes: consultasPendentes,
    realizadasCount: consultasRealizadas
  });

  const StatCard = ({ title, value, icon, color }: any) => {
    const numericValue = Number(value) || 0;
    return (
      <LinearGradient
        colors={['#FFFFFF', '#F5F9FC']}
        style={styles.statCard}
      >
        <View style={styles.statCardTop}>
          <View style={[styles.statIcon, { backgroundColor: color }]}>
            <Ionicons name={icon} size={18} color="white" />
          </View>
          <Text style={styles.statValue}>{numericValue}</Text>
        </View>
        <Text style={styles.statTitle} numberOfLines={2}>{title}</Text>
      </LinearGradient>
    );
  };

  const ConsultaCard = ({ consulta }: { consulta: Consulta }) => (
    <LinearGradient
      colors={['#E3F2FD', '#FFFFFF']}
      style={styles.consultaCard}
    >
      <View style={styles.consultaHeader}>
        <View style={styles.consultaHeaderLeft}>
          <Text style={styles.consultaPaciente}>{consulta.nomePaciente}</Text>
          <View style={styles.consultaDetails}>
            <View style={styles.consultaDetail}>
              <Ionicons name="calendar-outline" size={14} color="#2196F3" />
              <Text style={styles.consultaDetailText}>
                {new Date(consulta.dataConsulta).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <View style={styles.consultaDetail}>
              <Ionicons name="time-outline" size={14} color="#2196F3" />
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
          <Ionicons name={getStatusIcon(consulta.status)} size={12} color="white" />
          <Text style={styles.statusText}>{getStatusLabel(consulta.status)}</Text>
        </View>
      </View>

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
            setStatusConsulta(consulta.status);
            setShowStatusModal(true);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const StatusModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showStatusModal}
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Atualizar Status</Text>
            <TouchableOpacity 
              onPress={() => setShowStatusModal(false)}
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
                    setShowStatusModal(false);
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
                  // TODO: Implementar modal de observações
                  Alert.alert('Observações', 'Funcionalidade em desenvolvimento');
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
              <Text style={styles.label}>Alterar Status da Consulta</Text>
              <View style={styles.statusOptions}>
                {(['agendada', 'realizada', 'cancelada', 'nao_compareceu'] as Consulta['status'][]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      statusConsulta === status && styles.statusOptionSelected
                    ]}
                    onPress={() => setStatusConsulta(status)}
                  >
                    <Ionicons 
                      name={getStatusIcon(status)} 
                      size={20} 
                      color={statusConsulta === status ? 'white' : getStatusColor(status)} 
                    />
                    <Text style={[
                      styles.statusOptionText,
                      statusConsulta === status && styles.statusOptionTextSelected
                    ]}>
                      {getStatusLabel(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowStatusModal(false);
                setSelectedConsulta(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Fechar</Text>
            </TouchableOpacity>
            
            {statusConsulta !== selectedConsulta?.status && (
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => handleUpdateStatus()}
              >
                <LinearGradient
                  colors={['#4CAF50', '#2196F3']}
                  style={styles.saveButtonGradient}
                >
                  <Ionicons name="save-outline" size={18} color="white" />
                  <Text style={styles.saveButtonText}>Salvar Status</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
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
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
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
            <View>
              <Text style={styles.greeting}>Dashboard Profissional</Text>
              <Text style={styles.subtitle}>Bem-vindo de volta!</Text>
            </View>
          </View>

          {/* Estatísticas */}
          <View style={styles.statsGrid}>
            <StatCard
              title="Consultas Hoje"
              value={consultasHoje.length}
              icon="calendar"
              color="#4CAF50"
            />
            <StatCard
              title="Pendentes"
              value={consultasPendentes}
              icon="time"
              color="#2196F3"
            />
            <StatCard
              title="Realizadas"
              value={consultasRealizadas}
              icon="checkmark-circle"
              color="#4CAF50"
            />
          </View>

          {/* Botão Marcar Consulta */}
          <TouchableOpacity
            style={styles.marcarConsultaButton}
            onPress={() => navigation.navigate('NovaConsultaProfissional')}
          >
            <LinearGradient
              colors={['#4CAF50', '#2196F3']}
              style={styles.marcarConsultaButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="calendar" size={24} color="white" />
              <Text style={styles.marcarConsultaButtonText}>Marcar Consulta</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Consultas do Dia */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Consultas de Hoje</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Consultas')}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {consultasHoje.length > 0 ? (
              consultasHoje.map((consulta, index) => (
                <ConsultaCard key={consulta.id} consulta={consulta} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#CCC" />
                <Text style={styles.emptyStateText}>Nenhuma consulta hoje</Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('Consultas')}
                >
                  <Text style={styles.emptyStateButtonText}>Ver Agenda Completa</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      <StatusModal />

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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1976D2',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  marcarConsultaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 25,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  marcarConsultaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  marcarConsultaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  consultaCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
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
    marginBottom: 12,
  },
  consultaHeaderLeft: {
    flex: 1,
  },
  consultaPaciente: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  consultaDetails: {
    marginBottom: 12,
  },
  consultaDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  consultaDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  consultaActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 12,
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
    maxHeight: '70%',
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
    marginBottom: 12,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    minWidth: '48%',
  },
  statusOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  statusOptionTextSelected: {
    color: 'white',
  },
  statusDescription: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    gap: 8,
  },
  statusDescriptionText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16,
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

export default DashboardScreen;