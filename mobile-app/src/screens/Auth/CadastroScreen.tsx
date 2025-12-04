import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Animated, 
  StyleSheet, 
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Easing
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../api/config';

const { width, height } = Dimensions.get('window');

const CadastroScreen: React.FC = () => {
  const route = useRoute();
  const tipo = (route.params as any)?.tipo || 'paciente';
  const navigation = useNavigation<any>();

  // Campos comuns
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Paciente
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [planoSaude, setPlanoSaude] = useState('');

  // Profissional
  const [especialidade, setEspecialidade] = useState('');
  const [crm, setCrm] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefoneProf, setTelefoneProf] = useState('');

  // Estados para visibilidade de senha e loading
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animações
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
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })
    ]).start();
  }, []);

  const handlePressIn = (buttonAnim: Animated.Value) => {
    Animated.spring(buttonAnim, {
      toValue: 0.95,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = (buttonAnim: Animated.Value) => {
    Animated.spring(buttonAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  const AnimatedButton = ({ title, onPress, colors, icon, disabled = false }: any) => {
    const buttonAnim = useRef(new Animated.Value(1)).current;

    return (
      <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
        <TouchableOpacity
          onPressIn={() => !disabled && handlePressIn(buttonAnim)}
          onPressOut={() => !disabled && handlePressOut(buttonAnim)}
          onPress={disabled ? undefined : onPress}
          activeOpacity={disabled ? 1 : 0.9}
          disabled={disabled}
        >
          <LinearGradient
            colors={disabled ? ['#cccccc', '#999999'] : colors}
            style={[styles.primaryButton, disabled && styles.disabledButton]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name={icon} size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>{title}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validarCampos = () => {
    if (!nomeCompleto.trim()) {
      Alert.alert('Erro', 'Por favor, informe seu nome completo.');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, informe seu email.');
      return false;
    }

    if (!validarEmail(email)) {
      Alert.alert('Erro', 'Por favor, informe um email válido.');
      return false;
    }

    if (!senha) {
      Alert.alert('Erro', 'Por favor, informe uma senha.');
      return false;
    }

    if (senha.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não conferem.');
      return false;
    }

    if (tipo === 'paciente') {
      if (!dataNascimento || !telefone || !cpf || !endereco) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios do paciente.');
        return false;
      }
    } else {
      if (!especialidade || !crm || !cpfCnpj || !telefoneProf) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios do profissional.');
        return false;
      }
    }

    return true;
  };

  const handleCadastro = async () => {
    if (!validarCampos()) return;

    setIsLoading(true);

    // Preparar payload baseado no tipo
    const basePayload = {
      nome: nomeCompleto.trim(),
      email: email.toLowerCase().trim(),
      password: senha,
      perfil: tipo,
      telefone: tipo === 'paciente' ? telefone : telefoneProf,
      cpf: tipo === 'paciente' ? cpf.replace(/\D/g, '') : cpfCnpj.replace(/\D/g, ''),
      dataNascimento: dataNascimento || null,
      endereco: endereco || null,
      planoSaude: planoSaude || null,
      especialidade: especialidade || null,
      crm: crm || null,
    };

    console.log('📤 Enviando dados para cadastro:', basePayload);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(basePayload),
      });

      const responseData = await response.json();
      console.log('📥 Resposta do servidor:', { status: response.status, data: responseData });

      if (response.ok) {
        Alert.alert(
          'Sucesso!', 
          'Cadastro realizado com sucesso! Você já pode fazer login.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        const errorMessage = responseData.message || responseData.error || 'Erro ao realizar cadastro';
        console.log('❌ Erro detalhado:', responseData);
        Alert.alert('Erro no cadastro', errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Erro de conexão:', error);
      Alert.alert(
        'Erro de conexão', 
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Funções para formatação
  const formatarCPF = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length <= 3) {
        return numbers;
      } else if (numbers.length <= 6) {
        return numbers.replace(/(\d{3})(\d+)/, '$1.$2');
      } else if (numbers.length <= 9) {
        return numbers.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
      } else {
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
      }
    }
    return numbers.substring(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatarTelefone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 10) {
      if (numbers.length <= 2) {
        return numbers;
      } else if (numbers.length <= 6) {
        return numbers.replace(/(\d{2})(\d+)/, '($1) $2');
      } else if (numbers.length <= 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
      }
    } else {
      if (numbers.length <= 2) {
        return numbers;
      } else if (numbers.length <= 7) {
        return numbers.replace(/(\d{2})(\d+)/, '($1) $2');
      } else {
        return numbers.replace(/(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
      }
    }
    return numbers;
  };

  // Formatação de CPF/CNPJ combinado
  const formatarCPFCNPJ = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 11) {
      // Formata como CPF: XXX.XXX.XXX-XX
      if (numbers.length <= 3) {
        return numbers;
      } else if (numbers.length <= 6) {
        return numbers.replace(/(\d{3})(\d+)/, '$1.$2');
      } else if (numbers.length <= 9) {
        return numbers.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
      } else {
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
      }
    } else {
      // Formata como CNPJ: XX.XXX.XXX/XXXX-XX
      if (numbers.length <= 2) {
        return numbers;
      } else if (numbers.length <= 5) {
        return numbers.replace(/(\d{2})(\d+)/, '$1.$2');
      } else if (numbers.length <= 8) {
        return numbers.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
      } else if (numbers.length <= 12) {
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
      } else {
        const formatted = numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
        return formatted.substring(0, 18); // Limita ao tamanho máximo do CNPJ formatado
      }
    }
  };

  // Formatação de CRM: XXXXX ou XXXXX-XX
  const formatarCRM = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    } else {
      return numbers.replace(/(\d{5})(\d+)/, '$1-$2');
    }
  };

  // Formatação de data de nascimento: DD/MM/AAAA
  const formatarDataNascimento = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return numbers.replace(/(\d{2})(\d+)/, '$1/$2');
    } else {
      return numbers.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3').substring(0, 10);
    }
  };

  // Correção automática de especialidade
  const corrigirEspecialidade = (valor: string): string => {
    const valorTrim = valor.trim();
    if (!valorTrim) return valor;

    const especialidades: { [key: string]: string } = {
      'cardiologista': 'Cardiologia', 'cardio': 'Cardiologia',
      'dermatologista': 'Dermatologia', 'dermatol': 'Dermatologia',
      'endocrinologista': 'Endocrinologia', 'endocrino': 'Endocrinologia',
      'gastroenterologista': 'Gastroenterologia', 'gastro': 'Gastroenterologia',
      'ginecologista': 'Ginecologia', 'gineco': 'Ginecologia',
      'neurologista': 'Neurologia', 'neuro': 'Neurologia',
      'oftalmologista': 'Oftalmologia', 'oftalmo': 'Oftalmologia',
      'ortopedista': 'Ortopedia', 'ortopedia': 'Ortopedia',
      'otorrinolaringologista': 'Otorrinolaringologia', 'otorrino': 'Otorrinolaringologia',
      'pediatra': 'Pediatria', 'pediatria': 'Pediatria',
      'psiquiatra': 'Psiquiatria', 'psiquiatria': 'Psiquiatria',
      'urologista': 'Urologia', 'urologia': 'Urologia',
      'clinica geral': 'Clínica Geral', 'clinico geral': 'Clínica Geral', 'geral': 'Clínica Geral',
      'cirurgia': 'Cirurgia Geral', 'cirurgiao': 'Cirurgia Geral',
      'oncologista': 'Oncologia', 'oncologia': 'Oncologia',
      'geriatra': 'Geriatria', 'geriatria': 'Geriatria',
      'reumatologista': 'Reumatologia', 'reumatologia': 'Reumatologia',
      'pneumologista': 'Pneumologia', 'pneumologia': 'Pneumologia',
      'infectologista': 'Infectologia', 'infectologia': 'Infectologia',
      'nefrologista': 'Nefrologia', 'nefrologia': 'Nefrologia',
      'alergologista': 'Alergologia', 'alergologia': 'Alergologia',
      'hematologista': 'Hematologia', 'hematologia': 'Hematologia'
    };

    const normalizar = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const valorLower = normalizar(valorTrim);

    // Verifica mapeamento direto
    if (especialidades[valorLower]) {
      return especialidades[valorLower];
    }

    // Verifica correspondência exata (case-insensitive)
    const padronizadas = ['Cardiologia', 'Dermatologia', 'Endocrinologia', 'Gastroenterologia',
                         'Ginecologia', 'Neurologia', 'Oftalmologia', 'Ortopedia',
                         'Otorrinolaringologia', 'Pediatria', 'Psiquiatria', 'Urologia',
                         'Clínica Geral', 'Cirurgia Geral', 'Oncologia', 'Geriatria',
                         'Reumatologia', 'Pneumologia', 'Infectologia', 'Nefrologia',
                         'Alergologia', 'Hematologia'];

    for (const esp of padronizadas) {
      if (normalizar(esp) === valorLower) {
        return esp;
      }
    }

    return valor;
  };

  // Handler para especialidade com correção
  const handleEspecialidadeChange = (text: string) => {
    setEspecialidade(text);
  };

  const handleEspecialidadeBlur = () => {
    if (especialidade.trim()) {
      const corrigida = corrigirEspecialidade(especialidade);
      if (corrigida !== especialidade) {
        setEspecialidade(corrigida);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#E3F2FD" />
      
      <LinearGradient
        colors={['#E3F2FD', '#C8E6C9', '#B3E5FC']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim }
            ]
          }
        ]}>
          <View style={styles.header}>
            <LinearGradient
              colors={['#4CAF50', '#2196F3']}
              style={styles.logo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-add" size={32} color="white" />
            </LinearGradient>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>
              {tipo === 'paciente' ? 'Paciente' : 'Profissional'}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Informações Pessoais</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#2196F3" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nome completo *"
                placeholderTextColor="rgba(0, 0, 0, 0.5)"
                value={nomeCompleto}
                onChangeText={setNomeCompleto}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#2196F3" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email *"
                placeholderTextColor="rgba(0, 0, 0, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#2196F3" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha * (mín. 6 caracteres)"
                placeholderTextColor="rgba(0, 0, 0, 0.5)"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity 
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#2196F3" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#2196F3" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar senha *"
                placeholderTextColor="rgba(0, 0, 0, 0.5)"
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                secureTextEntry={!isConfirmPasswordVisible}
              />
              <TouchableOpacity 
                onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#2196F3" 
                />
              </TouchableOpacity>
            </View>

            {tipo === 'paciente' ? (
              <>
                <Text style={styles.sectionTitle}>Dados do Paciente</Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="calendar-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Data de nascimento * (DD/MM/AAAA)"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={dataNascimento}
                    onChangeText={(text) => setDataNascimento(formatarDataNascimento(text))}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Telefone *"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={telefone}
                    onChangeText={(text) => setTelefone(formatarTelefone(text))}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="document-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="CPF *"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={cpf}
                    onChangeText={(text) => setCpf(formatarCPF(text))}
                    keyboardType="numeric"
                    maxLength={14}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="home-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Endereço completo *"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={endereco}
                    onChangeText={setEndereco}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="medkit-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Plano de saúde"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={planoSaude}
                    onChangeText={setPlanoSaude}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Dados Profissionais</Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="medical-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Especialidade *"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={especialidade}
                    onChangeText={handleEspecialidadeChange}
                    onBlur={handleEspecialidadeBlur}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="id-card-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="CRM *"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={crm}
                    onChangeText={(text) => setCrm(formatarCRM(text))}
                    keyboardType="numeric"
                    maxLength={8}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="document-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="CPF/CNPJ *"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={cpfCnpj}
                    onChangeText={(text) => setCpfCnpj(formatarCPFCNPJ(text))}
                    keyboardType="numeric"
                    maxLength={18}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Telefone *"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    value={telefoneProf}
                    onChangeText={(text) => setTelefoneProf(formatarTelefone(text))}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <View style={styles.buttonContainer}>
              <AnimatedButton 
                title={isLoading ? "Cadastrando..." : "Criar Conta"}
                onPress={handleCadastro}
                colors={['#4CAF50', '#2196F3']}
                icon="person-add"
                disabled={isLoading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.backButton, isLoading && styles.disabledBackButton]}
              onPress={isLoading ? undefined : () => navigation.goBack()}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={16} color="#2196F3" />
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#388E3C',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 15,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    height: 60,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 5,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  disabledBackButton: {
    opacity: 0.5,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default CadastroScreen;