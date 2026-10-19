/* ==========================================================================
   DADOS DO CARDÁPIO — edite só este arquivo para trocar de restaurante.
   --------------------------------------------------------------------------
   • img: pode ser o código de uma foto do Unsplash ("1559141680-d0bd7bc5af84"),
     um link completo ("https://...jpg") ou um arquivo local ("fotos/picanha.jpg").
   • preco: número, sem "R$" (ex.: 26.9).
   • tags possíveis: veg, vegano, gf, picante, serve2, chef, novo, maisPedido
   ========================================================================== */

window.LOJA = {
  nome: 'Lume',
  slogan: 'Cozinha de fogo',
  // WhatsApp que recebe os pedidos: só números, com 55 + DDD.
  whatsapp: '5512999999999',
  telefone: '(12) 99999-9999',
  endereco: 'Av. das Palmeiras, 1200 · Centro',
  cidade: 'São Paulo · SP',
  instagram: 'lume.cozinha',
  nota: '4,9',
  avaliacoes: '1.280',
  desde: 2014,
  // Horários por dia da semana (0 = domingo ... 6 = sábado). "00:00" no fim = meia-noite.
  horarios: {
    0: [['12:00', '17:00']],
    1: [],
    2: [['18:00', '23:00']],
    3: [['18:00', '23:00']],
    4: [['18:00', '23:00']],
    5: [['12:00', '15:00'], ['18:00', '00:00']],
    6: [['12:00', '00:00']]
  },
  fotos: {
    fogo: '1543005472-1b1d37fa4eae',
    grelha: '1508615263227-c5d58c1e5821',
    chef: '1577219491135-ce391730fb2c',
    salao: '1709548145082-04d0cde481d4'
  }
};

window.TAGS = {
  chef: 'Escolha do chef',
  maisPedido: 'Mais pedido',
  novo: 'Novidade',
  serve2: 'Serve 2',
  veg: 'Vegetariano',
  vegano: 'Vegano',
  gf: 'Sem glúten',
  picante: 'Picante'
};

window.CATEGORIAS = [
  {
    id: 'entradas',
    nome: 'Para começar',
    curto: 'Entradas',
    desc: 'Pra dividir enquanto a brasa esquenta.',
    itens: [
      {
        id: 'pao-de-queijo', nome: 'Pão de queijo da Canastra', preco: 26,
        desc: 'Seis unidades de casca crocante e miolo puxa-puxa. Vem com manteiga de garrafa.',
        img: '1559141680-d0bd7bc5af84', tags: ['maisPedido', 'veg']
      },
      {
        id: 'bolinho-costela', nome: 'Bolinho de costela', preco: 42,
        desc: 'Costela desfiada depois de 12 horas no fogo, empanada na panko. Acompanha maionese de alho assado.',
        img: '1626011852881-4609127619a8', tags: ['chef']
      },
      {
        id: 'burrata', nome: 'Burrata com tomates tostados', preco: 58,
        desc: 'Burrata cremosa sobre tomates confitados na brasa, pesto de manjericão e pão da casa.',
        img: '1555072930-714bba1d24e2', tags: ['veg']
      },
      {
        id: 'carpaccio', nome: 'Carpaccio de filé', preco: 52,
        desc: 'Lâminas finas de filé mignon, alcaparras, parmesão, rúcula e molho de mostarda e mel.',
        img: '1651745006249-0ee8686914eb', tags: ['gf']
      },
      {
        id: 'ceviche', nome: 'Ceviche do dia', preco: 54,
        desc: 'Peixe branco curado no limão, leite de tigre de maracujá, milho crocante e batata-doce.',
        img: '1761314036709-f6f68a3d7cf1', tags: ['gf', 'picante']
      },
      {
        id: 'bruschetta', nome: 'Bruschetta de tomate', preco: 34,
        desc: 'Pão de fermentação natural tostado na brasa, tomate, manjericão e azeite extravirgem.',
        img: '1572695157366-5e585ab2b69f', tags: ['vegano']
      },
      {
        id: 'tataki', nome: 'Tataki de atum', preco: 64,
        desc: 'Atum selado por fora e cru por dentro, crosta de pimenta-rosa e ponzu cítrico.',
        img: '1786520403836-bbb95ed8904f', tags: ['novo', 'gf']
      }
    ]
  },
  {
    id: 'brasa',
    nome: 'Na brasa',
    curto: 'Na brasa',
    desc: 'Lenha de eucalipto, grelha alta e paciência.',
    itens: [
      {
        id: 'picanha', nome: 'Picanha na brasa', preco: 149,
        desc: '400 g de picanha maturada, sal grosso e mais nada. Acompanha farofa de manteiga, vinagrete e mandioca frita.',
        img: '1558030006-450675393462', tags: ['chef', 'serve2', 'gf'],
        opcoes: { titulo: 'Ponto da carne', escolhas: ['Mal passada', 'Ao ponto', 'Bem passada'], padrao: 1 },
        adicionais: [{ nome: 'Arroz biro-biro', preco: 18 }, { nome: 'Farofa extra', preco: 9 }, { nome: 'Queijo coalho na brasa', preco: 22 }]
      },
      {
        id: 'polvo', nome: 'Polvo na brasa', preco: 132,
        desc: 'Tentáculos macios defumados na grelha, com batatas ao murro, alho dourado e páprica.',
        img: '1626232441076-a2a5ada2256a', tags: ['chef', 'gf']
      },
      {
        id: 'costela', nome: 'Costela fogo de chão', preco: 124,
        desc: 'Doze horas assando devagar, até soltar do osso. Vem com mandioca na manteiga e vinagrete.',
        img: '1529193591184-b1d58069ecdd', tags: ['maisPedido', 'serve2', 'gf']
      },
      {
        id: 'salmao', nome: 'Salmão grelhado', preco: 98,
        desc: 'Posta de salmão com pele crocante, purê de mandioquinha e legumes da estação.',
        img: '1519708227418-c8fd9a32b7a2', tags: ['gf']
      },
      {
        id: 'galeto', nome: 'Galeto assado', preco: 76,
        desc: 'Galeto inteiro marinado no limão-cravo e ervas, assado na brasa. Acompanha polenta frita.',
        img: '1606728035253-49e8a23146de', tags: []
      },
      {
        id: 'burger', nome: 'Burger Lume', preco: 56,
        desc: 'Blend de 180 g, queijo canastra, cebola caramelizada e maionese defumada no brioche. Com fritas.',
        img: '1550547660-d9450f859349', tags: ['maisPedido'],
        opcoes: { titulo: 'Ponto do blend', escolhas: ['Mal passado', 'Ao ponto', 'Bem passado'], padrao: 1 },
        adicionais: [{ nome: 'Bacon artesanal', preco: 8 }, { nome: 'Ovo caipira', preco: 5 }]
      },
      {
        id: 'legumes', nome: 'Legumes da horta na brasa', preco: 48,
        desc: 'Abobrinha, berinjela, pimentões e cebola roxa grelhados, com homus e chimichurri.',
        img: '1625944227313-4f7f68e6b3fa', tags: ['vegano', 'gf']
      }
    ]
  },
  {
    id: 'panelas',
    nome: 'Panelas & massas',
    curto: 'Panelas',
    desc: 'O que cozinha em fogo baixo e chega à mesa ainda borbulhando.',
    itens: [
      {
        id: 'moqueca', nome: 'Moqueca de peixe', preco: 118,
        desc: 'Peixe do dia, tomate, coentro e urucum na panela de barro. Com arroz branco e pirão.',
        img: '1621174438159-6a9a82405498', tags: ['chef', 'serve2', 'gf']
      },
      {
        id: 'camarao', nome: 'Camarão na manteiga de garrafa', preco: 98,
        desc: 'Camarões grandes salteados com alho, manteiga de garrafa e cheiro-verde. Com arroz de coco.',
        img: '1659951226926-a75791782250', tags: ['gf']
      },
      {
        id: 'feijoada', nome: 'Feijoada da casa', preco: 82,
        desc: 'Feijão preto com carnes defumadas aqui, couve, farofa, laranja e torresmo. Só aos sábados.',
        img: '1647545401750-6dd5539879ac', tags: ['maisPedido', 'gf']
      },
      {
        id: 'risoto', nome: 'Risoto de cogumelos', preco: 74,
        desc: 'Arroz arbóreo, mix de cogumelos frescos, parmesão e chips de alho com rúcula.',
        img: '1791409287840-f56f8611bc84', tags: ['veg', 'gf']
      },
      {
        id: 'ravioli', nome: 'Ravioli de abóbora', preco: 69,
        desc: 'Massa fresca recheada com abóbora cabotiá, manteiga de sálvia e tomates-cereja.',
        img: '1778850620699-79ba3ff60bf0', tags: ['veg', 'novo']
      },
      {
        id: 'espaguete', nome: 'Espaguete ao pomodoro', preco: 59,
        desc: 'Grano duro, molho de tomates italianos cozido devagar, manjericão e parmesão.',
        img: '1622973536968-3ead9e780960', tags: ['veg']
      }
    ]
  },
  {
    id: 'doces',
    nome: 'Doces',
    curto: 'Doces',
    desc: 'Pra fechar a conta com a boca doce.',
    itens: [
      {
        id: 'pudim', nome: 'Pudim de leite', preco: 22,
        desc: 'Receita da vó: liso, sem furinhos, com calda de caramelo escuro.',
        img: '1702728109878-c61a98d80491', tags: ['maisPedido', 'veg', 'gf']
      },
      {
        id: 'brigadeiro', nome: 'Brigadeiros', preco: 19,
        desc: 'Quatro unidades de chocolate belga 70% enroladas na hora.',
        img: '1702982852429-e0d0b27eb990', tags: ['veg', 'gf']
      },
      {
        id: 'petit-gateau', nome: 'Petit gâteau', preco: 36,
        desc: 'Bolinho de chocolate com centro cremoso, sorvete de creme e farofa de cacau.',
        img: '1617305855058-336d24456869', tags: ['chef', 'veg']
      },
      {
        id: 'cheesecake', nome: 'Cheesecake de goiabada', preco: 32,
        desc: 'O romeu e julieta em versão cheesecake: base crocante, creme de queijo e calda de goiaba.',
        img: '1708175313856-8573b2bf8a3a', tags: ['veg']
      },
      {
        id: 'acai', nome: 'Açaí na tigela', preco: 29,
        desc: 'Açaí puro batido na hora com banana, frutas vermelhas e granola da casa.',
        img: '1627308594190-a057cd4bfac8', tags: ['vegano', 'gf']
      },
      {
        id: 'churros', nome: 'Churros com doce de leite', preco: 26,
        desc: 'Massa crocante no açúcar com canela e doce de leite para mergulhar.',
        img: '1624371414361-e670edf4898d', tags: ['veg']
      }
    ]
  },
  {
    id: 'bar',
    nome: 'Bar & café',
    curto: 'Bar',
    desc: 'Drinks, vinhos e o cafezinho de sempre.',
    itens: [
      {
        id: 'caipirinha', nome: 'Caipirinha de limão', preco: 29,
        desc: 'Cachaça artesanal de Salinas, limão-taiti e açúcar na medida.',
        img: '1613478223460-f448a4de829d', tags: ['maisPedido', 'vegano', 'gf'],
        opcoes: { titulo: 'Destilado', escolhas: ['Cachaça', 'Vodka', 'Saquê'], padrao: 0 }
      },
      {
        id: 'caipi-maracuja', nome: 'Caipirinha de maracujá', preco: 32,
        desc: 'Maracujá azedinho, cachaça envelhecida em umburana e um toque de mel.',
        img: '1587223962930-cb7f31384c19', tags: ['gf']
      },
      {
        id: 'negroni', nome: 'Negroni', preco: 38,
        desc: 'Gin, vermute rosso e Campari em partes iguais, com casca de laranja.',
        img: '1781229851767-82d888cc73b2', tags: ['vegano', 'gf']
      },
      {
        id: 'gin-tonica', nome: 'Gin tônica', preco: 36,
        desc: 'Gin London Dry, tônica, limão-siciliano e hortelã fresca.',
        img: '1597960194480-fc6b5e3181fd', tags: ['vegano', 'gf']
      },
      {
        id: 'limonada', nome: 'Limonada suíça', preco: 16,
        desc: 'Limão batido com casca, leite condensado e muito gelo. Sem álcool.',
        img: '1575596510825-f748919a2bf7', tags: ['veg', 'gf']
      },
      {
        id: 'vinho', nome: 'Vinho tinto da casa', preco: 34,
        desc: 'Taça de 150 ml. Pergunte ao garçom pelo rótulo da semana.',
        img: '1474722883778-792e7990302f', tags: ['vegano', 'gf']
      },
      {
        id: 'chope', nome: 'Chope artesanal', preco: 19,
        desc: 'Pilsen de uma cervejaria daqui da cidade, 400 ml, tirado na hora.',
        img: '1608270586620-248524c67de9', tags: ['vegano']
      },
      {
        id: 'espresso', nome: 'Café espresso', preco: 9,
        desc: 'Grãos especiais da Serra da Mantiqueira, extração curta.',
        img: '1579992357154-faf4bde95b3d', tags: ['vegano', 'gf']
      }
    ]
  }
];
