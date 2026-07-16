/**
 * Lógica da Tela de Login e Registro (login.js) - Versão Firebase
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    
    const linkToRegister = document.getElementById('link-to-register');
    const linkToLogin = document.getElementById('link-to-login');

    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerSuccess = document.getElementById('register-success');

    // Mudar os placeholders para indicar que pode ser um nome simples
    document.getElementById('login-username').placeholder = "Ex: maria (sem espaços)";
    document.getElementById('register-username').placeholder = "Ex: maria (sem espaços)";

    // Se o usuário já estiver logado, redireciona para o index
    auth.onAuthStateChanged(user => {
        if (user) {
            localStorage.setItem('firebase_user_uid', user.uid);
            localStorage.setItem('firebase_user_name', user.displayName || 'Confeiteira');
            window.location.href = 'index.html';
        }
    });

    // Alternar para tela de registro
    linkToRegister.addEventListener('click', () => {
        loginSection.style.display = 'none';
        registerSection.style.display = 'block';
        
        formRegister.reset();
        registerError.style.display = 'none';
        registerSuccess.style.display = 'none';
    });

    // Alternar para tela de login
    linkToLogin.addEventListener('click', () => {
        registerSection.style.display = 'none';
        loginSection.style.display = 'block';
        
        formLogin.reset();
        loginError.style.display = 'none';
    });

    // Função auxiliar para transformar username em email válido para o Firebase
    function getEmailFromUsername(username) {
        return username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@confeitaria.local';
    }

    // Lidar com o Registro
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;

        registerError.style.display = 'none';
        registerSuccess.style.display = 'none';

        if (!name || !username || !password) {
            showError(registerError, 'register-error-text', 'Preencha todos os campos.');
            return;
        }
        
        if (password.length < 6) {
            showError(registerError, 'register-error-text', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        const email = getEmailFromUsername(username);
        const submitBtn = formRegister.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Criando...';

        try {
            // Criar usuário no Firebase
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Atualizar perfil com o nome real
            await user.updateProfile({
                displayName: name
            });
            
            registerSuccess.style.display = 'flex';
            
            // O auth.onAuthStateChanged vai automaticamente redirecionar para index.html
        } catch (error) {
            console.error(error);
            let msg = 'Erro ao criar conta.';
            if (error.code === 'auth/email-already-in-use') {
                msg = 'Este nome de usuário já está em uso.';
            }
            showError(registerError, 'register-error-text', msg);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="user-plus"></i> Criar Conta';
            lucide.createIcons();
        }
    });

    // Lidar com o Login
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        loginError.style.display = 'none';

        if (!username || !password) {
            showError(loginError, 'login-error-text', 'Preencha todos os campos.');
            return;
        }

        const email = getEmailFromUsername(username);
        const submitBtn = formLogin.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Entrando...';

        try {
            // Fazer login no Firebase
            await auth.signInWithEmailAndPassword(email, password);
            // O auth.onAuthStateChanged vai automaticamente redirecionar para index.html
        } catch (error) {
            console.error(error);
            showError(loginError, 'login-error-text', 'Usuário ou senha incorretos.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="log-in"></i> Entrar no Sistema';
            lucide.createIcons();
        }
    });

    // Função utilitária para mostrar erro
    function showError(element, textElementId, text) {
        document.getElementById(textElementId).textContent = text;
        element.style.display = 'flex';
    }
});
