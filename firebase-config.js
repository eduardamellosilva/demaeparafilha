// firebase-config.js
// Configuração do Firebase usando a versão Compatível (v9 compat) para funcionar sem bundlers modernos

const firebaseConfig = {
    apiKey: "AIzaSyBTbTv-Uer8dw18kLHdJpXDwMnWoiYFR3k",
    authDomain: "de-mae-para-filha-cfb2b.firebaseapp.com",
    databaseURL: "https://de-mae-para-filha-cfb2b-default-rtdb.firebaseio.com",
    projectId: "de-mae-para-filha-cfb2b",
    storageBucket: "de-mae-para-filha-cfb2b.firebasestorage.app",
    messagingSenderId: "476944152943",
    appId: "1:476944152943:web:cf3b2a4cb5d63c4a56d09a",
    measurementId: "G-JWGBW96E1D"
};

// Inicializa o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Referências globais para facilitar o uso nos outros arquivos
const auth = firebase.auth();
const db = firebase.database();
