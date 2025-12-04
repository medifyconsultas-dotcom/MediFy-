import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ConsultaCardProps {
  data: string;
  profissional: string;
  status: string;
}

const ConsultaCard: React.FC<ConsultaCardProps> = ({ data, profissional, status }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.data}>{data}</Text>
      <Text style={styles.profissional}>Profissional: {profissional}</Text>
      <Text style={styles.status}>Status: {status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  data: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  profissional: {
    marginTop: 4,
    fontSize: 14,
  },
  status: {
    marginTop: 4,
    fontSize: 14,
    color: '#007bff',
  },
});

export default ConsultaCard;
