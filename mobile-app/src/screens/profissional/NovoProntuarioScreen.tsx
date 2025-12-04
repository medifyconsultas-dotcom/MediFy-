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
  Animated
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { profissionalAPI, getAuthToken, setAuthToken } from '../../services/api';
import { colors } from '../../constants/colors';

const NovoProntuarioScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [searchPaciente, setSearchPaciente] = useState('');
  const [showPacientesList, setShowPacientesList] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Campos do prontuário
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    anamnese: '',
    exame_fisico: '',
    sinais_vitais: '',
    diagnosticos: '',
    prescricoes: '',
    medicamentos: '',
    alergias: '',
    antecedentes: '',
    exames_solicitados: '',
    plano: '',
    follow_up: '',
    observacoes: '',
  });

  useEffect(() => {
    // Se vier da navegação com paciente já selecionado
    if (route.params?.idPaciente && route.params?.nomePaciente) {
      setSelectedPaciente({
        id: route.params.idPaciente,
        nome: route.params.nomePaciente
      });
    } else {
      loadPacientes();
    }
    
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

  const handleCreateProntuario = async () => {
    if (!selectedPaciente) {
      Alert.alert('Atenção', 'Selecione um paciente');
      return;
    }

    setLoading(true);
    try {
      await profissionalAPI.createProntuario({
        idPaciente: selectedPaciente.id,
        ...formData,
      });

      Alert.alert('Sucesso', 'Prontuário criado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Erro ao criar prontuário:', error);
      Alert.alert('Erro', error.message || 'Não foi possível criar o prontuário.');
    } finally {
      setLoading(false);
    }
  };

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome?.toLowerCase().includes(searchPaciente.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchPaciente.toLowerCase())
  );

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9FC" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 75 }}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.headerTitle}>Novo Prontuário</Text>
          </View>

          <View style={styles.form}>
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
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={formData.titulo}
              onChangeText={(value) => updateFormData('titulo', value)}
              placeholder="Título do prontuário"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Conteúdo</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.conteudo}
              onChangeText={(value) => updateFormData('conteudo', value)}
              placeholder="Conteúdo do prontuário..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Anamnese</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.anamnese}
              onChangeText={(value) => updateFormData('anamnese', value)}
              placeholder="Anamnese..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Exame Físico</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.exame_fisico}
              onChangeText={(value) => updateFormData('exame_fisico', value)}
              placeholder="Exame físico..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Sinais Vitais</Text>
            <TextInput
              style={styles.input}
              value={formData.sinais_vitais}
              onChangeText={(value) => updateFormData('sinais_vitais', value)}
              placeholder="Sinais vitais..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Diagnósticos</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.diagnosticos}
              onChangeText={(value) => updateFormData('diagnosticos', value)}
              placeholder="Diagnósticos..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Prescrições</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.prescricoes}
              onChangeText={(value) => updateFormData('prescricoes', value)}
              placeholder="Prescrições..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Medicamentos</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.medicamentos}
              onChangeText={(value) => updateFormData('medicamentos', value)}
              placeholder="Medicamentos..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Alergias</Text>
            <TextInput
              style={styles.input}
              value={formData.alergias}
              onChangeText={(value) => updateFormData('alergias', value)}
              placeholder="Alergias..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Antecedentes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.antecedentes}
              onChangeText={(value) => updateFormData('antecedentes', value)}
              placeholder="Antecedentes..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Exames Solicitados</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.exames_solicitados}
              onChangeText={(value) => updateFormData('exames_solicitados', value)}
              placeholder="Exames solicitados..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Plano</Text>
            <TextInput
              style={styles.input}
              value={formData.plano}
              onChangeText={(value) => updateFormData('plano', value)}
              placeholder="Plano de tratamento..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Follow-up / Retorno</Text>
            <TextInput
              style={styles.input}
              value={formData.follow_up}
              onChangeText={(value) => updateFormData('follow_up', value)}
              placeholder="Follow-up / Retorno..."
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.observacoes}
              onChangeText={(value) => updateFormData('observacoes', value)}
              placeholder="Observações gerais..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleCreateProntuario}
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
                  <Text style={styles.saveButtonText}>Criar Prontuário</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1976D2',
  },
  form: {
    gap: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  placeholder: {
    color: '#999',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  clearButton: {
    marginLeft: 'auto',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
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
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
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
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
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
});

export default NovoProntuarioScreen;

