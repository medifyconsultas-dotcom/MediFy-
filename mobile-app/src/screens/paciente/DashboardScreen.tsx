import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

interface Consulta {
  id: string;
  nomeProfissional: string;
  especialidade?: string;
  dataConsulta: Date | string;
  status: string;
  observacoes?: string;
  idClinica?: string;
  nomeClinica?: string;
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
  endereco?: string;
  rating?: number;
  reviews?: number;
  available?: boolean;
  description?: string;
  bio?: string;
  descricao?: string;
  biografia?: string;
  experience?: string;
  education?: string;
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Consulta[]>([]);
  const [featuredProfessionals, setFeaturedProfessionals] = useState<Professional[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelMotivoCustom, setCancelMotivoCustom] = useState('');
  const [showMotivoPicker, setShowMotivoPicker] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'profissional' | 'clinica'>('all');
  const [filterEspecialidade, setFilterEspecialidade] = useState<string>('');
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [showClinicaModal, setShowClinicaModal] = useState(false);
  const [selectedClinica, setSelectedClinica] = useState<any>(null);
  const [medicosClinica, setMedicosClinica] = useState<any[]>([]);
  const [especialidadesClinica, setEspecialidadesClinica] = useState<string[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [clinicasCache, setClinicasCache] = useState<any[]>([]);
  const [showEspecialidadeModal, setShowEspecialidadeModal] = useState(false);
  const [pacienteFoto, setPacienteFoto] = useState<string | null>(null);
  const [pacienteNome, setPacienteNome] = useState<string>('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const motivosCancelamento = [
    { label: 'Doença', value: 'Doença' },
    { label: 'Conflito de horário', value: 'Conflito de horário' },
    { label: 'Problemas de transporte', value: 'Problemas de transporte' },
    { label: 'Outro', value: 'Outro' },
  ];

  useEffect(() => {
    loadData();
    loadEspecialidades();
    loadClinicasCache();
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

  // Recarregar foto quando a tela voltar ao foco (após atualizar no perfil)
  useFocusEffect(
    useCallback(() => {
      const loadFoto = async () => {
        try {
          const perfilResponse = await pacienteAPI.getPerfil();
          if (perfilResponse.success && perfilResponse.data) {
            let foto = perfilResponse.data.foto || perfilResponse.data.fotoURL || perfilResponse.data.photo || perfilResponse.data.avatar_url || null;
            
            // Tratar diferentes formatos de foto
            if (foto) {
              // Se é base64 ou URL absoluta, usar diretamente
              if (foto.startsWith('data:') || foto.startsWith('http://') || foto.startsWith('https://')) {
                setPacienteFoto(foto);
              } else if (foto.startsWith('/media/')) {
                // URL relativa do Django - tentar usar, mas se falhar será tratado no onError
                setPacienteFoto(foto);
              } else {
                // Outros formatos
                setPacienteFoto(foto);
              }
            } else {
              // Se não tem foto, limpar
              setPacienteFoto(null);
            }
            if (perfilResponse.data.nome || perfilResponse.data.name) {
              setPacienteNome(perfilResponse.data.nome || perfilResponse.data.name || '');
            }
          }
        } catch (error) {
          console.error('Erro ao recarregar foto:', error);
        }
      };
      loadFoto();
    }, [])
  );

  useEffect(() => {
    // Se tem filtro ativo (tipo ou especialidade), buscar mesmo sem texto
    const hasActiveFilter = filterType !== 'all' || filterEspecialidade !== '';
    
    if (searchQuery.trim() || hasActiveFilter) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  }, [searchQuery, filterType, filterEspecialidade, handleSearch]);

  const loadData = async () => {
    setRefreshing(true);
    setLoading(true);
    
    try {
      // Carregar token do AsyncStorage ou usar o token atual
      let token = getAuthToken();
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
        if (token) {
          setAuthToken(token);
        }
      }

      if (!token) {
        Alert.alert('Erro', 'Sessão expirada. Faça login novamente.');
        navigation.navigate('Login');
        return;
      }

      // Carregar dashboard
      const dashboardResponse = await pacienteAPI.getDashboard();
      
      if (dashboardResponse.success && dashboardResponse.data) {
        const { consultasFuturas, paciente } = dashboardResponse.data;
        // Converter datas de string para Date se necessário
        const consultasFormatadas = (consultasFuturas || []).map((consulta: any) => ({
          ...consulta,
          dataConsulta: consulta.dataConsulta instanceof Date 
            ? consulta.dataConsulta 
            : new Date(consulta.dataConsulta),
        }));
        setUpcomingAppointments(consultasFormatadas);
        
        // Carregar foto e nome do paciente
        if (paciente) {
          const foto = paciente.foto || paciente.fotoURL || paciente.photo || paciente.avatar_url || null;
          if (foto) {
            setPacienteFoto(foto);
          }
          if (paciente.nome || paciente.name) {
            setPacienteNome(paciente.nome || paciente.name || '');
          }
        }
      }
      
      // Sempre tentar carregar do perfil para garantir que temos a foto mais atualizada
      try {
        const perfilResponse = await pacienteAPI.getPerfil();
        if (perfilResponse.success && perfilResponse.data) {
          let foto = perfilResponse.data.foto || perfilResponse.data.fotoURL || perfilResponse.data.photo || perfilResponse.data.avatar_url || null;
          
          // Se a foto é base64, usar diretamente
          // Se é URL relativa do Django, não tentar carregar (será tratada no componente)
          // Se é URL absoluta, usar diretamente
          if (foto) {
            // Se não é base64 e não é URL absoluta, pode ser URL relativa do Django
            // Nesse caso, não definir a foto (o componente tratará o erro)
            if (foto.startsWith('data:') || foto.startsWith('http://') || foto.startsWith('https://')) {
              setPacienteFoto(foto);
            } else if (foto.startsWith('/media/')) {
              // URL relativa do Django - tentar construir URL completa
              // Mas se falhar, será tratado no onError
              setPacienteFoto(foto);
            } else {
              // Pode ser base64 sem prefixo ou outro formato
              setPacienteFoto(foto);
            }
          }
          if (perfilResponse.data.nome || perfilResponse.data.name) {
            setPacienteNome(perfilResponse.data.nome || perfilResponse.data.name || '');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }

      // TODO: Carregar profissionais em destaque
      // Por enquanto, deixar vazio
      setFeaturedProfessionals([]);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados. Tente novamente.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const loadClinicasCache = useCallback(async () => {
    if (clinicasCache.length > 0) return; // Já tem cache
    
    try {
      const response = await buscaAPI.getClinicas();
      if (response.success && response.data) {
        setClinicasCache(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    }
  }, [clinicasCache.length]);

  const handleSearch = useCallback(async () => {
    try {
      // Carregar cache de clínicas se necessário
      if (clinicasCache.length === 0) {
        await loadClinicasCache();
      }
      
      const hasSearchQuery = searchQuery.trim().length > 0;
      const hasActiveFilter = filterType !== 'all' || filterEspecialidade !== '';
      const searchLower = hasSearchQuery ? searchQuery.toLowerCase() : '';
      
      // Se não tem texto na busca e não tem filtro ativo, não mostrar resultados
      // EXCETO quando o filtro é "Todos" - nesse caso, mostrar todos os profissionais
      if (!hasSearchQuery && !hasActiveFilter && filterType !== 'all') {
        setShowSearchResults(false);
        setSearchResults([]);
        return;
      }
      
      // Se o filtro é "Todos" sem texto, deve buscar e mostrar todos os profissionais

      // Buscar profissionais (sem query se não tiver texto, para pegar todos)
      const profissionaisResponse = await buscaAPI.getProfissionais(hasSearchQuery ? searchQuery : '');

      let resultados: any[] = [];

      // Adicionar profissionais e médicos de clínicas
      if (profissionaisResponse.success && profissionaisResponse.data) {
        const profissionais = profissionaisResponse.data.filter((p: any) => {
          // Se tem texto na busca, filtrar por ele
          const matchesSearch = !hasSearchQuery || 
            p.nome?.toLowerCase().includes(searchLower) ||
            p.especialidade?.toLowerCase().includes(searchLower);
          
          // Filtro por tipo:
          // - 'all': mostra TODOS (autônomos E médicos de clínicas)
          // - 'profissional': mostra apenas autônomos
          // - 'clinica': NÃO mostra médicos de clínicas aqui (só mostra clínicas)
          let matchesType = false;
          if (filterType === 'all') {
            // Mostrar todos: autônomos E médicos de clínicas
            matchesType = true;
          } else if (filterType === 'profissional') {
            // Mostrar apenas autônomos
            matchesType = p.tipo === 'autonomo';
          } else if (filterType === 'clinica') {
            // Não mostrar médicos aqui quando filtro é clínica
            matchesType = false;
          }
          
          const matchesEspecialidade = !filterEspecialidade || 
            p.especialidade?.toLowerCase() === filterEspecialidade.toLowerCase();

          return matchesSearch && matchesType && matchesEspecialidade;
        });

        resultados = [...resultados, ...profissionais.map((p: any) => ({
          ...p,
          tipoResultado: p.tipo === 'autonomo' ? 'Profissional' : 'Médico de Clínica',
          name: p.nome || p.name || '',
          specialty: p.especialidade || p.specialty || '',
          description: p.descricao || p.bio || p.biografia || p.description || null,
          bio: p.bio || p.biografia || p.descricao || p.description || null,
          descricao: p.descricao || p.bio || p.biografia || p.description || null,
          biografia: p.biografia || p.bio || p.descricao || p.description || null,
        }))];
      }

      // Adicionar clínicas do cache (filtro local, sem chamada API)
      // No filtro 'clinica', mostrar APENAS clínicas (não médicos)
      // No filtro 'all', NÃO mostrar clínicas (apenas profissionais)
      if (clinicasCache.length > 0 && filterType === 'clinica') {
        const clinicas = clinicasCache.filter((c: any) => {
          // Se tem texto na busca, filtrar por ele
          const matchesSearch = !hasSearchQuery ||
            c.nome?.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower) ||
            (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(searchLower));
          
          return matchesSearch;
        });

        resultados = [...resultados, ...clinicas.map((c: any) => ({
          ...c,
          nome: c.nomeFantasia || c.nome || c.nomeClinica || c.nome,
          tipoResultado: 'Clínica',
          tipo: 'clinica',
        }))];
      }

      setSearchResults(resultados);
      setShowSearchResults(true);
    } catch (error: any) {
      console.error('Erro ao buscar:', error);
      // Não mostrar alerta para não interromper a experiência
    }
  }, [searchQuery, filterType, filterEspecialidade, clinicasCache, loadClinicasCache]);

  const handleClinicaClick = async (clinica: any) => {
    setSelectedClinica(clinica);
    setLoadingMedicos(true);
    setShowClinicaModal(true);
    setMedicosClinica([]);
    setEspecialidadesClinica([]);

    try {
      const response = await buscaAPI.getMedicosClinica(clinica.id);
      if (response.success && response.data) {
        setMedicosClinica(response.data.medicos || []);
        setEspecialidadesClinica(response.data.especialidades || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar médicos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os médicos da clínica.');
    } finally {
      setLoadingMedicos(false);
    }
  };

  const loadEspecialidades = async () => {
    try {
      console.log('🔄 Carregando especialidades...');
      
      // Buscar todas as especialidades de profissionais autônomos e médicos de clínicas
      const profissionaisResponse = await buscaAPI.getProfissionais();
      
      const especialidadesSet = new Set<string>();

      // Adicionar especialidades dos profissionais retornados pela API
      // A API já retorna profissionais autônomos E médicos de clínicas
      if (profissionaisResponse.success && profissionaisResponse.data) {
        console.log(`📋 ${profissionaisResponse.data.length} profissionais encontrados`);
        
        profissionaisResponse.data.forEach((p: any) => {
          if (p.especialidade && p.especialidade.trim()) {
            const esp = p.especialidade.trim();
            especialidadesSet.add(esp);
            console.log(`  ✅ Especialidade: ${esp}`);
          }
        });
      }

      // Buscar médicos de TODAS as clínicas para garantir que não perdemos nenhuma especialidade
      // Isso é importante porque pode haver médicos que não aparecem na busca geral
      try {
        const clinicasResponse = await buscaAPI.getClinicas();
        
        if (clinicasResponse.success && clinicasResponse.data) {
          console.log(`🏥 ${clinicasResponse.data.length} clínicas encontradas`);
          
          // Buscar médicos de todas as clínicas
          const medicosPromises = clinicasResponse.data.map((clinica: any) => 
            buscaAPI.getMedicosClinica(clinica.id).catch((err) => {
              console.warn(`⚠️ Erro ao buscar médicos da clínica ${clinica.id}:`, err);
              return null;
            })
          );
          
          const medicosResponses = await Promise.all(medicosPromises);
          let medicosCount = 0;
          
          medicosResponses.forEach((response: any) => {
            if (response && response.success && response.data && response.data.medicos) {
              medicosCount += response.data.medicos.length;
              response.data.medicos.forEach((medico: any) => {
                if (medico.especialidade && medico.especialidade.trim()) {
                  const esp = medico.especialidade.trim();
                  especialidadesSet.add(esp);
                }
              });
            }
          });
          
          console.log(`👨‍⚕️ ${medicosCount} médicos de clínicas verificados`);
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar médicos de clínicas para especialidades:', error);
        // Não falhar completamente se houver erro aqui
      }

      const especialidadesUnicas = Array.from(especialidadesSet).sort();
      setEspecialidades(especialidadesUnicas);
      console.log(`✅ Total de ${especialidadesUnicas.length} especialidades únicas carregadas:`, JSON.stringify(especialidadesUnicas));
    } catch (error) {
      console.error('❌ Erro ao carregar especialidades:', error);
      Alert.alert('Aviso', 'Não foi possível carregar todas as especialidades. Algumas podem estar faltando.');
    }
  };

  useEffect(() => {
    loadEspecialidades();
  }, []);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'agendada':
      case 'confirmada':
        return '#2196F3';
      case 'realizada':
        return '#4CAF50';
      case 'cancelada':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'agendada':
        return 'Agendada';
      case 'confirmada':
        return 'Confirmada';
      case 'realizada':
        return 'Realizada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status || 'Pendente';
    }
  };

  const handleRemarcar = (consulta: Consulta) => {
    Alert.alert(
      'Remarcar Consulta',
      'Deseja remarcar esta consulta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remarcar', 
          onPress: () => navigation.navigate('Agendamento', { 
            consultaParaRemarcar: consulta 
          })
        }
      ]
    );
  };

  const handleCancelarClick = (consulta: Consulta) => {
    setSelectedConsulta(consulta);
    setCancelMotivo('');
    setCancelMotivoCustom('');
    setShowCancelModal(true);
  };

  const handleCancelar = async () => {
    if (!selectedConsulta) return;

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
      const response = await pacienteAPI.cancelarConsulta(selectedConsulta.id, motivoFinal);
      if (response.success) {
        Alert.alert('Sucesso', 'Consulta cancelada com sucesso!');
        setShowCancelModal(false);
        setSelectedConsulta(null);
        loadData();
      } else {
        Alert.alert('Erro', 'Não foi possível cancelar a consulta.');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível cancelar a consulta.');
    }
  };

  const QuickAction = ({ title, icon, onPress, color }: any) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={color}
        style={styles.quickActionIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={24} color="white" />
      </LinearGradient>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const AppointmentCard = ({ appointment }: { appointment: Consulta }) => {
    const statusColor = getStatusColor(appointment.status);
    const canEdit = appointment.status?.toLowerCase() === 'agendada' || 
                    appointment.status?.toLowerCase() === 'confirmada';
    const cardAnim = useRef(new Animated.Value(1)).current;

    return (
      <Animated.View style={[styles.appointmentCard, { transform: [{ scale: cardAnim }] }]}>
        <LinearGradient
          colors={['#FFFFFF', '#F5F5F5']}
          style={styles.appointmentCardGradient}
        >
          <View style={styles.appointmentHeader}>
            <View style={styles.appointmentHeaderLeft}>
              <Text style={styles.appointmentProfessional}>
                {appointment.nomeProfissional || 'Profissional'}
              </Text>
              {appointment.especialidade && (
                <Text style={styles.appointmentSpecialty}>{appointment.especialidade}</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
            </View>
          </View>

          <View style={styles.appointmentDetails}>
            <View style={styles.appointmentDetail}>
              <Ionicons name="calendar-outline" size={18} color="#2196F3" />
              <Text style={styles.appointmentDetailText}>
                {formatDate(appointment.dataConsulta)}
              </Text>
            </View>
            <View style={styles.appointmentDetail}>
              <Ionicons name="time-outline" size={18} color="#2196F3" />
              <Text style={styles.appointmentDetailText}>
                {formatTime(appointment.dataConsulta)}
              </Text>
            </View>
            {appointment.nomeClinica && (
              <View style={styles.appointmentDetail}>
                <Ionicons name="business-outline" size={18} color="#2196F3" />
                <Text style={styles.appointmentDetailText}>{appointment.nomeClinica}</Text>
              </View>
            )}
          </View>

          {canEdit && (
            <View style={styles.appointmentActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleRemarcar(appointment)}
              >
                <Ionicons name="calendar-outline" size={16} color="#2196F3" />
                <Text style={styles.actionButtonText}>Remarcar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelarClick(appointment)}
              >
                <Ionicons name="close-circle-outline" size={16} color="#F44336" />
                <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  const ProfessionalCard = ({ professional }: { professional: Professional }) => {
    const cardAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(cardAnim, {
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(cardAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: cardAnim }] }}>
        <TouchableOpacity 
          style={styles.professionalCard}
          onPress={() => {
            setSelectedProfessional(professional);
            setModalVisible(true);
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {professional.foto || professional.fotoURL || professional.photo ? (
            <Image
              source={{
                uri: professional.fotoURL || professional.foto || professional.photo || 
                     (professional.foto?.startsWith('http') 
                       ? professional.foto 
                       : professional.foto?.startsWith('/')
                         ? `http://192.168.15.127:3001${professional.foto}`
                         : professional.foto)
              }}
              style={styles.professionalImage}
              onError={() => {}}
            />
          ) : (
            <LinearGradient
              colors={['#E3F2FD', '#F3E5F5']}
              style={styles.professionalImage}
            >
              <Ionicons name="person" size={32} color="#2196F3" />
            </LinearGradient>
          )}
          <View style={styles.professionalInfo}>
            <Text style={styles.professionalName}>{professional.name}</Text>
            <Text style={styles.professionalSpecialty}>{professional.specialty}</Text>
            {professional.endereco && (
              <Text style={[styles.professionalSpecialty, { fontSize: 11, color: '#666', marginTop: 2 }]}>
                <Ionicons name="location-outline" size={11} color="#666" /> {professional.endereco}
              </Text>
            )}
            {professional.clinicaEndereco && (
              <Text style={[styles.professionalSpecialty, { fontSize: 11, color: '#666', marginTop: 2 }]}>
                <Ionicons name="location-outline" size={11} color="#666" /> {professional.clinicaEndereco}
              </Text>
            )}
            {professional.rating !== undefined && professional.rating !== null && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{professional.rating}</Text>
                {professional.reviews !== undefined && professional.reviews !== null && (
                  <Text style={styles.reviewsText}>({professional.reviews})</Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ProfessionalModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {selectedProfessional && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Perfil do Profissional</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.professionalHeader}>
                  <LinearGradient
                    colors={['#4CAF50', '#2196F3']}
                    style={styles.modalProfessionalImage}
                  >
                    <Ionicons name="person" size={40} color="white" />
                  </LinearGradient>
                  <View style={styles.professionalHeaderInfo}>
                    <Text style={styles.modalProfessionalName}>{selectedProfessional.name}</Text>
                    <Text style={styles.modalProfessionalSpecialty}>{selectedProfessional.specialty}</Text>
                    {selectedProfessional.rating !== undefined && selectedProfessional.rating !== null && (
                      <View style={styles.modalRatingContainer}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.modalRatingText}>{selectedProfessional.rating}</Text>
                        {selectedProfessional.reviews !== undefined && selectedProfessional.reviews !== null && (
                          <Text style={styles.modalReviewsText}>({selectedProfessional.reviews} avaliações)</Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {(selectedProfessional.description || selectedProfessional.bio || selectedProfessional.descricao || selectedProfessional.biografia) && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Sobre</Text>
                    <Text style={styles.infoText}>
                      {selectedProfessional.description || selectedProfessional.bio || selectedProfessional.descricao || selectedProfessional.biografia || ''}
                    </Text>
                  </View>
                )}

                {selectedProfessional.experience && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Experiência</Text>
                    <Text style={styles.infoText}>{selectedProfessional.experience}</Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.scheduleButton}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('Agendamento', { professional: selectedProfessional });
                  }}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#2196F3']}
                    style={styles.scheduleButtonGradient}
                  >
                    <Ionicons name="calendar" size={20} color="white" />
                    <Text style={styles.scheduleButtonText}>Agendar Consulta</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando...</Text>
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
            <View style={styles.headerLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {pacienteFoto && !pacienteFoto.startsWith('/media/') ? (
                  <Image 
                    source={{ 
                      uri: pacienteFoto?.startsWith('data:') || pacienteFoto?.startsWith('http://') || pacienteFoto?.startsWith('https://')
                        ? pacienteFoto 
                        : pacienteFoto?.startsWith('/')
                          ? `http://192.168.15.127:3001${pacienteFoto}`
                          : pacienteFoto?.startsWith('file://')
                            ? pacienteFoto
                            : `http://192.168.15.127:3001/${pacienteFoto}`
                    }} 
                    style={styles.profileAvatar}
                    onError={(e) => {
                      console.error('Erro ao carregar foto:', e.nativeEvent.error);
                      console.error('URI tentada:', pacienteFoto?.substring(0, 100));
                      setPacienteFoto(null);
                    }}
                  />
                ) : (
                  <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                    <Ionicons name="person" size={24} color="#2196F3" />
                  </View>
                )}
                <View>
                  <Text style={styles.greeting}>
                    {pacienteNome ? `Olá, ${pacienteNome.split(' ')[0]}!` : 'Bem-vindo!'}
                  </Text>
                  <Text style={styles.subtitle}>Como você está se sentindo hoje?</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#2196F3" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar médico, clínica, especialidade..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (!text.trim()) {
                    setShowSearchResults(false);
                    setSearchResults([]);
                  }
                }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>

            {/* Filtros - Sempre visíveis */}
            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                  <TouchableOpacity
                    style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
                    onPress={() => {
                      setFilterType('all');
                      // Buscar quando mudar filtro
                      setTimeout(() => handleSearch(), 100);
                    }}
                  >
                    <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
                      Todos
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, filterType === 'profissional' && styles.filterChipActive]}
                    onPress={() => {
                      setFilterType('profissional');
                      // Buscar quando mudar filtro
                      setTimeout(() => handleSearch(), 100);
                    }}
                  >
                    <Text style={[styles.filterChipText, filterType === 'profissional' && styles.filterChipTextActive]}>
                      Profissionais
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, filterType === 'clinica' && styles.filterChipActive]}
                    onPress={() => {
                      setFilterType('clinica');
                      // Buscar quando mudar filtro
                      setTimeout(() => handleSearch(), 100);
                    }}
                  >
                    <Text style={[styles.filterChipText, filterType === 'clinica' && styles.filterChipTextActive]}>
                      Clínicas
                    </Text>
                  </TouchableOpacity>
                  
                  {especialidades.length > 0 && (
                    <View style={styles.especialidadePicker}>
                      <Text style={styles.filterLabel}>Especialidade: </Text>
                      <TouchableOpacity
                        style={styles.especialidadeButton}
                        onPress={() => setShowEspecialidadeModal(true)}
                      >
                        <Text style={styles.especialidadeButtonText}>
                          {filterEspecialidade || 'Todas'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#2196F3" />
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>

            {/* Resultados da busca */}
            {showSearchResults && searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <ScrollView 
                  style={styles.searchResultsList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {searchResults.map((item, index) => (
                    <TouchableOpacity
                      key={item.id || item.name || `search-result-${index}`}
                      style={styles.searchResultItem}
                      onPress={() => {
                        if (item.tipo === 'clinica' && item.tipoResultado === 'Clínica') {
                          // Mostrar modal com médicos da clínica
                          handleClinicaClick(item);
                        } else {
                          // Navegar para agendamento com profissional selecionado
                          navigation.navigate('Agendamento', { professional: item });
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }
                      }}
                    >
                      <View style={styles.searchResultIcon}>
                        <Ionicons 
                          name={item.tipoResultado === 'Clínica' ? 'business' : 'person'} 
                          size={24} 
                          color="#2196F3" 
                        />
                      </View>
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{item.nome || item.name || 'Nome não informado'}</Text>
                        {item.especialidade && (
                          <Text style={styles.searchResultSpecialty}>{item.especialidade}</Text>
                        )}
                        {item.endereco && (
                          <Text style={[styles.searchResultSpecialty, { fontSize: 12, color: '#666', marginTop: 2 }]}>
                            <Ionicons name="location-outline" size={12} color="#666" /> {item.endereco}
                          </Text>
                        )}
                        {item.tipoResultado && (
                          <Text style={styles.searchResultType}>{item.tipoResultado}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>Nenhum resultado encontrado</Text>
              </View>
            )}
          </View>

          {/* Upcoming Appointments */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximas Consultas</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Historico')} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#CCC" />
                <Text style={styles.emptyStateText}>Nenhuma consulta agendada</Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('Agendamento')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyStateButtonText}>Agendar Primeira Consulta</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Featured Professionals */}
          {featuredProfessionals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Profissionais em Destaque</Text>
                <TouchableOpacity onPress={handleSearch} activeOpacity={0.7}>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={featuredProfessionals}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ProfessionalCard professional={item} />}
                contentContainerStyle={styles.professionalsList}
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <ProfessionalModal />

      {/* Modal de Cancelamento */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCancel}>
            <View style={styles.modalHeaderCancel}>
              <Text style={styles.modalTitleCancel}>Cancelar Consulta</Text>
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
                  <View style={styles.modalHeaderCancel}>
                    <Text style={styles.modalTitleCancel}>Selecione o motivo</Text>
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
                onPress={handleCancelar}
              >
                <Text style={styles.confirmModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Médicos da Clínica */}
      <Modal
        visible={showClinicaModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowClinicaModal(false);
          setSelectedClinica(null);
          setMedicosClinica([]);
          setEspecialidadesClinica([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <Ionicons name="business" size={24} color="#2196F3" />
                <Text style={styles.modalTitle}>
                  {selectedClinica?.nome || 'Médicos da Clínica'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowClinicaModal(false);
                setSelectedClinica(null);
                setMedicosClinica([]);
                setEspecialidadesClinica([]);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.clinicaModalBody}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {loadingMedicos ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.loadingText}>Carregando médicos...</Text>
                </View>
              ) : medicosClinica.length > 0 ? (
                <>
                  <Text style={styles.clinicaModalSubtitle}>
                    Selecione um médico para agendar sua consulta
                  </Text>
                  {especialidadesClinica.map((especialidade) => {
                    const medicosDaEspecialidade = medicosClinica.filter(
                      (m: any) => m.especialidade === especialidade
                    );
                    
                    return (
                      <View key={especialidade} style={styles.especialidadeSection}>
                        <View style={styles.especialidadeHeader}>
                          <Ionicons name="medical" size={20} color="#1976D2" />
                          <Text style={styles.especialidadeSectionTitle}>
                            {especialidade} ({medicosDaEspecialidade.length})
                          </Text>
                        </View>
                        {medicosDaEspecialidade.map((medico: any, index: number) => (
                          <TouchableOpacity
                            key={medico.id || `medico-${index}`}
                            style={styles.medicoCard}
                            onPress={() => {
                              setShowClinicaModal(false);
                              navigation.navigate('Agendamento', { 
                                professional: {
                                  id: medico.id,
                                  nome: medico.nome,
                                  especialidade: medico.especialidade,
                                  tipo: 'clinica',
                                  idClinica: medico.idClinica || selectedClinica?.id,
                                },
                                clinica: selectedClinica,
                              });
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            <View style={styles.medicoCardContent}>
                              <View style={styles.medicoIcon}>
                                <Ionicons name="person" size={24} color="#2196F3" />
                              </View>
                              <View style={styles.medicoInfo}>
                                <Text style={styles.medicoName}>{medico.nome || 'Nome não informado'}</Text>
                                {medico.especialidade && (
                                  <Text style={styles.medicoSpecialty}>{medico.especialidade}</Text>
                                )}
                                {medico.telefone && (
                                  <View style={styles.medicoContactRow}>
                                    <Ionicons name="call" size={14} color="#666" />
                                    <Text style={styles.medicoContact}>{medico.telefone}</Text>
                                  </View>
                                )}
                              </View>
                              <Ionicons name="chevron-forward" size={20} color="#CCC" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="medical-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyStateText}>
                    Nenhum médico encontrado nesta clínica
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Especialidade */}
      <Modal
        visible={showEspecialidadeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEspecialidadeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por Especialidade</Text>
              <TouchableOpacity onPress={() => setShowEspecialidadeModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.especialidadeModalBody}>
              <TouchableOpacity
                style={[
                  styles.especialidadeModalItem,
                  !filterEspecialidade && styles.especialidadeModalItemActive
                ]}
                onPress={() => {
                  setFilterEspecialidade('');
                  setShowEspecialidadeModal(false);
                  setTimeout(() => handleSearch(), 100);
                }}
              >
                <Text style={[
                  styles.especialidadeModalItemText,
                  !filterEspecialidade && styles.especialidadeModalItemTextActive
                ]}>
                  Todas
                </Text>
                {!filterEspecialidade && (
                  <Ionicons name="checkmark" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>

              {especialidades.map((esp) => (
                <TouchableOpacity
                  key={esp}
                  style={[
                    styles.especialidadeModalItem,
                    filterEspecialidade === esp && styles.especialidadeModalItemActive
                  ]}
                  onPress={() => {
                    setFilterEspecialidade(esp);
                    setShowEspecialidadeModal(false);
                    setTimeout(() => handleSearch(), 100);
                  }}
                >
                  <Text style={[
                    styles.especialidadeModalItemText,
                    filterEspecialidade === esp && styles.especialidadeModalItemTextActive
                  ]}>
                    {esp}
                  </Text>
                  {filterEspecialidade === esp && (
                    <Ionicons name="checkmark" size={20} color="#2196F3" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
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
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondaryDark,
    fontWeight: '500',
  },
  profileButton: {
    padding: 8,
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  filtersContainer: {
    marginTop: 10,
  },
  filtersScroll: {
    maxHeight: 50,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: 'white',
  },
  especialidadePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  especialidadeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  especialidadeButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginRight: 4,
  },
  searchResultsContainer: {
    marginTop: 10,
    backgroundColor: 'white',
    borderRadius: 15,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  searchResultsList: {
    padding: 10,
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  searchResultSpecialty: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
    fontWeight: '500',
  },
  searchResultType: {
    fontSize: 12,
    color: '#888',
  },
  noResultsContainer: {
    marginTop: 10,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#888',
  },
  // Estilos do modal de cancelamento
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentCancel: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeaderCancel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 15,
  },
  modalTitleCancel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976D2',
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
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976D2',
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  appointmentCard: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    transform: [{ scale: 1 }],
  },
  appointmentCardGradient: {
    padding: 18,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentHeaderLeft: {
    flex: 1,
  },
  appointmentProfessional: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  appointmentSpecialty: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  appointmentDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    gap: 6,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.2)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    borderColor: 'rgba(244, 67, 54, 0.2)',
  },
  cancelButtonText: {
    color: '#F44336',
  },
  professionalsList: {
    paddingVertical: 10,
  },
  professionalCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  professionalImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: '#888',
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
    fontWeight: '500',
  },
  emptyStateButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
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
    maxHeight: '85%',
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalProfessionalImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  professionalHeaderInfo: {
    flex: 1,
  },
  modalProfessionalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  modalProfessionalSpecialty: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  modalRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
    marginRight: 4,
  },
  modalReviewsText: {
    fontSize: 14,
    color: '#888',
  },
  infoSection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    paddingHorizontal: 4,
  },
  scheduleButton: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  scheduleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
  },
  scheduleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Estilos do modal de clínica
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clinicaModalBody: {
    maxHeight: 500,
    paddingHorizontal: 5,
  },
  clinicaModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  especialidadeSection: {
    marginBottom: 20,
  },
  especialidadeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E3F2FD',
    gap: 8,
  },
  especialidadeSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
  },
  medicoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  medicoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  medicoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicoInfo: {
    flex: 1,
  },
  medicoName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  medicoSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  medicoContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  medicoContact: {
    fontSize: 12,
    color: '#888',
  },
  // Estilos do modal de especialidade
  especialidadeModalBody: {
    maxHeight: 400,
  },
  especialidadeModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  especialidadeModalItemActive: {
    backgroundColor: '#E3F2FD',
  },
  especialidadeModalItemText: {
    fontSize: 16,
    color: '#333',
  },
  especialidadeModalItemTextActive: {
    color: '#2196F3',
    fontWeight: '700',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileAvatarPlaceholder: {
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DashboardScreen;

