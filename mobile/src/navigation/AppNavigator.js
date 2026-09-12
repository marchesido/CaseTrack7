import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
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
            title: route.params?.equipment?.name ? `${route.params.equipment.name}` : 'Detalhes do Equipamento',
          })}
        />
        <Stack.Screen 
          name="EquipmentForm" 
          component={EquipmentFormScreen} 
          options={({ route }) => ({
            title: route.params?.equipment ? 'Editar Equipamento' : 'Novo Equipamento',
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
            title: route.params?.title ? `${route.params.title}` : 'Detalhes da Produção',
          })}
        />
        <Stack.Screen 
          name="ProductionForm" 
          component={ProductionFormScreen} 
          options={{ title: 'Nova Produção' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
