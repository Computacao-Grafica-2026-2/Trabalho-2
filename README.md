# Trabalho 2 - Computação Gráfica

Este projeto foi desenvolvido como trabalho acadêmico em Computação Gráfica (UFF): uma cena 3D em WebGPU com o Stanford Bunny sobre uma mesa modelada por superfície implícita, apoiada em um chão com textura. Usa leitura de PLY, estrutura half-edge para as normais do Bunny, marching cubes para gerar a mesa, iluminação de Phong por fragmento com duas luzes pontuais e projeção perspectiva. A estrutura e os conceitos foram inspirados nos exemplos do professor Marcos Lage: https://github.com/mlage/curso-cg.

## Como rodar

Abra a pasta no VS Code e rode o main.html com a extensão Live Server. Precisa de um navegador com WebGPU (Chrome ou Edge). A roda do mouse aproxima ou afasta a câmera, e arrastar com o mouse gira a câmera em torno da mesa.

## Arquivos

- main.js: WebGPU, cena, materiais, luzes, câmera e eventos do mouse
- ply.js: leitura do arquivo PLY
- half-edge.js: estrutura half-edge e normais do Bunny
- marching-cubes.js: função implícita da mesa e marching cubes
- geometry.js: posicionamento do Bunny e geometria do chão
- illumination.vert.js e illumination.frag.js: shaders WGSL
- lib/: webgpu.js e utils.js do professor
- assets/: bun_zipper.ply e Tiles074_1K-JPG_Color.jpg
