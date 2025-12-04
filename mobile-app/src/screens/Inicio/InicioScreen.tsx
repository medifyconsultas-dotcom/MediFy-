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
import { StethoscopeIcon } from '../../components/StethoscopeIcon';

const { width, height } = Dimensions.get('window');

const InicioScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = React.useState(true);

  // Simulação de carregamento
  useEffect(() => {
    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false, // false porque usamos width
    }).start(() => {
      setIsLoading(false);
      
      // Animação de entrada após carregamento
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
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        })
      ]).start();
    });
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

  const ButtonAnim = ({ title, onPress, colors, icon }: any) => {
    const buttonAnim = useRef(new Animated.Value(1)).current;
    
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
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={icon} size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>{title}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const LoadingScreen = () => {
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(20)).current;

    React.useEffect(() => {
      // Animação de entrada da logo
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Animação de entrada do título após logo
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, 400);
    }, []);

    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#E3F2FD', '#C8E6C9', '#BBDEFB']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Efeitos de brilho animados */}
        <Animated.View
          style={[
            styles.loadingGlow1,
            {
              opacity: loadingProgress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.6, 0.3]
              })
            }
          ]}
        />
        <Animated.View
          style={[
            styles.loadingGlow2,
            {
              opacity: loadingProgress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.5, 0.3]
              })
            }
          ]}
        />
        
        <Animated.View 
          style={[
            styles.loadingLogo,
            { 
              opacity: logoOpacity,
              transform: [
                { scale: logoScale }
              ]
            }
          ]}
        >
          <LinearGradient
            colors={['#4CAF50', '#2196F3']}
            style={styles.loadingLogoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <StethoscopeIcon size={56} color="white" />
          </LinearGradient>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.loadingContent,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }]
            }
          ]}
        >
          <Text style={styles.loadingTitle}>MediFy</Text>
          <Text style={styles.loadingSubtitle}>Cuidando de você com tecnologia e confiança</Text>
        
        <Animated.View 
          style={[
            styles.progressBarContainer,
            {
              opacity: loadingProgress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.5, 1]
              })
            }
          ]}
        >
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: loadingProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
        </Animated.View>
        </Animated.View>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E3F2FD" />
      
      {/* Background animado com gradiente azul e verde */}
      <LinearGradient
        colors={['#E3F2FD', '#C8E6C9', '#B3E5FC']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}>
        {/* Logo principal - Estetoscópio padronizado */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#4CAF50', '#2196F3']}
            style={styles.logoBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <StethoscopeIcon size={48} color="white" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>MediFy</Text>
        <Text style={styles.subtitle}>Cuidando de você com{'\n'}tecnologia e confiança</Text>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <LinearGradient
              colors={['#4CAF50', '#2196F3']}
              style={styles.featureIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="shield-checkmark" size={16} color="white" />
            </LinearGradient>
            <Text style={styles.featureText}>Seguro</Text>
          </View>
          <View style={styles.featureItem}>
            <LinearGradient
              colors={['#4CAF50', '#2196F3']}
              style={styles.featureIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="time" size={16} color="white" />
            </LinearGradient>
            <Text style={styles.featureText}>Rápido</Text>
          </View>
          <View style={styles.featureItem}>
            <LinearGradient
              colors={['#4CAF50', '#2196F3']}
              style={styles.featureIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="heart" size={16} color="white" />
            </LinearGradient>
            <Text style={styles.featureText}>Confiança</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.buttonContainer}>
        <ButtonAnim 
          title="Entrar na minha conta"
          onPress={() => navigation.navigate('Login')}
          colors={['#2196F3', '#1976D2']}
          icon="log-in"
        />
        <ButtonAnim 
          title="Criar nova conta"
          onPress={() => navigation.navigate('EscolhaCadastro')}
          colors={['#4CAF50', '#2E7D32']}
          icon="person-add"
        />
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
title: {
  fontSize: 42,
  fontWeight: '800',
  color: '#1976D2',
  marginBottom: 10,
  textAlign: 'center',
},

  subtitle: {
    fontSize: 16,
    color: '#388E3C',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
    gap: 15,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 30,
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingLogoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 20,
  },
  loadingTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1976D2',
    letterSpacing: -0.5,
  },
  loadingSubtitle: {
    fontSize: 15,
    color: '#388E3C',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  progressBarContainer: {
    marginTop: 30,
    width: 250,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 10,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingGlow1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    top: -100,
    left: -100,
  },
  loadingGlow2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    bottom: -100,
    right: -100,
  },
});

export default InicioScreen;