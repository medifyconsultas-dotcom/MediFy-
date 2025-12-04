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
  Switch,
  Image,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pacienteAPI, getAuthToken } from '../../services/api';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import { colors } from '../../constants/colors';
import * as FileSystem from 'expo-file-system/legacy';

const { width, height } = Dimensions.get('window');

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  address: string;
  healthPlan: string;
  notifications: boolean;
  marketingEmails: boolean;
  foto?: string;
  fotoURL?: string;
}

const PerfilScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    address: '',
    healthPlan: '',
    notifications: true,
    marketingEmails: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fotoURL, setFotoURL] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadProfile();
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

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await pacienteAPI.getPerfil();
      
      if (response.success && response.data) {
        const data = response.data;
        
        // Formatar data de nascimento se existir (buscar em diferentes formatos)
        let birthDateFormatted = '';
        const dataNascimento = data.dataNascimento || data.data_nascimento || data.dataNasc || null;
        if (dataNascimento) {
          try {
            // Se for string ISO (do convertFirestoreTimestamps)
            if (typeof dataNascimento === 'string') {
              if (dataNascimento.includes('T')) {
                // Formato ISO: YYYY-MM-DDTHH:mm:ss.sssZ
                const date = new Date(dataNascimento);
                birthDateFormatted = date.toLocaleDateString('pt-BR');
              } else if (dataNascimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Formato YYYY-MM-DD
                const [year, month, day] = dataNascimento.split('-');
                birthDateFormatted = `${day}/${month}/${year}`;
              } else {
                birthDateFormatted = dataNascimento;
              }
            } else if (dataNascimento.toDate && typeof dataNascimento.toDate === 'function') {
              const date = dataNascimento.toDate();
              birthDateFormatted = date.toLocaleDateString('pt-BR');
            } else if (dataNascimento instanceof Date) {
              birthDateFormatted = dataNascimento.toLocaleDateString('pt-BR');
            } else {
              birthDateFormatted = String(dataNascimento);
            }
          } catch (e) {
            console.error('Erro ao formatar data de nascimento:', e);
            birthDateFormatted = String(dataNascimento || '');
          }
        }
        
        // Formatar CPF se existir
        let cpfFormatted = data.cpf || '';
        if (cpfFormatted && cpfFormatted.length === 11) {
          cpfFormatted = cpfFormatted.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        
        // Formatar telefone se existir
        let phoneFormatted = data.telefone || '';
        if (phoneFormatted && phoneFormatted.length === 11) {
          phoneFormatted = phoneFormatted.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (phoneFormatted && phoneFormatted.length === 10) {
          phoneFormatted = phoneFormatted.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        
        // Verificar se a foto é uma URL válida ou base64
        const foto = data.foto || data.fotoURL || null;
        let fotoUrlFinal = null;
        
        if (foto) {
          // Se começa com http ou https, é uma URL
          if (foto.startsWith('http://') || foto.startsWith('https://')) {
            fotoUrlFinal = foto;
          } 
          // Se começa com data:image, é base64
          else if (foto.startsWith('data:image')) {
            fotoUrlFinal = foto;
          }
          // Se começa com /media/, é uma URL relativa do Django
          // Para mobile, precisamos converter para URL completa ou usar base64
          // Por enquanto, vamos tentar carregar como base64 do backend se possível
          else if (foto.startsWith('/media/')) {
            // URLs relativas do Django não funcionam bem no mobile
            // Vamos tentar construir uma URL completa ou ignorar
            // O ideal é que o backend retorne base64 ou URL completa
            console.warn('⚠️ URL relativa detectada, pode não funcionar no mobile:', foto);
            fotoUrlFinal = null; // Não exibir URLs relativas no mobile
          }
          // Caso contrário, assumir que é base64
          else {
            fotoUrlFinal = foto.startsWith('data:') ? foto : `data:image/jpeg;base64,${foto}`;
          }
        }
        
        // Buscar endereço e plano em diferentes formatos (compatibilidade mobile/web)
        const endereco = data.endereco || data.endereço || '';
        const plano = data.plano || data.planoSaude || data.plano_saude || '';
        
        console.log('📋 Dados carregados do backend:', {
          nome: data.nome,
          endereco: endereco,
          enderecoOriginal: data.endereco,
          endereçoOriginal: data.endereço,
          dataNascimento: dataNascimento,
          dataNascimentoOriginal: data.dataNascimento,
          data_nascimentoOriginal: data.data_nascimento,
          plano: plano,
          planoOriginal: data.plano,
          planoSaudeOriginal: data.planoSaude,
          foto: data.foto ? 'Sim' : 'Não',
          todosCampos: Object.keys(data),
        });
        
        setProfile({
          name: data.nome || '',
          email: data.email || '',
          phone: phoneFormatted,
          cpf: cpfFormatted,
          birthDate: birthDateFormatted,
          address: endereco,
          healthPlan: plano,
          notifications: data.notificacoes !== undefined ? data.notificacoes : true,
          marketingEmails: data.marketingEmails !== undefined ? data.marketingEmails : false,
          foto: fotoUrlFinal,
          fotoURL: fotoUrlFinal,
        });
        
        console.log('✅ Perfil atualizado no estado:', {
          name: data.nome || '',
          address: endereco,
          birthDate: birthDateFormatted,
          healthPlan: plano,
          foto: fotoUrlFinal ? 'Sim' : 'Não',
        });
        
        setFotoURL(fotoUrlFinal);
        console.log('📸 Foto carregada:', fotoUrlFinal ? 'Sim' : 'Não', fotoUrlFinal?.substring(0, 50));
      } else {
        Alert.alert('Erro', 'Não foi possível carregar o perfil.');
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar o perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.name || !profile.email) {
      Alert.alert('Erro', 'Nome e email são obrigatórios.');
      return;
    }

    setIsLoading(true);

    try {
      // Preparar dados para envio
      const updateData: any = {
        nome: profile.name,
        email: profile.email,
        telefone: profile.phone.replace(/\D/g, ''),
        endereco: profile.address || null,
        plano: profile.healthPlan || null,
        planoSaude: profile.healthPlan || null,
        notificacoes: profile.notifications,
        marketingEmails: profile.marketingEmails,
      };
      
      // Se tem foto, incluir (garantir formato correto)
      // A foto já foi salva no Firestore quando fez upload, mas vamos garantir que seja mantida
      if (fotoURL && fotoURL.trim() && !fotoURL.startsWith('file://')) {
        updateData.foto = fotoURL;
        updateData.fotoURL = fotoURL;
      } else if (profile.foto && profile.foto.trim() && !profile.foto.startsWith('file://')) {
        // Se fotoURL não está disponível, usar a do profile
        updateData.foto = profile.foto;
        updateData.fotoURL = profile.foto;
      }
      
      // Formatar data de nascimento se existir
      if (profile.birthDate) {
        const [day, month, year] = profile.birthDate.split('/');
        if (day && month && year) {
          updateData.dataNascimento = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      
      const response = await pacienteAPI.updatePerfil(updateData);
      
      if (response.success) {
        Alert.alert('Sucesso!', 'Perfil atualizado com sucesso.');
        setIsEditing(false);
        // Recarregar perfil para garantir dados atualizados
        await loadProfile();
      } else {
        Alert.alert('Erro', response.message || 'Não foi possível salvar as alterações.');
      }
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', error.message || 'Não foi possível salvar as alterações.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Verificar se expo-image-picker está disponível
      let ImagePicker;
      try {
        ImagePicker = require('expo-image-picker');
      } catch (e) {
        Alert.alert(
          'Biblioteca necessária',
          'Para adicionar foto de perfil, instale o expo-image-picker:\n\nnpx expo install expo-image-picker'
        );
        return;
      }

      // Solicitar permissão
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos.');
        return;
      }

      // Abrir seletor de imagem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📷 Imagem selecionada:', imageUri);
        await uploadImage(imageUri);
      }
    } catch (error: any) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', error.message || 'Não foi possível selecionar a imagem.');
    }
  };

  const uploadImage = async (imageUri: string) => {
    setUploadingImage(true);
    try {
      console.log('📤 Iniciando upload de imagem:', imageUri.substring(0, 50));
      
      // Redimensionar e comprimir a imagem antes de converter para base64
      let finalUri = imageUri;
      let ImageManipulator;
      try {
        ImageManipulator = require('expo-image-manipulator');
        console.log('✅ Redimensionando imagem...');
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 800 } }], // Redimensionar para largura máxima de 800px
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalUri = manipResult.uri;
        console.log('✅ Imagem redimensionada e comprimida');
      } catch (e) {
        console.warn('⚠️ expo-image-manipulator não disponível, usando imagem original');
      }
      
      let base64data: string;
      
      // Usar expo-file-system para ler a imagem como base64 (funciona no React Native)
      try {
        console.log('✅ Usando expo-file-system para ler imagem');
        base64data = await FileSystem.readAsStringAsync(finalUri, {
          encoding: 'base64' as any,
        });
        console.log('✅ Imagem convertida para base64, tamanho:', base64data.length);
      } catch (fsError: any) {
        console.error('❌ Erro ao ler imagem com expo-file-system:', fsError);
        
        // Fallback: tentar usar fetch + FileReader (pode funcionar em alguns casos)
        try {
          console.log('⚠️ Tentando método alternativo com fetch');
          const response = await fetch(finalUri);
          const blob = await response.blob();
          
          base64data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // Extrair apenas a parte base64 (sem o prefixo data:image)
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64);
            };
            reader.onerror = () => reject(new Error('Erro ao ler imagem com FileReader'));
            reader.readAsDataURL(blob);
          });
          
          console.log('✅ Imagem convertida para base64 via FileReader, tamanho:', base64data.length);
        } catch (fetchError: any) {
          console.error('❌ Erro ao converter imagem:', fetchError);
          throw new Error('Não foi possível converter a imagem. Verifique se a imagem é válida.');
        }
      }
      
      // Verificar tamanho (limitar a ~500KB de base64 = ~375KB de imagem)
      if (base64data.length > 700000) {
        Alert.alert('Imagem muito grande', 'Por favor, selecione uma imagem menor.');
        setUploadingImage(false);
        return;
      }
      
      // Processar e salvar
      await processBase64Image(base64data);
      
    } catch (error: any) {
      console.error('❌ Erro ao processar imagem:', error);
      Alert.alert('Erro', error.message || 'Não foi possível processar a imagem.');
      setUploadingImage(false);
    }
  };

  const processBase64Image = async (base64data: string) => {
    try {
      // Garantir que a foto seja uma string base64 válida com prefixo data:image
      let fotoBase64 = base64data;
      
      // Se não tem prefixo data:image, adicionar
      if (!fotoBase64.startsWith('data:image')) {
        // Remover prefixo se já existir
        const cleanBase64 = fotoBase64.replace(/^data:.*?;base64,/, '');
        fotoBase64 = `data:image/jpeg;base64,${cleanBase64}`;
      }
      
      console.log('📤 Salvando foto no Firestore...');
      
      // Salvar foto diretamente no Firestore via API
      const updateData: any = {
        foto: fotoBase64,
        fotoURL: fotoBase64,
      };
      
      const uploadResponse = await pacienteAPI.updatePerfil(updateData);
      
      if (uploadResponse.success && uploadResponse.data) {
        const fotoUrl = uploadResponse.data.foto || uploadResponse.data.fotoURL || fotoBase64;
        
        // Garantir que a foto seja uma string válida
        let fotoUrlFinal = fotoUrl;
        if (fotoUrl && !fotoUrl.startsWith('http') && !fotoUrl.startsWith('data:image')) {
          fotoUrlFinal = `data:image/jpeg;base64,${fotoUrl}`;
        }
        
        setFotoURL(fotoUrlFinal);
        setProfile({...profile, foto: fotoUrlFinal, fotoURL: fotoUrlFinal});
        Alert.alert('Sucesso!', 'Foto de perfil atualizada com sucesso e sincronizada com o web.');
        console.log('✅ Foto salva no Firestore:', fotoUrlFinal?.substring(0, 50));
        
        // Recarregar perfil para garantir sincronização
        await loadProfile();
        setUploadingImage(false);
      } else {
        throw new Error(uploadResponse.message || 'Não foi possível salvar a foto. Tente novamente.');
      }
    } catch (error: any) {
      console.error('❌ Erro ao fazer upload:', error);
      Alert.alert('Erro', error.message || 'Não foi possível salvar a foto. Tente novamente.');
      setUploadingImage(false);
      throw error;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implementar logout
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  // Função para formatar data de nascimento enquanto digita (DD/MM/AAAA)
  const formatBirthDate = (text: string) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Limita a 8 dígitos
    const limited = numbers.slice(0, 8);
    
    // Formata: DD/MM/AAAA
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  const ProfileField = ({ label, value, editable, onChange, placeholder, keyboardType = 'default', formatValue }: any) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing && editable ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={(text) => {
            const formatted = formatValue ? formatValue(text) : text;
            onChange(formatted);
          }}
          placeholder={placeholder}
          placeholderTextColor="#888"
          keyboardType={keyboardType}
          maxLength={keyboardType === 'phone-pad' && label === 'Data de Nascimento' ? 10 : undefined}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || 'Não informado'}</Text>
      )}
    </View>
  );

  const SettingSwitch = ({ label, value, onValueChange }: any) => (
    <View style={styles.setting}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={value ? '#2196F3' : '#f4f3f4'}
      />
    </View>
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
            <Text style={styles.title}>Meu Perfil</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Ionicons 
                name={isEditing ? "close" : "create-outline"} 
                size={24} 
                color="#2196F3" 
              />
            </TouchableOpacity>
          </View>

          {/* Foto e Informações Básicas */}
          <View style={styles.profileSection}>
            <TouchableOpacity 
              onPress={handlePickImage}
              disabled={uploadingImage}
              style={styles.profileImageContainer}
              activeOpacity={0.8}
            >
              {fotoURL && fotoURL.trim() ? (
                <Image 
                  source={{ 
                    uri: fotoURL.startsWith('data:') 
                      ? fotoURL 
                      : fotoURL.startsWith('http://') || fotoURL.startsWith('https://')
                        ? fotoURL 
                        : fotoURL.startsWith('/')
                          ? `http://192.168.15.127:8000${fotoURL}`
                          : `data:image/jpeg;base64,${fotoURL}`
                  }} 
                  style={styles.profileImage}
                  onError={(e) => {
                    console.error('❌ Erro ao carregar imagem:', e.nativeEvent.error);
                    console.error('URI da imagem:', fotoURL?.substring(0, 100));
                    setFotoURL(null);
                    setProfile({...profile, foto: null, fotoURL: null});
                  }}
                  onLoad={() => {
                    console.log('✅ Imagem carregada com sucesso');
                  }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#4CAF50', '#2196F3']}
                  style={styles.profileImage}
                >
                  <Ionicons name="person" size={40} color="white" />
                </LinearGradient>
              )}
              <View style={styles.profileImageOverlay}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="camera" size={20} color="white" />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name || 'Nome não informado'}</Text>
              <Text style={styles.profileEmail}>{profile.email || 'Email não informado'}</Text>
              <TouchableOpacity 
                onPress={handlePickImage}
                disabled={uploadingImage}
                style={styles.changePhotoButton}
              >
                <Text style={styles.changePhotoText}>
                  {fotoURL ? 'Trocar foto' : 'Adicionar foto'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Informações Pessoais */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações Pessoais</Text>
            
            <ProfileField
              label="Nome Completo"
              value={profile.name}
              editable={true}
              onChange={(text: string) => setProfile({...profile, name: text})}
              placeholder="Seu nome completo"
            />

            <ProfileField
              label="Email"
              value={profile.email}
              editable={true}
              onChange={(text: string) => setProfile({...profile, email: text})}
              placeholder="seu@email.com"
              keyboardType="email-address"
            />

            <ProfileField
              label="Telefone"
              value={profile.phone}
              editable={true}
              onChange={(text: string) => setProfile({...profile, phone: text})}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
            />

            <ProfileField
              label="CPF"
              value={profile.cpf}
              editable={false}
              onChange={() => {}}
            />

            <ProfileField
              label="Data de Nascimento"
              value={profile.birthDate}
              editable={true}
              onChange={(text: string) => setProfile({...profile, birthDate: text})}
              placeholder="DD/MM/AAAA"
              formatValue={formatBirthDate}
            />
          </View>

          {/* Informações de Saúde */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações de Saúde</Text>
            
            <ProfileField
              label="Endereço"
              value={profile.address}
              editable={true}
              onChange={(text: string) => setProfile({...profile, address: text})}
              placeholder="Seu endereço completo"
            />

            <ProfileField
              label="Plano de Saúde"
              value={profile.healthPlan}
              editable={true}
              onChange={(text: string) => setProfile({...profile, healthPlan: text})}
              placeholder="Nome do seu plano de saúde"
            />
          </View>

          {/* Configurações */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurações</Text>
            
            <SettingSwitch
              label="Notificações"
              value={profile.notifications}
              onValueChange={(value: boolean) => setProfile({...profile, notifications: value})}
            />

            <SettingSwitch
              label="Emails de Marketing"
              value={profile.marketingEmails}
              onValueChange={(value: boolean) => setProfile({...profile, marketingEmails: value})}
            />
          </View>

          {/* Botões de Ação */}
          {isEditing ? (
            <TouchableOpacity 
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#4CAF50', '#2196F3']}
                style={styles.saveButtonGradient}
              >
                {isLoading ? (
                  <Text style={styles.saveButtonText}>Salvando...</Text>
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#F44336" />
            <Text style={styles.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

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
  editButton: {
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
  profileImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  changePhotoButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  changePhotoText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 15,
  },
  field: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  fieldInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    marginBottom: 15,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 25,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  logoutButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PerfilScreen;