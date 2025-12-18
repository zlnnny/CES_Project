import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
    /* 폰트 import는 index.html에서 처리하거나 여기서 @import 사용 */
    @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Lora:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');

    :root {
        --font-en: 'Times New Roman', Times, serif;
        /* Heading과 Body 모두 Times New Roman을 최우선으로 적용 */
        --font-heading: 'Times New Roman', 'Playfair Display', serif;
        --font-body: 'Times New Roman', 'Lora', serif;
        --font-ko: 'Gowun Dodum', sans-serif;
        
        /* Dark Theme Colors */
        --color-bg-main: #0A192F;
        --color-bg-card: #172A46;
        --color-bg-header: rgba(10, 25, 47, 0.95);
        
        --color-text-main: #E6F1FF;
        --color-text-muted: #A8B2D1;
        --color-text-dark: #0A192F;
        
        --color-accent: #64FFDA;
        --color-gold: #FFD700;
        --color-border: #233554;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: var(--font-body), var(--font-ko);
        background-color: var(--color-bg-main);
        color: var(--color-text-main);
        margin: 0;
        line-height: 1.6;
    }

    a {
        text-decoration: none;
        color: inherit;
    }

    ul, li {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    button {
        font-family: var(--font-ko);
        cursor: pointer;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
    }

    .section-padding {
        padding: 4rem 0;
    }

    .section-title {
        font-size: 2.5rem;
        color: var(--color-text-main);
        text-align: center;
        margin-bottom: 1rem;
        font-family: var(--font-heading);
    }

    .section-subtitle {
        text-align: center;
        color: var(--color-text-muted);
        margin-bottom: 3rem;
        font-size: 1.2rem;
        font-family: var(--font-ko);
    }
`;

export default GlobalStyles;

