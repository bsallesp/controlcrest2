# Efeitos e recursos úteis para a Landing Page

Referências dos sites que você indicou, com links diretos e sugestões de uso na nossa página.

---

## 1. Animista — [animista.net](https://animista.net)

**O que é:** Biblioteca de animações CSS prontas. Você escolhe o efeito, ajusta duração, easing e delay, e copia o CSS gerado.

**Uso na nossa landing:**
- **Hero:** fade-in + slide up no título e nos CTAs (já aplicado na página com keyframes inspirados).
- **Botões:** efeito "pulse" ou "slide" no hover.
- **Cards:** "slide-in-bottom" ou "fade-in" ao entrar na viewport.

**Como usar:** Acesse Animista → escolha categoria (entrances, attention, etc.) → ajuste duration/easing → "Generate code" → copie o `@keyframes` e a classe para o nosso CSS.

---

## 2. Free Frontend — [freefrontend.com/css-animations/](https://freefrontend.com/css-animations/)

**Destaques úteis para nós:**

| Efeito | Link | Uso sugerido |
|--------|------|--------------|
| **Staggered Bars Reveal** | [demo/código](https://freefrontend.com/code/staggered-bars-reveal-animation-2026-01-27/) | Hero com barras animadas antes do título aparecer (intro “cinema”). |
| **Micro-Animated SVG Icon Bar** | [demo/código](https://freefrontend.com/code/micro-animated-svg-icon-bar-2026-02-14/) | Barra de ícones (tel, SMS, etc.) com micro-interações. |
| **Scroll-Driven Sticky Text Reveal** | [demo](https://freefrontend.com/code/scroll-driven-sticky-text-reveal-2026-02-22/) | Destaque de títulos ao rolar (Chrome 115+). |
| **Apple-Style Accordion** | [demo](https://freefrontend.com/code/apple-style-smooth-animated-accordion-2026-01-22/) | Seção de FAQ ou “Serviços” expansível. |
| **Cosmic 3D Galaxy Button** | [demo](https://freefrontend.com/code/cosmic-3d-galaxy-button-2026-02-28/) | CTA principal com mais impacto (mais pesado em CSS). |

**Staggered Bars:** Zero JS, várias barras com `linear-gradient` e `background-position` em keyframes; inclui `prefers-reduced-motion`. Bom para hero de impacto.

---

## 3. CodePen — [codepen.io](https://codepen.io)

**Como usar:** Busque por "landing page hero", "css button hover", "scroll reveal", "form animation". Muitos pens são só HTML/CSS e podem ser copiados.

**Sugestões de busca:**
- `tv mount` ou `service landing` (inspiração de layout).
- `fade in scroll css` (reveal ao rolar).
- `button hover effect css` (CTAs).

---

## 4. CSS-Tricks — [css-tricks.com](https://css-tricks.com)

**Recursos:**
- [Almanac: animation](https://css-tricks.com/almanac/properties/a/animation/) — sintaxe de `animation`, `@keyframes`, `animation-delay`, múltiplas animações.
- [Guides](https://css-tricks.com/guides/) — performance, scroll-driven animations.

**Snippet útil (múltiplas animações):**
```css
.element {
  animation: 
    fadeIn 0.6s ease forwards,
    slideUp 0.6s ease forwards;
}
```

---

## 5. Codrops (Tympanus) — [tympanus.net/codrops](https://tympanus.net/codrops)

**Playground:** [tympanus.net/codrops/category/playground/](https://tympanus.net/codrops/category/playground/)

**Destaques:**
- **Blurry Text Reveal on Scroll** — texto que “desfoca” ao entrar na tela (hero ou títulos).
- **On-Scroll Text Highlight** — destaque de texto ao rolar.
- **Hover Motion Intro / Grid** — intro com grid e hover; inspiração para galeria ou serviços.
- **Image Stack Entrance** — fotos em pilha com animação de entrada (galeria).

Muitos demos usam **GSAP** (ScrollTrigger). Para manter a página leve, prefira versões “pure CSS” ou use GSAP só no hero se quiser mais impacto.

---

## 6. UIverse — [uiverse.io](https://uiverse.io)

**O que é:** Componentes de UI (botões, cards, loaders, inputs) em HTML/CSS. Copiar e colar.

**Uso na nossa landing:**
- **Buttons:** tags [button](https://uiverse.io/tags/button), [animated](https://uiverse.io/tags/animated).
- **Cards:** [card](https://uiverse.io/tags/card), [hover effect](https://uiverse.io/tags/hover%20effect).
- **Forms:** [form](https://uiverse.io/tags/form), [input](https://uiverse.io/tags/input).

Filtre por "dark" e "minimal" para combinar com o tema atual. Cada elemento tem "Get code" (HTML + CSS).

---

## 7. Awwwards — [awwwards.com](https://www.awwwards.com)

**Uso:** Inspiração de layout e animação em sites premiados. Busque "local business", "service", "minimal" para referências visuais. Não costuma ter código direto; serve para direção de arte e fluxo.

---

## 8. Three.js — [threejs.org](https://threejs.org) | Greensock — [greensock.com](https://greensock.com) | Lusion — [lusion.co](https://lusion.co)

- **Three.js:** Efeitos 3D/WebGL. Para landing de serviço local, tende a ser pesado; só vale se quiser um hero ou fundo 3D muito marcante.
- **Greensock (GSAP):** Animações robustas (ScrollTrigger, timeline). Use se quiser scroll avançado ou transições de página; aumenta um pouco o JS.
- **Lusion:** Agência com trabalhos high-end; inspiração visual, não código pronto.

**Recomendação:** Manter a landing leve (CSS + pouco ou zero JS). Se quiser um upgrade depois: GSAP para scroll reveals e hero.

---

## Resumo — o que já aplicamos na nossa página

- **Hero:** fade-in + slide up no carregamento.
- **Seções:** fade-in com delay em sequência (stagger).
- **Botões:** hover com leve scale e sombra.
- **Cards de serviço:** hover com leve elevação e sombra.
- **Acessibilidade:** `prefers-reduced-motion: reduce` para desativar animações quando o usuário preferir menos movimento.

Para ir além: usar os links acima para pegar um “Staggered Bars” no hero, ícones animados (Free Frontend) ou um botão mais chamativo do UIverse, sempre mantendo performance e acessibilidade.
