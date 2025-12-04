import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabItem {
  name: string;
  label: string;
  icon: string;
  iconActive: string;
}

interface BottomTabNavigatorProps {
  tabs: TabItem[];
}

const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({ tabs }) => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const currentRouteName = route.name;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F0F9FF']}
        style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 3) }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {tabs.map((tab) => {
          const isActive = currentRouteName === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#4CAF50', '#2196F3']}
                  style={styles.tabIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons 
                    name={tab.iconActive as any} 
                    size={20} 
                    color="white" 
                  />
                </LinearGradient>
              ) : (
                <View style={styles.tabIconContainerInactive}>
                  <Ionicons 
                    name={tab.icon as any} 
                    size={20} 
                    color="#81C784" 
                  />
                </View>
              )}
              <Text style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    paddingBottom: 3,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tabIconContainerInactive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    backgroundColor: '#F5F5F5',
  },
  tabLabel: {
    fontSize: 11,
    color: '#81C784',
    fontWeight: '600',
    marginTop: 1,
  },
  tabLabelActive: {
    color: '#2196F3',
    fontWeight: '700',
  },
});

export default BottomTabNavigator;

