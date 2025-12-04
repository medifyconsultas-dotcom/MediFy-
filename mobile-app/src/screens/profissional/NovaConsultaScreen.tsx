import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { profissionalAPI, getAuthToken, setAuthToken } from '../../services/api';
import { colors } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

const NovaConsultaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [searchPaciente, setSearchPaciente] = useState('');
  const [showPacientesList, setShowPacientesList] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [dataConsulta, setDataConsulta] = useState('');
  const [horaConsulta, setHoraConsulta] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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
    loadPacientes();
  }, []);

  useEffect(() => {
    if (dataConsulta) {
      loadHorariosDisponiveis();
    } else {
      setHorariosDisponiveis([]);
      setHorariosOcupados([]);
    }
  }, [dataConsulta]);

  const loadPacientes = async () => {
    setLoadingPacientes(true);
    try {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      const response = await profissionalAPI.getPacientes();
      
      if (response.success) {
        setPacientes(response.data || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar pacientes:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar os pacientes.');
    } finally {
      setLoadingPacientes(false);
    }
  };

  const loadHorariosDisponiveis = async () => {
    if (!dataConsulta) return;

    setLoadingHorarios(true);
    try {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      const response = await profissionalAPI.getHorariosDisponiveis(dataConsulta);
      
      if (response.success && response.data) {
        setHorariosDisponiveis(response.data.disponiveis || []);
        setHorariosOcupados(response.data.ocupados || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar horários disponíveis:', error);
      setHorariosDisponiveis([]);
      setHorariosOcupados([]);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const handleCreateConsulta = async () => {
    if (!selectedPaciente) {
      Alert.alert('Atenção', 'Selecione um paciente');
      return;
    }

    if (!dataConsulta) {
      Alert.alert('Atenção', 'Selecione a data da consulta');
      return;
    }

    if (!horaConsulta) {
      Alert.alert('Atenção', 'Selecione a hora da consulta');
      return;
    }

    // Validar se a data não é no passado
    const dataSelecionada = new Date(dataConsulta);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataSelecionada < hoje) {
      Alert.alert('Erro', 'Não é possível agendar consultas no passado');
      return;
    }

    // Validar se o horário está disponível
    if (!horariosDisponiveis.includes(horaConsulta)) {
      Alert.alert('Erro', 'Este horário não está disponível');
      return;
    }

    if (horariosOcupados.includes(horaConsulta)) {
      Alert.alert('Erro', 'Este horário já está ocupado');
      return;
    }

    setLoading(true);
    try {
      await profissionalAPI.createConsulta({
        idPaciente: selectedPaciente.id,
        dataConsulta: dataConsulta,
        horaConsulta: horaConsulta,
        status: 'agendada',
        observacoes: observacoes,
      });

      Alert.alert('Sucesso', 'Consulta criada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Erro ao criar consulta:', error);
      Alert.alert('Erro', error.message || 'Não foi possível criar a consulta.');
    } finally {
      setLoading(false);
    }
  };

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome?.toLowerCase().includes(searchPaciente.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchPaciente.toLowerCase())
  );

  const hoje = new Date().toISOString().split('T')[0];

  // Funções auxiliares para o calendário
  const getCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Primeiro dia do mês
    const firstDay = new Date(year, monthIndex, 1);
    const firstDayWeek = firstDay.getDay();
    
    // Último dia do mês
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    // Preencher dias vazios do início
    for (let i = 0; i < firstDayWeek; i++) {
      days.push(null);
    }
    
    // Adicionar todos os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, monthIndex, day));
    }
    
    return days;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9FC" />

      <Animated.View style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <LinearGradient
          colors={['#4CAF50', '#2196F3']}
          style={styles.headerIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="calendar" size={28} color="white" />
        </LinearGradient>
        <Text style={styles.headerTitle}>Nova Consulta</Text>
        <Text style={styles.headerSubtitle}>Agendar consulta para um paciente</Text>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[
          styles.form,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Paciente *</Text>
            <TouchableOpacity
              style={styles.searchWrapper}
              onPress={() => setShowPacientesList(true)}
            >
              <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
              <Text style={[styles.input, !selectedPaciente && styles.placeholder]}>
                {selectedPaciente ? selectedPaciente.nome : 'Clique para selecionar paciente...'}
              </Text>
              {selectedPaciente && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPaciente(null);
                    setSearchPaciente('');
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Data *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowCalendar(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={[styles.dateInputText, !dataConsulta && styles.placeholder]}>
                {dataConsulta 
                  ? new Date(dataConsulta + 'T00:00:00').toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : 'Selecione uma data'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Hora *</Text>
            {loadingHorarios ? (
              <View style={styles.horariosLoading}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.horariosLoadingText}>Carregando horários...</Text>
              </View>
            ) : horariosDisponiveis.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.horariosContainer}
                contentContainerStyle={styles.horariosContentContainer}
              >
                {horariosDisponiveis.map((hora) => {
                  const isOcupado = horariosOcupados.includes(hora);
                  const isSelected = horaConsulta === hora;
                  return (
                    <TouchableOpacity
                      key={hora}
                      style={[
                        styles.horarioButton,
                        isSelected && styles.horarioButtonSelected,
                        isOcupado && styles.horarioButtonOcupado,
                      ]}
                      onPress={() => !isOcupado && setHoraConsulta(hora)}
                      disabled={isOcupado}
                    >
                      <Text style={[
                        styles.horarioButtonText,
                        isSelected && styles.horarioButtonTextSelected,
                        isOcupado && styles.horarioButtonTextOcupado,
                      ]}>
                        {hora}
                        {isOcupado && ' (Ocupado)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : dataConsulta ? (
              <View style={styles.horariosEmpty}>
                <Text style={styles.horariosEmptyText}>Nenhum horário disponível para esta data</Text>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={horaConsulta}
                onChangeText={setHoraConsulta}
                placeholder="Selecione uma data primeiro"
                placeholderTextColor="#999"
                editable={false}
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Observações sobre a consulta..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleCreateConsulta}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4CAF50', '#2196F3']}
              style={styles.saveButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Criar Consulta</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Modal de Calendário */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() => {
                  const prevMonth = new Date(currentMonth);
                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                  setCurrentMonth(prevMonth);
                }}
                style={styles.calendarNavButton}
              >
                <Ionicons name="chevron-back" size={24} color="#2196F3" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthText}>
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const nextMonth = new Date(currentMonth);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  setCurrentMonth(nextMonth);
                }}
                style={styles.calendarNavButton}
              >
                <Ionicons name="chevron-forward" size={24} color="#2196F3" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekDays}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                <View key={index} style={styles.calendarWeekDay}>
                  <Text style={styles.calendarWeekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendarDays}>
              {getCalendarDays(currentMonth).map((day, index) => {
                if (!day) {
                  return <View key={index} style={styles.calendarDay} />;
                }

                const isToday = isSameDay(day, new Date());
                const isSelected = dataConsulta && isSameDay(day, new Date(dataConsulta + 'T00:00:00'));
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                const dateStr = formatDate(day);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      isToday && styles.calendarDayToday,
                      isSelected && styles.calendarDaySelected,
                      isPast && styles.calendarDayPast,
                    ]}
                    onPress={() => {
                      if (!isPast) {
                        setDataConsulta(dateStr);
                        setHoraConsulta('');
                        setShowCalendar(false);
                        // Os horários serão carregados automaticamente pelo useEffect
                      }
                    }}
                    disabled={isPast}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      isToday && styles.calendarDayTextToday,
                      isSelected && styles.calendarDayTextSelected,
                      isPast && styles.calendarDayTextPast,
                    ]}>
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.calendarCloseButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.calendarCloseButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Paciente */}
      <Modal
        visible={showPacientesList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPacientesList(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Paciente</Text>
              <TouchableOpacity
                onPress={() => setShowPacientesList(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#666" style={styles.searchIconModal} />
              <TextInput
                style={styles.searchInput}
                value={searchPaciente}
                onChangeText={setSearchPaciente}
                placeholder="Buscar por nome ou email..."
                placeholderTextColor="#999"
              />
            </View>

            <ScrollView style={styles.pacientesList}>
              {loadingPacientes ? (
                <ActivityIndicator size="large" color="#2196F3" style={styles.loading} />
              ) : pacientesFiltrados.length > 0 ? (
                pacientesFiltrados.map((paciente) => (
                  <TouchableOpacity
                    key={paciente.id}
                    style={[
                      styles.pacienteItem,
                      selectedPaciente?.id === paciente.id && styles.pacienteItemSelected
                    ]}
                    onPress={() => {
                      setSelectedPaciente(paciente);
                      setSearchPaciente('');
                      setShowPacientesList(false);
                    }}
                  >
                    <View style={styles.pacienteInfo}>
                      <Text style={styles.pacienteNome}>{paciente.nome}</Text>
                      {paciente.email && (
                        <Text style={styles.pacienteEmail}>{paciente.email}</Text>
                      )}
                    </View>
                    {selectedPaciente?.id === paciente.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Nenhum paciente encontrado</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC', // Fundo claro ao invés de gradiente
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1976D2',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateInputText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  clearButton: {
    marginLeft: 'auto',
  },
  saveButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchIconModal: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  pacientesList: {
    maxHeight: 400,
  },
  loading: {
    padding: 20,
  },
  pacienteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pacienteItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  pacienteInfo: {
    flex: 1,
  },
  pacienteNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  pacienteEmail: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    textTransform: 'capitalize',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarWeekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  calendarDayToday: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  calendarDayPast: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
  calendarDayTextToday: {
    color: '#2196F3',
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  calendarDayTextPast: {
    color: '#999',
  },
  calendarCloseButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  horariosContainer: {
    marginTop: 8,
  },
  horariosContentContainer: {
    paddingRight: 20,
  },
  horariosLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    gap: 8,
  },
  horariosLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  horarioButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  horarioButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  horarioButtonOcupado: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.6,
  },
  horarioButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  horarioButtonTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  horarioButtonTextOcupado: {
    color: '#999',
  },
  horariosEmpty: {
    padding: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  horariosEmptyText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
});

export default NovaConsultaScreen;

