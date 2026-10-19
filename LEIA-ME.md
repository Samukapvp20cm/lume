# Cardápio digital · Lume (modelo)

Cardápio com foto de cada prato, sacola de pedido e envio pelo WhatsApp. Funciona no celular e no computador, em tema claro e escuro.

## Arquivos

| Arquivo | Para que serve |
| --- | --- |
| `index.html` | A página. Quase nunca precisa mexer. |
| `js/dados.js` | **Tudo que muda de um restaurante para outro**: nome, WhatsApp, endereço, horários, categorias, pratos, preços e fotos. |
| `css/estilo.css` | Cores e visual. As cores ficam logo no topo (`--accent` é a cor de destaque). |
| `js/app.js` | O funcionamento (sacola, animações, galeria). Não precisa mexer. |

## Trocar para outro restaurante

1. Abra `js/dados.js`.
2. Em `LOJA`, troque `nome`, `whatsapp` (só números, com 55 e DDD, ex.: `5512991234567`), `endereco`, `horarios` e `instagram`.
3. Em `CATEGORIAS`, edite os pratos. Cada prato tem:
   - `nome`, `desc` (descrição curta), `preco` (número, ex.: `26.9`)
   - `img`: a foto. Pode ser:
     - um arquivo seu: crie a pasta `fotos/` e use `'fotos/picanha.jpg'`
     - um link completo: `'https://...jpg'`
     - o código de uma foto do Unsplash (como está hoje)
   - `tags` (opcional): `chef`, `maisPedido`, `novo`, `serve2`, `veg`, `vegano`, `gf` (sem glúten), `picante`
   - `opcoes` (opcional): uma escolha obrigatória, como o ponto da carne
   - `adicionais` (opcional): extras que somam no preço
4. O primeiro prato com a tag `chef` de cada categoria vira o destaque grande.

Fotos próprias: deixe com uns 1200 px de largura e menos de 300 KB (o site squoosh.app comprime de graça).

## Ver no computador

Dê dois cliques no `index.html`. Precisa de internet para as fontes e as fotos do Unsplash.

## Publicar e gerar o QR code

- Mais fácil: entre em **app.netlify.com/drop** e arraste a pasta `cardapio-digital` inteira. Sai um link na hora.
- Com o link em mãos, gere o QR code (por exemplo em qr-code-generator.com) e imprima para as mesas.
- Link direto para a galeria: coloque `#galeria` no fim do endereço.

## O que já vem pronto

- Abertura animada com a marca (só na primeira visita da sessão)
- Parede infinita de fotos no topo, faixa de palavras que reage à rolagem
- Carrossel infinito dos favoritos (arrasta com impulso e encaixa no prato)
- **Galeria infinita**: todos os pratos num mural sem fim, que se arrasta para qualquer lado
- Abas de categoria que acompanham a rolagem, busca por nome/ingrediente e filtros (vegetariano, sem glúten...)
- Detalhe do prato: no computador abre com a foto "voando" do card; no celular é uma folha que se fecha puxando para baixo
- Sugestões "Combina com" em cada prato
- Sacola salva no aparelho, com mesa / retirada / entrega, taxa de serviço e envio formatado no WhatsApp
- "Aberto agora / Fechado" calculado pelos horários
- Tema claro e escuro (botão do sol/lua), respeita "reduzir movimento" do sistema
