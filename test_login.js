// Script para fazer login e obter token
const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔐 Fazendo login...');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@admin.com', // ou use uma matrícula válida
        password: 'admin123' // ou use uma senha válida
      })
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      console.log('✅ Login realizado com sucesso!');
      console.log('🎫 Token:', data.token);
      
      // Testar a API de avaliação com o token
      console.log('\n🔍 Testando API de avaliação...');
      
      const avaliarResponse = await fetch('http://localhost:3001/api/desvios/aa94b913-fd33-4470-8809-e43b3e468474/avaliar', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'Content-Type': 'application/json'
        }
      });

      const avaliarData = await avaliarResponse.json();
      console.log('📊 Resposta da API de avaliação:', JSON.stringify(avaliarData, null, 2));
      
    } else {
      console.log('❌ Erro no login:', data.message);
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

testLogin();