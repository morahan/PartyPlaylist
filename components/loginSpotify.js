import React, { useState } from 'react';
import { Text, View, Button, Linking } from 'react-native';
import styles from '../styles/styles.js';
import axios from 'axios';

// TODO(phase 1): replace with the new backend URL over HTTPS and Authorization Code + PKCE.
const LOGIN_URL = 'http://ec2-3-21-185-1.us-east-2.compute.amazonaws.com/login';

function LoginSpotify() {
    const [signIn, setSignIn] = useState('Log Into Spotify');
    const clickHandler = () => {
        setSignIn('Signing In...');
        axios.get(LOGIN_URL)
            .then(response => Linking.openURL(response.data))
            .catch(err => {
                console.log(err);
                setSignIn('Log Into Spotify');
            });
    }
    return (
        <View style={styles.LogIn}>
            <View>
                <Text style={styles.Text}>{signIn}</Text>
                <Button title='Sign In' onPress={clickHandler} />
            </View>
            <Text style={styles.Text}>Oops, I dont have an accout. </Text>
            <Text style={styles.Text2}>I'm a dinosaur...</Text>
        </View>
    );
}

export default LoginSpotify;
