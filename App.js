import React from 'react';
import { Text, View, Image, SafeAreaView } from 'react-native';
import styles from './styles/styles.js';
import LoginSpotify from './components/loginSpotify.js';

function App() {
  return (
    <SafeAreaView style={styles.Screen}>
      <View>
        <Image source={require('./assets/icon.png')} style={styles.Logo} />
        <Text style={styles.Welcome}>Welcome</Text>
      </View>
      <LoginSpotify />
    </SafeAreaView>
  );
}

export default App;
