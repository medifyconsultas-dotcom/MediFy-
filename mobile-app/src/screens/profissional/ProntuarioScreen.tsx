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

const ProntuarioScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { idPaciente, nomePaciente } = route.params || {};

  const [prontuario, setProntuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingHistorico, setEditingHistorico] = useState(false);
  
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

  const [historicoEdit, setHistoricoEdit] = useState<Array<{
    data: Date;
    profissional: string;
    observacao: string;
  }>>([]);

  useEffect(() => {
    if (idPaciente) {
      loadProntuario();
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
  }, [idPaciente]);

  const loadProntuario = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
      }

      const response = await profissionalAPI.getProntuario(idPaciente);
      
      if (response.success && response.data) {
        setProntuario(response.data);
        // Preencher formulário com dados existentes
        // Deixar observações vazio para permitir adicionar nova observação
        setFormData({
          titulo: response.data.titulo || '',
          conteudo: response.data.conteudo || '',
          anamnese: response.data.anamnese || '',
          exame_fisico: response.data.exame_fisico || '',
          sinais_vitais: response.data.sinais_vitais || '',
          diagnosticos: response.data.diagnosticos || '',
          prescricoes: response.data.prescricoes || '',
          medicamentos: response.data.medicamentos || '',
          alergias: response.data.alergias || '',
          antecedentes: response.data.antecedentes || '',
          exames_solicitados: response.data.exames_solicitados || '',
          plano: response.data.plano || '',
          follow_up: response.data.follow_up || '',
          observacoes: '', // Deixar vazio para permitir adicionar nova observação
        });
        
        // Processar histórico
        if (response.data.historico && response.data.historico.length > 0) {
          const historicoFormatado = response.data.historico.map((h: any) => ({
            data: h.data instanceof Date ? h.data : new Date(h.data),
            profissional: h.profissional || '',
            observacao: h.observacao || '',
          }));
          setHistoricoEdit(historicoFormatado);
        } else {
          setHistoricoEdit([]);
        }
      } else {
        // Prontuário não existe, inicializar vazio
        setProntuario(null);
        setFormData({
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
        setHistoricoEdit([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar prontuário:', error);
      // Se não encontrar, não é erro - pode ser prontuário novo
      setProntuario(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProntuario = async () => {
    setSaving(true);
    try {
      if (prontuario) {
        // Atualizar prontuário existente
        let historicoParaSalvar = editingHistorico 
          ? historicoEdit.map(h => ({
              data: h.data,
              profissional: h.profissional,
              observacao: h.observacao,
            }))
          : (prontuario.historico || []).map((h: any) => ({
              data: h.data instanceof Date ? h.data : new Date(h.data),
              profissional: h.profissional || '',
              observacao: h.observacao || '',
            }));

        // Adicionar nova observação ao histórico se houver e for diferente da atual
        const observacaoAtual = prontuario.observacoes || '';
        const novaObservacao = formData.observacoes.trim();
        if (novaObservacao && novaObservacao !== observacaoAtual) {
          historicoParaSalvar.push({
            data: new Date(),
            profissional: '', // Será preenchido no backend
            observacao: novaObservacao,
          });
        }

        // Enviar TODOS os campos do formulário
        await profissionalAPI.updateProntuario(idPaciente, {
          titulo: formData.titulo || '',
          conteudo: formData.conteudo || '',
          anamnese: formData.anamnese || '',
          exame_fisico: formData.exame_fisico || '',
          sinais_vitais: formData.sinais_vitais || '',
          diagnosticos: formData.diagnosticos || '',
          prescricoes: formData.prescricoes || '',
          medicamentos: formData.medicamentos || '',
          alergias: formData.alergias || '',
          antecedentes: formData.antecedentes || '',
          exames_solicitados: formData.exames_solicitados || '',
          plano: formData.plano || '',
          follow_up: formData.follow_up || '',
          observacoes: formData.observacoes || '',
          historico: historicoParaSalvar,
        });

        Alert.alert('Sucesso', 'Prontuário atualizado com sucesso!');
      } else {
        // Criar novo prontuário
        const historicoInicial = formData.observacoes.trim() ? [
          {
            data: new Date(),
            profissional: '',
            observacao: formData.observacoes.trim(),
          },
        ] : [];

        await profissionalAPI.createProntuario({
          idPaciente: idPaciente,
          titulo: formData.titulo || '',
          conteudo: formData.conteudo || '',
          anamnese: formData.anamnese || '',
          exame_fisico: formData.exame_fisico || '',
          sinais_vitais: formData.sinais_vitais || '',
          diagnosticos: formData.diagnosticos || '',
          prescricoes: formData.prescricoes || '',
          medicamentos: formData.medicamentos || '',
          alergias: formData.alergias || '',
          antecedentes: formData.antecedentes || '',
          exames_solicitados: formData.exames_solicitados || '',
          plano: formData.plano || '',
          follow_up: formData.follow_up || '',
          observacoes: formData.observacoes || '',
        });

        Alert.alert('Sucesso', 'Prontuário criado com sucesso!');
      }

      setEditing(false);
      setEditingHistorico(false);
      await loadProntuario();
    } catch (error: any) {
      console.error('Erro ao salvar prontuário:', error);
      Alert.alert('Erro', error.message || 'Não foi possível salvar o prontuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHistoricoItem = () => {
    setHistoricoEdit([
      ...historicoEdit,
      {
        data: new Date(),
        profissional: '',
        observacao: '',
      },
    ]);
  };

  const handleUpdateHistoricoItem = (index: number, field: 'observacao' | 'profissional', value: string) => {
    const newHistorico = [...historicoEdit];
    newHistorico[index] = {
      ...newHistorico[index],
      [field]: value,
    };
    setHistoricoEdit(newHistorico);
  };

  const handleRemoveHistoricoItem = (index: number) => {
    const newHistorico = historicoEdit.filter((_, i) => i !== index);
    setHistoricoEdit(newHistorico);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando prontuário...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9FC" />

      <View style={styles.header}>
        <View>
          <Text style={styles.pacienteNome}>{nomePaciente || 'Paciente'}</Text>
          <Text style={styles.headerSubtitle}>Prontuário Médico</Text>
        </View>
        {!editing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditing(true);
              // Recarregar dados do prontuário para garantir que está atualizado
              if (prontuario) {
                setFormData({
                  titulo: prontuario.titulo || '',
                  conteudo: prontuario.conteudo || '',
                  anamnese: prontuario.anamnese || '',
                  exame_fisico: prontuario.exame_fisico || '',
                  sinais_vitais: prontuario.sinais_vitais || '',
                  diagnosticos: prontuario.diagnosticos || '',
                  prescricoes: prontuario.prescricoes || '',
                  medicamentos: prontuario.medicamentos || '',
                  alergias: prontuario.alergias || '',
                  antecedentes: prontuario.antecedentes || '',
                  exames_solicitados: prontuario.exames_solicitados || '',
                  plano: prontuario.plano || '',
                  follow_up: prontuario.follow_up || '',
                  observacoes: '', // Deixar vazio para permitir adicionar nova observação
                });
                if (prontuario.historico) {
                  const historicoFormatado = prontuario.historico.map((h: any) => ({
                    data: h.data instanceof Date ? h.data : new Date(h.data),
                    profissional: h.profissional || '',
                    observacao: h.observacao || '',
                  }));
                  setHistoricoEdit(historicoFormatado);
                }
              }
            }}
          >
            <LinearGradient
              colors={['#4CAF50', '#2196F3']}
              style={styles.editButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="create" size={18} color="white" />
              <Text style={styles.editButtonText}>Editar</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

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
        {editing || !prontuario ? (
          <View style={styles.form}>
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
              <Text style={styles.label}>
                Observações {prontuario && <Text style={styles.labelHint}>(será adicionada ao histórico ao salvar)</Text>}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.observacoes}
                onChangeText={(value) => updateFormData('observacoes', value)}
                placeholder={prontuario ? "Digite uma nova observação para adicionar ao histórico..." : "Observações gerais..."}
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
              />
              {prontuario && prontuario.observacoes && (
                <View style={styles.currentObservationsHint}>
                  <Text style={styles.hintText}>
                    <Text style={styles.hintBold}>Observação atual:</Text> {prontuario.observacoes}
                  </Text>
                  <Text style={styles.hintText}>
                    Digite acima para adicionar uma nova observação ao histórico
                  </Text>
                </View>
              )}
            </View>

            {editingHistorico && (
              <View style={styles.formGroup}>
                <View style={styles.historicoHeader}>
                  <Text style={styles.label}>Histórico de Observações</Text>
                  <TouchableOpacity
                    style={styles.addHistoricoButton}
                    onPress={handleAddHistoricoItem}
                  >
                    <LinearGradient
                      colors={['#4CAF50', '#2196F3']}
                      style={styles.addHistoricoButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="add-circle" size={18} color="white" />
                      <Text style={styles.addHistoricoButtonText}>Adicionar</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {historicoEdit.length === 0 ? (
                  <View style={styles.historicoEmpty}>
                    <Text style={styles.historicoEmptyText}>Nenhum registro no histórico</Text>
                  </View>
                ) : (
                  <View style={styles.historicoEditorList}>
                    {historicoEdit.map((item, index) => (
                      <View key={index} style={styles.historicoEditorItem}>
                        <View style={styles.historicoEditorItemHeader}>
                          <Text style={styles.historicoEditorDate}>
                            {item.data.toLocaleDateString('pt-BR')} às {item.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveHistoricoItem(index)}
                            style={styles.removeHistoricoButton}
                          >
                            <Ionicons name="trash-outline" size={18} color="#F44336" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.historicoEditorContent}>
                          <View style={styles.formGroupSmall}>
                            <Text style={styles.labelSmall}>Profissional</Text>
                            <TextInput
                              style={styles.inputSmall}
                              value={item.profissional}
                              onChangeText={(value) => handleUpdateHistoricoItem(index, 'profissional', value)}
                              placeholder="Nome do profissional"
                              placeholderTextColor="#999"
                            />
                          </View>
                          <View style={styles.formGroupSmall}>
                            <Text style={styles.labelSmall}>Observação</Text>
                            <TextInput
                              style={[styles.inputSmall, styles.textAreaSmall]}
                              value={item.observacao}
                              onChangeText={(value) => handleUpdateHistoricoItem(index, 'observacao', value)}
                              placeholder="Observação do registro..."
                              placeholderTextColor="#999"
                              multiline
                              numberOfLines={3}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.toggleHistoricoButton}
              onPress={() => {
                setEditingHistorico(!editingHistorico);
                if (!editingHistorico && prontuario && prontuario.historico) {
                  const historicoFormatado = prontuario.historico.map((h: any) => ({
                    data: h.data instanceof Date ? h.data : new Date(h.data),
                    profissional: h.profissional || '',
                    observacao: h.observacao || '',
                  }));
                  setHistoricoEdit(historicoFormatado);
                } else if (!editingHistorico && formData.observacoes.trim()) {
                  setHistoricoEdit([{
                    data: new Date(),
                    profissional: '',
                    observacao: formData.observacoes.trim(),
                  }]);
                }
              }}
            >
              <LinearGradient
                colors={['#4CAF50', '#2196F3']}
                style={styles.toggleHistoricoButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons 
                  name={editingHistorico ? "eye-off" : "eye"} 
                  size={18} 
                  color="white" 
                />
                <Text style={styles.toggleHistoricoButtonText}>
                  {editingHistorico ? 'Ocultar Histórico' : 'Editar/Adicionar ao Histórico'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditing(false);
                  setEditingHistorico(false);
                  if (prontuario) {
                    loadProntuario();
                  } else {
                    navigation.goBack();
                  }
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveProntuario}
                disabled={saving}
              >
                <LinearGradient
                  colors={['#4CAF50', '#2196F3']}
                  style={styles.saveButtonGradient}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="white" />
                      <Text style={styles.saveButtonText} numberOfLines={1} adjustsFontSizeToFit>
                        {prontuario ? (editingHistorico ? 'Salvar Alterações' : 'Adicionar') : 'Criar Prontuário'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.viewMode}>
            {prontuario.titulo && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Título</Text>
                <Text style={styles.sectionContent}>{prontuario.titulo}</Text>
              </View>
            )}

            {prontuario.conteudo && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conteúdo</Text>
                <Text style={styles.sectionContent}>{prontuario.conteudo}</Text>
              </View>
            )}

            {prontuario.anamnese && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Anamnese</Text>
                <Text style={styles.sectionContent}>{prontuario.anamnese}</Text>
              </View>
            )}

            {prontuario.exame_fisico && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Exame Físico</Text>
                <Text style={styles.sectionContent}>{prontuario.exame_fisico}</Text>
              </View>
            )}

            {prontuario.sinais_vitais && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sinais Vitais</Text>
                <Text style={styles.sectionContent}>{prontuario.sinais_vitais}</Text>
              </View>
            )}

            {prontuario.diagnosticos && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Diagnósticos</Text>
                <Text style={styles.sectionContent}>{prontuario.diagnosticos}</Text>
              </View>
            )}

            {prontuario.prescricoes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Prescrições</Text>
                <Text style={styles.sectionContent}>{prontuario.prescricoes}</Text>
              </View>
            )}

            {prontuario.medicamentos && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Medicamentos</Text>
                <Text style={styles.sectionContent}>{prontuario.medicamentos}</Text>
              </View>
            )}

            {prontuario.alergias && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alergias</Text>
                <Text style={styles.sectionContent}>{prontuario.alergias}</Text>
              </View>
            )}

            {prontuario.antecedentes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Antecedentes</Text>
                <Text style={styles.sectionContent}>{prontuario.antecedentes}</Text>
              </View>
            )}

            {prontuario.exames_solicitados && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Exames Solicitados</Text>
                <Text style={styles.sectionContent}>{prontuario.exames_solicitados}</Text>
              </View>
            )}

            {prontuario.plano && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Plano</Text>
                <Text style={styles.sectionContent}>{prontuario.plano}</Text>
              </View>
            )}

            {prontuario.follow_up && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Follow-up / Retorno</Text>
                <Text style={styles.sectionContent}>{prontuario.follow_up}</Text>
              </View>
            )}

            {prontuario.observacoes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Observações Atuais</Text>
                <Text style={styles.sectionContent}>{prontuario.observacoes}</Text>
              </View>
            )}

            {prontuario.historico && prontuario.historico.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Histórico</Text>
                  <TouchableOpacity
                    style={styles.editHistoricoButton}
                    onPress={() => {
                      setEditing(true);
                      setEditingHistorico(true);
                      const historicoFormatado = prontuario.historico.map((h: any) => ({
                        data: h.data instanceof Date ? h.data : new Date(h.data),
                        profissional: h.profissional || '',
                        observacao: h.observacao || '',
                      }));
                      setHistoricoEdit(historicoFormatado);
                    }}
                  >
                    <LinearGradient
                      colors={['#4CAF50', '#2196F3']}
                      style={styles.editHistoricoButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="create" size={16} color="white" />
                      <Text style={styles.editHistoricoButtonText}>Editar</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                {prontuario.historico.map((item: any, index: number) => (
                  <View key={index} style={styles.historicoItem}>
                    <View style={styles.historicoHeader}>
                      <Text style={styles.historicoProfissional}>{item.profissional}</Text>
                      <Text style={styles.historicoData}>
                        {new Date(item.data).toLocaleDateString('pt-BR')} às {new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.historicoObservacao}>{item.observacao}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        </Animated.View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  pacienteNome: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  editButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  form: {
    gap: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formGroupSmall: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  labelHint: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    fontStyle: 'italic',
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
  inputSmall: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  currentObservationsHint: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
    marginBottom: 4,
  },
  hintBold: {
    fontWeight: '600',
  },
  historicoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addHistoricoButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  addHistoricoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  addHistoricoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
  historicoEmpty: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  historicoEmptyText: {
    fontSize: 14,
    color: '#888',
  },
  historicoEditorList: {
    gap: 12,
  },
  historicoEditorItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  historicoEditorItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historicoEditorDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  removeHistoricoButton: {
    padding: 4,
  },
  historicoEditorContent: {
    gap: 8,
  },
  toggleHistoricoButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toggleHistoricoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  toggleHistoricoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    flexShrink: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
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
    fontSize: 14,
    fontWeight: '700',
  },
  viewMode: {
    gap: 12,
  },
  section: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  historicoItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historicoProfissional: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  historicoData: {
    fontSize: 12,
    color: '#666',
  },
  historicoObservacao: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  editHistoricoButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  editHistoricoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  editHistoricoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
});

export default ProntuarioScreen;
