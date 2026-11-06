import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  Screen: {
    flex: 1,
    backgroundColor: '#44ace8',
    alignItems: 'center',
    paddingTop: "10%",
  },

  Logo: {
    height: 117, width: 117, alignSelf: "center"
  },

  Welcome: {
    color: "#ffff",
    fontSize: 38,
    textAlign: 'center',
    textShadowColor: "#000"
  },

  LogIn: {
    marginTop: "10%",
    backgroundColor: 'whitesmoke',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    height: '25%',
    width: "50%"
  },

  Text: {
    color: "#000",
    fontSize: 17,
    textAlign: 'center',
    paddingTop: "15%",
  },

  Text2: {
    color: "#000",
    fontSize: 17,
    textAlign: 'center',
  },

  Input: {
    alignItems: 'center',
    width: "80%",
    fontSize: 23,
    borderRadius: 10,
    borderColor: 'black',
    borderWidth: 2,
    height: "25%",
    // padding: 10,
    // padding: '10%',
    alignSelf: 'center',
  },
});

export default styles;