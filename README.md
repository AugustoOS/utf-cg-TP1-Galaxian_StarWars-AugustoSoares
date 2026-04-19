# TP1 - CG - Augusto Soares

Projeto de jogo 2D inspirado em Galaxian/Star Wars, com menu interativo, gameplay modular em JavaScript e renderizacao hibrida (DOM + WebGL).

## Estrutura e responsabilidade de cada arquivo

### Menu

- menu/menu.html: estrutura do menu principal, selecao de modo, painel de instrucoes e controles de audio.
- menu/menu_style.css: layout, animacoes e visual do menu.
- menu/menu.js: logica do menu.
	- cria e controla transicoes de tela (fade).
	- inicia/pausa audio e sincroniza estado do mute.
	- aplica fade-out da musica ao iniciar a partida.
	- alterna entre menu principal e escolha de modo.
	- abre/fecha painel de instrucoes (botao, clique externo e tecla ESC).
	- executa sequencia de lancamento do modo Arcade e redireciona para o jogo.

### Jogo

- game/game.html: estrutura da tela do jogo e ordem de carregamento dos scripts.
- game/game_style.css: estilos do frame, HUD (pontos/vidas), overlays de pause/game over e visual geral.

- game/game.js: orquestrador principal da gameplay.
	- inicializa loops de update (jogador, tiro, inimigos, fundo e tiros inimigos).
	- controla pause/resume.
	- trata transicao de retorno ao menu.
	- processa inputs de teclado (movimento, tiro, pause e atalho de retorno).

- game/game_structs.js: estado central e utilitarios.
	- define refs de DOM e estado global do jogo.
	- define escala virtual/responsiva da gameplay.
	- configura linhas de inimigos.
	- calcula bounds reais (alpha) dos sprites para colisao precisa.
	- implementa utilitarios geometricos de intersecao.

- game/game_boundary.js: limites e clamp de movimento.
	- calcula limites horizontais da formacao inimiga.
	- limita a posicao da nave do jogador dentro da tela.

- game/game_enemy_layout.js: formacao e mergulho dos inimigos.
	- cria inimigos por linha/coluna.
	- posiciona inimigos na grade da formacao.
	- inicia grupos de mergulho com curvas de Bezier.
	- promove wingman para lider quando necessario.
	- retorna inimigos para a formacao e reinicia ondas.

- game/game_enemy_brakes.js: freio defensivo da formacao inimiga.
	- ativa/desativa o freio.
	- aciona freio quando o tiro passa por gaps da linha de frente.
	- libera freio quando o tiro passa da ultima linha ou deixa de ser valido.

- game/game_enemy_collision.js: sistema de colisao e dano.
	- cria e atualiza tiros inimigos.
	- detecta colisao inimigo-jogador e tiro-jogador.
	- detecta colisao do tiro do jogador com inimigos.
	- remove entidades, atualiza grupos de mergulho e ritmo da fase.
	- controla morte do jogador, invencibilidade temporaria e game over.

- game/game_player.js: jogador, tiro e camada de render.
	- inicializa audio do tiro.
	- calcula caixa de render da nave.
	- inicializa pipeline WebGL para nave e tiro.
	- aplica fallback por CSS quando WebGL nao esta ativo.
	- atualiza movimento e spawn/ocultacao de tiro.

- game/game_scoring.js: pontuacao e vidas.
	- calcula pontuacao por cor de inimigo.
	- atualiza score na HUD.
	- reseta score.
	- atualiza painel de vidas (icones ou contador).

- game/game_background.js: campo estelar animado.
	- gera estrelas por camadas com velocidade/twinkle diferentes.
	- atualiza movimento e opacidade por frame.
	- recicla estrelas ao sair da tela.

### Bibliotecas locais

- libs/math.js: helpers de matriz para transformacoes (translacao e ortografica).
- libs/webgl.js: wrapper de WebGL2.
	- carrega shader sources.
	- compila shaders e linka programa.
	- inicializa contexto e buffers.
	- carrega texturas.
	- desenha sprites.

### Shaders

- shaders/vertex.glsl: transforma vertices para clip space e repassa UV.
- shaders/fragment.glsl: amostra textura e define cor final.

### Assets

- images/: sprites, icones e elementos visuais.
- sounds/: trilha e efeitos sonoros.

## Referencias

- https://www.youtube.com/watch?v=YFSulR-QuT0 - Star Wars Sound Effects - X-Wing
- https://www.youtube.com/watch?v=ngH98a-7MEg - Earl Vickers - Star Wars Theme (Atari 2600)
- Imagens feitas pelo autor em: https://www.piskelapp.com/
