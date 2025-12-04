import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  StyleSheet,
  Dimensions,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const EscolhaCadastroScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const OptionCard = ({ title, description, onPress, icon, colors, delay }: any) => {
    const buttonAnim = useRef(new Animated.Value(1)).current;
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      setTimeout(() => {
        Animated.spring(cardAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        }).start();
      }, delay);
    }, []);

    return (
      <Animated.View style={{
        transform: [
          { scale: cardAnim },
          { scale: buttonAnim }
        ]
      }}>
        <TouchableOpacity
          onPressIn={() => handlePressIn(buttonAnim)}
          onPressOut={() => handlePressOut(buttonAnim)}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={colors}
            style={styles.optionCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={32} color="white" />
            </View>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionDescription}>{description}</Text>
            <View style={styles.arrow}>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E3F2FD" />
      
      <LinearGradient
        colors={['#E3F2FD', '#C8E6C9', '#B3E5FC']}
        style={StyleSheet.absoluteFill}
      />

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
          <Text style={styles.title}>Escolha seu perfil</Text>
          <Text style={styles.subtitle}>Selecione o tipo de conta que melhor se adequa a você</Text>
        </View>

        <View style={styles.optionsContainer}>
          <OptionCard
            title="Paciente"
            description="Busque profissionais de saúde e agende consultas"
            onPress={() => navigation.navigate('Cadastro', { tipo: 'paciente' })}
            icon="person"
            colors={['#4CAF50', '#2196F3']}
            delay={200}
          />
          
          <OptionCard
            title="Profissional"
            description="Ofereça seus serviços e gerencie sua agenda"
            onPress={() => navigation.navigate('Cadastro', { tipo: 'profissional' })}
            icon="medical"
            colors={['#2196F3', '#4CAF50']}
            delay={400}
          />
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#2196F3" />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
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
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 40,
  },
  optionCard: {
    padding: 25,
    borderRadius: 20,
    minHeight: 140,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    opacity: 0.3,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    maxWidth: '80%',
  },
  arrow: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EscolhaCadastroScreen;