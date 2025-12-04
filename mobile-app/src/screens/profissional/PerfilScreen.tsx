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
  Modal,
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// Nota: Para usar o seletor de imagens, instale: npx expo install expo-image-picker
// import * as ImagePicker from 'expo-image-picker';
import { profissionalAPI, getAuthToken, setAuthToken } from '../../services/api';
import BottomTabNavigator from '../../components/BottomTabNavigator';

const { width, height } = Dimensions.get('window');

interface Profissional {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  especialidade: string;
  crm?: string;
  endereco?: string;
  bio?: string;
  valorConsulta?: string;
  fotoPerfil?: string;
  notificacoes?: boolean;
  marketing?: boolean;
}

const PerfilScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [profissional, setProfissional] = useState<Profissional>({
    nome: '',
    email: '',
    telefone: '',
    especialidade: '',
    crm: '',
    endereco: '',
    bio: '',
    valorConsulta: '',
    fotoPerfil: '',
    notificacoes: true,
    marketing: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
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
    setIsLoadingProfile(true);
    try {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      const response = await profissionalAPI.getPerfil();
      
      if (response.success && response.data) {
        setProfissional({
          id: response.data.id,
          nome: response.data.nome || '',
          email: response.data.email || '',
          telefone: response.data.telefone || '',
          especialidade: response.data.especialidade || '',
          crm: response.data.crm || '',
          endereco: response.data.endereco || '',
          bio: response.data.bio || response.data.descricao || '',
          valorConsulta: response.data.valorConsulta || '',
          fotoPerfil: response.data.fotoPerfil || response.data.foto || '',
          notificacoes: response.data.notificacoes !== undefined ? response.data.notificacoes : true,
          marketing: response.data.marketing !== undefined ? response.data.marketing : false,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar o perfil.');
    } finally {
      setIsLoadingProfile(false);
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
        quality: 0.5,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', error.message || 'Não foi possível selecionar a imagem.');
    }
  };

  const uploadImage = async (imageUri: string) => {
    setUploadingImage(true);
    try {
      // Redimensionar e comprimir a imagem antes de converter para base64
      let ImageManipulator;
      try {
        ImageManipulator = require('expo-image-manipulator');
      } catch (e) {
        // Se não tiver expo-image-manipulator, usar a imagem original
      }

      let finalUri = imageUri;
      if (ImageManipulator) {
        try {
          const manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 800 } }], // Redimensionar para largura máxima de 800px
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          finalUri = manipResult.uri;
        } catch (e) {
          console.warn('Erro ao redimensionar imagem, usando original:', e);
        }
      }

      // Converter imagem para base64
      const response = await fetch(finalUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          
          // Verificar tamanho do Base64 (aproximadamente 33% maior que o arquivo original)
          // Limitar a aproximadamente 500KB de Base64 (cerca de 375KB de imagem)
          if (base64data.length > 500000) {
            Alert.alert('Imagem muito grande', 'Por favor, selecione uma imagem menor.');
            setUploadingImage(false);
            return;
          }

          const token = getAuthToken();
          if (token) {
            setAuthToken(token);
          }

          // Atualizar perfil com a foto em base64
          const updateData = {
            ...profissional,
            fotoPerfil: base64data,
          };

          const apiResponse = await profissionalAPI.updatePerfil(updateData);
          
          if (apiResponse.success) {
            setProfissional({ ...profissional, fotoPerfil: base64data });
            Alert.alert('Sucesso!', 'Foto de perfil atualizada com sucesso.');
          } else {
            throw new Error(apiResponse.message || 'Erro ao fazer upload da imagem');
          }
        } catch (error: any) {
          console.error('Erro ao fazer upload da imagem:', error);
          if (error.message && error.message.includes('too large')) {
            Alert.alert('Erro', 'A imagem é muito grande. Por favor, selecione uma imagem menor.');
          } else {
            Alert.alert('Erro', error.message || 'Não foi possível fazer upload da imagem.');
          }
        } finally {
          setUploadingImage(false);
        }
      };
      
      reader.onerror = () => {
        setUploadingImage(false);
        Alert.alert('Erro', 'Não foi possível processar a imagem.');
      };
      
      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error('Erro ao processar imagem:', error);
      Alert.alert('Erro', 'Não foi possível processar a imagem.');
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!profissional.nome || !profissional.email || !profissional.especialidade) {
      Alert.alert('Erro', 'Nome, email e especialidade são obrigatórios.');
      return;
    }

    setIsLoading(true);

    try {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      const updateData: any = {
        nome: profissional.nome,
        email: profissional.email,
        telefone: profissional.telefone,
        especialidade: profissional.especialidade,
      };

      if (profissional.crm) updateData.crm = profissional.crm;
      if (profissional.endereco) updateData.endereco = profissional.endereco;
      if (profissional.bio) updateData.bio = profissional.bio;
      if (profissional.valorConsulta) updateData.valorConsulta = profissional.valorConsulta;
      // Só enviar fotoPerfil se for uma nova imagem (Base64) ou se não for uma URL
      // Se for uma URL (já está no servidor), não precisa enviar novamente
      if (profissional.fotoPerfil && (profissional.fotoPerfil.startsWith('data:') || profissional.fotoPerfil.length > 1000)) {
        updateData.fotoPerfil = profissional.fotoPerfil;
      }
      if (profissional.notificacoes !== undefined) updateData.notificacoes = profissional.notificacoes;
      if (profissional.marketing !== undefined) updateData.marketing = profissional.marketing;

      const response = await profissionalAPI.updatePerfil(updateData);
      
      if (response.success) {
        Alert.alert('Sucesso!', 'Perfil atualizado com sucesso.');
        setIsEditing(false);
        await loadProfile(); // Recarregar para garantir dados atualizados
      } else {
        throw new Error(response.message || 'Erro ao atualizar perfil');
      }
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', error.message || 'Não foi possível salvar as alterações.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // TODO: Implementar logout
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const ProfileField = ({ label, value, editable, onChange, placeholder, keyboardType = 'default', multiline = false }: any) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing && editable ? (
        <TextInput
          style={[styles.fieldInput, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#888"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
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

  const LogoutModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showLogoutModal}
      onRequestClose={() => setShowLogoutModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="log-out-outline" size={32} color="#F44336" />
            <Text style={styles.modalTitle}>Sair da Conta</Text>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalText}>
              Tem certeza que deseja sair da sua conta?
            </Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.logoutConfirmButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutConfirmText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9FC" />

      {isLoadingProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      ) : (
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Meu Perfil</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Ionicons 
                name={isEditing ? "close-outline" : "create-outline"} 
                size={24} 
                color="#2196F3" 
              />
            </TouchableOpacity>
          </View>

          {/* Foto e Informações Básicas */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              onPress={isEditing ? handlePickImage : undefined}
              disabled={!isEditing || uploadingImage}
              style={styles.profileImageContainer}
            >
              {profissional.fotoPerfil ? (
                <Image
                  source={{ uri: profissional.fotoPerfil }}
                  style={styles.profileImage}
                />
              ) : (
                <LinearGradient
                  colors={['#4CAF50', '#2196F3']}
                  style={styles.profileImage}
                >
                  <Ionicons name="person" size={40} color="white" />
                </LinearGradient>
              )}
              {isEditing && (
                <View style={styles.profileImageOverlay}>
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="camera" size={24} color="white" />
                  )}
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profissional.nome || 'Nome não informado'}</Text>
              <Text style={styles.profileSpecialty}>{profissional.especialidade || 'Especialidade não informada'}</Text>
              <Text style={styles.profileEmail}>{profissional.email || 'Email não informado'}</Text>
            </View>
          </View>

          {/* Informações Pessoais */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações Pessoais</Text>
            
            <ProfileField
              label="Nome Completo"
              value={profissional.nome}
              editable={true}
              onChange={(text: string) => setProfissional({...profissional, nome: text})}
              placeholder="Seu nome completo"
            />

            <ProfileField
              label="Email"
              value={profissional.email}
              editable={true}
              onChange={(text: string) => setProfissional({...profissional, email: text})}
              placeholder="seu@email.com"
              keyboardType="email-address"
            />

            <ProfileField
              label="Telefone"
              value={profissional.telefone}
              editable={true}
              onChange={(text: string) => setProfissional({...profissional, telefone: text})}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
            />

            <ProfileField
              label="Especialidade"
              value={profissional.especialidade}
              editable={true}
              onChange={(text: string) => setProfissional({...profissional, especialidade: text})}
              placeholder="Sua especialidade"
            />

            <ProfileField
              label="CRM"
              value={profissional.crm}
              editable={true}
              onChange={(text: string) => setProfissional({...profissional, crm: text})}
              placeholder="Número do CRM"
            />

            <ProfileField
              label="Endereço"
              value={profissional.endereco}
              editable={true}
              onChange={(text: string) => setProfissional({...profissional, endereco: text})}
              placeholder="Ex: Rua, número, bairro, cidade - UF"
            />

            <ProfileField
              label="Valor da Consulta"
              value={profissional.valorConsulta}
              editable={true}
              onChange={(text: string) => setProfissional({...profissional, valorConsulta: text})}
              placeholder="R$ 0,00"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Biografia */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biografia</Text>
            
            <ProfileField
              label="Sobre você"
              value={profissional.bio}
              editable={true}
              onChange={(text: string) => setProfissional({...profissional, bio: text})}
              placeholder="Conte um pouco sobre sua experiência e especializações..."
              multiline={true}
            />
          </View>

          {/* Configurações */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurações</Text>
            
            <SettingSwitch
              label="Notificações"
              value={profissional.notificacoes}
              onValueChange={(value: boolean) => setProfissional({...profissional, notificacoes: value})}
            />

            <SettingSwitch
              label="Emails de Marketing"
              value={profissional.marketing}
              onValueChange={(value: boolean) => setProfissional({...profissional, marketing: value})}
            />
          </View>

          {/* Aviso sobre funcionalidades desktop */}
          <View style={styles.infoBox}>
            <View style={styles.infoBoxHeader}>
              <Ionicons name="information-circle" size={20} color="#2196F3" />
              <Text style={styles.infoBoxTitle}>Informação</Text>
            </View>
            <Text style={styles.infoBoxText}>
              Algumas funcionalidades estão disponíveis apenas na versão desktop do aplicativo.
            </Text>
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
                    <Ionicons name="save-outline" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons name="log-out-outline" size={20} color="#F44336" />
            <Text style={styles.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}

      <LogoutModal />

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
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
  profileSpecialty: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
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
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
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
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F44336',
    gap: 10,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
  },
  infoBoxText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F44336',
    marginTop: 12,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F44336',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default PerfilScreen;