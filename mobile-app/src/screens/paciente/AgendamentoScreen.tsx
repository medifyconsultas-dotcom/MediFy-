import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
  FlatList,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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

interface Professional {
  id: string;
  nome: string;
  especialidade: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  tipo?: 'autonomo' | 'clinica';
  idClinica?: string;
  foto?: string;
  fotoURL?: string;
}

interface Clinica {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
}

interface RouteParams {
  professional?: Professional;
  consultaParaRemarcar?: any;
}

const AgendamentoScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { professional, consultaParaRemarcar, searchQuery: initialSearchQuery } = route.params as RouteParams || {};

  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(
    professional ? {
      id: professional.id,
      nome: professional.nome || professional.name,
      especialidade: professional.especialidade || professional.specialty,
      tipo: professional.tipo,
      idClinica: professional.idClinica,
      foto: professional.foto,
      fotoURL: professional.fotoURL,
    } : null
  );
  const [selectedClinica, setSelectedClinica] = useState<Clinica | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProfissionais, setLoadingProfissionais] = useState<boolean>(false);
  const [showDateModal, setShowDateModal] = useState<boolean>(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState<boolean>(false);
  const [showClinicaModal, setShowClinicaModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profissionais, setProfissionais] = useState<Professional[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [consultasPaciente, setConsultasPaciente] = useState<any[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadClinicas();
    loadProfissionais();
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

    // Se for remarcação, preencher dados
    if (consultaParaRemarcar) {
      setReason(consultaParaRemarcar.observacoes || '');
      if (consultaParaRemarcar.dataConsulta) {
        const data = new Date(consultaParaRemarcar.dataConsulta);
        setSelectedDate(data);
        setSelectedTime(data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
    }
  }, []);

  // Carregar profissionais quando o modal abrir ou quando searchQuery mudar
  useEffect(() => {
    if (showProfessionalModal) {
      const timeoutId = setTimeout(() => {
        loadProfissionais(searchQuery || '');
      }, showProfessionalModal && searchQuery ? 500 : 0); // Debounce apenas quando há busca
      
      return () => clearTimeout(timeoutId);
    }
  }, [showProfessionalModal, searchQuery]);

  // Carregar horários quando profissional e data forem selecionados
  useEffect(() => {
    if (selectedProfessional && selectedDate) {
      loadHorariosDisponiveis();
    } else {
      // Limpar horários se não houver profissional ou data selecionados
      setHorariosDisponiveis([]);
      setHorariosOcupados([]);
      setConsultasPaciente([]);
    }
  }, [selectedProfessional?.id, selectedDate]);

  const loadProfissionais = React.useCallback(async (query?: string) => {
    try {
      setLoadingProfissionais(true);
      let token = getAuthToken();
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
        if (token) setAuthToken(token);
      }

      const searchTerm = query !== undefined ? query : searchQuery;
      console.log('🔍 Buscando profissionais com query:', searchTerm);
      
      const response = await buscaAPI.getProfissionais(searchTerm);
      console.log('📥 Resposta profissionais:', response);
      
      if (response.success) {
        const profissionaisData = response.data || [];
        setProfissionais(profissionaisData);
        console.log(`✅ ${profissionaisData.length} profissionais carregados`);
        
        if (profissionaisData.length === 0) {
          console.log('⚠️ Nenhum profissional encontrado');
        }
      } else {
        console.error('❌ Resposta não foi bem-sucedida:', response);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar profissionais:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar os profissionais. Tente novamente.');
    } finally {
      setLoadingProfissionais(false);
    }
  }, [searchQuery]);

  const loadClinicas = async () => {
    try {
      let token = getAuthToken();
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
        if (token) setAuthToken(token);
      }

      const response = await buscaAPI.getClinicas();
      if (response.success) {
        setClinicas(response.data || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar clínicas:', error);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const loadHorariosDisponiveis = React.useCallback(async () => {
    if (!selectedProfessional || !selectedDate) {
      setHorariosDisponiveis([]);
      setHorariosOcupados([]);
      setConsultasPaciente([]);
      return;
    }

    setLoadingHorarios(true);
    try {
      let token = getAuthToken();
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
        if (token) setAuthToken(token);
      }

      // Formatar data para YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dataStr = `${year}-${month}-${day}`;
      
      console.log('📅 Carregando horários para:', {
        profissionalId: selectedProfessional.id,
        data: dataStr,
      });
      
      const response = await pacienteAPI.getHorariosDisponiveis(selectedProfessional.id, dataStr);
      
      console.log('📥 Resposta horários:', response);
      
      if (response.success && response.data) {
        setHorariosDisponiveis(response.data.disponiveis || []);
        setHorariosOcupados(response.data.ocupados || []);
        setConsultasPaciente(response.data.consultasPaciente || []);
        console.log('✅ Horários carregados:', {
          disponiveis: response.data.disponiveis?.length || 0,
          ocupados: response.data.ocupados?.length || 0,
          consultasPaciente: response.data.consultasPaciente?.length || 0,
        });
      } else {
        console.warn('⚠️ Resposta sem sucesso:', response);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar horários:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar os horários disponíveis.');
    } finally {
      setLoadingHorarios(false);
    }
  }, [selectedProfessional, selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(''); // Limpar hora selecionada ao mudar data
    setShowCalendar(false);
  };

  const handleAgendamento = async () => {
    if (!selectedProfessional) {
      Alert.alert('Erro', 'Por favor, selecione um profissional.');
      return;
    }

    if (!selectedTime) {
      Alert.alert('Erro', 'Por favor, selecione um horário.');
      return;
    }

    setIsLoading(true);

    try {
      let token = getAuthToken();
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
        if (token) setAuthToken(token);
      }

      // Combinar data e hora
      const [hours, minutes] = selectedTime.split(':');
      const dataHora = new Date(selectedDate);
      dataHora.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const consultaData = {
        idClinica: selectedClinica?.id || (selectedProfessional.tipo === 'clinica' ? selectedProfessional.idClinica : null),
        idProfissional: selectedProfessional.id,
        dataConsulta: dataHora.toISOString(),
        observacoes: reason || '',
      };

      if (consultaParaRemarcar) {
        // Remarcar consulta existente
        await pacienteAPI.remarcarConsulta(consultaParaRemarcar.id, dataHora.toISOString());
        Alert.alert(
          'Sucesso!',
          'Consulta remarcada com sucesso!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Nova consulta
        const response = await pacienteAPI.agendarConsulta(consultaData);
        if (response.success) {
          Alert.alert(
            'Sucesso!',
            'Consulta agendada com sucesso!',
            [{ text: 'OK', onPress: () => navigation.navigate('DashboardPaciente') }]
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível agendar a consulta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const availableTimes = [
    '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
  ];

  const availableDates = [
    { label: 'Hoje', days: 0 },
    { label: 'Amanhã', days: 1 },
    { label: 'Em 2 dias', days: 2 },
    { label: 'Em 3 dias', days: 3 },
    { label: 'Em 4 dias', days: 4 },
    { label: 'Em 5 dias', days: 5 },
    { label: 'Em 6 dias', days: 6 },
    { label: 'Em 7 dias', days: 7 },
  ];

  const filteredProfissionais = profissionais.filter(p => 
    !searchQuery || 
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.especialidade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Função para renderizar calendário
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Dias vazios no início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast = date < today;
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      const isToday = date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      days.push({ day, date, isPast, isSelected, isToday });
    }

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => {
              const prevMonth = new Date(currentMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setCurrentMonth(prevMonth);
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.calendarMonthText}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const nextMonth = new Date(currentMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setCurrentMonth(nextMonth);
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.weekDay}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {days.map((item, index) => {
            if (item === null) {
              return <View key={index} style={styles.calendarDay} />;
            }

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  item.isToday && styles.calendarDayToday,
                  item.isSelected && styles.calendarDaySelected,
                  item.isPast && styles.calendarDayPast,
                ]}
                onPress={() => !item.isPast && handleDateSelect(item.date)}
                disabled={item.isPast}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    item.isToday && styles.calendarDayTextToday,
                    item.isSelected && styles.calendarDayTextSelected,
                    item.isPast && styles.calendarDayTextPast,
                  ]}
                >
                  {item.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const ConfirmButton = ({ title, onPress, isLoading, disabled }: { title: string; onPress: () => void; isLoading: boolean; disabled: boolean }) => {
    const buttonAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      if (!disabled) {
        Animated.spring(buttonAnim, {
          toValue: 0.95,
          useNativeDriver: true,
        }).start();
      }
    };

    const handlePressOut = () => {
      if (!disabled) {
        Animated.spring(buttonAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    };

    return (
      <Animated.View style={[styles.confirmButton, { transform: [{ scale: buttonAnim }] }, disabled && styles.confirmButtonDisabled]}>
        <TouchableOpacity 
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={1}
        >
          <LinearGradient
            colors={['#4CAF50', '#2196F3']}
            style={styles.confirmButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="calendar" size={20} color="white" />
                <Text style={styles.confirmButtonText}>{title}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const DateModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showCalendar}
      onRequestClose={() => setShowCalendar(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Data</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCalendar(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {renderCalendar()}
        </View>
      </View>
    </Modal>
  );

  const ProfessionalModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showProfessionalModal}
      onRequestClose={() => setShowProfessionalModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Profissional</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowProfessionalModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainerModal}>
            <Ionicons name="search" size={20} color="#2196F3" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar profissional..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                // O useEffect vai recarregar automaticamente com debounce
              }}
            />
          </View>

          {loadingProfissionais ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <FlatList
              data={filteredProfissionais}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.professionalOption}
                  onPress={() => {
                    setSelectedProfessional(item);
                    setShowProfessionalModal(false);
                    // Se for profissional de clínica, mostrar seleção de clínica
                    if (item.tipo === 'clinica' && item.idClinica) {
                      const clinica = clinicas.find(c => c.id === item.idClinica);
                      if (clinica) {
                        setSelectedClinica(clinica);
                      }
                    }
                  }}
                >
                  {item.fotoURL || item.foto ? (
                    <Image
                      source={{
                        uri: item.fotoURL || 
                             (item.foto?.startsWith('http') 
                               ? item.foto 
                               : item.foto?.startsWith('/')
                                 ? `http://192.168.15.127:3001${item.foto}`
                                 : item.foto)
                      }}
                      style={styles.professionalOptionImage}
                      onError={(error) => {
                        console.log('Erro ao carregar imagem:', error);
                      }}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#E3F2FD', '#F3E5F5']}
                      style={styles.professionalOptionImage}
                    >
                      <Ionicons name="person" size={24} color="#2196F3" />
                    </LinearGradient>
                  )}
                  <View style={styles.professionalOptionInfo}>
                    <Text style={styles.professionalOptionName}>{item.nome}</Text>
                    <Text style={styles.professionalOptionSpecialty}>{item.especialidade}</Text>
                    {item.endereco && (
                      <Text style={[styles.professionalOptionSpecialty, { fontSize: 12, color: '#666', marginTop: 2 }]}>
                        <Ionicons name="location-outline" size={12} color="#666" /> {item.endereco}
                      </Text>
                    )}
                    {item.clinicaEndereco && (
                      <Text style={[styles.professionalOptionSpecialty, { fontSize: 12, color: '#666', marginTop: 2 }]}>
                        <Ionicons name="location-outline" size={12} color="#666" /> {item.clinicaEndereco}
                      </Text>
                    )}
                    {item.tipo === 'clinica' && (
                      <Text style={styles.professionalOptionType}>Clínica</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Nenhum profissional encontrado</Text>
                </View>
              }
            />
          )}
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
      >
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {consultaParaRemarcar ? 'Remarcar Consulta' : 'Agendar Consulta'}
            </Text>
          </View>

          {/* Seção do Profissional */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profissional</Text>
            {selectedProfessional ? (
              <View style={styles.professionalCard}>
                {selectedProfessional.fotoURL || selectedProfessional.foto ? (
                  <Image
                    source={{
                      uri: selectedProfessional.fotoURL || 
                           (selectedProfessional.foto?.startsWith('http') 
                             ? selectedProfessional.foto 
                             : selectedProfessional.foto?.startsWith('/')
                               ? `http://192.168.15.127:3001${selectedProfessional.foto}`
                               : selectedProfessional.foto)
                    }}
                    style={styles.professionalImage}
                    onError={(error) => {
                      console.log('Erro ao carregar imagem:', error);
                    }}
                  />
                ) : (
                  <LinearGradient
                    colors={['#4CAF50', '#2196F3']}
                    style={styles.professionalImage}
                  >
                    <Ionicons name="person" size={24} color="white" />
                  </LinearGradient>
                )}
                <TouchableOpacity 
                  style={styles.professionalInfo}
                  onPress={() => setShowProfileModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.professionalName}>{selectedProfessional.nome}</Text>
                  <Text style={styles.professionalSpecialty}>{selectedProfessional.especialidade}</Text>
                  {selectedProfessional.endereco && (
                    <Text style={[styles.professionalSpecialty, { fontSize: 12, color: '#666', marginTop: 4 }]}>
                      <Ionicons name="location-outline" size={12} color="#666" /> {selectedProfessional.endereco}
                    </Text>
                  )}
                  {selectedClinica && (
                    <>
                      <Text style={styles.clinicaName}>{selectedClinica.nome}</Text>
                      {selectedClinica.endereco && (
                        <Text style={[styles.professionalSpecialty, { fontSize: 12, color: '#666', marginTop: 4 }]}>
                          <Ionicons name="location-outline" size={12} color="#666" /> {selectedClinica.endereco}
                        </Text>
                      )}
                    </>
                  )}
                  <Text style={[styles.professionalSpecialty, { fontSize: 11, color: '#2196F3', marginTop: 8, fontStyle: 'italic' }]}>
                    Toque para ver mais informações
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setShowProfessionalModal(true)}
                >
                  <Ionicons name="create-outline" size={20} color="#2196F3" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.selectProfessionalButton}
                onPress={() => setShowProfessionalModal(true)}
              >
                <Ionicons name="search" size={20} color="#2196F3" />
                <Text style={styles.selectProfessionalText}>Selecionar Profissional</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Seção de Data e Hora */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data e Horário</Text>
            
            {!selectedProfessional ? (
              <Text style={styles.infoText}>Selecione um profissional primeiro</Text>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowCalendar(true)}
                >
                  <Ionicons name="calendar" size={20} color="#2196F3" />
                  <Text style={styles.dateTimeText}>
                    {selectedDate.toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#2196F3" />
                </TouchableOpacity>

                <Text style={styles.timeLabel}>Horários Disponíveis</Text>
                {loadingHorarios ? (
                  <View style={styles.horariosLoading}>
                    <ActivityIndicator size="small" color="#2196F3" />
                    <Text style={styles.horariosLoadingText}>Carregando horários...</Text>
                  </View>
                ) : horariosDisponiveis.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.timeSlots}>
                      {horariosDisponiveis.map((time) => {
                        const isOcupado = horariosOcupados.includes(time);
                        const consultaPaciente = consultasPaciente.find(c => c.hora === time);
                        const isSelected = selectedTime === time;
                        
                        return (
                          <TouchableOpacity
                            key={time}
                            style={[
                              styles.timeSlot,
                              isSelected && styles.timeSlotSelected,
                              isOcupado && styles.timeSlotOcupado,
                            ]}
                            onPress={() => !isOcupado && handleTimeSelect(time)}
                            disabled={isOcupado}
                          >
                            <Text style={[
                              styles.timeSlotText,
                              isSelected && styles.timeSlotTextSelected,
                              isOcupado && styles.timeSlotTextOcupado,
                            ]}>
                              {time}
                              {isOcupado && ' (Ocupado)'}
                            </Text>
                            {consultaPaciente && (
                              <Text style={styles.consultaPacienteText}>
                                Sua consulta com {consultaPaciente.profissional}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                ) : selectedDate ? (
                  <View style={styles.horariosEmpty}>
                    <Text style={styles.horariosEmptyText}>
                      Nenhum horário disponível para esta data
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.infoText}>Selecione uma data para ver os horários disponíveis</Text>
                )}
              </>
            )}
          </View>

          {/* Seção de Motivo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Motivo da Consulta (Opcional)</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Descreva o motivo da sua consulta..."
              placeholderTextColor="#888"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Botão de Confirmação */}
          <ConfirmButton
            title={consultaParaRemarcar ? 'Confirmar Remarcação' : 'Confirmar Agendamento'}
            onPress={handleAgendamento}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </Animated.View>
      </ScrollView>

      <DateModal />
      <ProfessionalModal />

      {/* Modal de Perfil do Profissional */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Perfil do Profissional</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowProfileModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedProfessional && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.profileHeader}>
                  {selectedProfessional.fotoURL || selectedProfessional.foto ? (
                    <Image
                      source={{
                        uri: selectedProfessional.fotoURL || 
                             (selectedProfessional.foto?.startsWith('http') 
                               ? selectedProfessional.foto 
                               : selectedProfessional.foto?.startsWith('/')
                                 ? `http://192.168.15.127:3001${selectedProfessional.foto}`
                                 : selectedProfessional.foto)
                      }}
                      style={styles.profileImage}
                      onError={() => {}}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#4CAF50', '#2196F3']}
                      style={styles.profileImage}
                    >
                      <Ionicons name="person" size={40} color="white" />
                    </LinearGradient>
                  )}
                  <Text style={styles.profileName}>{selectedProfessional.nome}</Text>
                  <Text style={styles.profileSpecialty}>{selectedProfessional.especialidade}</Text>
                </View>

                <View style={styles.profileSection}>
                  {selectedProfessional.endereco && (
                    <View style={styles.profileRow}>
                      <Ionicons name="location-outline" size={20} color="#2196F3" />
                      <Text style={styles.profileText}>{selectedProfessional.endereco}</Text>
                    </View>
                  )}
                  {selectedProfessional.telefone && (
                    <View style={styles.profileRow}>
                      <Ionicons name="call-outline" size={20} color="#2196F3" />
                      <Text style={styles.profileText}>{selectedProfessional.telefone}</Text>
                    </View>
                  )}
                  {selectedProfessional.email && (
                    <View style={styles.profileRow}>
                      <Ionicons name="mail-outline" size={20} color="#2196F3" />
                      <Text style={styles.profileText}>{selectedProfessional.email}</Text>
                    </View>
                  )}
                  {selectedClinica && (
                    <>
                      <View style={styles.profileRow}>
                        <Ionicons name="business-outline" size={20} color="#2196F3" />
                        <Text style={styles.profileText}>{selectedClinica.nome}</Text>
                      </View>
                      {selectedClinica.endereco && (
                        <View style={styles.profileRow}>
                          <Ionicons name="location-outline" size={20} color="#2196F3" />
                          <Text style={styles.profileText}>{selectedClinica.endereco}</Text>
                        </View>
                      )}
                      {selectedClinica.telefone && (
                        <View style={styles.profileRow}>
                          <Ionicons name="call-outline" size={20} color="#2196F3" />
                          <Text style={styles.profileText}>{selectedClinica.telefone}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>
            )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1976D2',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 15,
  },
  professionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  professionalImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#E3F2FD',
    marginRight: 15,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  clinicaName: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  changeButton: {
    padding: 8,
  },
  selectProfessionalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  selectProfessionalText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 15,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  timeSlots: {
    flexDirection: 'row',
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeSlotSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: 'white',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  confirmButton: {
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 25,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  // Modal styles
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
  datesList: {
    padding: 20,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  dateOptionDate: {
    fontSize: 14,
    color: '#666',
  },
  searchContainerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  professionalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  professionalOptionImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
    backgroundColor: '#E3F2FD',
  },
  professionalOptionInfo: {
    flex: 1,
  },
  professionalOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  professionalOptionSpecialty: {
    fontSize: 14,
    color: '#666',
  },
  professionalOptionType: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
  },
  // Estilos do calendário
  calendarContainer: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
  },
  calendarDayToday: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  calendarDaySelected: {
    backgroundColor: '#2196F3',
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
  // Estilos de horários
  horariosLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  horariosLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  horariosEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  horariosEmptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  timeSlotOcupado: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.5,
  },
  timeSlotTextOcupado: {
    color: '#999',
  },
  consultaPacienteText: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 4,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 15,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 5,
  },
  profileSpecialty: {
    fontSize: 16,
    color: '#666',
  },
  profileSection: {
    marginTop: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
});

export default AgendamentoScreen;
