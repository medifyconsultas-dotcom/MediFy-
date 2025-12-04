import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import InicioScreen from '../screens/Inicio/InicioScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import CadastroScreen from '../screens/Auth/CadastroScreen';
import DashboardPaciente from '../screens/paciente/DashboardScreen';
import AgendamentoScreen from '../screens/paciente/AgendamentoScreen';
import HistoricoScreen from '../screens/paciente/HistoricoScreen';
import PerfilPaciente from '../screens/paciente/PerfilScreen';
import DashboardProfissional from '../screens/profissional/DashboardScreen';
import ConsultasScreen from '../screens/profissional/ConsultasScreen';
import PerfilProfissional from '../screens/profissional/PerfilScreen';
import ProntuariosScreen from '../screens/profissional/ProntuariosScreen';
import NovaConsultaScreen from '../screens/profissional/NovaConsultaScreen';
import ProntuarioScreen from '../screens/profissional/ProntuarioScreen';
import NovoProntuarioScreen from '../screens/profissional/NovoProntuarioScreen';
import EscolhaCadastroScreen from '../screens/Auth/EscolhaCadastroScreen';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#2E86AB" />
      <Stack.Navigator 
        initialRouteName="Inicio"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2E86AB',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerTitleAlign: 'center',
          // Propriedades atualizadas para v6
          headerBackTitle: '', // Remove o texto do botão voltar
        }}
      >
        {/* Tela inicial sem header */}
        <Stack.Screen 
          name="Inicio" 
          component={InicioScreen} 
          options={{ headerShown: false }}
        />

        {/* Telas de Auth com header personalizado */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="EscolhaCadastro" 
          component={EscolhaCadastroScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="Cadastro" 
          component={CadastroScreen}
          options={{ headerShown: false }}
        />

        {/* Telas do Paciente */}
        <Stack.Screen 
          name="DashboardPaciente" 
          component={DashboardPaciente}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="Agendamento" 
          component={AgendamentoScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="Historico" 
          component={HistoricoScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="PerfilPaciente" 
          component={PerfilPaciente}
          options={{ headerShown: false }}
        />

        {/* Telas do Profissional */}
        <Stack.Screen 
          name="DashboardProfissional" 
          component={DashboardProfissional}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="Consultas" 
          component={ConsultasScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="PerfilProfissional" 
          component={PerfilProfissional}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="ProntuariosProfissional" 
          component={ProntuariosScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="NovaConsultaProfissional" 
          component={NovaConsultaScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="ProntuarioProfissional" 
          component={ProntuarioScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="NovoProntuarioProfissional" 
          component={NovoProntuarioScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;