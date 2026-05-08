// MERCADO PAGO - CRIAR PREFERÊNCIA DE PAGAMENTO
const { MercadoPagoConfig, Preference } = require('mercadopago');

app.post('/api/criar-preferencia', async (req, res) => {
  const { rifa_id, numeros, nome_cliente, email_cliente, telefone, valor_total } = req.body;
  
  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });
    
    const preference = new Preference(client);
    
    const numerosStr = numeros.join(', ');
    
    const response = await preference.create({
      body: {
        items: [
          {
            id: String(rifa_id),
            title: `Rifa - ${numerosStr}`,
            description: `Números: ${numerosStr}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: valor_total,
          }
        ],
        payer: {
          name: nome_cliente,
          email: email_cliente,
          phone: {
            number: telefone.replace(/\D/g, '')
          }
        },
        back_urls: {
          success: `${process.env.SITE_URL}/?payment=success`,
          failure: `${process.env.SITE_URL}/?payment=failure`,
          pending: `${process.env.SITE_URL}/?payment=pending`
        },
        auto_return: 'approved',
        notification_url: `${process.env.SITE_URL}/api/webhook/mercadopago`,
        external_reference: `${rifa_id}_${numeros.join('_')}_${Date.now()}`
      }
    });
    
    // Salvar reserva temporária no banco
    const pagamentoId = require('crypto').randomUUID();
    await db.run(
      'INSERT INTO pagamentos (id, rifa_id, numeros, valor_total, status, preferencia_id) VALUES (?, ?, ?, ?, ?, ?)',
      pagamentoId, rifa_id, numeros.join(','), valor_total, 'aguardando_pagamento', response.id
    );
    
    res.json({
      init_point: response.init_point,
      preference_id: response.id
    });
    
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ error: error.message });
  }
});

// WEBHOOK - CONFIRMAR PAGAMENTO
app.post('/api/webhook/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      
      const client = new MercadoPagoConfig({
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
      });
      
      const payment = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      }).then(res => res.json());
      
      if (payment.status === 'approved') {
        const externalRef = payment.external_reference;
        const [rifa_id, ...numerosArray] = externalRef.split('_');
        const numeros = numerosArray.map(Number);
        
        // Verificar se números ainda estão disponíveis
        for (let numero of numeros) {
          const existente = await db.get(
            'SELECT * FROM numeros_vendidos WHERE rifa_id = ? AND numero = ? AND status = "pago"',
            rifa_id, numero
          );
          
          if (!existente) {
            await db.run(
              'INSERT INTO numeros_vendidos (rifa_id, numero, nome_cliente, telefone, pagamento_id, status) VALUES (?, ?, ?, ?, ?, ?)',
              rifa_id, numero, payment.payer.first_name || payment.payer.email, payment.payer.phone?.number || '', payment.id, 'pago'
            );
          }
        }
        
        // Atualizar status do pagamento
        await db.run(
          'UPDATE pagamentos SET status = "pago" WHERE preferencia_id = ?',
          payment.preference_id
        );
        
        console.log(`✅ Pagamento ${paymentId} confirmado!`);
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.sendStatus(200);
  }
});
