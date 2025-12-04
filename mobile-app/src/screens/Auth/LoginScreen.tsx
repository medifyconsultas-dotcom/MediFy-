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
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../api/config';
import { setAuthToken } from '../../services/api';
// Usar localStorage do React Native ou criar um wrapper
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

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<any>();
  
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

  const handleLogin = async () => {
    // Validação básica
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, informe seu email');
      return;
    }

    if (!senha.trim()) {
      Alert.alert('Erro', 'Por favor, informe sua senha');
      return;
    }

    // Validação de email básica
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Erro', 'Por favor, informe um email válido');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📤 Enviando dados para login:', { email: email.trim() });

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: senha,
        }),
      });

      const responseData = await response.json();
      console.log('📥 Resposta do servidor:', { status: response.status, data: responseData });

      if (response.ok) {
        // Salvar token
        const token = responseData.data?.token;
        if (token) {
          setAuthToken(token);
          // Salvar também no AsyncStorage para persistência
          try {
            await AsyncStorage.setItem('authToken', token);
            console.log('✅ Token salvo');
          } catch (storageError) {
            console.warn('⚠️ Erro ao salvar token no storage:', storageError);
          }
        }
        
        // Login bem-sucedido - navegar diretamente sem alerta
        const perfil = responseData.data?.user?.perfil || 'paciente';
        if (perfil === 'paciente') {
          navigation.navigate('DashboardPaciente');
        } else if (perfil === 'profissional') {
          navigation.navigate('DashboardProfissional');
        } else {
          // Fallback para paciente
          navigation.navigate('DashboardPaciente');
        }
      } else {
        const errorMessage = responseData.message || responseData.error || 'Erro ao fazer login';
        console.log('❌ Erro detalhado:', responseData);
        Alert.alert('Erro no login', errorMessage);
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

  const AnimatedButton = ({ title, onPress, colors, icon, variant = 'primary' }: any) => {
    const buttonAnim = useRef(new Animated.Value(1)).current;

    if (variant === 'secondary') {
      return (
        <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
          <TouchableOpacity
            onPressIn={() => handlePressIn(buttonAnim)}
            onPressOut={() => handlePressOut(buttonAnim)}
            onPress={onPress}
            style={styles.secondaryButton}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryButtonText}>{title}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
        <TouchableOpacity
          onPressIn={() => handlePressIn(buttonAnim)}
          onPressOut={() => handlePressOut(buttonAnim)}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={colors}
            style={styles.primaryButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={icon} size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>{title}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
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
              <Ionicons name="heart" size={32} color="white" />
            </LinearGradient>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Entre na sua conta para continuar</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#2196F3" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(0, 0, 0, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#2196F3" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
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

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              {isLoading ? (
                <LinearGradient
                  colors={['#4CAF50', '#2196F3']}
                  style={styles.loadingButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.loadingButtonText}>Entrando...</Text>
                </LinearGradient>
              ) : (
                <AnimatedButton 
                  title="Entrar na conta"
                  onPress={handleLogin}
                  colors={['#4CAF50', '#2196F3']}
                  icon="log-in"
                />
              )}
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <AnimatedButton 
              title="Criar nova conta"
              onPress={() => navigation.navigate('EscolhaCadastro')}
              variant="secondary"
            />

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={16} color="#2196F3" />
              <Text style={styles.backButtonText}>Voltar para o início</Text>
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
    marginBottom: 50,
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
    marginBottom: 10,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
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
  buttonIcon: {
    marginRight: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
  },
  dividerText: {
    color: '#388E3C',
    paddingHorizontal: 15,
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 14,
    marginLeft: 8,
  },
  loadingButton: {
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
  loadingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
});

export default LoginScreen;