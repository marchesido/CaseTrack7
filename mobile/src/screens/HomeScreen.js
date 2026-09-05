import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Card from '../components/Card';

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bem-vindo, Produtor!</Text>
      
      <Card style={styles.cardSpacing}>
        <Text style={styles.cardTitle}>Busca de Equipamentos</Text>
        <Text style={styles.cardSubtitle}>Encontre rapidamente itens no acervo</Text>
        
        <CustomInput 
          label="Nome ou código do equipamento"
          placeholder="Ex: Câmera RED, Lente 50mm..."
          value={search}
          onChangeText={setSearch}
        />
        
        <CustomButton 
          title="Buscar" 
          onPress={handleSearch} 
          loading={loading} 
        />
      </Card>
      
      <Card>
        <Text style={styles.cardTitle}>Ações Rápidas</Text>
        <CustomButton 
          title="Novo Equipamento" 
          onPress={() => {}} 
          style={styles.actionButton}
        />
        <CustomButton 
          title="Registrar Avaria" 
          onPress={() => {}} 
          style={styles.actionButton}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  cardSpacing: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#4B5563', // Secondary Color
    marginBottom: 12,
  },
});
