import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import EquipmentListScreen from '../screens/EquipmentListScreen';
import EquipmentFormScreen from '../screens/EquipmentFormScreen';
import EquipmentDetailScreen from '../screens/EquipmentDetailScreen';
import DamageFormScreen from '../screens/DamageFormScreen';
import ProductionListScreen from '../screens/ProductionListScreen';
import ProductionDetailScreen from '../screens/ProductionDetailScreen';
import ProductionFormScreen from '../screens/ProductionFormScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1E3A8A',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'CaseTrack' }}
            />
            <Stack.Screen
              name="EquipmentList"
              component={EquipmentListScreen}
              options={{ title: 'Equipamentos' }}
            />
            <Stack.Screen
              name="EquipmentDetail"
              component={EquipmentDetailScreen}
              options={({ route }) => ({
                title: route.params?.equipment?.name
                  ? `${route.params.equipment.name}`
                  : 'Detalhes do Equipamento',
              })}
            />
            <Stack.Screen
              name="EquipmentForm"
              component={EquipmentFormScreen}
              options={({ route }) => ({
                title: route.params?.equipment
                  ? 'Editar Equipamento'
                  : 'Novo Equipamento',
              })}
            />
            <Stack.Screen
              name="DamageForm"
              component={DamageFormScreen}
              options={{ title: 'Registrar Avaria' }}
            />
            <Stack.Screen
              name="ProductionList"
              component={ProductionListScreen}
              options={{ title: 'Produções Audiovisuais' }}
            />
            <Stack.Screen
              name="ProductionDetail"
              component={ProductionDetailScreen}
              options={({ route }) => ({
                title: route.params?.title
                  ? `${route.params.title}`
                  : 'Detalhes da Produção',
              })}
            />
            <Stack.Screen
              name="ProductionForm"
              component={ProductionFormScreen}
              options={{ title: 'Nova Produção' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
