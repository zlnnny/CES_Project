import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&family=Inter:wght@200;300;400;500;600;700;800;900&display=swap');

    :root {
        --font-en: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-heading: 'Plus Jakarta Sans', sans-serif;
        --font-body: 'Inter', sans-serif;
        
        /* Photo-accurate Colors */
        --color-bg-main: #020617; 
        --color-bg-card: #0f172a;
        --color-bg-header: rgba(2, 6, 23, 0.85);
        
        --color-text-main: #ffffff;
        --color-text-muted: #94a3b8;
        
        --color-accent: #22d3ee; 
        --color-accent-gradient: linear-gradient(135deg, #0891b2 0%, #22d3ee 100%);
        --color-border: rgba(255, 255, 255, 0.08);
    }

    * {
        box-sizing: border-box;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    body {
        font-family: var(--font-body);
        background-color: var(--color-bg-main);
        color: var(--color-text-main);
        margin: 0;
        line-height: 1.5;
        font-weight: 400;
    }

    button {
        font-family: var(--font-en);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 24px;
    }

    .section-title {
        font-size: 2.5rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-bottom: 1rem;
        font-family: var(--font-heading);
    }
`;

export default GlobalStyles;
